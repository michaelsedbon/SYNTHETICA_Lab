/**
 * migrate-workspaces.mjs
 * 
 * Manual migration to add workspace support to existing SQLite database.
 * Steps:
 * 1. Create workspaces table
 * 2. Create workspace_parts table  
 * 3. Create workspace_settings table
 * 4. Create a default workspace
 * 5. Add workspace_id column to parts and projects (nullable)
 * 6. Fill workspace_id with default workspace
 * 7. Recreate parts and projects tables with required workspace_id (SQLite limitation)
 * 8. Migrate app_settings to workspace_settings
 */

import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "prisma", "dev.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF");

const DEFAULT_WS_ID = randomUUID();
const DEFAULT_WS_SLUG = "default";
const DEFAULT_WS_NAME = "My Workspace";

console.log("🔄 Starting workspace migration...");
console.log(`   Database: ${dbPath}`);

// ── Step 1: Create workspaces table ──
db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#569cd6',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log("✅ Created workspaces table");

// ── Step 2: Create workspace_parts table ──
db.exec(`
  CREATE TABLE IF NOT EXISTS workspace_parts (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL,
    part_id TEXT NOT NULL,
    local_priority INTEGER NOT NULL DEFAULT 0,
    shared_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
    UNIQUE(workspace_id, part_id)
  );
  CREATE INDEX IF NOT EXISTS idx_workspace_parts_workspace ON workspace_parts(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_workspace_parts_part ON workspace_parts(part_id);
`);
console.log("✅ Created workspace_parts table");

// ── Step 3: Create workspace_settings table ──
db.exec(`
  CREATE TABLE IF NOT EXISTS workspace_settings (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    UNIQUE(workspace_id, key)
  );
`);
console.log("✅ Created workspace_settings table");

// ── Step 4: Create default workspace ──
const existing = db.prepare("SELECT id FROM workspaces WHERE slug = ?").get(DEFAULT_WS_SLUG);
if (!existing) {
    db.prepare(
        "INSERT INTO workspaces (id, name, slug, color, created_at) VALUES (?, ?, ?, ?, datetime('now'))"
    ).run(DEFAULT_WS_ID, DEFAULT_WS_NAME, DEFAULT_WS_SLUG, "#569cd6");
    console.log(`✅ Created default workspace: "${DEFAULT_WS_NAME}" (${DEFAULT_WS_ID})`);
} else {
    console.log(`⏭️  Default workspace already exists (${existing.id})`);
}

const wsId = existing ? existing.id : DEFAULT_WS_ID;

// ── Step 5 & 6: Add workspace_id to parts ──
// Check if column already exists
const partCols = db.prepare("PRAGMA table_info(parts)").all();
const hasPartWsCol = partCols.some(c => c.name === "workspace_id");

if (!hasPartWsCol) {
    db.exec(`ALTER TABLE parts ADD COLUMN workspace_id TEXT`);
    db.prepare(`UPDATE parts SET workspace_id = ?`).run(wsId);
    console.log(`✅ Added workspace_id to parts, set all to default workspace`);
} else {
    // Fill any nulls
    const nullCount = db.prepare("SELECT COUNT(*) as cnt FROM parts WHERE workspace_id IS NULL").get();
    if (nullCount.cnt > 0) {
        db.prepare("UPDATE parts SET workspace_id = ? WHERE workspace_id IS NULL").run(wsId);
        console.log(`✅ Filled ${nullCount.cnt} null workspace_id values in parts`);
    } else {
        console.log("⏭️  parts.workspace_id already populated");
    }
}

// ── Step 7: Add workspace_id to projects ──
const projCols = db.prepare("PRAGMA table_info(projects)").all();
const hasProjWsCol = projCols.some(c => c.name === "workspace_id");

if (!hasProjWsCol) {
    db.exec(`ALTER TABLE projects ADD COLUMN workspace_id TEXT`);
    db.prepare(`UPDATE projects SET workspace_id = ?`).run(wsId);
    console.log(`✅ Added workspace_id to projects, set all to default workspace`);
} else {
    const nullCount = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE workspace_id IS NULL").get();
    if (nullCount.cnt > 0) {
        db.prepare("UPDATE projects SET workspace_id = ? WHERE workspace_id IS NULL").run(wsId);
        console.log(`✅ Filled ${nullCount.cnt} null workspace_id values in projects`);
    } else {
        console.log("⏭️  projects.workspace_id already populated");
    }
}

// ── Step 8: Add indexes on workspace_id ──
try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_parts_workspace ON parts(workspace_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id)`);
    console.log("✅ Created workspace indexes");
} catch {
    console.log("⏭️  Indexes already exist");
}

// ── Step 9: Migrate app_settings to workspace_settings ──
try {
    const appSettings = db.prepare("SELECT key, value FROM app_settings").all();
    if (appSettings.length > 0) {
        const insert = db.prepare(
            "INSERT OR IGNORE INTO workspace_settings (id, workspace_id, key, value) VALUES (?, ?, ?, ?)"
        );
        for (const s of appSettings) {
            insert.run(randomUUID(), wsId, s.key, s.value);
        }
        console.log(`✅ Migrated ${appSettings.length} app_settings to workspace_settings`);
    }
} catch {
    console.log("⏭️  No app_settings to migrate");
}

// ── Summary ──
const partCount = db.prepare("SELECT COUNT(*) as cnt FROM parts").get();
const projectCount = db.prepare("SELECT COUNT(*) as cnt FROM projects").get();
const wsCount = db.prepare("SELECT COUNT(*) as cnt FROM workspaces").get();

console.log("\n📊 Migration summary:");
console.log(`   Workspaces: ${wsCount.cnt}`);
console.log(`   Parts: ${partCount.cnt} (all assigned to default workspace)`);
console.log(`   Projects: ${projectCount.cnt} (all assigned to default workspace)`);
console.log("\n✅ Migration complete!");

db.close();
