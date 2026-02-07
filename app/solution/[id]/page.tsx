"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import katex from "katex";
import "katex/dist/katex.min.css";

interface Problem {
    id: string;
    topic: string;
    difficulty?: number;
    prompt: string;
    solution_video_url?: string;
}

interface Answer {
    kind: string;
    value: string | number;
}

interface ProblemWithAnswer extends Problem {
    answer: Answer;
}

/** Render inline math using KaTeX */
function MathInline({ text }: { text: string }) {
    const html = useMemo(() => {
        return text.replace(/\$([^$]+)\$/g, (_, expr) => {
            try {
                return katex.renderToString(expr, { throwOnError: false });
            } catch {
                return expr;
            }
        });
    }, [text]);

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function SolutionPage() {
    const params = useParams();
    const problemId = params.id as string;

    const [problem, setProblem] = useState<ProblemWithAnswer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!problemId) return;

        async function fetchProblem() {
            try {
                const res = await fetch(`/api/solution/${problemId}`);
                if (!res.ok) {
                    if (res.status === 404) {
                        setError("Problem not found");
                    } else {
                        setError("Failed to load solution");
                    }
                    return;
                }
                const data = await res.json();
                setProblem(data);
            } catch {
                setError("Failed to load solution");
            } finally {
                setLoading(false);
            }
        }

        fetchProblem();
    }, [problemId]);

    const formatAnswer = (answer: Answer) => {
        if (answer.kind === "number") {
            return String(answer.value);
        }
        return String(answer.value);
    };

    const getVideoEmbedUrl = (url: string) => {
        // Convert YouTube watch URL to embed URL
        if (url.includes("youtube.com/watch")) {
            return url.replace("watch?v=", "embed/");
        }
        if (url.includes("youtu.be/")) {
            const videoId = url.split("youtu.be/")[1]?.split("?")[0];
            return `https://www.youtube.com/embed/${videoId}`;
        }
        return url;
    };

    if (loading) {
        return (
            <main className="mx-auto flex-1 px-6 py-20 pt-24" style={{ maxWidth: "900px" }}>
                <p className="opacity-50">Loading solution...</p>
            </main>
        );
    }

    if (error || !problem) {
        return (
            <main className="mx-auto flex-1 px-6 py-20 pt-24" style={{ maxWidth: "900px" }}>
                <h1 className="text-2xl mb-4">Solution Not Found</h1>
                <p className="opacity-60 mb-8">{error || "Could not find this problem."}</p>
                <Link href="/search" className="btn px-6 py-3">
                    ← Back to Search
                </Link>
            </main>
        );
    }

    return (
        <main className="mx-auto flex-1 px-6 py-20 pt-24" style={{ maxWidth: "900px" }}>
            <div className="textbook-page">
                {/* Breadcrumb */}
                <div className="mb-8">
                    <Link href="/search" className="text-sm opacity-60 hover:opacity-100">
                        ← Back to Search
                    </Link>
                </div>

                {/* Problem metadata */}
                <div className="text-sm opacity-60 mb-4">
                    {problem.topic} · Level {problem.difficulty ?? 1}
                </div>

                {/* Problem */}
                <div className="mb-8 p-6 border border-foreground/20">
                    <p className="text-sm uppercase tracking-widest opacity-40 mb-2">Problem</p>
                    <p className="text-2xl">
                        <MathInline text={problem.prompt} />
                    </p>
                </div>

                {/* Answer */}
                <div className="mb-12 p-6 border-2 border-foreground/40 bg-foreground/5">
                    <p className="text-sm uppercase tracking-widest opacity-40 mb-2">Answer</p>
                    <p className="text-4xl font-bold">
                        <MathInline text={formatAnswer(problem.answer)} />
                    </p>
                </div>

                {/* Video Solution */}
                {problem.solution_video_url && (
                    <div className="mb-8">
                        <p className="text-sm uppercase tracking-widest opacity-40 mb-4">Video Explanation</p>
                        <div
                            className="relative w-full"
                            style={{ aspectRatio: "16 / 9" }}
                        >
                            <iframe
                                src={getVideoEmbedUrl(problem.solution_video_url)}
                                className="w-full h-full border border-foreground/20"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title="Solution video"
                            />
                        </div>
                    </div>
                )}

                {!problem.solution_video_url && (
                    <div className="mb-8 p-6 border border-foreground/10 opacity-50">
                        <p className="text-sm">No video explanation available for this problem yet.</p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 mt-8">
                    <Link href={`/learn?start=${problem.id}`} className="btn px-6 py-3">
                        Practice This Problem →
                    </Link>
                    <Link href="/search" className="opacity-60 hover:opacity-100 underline flex items-center">
                        Find More Problems
                    </Link>
                </div>
            </div>
        </main>
    );
}
