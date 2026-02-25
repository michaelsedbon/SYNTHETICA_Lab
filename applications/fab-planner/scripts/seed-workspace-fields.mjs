#!/usr/bin/env node
/**
 * Seed workspace_fields for all existing workspaces.
 * Creates built-in field definitions for each workspace.
 * Run: node scripts/seed-workspace-fields.mjs
 */

import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, "..", "dev.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const BUILT_IN_FIELDS = [
    { key: "status", label: "Status", icon: "🔄", fieldType: "select", sortOrder: 0 },
    { key: "material", label: "Material", icon: "🧱", fieldType: "select", sortOrder: 1 },
    { key: "client", label: "Client", icon: "👤", fieldType: "select", sortOrder: 2 },
    { key: "hospital", label: "Hospital", icon: "🏥", fieldType: "select", sortOrder: 3 },
    { key: "who", label: "Who", icon: "🙋", fieldType: "select", sortOrder: 4 },
    { key: "type", label: "Type", icon: "📋", fieldType: "select", sortOrder: 5 },
    { key: "fabMechanism", label: "Fab Mechanism", icon: "⚙️", fieldType: "select", sortOrder: 6 },
];

const workspaces = db.prepare("SELECT id, name FROM workspaces").all();

const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO workspace_fields (id, workspace_id, key, label, icon, field_type, built_in, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
`);

const insertAll = db.transaction(() => {
    for (const ws of workspaces) {
        console.log(`Seeding fields for workspace: ${ws.name} (${ws.id})`);
        for (const f of BUILT_IN_FIELDS) {
            insertStmt.run(randomUUID(), ws.id, f.key, f.label, f.icon, f.fieldType, f.sortOrder);
        }
    }
});

insertAll();

const count = db.prepare("SELECT COUNT(*) as c FROM workspace_fields").get();
console.log(`\nDone! ${count.c} workspace field(s) in total.`);

db.close();
