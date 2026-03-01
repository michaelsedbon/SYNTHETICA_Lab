# Research Scout

**Slug:** `research-scout`  
**Status:** ✅ Working  
**Ports:** 8002 (API) · 3003 (UI)

---

## Purpose

Scrape and map **interdisciplinary research spaces** at the intersection of synthetic biology, robotics, maker/art/design, AI, and DIYbio. Identify key people and emerging niches to invite for talks at the Paris community. Ranks authors by how unusual their cross-topic publication pattern is (the **"misfit score"**).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python · FastAPI · SQLite · httpx (async HTTP) |
| Frontend | Next.js 16 · Tailwind CSS · TypeScript |
| Data Sources | OpenAlex API (primary) · Semantic Scholar API (optional) |
| Embedding | TF-IDF + UMAP for niche map visualization |

---

## How to Run

```bash
# Backend (port 8002)
cd applications/research-scout/server
pip install -r requirements.txt
python3 -m uvicorn main:app --host 0.0.0.0 --port 8002

# Frontend (port 3003)
cd applications/research-scout/dashboard
npm install
npm run dev -- -p 3003
```

Open **http://localhost:3003**

---

## API Endpoints

### Health & Config

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/topics` | List configured research topics (from YAML) with paper counts |

### Scraping

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/scrape` | Trigger scrape (all topics or single topic via `{topic: "..."}`) |
| GET | `/api/scrape/status` | Live scrape progress with activity log trail |

### Querying

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/papers` | Papers with filters (topic, source, year, free-text search) |
| GET | `/api/authors` | Authors ranked by score (sort: interdisciplinarity, misfit, citations; filter: country) |
| GET | `/api/authors/{author_id}` | Full author profile: papers, co-authors, topic distribution, timeline |
| GET | `/api/countries` | Distinct countries for filtering |
| GET | `/api/stats` | Dashboard summary statistics |

### Analysis

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/analyze` | Run analysis pipeline (misfit scores + co-occurrence matrix) |
| GET | `/api/cooccurrence` | Topic co-occurrence matrix |
| POST | `/api/embed` | Run TF-IDF + UMAP embedding pipeline for niche map |
| GET | `/api/niche-map` | Get 2D scatter data (papers + seed papers plotted in topic space) |

### Export

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/export/authors` | CSV export of ranked authors (params: limit, country, sort_by) |

---

## Architecture

```
research-scout/
  config/
    topics.yaml             — Scalable topic definitions (editable without code)

  server/
    main.py                  — FastAPI app with 15 endpoints
    db.py                    — SQLite schema + query helpers
    scrapers/
      base.py                — Base scraper interface
      openalex.py            — OpenAlex API client
      semantic_scholar.py    — Semantic Scholar client (rate-limit aware)
    pipeline/
      scrape.py              — Orchestrator: topics → scrapers → DB
      analyze.py             — Misfit score + topic co-occurrence
      embed.py               — TF-IDF + UMAP embedding

  dashboard/
    src/app/
      page.tsx               — Dashboard: stats, progress, co-occurrence heatmap
      papers/page.tsx        — Papers explorer with filters
      people/page.tsx        — Author rankings, misfit bars, CSV export
      topics/page.tsx        — Topic management + per-topic scrape
```

---

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Summary stats, scrape progress, co-occurrence heatmap |
| `/papers` | Papers Explorer | Filterable paper list (topic, source, year, search) |
| `/people` | Author Rankings | Ranked authors with misfit score bars, CSV export |
| `/topics` | Topic Management | View/modify topics, trigger per-topic scrapes |

---

## Key Concepts

### Misfit Score
Ranks authors by how unusual their cross-topic publication pattern is. Higher score = more interdisciplinary "misfit" — publishes across topics that don't usually overlap.

### Topic Co-occurrence
Heatmap showing which research areas share the most authors, revealing unexpected bridges between fields.

### Niche Map
2D UMAP projection of papers based on TF-IDF of abstracts. Shows clusters and gaps in the research landscape. Overlays the user's personal "seed papers" for comparison.

---

## Key Features

- **Multi-source scraping** — OpenAlex + Semantic Scholar with rate limiting
- **Misfit score ranking** — find the most interdisciplinary researchers
- **Topic co-occurrence heatmap** — discover cross-field bridges
- **Niche map** — 2D paper embedding with UMAP visualization
- **Author profiles** — papers, co-authors, topic distribution, timeline
- **Live scrape progress** — activity log with per-query status
- **CSV export** — download ranked author lists for speaker shortlisting
- **Geographic filtering** — filter authors by country
- **Configurable topics** — edit `config/topics.yaml`, no code changes needed
