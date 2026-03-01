# Experiment Notebooks

**Created:** 2024  
**Stack:** Python FastAPI · Next.js · Tailwind CSS v4 · react-markdown  
**Ports:** 8001 (API) · 3002 (UI)  

---

## Overview

A web application for **browsing and reading all experiment markdown files** across multiple sources (lab workspace, PhD folder, and any additional directories). Renders `.md` files with full support for tables, code blocks, images, and GitHub-flavoured markdown in a polished dark-mode reader.

The viewer auto-discovers experiment folders, groups files by experiment (with `summary.md` as the primary entry), and provides search across all content. Also supports **code file viewing** with syntax highlighting for 30+ languages and **"Open in Editor"** integration with VS Code/Cursor.

---

## Architecture

| Component | Description |
|-----------|-------------|
| `server/main.py` | FastAPI backend — file discovery, content serving, settings |
| `server/settings.json` | Persisted source directories configuration |
| `dashboard/src/app/page.tsx` | Main UI — collapsible sidebar, breadcrumbs, markdown viewer |
| `dashboard/src/app/globals.css` | Custom dark theme + markdown prose styles |

---

## Configured Sources

| Label | Path |
|-------|------|
| Lab | `experiments/` |
| PhD | `~/Documents/PhD/experiments/` |
| Applications | `applications/` |

Sources can be added/removed via the settings API or the UI settings panel.

---

## API Endpoints

### Experiments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/experiments` | Grouped tree of all markdown files |
| GET | `/api/sources` | List configured sources |
| GET | `/api/file` | Raw markdown content (`?path=...&source=Lab`) |
| GET | `/api/media` | Serve referenced images/media |

### Code Viewer

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/code` | Code file with language detection |
| GET | `/api/raw` | Plain text for browser viewing |
| POST | `/api/open-in-editor` | Open in VS Code/Cursor at line |

### Preview & Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/preview` | Render any `.md` file by absolute path |
| GET | `/api/preview-media` | Media for previewed files |
| GET | `/api/settings` | Current settings |
| POST | `/api/settings` | Update source directories |

---

## Key Features

- Multi-source experiment browsing with grouped file tree
- Dark-mode markdown renderer with GFM support
- Code file viewer (30+ languages, syntax highlighted)
- "Open in Editor" button (VS Code / Cursor)
- Search across all experiment files
- Arbitrary file preview via `?preview=<path>` URL

See [DOCS.md](DOCS.md) for complete details.
