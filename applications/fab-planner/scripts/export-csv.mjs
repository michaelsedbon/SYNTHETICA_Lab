#!/usr/bin/env node

/**
 * Export all parts from the SQLite database to a timestamped CSV file.
 * Usage: node scripts/export-csv.mjs
 * 
 * Output goes to: backups/parts_YYYY-MM-DD.csv
 */

import { createRequire } from "module";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const DB_PATH = join(PROJECT_ROOT, "dev.db");
const BACKUP_DIR = join(PROJECT_ROOT, "backups");

// Check DB exists
if (!existsSync(DB_PATH)) {
    console.log("Database not found at", DB_PATH);
    process.exit(0);
}

// Ensure backups directory exists
mkdirSync(BACKUP_DIR, { recursive: true });

// Date stamp
const now = new Date();
const stamp = now.toISOString().slice(0, 10); // YYYY-MM-DD
const outFile = join(BACKUP_DIR, `parts_${stamp}.csv`);

// Open DB read-only
const db = new Database(DB_PATH, { readonly: true });

// Fetch all parts
const parts = db.prepare("SELECT * FROM parts ORDER BY priority_order ASC").all();

if (parts.length === 0) {
    console.log("No parts to export.");
    process.exit(0);
}

// Build CSV
const headers = Object.keys(parts[0]);

function escapeCSV(val) {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

const lines = [
    headers.join(","),
    ...parts.map((row) => headers.map((h) => escapeCSV(row[h])).join(",")),
];

writeFileSync(outFile, lines.join("\n") + "\n", "utf-8");

console.log(`✓ Exported ${parts.length} parts to ${outFile}`);

db.close();
