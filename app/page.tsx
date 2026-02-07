import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";
import Link from "next/link";
import { MathBackground } from "@/components/MathBackground";

function getProblemCount() {
  const problemsDir = path.join(process.cwd(), "data/problems");
  const files = globSync("**/*.json", { cwd: problemsDir });
  return files.length;
}

export default function HomePage() {
  const count = getProblemCount();

  return (
    <>
      {/* Hero Section - add padding-top for transparent header */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden pt-16">
        {/* Interactive floating math symbols */}
        <MathBackground />

        {/* Hero content */}
        <div className="relative z-10 text-center px-6" style={{ maxWidth: "800px" }}>
          <h1 className="text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight">
            An attempt to compile all existing solved math problems in history.
          </h1>
        </div>
      </section>

      {/* Black banner with problem count */}
      <div className="banner cursor-invert">
        <Link href="/learn" className="no-underline hover:opacity-80 transition-opacity">
          {count.toLocaleString()} problems and counting →
        </Link>
      </div>

      {/* Centered Open Source section */}
      <main className="flex-1 px-6 py-20">
        <div className="text-center">
          <h2 className="text-2xl mb-6">Open Source</h2>
          <p className="max-w-md mx-auto leading-relaxed opacity-70 mb-6">
            All of Math is fully open source. Anyone can contribute problems
            via pull requests. All problems must have proper licensing
            and attribution.
          </p>
          <a
            href="https://github.com/nana-asante/allofmath"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            View on GitHub →
          </a>
        </div>
      </main>
    </>
  );
}
