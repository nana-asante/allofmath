"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from "recharts";
import Link from "next/link";
import { User } from "@supabase/supabase-js";

type Stats = {
    rating: number;
    level: number;
    solvedCount: number;
    totalAttempts: number;
    accuracy: number;
};

type HistoryPoint = {
    created_at: string;
    rating: number;
};

type TopicPoint = {
    topic: string;
    count: number;
};

// Level labels for display
const LEVEL_LABELS = [
    "", "Novice", "Beginner", "Learner", "Student", "Scholar",
    "Adept", "Expert", "Master", "Grandmaster", "Legend"
];

function getLevelLabel(level: number): string {
    if (level <= 0) return "Novice";
    if (level >= LEVEL_LABELS.length) return "Legend";
    return LEVEL_LABELS[level];
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [history, setHistory] = useState<HistoryPoint[]>([]);
    const [topicData, setTopicData] = useState<TopicPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const res = await fetch("/api/me/stats");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data.stats);
                    setHistory(data.history);
                    setTopicData(data.topicData ?? []);
                }
            }
            setLoading(false);
        }
        loadData();
    }, [supabase.auth]); // Added dependency

    useEffect(() => {
        if (!loading && !user) {
            window.location.href = "/sign-in";
        }
    }, [loading, user]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
    };

    if (loading) {
        return (
            <main className="flex-1 flex items-center justify-center min-h-screen">
                <div className="animate-pulse text-foreground/40 text-lg">Loading...</div>
            </main>
        );
    }

    if (!user) {
        return (
            <main className="flex-1 flex items-center justify-center min-h-screen">
                <div className="animate-pulse text-foreground/40">Redirecting...</div>
            </main>
        );
    }

    const level = stats?.level ?? 1;
    const rating = stats?.rating ?? 1000;
    const levelLabel = getLevelLabel(level);
    const progressToNextLevel = ((rating % 200) / 200) * 100;

    return (
        <main className="flex-1 min-h-screen pt-24 pb-16 px-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <header className="flex items-start justify-between mb-16">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-serif mb-2">
                            My Progress
                        </h1>
                        <p className="text-foreground/50">{user.email}</p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="text-sm text-foreground/40 hover:text-foreground transition-colors"
                    >
                        Sign Out
                    </button>
                </header>

                {/* Rating Hero */}
                <section className="mb-16">
                    <div className="flex flex-wrap items-baseline gap-6 mb-6">
                        <div>
                            <p className="text-sm text-foreground/40 uppercase tracking-wide mb-1">Rating</p>
                            <p className="text-6xl md:text-7xl font-serif tabular-nums">{rating}</p>
                        </div>
                        <div className="border-l border-foreground/10 pl-6">
                            <p className="text-sm text-foreground/40 uppercase tracking-wide mb-1">Level</p>
                            <p className="text-2xl font-serif">{level} <span className="text-foreground/50 font-normal">· {levelLabel}</span></p>
                        </div>
                    </div>

                    {/* Progress to next level */}
                    <div className="max-w-sm">
                        <div className="flex justify-between text-xs text-foreground/40 mb-2">
                            <span>Progress to Level {level + 1}</span>
                            <span>{Math.round(progressToNextLevel)}%</span>
                        </div>
                        <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-foreground/60 rounded-full transition-all duration-700"
                                style={{ width: `${progressToNextLevel}%` }}
                            />
                        </div>
                    </div>
                </section>

                {/* Stats Grid */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
                    <StatCard label="Solved" value={stats?.solvedCount ?? 0} />
                    <StatCard label="Attempts" value={stats?.totalAttempts ?? 0} />
                    <StatCard label="Accuracy" value={`${stats?.accuracy ?? 0}%`} />
                    <StatCard label="Topics" value={topicData.length} />
                </section>

                {/* Charts */}
                <section className="space-y-12">
                    {/* Rating History */}
                    <div>
                        <h2 className="text-xl font-serif mb-6">Rating History</h2>
                        <div className="h-64 border border-foreground/10 rounded-lg p-4">
                            {history.length > 1 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={history}>
                                        <XAxis dataKey="created_at" hide />
                                        <YAxis domain={['auto', 'auto']} hide />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "var(--background)",
                                                borderColor: "var(--foreground)",
                                                borderRadius: "4px",
                                                fontSize: "14px"
                                            }}
                                            labelFormatter={(v) => new Date(v).toLocaleDateString()}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="rating"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-foreground/40 text-sm">
                                    Solve more problems to see your rating history.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Topics Chart */}
                    <div>
                        <h2 className="text-xl font-serif mb-6">Topics Covered</h2>
                        <div className="h-64 border border-foreground/10 rounded-lg p-4">
                            {topicData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topicData} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis
                                            type="category"
                                            dataKey="topic"
                                            width={100}
                                            tick={{ fontSize: 13, fill: "var(--foreground)" }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "var(--background)",
                                                borderColor: "var(--foreground)",
                                                borderRadius: "4px",
                                                fontSize: "14px"
                                            }}
                                            formatter={(value) => [`${value} solved`, "Problems"]}
                                        />
                                        <Bar
                                            dataKey="count"
                                            fill="currentColor"
                                            radius={[0, 4, 4, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-foreground/40 text-sm">
                                    Start practicing to see your topic progress.
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <div className="mt-16 text-center">
                    <Link
                        href="/learn"
                        className="inline-block px-8 py-3 border border-foreground text-foreground font-medium rounded hover:bg-foreground hover:text-background transition-colors"
                    >
                        Continue Learning →
                    </Link>
                </div>
            </div>
        </main>
    );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="p-5 border border-foreground/10 rounded-lg">
            <div className="text-3xl md:text-4xl font-serif mb-1">{value}</div>
            <div className="text-sm text-foreground/50">{label}</div>
        </div>
    );
}
