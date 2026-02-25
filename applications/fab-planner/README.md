# Fab Planner — Production Planning Dashboard

A fabrication planning dashboard for **prosthesis & medical device manufacturing**. Track orders, upload CAD files (STL/STEP), visualize parts in 3D with oriented bounding box measurements, and manage production priority with drag-and-drop.

> **Built by:** Michael Sedbon  
> **Stack:** Next.js 16 · React 19 · SQLite/Prisma 7 · Three.js · TypeScript

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/michaelsedbon/project_planning.git
cd project_planning
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env — see Configuration section below

# 3. Create the database
npx prisma generate
npx prisma db push

# 4. Run
npm run dev
# → http://localhost:3000
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Two-panel layout** | Production queue on left, detail panel with 3D viewer on right |
| **3D Viewer** | Three.js STL + STEP (via WASM) viewer with orbit controls |
| **Oriented Bounding Box** | PCA-based OBB gives accurate part dimensions regardless of file rotation |
| **Multi-stage file upload** | Design files, 2D drawings, documents, CNC programs + custom stages |
| **Revision history** | Version-tracked uploads per stage, view any past revision in 3D |
| **Project tree** | Hierarchical project organization with starring and filtering |
| **Priority queue** | Drag-and-drop reordering, persisted to database |
| **Timeline (Gantt)** | Visualize parts over time with overdue/completion tracking |
| **Settings panel** | Manage field values, badge colors, column visibility, UI parameters |
| **Search & filters** | Filter by status, material, client, hospital, or free-text search |
| **Activity logs** | User action + app event logs with auto-refresh |
| **CSV export** | One-click export of all parts to spreadsheet |
| **Context menu** | Right-click parts to rename, delete, or move to project |
| **Dark UI** | VS Code-inspired theme with configurable badge colors |

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 16 (App Router) | Full-stack React with API routes |
| Database | SQLite + Prisma 7 | Zero-config, portable, good for small teams |
| 3D Viewer | Three.js + STLLoader + occt-import-js | STL native, STEP via WASM |
| Drag & Drop | dnd-kit | Modern React DnD, accessible |
| Styling | Vanilla CSS | Full control, no dependency bloat |

---

## Project Structure

```
fab-planner/
├── app/
│   ├── api/
│   │   ├── parts/              # CRUD, reorder, upload, reveal, revisions, download-all
│   │   ├── projects/           # Project tree CRUD with hierarchy
│   │   ├── sync/               # External data sync
│   │   ├── export/             # CSV export
│   │   ├── field-values/       # Managed field values (status, material, etc.)
│   │   ├── settings/           # UI design parameters persistence
│   │   ├── suggest/            # Autocomplete suggestions
│   │   ├── logs/               # Activity log viewer
│   │   └── files/              # Serve uploaded files
│   ├── components/
│   │   ├── PartsTable.tsx      # Sortable table with column visibility
│   │   ├── DetailPanel.tsx     # Part details, uploads, 3D viewer
│   │   ├── ModelViewer.tsx     # Three.js 3D canvas + OBB measurement
│   │   ├── FileUpload.tsx      # Drag-drop multi-stage uploader
│   │   ├── ProjectTree.tsx     # Hierarchical project sidebar
│   │   ├── TimelineView.tsx    # Gantt-style timeline
│   │   ├── SettingsView.tsx    # Settings overlay (field values, colors, columns)
│   │   ├── ContextMenu.tsx     # Right-click context menu
│   │   ├── LogViewer.tsx       # Activity log panel
│   │   └── ProjectPartsTab.tsx # Project-specific parts tab
│   ├── globals.css             # Full design system (~2200 lines)
│   ├── layout.tsx
│   └── page.tsx                # Main orchestrator (~770 lines)
├── lib/
│   ├── prisma.ts               # DB singleton with driver adapter
│   ├── config.ts               # Typed environment config
│   ├── logger.ts               # Structured logging (user + app)
│   └── airtable-sync.ts        # External sync module
├── prisma/
│   └── schema.prisma           # 7 models: Part, Project, Revision, Counter, LogEntry, FieldValue, AppSettings
├── uploads/                    # Uploaded files (gitignored)
├── public/wasm/                # WASM binaries for STEP viewer
├── .env.example                # Environment template
├── MANIFESTO.md                # Working conventions
├── CUSTOMIZATION.md            # How to customize the app
└── README.md                   # This file
```

---

## Configuration

Copy `.env.example` to `.env` and fill in your values:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | SQLite file path | Yes (defaults to `file:./dev.db`) |
| `UPLOAD_DIR` | Upload directory | Yes (defaults to `./uploads`) |
| `PORT` | Dev server port | No (defaults to `3000`) |

---

## Database Models

| Model | Purpose |
|-------|---------|
| `Part` | Core entity — name, status, material, dates, priority |
| `Project` | Hierarchical project tree (self-referencing parent/children) |
| `Revision` | File uploads with version tracking per upload stage |
| `Counter` | Auto-incrementing ID generator (FAB-0001, FAB-0002...) |
| `LogEntry` | User action and app event logging |
| `FieldValue` | Managed field values for dropdowns |
| `AppSettings` | Persistent UI configuration (JSON blobs) |

---

## Customization

See **[CUSTOMIZATION.md](./CUSTOMIZATION.md)** for detailed instructions on:
- Adding new statuses, materials, or any field values
- Changing badge colors and column visibility
- Adding custom upload stages
- Modifying the database schema
- Theming and CSS customization
- Adding new features

---

## For AI Assistants

This project includes an **Antigravity workflow** for AI agents. If you're an AI assistant helping someone with this project, run the `/catch-up` workflow to quickly understand the entire codebase.

The key files to read are:
1. **This README.md** — Overview
2. **MANIFESTO.md** — Working conventions and tech decisions
3. **CUSTOMIZATION.md** — How to extend the app
4. **prisma/schema.prisma** — Database models

---

## License

Private — © Michael Sedbon
