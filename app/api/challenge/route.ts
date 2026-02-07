import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionHash } from "@/api/session";
import { createServerClient } from "@/api/supabase";
import { checkDualRateLimit, getClientIP } from "@/api/rate-limit";

export const runtime = "nodejs";

const ChallengeSchema = z
    .object({
        problemId: z.string().min(1).max(100),
        userAnswer: z.string().min(1).max(500),
        expectedAnswer: z.string().min(1).max(500),
        reason: z.string().max(1000).optional(),
    })
    .strict();

/**
 * POST /api/challenge
 * Submit a challenge for a problem answer that user believes is incorrect.
 * Rate limited to prevent abuse.
 */
export async function POST(request: NextRequest) {
    try {
        // Session required
        const sessionHash = await getSessionHash();
        if (!sessionHash) {
            return NextResponse.json(
                { error: "Session required" },
                { status: 401 }
            );
        }

        // Rate limit (reuse vote bucket - same abuse potential)
        const ip = getClientIP(request);
        const rl = await checkDualRateLimit(ip, sessionHash, "vote");
        if (!rl.success) {
            return NextResponse.json(
                { error: "Rate limited", reset: rl.reset },
                { status: 429 }
            );
        }

        // Parse body
        const body = await request.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = ChallengeSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.issues },
                { status: 400 }
            );
        }

        const { problemId, userAnswer, expectedAnswer, reason } = parsed.data;

        // Insert challenge (upsert to prevent duplicates)
        const supabase = createServerClient();
        const { error } = await supabase.from("answer_challenges").upsert(
            {
                problem_id: problemId,
                session_hash: sessionHash,
                user_answer: userAnswer,
                expected_answer: expectedAnswer,
                reason: reason || null,
                status: "pending",
                created_at: new Date().toISOString(),
            },
            {
                onConflict: "problem_id,session_hash",
                ignoreDuplicates: false,
            }
        );

        if (error) {
            console.error("challenge insert error:", error);
            return NextResponse.json(
                { error: "Failed to submit challenge" },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true, message: "Challenge submitted for review" });
    } catch (error) {
        console.error("challenge error:", error);
        return NextResponse.json(
            { error: "Server error" },
            { status: 500 }
        );
    }
}
