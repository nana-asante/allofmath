import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";
import { ProblemSchema } from "../data/schema/problem.schema";

const problemsDir = path.join(process.cwd(), "data/problems");

function fail(msg: string): never {
    console.error(`${msg}`);
    process.exit(1);
}

/**
 * Normalize a prompt for duplicate detection.
 * Strips whitespace, lowercases, removes punctuation variance.
 */
function normalizePrompt(prompt: string): string {
    return prompt
        .toLowerCase()
        .replace(/\s+/g, " ")        // Collapse whitespace
        .replace(/[.,!?;:'"]/g, "")  // Remove punctuation
        .trim();
}

// Find all JSON files in data/problems/**/*.json
const files = globSync("**/*.json", { cwd: problemsDir });

if (files.length === 0) {
    fail(`No problem files found in ${problemsDir}`);
}

const ids = new Set<string>();
const prompts = new Map<string, string>(); // normalized prompt -> first file with it
const exactPrompts = new Map<string, string>(); // exact prompt -> first file with it

let validCount = 0;

for (const relPath of files) {
    const fullPath = path.join(problemsDir, relPath);

    let raw: string;
    try {
        raw = fs.readFileSync(fullPath, "utf8");
    } catch (e) {
        fail(`Could not read ${fullPath}`);
    }

    let obj: unknown;
    try {
        obj = JSON.parse(raw);
    } catch (e) {
        fail(`Invalid JSON in ${relPath}`);
    }

    const parsed = ProblemSchema.safeParse(obj);
    if (!parsed.success) {
        console.error(`Schema error in ${relPath}`);
        console.error(parsed.error.issues);
        process.exit(1);
    }

    const problem = parsed.data;

    // Validate filename matches ID
    const expectedFilename = `${problem.id}.json`;
    const actualFilename = path.basename(relPath);
    if (actualFilename !== expectedFilename) {
        fail(`Filename mismatch: ${relPath} should be named ${expectedFilename}`);
    }

    // Check for duplicate IDs
    if (ids.has(problem.id)) {
        fail(`Duplicate id "${problem.id}" in ${relPath}`);
    }
    ids.add(problem.id);

    // Check for exact duplicate prompts
    const promptText = problem.prompt_latex || problem.prompt;
    if (exactPrompts.has(promptText)) {
        fail(`Duplicate problem detected!\n  File: ${relPath}\n  Matches: ${exactPrompts.get(promptText)}\n  (Exact prompt match)`);
    }
    exactPrompts.set(promptText, relPath);

    // Check for near-duplicate prompts (same content, different formatting)
    const normalizedPrompt = normalizePrompt(promptText);
    if (prompts.has(normalizedPrompt)) {
        const existingFile = prompts.get(normalizedPrompt)!;
        // Only warn if not the exact same file (already caught above)
        if (existingFile !== relPath) {
            console.warn(`Potential duplicate in ${relPath}`);
            console.warn(`Similar to: ${existingFile}`);
            console.warn(`Review manually to confirm.\n`);
        }
    } else {
        prompts.set(normalizedPrompt, relPath);
    }

    validCount++;
}

console.log(`Dataset OK. Problems: ${validCount} files validated.`);

