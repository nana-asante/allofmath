#!/usr/bin/env tsx
/**
 * Verify a problem by changing its status from "community" to "verified".
 * Usage: pnpm problem:verify aom_algebra_0001
 */

import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";

const problemId = process.argv[2];

if (!problemId) {
    console.error("Usage: pnpm problem:verify <problem_id>");
    console.error("Example: pnpm problem:verify aom_algebra_0001");
    process.exit(1);
}

// Validate ID format
if (!/^aom_[a-z0-9_]+$/.test(problemId)) {
    console.error(`Invalid problem ID format: ${problemId}`);
    console.error("Expected format: aom_topic_number (e.g., aom_algebra_0001)");
    process.exit(1);
}

const problemsDir = path.join(process.cwd(), "data/problems");
const files = globSync("**/*.json", { cwd: problemsDir });

// Find the problem file
let targetFile: string | null = null;
for (const relPath of files) {
    if (path.basename(relPath, ".json") === problemId) {
        targetFile = path.join(problemsDir, relPath);
        break;
    }
}

if (!targetFile) {
    console.error(`Problem not found: ${problemId}`);
    process.exit(1);
}

// Read and parse the problem
let content: string;
try {
    content = fs.readFileSync(targetFile, "utf8");
} catch {
    console.error(`Could not read file: ${targetFile}`);
    process.exit(1);
}

let problem: Record<string, unknown>;
try {
    problem = JSON.parse(content);
} catch {
    console.error(`Invalid JSON in: ${targetFile}`);
    process.exit(1);
}

// Check current status
if (problem.status === "verified") {
    console.log(`Problem ${problemId} is already verified.`);
    process.exit(0);
}

if (problem.status !== "community") {
    console.error(`Unexpected status: ${problem.status}`);
    console.error("Expected 'community' to verify.");
    process.exit(1);
}

// Update status
problem.status = "verified";

// Write back with pretty formatting
try {
    fs.writeFileSync(targetFile, JSON.stringify(problem, null, 2) + "\n", "utf8");
} catch {
    console.error(`Could not write file: ${targetFile}`);
    process.exit(1);
}

console.log(`Verified: ${problemId}`);
console.log(`Updated: ${targetFile}`);
