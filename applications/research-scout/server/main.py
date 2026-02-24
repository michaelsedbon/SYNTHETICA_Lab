"""
Research Scout — FastAPI backend.

Provides API endpoints for:
- Topic management (reading from YAML config)
- Triggering scrape jobs
- Querying papers, authors, and stats
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from typing import Optional

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import db
from pipeline.scrape import load_topics, scrape_all, scrape_one, set_progress_callback

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger(__name__)

# ── Track background scrape jobs ────────────────────────────────────
_scrape_status = {
    "running": False,
    "progress": None,
    "results": None,
    "current_topic": None,
    "topics_total": 0,
    "topics_done": 0,
    "log": [],  # list of {timestamp, message, type}
}


def _reset_status():
    global _scrape_status
    _scrape_status = {
        "running": False,
        "progress": None,
        "results": None,
        "current_topic": None,
        "topics_total": 0,
        "topics_done": 0,
        "log": [],
    }


def _log(message: str, log_type: str = "info"):
    """Append a log entry to the scrape status."""
    _scrape_status["log"].append({
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "message": message,
        "type": log_type,  # info, success, error, start
    })
    # Keep only the last 100 entries
    if len(_scrape_status["log"]) > 100:
        _scrape_status["log"] = _scrape_status["log"][-100:]


def _progress_callback(event: str, data: dict):
    """Called by the scrape pipeline to report progress."""
    if event == "scrape_start":
        _scrape_status["topics_total"] = data.get("total_topics", 0)
        _log(f"Starting scrape of {data.get('total_topics', 0)} topics", "start")
    elif event == "topic_start":
        _scrape_status["current_topic"] = data.get("topic")
        _scrape_status["progress"] = f"Scraping: {data.get('topic')}"
        _log(f"▸ Topic: {data.get('topic')}", "start")
    elif event == "query_start":
        _log(f"  ↳ {data.get('source')}: \"{data.get('query')}\"")
    elif event == "query_done":
        _log(f"  ✓ {data.get('papers', 0)} papers from {data.get('source')}", "success")
    elif event == "query_error":
        _log(f"  ✗ {data.get('error')}", "error")
    elif event == "topic_done":
        _scrape_status["topics_done"] = data.get("topics_done", 0)
        _log(f"✓ {data.get('topic')}: {data.get('papers', 0)} papers, {data.get('authors', 0)} authors", "success")
    elif event == "scrape_done":
        _scrape_status["progress"] = "Done"
        total_papers = sum(r.get("papers", 0) for r in (data.get("results") or []))
        _log(f"🏁 Scrape complete — {total_papers} total papers", "success")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    db.init_db()
    set_progress_callback(_progress_callback)
    logger.info("Database initialized")
    yield


app = FastAPI(title="Research Scout API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ──────────────────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    topic: Optional[str] = None  # None = scrape all topics


# ── Health ──────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "research-scout"}


# ── Topics ──────────────────────────────────────────────────────────

@app.get("/api/topics")
def list_topics():
    """List all configured topics from YAML."""
    topics = load_topics()
    # Enrich with paper counts from DB
    with db.get_db() as conn:
        counts = conn.execute("""
            SELECT topic_name, COUNT(DISTINCT paper_id) as cnt
            FROM paper_topics GROUP BY topic_name
        """).fetchall()
        count_map = {r["topic_name"]: r["cnt"] for r in counts}

    return [
        {
            "name": t["name"],
            "queries": t.get("queries", []),
            "sources": t.get("sources", []),
            "max_results": t.get("max_results", 200),
            "paper_count": count_map.get(t["name"], 0),
        }
        for t in topics
    ]


# ── Scrape ──────────────────────────────────────────────────────────

async def _run_scrape(topic: Optional[str]):
    """Background task to run scrape."""
    global _scrape_status
    _reset_status()
    _scrape_status["running"] = True
    _scrape_status["progress"] = f"Scraping {'all topics' if not topic else topic}..."

    try:
        if topic:
            result = await scrape_one(topic)
            results = [result]
        else:
            results = await scrape_all()
        _scrape_status["running"] = False
        _scrape_status["results"] = results
        _progress_callback("scrape_done", {"results": results})
    except Exception as e:
        logger.error(f"Scrape failed: {e}")
        _scrape_status["running"] = False
        _scrape_status["progress"] = f"Error: {e}"
        _log(f"Scrape failed: {e}", "error")


@app.post("/api/scrape")
async def trigger_scrape(req: ScrapeRequest, background_tasks: BackgroundTasks):
    """Trigger a scrape job. Runs in background."""
    if _scrape_status["running"]:
        raise HTTPException(status_code=409, detail="A scrape is already running")

    background_tasks.add_task(_run_scrape, req.topic)
    return {"status": "started", "topic": req.topic or "all"}


@app.get("/api/scrape/status")
def scrape_status():
    """Check the status of the current/last scrape job."""
    return _scrape_status


# ── Papers ──────────────────────────────────────────────────────────

@app.get("/api/papers")
def list_papers(
    topic: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    year_min: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List papers with optional filters."""
    with db.get_db() as conn:
        papers = db.get_papers(conn, topic=topic, source=source, year_min=year_min,
                               limit=limit, offset=offset)
        total = conn.execute("SELECT COUNT(*) FROM papers").fetchone()[0]

    return {"papers": papers, "total": total, "limit": limit, "offset": offset}


# ── Authors ─────────────────────────────────────────────────────────

