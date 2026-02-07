import "server-only";
import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";
import { ProblemSchema, type Problem } from "@/data/schema/problem.schema";

// Cache problems in memory (reloaded on cold start)
let problemsMap: Map<string, Problem> | null = null;
let problemsList: Problem[] | null = null;

/**
 * Load all problems as a Map (id -> Problem).
 * Cached per warm instance.
 */
export function loadProblemsMap(): Map<string, Problem> {
    if (problemsMap) return problemsMap;

    const problems = loadProblemsList();
    const map = new Map<string, Problem>();
    for (const p of problems) {
        map.set(p.id, p);
    }

    problemsMap = map;
    return map;
}

/**
 * Load all problems as an array.
 * Cached per warm instance.
 */
export function loadProblemsList(): Problem[] {
    if (problemsList) return problemsList;

    const problemsDir = path.join(process.cwd(), "data/problems");
    const files = globSync("**/*.json", { cwd: problemsDir });

    const problems: Problem[] = [];

    for (const relPath of files) {
        const fullPath = path.join(problemsDir, relPath);
        try {
            const raw = fs.readFileSync(fullPath, "utf8");
            const obj = JSON.parse(raw);
            const parsed = ProblemSchema.parse(obj);
            problems.push(parsed);
        } catch (e) {
            console.error(`Failed to load problem: ${relPath}`, e);
            // Skip invalid files, don't crash
        }
    }

    problemsList = problems;
    return problems;
}

/**
 * Clear cached problems (useful for testing).
 */
export function clearProblemsCache(): void {
    problemsMap = null;
    problemsList = null;
}
