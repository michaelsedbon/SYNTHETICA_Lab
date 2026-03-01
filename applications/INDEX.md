# Applications Index

> **7 applications** powering the SYNTHETIC Lab — from electrophysiology recording to 3D lab navigation.

All lab applications live under `applications/`. Each app has a `DOCS.md` with full route tables, architecture diagrams, and feature lists. Apps are registered in the [App Launcher](#-app-launcher) and can be started/stopped from a single dashboard.

---

## Quick Reference

| # | App | Slug | Ports | Stack | Status |
|---|-----|------|-------|-------|--------|
| 1 | [🏭 Fab Planner](#-fab-planner) | `fab-planner` | 3000 | Next.js · Prisma · Three.js | ✅ Working |
| 2 | [⚡ ADC-24 Electrophysiology](#-adc-24-electrophysiology) | `adc24-dashboard` | 8000 · 3001 | FastAPI · Next.js · WebSockets | ✅ Working |
| 3 | [📓 Experiment Notebooks](#-experiment-notebooks) | `experiment-viewer` | 8001 · 3002 | FastAPI · Next.js | ✅ Working |
| 4 | [🔬 Research Scout](#-research-scout) | `research-scout` | 8002 · 3003 | FastAPI · Next.js · SQLite | ✅ Working |
| 5 | [🧬 Plasmid Viewer](#-plasmid-viewer) | `plasmid-viewer` | 8003 · 3004 | FastAPI · Next.js · BioPython | ✅ Working |
| 6 | [🧪 Virtual Lab](#-virtual-lab) | `virtual-lab` | 8080 | Three.js · Airtable · Vanilla JS | ✅ Working |
| 7 | [🚀 App Launcher](#-app-launcher) | `launcher` | 3100 | Next.js | ✅ Working |

---

## Port Map

```
Backend (Python FastAPI)          Frontend (Next.js / Static)
────────────────────────          ──────────────────────────
8000  ADC-24 API                  3000  Fab Planner
8001  Experiment Viewer API       3001  ADC-24 Dashboard
8002  Research Scout API          3002  Experiment Viewer
8003  Plasmid Viewer API          3003  Research Scout
                                  3004  Plasmid Viewer
                                  3100  App Launcher
                                  8080  Virtual Lab (static)
```

---

## 🏭 Fab Planner

**Production planning for prosthesis & medical device manufacturing.**

Track parts, upload CAD files (STL/STEP), visualize in 3D with oriented bounding box measurements, drag-and-drop priority queue, Gantt timeline, multi-workspace collaboration.

| Detail | Value |
|--------|-------|
| Port | 3000 (full-stack Next.js) |
| Database | SQLite + Prisma 7 (7 models) |
| API Routes | 27 Next.js route files across 15 groups |
| Linked Experiment | — |

**Key capabilities:** 3D STL/STEP viewer, OBB part dimensions, revision history, project tree, priority queue, Gantt timeline, CSV export, complaints module, multi-workspace access control.

📄 **Full docs:** [`fab-planner/DOCS.md`](fab-planner/DOCS.md)

---

## ⚡ ADC-24 Electrophysiology

**Real-time fungal mycelium electrophysiology dashboard.**

Record, visualize, and export electrical signals using a Pico Log ADC-24. Reproduces Mishra et al. 2024 methodology. Includes demo mode for development without hardware.

| Detail | Value |
|--------|-------|
| Ports | 8000 (API) · 3001 (UI) |
| API Endpoints | 8 REST + 1 WebSocket |
| Linked Experiment | EXP_001 |
| Data Output | CSV to `experiments/EXP_001/data/` |

**Key capabilities:** WebSocket real-time streaming, Canvas voltage trace, Savitzky-Golay filtering, peak detection, session management, demo mode with synthetic signals.

📄 **Full docs:** [`adc24-dashboard/DOCS.md`](adc24-dashboard/DOCS.md)

---

## 📓 Experiment Notebooks

**Browse and read all experiment markdown files across the workspace.**

Multi-source experiment viewer with GFM rendering, code file viewer with syntax highlighting, arbitrary markdown preview, and editor integration (VS Code/Cursor).

| Detail | Value |
|--------|-------|
| Ports | 8001 (API) · 3002 (UI) |
| API Endpoints | 12 REST |
| Sources | Auto-discovers `experiments/` + `~/Documents/PhD/experiments/` |

**Key capabilities:** Multi-source browsing, dark-mode markdown renderer, code file viewer (30+ languages), "Open in Editor" button, search, arbitrary file preview via URL parameter.

📄 **Full docs:** [`experiment-viewer/DOCS.md`](experiment-viewer/DOCS.md)

---

## 🔬 Research Scout

**Interdisciplinary research mapper — find the most unusual researchers.**

Scrape papers from OpenAlex/Semantic Scholar, rank authors by "misfit score" (cross-topic publishing pattern), visualize topic co-occurrence, and generate 2D niche maps via UMAP.

| Detail | Value |
|--------|-------|
| Ports | 8002 (API) · 3003 (UI) |
| API Endpoints | 15 REST |
| Data Sources | OpenAlex API · Semantic Scholar API |
| Database | SQLite (auto-created) |

**Key capabilities:** Misfit score ranking, topic co-occurrence heatmap, niche map (TF-IDF + UMAP), author profiles with co-author network, live scrape progress, CSV export, configurable topics via YAML.

**Frontend pages:** Dashboard · Papers Explorer · Author Rankings · Topic Management

📄 **Full docs:** [`research-scout/DOCS.md`](research-scout/DOCS.md)

---

## 🧬 Plasmid Viewer

**GenBank plasmid map viewer with annotation editing and ORF detection.**

Import GenBank files, explore circular and linear DNA maps with Geneious-style feature rendering, detect open reading frames across 6 frames, edit annotations with color picker.

| Detail | Value |
|--------|-------|
| Ports | 8003 (API) · 3004 (UI) |
| API Endpoints | 12 REST |
| Database | SQLite (async via aiosqlite) |

**Key capabilities:** Circular & linear plasmid maps, zoom model (classic → 12-o'clock anchor), Geneious-style rendering, label collision avoidance, 6-frame ORF detection, annotation CRUD, project tree with folders.

📄 **Full docs:** [`plasmid-viewer/DOCS.md`](plasmid-viewer/DOCS.md)

---

## 🧪 Virtual Lab

**Interactive 3D model of the laboratory with stock management.**

Navigate a browser-rendered 3D model of the physical lab. Click equipment to view details, search items, manage stock levels, and assign storage locations. Reads inventory from Airtable.

| Detail | Value |
|--------|-------|
| Port | 8080 (static HTTP server) |
| API | None (client-side Airtable API calls) |
| 3D Model | `virtual_lab.glb` (~1.3 MB) |
| Data Source | Airtable REST API |

**Key capabilities:** Interactive 3D lab model, Airtable inventory sync, search with autocomplete, object selection, storage management mode, context menu, PWA installable, network QR code.

📄 **Full docs:** [`virtual-lab/DOCS.md`](virtual-lab/DOCS.md)

---

## 🚀 App Launcher

**Central dashboard for all lab applications.**

Landing page with app cards, real-time health monitoring (port polling), and the ability to start/stop individual applications from the browser.

| Detail | Value |
|--------|-------|
| Port | 3100 (UI) |
| API Endpoints | 3 (health poll, start, stop) |
| Registered Apps | 6 (all apps above) |

**Key capabilities:** App cards with icons & descriptions, health polling every 5s, start/stop process management, status badges (green/yellow/red), LAN-aware URLs.

📄 **Full docs:** [`launcher/DOCS.md`](launcher/DOCS.md)

---

## Shared Design Language

All applications follow a consistent **VS Code-inspired dark theme** with:

- Background: `#1e1e1e` / `#252526` / `#2d2d2d`
- Accent blue: `#569cd6`
- Font: Inter (Google Fonts)
- Border radius: 4–8px
- Smooth transitions (150ms ease)

---

## Starting Everything

The fastest way to launch all apps:

1. Start the **App Launcher** on port 3100
2. Use the launcher UI to start/stop individual apps
3. Or run each app manually — see individual `DOCS.md` files for exact commands
