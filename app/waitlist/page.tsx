import Link from "next/link";

export default function WaitlistPage() {
    return (
        <main className="flex-1 flex items-center justify-center px-6 py-16 min-h-[70vh]">
            <div className="text-center" style={{ maxWidth: "480px" }}>
                {/* Decorative math accent */}
                <div
                    className="text-6xl mb-8 opacity-15 select-none"
                    aria-hidden="true"
                    style={{ fontFamily: "Georgia, serif", letterSpacing: "0.2em" }}
                >
                    ∫ ∑ ∏
                </div>

                <h1
                    className="font-serif text-4xl md:text-5xl mb-6 tracking-tight"
                    style={{ letterSpacing: "-0.02em" }}
                >
                    Coming soon.
                </h1>

                <p className="text-lg mb-10 opacity-80 leading-relaxed">
                    This feature is currently in development.
                    <br />
                    In the meantime, you can start practicing math problems.
                </p>

                <Link href="/learn" className="btn btn-primary text-lg px-8 py-4">
                    Start learning →
                </Link>

                {/* Divider */}
                <div
                    className="my-12 mx-auto opacity-20"
                    style={{
                        width: "60px",
                        height: "1px",
                        background: "var(--foreground)"
                    }}
                />

                <p className="text-sm opacity-50 leading-relaxed">
                    Want to be notified when this launches?
                    <br />
                    Star our{" "}
                    <a
                        href="https://github.com/nana-asante/allofmath"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        github repository
                    </a>{" "}
                    to stay updated.
                </p>
            </div>
        </main>
    );
}
