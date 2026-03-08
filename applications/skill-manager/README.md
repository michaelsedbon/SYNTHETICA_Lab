# Skill Manager

**Manage AI agent skills across all Antigravity workspaces from the browser.**

Browse the `~/antigravity-skills/` library (234 skills), view all discovered workspaces, and toggle skills on/off per workspace with a single click.

## Tech Stack

- **Backend:** Python FastAPI (port 8004)
- **Frontend:** Vanilla HTML/JS/CSS (served by FastAPI)
- **Data:** No database — state derived from filesystem symlinks

## How to Run

```bash
cd applications/skill-manager/server
python3 -m uvicorn main:app --host 0.0.0.0 --port 8004
```

Open `http://localhost:8004`

## Features

- **Auto-discovery** — scans filesystem for workspaces (`.agent/` dirs) and skills on every request
- **Install/uninstall** — toggles create/remove symlinks via `~/antigravity-skills/install.sh`
- **Search & filter** — find skills by name or description, filter by section
- **Category badges** — built-in (blue), custom (green), third-party (purple)

## Architecture

```
Browser ←→ FastAPI (:8004)
               ├ GET /api/workspaces      → scans ~/Documents, ~/Desktop, etc.
               ├ GET /api/skills          → reads ~/antigravity-skills/skills/
               ├ GET /api/workspace/skills → reads .agent/skills/ symlinks
               ├ POST /api/install        → runs install.sh
               └ POST /api/uninstall      → removes symlink
```
