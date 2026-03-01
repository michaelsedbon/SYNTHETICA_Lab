# App Launcher

**Slug:** `launcher`  
**Status:** ✅ Working  
**Port:** 3100 (UI)

---

## Purpose

Landing page for the SYNTHETIC Lab. Displays **app cards** linking to all lab applications with real-time **health monitoring** — polls each app's ports to show which services are up, starting, or down. Can **start and stop** individual applications directly from the UI.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript |
| Styling | Tailwind CSS v4 · shadcn/ui |
| Icons | Lucide React |

---

## How to Run

```bash
cd applications/launcher
npm run dev -- -p 3100
```

Open **http://localhost:3100**

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Poll ports for all apps and return up/down status |
| POST | `/api/apps/start` | Start an application (spawns backend & frontend processes) |
| POST | `/api/apps/stop` | Stop a running application |

---

## Registered Applications

The launcher is configured to monitor and link to these apps (defined in `src/lib/apps.ts`):

| App | Icon | Frontend Port | Backend Port | Tags |
|-----|------|---------------|--------------|------|
| Fab Planner | 🏭 | 3000 | — | production, planning, fabrication |
| ADC-24 Electrophysiology | ⚡ | 3001 | 8000 | electrophysiology, hardware, real-time |
| Virtual Lab | 🧪 | 8080 | — | 3D, visualisation, lab |
| Research Scout | 🔬 | 3003 | 8002 | research, scraping, community |
| Experiment Notebooks | 📓 | 3002 | 8001 | experiments, documentation, markdown |
| Plasmid Viewer | 🧬 | 3004 | 8003 | biology, plasmid, visualisation |

---

## Architecture

```
launcher/
  src/
    app/
      page.tsx       — Main page: app cards, health indicators, start/stop
      globals.css    — Dark theme styles
      layout.tsx     — Root layout with metadata
      api/
        health/      — Health check polling endpoint
        apps/        — Start/stop app management endpoints
    lib/
      apps.ts        — App registry (ports, commands, tags, icons)
  public/            — Static assets (SVGs, icons)
```

---

## Key Features

- **App cards** with icon, description, tags, and status indicator
- **Health polling** (every 5s) — checks if backend and frontend ports respond
- **Start/stop buttons** — launch or kill app processes from the browser
- **Status badges** — green (all up), yellow (partially up), red (down)
- **Network-aware** — URLs use the current hostname for LAN access
- **Dark theme** consistent with the rest of the lab UI
