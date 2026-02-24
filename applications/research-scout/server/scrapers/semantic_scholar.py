"""
Semantic Scholar scraper.

Uses the Semantic Scholar Academic Graph API (free, 100 requests per 5 min without key).
Docs: https://api.semanticscholar.org/
"""

from __future__ import annotations

import asyncio
import logging
from urllib.parse import quote

import httpx

from .base import BaseScraper, PaperResult

logger = logging.getLogger(__name__)

S2_BASE = "https://api.semanticscholar.org/graph/v1"
# Rate limit: 100 requests per 5 minutes for free tier
# = roughly 1 request per 3 seconds to be safe
RATE_LIMIT_DELAY = 3.0


class SemanticScholarScraper(BaseScraper):
    name = "semantic_scholar"

    def __init__(self, api_key: str | None = None):
        self.headers = {}
        if api_key:
            self.headers["x-api-key"] = api_key

    async def search(self, query: str, max_results: int = 100) -> list[PaperResult]:
        """Search Semantic Scholar for papers matching the query."""
        results: list[PaperResult] = []
        limit = min(max_results, 100)  # S2 max is 100 per request
        offset = 0
        max_retries = 3
        retry_count = 0

        fields = "paperId,title,abstract,doi,url,year,citationCount,venue,authors,fieldsOfStudy,publicationDate,externalIds"

        async with httpx.AsyncClient(timeout=30, headers=self.headers) as client:
            while len(results) < max_results:
                url = (
                    f"{S2_BASE}/paper/search"
                    f"?query={quote(query)}"
                    f"&limit={limit}"
                    f"&offset={offset}"
                    f"&fields={fields}"
                )

                try:
                    resp = await client.get(url)

                    # Handle rate limiting with max retries
                    if resp.status_code == 429:
                        retry_count += 1
                        if retry_count > max_retries:
                            logger.warning(f"S2 rate limited {max_retries} times, skipping query: {query}")
                            break
                        wait_time = min(30 * retry_count, 90)
                        logger.warning(f"S2 rate limited, retry {retry_count}/{max_retries}, waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue

                    resp.raise_for_status()
                    data = resp.json()
                    retry_count = 0  # reset on success
                except Exception as e:
                    logger.error(f"Semantic Scholar request failed: {e}")
                    break

                papers = data.get("data", [])
                if not papers:
                    break

                for paper in papers:
                    parsed = self._parse_paper(paper)
                    if parsed:
                        results.append(parsed)

                offset += limit
                total = data.get("total", 0)
                if offset >= total:
                    break

                # Respect rate limits
                await asyncio.sleep(RATE_LIMIT_DELAY)

        return results[:max_results]

    def _parse_paper(self, paper: dict) -> PaperResult | None:
        """Parse a Semantic Scholar paper into a PaperResult."""
        s2_id = paper.get("paperId", "")
        title = paper.get("title")
        if not title:
            return None

        # Extract authors
        authors = []
        for author in paper.get("authors", []):
            authors.append({
                "id": f"s2:{author.get('authorId', '')}",
                "name": author.get("name", "Unknown"),
                "affiliation": None,
                "country": None,
                "source": "semantic_scholar",
                "raw_data": author,
            })

        # Fields of study → concepts
        concepts = paper.get("fieldsOfStudy") or []

        return PaperResult(
            id=f"s2:{s2_id}",
            title=title,
            abstract=paper.get("abstract"),
            doi=paper.get("doi"),
            url=paper.get("url") or f"https://www.semanticscholar.org/paper/{s2_id}",
            source="semantic_scholar",
            published=paper.get("publicationDate"),
            year=paper.get("year"),
            citation_count=paper.get("citationCount", 0),
            venue=paper.get("venue"),
            concepts=concepts,
            authors=authors,
            raw_data=paper,
        )
