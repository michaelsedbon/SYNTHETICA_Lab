# App Launcher

**Created:** 2024  
**Stack:** Next.js 16 · React 19 · Tailwind CSS v4 · shadcn/ui  
**Port:** 3100 (UI)  

---

## Overview

Central landing page for the SYNTHETIC Lab. Displays **app cards** linking to all lab applications with real-time **health monitoring** — polls each app's ports every 5 seconds to show which services are up, starting, or down. Can **start and stop** individual applications directly from the browser.

---

## Architecture

| Component | Description |
|-----------|-------------|
| `src/app/page.tsx` | Main page — app cards, health indicators, start/stop |
| `src/app/globals.css` | Dark theme styles |
| `src/lib/apps.ts` | App registry — ports, commands, tags, icons |
| `src/app/api/health/` | Health check polling endpoint |
| `src/app/api/apps/` | Start/stop process management |

---

## Registered Applications

| App | Icon | Frontend | Backend | Tags |
|-----|------|----------|---------|------|
| Fab Planner | 🏭 | 3000 | — | production, planning |
| ADC-24 Electrophysiology | ⚡ | 3001 | 8000 | electrophysiology, hardware |
| Virtual Lab | 🧪 | 8080 | — | 3D, visualisation |
| Research Scout | 🔬 | 3003 | 8002 | research, scraping |
| Experiment Notebooks | 📓 | 3002 | 8001 | experiments, markdown |
| Plasmid Viewer | 🧬 | 3004 | 8003 | biology, plasmid |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Poll all app ports, return up/down status |
| POST | `/api/apps/start` | Start an application |
| POST | `/api/apps/stop` | Stop a running application |

---

## Key Features

- App cards with icon, description, tags, and health indicator
- Health polling every 5s (green/yellow/red status badges)
- Start/stop buttons — launch or kill app processes from the browser
- Network-aware URLs for LAN access
- Dark theme consistent with all lab apps

See [DOCS.md](DOCS.md) for complete details.
