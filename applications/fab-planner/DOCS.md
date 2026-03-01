# Fab Planner — Production Planning Dashboard

**Slug:** `fab-planner`  
**Status:** ✅ Working  
**Port:** 3000 (full-stack Next.js)

---

## Purpose

A fabrication planning dashboard for **prosthesis & medical device manufacturing**. Track orders, upload CAD files (STL/STEP), visualize parts in 3D with oriented bounding box measurements, and manage production priority with drag-and-drop. Supports multi-workspace collaboration with owner-based access control.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript |
| Database | SQLite + Prisma 7 (driver adapter) |
| 3D Viewer | Three.js + STLLoader + occt-import-js (STEP via WASM) |
| Drag & Drop | dnd-kit |
| Styling | Vanilla CSS (~2200 lines design system) |

---

## How to Run

```bash
cd applications/fab-planner

# First-time setup
cp .env.example .env
npx prisma generate
npx prisma db push

# Run
npm run dev -- -p 3000
```

Open **http://localhost:3000**

---

## API Routes (Next.js App Router)

### Parts CRUD

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/parts` | List all parts (with filters) |
| POST | `/api/parts` | Create a new part |
| GET | `/api/parts/[id]` | Get part details |
| PUT | `/api/parts/[id]` | Update part fields |
| DELETE | `/api/parts/[id]` | Delete a part |
| POST | `/api/parts/batch` | Batch operations on multiple parts |
| POST | `/api/parts/batch-upload` | Batch upload parts from spreadsheet |
| POST | `/api/parts/restore` | Restore a deleted part |

### File Management

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/parts/[id]/upload` | Upload files (STL/STEP/drawings/documents/CNC) |
| GET | `/api/parts/[id]/download-all` | Download all files for a part as ZIP |
| GET | `/api/parts/[id]/revisions/[revisionId]` | Get specific file revision |
| POST | `/api/parts/[id]/reveal` | Open file in Finder/Explorer |
| GET | `/api/files/[partId]/[filename]` | Serve uploaded files |
| POST | `/api/download` | Download a specific file |
| POST | `/api/save-to-downloads` | Save file to Downloads folder |

### Sharing

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/parts/[id]/share` | Generate a share link for a part |

### Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects (hierarchical tree) |
| POST | `/api/projects` | Create a new project |
| PUT | `/api/projects` | Update project (rename, move, star) |
| DELETE | `/api/projects` | Delete a project |

### Workspaces

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workspaces` | List workspaces |
| POST | `/api/workspaces` | Create workspace |
| GET | `/api/workspaces/[id]` | Get workspace details |
| PUT | `/api/workspaces/[id]` | Update workspace |

### Settings & Config

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | Get UI settings (column visibility, badge colors, etc.) |
| POST | `/api/settings` | Update UI settings |
| GET | `/api/field-values` | Get managed field values (statuses, materials, etc.) |
| POST | `/api/field-values` | Add/update field values |
| GET | `/api/workspace-fields` | Get workspace-specific field configs |
| POST | `/api/workspace-fields` | Update workspace field configs |
| GET | `/api/suggest` | Autocomplete suggestions for fields |

### Other

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/export` | Export all parts as CSV |
| GET | `/api/logs` | View activity logs |
| GET | `/api/status-history` | Get status change history for parts |
| GET | `/api/auth/owner` | Get current workspace owner |
| GET | `/api/complaints` | List quality complaints |
| POST | `/api/complaints` | Create complaint |
| GET | `/api/complaints/[id]` | Get complaint details |
| GET | `/api/complaints/files/[complaintId]/[filename]` | Serve complaint attachments |
| POST | `/api/sync` | Trigger external data sync (Airtable) |

---

## Database Models (Prisma)

| Model | Purpose |
|-------|---------|
| `Part` | Core entity — name, status, material, dates, priority, dimensions |
| `Project` | Hierarchical project tree (self-referencing parent/children) |
| `Revision` | File uploads with version tracking per upload stage |
| `Counter` | Auto-incrementing ID generator (FAB-0001, FAB-0002...) |
| `LogEntry` | User action and app event logging |
| `FieldValue` | Managed field values for dropdowns (status, material, etc.) |
| `AppSettings` | Persistent UI configuration (JSON blobs) |

---

## Architecture

```
app/
  api/           — 15 API route groups (27 route files total)
  components/
    PartsTable.tsx      — Sortable table with column visibility
    DetailPanel.tsx     — Part details, uploads, 3D viewer
    ModelViewer.tsx     — Three.js 3D canvas + OBB measurement
    FileUpload.tsx      — Drag-drop multi-stage uploader
    ProjectTree.tsx     — Hierarchical project sidebar
    TimelineView.tsx    — Gantt-style timeline
    SettingsView.tsx    — Settings overlay (field values, colors, columns)
    ContextMenu.tsx     — Right-click context menu
    LogViewer.tsx       — Activity log panel
    ProjectPartsTab.tsx — Project-specific parts tab
  globals.css    — Full design system (~2200 lines)
  page.tsx       — Main orchestrator (~770 lines)

lib/
  prisma.ts      — DB singleton with driver adapter
  config.ts      — Typed environment config
  logger.ts      — Structured logging (user + app)
  airtable-sync.ts — External sync module

prisma/
  schema.prisma  — 7 models

uploads/         — Uploaded files (gitignored)
public/wasm/     — WASM binaries for STEP viewer
```

---

## Key Features

- **Two-panel layout** — production queue on left, detail panel with 3D viewer on right
- **3D Viewer** — Three.js STL + STEP (via WASM) viewer with orbit controls
- **Oriented Bounding Box** — PCA-based OBB gives accurate part dimensions
- **Multi-stage file upload** — design files, 2D drawings, documents, CNC programs
- **Revision history** — version-tracked uploads per stage
- **Project tree** — hierarchical project organization with starring and filtering
- **Priority queue** — drag-and-drop reordering, persisted to database
- **Timeline (Gantt)** — visualize parts over time with overdue/completion tracking
- **Settings panel** — manage field values, badge colors, column visibility
- **Search & filters** — filter by status, material, client, hospital, or free-text
- **Activity logs** — user action + app event logs with auto-refresh
- **CSV export** — one-click export of all parts to spreadsheet
- **Context menu** — right-click parts to rename, delete, or move to project
- **Dark UI** — VS Code-inspired theme with configurable badge colors
- **Complaints module** — track quality issues with file attachments
- **Multi-workspace support** — owner-based access control and workspace fields
