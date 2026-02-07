import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionHash } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkDualRateLimit, getClientIP } from "@/lib/rate-limit";
import { loadProblemsMap } from "@/lib/problem-corpus";
import type { Problem } from "@/data/schema/problem.schema";

// IMPORTANT: fs/path require Node runtime (not Edge)
export const runtime = "nodejs";

type StoredOutcome = "correct" | "wrong" | "giveup";

/**
 * Accepts explicit outcome so "giveup" is unambiguous and safe.
 * - submit: answer required (non-empty if string)
 * - giveup: answer optional (ignored)
 */
const AttemptSchema = z.discriminatedUnion("outcome", [
    z
        .object({
            outcome: z.literal("submit"),
            problemId: z.string().min(1).max(100),
            answer: z
                .union([z.string().max(200), z.number().finite()])
                .refine(
                    (v) => (typeof v === "number" ? true : v.trim().length > 0),
                    { message: "Answer is required" }
                ),
            timeMs: z.number().int().min(0).max(3600000),
        })
        .strict(),

    z
        .object({
            outcome: z.literal("giveup"),
            problemId: z.string().min(1).max(100),
            // allow empty/missing answer for giveup (we ignore it anyway)
            answer: z.union([z.string().max(200), z.number().finite()]).optional(),
            timeMs: z.number().int().min(0).max(3600000),
        })
        .strict(),
]);

function checkAnswer(problem: Problem, userAnswer: string | number): boolean {
    const { answer } = problem;

    if (answer.kind === "exact") {
        return (
            String(userAnswer).trim().toLowerCase() ===
            String(answer.value).trim().toLowerCase()
        );
    }

    if (answer.kind === "number") {
        const userNum =
            typeof userAnswer === "number"
                ? userAnswer
                : Number(String(userAnswer).trim());

        if (!Number.isFinite(userNum)) return false;

        const tolerance = answer.tolerance ?? 0;
        return Math.abs(userNum - Number(answer.value)) <= tolerance;
    }

    return false;
}

export async function POST(request: NextRequest) {
    try {
        // Session required (anonymous cookie-based session)
        const sessionHash = await getSessionHash();
        if (!sessionHash) {
            return NextResponse.json(
                { error: "Session required. Please refresh the page." },
                { status: 401 }
            );
        }

        // Dual rate limit: IP + session
        const ip = getClientIP(request);
        const rateLimit = await checkDualRateLimit(ip, sessionHash, "attempt");
        if (!rateLimit.success) {
            const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
            return NextResponse.json(
                { error: "Too many requests. Please slow down." },
                {
                    status: 429,
                    headers: { "Retry-After": String(Math.max(1, retryAfter)) },
                }
            );
        }

        // Parse + validate body
        const body = await request.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = AttemptSchema.safeParse(body);
        if (!parsed.success) {
            // In production you may prefer not to return issue details
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.issues },
                { status: 400 }
            );
        }

        const { problemId, timeMs } = parsed.data;

        // Lookup problem
        const problems = loadProblemsMap();
        const problem = problems.get(problemId);
        if (!problem) {
            return NextResponse.json({ error: "Problem not found" }, { status: 404 });
        }

        // Determine correctness/outcome
        let correct = false;
        let outcome: StoredOutcome = "wrong";

        if (parsed.data.outcome === "giveup") {
            correct = false;
            outcome = "giveup";
        } else {
            correct = checkAnswer(problem, parsed.data.answer);
            outcome = correct ? "correct" : "wrong";
        }

        // Store attempt (server-side insert)
        // Use SSR client to get authenticated user
        const supabase = await createSupabaseServerClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Use admin client for insert (RLS blocks anon key inserts)
        const { supabaseAdmin } = await import("@/lib/supabase-admin");
        const { error: dbError } = await supabaseAdmin.from("attempts").insert({
            session_hash: sessionHash,
            user_id: user?.id ?? null, // Link to user if logged in
            problem_id: problemId,
            outcome,
            time_ms: timeMs,
            client_version: "1.0.0",
        });

        if (dbError) {
            console.error("Failed to store attempt:", dbError);
            // Don't block the user flow if analytics insert fails
        }

        // Update User Elo if logged in and outcome is decisive
        if (user && outcome !== "giveup") {
            // Import admin client for rating updates (bypasses RLS)
            const { supabaseAdmin } = await import("@/lib/supabase-admin");
            const { expectedScore, kFactor } = await import("@/lib/elo");

            // Get current user rating
            const { data: userData } = await supabaseAdmin
                .from("user_ratings")
                .select("rating, n_attempts")
                .eq("user_id", user.id)
                .single();

            // Get problem rating (fallback to seed if no dynamic rating)
            const { data: problemData } = await supabaseAdmin
                .from("problem_ratings")
                .select("rating")
                .eq("problem_id", problemId)
                .single();

            const userRating = userData?.rating ?? 1000;
            const userAttempts = userData?.n_attempts ?? 0;
            // Use problem seed difficulty mapped to rating if no dynamic rating
            const { seedToRating } = await import("@/lib/level");
            const problemRating = problemData?.rating ?? seedToRating(problem.seed_difficulty ?? problem.difficulty ?? 5);

            // Calculate new rating
            const actualScore = outcome === "correct" ? 1 : 0;
            const expected = expectedScore(userRating, problemRating);
            const K = kFactor(userAttempts); // High K for new users
            const delta = Math.round(K * (actualScore - expected));
            const newRating = Math.max(100, Math.min(4000, userRating + delta));

            // Update user_ratings
            await supabaseAdmin.from("user_ratings").upsert({
                user_id: user.id,
                rating: newRating,
                n_attempts: userAttempts + 1,
                updated_at: new Date().toISOString(),
            });

            // Record history
            await supabaseAdmin.from("user_rating_history").insert({
                user_id: user.id,
                rating: newRating,
                delta,
                problem_id: problemId,
                outcome,
            });
        }

        return NextResponse.json({ correct, outcome });
    } catch (error) {
        console.error("Attempt error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
