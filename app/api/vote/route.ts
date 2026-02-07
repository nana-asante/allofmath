import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionHash } from "@/lib/session";
import { createServerClient } from "@/lib/supabase";
import { checkDualRateLimit, getClientIP } from "@/lib/rate-limit";
import { loadProblemsMap } from "@/lib/problem-corpus";

export const runtime = "nodejs";

const VoteSchema = z
    .object({
        prevProblemId: z.string().min(1).max(100),
        currProblemId: z.string().min(1).max(100),
        vote: z.enum(["easier", "same", "harder"]),
    })
    .strict();

export async function POST(request: NextRequest) {
    try {
        // Session required
        const sessionHash = await getSessionHash();
        if (!sessionHash) {
            return NextResponse.json(
                { error: "Session required. Please refresh the page." },
                { status: 401 }
            );
        }

        // Dual rate limiting: IP + session
        const ip = getClientIP(request);
        const rateLimit = await checkDualRateLimit(ip, sessionHash, "vote");
        if (!rateLimit.success) {
            const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
            return NextResponse.json(
                { error: "Too many requests. Please slow down." },
                { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } }
            );
        }

        // Parse JSON safely
        const body = await request.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        // Validate payload
        const parsed = VoteSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const { prevProblemId, currProblemId, vote } = parsed.data;

        if (prevProblemId === currProblemId) {
            return NextResponse.json({ error: "Invalid pair" }, { status: 400 });
        }

        // Validate problems exist
        const problems = loadProblemsMap();
        if (!problems.has(prevProblemId) || !problems.has(currProblemId)) {
            return NextResponse.json({ error: "Problem not found" }, { status: 404 });
        }

        // Store vote (upsert requires UNIQUE index on the conflict columns)
        const supabase = createServerClient();
        const { error: dbError } = await supabase
            .from("pairwise_votes")
            .upsert(
                {
                    session_hash: sessionHash,
                    prev_problem_id: prevProblemId,
                    curr_problem_id: currProblemId,
                    vote,
                },
                {
                    onConflict: "session_hash,prev_problem_id,curr_problem_id",
                    ignoreDuplicates: false,
                }
            );

        if (dbError) {
            console.error("Failed to store vote:", dbError);
            // Don’t block learning flow on analytics failure
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Vote error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
