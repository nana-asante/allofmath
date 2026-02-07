import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";

const problemsDir = path.join(process.cwd(), "data/problems");

interface ProblemFile {
    relPath: string;
    fullPath: string;
    id: string;
    content: any;
}

function loadProblems(): ProblemFile[] {
    const files = globSync("**/*.json", { cwd: problemsDir });
    const problems: ProblemFile[] = [];

    for (const relPath of files) {
        const fullPath = path.join(problemsDir, relPath);
        try {
            const raw = fs.readFileSync(fullPath, "utf8");
            const content = JSON.parse(raw);
            if (content.id) {
                problems.push({ relPath, fullPath, id: content.id, content });
            }
        } catch (e) {
            console.error(`Failed to read/parse ${relPath}`, e);
        }
    }
    return problems;
}

function getNextId(baseId: string, allIds: Set<string>): string {
    // Expected format: aom_topic_0001
    // We look for the last underscore to separate prefix and number
    const lastUnderscore = baseId.lastIndexOf("_");
    if (lastUnderscore === -1) {
        // Fallback for weird IDs: append _2, _3, etc.
        let counter = 2;
        while (allIds.has(`${baseId}_${counter}`)) {
            counter++;
        }
        return `${baseId}_${counter}`;
    }

    const prefix = baseId.substring(0, lastUnderscore);
    const suffix = baseId.substring(lastUnderscore + 1);

    // Check if suffix is a number
    if (!/^\d+$/.test(suffix)) {
        let counter = 2;
        while (allIds.has(`${baseId}_${counter}`)) {
            counter++;
        }
        return `${baseId}_${counter}`;
    }

    // It follows the standard format. Find the max number for this prefix.
    let maxNum = 0;
    const prefixRegex = new RegExp(`^${prefix}_(\\d+)$`);

    for (const id of allIds) {
        const match = id.match(prefixRegex);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    }

    let nextNum = maxNum + 1;
    let nextId = `${prefix}_${nextNum.toString().padStart(4, "0")}`;

    // Double check it doesn't exist (it shouldn't if logic is correct)
    while (allIds.has(nextId)) {
        nextNum++;
        nextId = `${prefix}_${nextNum.toString().padStart(4, "0")}`;
    }

    return nextId;
}

function main() {
    console.log("Scanning for duplicate IDs...");
    const problems = loadProblems();

    const idMap = new Map<string, ProblemFile[]>();
    const allIds = new Set<string>();

    // Pass 1: Group by ID
    for (const p of problems) {
        if (!idMap.has(p.id)) {
            idMap.set(p.id, []);
        }
        idMap.get(p.id)!.push(p);
        allIds.add(p.id);
    }

    let fixedCount = 0;

    // Pass 2: Fix duplicates
    for (const [id, files] of idMap.entries()) {
        if (files.length > 1) {
            console.log(`\nFound duplicate ID: ${id} (${files.length} files)`);

            // Sort files to have deterministic order. 
            // We keep the one that matches the filename (if any), or just the first one.
            files.sort((a, b) => {
                const aMatches = path.basename(a.relPath, ".json") === id;
                const bMatches = path.basename(b.relPath, ".json") === id;
                if (aMatches && !bMatches) return -1;
                if (!aMatches && bMatches) return 1;
                return a.relPath.localeCompare(b.relPath);
            });

            // The first one keeps the ID (if we assume it's the "original")
            // Actually, if filename matches ID, let's keep that one.
            const keeper = files[0];
            console.log(`  Keeping ID for: ${keeper.relPath}`);

            // Rename others
            for (let i = 1; i < files.length; i++) {
                const fileToFix = files[i];
                const newId = getNextId(id, allIds);

                // Reserve this new ID immediately so next iteration doesn't take it
                allIds.add(newId);

                console.log(`  Renaming ${fileToFix.relPath} -> ID: ${newId}`);

                // Update JSON content
                fileToFix.content.id = newId;

                // Determine new filename
                const dir = path.dirname(fileToFix.fullPath);
                const newFilename = `${newId}.json`;
                const newFullPath = path.join(dir, newFilename);

                // Write changes
                try {
                    // Update content
                    fs.writeFileSync(fileToFix.fullPath, JSON.stringify(fileToFix.content, null, 2));

                    // Rename file
                    fs.renameSync(fileToFix.fullPath, newFullPath);

                    console.log(`    -> Renamed to ${path.join(path.dirname(fileToFix.relPath), newFilename)}`);
                    fixedCount++;
                } catch (e) {
                    console.error(`    FAILED to update ${fileToFix.relPath}`, e);
                }
            }
        }
    }

    console.log(`\nDone. Fixed ${fixedCount} duplicate(s).`);
}

main();
