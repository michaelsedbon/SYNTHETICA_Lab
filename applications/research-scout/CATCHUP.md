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

## 2026-02-24 — V2: Analysis & scoring

- Added live scrape progress panel: progress bar, current topic indicator, scrolling activity log with timestamps
- Fixed Semantic Scholar rate limiting: max 3 retries per query (was infinite loop), removed S2 from default sources
- Created analysis pipeline (`pipeline/analyze.py`):
  - **Misfit score**: ranks authors by inverse topic-pair frequency × breadth bonus, normalized 0-100
  - **Topic co-occurrence**: counts shared authors between each topic pair
- Enhanced People page: country filter dropdown, sort toggle (Topics/Misfit/Citations), misfit score bar visualization, CSV export button
- Enhanced Dashboard: topic co-occurrence heatmap, "Run Analysis" button, two-column layout
- New API endpoints: `/api/analyze`, `/api/cooccurrence`, `/api/countries`, `/api/export/authors`
- Updated `db.py` with `misfit_score` column, country-based filtering, and sort options
