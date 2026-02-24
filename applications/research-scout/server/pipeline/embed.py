"""
Embedding pipeline — TF-IDF + UMAP for abstract clustering.

Computes 2D coordinates for all papers based on their abstracts,
including user seed papers from the papers_txt folder.
"""

from __future__ import annotations

import glob
import logging
import os

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from umap import UMAP

import db

logger = logging.getLogger(__name__)

# Path to user's personal paper collection
SEED_PAPERS_DIR = os.path.expanduser(
    "~/Documents/PhD/papers_txt"
)


def _load_seed_papers() -> list[dict]:
    """Load .txt files from the user's papers folder as seed papers."""
    seeds = []
    if not os.path.isdir(SEED_PAPERS_DIR):
        logger.warning(f"Seed papers dir not found: {SEED_PAPERS_DIR}")
        return seeds

    for path in sorted(glob.glob(os.path.join(SEED_PAPERS_DIR, "*.txt"))):
        basename = os.path.splitext(os.path.basename(path))[0]
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                text = f.read()
            # Use first ~3000 chars as abstract equivalent
            abstract = text[:3000].strip()
            if len(abstract) < 100:
                continue
            # Derive a title from filename
            title = basename.replace("_", " ").strip()
            seeds.append({
                "id": f"seed:{basename}",
                "title": title,
                "abstract": abstract,
                "is_seed": True,
            })
        except Exception as e:
            logger.warning(f"Skipping seed paper {basename}: {e}")
    logger.info(f"Loaded {len(seeds)} seed papers from {SEED_PAPERS_DIR}")
    return seeds


def compute_embeddings() -> dict:
    """
    Compute 2D UMAP embeddings from paper abstracts using TF-IDF.
    Includes user seed papers projected into the same space.

    Stores x, y coordinates in the papers table.
    Seed papers are stored in a separate seed_papers table.
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

        # Create seed_papers table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS seed_papers (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                umap_x REAL,
                umap_y REAL
            )
        """)
        # Clear old seed embeddings
        conn.execute("DELETE FROM seed_papers")

        # Fetch scraped papers with abstracts
        rows = conn.execute("""
            SELECT p.id, p.abstract, GROUP_CONCAT(DISTINCT pt.topic_name) as topics
            FROM papers p
            LEFT JOIN paper_topics pt ON p.id = pt.paper_id
            WHERE p.abstract IS NOT NULL AND p.abstract != ''
            GROUP BY p.id
        """).fetchall()

        # Load seed papers
        seeds = _load_seed_papers()

        total_docs = len(rows) + len(seeds)
        if total_docs < 10:
            logger.warning(f"Only {total_docs} documents — need at least 10 for embedding")
            return {"status": "skipped", "reason": "too few documents"}

        # Build combined corpus: scraped papers + seed papers
        paper_ids = [r["id"] for r in rows]
        abstracts = [r["abstract"] for r in rows]

        seed_ids = [s["id"] for s in seeds]
        seed_titles = [s["title"] for s in seeds]
        seed_abstracts = [s["abstract"] for s in seeds]

        all_texts = abstracts + seed_abstracts
        n_scraped = len(abstracts)
        n_seed = len(seed_abstracts)

        logger.info(f"Computing TF-IDF for {n_scraped} scraped + {n_seed} seed papers...")

        # TF-IDF vectorization on combined corpus
        tfidf = TfidfVectorizer(
            max_features=5000,
            stop_words="english",
            min_df=2,
            max_df=0.95,
            ngram_range=(1, 2),
        )
        tfidf_matrix = tfidf.fit_transform(all_texts)

        logger.info(f"TF-IDF matrix: {tfidf_matrix.shape}, running UMAP...")

        # UMAP reduction to 2D
        n_neighbors = min(15, len(all_texts) - 1)
        reducer = UMAP(
            n_components=2,
            n_neighbors=n_neighbors,
            min_dist=0.1,
            metric="cosine",
            random_state=42,
        )
        coords = reducer.fit_transform(tfidf_matrix.toarray())

        # Normalize to 5-95 range (leave margin for seed markers)
        x_min, x_max = coords[:, 0].min(), coords[:, 0].max()
        y_min, y_max = coords[:, 1].min(), coords[:, 1].max()
        x_range = max(x_max - x_min, 0.001)
        y_range = max(y_max - y_min, 0.001)

        def normalize(val, vmin, vrange):
            return float(5 + (val - vmin) / vrange * 90)

        # Store scraped paper coords
        for i, pid in enumerate(paper_ids):
            nx = normalize(coords[i, 0], x_min, x_range)
            ny = normalize(coords[i, 1], y_min, y_range)
            conn.execute(
                "UPDATE papers SET umap_x = ?, umap_y = ? WHERE id = ?",
                (round(nx, 2), round(ny, 2), pid),
            )

        # Store seed paper coords
        for j, sid in enumerate(seed_ids):
            idx = n_scraped + j
            nx = normalize(coords[idx, 0], x_min, x_range)
            ny = normalize(coords[idx, 1], y_min, y_range)
            conn.execute(
                "INSERT OR REPLACE INTO seed_papers (id, title, umap_x, umap_y) VALUES (?, ?, ?, ?)",
                (sid, seed_titles[j], round(nx, 2), round(ny, 2)),
            )

        logger.info(f"Stored embeddings for {len(paper_ids)} scraped + {len(seed_ids)} seed papers")

    return {
        "status": "done",
        "papers_embedded": len(paper_ids),
        "seed_papers_embedded": len(seed_ids),
        "tfidf_features": tfidf_matrix.shape[1],
    }
