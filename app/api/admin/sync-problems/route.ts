import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadProblemsList } from "@/lib/problem-corpus";
import { stripLatex, topicToSlug } from "@/lib/search-utils";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    if (!requireAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const problems = loadProblemsList();

        if (problems.length === 0) {
            return NextResponse.json({ synced: 0, message: "No problems found" });
        }

        // Transform to problems_public format
        const rows = problems.map((p) => ({
            id: p.id,
            topic: p.topic,
            topic_slug: topicToSlug(p.topic),
            prompt: p.prompt,
            prompt_plain: stripLatex(p.prompt),
            seed_difficulty: p.seed_difficulty ?? p.difficulty ?? 1,
            status: p.status ?? "community",
            source: p.source,
            license: p.license,
            author: p.author,
            solution_video_url: p.solution_video_url ?? null,
            updated_at: new Date().toISOString(),
        }));

        // Upsert in chunks of 100
        const chunkSize = 100;
        let synced = 0;

        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);

            const { error } = await supabaseAdmin
                .from("problems_public")
                .upsert(chunk, { onConflict: "id" });

            if (error) {
                console.error("Sync chunk error:", error);
                return NextResponse.json(
                    { error: "Sync failed", details: error.message },
                    { status: 500 }
                );
            }

            synced += chunk.length;
        }

        return NextResponse.json({
            synced,
            message: `Synced ${synced} problems to problems_public`,
        });
    } catch (error) {
        console.error("Sync problems error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
