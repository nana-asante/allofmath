"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { KeyboardEvent } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import Link from "next/link";

interface Problem {
    id: string;
    topic: string;
    difficulty: number;
    prompt: string;
    hasAnswer?: boolean;
    solution_video_url?: string;
}

interface AttemptResult {
    correct: boolean;
}

type GameState = "loading" | "onboarding" | "solving" | "feedback" | "watching" | "voting" | "complete";
type Outcome = "correct" | "wrong" | "giveup";
type Vote = "easier" | "same" | "harder";
type VideoFeedback = "helpful" | "not_helpful" | null;

// Difficulty level descriptions for onboarding
const LEVEL_DESCRIPTIONS: { range: [number, number]; label: string; examples: string }[] = [
    { range: [1, 3], label: "Elementary", examples: "Basic arithmetic: 2+3, 10-4, 3×4" },
    { range: [4, 6], label: "Middle School", examples: "Fractions, decimals, basic algebra" },
    { range: [7, 9], label: "Pre-Algebra", examples: "Equations, ratios, percentages" },
    { range: [10, 12], label: "Algebra I", examples: "Linear equations, polynomials" },
    { range: [13, 15], label: "Algebra II / Geometry", examples: "Quadratics, proofs, trigonometry" },
    { range: [16, 18], label: "Precalculus / Calculus", examples: "Limits, derivatives, integrals" },
    { range: [19, 20], label: "Competition / Advanced", examples: "Olympiad-style, proofs, number theory" },
];

/** Escape text so it is safe to inject as HTML. */
function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (ch) => {
        switch (ch) {
            case "&":
                return "&amp;";
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case '"':
                return "&quot;";
            case "'":
                return "&#039;";
            default:
                return ch;
        }
    });
}

/**
 * Render as KaTeX safely.
 * - If KaTeX fails, return escaped text (never raw).
 * - Caps expansion to reduce abuse/DoS.
 */
function renderMathSafe(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return "";

    try {
        return katex.renderToString(trimmed, {
            throwOnError: true,
            displayMode: false,
            trust: false,
            strict: "warn",
            // These guards help against pathological inputs:
            maxExpand: 1000,
            maxSize: 10,
        });
    } catch {
        return escapeHtml(trimmed);
    }
}

