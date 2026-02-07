import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionHash } from "@/api/session";
import { createServerClient } from "@/api/supabase";
import { checkDualRateLimit, getClientIP } from "@/api/rate-limit";
import { loadProblemsMap } from "@/api/problem-corpus";
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
        const supabase = createServerClient();
        const { error: dbError } = await supabase.from("attempts").insert({
            session_hash: sessionHash,
            problem_id: problemId,
            outcome,
            time_ms: timeMs,
            client_version: "1.0.0",
        });

        if (dbError) {
            console.error("Failed to store attempt:", dbError);
            // Don't block the user flow if analytics insert fails
        }

        return NextResponse.json({ correct, outcome });
    } catch (error) {
        console.error("Attempt error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
