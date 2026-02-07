/**
 * Script to smartly wrap math expressions in `import.json` with LaTeX delimiters.
 * 
 * Usage: npx tsx scripts/smart-latex-wrapper.ts [--dry-run]
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMPORT_FILE = path.join(__dirname, "..", "import.json");

interface Problem {
    id: string;
    prompt: string;
    [key: string]: unknown;
}

// Helper to fix e^(...) syntax to e^{...} for LaTeX
function fixExponent(text: string): string {
    return text.replace(/e\^\(([^)]+)\)/g, "e^{$1}");
}

// Helper to wrap math in $...$ only if not already wrapped
function wrapMath(text: string): string {
    const fixed = fixExponent(text);
    const trimmed = fixed.trim();
    if (trimmed.startsWith("$") && trimmed.endsWith("$")) {
        return trimmed;
    }
    return `$${trimmed}$`;
}

// Regex patterns to match text prefixes and wrap the remaining math
const PATTERNS = [
    // Special fix for "(x in radians)" - Handles both raw and already (badly) wrapped cases
    {
        // Badly wrapped: "Compute $... (x in radians) = ?$"
        regex: /^Compute\s+\$(.+?)\s+\(x in radians\)\s*=\s*\?\$$/i,
        replace: (match: RegExpMatchArray) => `Compute ${wrapMath(match[1])} (x in radians) = ?`
    },
    {
        // Raw: "Compute ... (x in radians) = ?"
        regex: /^Compute\s+(.+?)\s+\(x in radians\)\s*=\s*\?$/i,
        replace: (match: RegExpMatchArray) => `Compute ${wrapMath(match[1])} (x in radians) = ?`
    },
    // Mixed content patterns (Prioritized)
    {
        // "For <math>, compute <math>"
        // "For e^(xy) = y, compute dy/dx at (0, 1)"
        regex: /^(For)\s+(.+?),\s*(compute)\s+(.+)$/i,
        replace: (match: RegExpMatchArray) => `${match[1]} ${wrapMath(match[2])}, ${match[3]} ${wrapMath(match[4])}`
    },
    {
        // "Solve for x: <math>" -> "Solve for x: $<math>$"
        regex: /^(Solve for [a-zA-Z0-9]+):\s*(.+)$/i,
        replace: (match: RegExpMatchArray) => `${match[1]}: ${wrapMath(match[2])}`
    },
    {
        // "Solve for the <something>: <math>"
        regex: /^(Solve for the .+?):\s*(.+)$/i,
        replace: (match: RegExpMatchArray) => `${match[1]}: ${wrapMath(match[2])}`
    },
    {
        // "Find the coefficient of <math> in <math>"
        regex: /^(Find the coefficient of)\s+(.+?)\s+(in)\s+(.+)$/i,
        replace: (match: RegExpMatchArray) => `${match[1]} ${wrapMath(match[2])} ${match[3]} ${wrapMath(match[4])}`
    },
    {
        // "Find the discriminant of <math>"
        regex: /^(Find the discriminant of)\s+(.+)$/i,
        replace: (match: RegExpMatchArray) => `${match[1]} ${wrapMath(match[2])}`
    },
    {
        // "Find the remainder when <math> is divided by <math>"
        regex: /^(Find the remainder when)\s+(.+?)\s+(is divided by)\s+(.+)$/i,
        replace: (match: RegExpMatchArray) => `${match[1]} ${wrapMath(match[2])} ${match[3]} ${wrapMath(match[4])}`
    },
    {
        // "Find the x-coordinate of <math>"
        regex: /^(Find the [a-z]-coordinate of)\s+(.+)$/i,
        replace: (match: RegExpMatchArray) => `${match[1]} ${wrapMath(match[2])}`
    },
    {
        // "How many positive divisors does <math> have?"
        regex: /^(How many positive divisors does)\s+(.+?)\s+(have)\?(\s*=\s*\?)?$/i,
        replace: (match: RegExpMatchArray) => `${match[1]} ${wrapMath(match[2])} ${match[3]}?${match[4] || ""}`
    },
    {
        // "How many trailing zeros does <math> have?"
        regex: /^(How many trailing zeros does)\s+(.+?)\s+(have)\?(\s*=\s*\?)?$/i,
        replace: (match: RegExpMatchArray) => `${match[1]} ${wrapMath(match[2])} ${match[3]}?${match[4] || ""}`
    },
    {
        // "Compute the sum of positive divisors of <math>"
        regex: /^(Compute the sum of positive divisors of)\s+(.+)$/i,
        replace: (match: RegExpMatchArray) => `${match[1]} ${wrapMath(match[2])}`
    },
    {
        // "Compute <math> for <math>"
        regex: /^(Compute)\s+(.+?)\s+(for)\s+(.+)$/i,
        replace: (match: RegExpMatchArray) => `${match[1]} ${wrapMath(match[2])} ${match[3]} ${wrapMath(match[4])}`
    },
    {
        // "Compute <math>" (generic fallback for compute)
        regex: /^(Compute)\s+(.+)$/i,
        replace: (match: RegExpMatchArray) => `${match[1]} ${wrapMath(match[2])}`
    },
    {
        // "What is the <something> of <math>?"
        regex: /^(What is the .+? of)\s+(.+)\?$/i,
        replace: (match: RegExpMatchArray) => `${match[1]} ${wrapMath(match[2])}?`
    },
    {
        // "What is <math>?"
        regex: /^(What is)\s+(.+)\?$/i,
        replace: (match: RegExpMatchArray) => `${match[1]} ${wrapMath(match[2])}?`
    },
    {
        // "Evaluate <math>"
        regex: /^(Evaluate)\s+(.+)$/i,
        replace: (match: RegExpMatchArray) => `${match[1]} ${wrapMath(match[2])}`
    },
    {
        // "If <math>, find <math>"
        regex: /^(If)\s+(.+?),\s*(find)\s+(.+?)(\.?)$/i,
        replace: (match: RegExpMatchArray) => `${match[1]} ${wrapMath(match[2])}, ${match[3]} ${wrapMath(match[4])}${match[5]}`
    },
    {
        // "If <math> then <math>"
        regex: /^(If)\s+([a-zA-Z0-9\(\)\s=+\-*/^]+)$/i,
        replace: (match: RegExpMatchArray) => `${match[1]} ${wrapMath(match[2])}`
    }
];