function MathInline({ text, className }: { text: string; className?: string }) {
    const html = useMemo(() => renderMathSafe(text), [text]);
    return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function LearnPage() {
    const [problems, setProblems] = useState<Problem[]>([]);
    const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
    const [previousProblem, setPreviousProblem] = useState<Problem | null>(null);

    const [answer, setAnswer] = useState("");
    const [gameState, setGameState] = useState<GameState>("loading");

    const [lastOutcome, setLastOutcome] = useState<Outcome | null>(null);
    const [difficulty, setDifficulty] = useState(1);

    // Counts problems completed (not attempts)
    const [completedCount, setCompletedCount] = useState(0);

    // Seen problem IDs
    const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

    // For “wrong”: user can retry without changing difficulty yet.
    const [isResolved, setIsResolved] = useState(false); // resolved == we’re done with this problem (correct/giveup)
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Answer challenge feature
    const [challengeStatus, setChallengeStatus] = useState<"idle" | "submitting" | "submitted">("idle");
    const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState<string>("");

    // Keep an always-current difficulty for “select next” calls
    const difficultyRef = useRef<number>(difficulty);
    useEffect(() => {
        difficultyRef.current = difficulty;
    }, [difficulty]);

    // --- Active-time timer (counts only when user is actively solving) ---
    const startedAtRef = useRef<number>(0);
    const pausedAtRef = useRef<number | null>(null);
    const totalPausedRef = useRef<number>(0);

    const startTimer = useCallback(() => {
        startedAtRef.current = Date.now();
        pausedAtRef.current = null;
        totalPausedRef.current = 0;
    }, []);

    const pauseTimer = useCallback(() => {
        if (pausedAtRef.current === null) pausedAtRef.current = Date.now();
    }, []);

    const resumeTimer = useCallback(() => {
        if (pausedAtRef.current !== null) {
            totalPausedRef.current += Date.now() - pausedAtRef.current;
            pausedAtRef.current = null;
        }
    }, []);

    const getActiveMs = useCallback(() => {
        const now = Date.now();
        const pausedExtra = pausedAtRef.current ? now - pausedAtRef.current : 0;
        const active = now - startedAtRef.current - totalPausedRef.current - pausedExtra;
        return Math.max(0, Math.min(active, 3600000));
    }, []);

    // Pause time when tab hidden; resume when visible
    useEffect(() => {
        const onVis = () => {
            if (document.hidden) pauseTimer();
            else if (gameState === "solving") resumeTimer();
        };
        document.addEventListener("visibilitychange", onVis);
        return () => document.removeEventListener("visibilitychange", onVis);
    }, [pauseTimer, resumeTimer, gameState]);

    // Pause timer whenever not solving
    useEffect(() => {
        if (gameState === "solving") resumeTimer();
        else pauseTimer();
    }, [gameState, pauseTimer, resumeTimer]);

    // --- Init: session + problems ---
    useEffect(() => {
        async function init() {
            try {
                const s = await fetch("/api/session");
                if (!s.ok) throw new Error("Failed to init session");

                const res = await fetch("/api/problems");
                if (!res.ok) throw new Error("Failed to load problems");

                const data = await res.json();
                setProblems(data);

                // Check for ?start= parameter (from search)
                const urlParams = new URLSearchParams(window.location.search);
                const startId = urlParams.get("start");

                // Check if user has completed onboarding (stored in localStorage)
                const savedLevel = localStorage.getItem("aom_starting_level");
                if (savedLevel) {
                    const level = parseInt(savedLevel, 10);
                    setDifficulty(level);
                    difficultyRef.current = level;

                    // If ?start= provided, find that problem
                    if (startId) {
                        const startProblem = data.find((p: Problem) => p.id === startId);
                        if (startProblem) {
                            setCurrentProblem(startProblem);
                            setSeenIds(new Set([startProblem.id]));
                            startTimer();
                            setGameState("solving");
                            // Clear URL param so refresh doesn't restart same problem
                            window.history.replaceState({}, "", "/learn");
                            return;
                        }
                    }

                    setGameState("solving");
                } else {
                    setGameState("onboarding");
                }
            } catch (err) {
                setError("Failed to load problems. Please refresh.");
                console.error(err);
            }
        }
        init();
    }, [startTimer]);

    // --- Problem selection ---
    const selectNextProblem = useCallback(
        (difficultyOverride?: number) => {
            if (problems.length === 0) return;

            const targetDifficulty = difficultyOverride ?? difficultyRef.current;

            let candidates = problems.filter(
                (p) => p.difficulty === targetDifficulty && !seenIds.has(p.id)
            );

            for (let delta = 1; delta <= 10 && candidates.length === 0; delta++) {
                candidates = problems.filter(
                    (p) => Math.abs(p.difficulty - targetDifficulty) <= delta && !seenIds.has(p.id)
                );
            }

            // fallback: allow repeats if user exhausted unseen
            if (candidates.length === 0) {
                candidates = problems.filter((p) => Math.abs(p.difficulty - targetDifficulty) <= 3);
            }

            if (candidates.length === 0) {
                setGameState("complete");
                return;
            }

            const selected = candidates[Math.floor(Math.random() * candidates.length)];

            setPreviousProblem(currentProblem);
            setCurrentProblem(selected);

            setSeenIds((prev) => new Set([...prev, selected.id]));
            setAnswer("");
            setLastOutcome(null);
            setIsResolved(false);

            setGameState("solving");
            startTimer();
        },
        [problems, seenIds, currentProblem, startTimer]
    );

    useEffect(() => {
        if (gameState === "solving" && !currentProblem && problems.length > 0) {
            selectNextProblem(difficultyRef.current);
        }
    }, [gameState, currentProblem, problems, selectNextProblem]);

    // --- Submit attempt to server ---
    const submitAttempt = async (action: "submit" | "giveup") => {
        if (!currentProblem || isSubmitting) return;

        setError(null);
        setIsSubmitting(true);

        const timeMs = getActiveMs();
        const answerValue = action === "giveup" ? "" : answer;

        try {
            const res = await fetch("/api/attempt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    problemId: currentProblem.id,
                    answer: answerValue,
                    timeMs,
                    // IMPORTANT: let server know if this was a give up (don’t infer from blank answer)
                    outcome: action === "giveup" ? "giveup" : "submit",
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setError(err.error || "Submission failed");
                return;
            }

            const result: AttemptResult = await res.json();

            if (action === "giveup") {
                setLastOutcome("giveup");
                setIsResolved(true);
                setGameState("feedback");
                return;
            }

            if (result.correct) {
                setLastOutcome("correct");
                setIsResolved(true);
            } else {
                setLastOutcome("wrong");
                setIsResolved(false); // user can retry
                setLastSubmittedAnswer(answerValue); // Store for challenge
            }
            setChallengeStatus("idle"); // Reset challenge status for new problem
            setGameState("feedback");
        } catch (err) {
            console.error(err);
            setError("Network error. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && answer.trim() && gameState === "solving") {
            e.preventDefault();
            submitAttempt("submit");
        }
    };

    /**
     * Finalize a problem and move forward.
     * - Only here do we adjust difficulty and increment completedCount.
     * - Wrong only affects difficulty if user chooses “Move on”.
     */
    const finalizeAndContinue = (finalOutcome: Outcome) => {
        const nextDifficulty =
            finalOutcome === "correct"
                ? Math.min(20, difficultyRef.current + 1)
                : Math.max(1, difficultyRef.current - 1);

        difficultyRef.current = nextDifficulty;
        setDifficulty(nextDifficulty);

        const nextCompletedCount = completedCount + 1;
        setCompletedCount(nextCompletedCount);

        // Vote after 2nd completed problem onward (and only if there is a previous)
        if (nextCompletedCount >= 2 && previousProblem) {
            setGameState("voting");
            return;
        }

        selectNextProblem(nextDifficulty);
    };

    const submitVote = async (vote: Vote) => {
        if (!previousProblem || !currentProblem) {
            selectNextProblem(difficultyRef.current);
            return;
        }

        try {
            await fetch("/api/vote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prevProblemId: previousProblem.id,
                    currProblemId: currentProblem.id,
                    vote,
                }),
            });
        } catch (err) {
            console.error("Vote submission failed:", err);
            // Don’t block learning flow on vote failure
        }

        selectNextProblem(difficultyRef.current);
    };

    // Submit answer challenge
    const submitChallenge = async () => {
        if (!currentProblem || challengeStatus !== "idle") return;

        setChallengeStatus("submitting");
        try {
            const res = await fetch("/api/challenge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    problemId: currentProblem.id,
                    userAnswer: lastSubmittedAnswer,
                    expectedAnswer: "(unknown - please review)",
                    reason: `User believes their answer "${lastSubmittedAnswer}" is correct`,
                }),
            });

            if (res.ok) {
                setChallengeStatus("submitted");
            } else {
                setChallengeStatus("idle");
                console.error("Challenge submission failed");
            }
        } catch (err) {
            console.error("Challenge error:", err);
            setChallengeStatus("idle");
        }
    };

    const answerPreviewHtml = useMemo(() => renderMathSafe(answer), [answer]);

    // --- UI states ---
    if (error) {
        return (
            <main className="mx-auto flex-1 px-6 py-20 pt-24" style={{ maxWidth: "var(--page-max)" }}>
                <div className="card p-6">
                    <p className="mb-4">{error}</p>
                    <button onClick={() => window.location.reload()} className="btn">
                        Refresh page
                    </button>
                </div>
            </main>
        );
    }

    if (gameState === "loading") {
        return (
            <main className="mx-auto flex-1 px-6 py-20 pt-24" style={{ maxWidth: "var(--page-max)" }}>
                <p className="text-center">Loading problems...</p>
            </main>
        );
    }

    if (gameState === "onboarding") {
        const currentDesc = LEVEL_DESCRIPTIONS.find(
            (d) => difficulty >= d.range[0] && difficulty <= d.range[1]
        ) || LEVEL_DESCRIPTIONS[0];

        return (
            <main className="mx-auto flex-1 px-6 py-20 pt-24" style={{ maxWidth: "var(--page-max)" }}>
                <div className="textbook-page">
                    <h1 className="text-2xl mb-4">Welcome to Learn</h1>
                    <p className="opacity-70 mb-8">
                        How confident are you in your math ability? This helps us start you at the right level.
                    </p>

                    {/* Level slider */}
                    <div className="mb-8">
                        <div className="flex justify-between text-sm opacity-50 mb-2">
                            <span>1 (Easiest)</span>
                            <span>20 (Hardest)</span>
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={20}
                            value={difficulty}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setDifficulty(val);
                                difficultyRef.current = val;
                            }}
                            className="w-full"
                        />
                        <p className="text-center text-3xl mt-4 mb-2">Level {difficulty}</p>
                        <p className="text-center text-lg opacity-70">{currentDesc.label}</p>
                        <p className="text-center text-sm opacity-50">{currentDesc.examples}</p>
                    </div>

                    {/* Level reference */}
                    <div className="border border-foreground/20 p-4 mb-8">
                        <p className="text-xs uppercase tracking-widest opacity-40 mb-3">Level Guide</p>
                        <div className="grid gap-2 text-sm">
                            {LEVEL_DESCRIPTIONS.map((d) => (
                                <div
                                    key={d.label}
                                    className={`flex justify-between ${difficulty >= d.range[0] && difficulty <= d.range[1]
                                        ? "opacity-100"
                                        : "opacity-40"
                                        }`}
                                >
                                    <span>{d.range[0]}–{d.range[1]}: {d.label}</span>
                                    <span className="opacity-60">{d.examples}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            localStorage.setItem("aom_starting_level", difficulty.toString());
                            setGameState("solving");
                        }}
                        className="btn btn-primary w-full"
                    >
                        Start at Level {difficulty} →
                    </button>
                </div>
            </main>
        );
    }

    if (gameState === "complete") {
        return (
            <main className="mx-auto flex-1 px-6 py-20 pt-24" style={{ maxWidth: "var(--page-max)" }}>
                <div className="textbook-page">
                    <h1 className="text-2xl mb-6">Well done.</h1>
                    <p className="mb-6">You&apos;ve practiced all available problems at your level.</p>
                    <button
                        onClick={() => {
                            // Reset state cleanly; let the effect re-select a new first problem.
                            setSeenIds(new Set());
                            setCompletedCount(0);
                            setPreviousProblem(null);
                            setCurrentProblem(null);
                            setDifficulty(1);
                            difficultyRef.current = 1;
                            setLastOutcome(null);
                            setIsResolved(false);
                            setGameState("solving");
                        }}
                        className="btn"
                    >
                        Start over →
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto flex-1 px-6 py-20 pt-24" style={{ maxWidth: "var(--page-max)" }}>
            <div className="textbook-page">
                <div className="flex items-center justify-between mb-8 text-sm opacity-60 border-b border-foreground/20 pb-4">
                    <span>Level {currentProblem?.difficulty ?? difficultyRef.current} · #{completedCount + 1}</span>
                    <span>{currentProblem?.topic}</span>
                </div>

                {gameState === "solving" && currentProblem && (
                    <>
                        <div className="mb-8">
                            <p className="text-sm uppercase tracking-widest opacity-40 mb-2">Problem</p>
                            <p className="text-2xl md:text-3xl leading-relaxed">
                                <MathInline text={currentProblem.prompt} />
                            </p>
                        </div>

                        {answer && (
                            <div className="mb-6">
                                <p className="text-xs uppercase tracking-widest opacity-40 mb-2">Your Answer (Preview)</p>
                                <div className="text-xl" dangerouslySetInnerHTML={{ __html: answerPreviewHtml }} />
                            </div>
                        )}

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-sm opacity-60 block mb-2">
                                    Enter your answer (plain text or LaTeX)
                                </label>
                                <input
                                    type="text"
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="e.g. 42 or \frac{1}{2} or \sqrt{2}"
                                    autoFocus
                                    disabled={isSubmitting}
                                    maxLength={200}
                                    className="font-mono"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => submitAttempt("submit")}
                                    disabled={!answer.trim() || isSubmitting}
                                    className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? "..." : "Submit Answer"}
                                </button>
                                <button
                                    onClick={() => submitAttempt("giveup")}
                                    disabled={isSubmitting}
                                    className="btn disabled:opacity-50"
                                >
                                    Skip
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-foreground/20 pt-6">
                            <Link
                                href="/waitlist?feature=upload"
                                className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity"
                            >
                                <span className="text-2xl">📄</span>
                                <span>
                                    <span className="block font-medium">Upload handwritten answer</span>
                                    <span className="text-sm opacity-70">Take a photo or upload a PDF of your work</span>
                                </span>
                            </Link>
                        </div>
                    </>
                )}

                {gameState === "feedback" && (
                    <div className="text-center py-12">
                        <p className="text-3xl mb-8">
                            {lastOutcome === "correct"
                                ? "✓ Correct"
                                : lastOutcome === "giveup"
                                    ? "Skipped"
                                    : "✗ Incorrect"}
                        </p>

                        <div className="flex gap-3 justify-center">
                            {/* Wrong: allow retry without changing difficulty */}
                            {lastOutcome === "wrong" && !isResolved && (
                                <>
                                    <button
                                        onClick={() => {
                                            setAnswer("");
                                            setGameState("solving");
                                            // Resume timer for continued work on same problem
                                            resumeTimer();
                                        }}
                                        className="btn"
                                    >
                                        Try Again
                                    </button>

                                    <button
                                        onClick={() => finalizeAndContinue("wrong")}
                                        className="btn btn-primary"
                                    >
                                        Move On →
                                    </button>

                                    {/* Challenge answer button */}
                                    {challengeStatus === "idle" && (
                                        <button
                                            onClick={submitChallenge}
                                            className="text-sm opacity-50 hover:opacity-100 underline"
                                        >
                                            Challenge Answer
                                        </button>
                                    )}
                                    {challengeStatus === "submitting" && (
                                        <span className="text-sm opacity-50">Submitting...</span>
                                    )}
                                    {challengeStatus === "submitted" && (
                                        <span className="text-sm text-green-500">✓ Challenge submitted</span>
                                    )}

                                    {/* View Solution button (if video available) */}
                                    {currentProblem?.solution_video_url && (
                                        <button
                                            onClick={() => setGameState("watching")}
                                            className="text-sm opacity-50 hover:opacity-100 underline"
                                        >
                                            View Solution Video
                                        </button>
                                    )}
                                </>
                            )}

                            {/* Correct / Giveup: finalize immediately */}
                            {((lastOutcome === "correct" && isResolved) ||
                                lastOutcome === "giveup") && (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex gap-3">
                                            {/* View Solution button for Giveup (if video available) */}
                                            {lastOutcome === "giveup" && currentProblem?.solution_video_url && (
                                                <button
                                                    onClick={() => setGameState("watching")}
                                                    className="btn"
                                                >
                                                    View Solution
                                                </button>
                                            )}
                                            <button
                                                onClick={() => finalizeAndContinue(lastOutcome === "correct" ? "correct" : "giveup")}
                                                className="btn btn-primary"
                                            >
                                                Next Problem →
                                            </button>
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>
                )}

                {gameState === "watching" && currentProblem?.solution_video_url && (
                    <div className="py-8">
                        <p className="text-lg mb-6 opacity-70 text-center">Solution Explanation</p>

                        {/* Video embed - full viewport width */}
                        <div
                            className="relative mb-6"
                            style={{
                                width: "calc(100vw - 48px)",
                                maxWidth: "1200px",
                                marginLeft: "50%",
                                transform: "translateX(-50%)",
                                aspectRatio: "16 / 9"
                            }}
                        >
                            <iframe
                                src={currentProblem.solution_video_url.replace("watch?v=", "embed/")}
                                className="w-full h-full border border-foreground/20"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title="Solution video"
                            />
                        </div>

                        {/* Was this helpful? */}
                        <div className="text-center mb-6">
                            <p className="text-sm opacity-60 mb-3">Was this video helpful?</p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => {
                                        // TODO: Store feedback to analytics
                                        console.log("Video feedback: helpful");
                                        finalizeAndContinue(lastOutcome === "correct" ? "correct" : lastOutcome === "wrong" ? "wrong" : "giveup");
                                    }}
                                    className="btn"
                                >
                                    👍 Yes
                                </button>
                                <button
                                    onClick={() => {
                                        console.log("Video feedback: not helpful");
                                        finalizeAndContinue(lastOutcome === "correct" ? "correct" : lastOutcome === "wrong" ? "wrong" : "giveup");
                                    }}
                                    className="btn"
                                >
                                    👎 No
                                </button>
                            </div>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={() => finalizeAndContinue(lastOutcome === "correct" ? "correct" : lastOutcome === "wrong" ? "wrong" : "giveup")}
                                className="btn btn-primary"
                            >
                                Continue →
                            </button>
                        </div>
                    </div>
                )}

                {gameState === "voting" && previousProblem && currentProblem && (
                    <div className="py-8">
                        <p className="text-lg mb-6 opacity-70 text-center">Which was harder? Click to vote.</p>

                        {/* 3-column layout: [Previous] [Same] [Current] */}
                        <div className="grid grid-cols-3 gap-4 mb-8 items-stretch">
                            {/* Previous problem - click = previous was harder */}
                            <button
                                onClick={() => submitVote("easier")}
                                className="border border-foreground/30 p-5 text-left hover:border-foreground/60 hover:bg-foreground/5 transition-all cursor-pointer"
                            >
                                <p className="text-xs uppercase tracking-widest opacity-40 mb-3">Previous</p>
                                <p className="text-lg">
                                    <MathInline text={previousProblem.prompt} />
                                </p>
                            </button>

                            {/* Same difficulty - center button */}
                            <button
                                onClick={() => submitVote("same")}
                                className="border border-foreground/30 p-5 flex items-center justify-center hover:border-foreground/60 hover:bg-foreground/5 transition-all cursor-pointer"
                            >
                                <span className="text-center opacity-70">Same<br />Difficulty</span>
                            </button>

                            {/* Current problem - click = current was harder */}
                            <button
                                onClick={() => submitVote("harder")}
                                className="border border-foreground/30 p-5 text-left hover:border-foreground/60 hover:bg-foreground/5 transition-all cursor-pointer"
                            >
                                <p className="text-xs uppercase tracking-widest opacity-40 mb-3">Current</p>
                                <p className="text-lg">
                                    <MathInline text={currentProblem.prompt} />
                                </p>
                            </button>
                        </div>

                        <button
                            onClick={() => selectNextProblem(difficultyRef.current)}
                            className="w-full text-center opacity-50 hover:opacity-100 no-underline text-sm"
                        >
                            Skip →
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
