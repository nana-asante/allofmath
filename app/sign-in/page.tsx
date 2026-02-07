"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState } from "react";
import { FaGithub } from "react-icons/fa";

export default function SignInPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const supabase = createSupabaseBrowserClient();

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${location.origin}/auth/callback`,
            },
        });

        if (error) {
            setMessage("Error sending magic link. Please try again.");
            console.error(error);
        } else {
            setMessage("Check your email for the magic link!");
        }
        setLoading(false);
    };

    const handleGitHubLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "github",
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        });

        if (error) {
            setMessage("Error connecting to GitHub.");
            console.error(error);
            setLoading(false);
        }
    };

    return (
        <main className="flex-1 flex flex-col items-center justify-center p-6 min-h-[80vh]">
            <div className="w-full max-w-sm space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-serif">Sign In</h1>
                    <p className="mt-2 text-foreground/60">
                        Track your progress and get a rating
                    </p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleGitHubLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-[#24292F] text-white py-2.5 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        <FaGithub className="text-xl" />
                        <span>Continue with GitHub</span>
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-foreground/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-background text-foreground/40">
                                or continue with email
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-foreground/10 rounded-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-foreground/20"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-foreground text-background py-2.5 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
                        >
                            {loading ? "Sending..." : "Send Magic Link"}
                        </button>
                    </form>

                    {message && (
                        <div className="text-center text-sm p-3 bg-foreground/5 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
