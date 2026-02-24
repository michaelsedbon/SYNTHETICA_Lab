# Research Scout

Scrape and map interdisciplinary research spaces at the intersection of synthetic biology, robotics, maker/art/design, AI, and DIYbio. Identify key people and emerging niches to invite for talks at the Paris community.

## Tech Stack

- **Backend**: Python FastAPI, SQLite, httpx (async HTTP)
- **Frontend**: Next.js 16, Tailwind CSS, TypeScript
- **Data Sources**: OpenAlex API, Semantic Scholar API

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

## Architecture

```
research-scout/
├── config/topics.yaml        # Scalable topic definitions
├── server/
│   ├── main.py               # FastAPI app with 7 endpoints
│   ├── db.py                 # SQLite schema + query helpers
│   ├── scrapers/
│   │   ├── base.py           # Base scraper interface
│   │   ├── openalex.py       # OpenAlex API client
│   │   └── semantic_scholar.py  # Semantic Scholar client
│   └── pipeline/
│       └── scrape.py         # Orchestrator: topics → scrapers → DB
└── dashboard/
    └── src/app/
        ├── page.tsx           # Dashboard overview
        ├── papers/page.tsx    # Papers explorer
        ├── people/page.tsx    # Author rankings
        └── topics/page.tsx    # Topic management
```
