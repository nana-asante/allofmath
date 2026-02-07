import { NextResponse } from "next/server";
import { loadProblemsList } from "@/lib/problem-corpus";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ratingToLevel, seedToRating } from "@/lib/level";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
    try {
        const problems = loadProblemsList();

        // Get authenticated user (if any)
        const supabase = await createSupabaseServerClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Fetch live ratings from DB
        const { data: ratings, error: ratingsError } = await supabaseAdmin
            .from("problem_ratings")
            .select("problem_id, rating, n_votes");

        if (ratingsError) {
            console.error("Failed to fetch ratings:", ratingsError);
        }

        // Build ratings map for fast lookup
        const ratingsMap = new Map<string, { rating: number; n_votes: number }>();
        if (ratings) {
            for (const r of ratings) {
                ratingsMap.set(r.problem_id, { rating: r.rating, n_votes: r.n_votes });
            }
        }

        // Fetch user's solved problems (if authenticated)
        let solvedIds = new Set<string>();
        let userRating = 1000;

        if (user) {
            // Get solved problem IDs
            const { data: solvedProblems } = await supabaseAdmin
                .from("attempts")
                .select("problem_id")
                .eq("user_id", user.id)
                .eq("outcome", "correct");

            if (solvedProblems) {
                solvedIds = new Set(solvedProblems.map((p) => p.problem_id));
            }

            // Get user's current rating
            const { data: ratingData } = await supabaseAdmin
                .from("user_ratings")
                .select("rating")
                .eq("user_id", user.id)
                .single();

            if (ratingData) {
                userRating = ratingData.rating;
            }
        }

        // Merge problems with live ratings and solved status (exclude answers)
        const safeProblems = problems.map((problem) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { answer, ...rest } = problem;
            const liveRating = ratingsMap.get(problem.id);
            const problemRating = liveRating?.rating ?? seedToRating(problem.seed_difficulty ?? problem.difficulty ?? 5);

            return {
                ...rest,
                hasAnswer: true,
                rating: problemRating,
                n_votes: liveRating?.n_votes ?? 0,
                level: ratingToLevel(problemRating),
                solved: solvedIds.has(problem.id),
            };
        });

        return NextResponse.json({
            problems: safeProblems,
            userRating,
            isAuthenticated: !!user,
        }, {
            headers: {
                // No cache when personalized
                "Cache-Control": user ? "private, no-cache" : "public, max-age=30, stale-while-revalidate=60",
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

