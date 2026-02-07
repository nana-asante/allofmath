import fs from "node:fs";
import path from "node:path";
import { Problem } from "../data/schema/problem.schema";

const problemsDir = path.join(process.cwd(), "data/problems");

interface ImportResult {
    success: number;
    skipped: number;
    failed: number;
    errors: string[];
}

function normalizeTopic(topic: string): string {
    return topic.toLowerCase().replace(/\s+/g, "-");
}

function main() {
    const args = process.argv.slice(2);
    const force = args.includes("--force");

    // Filter out flags to get the input file
    const nonFlagArgs = args.filter(arg => !arg.startsWith("--"));
    if (nonFlagArgs.length === 0) {
        console.error("Usage: npx tsx scripts/import-problems.ts <path-to-json-file> [--force]");
        process.exit(1);
    }
    const inputFilePath = nonFlagArgs[0];

    if (!fs.existsSync(inputFilePath)) {
        console.error(`File not found: ${inputFilePath}`);
        process.exit(1);
    }

    let problems: any[];
    try {
        const raw = fs.readFileSync(inputFilePath, "utf8");
        problems = JSON.parse(raw);
        if (!Array.isArray(problems)) {
            throw new Error("Input file must contain a JSON array of problems.");
        }
    } catch (e: any) {
        console.error(`Failed to parse input file: ${e.message}`);
        process.exit(1);
    }

    console.log(`Found ${problems.length} problems to import...`);
    if (force) console.log("⚠️  Force mode enabled: Existing files will be overwritten.");

    const result: ImportResult = {
        success: 0,
        skipped: 0,
        failed: 0,
        errors: []
    };

    for (const p of problems) {
        // basic validation
        if (!p.id || !p.topic) {
            result.failed++;
            result.errors.push(`Problem missing 'id' or 'topic': ${JSON.stringify(p).substring(0, 50)}...`);
            continue;
        }

        const topicDirName = normalizeTopic(p.topic);
        const targetDir = path.join(problemsDir, topicDirName);

        // Create directory if it doesn't exist
        if (!fs.existsSync(targetDir)) {
            console.log(`Creating directory: ${targetDir}`);
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const filename = `${p.id}.json`;
        const targetPath = path.join(targetDir, filename);

        if (fs.existsSync(targetPath) && !force) {
            console.warn(`[SKIP] File already exists: ${p.id}`);
            result.skipped++;
            continue;
        }

        try {
            // Note: we're blindly trusting the content mostly, validation should run after
            // But we can do a minimal check if it matches the ID
            if (p.id !== path.basename(filename, ".json")) {
                // This should be impossible given how we construct filename, but nice sanity check
            }

            fs.writeFileSync(targetPath, JSON.stringify(p, null, 2));
            console.log(`[OK] Wrote ${path.join(topicDirName, filename)}`);
            result.success++;
        } catch (e: any) {
            console.error(`[FAIL] Could not write ${p.id}:`, e.message);
            result.failed++;
            result.errors.push(`${p.id}: ${e.message}`);
        }
    }

    console.log("\nImport Summary:");
    console.log(`  Success: ${result.success}`);
    console.log(`  Skipped: ${result.skipped}`);
    console.log(`  Failed:  ${result.failed}`);

    if (result.errors.length > 0) {
        console.log("\nErrors:");
        result.errors.forEach(e => console.log(`  - ${e}`));
    }
}

main();
