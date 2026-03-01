# Fab Planner — Production Planning Dashboard

**Created:** 2024  
**Stack:** Next.js 16 · React 19 · Prisma 7 · SQLite · Three.js · TypeScript  
**Port:** 3000 (full-stack)  

---

## Overview

A fabrication planning dashboard for **prosthesis & medical device manufacturing**. Track orders, upload CAD files (STL/STEP), visualize parts in 3D with oriented bounding box measurements, and manage production priority with drag-and-drop.

The app is a full-stack Next.js application backed by SQLite via Prisma. It includes multi-workspace support with owner-based access control, a complaints tracking module, and external sync capabilities (Airtable).

---

## Architecture

| Component | Description |
|-----------|-------------|
| `app/api/` | 15 API route groups (27 route files total) |
| `app/components/PartsTable.tsx` | Sortable production table with column visibility |
| `app/components/DetailPanel.tsx` | Part details, file uploads, 3D viewer |
| `app/components/ModelViewer.tsx` | Three.js canvas + OBB measurement |
| `app/components/FileUpload.tsx` | Drag-drop multi-stage uploader |
| `app/components/ProjectTree.tsx` | Hierarchical project sidebar |
| `app/components/TimelineView.tsx` | Gantt-style timeline |
| `app/components/SettingsView.tsx` | Settings overlay |
| `app/globals.css` | Full design system (~2200 lines) |
| `app/page.tsx` | Main orchestrator (~770 lines) |
| `prisma/schema.prisma` | 7 models: Part, Project, Revision, Counter, LogEntry, FieldValue, AppSettings |

---

## API Routes

### Parts & Files
| Path | Description |
|------|-------------|
| `/api/parts` | CRUD, batch ops, restore |
| `/api/parts/[id]/upload` | File upload (STL/STEP/drawings/CNC) |
| `/api/parts/[id]/download-all` | ZIP download |
| `/api/parts/[id]/revisions/[rev]` | Revision history |
| `/api/parts/[id]/share` | Share link generation |
| `/api/files/[partId]/[filename]` | Serve uploaded files |

### Organization & Config
| Path | Description |
|------|-------------|
| `/api/projects` | Hierarchical project tree CRUD |
| `/api/workspaces` | Multi-workspace management |
| `/api/settings` | UI settings (columns, colors) |
| `/api/field-values` | Managed dropdown values |
| `/api/suggest` | Autocomplete suggestions |
| `/api/export` | CSV export |
| `/api/logs` | Activity logs |
| `/api/complaints` | Quality complaints with attachments |
| `/api/status-history` | Part status change history |

---

## Key Features

- **3D Viewer** — STL + STEP (via WASM) with oriented bounding box dimensions
- **Multi-stage file upload** — design, drawings, documents, CNC programs with revisions
- **Priority queue** — drag-and-drop reordering persisted to database
- **Timeline (Gantt)** — visualize parts over time with overdue tracking
- **Project tree** — hierarchical organization with starring and filtering
- **CSV export** — one-click export of all parts
- **Complaints module** — quality issue tracking with file attachments
- **Multi-workspace** — owner-based access control
- **VS Code dark theme** with configurable badge colors

See [DOCS.md](DOCS.md) for complete details.
