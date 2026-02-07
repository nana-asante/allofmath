"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import katex from "katex";
import "katex/dist/katex.min.css";

interface Problem {
    id: string;
    topic: string;
    difficulty?: number;
    seed_difficulty?: number;
    prompt: string;
    rank?: number;
    solution_video_url?: string;
}

type SortOption = "relevance" | "difficulty-asc" | "difficulty-desc" | "newest";

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

export default function SearchPage() {
    const [problems, setProblems] = useState<Problem[]>([]);
    const [results, setResults] = useState<Problem[]>([]);
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [topicFilter, setTopicFilter] = useState<string>("");
    const [sortBy, setSortBy] = useState<SortOption>("relevance");
    const [levelFilter, setLevelFilter] = useState<string>("");
    const [useApiSearch, setUseApiSearch] = useState(true);

    // Fetch problems once for client-side fallback and topics
    useEffect(() => {
        fetch("/api/problems")
            .then((res) => res.json())
            .then((data) => {
                setProblems(data);
                setResults(data.slice(0, 20));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // Debounce query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    // Get unique topics for filter
    const topics = useMemo(() => {
        const set = new Set(problems.map((p) => p.topic));
        return Array.from(set).sort();
    }, [problems]);

    const getDifficulty = (p: Problem) => p.seed_difficulty ?? p.difficulty ?? 1;

    // Get difficulty levels
    const levels = useMemo(() => {
        const set = new Set(problems.map((p) => getDifficulty(p)));
        return Array.from(set).sort((a, b) => a - b);
    }, [problems]);

    // Sort function
    const sortResults = (items: Problem[]) => {
        const sorted = [...items];
        switch (sortBy) {
            case "difficulty-asc":
                return sorted.sort((a, b) => getDifficulty(a) - getDifficulty(b));
            case "difficulty-desc":
                return sorted.sort((a, b) => getDifficulty(b) - getDifficulty(a));
            case "newest":
                return sorted.reverse();
            case "relevance":
            default:
                return sorted.sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
        }
    };

    // Search effect
    useEffect(() => {
        if (!debouncedQuery.trim() && !topicFilter && !levelFilter) {
            setResults(sortResults(problems.slice(0, 50)));
            return;
        }

        const searchApi = async () => {
            if (!useApiSearch) {
                clientSideSearch();
                return;
            }

            setSearching(true);
            try {
                const params = new URLSearchParams();
                if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
                if (topicFilter) params.set("topic", topicFilter);

                const res = await fetch(`/api/search?${params}`);
                if (!res.ok) throw new Error("API search failed");

                let data = await res.json();

                // Apply level filter client-side
                if (levelFilter) {
                    const lvl = parseInt(levelFilter, 10);
                    data = data.filter((p: Problem) => getDifficulty(p) === lvl);
                }

                if (Array.isArray(data) && data.length > 0) {
                    setResults(sortResults(data));
                } else if (debouncedQuery.trim()) {
                    clientSideSearch();
                } else {
                    setResults([]);
                }
            } catch {
                setUseApiSearch(false);
                clientSideSearch();
            } finally {
                setSearching(false);
            }
        };

        const clientSideSearch = () => {
            const q = debouncedQuery.toLowerCase().trim();
            let filtered = problems.filter((p) => {
                if (topicFilter && p.topic !== topicFilter) return false;
                if (levelFilter && getDifficulty(p) !== parseInt(levelFilter, 10)) return false;
                if (q) {
                    const inTopic = p.topic.toLowerCase().includes(q);
                    const inPrompt = p.prompt.toLowerCase().includes(q);
                    const inId = p.id.toLowerCase().includes(q);
                    if (!inTopic && !inPrompt && !inId) return false;
                }
                return true;
            });
            setResults(sortResults(filtered.slice(0, 50)));
        };

        searchApi();
    }, [debouncedQuery, topicFilter, levelFilter, sortBy, problems, useApiSearch]);

    return (
        <main className="mx-auto flex-1 px-6 py-20 pt-24" style={{ maxWidth: "1200px" }}>
            <div className="textbook-page">
                <h1 className="text-3xl mb-2">Search Problems</h1>
                <p className="opacity-60 mb-8">Find problems by topic, content, or ID</p>

                {/* Search input - full width */}
                <div className="mb-6">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search problems..."
                        autoFocus
                        className="w-full text-xl p-4 border border-foreground/20"
                    />
                </div>

                {/* Filters row */}
                <div className="flex flex-wrap gap-4 mb-8">
                    {/* Topic filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm opacity-60">Topic:</label>
                        <select
                            value={topicFilter}
                            onChange={(e) => setTopicFilter(e.target.value)}
                            className="bg-transparent border border-foreground/20 px-3 py-2 text-sm min-w-[150px]"
                        >
                            <option value="">All Topics</option>
                            {topics.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* Level filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm opacity-60">Level:</label>
                        <select
                            value={levelFilter}
                            onChange={(e) => setLevelFilter(e.target.value)}
                            className="bg-transparent border border-foreground/20 px-3 py-2 text-sm min-w-[100px]"
                        >
                            <option value="">All Levels</option>
                            {levels.map((l) => (
                                <option key={l} value={l}>Level {l}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sort dropdown */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm opacity-60">Sort:</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="bg-transparent border border-foreground/20 px-3 py-2 text-sm min-w-[150px]"
                        >
                            <option value="relevance">Relevance</option>
                            <option value="difficulty-asc">Easiest First</option>
                            <option value="difficulty-desc">Hardest First</option>
                            <option value="newest">Newest</option>
                        </select>
                    </div>

                    {/* Clear filters */}
                    {(topicFilter || levelFilter || query) && (
                        <button
                            onClick={() => {
                                setQuery("");
                                setTopicFilter("");
                                setLevelFilter("");
                            }}
                            className="text-sm opacity-50 hover:opacity-100 underline"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Results */}
                {loading ? (
                    <p className="opacity-50">Loading problems...</p>
                ) : searching ? (
                    <p className="opacity-50">Searching...</p>
                ) : results.length === 0 ? (
                    <p className="opacity-50">No problems found</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {results.map((problem) => (
                            <div
                                key={problem.id}
                                className="border border-foreground/20 p-5 hover:border-foreground/30 transition-all"
                            >
                                <p className="text-lg mb-2">
                                    <MathInline text={problem.prompt} />
                                </p>
                                <p className="text-sm opacity-50 mb-4">
                                    {problem.topic} · Level {getDifficulty(problem)}
                                </p>
                                <div className="flex gap-3">
                                    <Link
                                        href={`/learn?start=${problem.id}`}
                                        className="btn text-sm px-4 py-2"
                                    >
                                        Practice →
                                    </Link>
                                    <Link
                                        href={`/solution/${problem.id}`}
                                        className="text-sm opacity-60 hover:opacity-100 underline flex items-center"
                                    >
                                        See Solution
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Show count */}
                {!loading && !searching && results.length > 0 && (
                    <p className="mt-6 text-sm opacity-40">
                        Showing {results.length} of {problems.length} problems
                        {!useApiSearch && " (client-side)"}
                    </p>
                )}
            </div>
        </main>
    );
}
