"""
Analysis pipeline — compute author scores and topic co-occurrence.

Run after scraping to enrich the database with:
- Misfit score: how unusual an author's cross-disciplinary venue combinations are
- Topic co-occurrence: which topic pairs share the most authors
"""

from __future__ import annotations

import logging
import math
from collections import Counter, defaultdict
from typing import Optional

import db

logger = logging.getLogger(__name__)


def compute_misfit_scores():
    """
    Compute a 'misfit score' for each author.

    The misfit score measures how unusual an author's venue/topic combination is.
    An author who publishes in both "BioArt" and "AI for Wetlab" venues is more
    interdisciplinary (higher misfit) than someone who only publishes in "AI" venues.

    Score = sum of (1 / frequency_of_topic_pair) for each pair of topics the author spans.
    Normalized to 0-100 scale.
    """
    with db.get_db() as conn:
        # Get the global frequency of each topic
        topic_freq = {}
        rows = conn.execute("""
            SELECT topic_name, COUNT(DISTINCT paper_id) as cnt
            FROM paper_topics GROUP BY topic_name
        """).fetchall()
        total_papers = max(sum(r["cnt"] for r in rows), 1)
        for r in rows:
            topic_freq[r["topic_name"]] = r["cnt"] / total_papers

        # For each author, get their topic set
        authors = conn.execute("""
            SELECT a.id, GROUP_CONCAT(DISTINCT pt.topic_name) as topics
            FROM authors a
            JOIN paper_authors pa ON a.id = pa.author_id
            JOIN paper_topics pt ON pa.paper_id = pt.paper_id
            GROUP BY a.id
        """).fetchall()

        scores = {}
        max_score = 0

        for author in authors:
            topics = (author["topics"] or "").split(",")
            topics = [t.strip() for t in topics if t.strip()]

            if len(topics) <= 1:
                scores[author["id"]] = 0
                continue

            # Score = sum of inverse frequency products for each topic pair
            score = 0
            for i in range(len(topics)):
                for j in range(i + 1, len(topics)):
                    freq_i = topic_freq.get(topics[i], 1)
                    freq_j = topic_freq.get(topics[j], 1)
                    # Rarer topic combinations get higher scores
                    pair_score = 1.0 / (freq_i * freq_j + 0.01)
                    score += pair_score

            # Bonus for spanning more topics
            score *= math.log2(len(topics) + 1)
            scores[author["id"]] = score
            max_score = max(max_score, score)

        # Normalize to 0-100
        if max_score > 0:
            for aid in scores:
                scores[aid] = round((scores[aid] / max_score) * 100, 1)

        # Write scores to DB
        # First, add column if it doesn't exist
        try:
            conn.execute("ALTER TABLE authors ADD COLUMN misfit_score REAL DEFAULT 0")
        except Exception:
            pass  # Column already exists

        for aid, score in scores.items():
            conn.execute("UPDATE authors SET misfit_score = ? WHERE id = ?", (score, aid))

        logger.info(f"Computed misfit scores for {len(scores)} authors (max raw: {max_score:.2f})")

    return {"authors_scored": len(scores)}


def compute_topic_cooccurrence():
    """
    Compute a topic co-occurrence matrix.

    For each pair of topics, count how many authors have papers in both.
    Returns a list of {topic_a, topic_b, shared_authors} entries.
    """
    with db.get_db() as conn:
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

        result = [dict(r) for r in rows]
        logger.info(f"Computed co-occurrence for {len(result)} topic pairs")
        return result


def run_analysis():
    """Run all analysis steps."""
    logger.info("Starting analysis pipeline...")
    misfit = compute_misfit_scores()
    cooccurrence = compute_topic_cooccurrence()
    logger.info("Analysis pipeline complete")
    return {
        "misfit": misfit,
        "cooccurrence_pairs": len(cooccurrence),
    }
