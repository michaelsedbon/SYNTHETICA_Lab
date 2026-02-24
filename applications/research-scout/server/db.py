"""
Research Scout — SQLite database layer.

All data is stored in a single `research_scout.db` file next to server/.
Tables: papers, authors, paper_authors, paper_topics, scrape_runs.
"""

import sqlite3
import json
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime

DB_PATH = Path(__file__).parent / "research_scout.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Create all tables if they don't exist."""
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS papers (
                id            TEXT PRIMARY KEY,          -- openalex/s2 ID or DOI
                title         TEXT NOT NULL,
                abstract      TEXT,
                doi           TEXT,
                url           TEXT,
                source        TEXT,                      -- "openalex" | "semantic_scholar"
                published     TEXT,                      -- ISO date
                year          INTEGER,
                citation_count INTEGER DEFAULT 0,
                venue         TEXT,
                concepts      TEXT,                      -- JSON array of concept strings
                raw_data      TEXT,                      -- full JSON from API
                created_at    TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS authors (
                id            TEXT PRIMARY KEY,          -- openalex/s2 author ID
                name          TEXT NOT NULL,
                affiliation   TEXT,
                country       TEXT,
                source        TEXT,
                h_index       INTEGER,
                total_papers  INTEGER DEFAULT 0,
                orcid         TEXT,
                raw_data      TEXT,
                created_at    TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS paper_authors (
                paper_id      TEXT NOT NULL,
                author_id     TEXT NOT NULL,
                position      INTEGER,                   -- 0 = first author
                PRIMARY KEY (paper_id, author_id),
                FOREIGN KEY (paper_id) REFERENCES papers(id),
                FOREIGN KEY (author_id) REFERENCES authors(id)
            );

            CREATE TABLE IF NOT EXISTS paper_topics (
                paper_id      TEXT NOT NULL,
                topic_name    TEXT NOT NULL,
                query_used    TEXT,
                PRIMARY KEY (paper_id, topic_name),
                FOREIGN KEY (paper_id) REFERENCES papers(id)
            );

            CREATE TABLE IF NOT EXISTS scrape_runs (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                topic_name    TEXT,
                source        TEXT,
                query         TEXT,
                status        TEXT DEFAULT 'running',    -- running | done | error
                papers_found  INTEGER DEFAULT 0,
                error_msg     TEXT,
                started_at    TEXT DEFAULT (datetime('now')),
                finished_at   TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(year);
            CREATE INDEX IF NOT EXISTS idx_papers_source ON papers(source);
            CREATE INDEX IF NOT EXISTS idx_paper_topics_topic ON paper_topics(topic_name);
            CREATE INDEX IF NOT EXISTS idx_paper_authors_author ON paper_authors(author_id);
        """)


# ── Paper operations ────────────────────────────────────────────────

def upsert_paper(conn: sqlite3.Connection, paper: dict):
    """Insert or update a paper record."""
    conn.execute("""
        INSERT INTO papers (id, title, abstract, doi, url, source, published, year,
                           citation_count, venue, concepts, raw_data)
        VALUES (:id, :title, :abstract, :doi, :url, :source, :published, :year,
                :citation_count, :venue, :concepts, :raw_data)
        ON CONFLICT(id) DO UPDATE SET
            citation_count = excluded.citation_count,
            abstract = COALESCE(excluded.abstract, papers.abstract),
            concepts = COALESCE(excluded.concepts, papers.concepts),
            raw_data = excluded.raw_data
    """, {
        "id": paper["id"],
        "title": paper["title"],
        "abstract": paper.get("abstract"),
        "doi": paper.get("doi"),
        "url": paper.get("url"),
        "source": paper.get("source"),
        "published": paper.get("published"),
        "year": paper.get("year"),
        "citation_count": paper.get("citation_count", 0),
        "venue": paper.get("venue"),
        "concepts": json.dumps(paper.get("concepts", [])),
        "raw_data": json.dumps(paper.get("raw_data", {})),
    })


def upsert_author(conn: sqlite3.Connection, author: dict):
    """Insert or update an author record."""
    conn.execute("""
        INSERT INTO authors (id, name, affiliation, country, source, h_index, orcid, raw_data)
        VALUES (:id, :name, :affiliation, :country, :source, :h_index, :orcid, :raw_data)
        ON CONFLICT(id) DO UPDATE SET
            affiliation = COALESCE(excluded.affiliation, authors.affiliation),
            country = COALESCE(excluded.country, authors.country),
            h_index = COALESCE(excluded.h_index, authors.h_index),
            total_papers = authors.total_papers + 1,
            raw_data = excluded.raw_data
    """, {
        "id": author["id"],
        "name": author["name"],
        "affiliation": author.get("affiliation"),
        "country": author.get("country"),
        "source": author.get("source"),
        "h_index": author.get("h_index"),
        "orcid": author.get("orcid"),
        "raw_data": json.dumps(author.get("raw_data", {})),
    })


def link_paper_author(conn: sqlite3.Connection, paper_id: str, author_id: str, position: int):
    conn.execute("""
        INSERT OR IGNORE INTO paper_authors (paper_id, author_id, position)
        VALUES (?, ?, ?)
    """, (paper_id, author_id, position))


def link_paper_topic(conn: sqlite3.Connection, paper_id: str, topic_name: str, query: str):
    conn.execute("""
        INSERT OR IGNORE INTO paper_topics (paper_id, topic_name, query_used)
        VALUES (?, ?, ?)
    """, (paper_id, topic_name, query))


# ── Scrape run tracking ────────────────────────────────────────────

def start_scrape_run(conn: sqlite3.Connection, topic: str, source: str, query: str) -> int:
    cur = conn.execute("""
        INSERT INTO scrape_runs (topic_name, source, query)
        VALUES (?, ?, ?)
    """, (topic, source, query))
    return cur.lastrowid


def finish_scrape_run(conn: sqlite3.Connection, run_id: int, papers_found: int, error: str = None):
    conn.execute("""
        UPDATE scrape_runs SET
            status = ?,
            papers_found = ?,
            error_msg = ?,
            finished_at = datetime('now')
        WHERE id = ?
    """, ("error" if error else "done", papers_found, error, run_id))


# ── Query helpers ───────────────────────────────────────────────────

def get_papers(conn: sqlite3.Connection, topic: str = None, source: str = None,
               year_min: int = None, limit: int = 50, offset: int = 0) -> list[dict]:
    """Get papers with optional filters."""
    query = "SELECT DISTINCT p.* FROM papers p"
    conditions = []
    params = []

    if topic:
        query += " JOIN paper_topics pt ON p.id = pt.paper_id"
        conditions.append("pt.topic_name = ?")
        params.append(topic)
    if source:
        conditions.append("p.source = ?")
        params.append(source)
    if year_min:
        conditions.append("p.year >= ?")
        params.append(year_min)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY p.citation_count DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


def get_authors_ranked(conn: sqlite3.Connection, limit: int = 50, offset: int = 0,
                       country: str = None, sort_by: str = "interdisciplinarity") -> list:
    """Get authors ranked by chosen metric.

    sort_by options:
        - interdisciplinarity (default): topic_count DESC
        - misfit: misfit_score DESC
        - citations: total_citations DESC
    """
    query = """
        SELECT
            a.*,
            COUNT(DISTINCT pt.topic_name) AS topic_count,
            COUNT(DISTINCT pa.paper_id) AS paper_count_local,
            SUM(p.citation_count) AS total_citations
        FROM authors a
        JOIN paper_authors pa ON a.id = pa.author_id
        JOIN papers p ON pa.paper_id = p.id
        LEFT JOIN paper_topics pt ON p.id = pt.paper_id
    """
    conditions = []
    params = []

    if country:
        conditions.append("a.country = ?")
        params.append(country)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " GROUP BY a.id"

    # Sort order
    sort_map = {
        "misfit": "COALESCE(a.misfit_score, 0) DESC, topic_count DESC",
        "citations": "total_citations DESC, topic_count DESC",
        "interdisciplinarity": "topic_count DESC, total_citations DESC",
    }
    query += f" ORDER BY {sort_map.get(sort_by, sort_map['interdisciplinarity'])}"
    query += " LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


def get_countries(conn: sqlite3.Connection) -> list:
    """Get distinct countries from authors."""
    rows = conn.execute("""
        SELECT DISTINCT country FROM authors
        WHERE country IS NOT NULL AND country != ''
        ORDER BY country
    """).fetchall()
    return [r["country"] for r in rows]


def get_topic_cooccurrence(conn: sqlite3.Connection) -> list:
    """Get topic co-occurrence matrix (shared authors between topics)."""
    rows = conn.execute("""
        SELECT pt1.topic_name AS topic_a,
               pt2.topic_name AS topic_b,
               COUNT(DISTINCT pa1.author_id) AS shared_authors
        FROM paper_topics pt1
        JOIN paper_authors pa1 ON pt1.paper_id = pa1.paper_id
        JOIN paper_authors pa2 ON pa1.author_id = pa2.author_id
        JOIN paper_topics pt2 ON pa2.paper_id = pt2.paper_id
        WHERE pt1.topic_name < pt2.topic_name
        GROUP BY pt1.topic_name, pt2.topic_name
        ORDER BY shared_authors DESC
    """).fetchall()
    return [dict(r) for r in rows]


def get_stats(conn: sqlite3.Connection) -> dict:
    """Get summary stats for the dashboard."""
    paper_count = conn.execute("SELECT COUNT(*) FROM papers").fetchone()[0]
    author_count = conn.execute("SELECT COUNT(*) FROM authors").fetchone()[0]
    topic_counts = conn.execute("""
        SELECT topic_name, COUNT(*) as cnt
        FROM paper_topics
        GROUP BY topic_name
        ORDER BY cnt DESC
    """).fetchall()

    last_run = conn.execute("""
        SELECT * FROM scrape_runs
        ORDER BY started_at DESC LIMIT 1
    """).fetchone()

    return {
        "paper_count": paper_count,
        "author_count": author_count,
        "topic_counts": [{"topic": r["topic_name"], "count": r["cnt"]} for r in topic_counts],
        "last_scrape": dict(last_run) if last_run else None,
    }
