#!/usr/bin/env tsx
/**
 * Batch verify problems by changing status from "community" to "verified".
 * Usage: pnpm problem:verify-batch <pattern>
 */

import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";

const pattern = process.argv[2];

if (!pattern) {
    console.error("Usage: pnpm problem:verify-batch <glob-pattern>");
    console.error("");
    console.error("Examples:");
    console.error("  pnpm problem:verify-batch 'arithmetic/*'     # All arithmetic problems");
    console.error("  pnpm problem:verify-batch '**/*'             # All problems");
    console.error("  pnpm problem:verify-batch 'algebra/aom_*'    # Pattern match");
    process.exit(1);
}

const problemsDir = path.join(process.cwd(), "data/problems");

// Find matching files
const files = globSync(`${pattern}.json`, { cwd: problemsDir });

if (files.length === 0) {
    console.error(`No problems found matching: ${pattern}`);
    process.exit(1);
}

let verifiedCount = 0;
let skippedCount = 0;
let errorCount = 0;

for (const relPath of files) {
    const fullPath = path.join(problemsDir, relPath);
    const problemId = path.basename(relPath, ".json");

    try {
        const content = fs.readFileSync(fullPath, "utf8");
        const problem = JSON.parse(content) as Record<string, unknown>;

        if (problem.status === "verified") {
            console.log(`  Skip: ${problemId} (already verified)`);
            skippedCount++;
            continue;
        }

        if (problem.status !== "community") {
            console.log(`  Skip: ${problemId} (status: ${problem.status})`);
            skippedCount++;
            continue;
        }

        // Update status
        problem.status = "verified";
        fs.writeFileSync(fullPath, JSON.stringify(problem, null, 2) + "\n", "utf8");
        console.log(`  Verified: ${problemId}`);
        verifiedCount++;
    } catch (e) {
        console.error(`  Error: ${problemId} - ${e}`);
        errorCount++;
    }
}

console.log("");
console.log(`Done. Verified: ${verifiedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);

if (errorCount > 0) {
    process.exit(1);
}
