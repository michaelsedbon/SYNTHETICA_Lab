# Memory — Session Log

> Chronological log of what was done across sessions. Updated after each work session.

---

## Session 1 — 2026-02-14 (Initial Build)

### What we did
1. **Planned** the app architecture — two-panel fabrication planner with Airtable sync
2. **Scaffolded** Next.js 16 project (TypeScript, App Router, no Tailwind)
3. **Installed Node.js** v25.6.1 via Homebrew (wasn't on the machine)
4. **Created Prisma schema** with `Part` and `Revision` models (SQLite)
5. **Built 5 API routes:**
   - `GET/POST/PATCH /api/parts` — list, create, reorder
   - `GET /api/parts/[id]` — single part with revisions
   - `POST /api/parts/[id]/upload` — file upload (multipart)
   - `POST /api/sync` — Airtable → SQLite sync
   - `GET /api/files/[partId]/[filename]` — serve uploaded files
6. **Built 4 React components:**
   - `PartsTable` — sortable table with dnd-kit, status badges, drag handles
   - `DetailPanel` — collapsible sections: 3D Preview, Part Details, Revisions, Upload
   - `ModelViewer` — Three.js STL renderer with orbit controls
   - `FileUpload` — drag-drop zone with Design/CNC toggle
7. **Created VS Code dark theme** CSS (globals.css) with bright status colors
8. **Wired main page** with DnD context, search, Airtable sync button, demo mode
9. **Fixed Prisma 7 issues:**
   - Import from `client.ts` not index (`@/app/generated/prisma/client`)
   - `PrismaBetterSqlite3` adapter required (note lowercase `q`)
   - Driver adapter pattern: `new PrismaClient({ adapter })`
10. **Verified build** — compiles cleanly, all routes work
11. **Browser tested** — layout, demo parts, detail panel, upload form all functional

### Airtable Setup (in progress)
- Connected with Airtable API (credentials stored in .env)
- Renamed table "Table 1" → "Parts"
- Renamed field "Name" → "Part Name"
- Existing Status choices: Todo, In progress, Done
- **TODO:** Add fields: Order ID, Material, Due Date
- **TODO:** Add 5 sample prosthesis parts
- **TODO:** Test sync round-trip

### Files created
| File | Purpose |
|------|---------|
| `app/page.tsx` | Main orchestrator page |
| `app/layout.tsx` | Root layout |
| `app/globals.css` | Full dark theme design system |
| `app/components/PartsTable.tsx` | Left panel table |
| `app/components/DetailPanel.tsx` | Right panel |
| `app/components/ModelViewer.tsx` | Three.js STL viewer |
| `app/components/FileUpload.tsx` | Upload form |
| `app/api/parts/route.ts` | Parts CRUD |
| `app/api/parts/[id]/route.ts` | Single part |
| `app/api/parts/[id]/upload/route.ts` | File upload |
| `app/api/sync/route.ts` | Airtable sync |
| `app/api/files/[partId]/[filename]/route.ts` | File serving |
| `lib/prisma.ts` | DB singleton |
| `lib/config.ts` | Typed env config |
| `lib/airtable-sync.ts` | Sync logic |
| `prisma/schema.prisma` | DB schema |
| `prisma.config.ts` | Prisma 7 config |
| `.env` / `.env.example` | Secrets & template |

### Decisions made
- SQLite over PostgreSQL (small team, <10 concurrent users)
- Vanilla CSS over Tailwind (full control, user didn't request Tailwind)
- dnd-kit over react-beautiful-dnd (modern, maintained, accessible)
- Airtable Status field kept as-is (Todo/In progress/Done) — API doesn't support renaming choices
- **Architecture pivot:** SQLite is the source of truth, Airtable is push-only mirror for remote tracking (not a data source)

### Documentation created
- `README.md` — project overview, quick start, structure, config reference
- `MANIFESTO.md` — working conventions between Michael and AI assistants
- `MEMORY.md` — this file, session log for long-term tracking

### Airtable table restructured
- Renamed table "Table 1" → "Parts"
- Renamed field "Name" → "Part Name"
- Added fields: "Order ID" (text), "Material" (text), "Due Date" (date)
- Existing Status choices: Todo, In progress, Done

---

## Session 2 — 2026-02-14/15 (Expanding Features)

### What we did
1. **Project Tree Feature** — full project hierarchy with drag-drop, starring, CRUD
   - New `ProjectTree` component with collapsible tree UI
   - New `Project` model in Prisma schema (parentId self-reference)
   - API routes: `/api/projects` (CRUD + reorder)
   - Parts can be assigned to projects, filtered by project tabs
2. **Upload Tabs Expansion** — added 2D Drawing and Document stages to FileUpload
   - Custom user-defined upload stages
   - File type hints per stage
3. **Fixed removeChild DOM error** — ModelViewer was conflicting with React's DOM
   - Separated Three.js canvas mount point (`canvasRef`) from React-managed overlays

### Files created/modified
| File | Purpose |
|------|---------|
| `app/components/ProjectTree.tsx` | Project hierarchy tree |
| `app/api/projects/route.ts` | Projects CRUD |
| `app/api/projects/[id]/route.ts` | Single project ops |

---

## Session 3 — 2026-02-15 (Detail Panel Restructure + Delete)

### What we did
1. **Detail Panel restructure:**
   - **Viewer tabs** — "File Preview" section now has **🎨 Design** and **📐 2D Drawing** tabs
   - **2D Drawing viewer** — inline viewer for images (`<img>`) and PDFs (`<iframe>`)
   - **Revision category tabs** — Revisions section has All / Design / CNC / 2D Drawing / Document tabs (auto-hides empty)
   - **Download All** — top button zips latest file per category via `archiver` npm package
   - **Reveal in Finder** — opens part's upload folder via `open` command
2. **Per-stage version numbering:**
   - Version numbers now scoped per `uploadStage` (Design v1,v2,v3 + 2D Drawing v1,v2 independently)
   - Disk filenames prefixed with stage: `design_v1.stl`, `2d_drawing_v1.pdf`
   - Updated file serving route regex to parse `{stage}_v{n}.ext` format
3. **Delete functionality:**
   - **Delete part** — 🗑 button in header, removes DB record + all files from disk
   - **Delete revision** — ✕ button on each revision row, removes single file + DB record
   - Both show confirmation dialog before deleting
4. **File serving improvements:**
   - Added inline content types for images/PDFs (preview instead of download)
   - Extended MIME type support: PNG, JPG, SVG, PDF, DXF

### Files created/modified
| File | Change |
|------|--------|
| `app/components/DetailPanel.tsx` | Full rewrite: viewer tabs, revision tabs, delete buttons |
| `app/globals.css` | Added viewer-tabs, revision-tabs, drawing-viewer, btn-delete-rev styles |
| `app/api/parts/[id]/download-all/route.ts` | **NEW** — ZIP endpoint |
| `app/api/parts/[id]/reveal/route.ts` | **NEW** — Open in Finder |
| `app/api/parts/[id]/revisions/[revisionId]/route.ts` | **NEW** — Delete single revision |
| `app/api/parts/[id]/route.ts` | DELETE now also cleans up disk files |
| `app/api/parts/[id]/upload/route.ts` | Version numbers scoped per uploadStage |
| `app/api/files/[partId]/[filename]/route.ts` | Updated filename parsing + inline content types |

### Dependencies added
- `archiver` + `@types/archiver` — ZIP archive creation

### Decisions made
- Per-stage versioning: each `uploadStage` has its own v1, v2, v3… sequence
- Disk filenames include stage prefix to avoid collisions between categories
- File serving uses inline disposition for images/PDFs (enables preview), attachment for others
- Delete uses `confirm()` dialog — simple, no extra UI library needed

---

## Session 4 — 2026-02-15 (Badge Colors, Sorting, Fab Mechanism)

### What we did
1. **Fab Mechanism field fixed:**
   - Added `fabMechanism` to suggest API whitelist (`allowedFields` + `managedFields`)
   - Regenerated Prisma client and restarted server (field was missing from API response)
   - Now editable in detail panel with autocomplete suggestions
   - Displayed as badge in inline table

2. **Customizable column visibility:**
   - New "📊 Table Columns" tab in Settings
   - Toggle which columns appear in the parts table (checkbox UI)
   - `PartsTable` dynamically builds `grid-template-columns` via `buildGridTemplate()`
   - Persisted in **localStorage** (`fab-planner-visible-columns`)

3. **Badge color system:**
   - New `app/lib/badgeColors.ts` — VS Code dark-mode inspired fluorescent palette (20 colors)
   - Status and Fab Mechanism values render as **colored pill badges** in the table
   - New "🎨 Badge Colors" tab in Settings — click a value, pick a color from swatch grid
   - `getBadgeStyle()` generates inline styles (tinted background, colored text, subtle border)
   - Persisted in **localStorage** (`fab-planner-badge-colors`)

4. **Column sorting:**
   - Click any column header to sort ascending; click again to toggle descending
   - Sort indicators (▲/▼) shown on active column
   - Default sort: **priorityOrder** (importance / drag order)
   - Sortable fields: ID, Part Name, Status, Material, Due, Client, Qty, Who, Fab Mechanism
   - Sort state lives in `page.tsx`, applied via `useMemo` after filtering

5. **3D Viewer defaults:**
   - Bounding box (wireframe + dimensions) visible by default
   - Axis arrows visible by default

6. **Removed Sync Airtable button** from header toolbar

### Files created/modified
| File | Change |
|------|--------|
| `app/lib/badgeColors.ts` | **NEW** — Badge color palette, localStorage persistence, style helpers |
| `app/components/SettingsView.tsx` | Full rewrite: 3 tabs (Field Values, Table Columns, Badge Colors) |
| `app/components/PartsTable.tsx` | Colored badges, dynamic columns, sortable headers |
| `app/page.tsx` | Badge colors state, sort state, column visibility state, wiring |
| `app/globals.css` | Removed hardcoded grid-template-columns |
| `app/api/suggest/route.ts` | Added `fabMechanism` to whitelists |
| `app/components/ModelViewer.tsx` | BBox + axes visible by default |

### Persistence model
| Data | Storage | Survives server restart? |
|------|---------|------------------------|
| Parts, revisions, field values | **SQLite database** | ✅ Yes |
| Badge colors | **localStorage** (browser) | ✅ Yes |
| Column visibility | **localStorage** (browser) | ✅ Yes |
| Sort preference | **React state** (memory) | ❌ Resets to "importance" on refresh |

### Decisions made
- Badge colors stored in localStorage (per-browser) rather than DB — lightweight, no migration needed
- Sort state is transient (not persisted) — default "importance" is the most useful starting point
- 20-color fluorescent palette curated for dark backgrounds (matches VS Code dark theme aesthetic)
- Settings now has 3 tabs: Field Values, Table Columns, Badge Colors

