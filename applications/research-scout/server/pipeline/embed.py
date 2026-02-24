"""
Embedding pipeline — TF-IDF + UMAP for abstract clustering.

Computes 2D coordinates for all papers based on their abstracts,
coloring by topic to reveal research niches and gaps.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from umap import UMAP

import db

logger = logging.getLogger(__name__)


def compute_embeddings() -> dict:
    """
    Compute 2D UMAP embeddings from paper abstracts using TF-IDF.

    Stores x, y coordinates in the papers table (new columns).
    Returns summary stats.
    """
    with db.get_db() as conn:
        # Add embedding columns if they don't exist
        try:
            conn.execute("ALTER TABLE papers ADD COLUMN umap_x REAL")
        except Exception:
            pass
        try:
            conn.execute("ALTER TABLE papers ADD COLUMN umap_y REAL")
        except Exception:
            pass

        # Fetch papers with abstracts
        rows = conn.execute("""
            SELECT p.id, p.abstract, GROUP_CONCAT(DISTINCT pt.topic_name) as topics
            FROM papers p
            LEFT JOIN paper_topics pt ON p.id = pt.paper_id
            WHERE p.abstract IS NOT NULL AND p.abstract != ''
            GROUP BY p.id
        """).fetchall()

        if len(rows) < 10:
            logger.warning(f"Only {len(rows)} papers with abstracts — need at least 10 for embedding")
            return {"status": "skipped", "reason": "too few papers with abstracts"}

        paper_ids = [r["id"] for r in rows]
        abstracts = [r["abstract"] for r in rows]
        topics = [r["topics"] or "Unknown" for r in rows]

        logger.info(f"Computing TF-IDF for {len(abstracts)} abstracts...")

        # TF-IDF vectorization
        tfidf = TfidfVectorizer(
            max_features=5000,
            stop_words="english",
            min_df=2,
            max_df=0.95,
            ngram_range=(1, 2),
        )
        tfidf_matrix = tfidf.fit_transform(abstracts)

        logger.info(f"TF-IDF matrix: {tfidf_matrix.shape}, running UMAP...")

        # UMAP reduction to 2D
        n_neighbors = min(15, len(abstracts) - 1)
        reducer = UMAP(
            n_components=2,
            n_neighbors=n_neighbors,
            min_dist=0.1,
            metric="cosine",
            random_state=42,
        )
        coords = reducer.fit_transform(tfidf_matrix.toarray())

        # Normalize to 0-100 for easy frontend rendering
        x_min, x_max = coords[:, 0].min(), coords[:, 0].max()
        y_min, y_max = coords[:, 1].min(), coords[:, 1].max()
        x_range = max(x_max - x_min, 0.001)
        y_range = max(y_max - y_min, 0.001)

        for i, pid in enumerate(paper_ids):
            nx = float((coords[i, 0] - x_min) / x_range * 100)
            ny = float((coords[i, 1] - y_min) / y_range * 100)
            conn.execute(
                "UPDATE papers SET umap_x = ?, umap_y = ? WHERE id = ?",
                (round(nx, 2), round(ny, 2), pid),
            )

        logger.info(f"Stored embeddings for {len(paper_ids)} papers")

    return {
        "status": "done",
        "papers_embedded": len(paper_ids),
        "tfidf_features": tfidf_matrix.shape[1],
    }
