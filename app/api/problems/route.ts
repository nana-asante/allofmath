import { NextResponse } from "next/server";
import { loadProblemsList } from "@/lib/problem-corpus";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ratingToLevel } from "@/lib/level";

export const runtime = "nodejs";

export async function GET() {
    try {
        const problems = loadProblemsList();

        // Fetch live ratings from DB
        const { data: ratings, error: ratingsError } = await supabaseAdmin
            .from("problem_ratings")
            .select("problem_id, rating, n_votes");

        if (ratingsError) {
            console.error("Failed to fetch ratings:", ratingsError);
            // Fall back to seed difficulty if DB fails
        }

        // Build ratings map for fast lookup
        const ratingsMap = new Map<string, { rating: number; n_votes: number }>();
        if (ratings) {
            for (const r of ratings) {
                ratingsMap.set(r.problem_id, { rating: r.rating, n_votes: r.n_votes });
            }
        }

        // Merge problems with live ratings (exclude answers)
        const safeProblems = problems.map((problem) => {
            const { answer: _answer, ...rest } = problem;
            const liveRating = ratingsMap.get(problem.id);

            return {
                ...rest,
                hasAnswer: true,
                // Use live rating if available, otherwise fall back to seed
                rating: liveRating?.rating ?? null,
                n_votes: liveRating?.n_votes ?? 0,
                // Compute display level from live rating or seed
                level: liveRating
                    ? ratingToLevel(liveRating.rating)
                    : problem.seed_difficulty ?? problem.difficulty ?? 1,
            };
        });

        return NextResponse.json(safeProblems, {
            headers: {
                // Shorter cache since ratings are dynamic now
                "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
            },
        });
    } catch (error) {
        console.error("Failed to load problems:", error);
        return NextResponse.json(
            { error: "Failed to load problems" },
            { status: 500 }
        );
    }
}
