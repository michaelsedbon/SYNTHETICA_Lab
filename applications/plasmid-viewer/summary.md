# Plasmid Viewer

**Created:** 2024  
**Stack:** Python FastAPI · BioPython · aiosqlite · Next.js 16 · Canvas API  
**Ports:** 8003 (API) · 3004 (UI)  

---

## Overview

A web-based **GenBank plasmid viewer** with circular and linear DNA maps, annotation management, and ORF detection. Import `.gb`/`.gbk` files, explore interactive plasmid maps with Geneious-style feature rendering, detect open reading frames across all 6 reading frames, and edit annotations — all in the browser.

The circular map uses a custom zoom model: at low zoom the map is centered classically; at high zoom the 12-o'clock point on the backbone anchors to the viewport center, allowing precise navigation of large plasmids.

---

## Architecture

| Component | Description |
|-----------|-------------|
| `server/main.py` | FastAPI API — upload, CRUD, ORF detection |
| `server/database.py` | SQLite via aiosqlite (sequences + features tables) |
| `server/genbank_parser.py` | BioPython GenBank parser → structured dict |
| `server/orf_finder.py` | 6-frame ORF scanner |
| `dashboard/src/components/PlasmidMap.tsx` | Canvas circular map (zoom, rotate, select) |
| `dashboard/src/components/LinearViewer.tsx` | Canvas linear sequence view |
| `dashboard/src/components/AnnotationsTab.tsx` | Searchable annotation table |
| `dashboard/src/components/ProjectTree.tsx` | Left sidebar (folders, context menu) |
| `dashboard/src/components/OperationsPanel.tsx` | Right panel (info, ORF, annotation editor) |

---

## API Endpoints

### Sequences

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/sequences/upload` | Upload GenBank file |
| GET | `/api/sequences` | List all sequences |
| GET | `/api/sequences/{id}` | Full sequence + features |
| DELETE | `/api/sequences/{id}` | Delete sequence |
| PATCH | `/api/sequences/{id}` | Rename sequence |
| POST | `/api/sequences/{id}/duplicate` | Duplicate sequence |

### Features & ORFs

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sequences/{id}/features` | Add annotation |
| PUT | `/api/sequences/{id}/features/{fid}` | Update annotation |
| DELETE | `/api/sequences/{id}/features/{fid}` | Delete annotation |
| POST | `/api/sequences/{id}/detect-orfs` | Detect ORFs (min_length, start_codons, reverse) |
| POST | `/api/sequences/{id}/commit-orfs` | Commit ORFs as CDS annotations |

---

## Key Features

- Circular & linear plasmid maps — Canvas-rendered with smooth zoom and rotation
- Geneious-style feature rendering — directional CDS arrows, filled terminators, leader lines
- Label collision avoidance — radial stacking for overlapping annotations
- 6-frame ORF detection — configurable min length, start codons, reverse complement
- Annotation editor — add, edit, delete features with color picker
- Project tree — folders in localStorage, drag-to-organize, context menu
- GenBank import — parses `.gb`/`.gbk` files via BioPython

See [DOCS.md](DOCS.md) for complete details.
