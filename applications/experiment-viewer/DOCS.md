# Experiment Notebooks

**Slug:** `experiment-viewer`  
**Status:** ✅ Working  
**Ports:** 8001 (API) · 3002 (UI)

---

## Purpose

A web application for **browsing and reading all experiment markdown files** across the lab workspace (and optional additional sources like a PhD folder). Renders `.md` files with full support for tables, code blocks, images, and GitHub-flavoured markdown in a polished dark-mode reader.

Also supports **previewing arbitrary markdown files** via a URL parameter, and **viewing code files** with syntax highlighting in a side panel.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python · FastAPI |
| Frontend | Next.js (App Router) · Tailwind CSS v4 · shadcn/ui |
| Markdown | react-markdown · remark-gfm · rehype-raw · rehype-highlight |
| LaTeX | remark-math · rehype-katex (KaTeX CSS) |

---

## How to Run

```bash
# Backend (port 8001)
cd applications/experiment-viewer/server
python3 -m uvicorn main:app --host 0.0.0.0 --port 8001

# Frontend (port 3002)
cd applications/experiment-viewer/dashboard
npm run dev -- -p 3002
```

Open **http://localhost:3002**

---

## API Endpoints

### Experiment browsing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/experiments` | Returns the full grouped tree of experiment markdown files from all sources |
| GET | `/api/sources` | List configured experiment source directories |
| GET | `/api/file` | Return raw markdown content for a given file (`?path=...&source=Lab`) |
| GET | `/api/media` | Serve images/media referenced from markdown files (`?path=...&source=Lab`) |

### Code file viewer

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/code` | Serve raw content of a code file with language detection (`?path=<absolute>`) |
| GET | `/api/raw` | Serve a code file as plain text for browser viewing (`?path=<absolute>`) |
| POST | `/api/open-in-editor` | Open a file in VS Code / Cursor at a specific line (`?path=...&line=1`) |

### Preview (arbitrary markdown)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/preview` | Return content of any `.md` file by absolute path (`?path=<absolute>`) |
| GET | `/api/preview-media` | Serve media referenced from previewed markdown (`?dir=...&path=...`) |

### Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | Return current settings (source directories list) |
| POST | `/api/settings` | Update source directories (validates paths exist) |

---

## Architecture

```
server/
  main.py        — FastAPI app; walks experiments/ to discover .md files,
                   serves content + images, code viewer, preview, settings
  settings.json  — Persisted source directories config

dashboard/
  src/app/
    page.tsx       — Main UI: collapsible sidebar with search, breadcrumb header,
                     markdown viewer, code panel
    globals.css    — Custom dark theme + markdown prose styles
```

---

## Source Configuration

The viewer supports **multiple experiment sources**. By default it auto-discovers:

| Source | Path |
|--------|------|
| Lab | `../../experiments/` (relative to server) |
| PhD | `~/Documents/PhD/experiments/` (if exists) |

Additional sources can be added via:
- The settings API (`POST /api/settings`)
- The UI settings panel
- The `EXTRA_EXPERIMENT_DIRS` env var (e.g. `PhD:~/Documents/PhD/experiments`)

---

## Key Features

- **Multi-source experiment browsing** with grouped file tree
- **Dark-mode markdown renderer** with GFM, code highlighting, tables, images
- **LaTeX equation rendering** via KaTeX (inline `$...$` and display `$$...$$`)
- **Code file viewer** with syntax highlighting for 30+ languages
- **"Open in editor"** button (VS Code / Cursor integration)
- **Search** across all experiment files
- **Arbitrary file preview** via `?preview=<path>` URL parameter
- **Collapsible sidebar** with experiment groups and file lists
- **Breadcrumb navigation** for deep file hierarchies
- **Tree caching** (30s TTL) for fast sidebar loads on large workspaces
- **Share links** — copy direct URLs to specific experiment pages
- **Deep-linking** via `?source=Lab&path=EXP_003/summary.md` query params
- **Mobile-responsive** — sidebar auto-closes on screens < 768px

---

## Online Access (Cloudflare Tunnel)

The viewer can be exposed publicly via Cloudflare Tunnel. Only port 3002 is tunnelled — the backend is proxied through Next.js rewrites (`/api/*` → `localhost:8001`).

See **[ONLINE.md](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/experiment-viewer/ONLINE.md)** for full setup, including:
- Quick tunnel (temporary URL, no domain)
- Permanent tunnel (stable URL, requires a domain ~$10/year)
- Image syncing (rsync for gitignored `.png` files)
- Server settings and source configuration

### Sharing Links

Click the **Share** button in the toolbar to copy a direct link like:
```
https://<your-tunnel-url>/?source=Lab&path=EXP_003/summary.md
```
