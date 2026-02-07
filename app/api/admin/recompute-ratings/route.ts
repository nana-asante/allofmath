import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/api/supabase-admin";
import { updateElo, kFactor, voteToScore } from "@/api/elo";
import { requireAdmin } from "@/api/admin-auth";

export const runtime = "nodejs";

type VoteRow = {
    id: number;
    prev_problem_id: string;
    curr_problem_id: string;
    vote: "easier" | "same" | "harder";
};

type RatingEntry = {
    rating: number;
    n_votes: number;
};

/**
 * POST /api/admin/recompute-ratings
 * Processes unprocessed pairwise votes and updates problem ratings using Elo.
 * Should be called on a schedule (e.g., every 10 minutes via cron).
 */
export async function POST(request: NextRequest) {
    if (!requireAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Pull a batch of unprocessed votes
        const { data: votes, error: voteErr } = await supabaseAdmin
            .from("pairwise_votes")
            .select("id,prev_problem_id,curr_problem_id,vote")
            .is("processed_at", null)
            .order("id", { ascending: true })
            .limit(1000);

        if (voteErr) {
            console.error("fetch votes error:", voteErr);
            return NextResponse.json({ error: "DB error" }, { status: 500 });
        }

        if (!votes || votes.length === 0) {
            return NextResponse.json({ ok: true, processed: 0 });
        }

        // Get unique problem IDs involved
        const ids = Array.from(
            new Set((votes as VoteRow[]).flatMap((v) => [v.prev_problem_id, v.curr_problem_id]))
        );

        // Load current ratings
        const { data: ratings, error: rErr } = await supabaseAdmin
            .from("problem_ratings")
            .select("problem_id,rating,n_votes")
            .in("problem_id", ids);

        if (rErr) {
            console.error("fetch ratings error:", rErr);
            return NextResponse.json({ error: "DB error" }, { status: 500 });
        }

        const ratingMap = new Map<string, RatingEntry>();
        for (const r of ratings ?? []) {
            ratingMap.set(r.problem_id, { rating: r.rating, n_votes: r.n_votes });
        }

        // Create default ratings for any missing problems
        const missing = ids.filter((id) => !ratingMap.has(id));
        if (missing.length > 0) {
            const { error } = await supabaseAdmin
                .from("problem_ratings")
                .upsert(
                    missing.map((problem_id) => ({
                        problem_id,
                        rating: 1000,
                        n_votes: 0,
                        n_attempts: 0,
                    })),
                    { onConflict: "problem_id" }
                );
            if (error) {
                console.error("insert missing ratings error:", error);
                return NextResponse.json({ error: "DB error" }, { status: 500 });
            }
            for (const id of missing) {
                ratingMap.set(id, { rating: 1000, n_votes: 0 });
            }
        }

        // Apply Elo updates in-memory
        for (const v of votes as VoteRow[]) {
            const A = ratingMap.get(v.prev_problem_id)!;
            const B = ratingMap.get(v.curr_problem_id)!;

            // Score for A (prev problem)
            const sA = voteToScore(v.vote);

            // Use K based on min votes (more conservative)
            let k = Math.max(kFactor(A.n_votes), kFactor(B.n_votes));

            // Reduce K for "same" votes (less informative)
            if (v.vote === "same") {
                k = Math.floor(k / 2);
            }

            const next = updateElo(A.rating, B.rating, sA, k);

            A.rating = next.rA;
            B.rating = next.rB;
            A.n_votes += 1;
            B.n_votes += 1;
        }

        // Persist updated ratings
        const upserts = Array.from(ratingMap.entries()).map(([problem_id, v]) => ({
            problem_id,
            rating: v.rating,
            n_votes: v.n_votes,
            updated_at: new Date().toISOString(),
        }));

        const { error: upErr } = await supabaseAdmin
            .from("problem_ratings")
            .upsert(upserts, { onConflict: "problem_id" });

        if (upErr) {
            console.error("upsert ratings error:", upErr);
            return NextResponse.json({ error: "DB error" }, { status: 500 });
        }

        // Mark votes as processed
        const voteIds = (votes as VoteRow[]).map((v) => v.id);
        const { error: markErr } = await supabaseAdmin
            .from("pairwise_votes")
            .update({ processed_at: new Date().toISOString() })
            .in("id", voteIds);

        if (markErr) {
            console.error("mark processed error:", markErr);
            return NextResponse.json({ error: "DB error" }, { status: 500 });
        }

        return NextResponse.json({ ok: true, processed: voteIds.length });
    } catch (error) {
        console.error("recompute-ratings error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
