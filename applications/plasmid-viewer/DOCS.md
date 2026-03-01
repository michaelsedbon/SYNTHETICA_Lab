# Plasmid Viewer

**Slug:** `plasmid-viewer`  
**Status:** ✅ Working  
**Ports:** 8003 (API) · 3004 (UI)

---

## Purpose

A web-based **GenBank plasmid viewer** with circular and linear DNA maps, annotation management, and ORF detection. Import GenBank files, explore interactive plasmid maps with Geneious-style feature rendering, detect open reading frames, and edit annotations — all in the browser.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python · FastAPI · BioPython · aiosqlite |
| Frontend | Next.js 16 (Turbopack) · Tailwind CSS · Canvas API |
| Database | SQLite (async via aiosqlite) |

---

## How to Run

```bash
# Backend (port 8003)
cd applications/plasmid-viewer/server
python3 -c "import uvicorn; uvicorn.run('main:app', host='0.0.0.0', port=8003)"

# Frontend (port 3004)
cd applications/plasmid-viewer/dashboard
npm run dev -- -p 3004
```

Open **http://localhost:3004**

---

## API Endpoints

### Sequences

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/sequences/upload` | Upload a GenBank file (.gb, .gbk), parse and store |
| GET | `/api/sequences` | List all stored sequences (without full sequence data) |
| GET | `/api/sequences/{id}` | Get full sequence data with features |
| DELETE | `/api/sequences/{id}` | Delete a sequence and all its features |
| PATCH | `/api/sequences/{id}` | Rename a sequence |
| POST | `/api/sequences/{id}/duplicate` | Duplicate a sequence and all its features |

### Feature/Annotation CRUD

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sequences/{id}/features` | Add a new feature/annotation |
| PUT | `/api/sequences/{id}/features/{fid}` | Update an existing feature's properties |
| DELETE | `/api/sequences/{id}/features/{fid}` | Delete a feature |

### ORF Detection

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sequences/{id}/detect-orfs` | Run ORF detection (params: min_length, start_codons, include_reverse) |
| POST | `/api/sequences/{id}/commit-orfs` | Commit selected ORFs as CDS annotations |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `sequences` | Stored plasmid sequences (name, description, sequence, topology, organism) |
| `features` | Annotations (type, label, start, end, strand, color, qualifiers, source) |

---

## Architecture

```
server/
  main.py           — FastAPI API endpoints (upload, CRUD, ORF detection)
  database.py       — SQLite via aiosqlite (sequences + features tables)
  genbank_parser.py — BioPython GenBank parser → structured dict
  orf_finder.py     — 6-frame ORF scanner

dashboard/
  src/
    app/
      page.tsx           — Main layout: 3-panel (tree | map | operations)
      globals.css        — All styles (design tokens, components)
    components/
      PlasmidMap.tsx      — Canvas circular map (zoom, rotate, select)
      LinearViewer.tsx    — Canvas linear sequence view
      AnnotationsTab.tsx  — Searchable annotation table
      ProjectTree.tsx     — Left sidebar (folders, context menu)
      OperationsPanel.tsx — Right panel (info, ORF, annotation editor)
    lib/
      api.ts             — API client with type definitions
```

---

## Circular Map Zoom Model

| Zoom Level | Behavior |
|------------|----------|
| < 2.5× | Circle center = viewport center (classic view) |
| 2.5×–5× | Smooth blend (smoothstep) to 12-o'clock anchor |
| > 5× | 12 o'clock point on backbone = viewport center |
| Feature select | Rotates selection midpoint to 12 o'clock, then zooms |

**Controls:** scroll = rotate, ctrl+scroll = zoom

---

## Key Features

- **Circular plasmid map** — Canvas-rendered with zoom, rotate, and feature selection
- **Linear sequence view** — alternative visualization mode
- **Geneious-style rendering** — directional CDS arrows, filled terminators, leader lines
- **Label collision avoidance** — radial stacking for overlapping annotations
- **GenBank import** — parses `.gb`/`.gbk` files via BioPython
- **6-frame ORF detection** — configurable min length, start codons, reverse complement
- **Annotation editor** — add, edit, delete features with color picker
- **Project tree** — folders stored in localStorage, drag-to-organize, context menu
- **Sequence management** — rename, duplicate, delete sequences
