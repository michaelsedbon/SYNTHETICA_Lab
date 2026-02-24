"""
OpenAlex scraper.

Uses the OpenAlex REST API (free, no key required, 100K requests/day).
Docs: https://docs.openalex.org/
"""

from __future__ import annotations

import asyncio
import logging
from urllib.parse import quote

import httpx

from .base import BaseScraper, PaperResult

logger = logging.getLogger(__name__)

OPENALEX_BASE = "https://api.openalex.org"
# Polite pool: add your email to get into the fast lane
MAILTO = "contact@yourlab.com"  # TODO: set your email


class OpenAlexScraper(BaseScraper):
    name = "openalex"

    def __init__(self):
        self.headers = {"User-Agent": f"ResearchScout/1.0 (mailto:{MAILTO})"}

    async def search(self, query: str, max_results: int = 100) -> list[PaperResult]:
        """Search OpenAlex for works matching the query."""
        results: list[PaperResult] = []
        per_page = min(max_results, 50)  # OpenAlex max per_page = 200, keep it reasonable
        pages_needed = (max_results + per_page - 1) // per_page

        async with httpx.AsyncClient(timeout=30, headers=self.headers) as client:
            for page in range(1, pages_needed + 1):
                url = (
                    f"{OPENALEX_BASE}/works"
                    f"?search={quote(query)}"
                    f"&per_page={per_page}"
                    f"&page={page}"
                    f"&mailto={MAILTO}"
                    f"&select=id,title,abstract_inverted_index,doi,publication_date,"
                    f"cited_by_count,authorships,primary_location,concepts,type"
                )

                try:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    data = resp.json()
                except Exception as e:
                    logger.error(f"OpenAlex request failed (page {page}): {e}")
                    break

                works = data.get("results", [])
                if not works:
                    break

                for work in works:
                    paper = self._parse_work(work)
                    if paper:
                        results.append(paper)

                if len(results) >= max_results:
                    break

                # Be polite — small delay between pages
                await asyncio.sleep(0.2)

        return results[:max_results]

    def _parse_work(self, work: dict) -> PaperResult | None:
        """Parse an OpenAlex work into a PaperResult."""
        oa_id = work.get("id", "")
        title = work.get("title")
        if not title:
            return None

        # Reconstruct abstract from inverted index
        abstract = self._reconstruct_abstract(work.get("abstract_inverted_index"))

        # Extract authors
        authors = []
        for authorship in work.get("authorships", []):
            author_info = authorship.get("author", {})
            institutions = authorship.get("institutions", [])
            affiliation = institutions[0].get("display_name") if institutions else None
            country = institutions[0].get("country_code") if institutions else None

            authors.append({
                "id": author_info.get("id", ""),
                "name": author_info.get("display_name", "Unknown"),
                "affiliation": affiliation,
                "country": country,
                "orcid": author_info.get("orcid"),
                "source": "openalex",
                "raw_data": author_info,
            })

        # Extract concepts/topics
        concepts = [
            c.get("display_name", "")
            for c in work.get("concepts", [])
            if c.get("score", 0) > 0.3
        ]

        # Venue
        venue = None
        primary = work.get("primary_location") or {}
        source = primary.get("source") or {}
        venue = source.get("display_name")

        # DOI
        doi = work.get("doi")
        if doi and doi.startswith("https://doi.org/"):
            doi = doi[len("https://doi.org/"):]

        # Publication date
        pub_date = work.get("publication_date")
        year = int(pub_date[:4]) if pub_date and len(pub_date) >= 4 else None

        return PaperResult(
            id=oa_id,
            title=title,
            abstract=abstract,
            doi=doi,
            url=oa_id,  # OpenAlex URL
            source="openalex",
            published=pub_date,
            year=year,
            citation_count=work.get("cited_by_count", 0),
            venue=venue,
            concepts=concepts,
            authors=authors,
            raw_data=work,
        )

    @staticmethod
    def _reconstruct_abstract(inverted_index: dict | None) -> str | None:
        """Reconstruct abstract text from OpenAlex inverted index format."""
        if not inverted_index:
            return None
        word_positions: list[tuple[int, str]] = []
        for word, positions in inverted_index.items():
            for pos in positions:
                word_positions.append((pos, word))
        word_positions.sort()
        return " ".join(w for _, w in word_positions)
