/**
 * Migrate the root dev.db to add workspace tables and data.
 */
const Database = require("better-sqlite3");
const { randomUUID } = require("crypto");
const path = require("path");

const dbPath = path.join(__dirname, "..", "dev.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF");

const DEFAULT_WS_ID = randomUUID();

console.log("Migrating:", dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#569cd6',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
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
  CREATE TABLE IF NOT EXISTS workspace_settings (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    UNIQUE(workspace_id, key)
  );
`);
console.log("✅ Created tables");

// Create default workspace
const existing = db.prepare("SELECT id FROM workspaces WHERE slug = ?").get("default");
let wsId;
if (!existing) {
    db.prepare('INSERT INTO workspaces (id, name, slug, color, created_at) VALUES (?, ?, ?, ?, datetime("now"))').run(DEFAULT_WS_ID, "My Workspace", "default", "#569cd6");
    wsId = DEFAULT_WS_ID;
    console.log("✅ Created default workspace");
} else {
    wsId = existing.id;
    console.log("⏭️  Default workspace already exists");
}

// Add workspace_id to parts
const partCols = db.prepare("PRAGMA table_info(parts)").all();
if (!partCols.some((c) => c.name === "workspace_id")) {
    db.exec("ALTER TABLE parts ADD COLUMN workspace_id TEXT");
    db.prepare("UPDATE parts SET workspace_id = ?").run(wsId);
    console.log("✅ Added workspace_id to parts");
} else {
    const r = db.prepare("UPDATE parts SET workspace_id = ? WHERE workspace_id IS NULL").run(wsId);
    console.log(`✅ Updated ${r.changes} null workspace_ids in parts`);
}

// Add workspace_id to projects
const projCols = db.prepare("PRAGMA table_info(projects)").all();
if (!projCols.some((c) => c.name === "workspace_id")) {
    db.exec("ALTER TABLE projects ADD COLUMN workspace_id TEXT");
    db.prepare("UPDATE projects SET workspace_id = ?").run(wsId);
    console.log("✅ Added workspace_id to projects");
} else {
    const r = db.prepare("UPDATE projects SET workspace_id = ? WHERE workspace_id IS NULL").run(wsId);
    console.log(`✅ Updated ${r.changes} null workspace_ids in projects`);
}

db.exec("CREATE INDEX IF NOT EXISTS idx_parts_workspace ON parts(workspace_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id)");

// Migrate app_settings
try {
    const appSettings = db.prepare("SELECT key, value FROM app_settings").all();
    for (const s of appSettings) {
        db.prepare("INSERT OR IGNORE INTO workspace_settings (id, workspace_id, key, value) VALUES (?, ?, ?, ?)").run(randomUUID(), wsId, s.key, s.value);
    }
    console.log(`✅ Migrated ${appSettings.length} settings`);
} catch (e) {
    console.log("⏭️  No settings to migrate");
}

const cnt = db.prepare("SELECT COUNT(*) as c FROM parts").get();
console.log(`Total parts: ${cnt.c}`);
db.close();
console.log("✅ Done!");
