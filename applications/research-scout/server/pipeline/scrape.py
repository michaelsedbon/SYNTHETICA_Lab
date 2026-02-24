"""
Scrape orchestrator — runs all configured scrapers for all topics.

Reads topics from config/topics.yaml, runs the appropriate scraper for each
(query, source) pair, and stores results in the database.
"""

import asyncio
import logging
import yaml
from pathlib import Path
from typing import Callable, Optional

from scrapers.openalex import OpenAlexScraper
from scrapers.semantic_scholar import SemanticScholarScraper
from scrapers.base import PaperResult
import db

logger = logging.getLogger(__name__)

CONFIG_PATH = Path(__file__).parent.parent.parent / "config" / "topics.yaml"

SCRAPERS = {
    "openalex": OpenAlexScraper(),
    "semantic_scholar": SemanticScholarScraper(),
}

# Progress callback — set by main.py at startup
_progress_cb: Optional[Callable] = None


def set_progress_callback(cb: Callable):
    global _progress_cb
    _progress_cb = cb


def _emit(event: str, data: dict):
    if _progress_cb:
        _progress_cb(event, data)


def load_topics() -> list:
    """Load topic configuration from YAML."""
    with open(CONFIG_PATH, "r") as f:
        config = yaml.safe_load(f)
    return config.get("topics", [])


async def scrape_topic(topic: dict, topics_done: int = 0) -> dict:
    """Run all scrapers for a single topic. Returns summary."""
    topic_name = topic["name"]
    queries = topic.get("queries", [])
    sources = topic.get("sources", ["openalex"])
    max_per_query = topic.get("max_results", 200) // max(len(queries), 1)

    total_papers = 0
    total_authors = 0
    errors = []

    _emit("topic_start", {"topic": topic_name})

    for source_name in sources:
        scraper = SCRAPERS.get(source_name)
        if not scraper:
            errors.append(f"Unknown scraper: {source_name}")
            continue

        for query in queries:
            logger.info(f"[{topic_name}] Scraping {source_name}: '{query}' (max {max_per_query})")
            _emit("query_start", {"topic": topic_name, "source": source_name, "query": query})

            with db.get_db() as conn:
                run_id = db.start_scrape_run(conn, topic_name, source_name, query)

            try:
                results = await scraper.search(query, max_results=max_per_query)

                with db.get_db() as conn:
                    papers_stored = 0
                    for paper in results:
                        db.upsert_paper(conn, paper.to_dict())

                        # Store authors and link them
                        for i, author in enumerate(paper.authors):
                            if author.get("id"):
                                db.upsert_author(conn, author)
                                db.link_paper_author(conn, paper.id, author["id"], i)
                                total_authors += 1

                        # Link paper to topic
                        db.link_paper_topic(conn, paper.id, topic_name, query)
                        papers_stored += 1

                    db.finish_scrape_run(conn, run_id, papers_stored)
                    total_papers += papers_stored

                logger.info(f"[{topic_name}] {source_name}:'{query}' → {papers_stored} papers")
                _emit("query_done", {"topic": topic_name, "source": source_name, "query": query, "papers": papers_stored})

            except Exception as e:
                error_msg = f"{source_name}:'{query}' failed: {e}"
                logger.error(f"[{topic_name}] {error_msg}")
                errors.append(error_msg)
                _emit("query_error", {"topic": topic_name, "source": source_name, "query": query, "error": error_msg})
                with db.get_db() as conn:
                    db.finish_scrape_run(conn, run_id, 0, str(e))

    _emit("topic_done", {
        "topic": topic_name,
        "papers": total_papers,
        "authors": total_authors,
        "topics_done": topics_done + 1,
    })

    return {
        "topic": topic_name,
        "papers": total_papers,
        "authors": total_authors,
        "errors": errors,
    }


async def scrape_all() -> list:
    """Run scrape for all configured topics sequentially."""
    topics = load_topics()
    _emit("scrape_start", {"total_topics": len(topics)})
    results = []
    for i, topic in enumerate(topics):
        result = await scrape_topic(topic, topics_done=i)
        results.append(result)
    return results


async def scrape_one(topic_name: str) -> dict:
    """Run scrape for a single topic by name."""
    topics = load_topics()
    _emit("scrape_start", {"total_topics": 1})
    for topic in topics:
        if topic["name"] == topic_name:
            return await scrape_topic(topic)
    raise ValueError(f"Topic not found: {topic_name}")
