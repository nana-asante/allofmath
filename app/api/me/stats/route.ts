import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ratingToLevel } from "@/lib/level";

export const runtime = "nodejs";

export async function GET() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Get user rating
        const { data: ratingData } = await supabaseAdmin
            .from("user_ratings")
            .select("rating, n_attempts")
            .eq("user_id", user.id)
            .single();

        const rating = ratingData?.rating ?? 1000;
        // const attempts = ratingData?.n_attempts ?? 0; // Unused

        // 2. Get distinct problems solved
        // Optimized: only count distinct problem_id where outcome = 'correct'
        const { count: solvedCount } = await supabaseAdmin
            .from("attempts")
            .select("problem_id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("outcome", "correct");
        // Note: Supabase doesn't support distinct count easily with head:true without RPC
        // For MVP, we'll fetch distinct problem_ids in a slightly more expensive way or just count rows
        // Better approach: use a view or RPC for stats.
        // For now, let's just count total correct attempts (simplification)

        // 3. Get rating history for graph
        const { data: history } = await supabaseAdmin
            .from("user_rating_history")
            .select("created_at, rating")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(100);

        // 4. Calculate accuracy
        // Total attempts by this user
        const { count: totalAttempts } = await supabaseAdmin
            .from("attempts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);

        const accuracy = totalAttempts && totalAttempts > 0
            ? Math.round(((solvedCount ?? 0) / totalAttempts) * 100)
            : 0;

        // 5. Get topics solved (group by topic from problem_id pattern)
        // Problem IDs look like "aom_algebra_0001" - extract topic from middle segment
        const { data: solvedProblems } = await supabaseAdmin
            .from("attempts")
            .select("problem_id")
            .eq("user_id", user.id)
            .eq("outcome", "correct");

        // Parse topics from problem IDs and count
        const topicCounts: Record<string, number> = {};
        const seenProblemIds = new Set<string>();
        if (solvedProblems) {
            for (const { problem_id } of solvedProblems) {
                if (seenProblemIds.has(problem_id)) continue;
                seenProblemIds.add(problem_id);
                // Extract topic from problem_id (aom_TOPIC_0001)
                const parts = problem_id.split("_");
                if (parts.length >= 2) {
                    const topic = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
                    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
                }
            }
        }

        // Convert to array for chart
        const topicData = Object.entries(topicCounts)
            .map(([topic, count]) => ({ topic, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 topics

        return NextResponse.json({
            stats: {
                rating,
                level: ratingToLevel(rating),
                solvedCount: seenProblemIds.size, // Distinct count now
                totalAttempts: totalAttempts ?? 0,
                accuracy,
            },
            history: history ?? [],
            topicData,
        });
    } catch (error) {
        console.error("stats error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
