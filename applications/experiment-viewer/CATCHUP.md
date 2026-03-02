# Experiment Notebooks — Catchup

## 2026-03-02 — Documentation audit
- Updated DOCS.md with LaTeX rendering, tree caching, and all recent features
- Added LaTeX and tree caching to the key features list

## 2026-03-01 — LaTeX equation rendering
- Added `remark-math` (^6.0.0) and `rehype-katex` (^7.0.1) to react-markdown pipeline
- Imported KaTeX CSS in `page.tsx` and `globals.css` for proper equation styling
- Supports inline `$...$` and display `$$...$$` equations
- Fixed initial issue with duplicated plaintext rendering by correcting plugin order

## 2026-03-01 — Loading performance optimization
- Investigated slow sidebar loading with large experiment trees
- Added 30-second tree cache (`_TREE_CACHE_TTL`) to avoid re-walking filesystem on every request
- Skip list for traversal: `.venv`, `node_modules`, `__pycache__`, `.git`, `.next`, `data`

## 2026-02-19 — Initial build
- Created FastAPI backend to discover and serve .md files from experiments/
- Built Next.js frontend with sidebar, search, breadcrumb, and markdown viewer
- Full markdown rendering: tables, code blocks, images, GFM syntax
- Dark mode with custom prose styling matching the lab's design system
- Registered in launcher (📓 icon, ports 8001/3002)
