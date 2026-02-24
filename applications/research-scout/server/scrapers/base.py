"""
Base scraper interface.

All scrapers inherit from BaseScraper and implement the `search()` method.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class PaperResult:
    """Normalized paper result from any scraper source."""
    id: str
    title: str
    abstract: str | None = None
    doi: str | None = None
    url: str | None = None
    source: str = ""           # "openalex" | "semantic_scholar"
    published: str | None = None
    year: int | None = None
    citation_count: int = 0
    venue: str | None = None
    concepts: list[str] = field(default_factory=list)
    authors: list[dict] = field(default_factory=list)  # [{id, name, affiliation, country, ...}]
    raw_data: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "abstract": self.abstract,
            "doi": self.doi,
            "url": self.url,
            "source": self.source,
            "published": self.published,
            "year": self.year,
            "citation_count": self.citation_count,
            "venue": self.venue,
            "concepts": self.concepts,
            "authors": self.authors,
            "raw_data": self.raw_data,
        }


class BaseScraper(ABC):
    """Abstract base class for all research scrapers."""

    name: str = "base"

    @abstractmethod
    async def search(self, query: str, max_results: int = 100) -> list[PaperResult]:
        """Search for papers matching the query. Returns normalized results."""
        ...
