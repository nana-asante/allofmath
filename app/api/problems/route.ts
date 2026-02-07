import { NextResponse } from "next/server";
import { loadProblemsList } from "@/api/problem-corpus";

export const runtime = "nodejs";

export async function GET() {
    try {
        const problems = loadProblemsList();

        // Return problems without answers for client use
        const safeProblems = problems.map(({ answer: _answer, ...rest }: { answer: unknown;[key: string]: unknown }) => ({
            ...rest,
            hasAnswer: true,
        }));

        return NextResponse.json(safeProblems, {
            headers: {
                "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
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
