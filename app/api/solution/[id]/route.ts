import { NextRequest, NextResponse } from "next/server";
import { loadProblemsMap } from "@/api/problem-corpus";

export const runtime = "nodejs";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Validate ID format
    if (!id || !/^aom_[a-z0-9_]+$/.test(id)) {
        return NextResponse.json(
            { error: "Invalid problem ID" },
            { status: 400 }
        );
    }

    const problems = loadProblemsMap();
    const problem = problems.get(id);

    if (!problem) {
        return NextResponse.json(
            { error: "Problem not found" },
            { status: 404 }
        );
    }

    // Return full problem INCLUDING answer for solution page
    return NextResponse.json({
        id: problem.id,
        topic: problem.topic,
        difficulty: problem.seed_difficulty ?? problem.difficulty ?? 1,
        prompt: problem.prompt,
        prompt_latex: problem.prompt_latex,
        answer: problem.answer,
        solution_video_url: problem.solution_video_url,
        source: problem.source,
        license: problem.license,
        author: problem.author,
    }, {
        headers: {
            "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
    });
}
