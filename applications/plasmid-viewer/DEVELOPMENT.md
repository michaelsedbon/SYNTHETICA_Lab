# Plasmid Viewer — Development Guide

## Overview

A web-based GenBank plasmid viewer with circular/linear DNA maps, annotation management, and ORF detection.

## Architecture

```
plasmid-viewer/
├── server/            # Python FastAPI backend
│   ├── main.py        # API endpoints (upload, CRUD, ORF detection)
│   ├── database.py    # SQLite via aiosqlite (sequences + features tables)
│   ├── genbank_parser.py  # BioPython GenBank parser
│   └── orf_finder.py  # 6-frame ORF scanner
├── dashboard/         # Next.js 16 frontend (Turbopack)
│   └── src/
│       ├── app/
│       │   ├── page.tsx       # Main layout: 3-panel (tree | map | operations)
│       │   └── globals.css    # All styles (design tokens, components)
│       ├── components/
│       │   ├── PlasmidMap.tsx      # Canvas circular map (zoom, rotate, select)
│       │   ├── LinearViewer.tsx    # Canvas linear sequence view
│       │   ├── AnnotationsTab.tsx  # Searchable annotation table
│       │   ├── ProjectTree.tsx     # Left sidebar (folders, context menu)
│       │   └── OperationsPanel.tsx # Right panel (info, ORF, annotation editor)
│       └── lib/
│           └── api.ts         # API client with type definitions
└── resources/
    └── test_pUC19.gb          # Test GenBank file
```

## Ports

| Service  | Port |
|----------|------|
| Backend  | 8003 |
| Frontend | 3004 |

## Running Locally

```bash
# Backend
cd server
python3 -c "import uvicorn; uvicorn.run('main:app', host='0.0.0.0', port=8003)"

# Frontend
cd dashboard
npm run dev -- -p 3004
```

## Key Design Decisions

### Circular Map Zoom Model
- **Low zoom (< 2.5×)**: Circle center = viewport center (classic view)
- **Transition (2.5×–5×)**: Smooth blend (smoothstep) to 12-o'clock anchor
- **High zoom (> 5×)**: 12 o'clock point on backbone = viewport center
- **Feature selection**: Rotates selection midpoint to 12 o'clock, then zooms
- **Controls**: scroll = rotate, ctrl+scroll = zoom

### Feature Rendering (Geneious-style)
- CDS/gene: thick filled directional arrows
- Terminators: filled blocks (no arrow)
- Labels positioned outside ring with leader lines
- Collision-avoidance for overlapping labels (radial stacking)

### Project Tree
- Folders stored in `localStorage` (no backend persistence needed)
- Drag sequences into folders
- Right-click context menu: rename, duplicate, copy name, delete

### State Management
- `page.tsx` holds all cross-component state (activeId, selectedFeatureId, selectionRange)
- PlasmidMap uses refs for zoom/rotation/pan (smooth canvas updates) with state mirrors for React re-renders

## API Endpoints

| Method  | Path                                  | Purpose                |
|---------|---------------------------------------|------------------------|
| POST    | /api/sequences/upload                 | Upload GenBank file    |
| GET     | /api/sequences                        | List all sequences     |
| GET     | /api/sequences/{id}                   | Get sequence + features|
| DELETE  | /api/sequences/{id}                   | Delete sequence        |
| PATCH   | /api/sequences/{id}                   | Rename sequence        |
| POST    | /api/sequences/{id}/duplicate         | Duplicate sequence     |
| POST    | /api/sequences/{id}/features          | Add annotation         |
| PUT     | /api/sequences/{id}/features/{fid}    | Update annotation      |
| DELETE  | /api/sequences/{id}/features/{fid}    | Delete annotation      |
| POST    | /api/sequences/{id}/detect-orfs       | Detect ORFs            |
| POST    | /api/sequences/{id}/commit-orfs       | Commit ORFs as CDS     |

## Dependencies

**Backend**: fastapi, uvicorn, biopython, python-multipart, aiosqlite
**Frontend**: next, react, tailwindcss, lucide-react