// Heuristic to check if a string is "pure math"
// Contains only digits, symbols, variables, but NO common english words (except maybe sin/cos etc)
// Allow: 0-9, space, +, -, *, /, =, ., (, ), x, y, z, ^, %, !, :, <, >, |
const SAFE_MATH_CHARS = /^[\d\s+\-×÷*/().=?:,<>|!%^a-z]+$/i;
const TEXT_WORDS = [
    "what", "is", "the", "find", "solve", "calculate", "simplify", "evaluate", "compute",
    "if", "then", "let", "given", "assume", "suppose", "ratio", "triangle", "circle",
    "square", "area", "volume", "perimeter", "how", "many", "positive", "divisors",
    "does", "have", "zeros", "trailing", "remainder", "divided", "by", "sum", "product"
];

function isPureMath(text: string): boolean {
    const trimmed = text.trim();
    if (!SAFE_MATH_CHARS.test(trimmed)) return false;

    // Check if it contains english words
    const lower = trimmed.toLowerCase();

    // Split by non-word chars to check individual words
    const words = lower.split(/[^a-z]+/);
    for (const word of words) {
        if (word.length > 1 && TEXT_WORDS.includes(word)) return false;
    }

    // Must contain at least one digit or operator to be worth wrapping
    if (!/[\d=+\-*/]/.test(trimmed)) return false;

    return true;
}

async function main() {
    const dryRun = process.argv.includes("--dry-run");

    console.log(`🚀 Starting Smart LaTeX Wrapper (${dryRun ? "DRY RUN" : "LIVE"})`);
    console.log(`📂 Reading ${IMPORT_FILE}...`);

    try {
        const content = fs.readFileSync(IMPORT_FILE, "utf-8");
        const problems: Problem[] = JSON.parse(content);

        let modified = 0;
        let skipped = 0;

        for (const problem of problems) {
            const originalPrompt = problem.prompt;

            // 1. Skip if empty
            if (!originalPrompt) {
                skipped++;
                continue;
            }

            // 2. Skip if already wrapped (starts with $)
            if (originalPrompt.trim().startsWith("$")) {
                skipped++;
                continue;
            }

            let newPrompt = originalPrompt;
            let matched = false;

            // 3. Try Pattern Matchings
            for (const pattern of PATTERNS) {
                const match = originalPrompt.match(pattern.regex);
                if (match) {
                    newPrompt = pattern.replace(match);
                    matched = true;
                    // Double check we didn't double-wrap interior $$
                    // The replacement logic adds $, but if the captured group already had $, we might get $$...$$
                    // Actually we assume the input didn't have $.
                    break;
                }
            }

            // 4. If no pattern matched, check for Pure Math
            if (!matched && isPureMath(originalPrompt)) {
                newPrompt = `$${originalPrompt}$`;
                matched = true;
            }

            if (matched && newPrompt !== originalPrompt) {
                if (dryRun) {
                    console.log(`📝 [${problem.id}]`);
                    console.log(`   Old: ${originalPrompt}`);
                    console.log(`   New: ${newPrompt}`);
                } else {
                    problem.prompt = newPrompt;
                }
                modified++;
            } else {
                skipped++;
                // In dry run, log some skipped ones to verify we aren't missing things
                if (dryRun && Math.random() < 0.001) { // Sample 0.1% of skipped
                    console.log(`⏭️  Skipped (No match): ${originalPrompt}`);
                }
            }
        }

        console.log("\n" + "=".repeat(50));
        console.log(`📊 Summary:`);
        console.log(`   Modified: ${modified}`);
        console.log(`   Skipped:  ${skipped}`);
        console.log(`   Total:    ${problems.length}`);

        if (!dryRun && modified > 0) {
            console.log(`💾 Writing changes to ${IMPORT_FILE}...`);
            fs.writeFileSync(IMPORT_FILE, JSON.stringify(problems, null, 4), "utf-8");
            console.log("✅ Done!");
        }

    } catch (err) {
        console.error("❌ Error:", err);
    }
}

main().catch(console.error);
