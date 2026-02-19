# Experiment Notebooks

A web application for browsing and reading all experiment markdown files in the lab workspace. Renders `.md` files from `experiments/` with full support for tables, code blocks, images, and GitHub-flavoured markdown.

## Tech stack

- **Backend:** Python FastAPI (serves file tree, markdown content, and media)
- **Frontend:** Next.js (App Router) + Tailwind CSS v4 + shadcn/ui
- **Markdown:** react-markdown + remark-gfm + rehype-raw + rehype-highlight

## How to run

```bash
# Backend
cd applications/experiment-viewer/server
python3 -m uvicorn main:app --host 0.0.0.0 --port 8001

# Frontend
cd applications/experiment-viewer/dashboard
npm run dev -- -p 3002
```

Open http://localhost:3002

## Key config

| Item | Value |
|------|-------|
| Backend port | 8001 |
| Frontend port | 3002 |
| Experiments dir | `../../experiments/` (auto-discovered) |

## Architecture

- `server/main.py` — FastAPI app; walks `experiments/` to discover `.md` files, serves content + images
- `dashboard/src/app/page.tsx` — Main UI: collapsible sidebar with search, breadcrumb header, markdown viewer
- `dashboard/src/app/globals.css` — Custom dark theme + markdown prose styles
