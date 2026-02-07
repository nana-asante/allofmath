import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadProblemsList } from "@/lib/problem-corpus";
import { seedToRating } from "@/lib/level";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

/**
 * POST /api/admin/sync-problem-ratings
 * Seeds problem_ratings table from the JSON corpus.
 * Maps seed_difficulty -> initial Elo rating.
 * Call after adding new problems to the repo.
 */
export async function POST(request: NextRequest) {
    if (!requireAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const problems = loadProblemsList();

        // Build upsert rows: use seed_difficulty if present, else difficulty
        const rows = problems.map((p) => {
            const seed = (p as { seed_difficulty?: number }).seed_difficulty ?? p.difficulty ?? 1;
            return {
                problem_id: p.id,
                rating: seedToRating(Number(seed) || 1),
                updated_at: new Date().toISOString(),
            };
        });

        // Batch upsert (chunk to avoid payload limits)
        const chunkSize = 500;
        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            const { error } = await supabaseAdmin
                .from("problem_ratings")
                .upsert(chunk, { onConflict: "problem_id", ignoreDuplicates: false });

            if (error) {
                console.error("sync ratings error:", error);
                return NextResponse.json({ error: "DB error", details: error.message }, { status: 500 });
            }
        }

        return NextResponse.json({ ok: true, synced: rows.length });
    } catch (error) {
        console.error("sync-problem-ratings error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
