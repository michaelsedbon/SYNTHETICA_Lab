# Research Scout

Scrape and map interdisciplinary research spaces at the intersection of synthetic biology, robotics, maker/art/design, AI, and DIYbio. Identify key people and emerging niches to invite for talks at the Paris community.

## Tech Stack

- **Backend**: Python FastAPI, SQLite, httpx (async HTTP)
- **Frontend**: Next.js 16, Tailwind CSS, TypeScript
- **Data Sources**: OpenAlex API (primary), Semantic Scholar API (optional)

## How to Run

```bash
# Backend
cd server
pip install -r requirements.txt
python3 -m uvicorn main:app --host 0.0.0.0 --port 8002

# Frontend
cd dashboard
npm install
npm run dev -- -p 3003
```

## Key Config

- **Ports**: 8002 (API), 3003 (UI)
- **Topics**: Edit `config/topics.yaml` to add/modify research topics — no code changes needed
- **Database**: `server/research_scout.db` (auto-created on first run)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/topics` | List configured topics |
| POST | `/api/scrape` | Trigger scrape (all or single topic) |
| GET | `/api/scrape/status` | Live scrape progress with log trail |
| GET | `/api/papers` | Papers with filters (topic, source, year) |
| GET | `/api/authors` | Authors ranked by score (sort: interdisciplinarity, misfit, citations; filter: country) |
| GET | `/api/countries` | Distinct countries for filtering |
| POST | `/api/analyze` | Run analysis pipeline (misfit scores + co-occurrence) |
| GET | `/api/cooccurrence` | Topic co-occurrence matrix |
| GET | `/api/export/authors` | CSV export of top authors |
| GET | `/api/stats` | Dashboard summary stats |

## Architecture

```
research-scout/
├── config/topics.yaml           # Scalable topic definitions
├── server/
│   ├── main.py                  # FastAPI app with 11 endpoints
│   ├── db.py                    # SQLite schema + query helpers
│   ├── scrapers/
│   │   ├── base.py              # Base scraper interface
│   │   ├── openalex.py          # OpenAlex API client
│   │   └── semantic_scholar.py  # Semantic Scholar client (rate-limit aware)
│   └── pipeline/
│       ├── scrape.py            # Orchestrator: topics → scrapers → DB
│       └── analyze.py           # Misfit score + topic co-occurrence
└── dashboard/
    └── src/app/
        ├── page.tsx             # Dashboard: stats, progress, co-occurrence heatmap
        ├── papers/page.tsx      # Papers explorer with filters
        ├── people/page.tsx      # Author rankings, misfit bars, CSV export
        └── topics/page.tsx      # Topic management + per-topic scrape
```

## Key Features

- **Misfit Score**: Ranks authors by how unusual their cross-topic publication pattern is (higher = more interdisciplinary misfit)
- **Topic Co-occurrence**: Heatmap showing which research areas share the most authors
- **Live Scrape Progress**: Activity log with per-query status during scrapes
- **CSV Export**: Download ranked author lists for speaker shortlisting
- **Geographic Filtering**: Filter authors by country
