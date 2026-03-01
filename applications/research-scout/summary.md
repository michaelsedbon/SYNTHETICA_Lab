# Research Scout

**Created:** 2024  
**Stack:** Python FastAPI · SQLite · httpx · Next.js 16 · Tailwind CSS  
**Ports:** 8002 (API) · 3003 (UI)  
**Data Sources:** OpenAlex API · Semantic Scholar API  

---

## Overview

Scrape and map **interdisciplinary research spaces** at the intersection of synthetic biology, robotics, maker/art/design, AI, and DIYbio. Identify key researchers and emerging niches to invite for talks at the Paris community.

The core metric is the **"misfit score"** — ranking authors by how unusual their cross-topic publication pattern is. Higher score = more interdisciplinary "misfit" who publishes across fields that don't usually overlap. The app also generates **niche maps** (2D UMAP projections of paper abstracts) and **topic co-occurrence heatmaps**.

---

## Architecture

| Component | Description |
|-----------|-------------|
| `config/topics.yaml` | Research topic definitions (edit without code changes) |
| `server/main.py` | FastAPI app — 15 endpoints |
| `server/db.py` | SQLite schema + query helpers |
| `server/scrapers/openalex.py` | OpenAlex API client |
| `server/scrapers/semantic_scholar.py` | Semantic Scholar client (rate-limit aware) |
| `server/pipeline/scrape.py` | Orchestrator: topics → scrapers → DB |
| `server/pipeline/analyze.py` | Misfit score + topic co-occurrence |
| `server/pipeline/embed.py` | TF-IDF + UMAP embedding for niche map |
| `dashboard/src/app/page.tsx` | Dashboard: stats, progress, heatmap |
| `dashboard/src/app/papers/page.tsx` | Papers explorer with filters |
| `dashboard/src/app/people/page.tsx` | Author rankings + CSV export |
| `dashboard/src/app/topics/page.tsx` | Topic management + per-topic scrape |

---

## Frontend Pages

| Route | Page |
|-------|------|
| `/` | Dashboard — summary stats, scrape progress, co-occurrence heatmap |
| `/papers` | Papers explorer — filterable by topic, source, year, free-text |
| `/people` | Author rankings — misfit score bars, profiles, CSV export |
| `/topics` | Topic management — view/modify topics, trigger scrapes |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/topics` | List topics with paper counts |
| POST | `/api/scrape` | Trigger scrape (all or single topic) |
| GET | `/api/scrape/status` | Live scrape progress with log trail |
| GET | `/api/papers` | Papers with filters |
| GET | `/api/authors` | Authors ranked by score |
| GET | `/api/authors/{id}` | Full author profile (papers, co-authors, timeline) |
| GET | `/api/countries` | Distinct countries for filtering |
| GET | `/api/stats` | Dashboard summary stats |
| POST | `/api/analyze` | Run misfit score + co-occurrence pipeline |
| GET | `/api/cooccurrence` | Topic co-occurrence matrix |
| POST | `/api/embed` | TF-IDF + UMAP embedding pipeline |
| GET | `/api/niche-map` | 2D scatter data (papers + seed papers) |
| GET | `/api/export/authors` | CSV export of ranked authors |

---

## Key Features

- **Misfit score ranking** — find the most interdisciplinary researchers
- **Topic co-occurrence heatmap** — discover cross-field bridges
- **Niche map** — 2D UMAP paper embedding visualization
- **Author profiles** — papers, co-authors, topic distribution, timeline
- **Live scrape progress** — activity log with per-query status
- **CSV export** — download ranked author lists
- **Geographic filtering** — filter authors by country
- **Configurable topics** — edit YAML, no code changes needed

See [DOCS.md](DOCS.md) for complete details.
