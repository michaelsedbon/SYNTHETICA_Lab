# Research Scout — Catchup

## 2026-02-24 — Initial build

- Scaffolded full app: FastAPI backend + Next.js frontend
- Built OpenAlex and Semantic Scholar scrapers with rate limiting and pagination
- SQLite database with tables: papers, authors, paper_authors, paper_topics, scrape_runs
- Scalable `config/topics.yaml` — add topics without code changes
- Pipeline orchestrator runs all scrapers for all configured topics
- Dashboard with 4 pages: overview stats, papers explorer, people rankings, topic management
- Background scrape jobs with live status tracking
- Registered in launcher on ports 8002 (API) / 3003 (UI)