@app.get("/api/authors")
def list_authors(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    country: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("interdisciplinarity"),
):
    """List authors ranked by chosen metric.

    sort_by: interdisciplinarity | misfit | citations
    """
    with db.get_db() as conn:
        authors = db.get_authors_ranked(conn, limit=limit, offset=offset,
                                        country=country, sort_by=sort_by)
        total = conn.execute("SELECT COUNT(*) FROM authors").fetchone()[0]

    return {"authors": authors, "total": total, "limit": limit, "offset": offset}


@app.get("/api/countries")
def list_countries():
    """Get distinct countries from authors."""
    with db.get_db() as conn:
        return db.get_countries(conn)


# ── Analysis ────────────────────────────────────────────────────────

@app.post("/api/analyze")
def trigger_analysis():
    """Run analysis pipeline to compute scores."""
    from pipeline.analyze import run_analysis
    result = run_analysis()
    return {"status": "done", **result}


@app.get("/api/cooccurrence")
def get_cooccurrence():
    """Get topic co-occurrence matrix."""
    with db.get_db() as conn:
        return db.get_topic_cooccurrence(conn)


@app.post("/api/embed")
def trigger_embedding():
    """Run TF-IDF + UMAP embedding pipeline for niche map."""
    from pipeline.embed import compute_embeddings
    result = compute_embeddings()
    return result


@app.get("/api/niche-map")
def get_niche_map():
    """Get 2D scatter data for the niche map visualization."""
    with db.get_db() as conn:
        rows = conn.execute("""
            SELECT p.id, p.title, p.year, p.citation_count, p.umap_x, p.umap_y,
                   GROUP_CONCAT(DISTINCT pt.topic_name) as topics
            FROM papers p
            LEFT JOIN paper_topics pt ON p.id = pt.paper_id
            WHERE p.umap_x IS NOT NULL AND p.umap_y IS NOT NULL
            GROUP BY p.id
        """).fetchall()
        return [dict(r) for r in rows]


# ── Author Profiles ─────────────────────────────────────────────────

@app.get("/api/authors/{author_id:path}")
def get_author_profile(author_id: str):
    """Get full author profile with papers, co-authors, and timeline."""
    with db.get_db() as conn:
        # Author info
        author = conn.execute("SELECT * FROM authors WHERE id = ?", (author_id,)).fetchone()
        if not author:
            raise HTTPException(status_code=404, detail="Author not found")

        # Their papers
        papers = conn.execute("""
            SELECT p.id, p.title, p.year, p.citation_count, p.venue, p.doi, p.url,
                   GROUP_CONCAT(DISTINCT pt.topic_name) as topics
            FROM papers p
            JOIN paper_authors pa ON p.id = pa.paper_id
            LEFT JOIN paper_topics pt ON p.id = pt.paper_id
            WHERE pa.author_id = ?
            GROUP BY p.id
            ORDER BY p.year DESC, p.citation_count DESC
        """, (author_id,)).fetchall()

        # Co-authors (other authors on similar papers)
        coauthors = conn.execute("""
            SELECT a.id, a.name, a.affiliation, COUNT(DISTINCT pa2.paper_id) as shared_papers
            FROM paper_authors pa1
            JOIN paper_authors pa2 ON pa1.paper_id = pa2.paper_id AND pa1.author_id != pa2.author_id
            JOIN authors a ON pa2.author_id = a.id
            WHERE pa1.author_id = ?
            GROUP BY a.id
            ORDER BY shared_papers DESC
            LIMIT 20
        """, (author_id,)).fetchall()

        # Topics they span
        topic_counts = conn.execute("""
            SELECT pt.topic_name, COUNT(DISTINCT pa.paper_id) as paper_count
            FROM paper_authors pa
            JOIN paper_topics pt ON pa.paper_id = pt.paper_id
            WHERE pa.author_id = ?
            GROUP BY pt.topic_name
            ORDER BY paper_count DESC
        """, (author_id,)).fetchall()

        # Year timeline
        timeline = conn.execute("""
            SELECT p.year, COUNT(*) as count
            FROM papers p
            JOIN paper_authors pa ON p.id = pa.paper_id
            WHERE pa.author_id = ? AND p.year IS NOT NULL
            GROUP BY p.year
            ORDER BY p.year
        """, (author_id,)).fetchall()

        return {
            "author": dict(author),
            "papers": [dict(r) for r in papers],
            "coauthors": [dict(r) for r in coauthors],
            "topics": [dict(r) for r in topic_counts],
            "timeline": [dict(r) for r in timeline],
        }


# ── Export ──────────────────────────────────────────────────────────

@app.get("/api/export/authors")
def export_authors_csv(
    limit: int = Query(200, ge=1, le=2000),
    country: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("interdisciplinarity"),
):
    """Export top authors as CSV."""
    from fastapi.responses import StreamingResponse
    import io
    import csv

    with db.get_db() as conn:
        authors = db.get_authors_ranked(conn, limit=limit, offset=0,
                                        country=country, sort_by=sort_by)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["rank", "name", "affiliation", "country", "topics_bridged",
                     "papers", "citations", "misfit_score", "source"])
    for i, a in enumerate(authors):
        writer.writerow([
            i + 1,
            a.get("name", ""),
            a.get("affiliation", ""),
            a.get("country", ""),
            a.get("topic_count", 0),
            a.get("paper_count_local", 0),
            a.get("total_citations", 0),
            a.get("misfit_score", 0),
            a.get("source", ""),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=research_scout_authors.csv"},
    )


# ── Stats ───────────────────────────────────────────────────────────

@app.get("/api/stats")
def get_stats():
    """Dashboard summary stats."""
    with db.get_db() as conn:
        return db.get_stats(conn)
