"""Explainable discovery signals built from PubMed and optional OpenAlex data."""

from __future__ import annotations

import math
import re
from datetime import datetime, timezone
from typing import Any

from aionex.cache import TTLCache
from aionex.http import HttpClient, UpstreamError
from aionex.services.pubmed import PubMedService, validate_pmid

OPENALEX_ID = re.compile(r"^https://openalex\.org/([ASW]\d+)$")


def scale_log(value: int, max_value: int) -> int:
    """Preserved AIONEX logarithmic proxy scaling, clamped to 0–100."""

    if value <= 0 or max_value <= 0:
        return 0
    return min(100, int(100 * math.log10(1 + value) / math.log10(1 + max_value)))


class OpenAlexService:
    """Resolve activity by stable OpenAlex IDs, never ambiguous name search."""

    def __init__(self, http: HttpClient, api_key: str, cache_ttl: int = 300) -> None:
        self.http = http
        self.api_key = api_key
        self._cache: TTLCache[dict[str, Any]] = TTLCache(cache_ttl, max_items=256)

    def _entity(self, identifier: str) -> dict[str, Any]:
        match = OPENALEX_ID.fullmatch(identifier)
        if not match:
            raise UpstreamError("OpenAlex", "invalid entity identifier")
        entity_id = match.group(1)
        collection = {"A": "authors", "S": "sources", "W": "works"}[entity_id[0]]
        return self.http.get_json(
            "OpenAlex",
            f"https://api.openalex.org/{collection}/{entity_id}",
            params={"api_key": self.api_key},
        )

    def activity(self, pmid: str) -> dict[str, Any]:
        pmid = validate_pmid(pmid)
        cached = self._cache.get(pmid)
        if cached is not None:
            return cached
        if not self.api_key:
            return {
                "available": False,
                "source_works": 0,
                "author_works": 0,
                "reason": "OPENALEX_API_KEY is not configured.",
            }
        work = self.http.get_json(
            "OpenAlex",
            f"https://api.openalex.org/works/pmid:{pmid}",
            params={"api_key": self.api_key},
        )
        primary_location = work.get("primary_location") or {}
        source = primary_location.get("source") or {}
        authorships = work.get("authorships") or []
        first_author = {}
        if authorships and isinstance(authorships[0], dict):
            first_author = authorships[0].get("author") or {}
        source_works = 0
        author_works = 0
        source_id = source.get("id") if isinstance(source, dict) else None
        author_id = first_author.get("id") if isinstance(first_author, dict) else None
        if isinstance(source_id, str):
            source_works = int(self._entity(source_id).get("works_count") or 0)
        if isinstance(author_id, str):
            author_works = int(self._entity(author_id).get("works_count") or 0)
        result = {
            "available": True,
            "source_works": max(0, source_works),
            "author_works": max(0, author_works),
            "reason": "",
        }
        self._cache.set(pmid, result)
        return result


class SignalsService:
    def __init__(
        self,
        pubmed: PubMedService,
        openalex: OpenAlexService,
        cache_ttl: int = 300,
    ) -> None:
        self.pubmed = pubmed
        self.openalex = openalex
        self._cache: TTLCache[dict[str, Any]] = TTLCache(cache_ttl, max_items=256)

    def get(self, pmid: str) -> dict[str, Any]:
        pmid = validate_pmid(pmid)
        cached = self._cache.get(pmid)
        if cached is not None:
            return cached
        metadata = self.pubmed.signal_metadata(pmid)
        try:
            activity = self.openalex.activity(pmid)
        except UpstreamError:
            activity = {
                "available": False,
                "source_works": 0,
                "author_works": 0,
                "reason": "OpenAlex was unavailable.",
            }
        year = metadata.get("publication_year")
        years_ago = max(0, datetime.now(timezone.utc).year - year) if year else None
        recency = max(10, 100 - years_ago * 5) if years_ago is not None else 0
        citations = int(metadata.get("citations") or 0)
        pmc_score = 100 if metadata.get("pmcid_present") else 30
        source_works = int(activity.get("source_works") or 0)
        author_works = int(activity.get("author_works") or 0)
        components = {
            "Citations": scale_log(citations, 200),
            "PMC Availability": pmc_score,
            "Recency": recency,
            "Source Activity": scale_log(source_works, 50_000),
            "Author Activity": scale_log(author_works, 300),
        }
        result = {
            "components": components,
            "details": {
                "Citations": {
                    "raw_value": citations,
                    "available": bool(metadata.get("citations_available")),
                    "source": "PubMed cited-by links",
                },
                "PMC Availability": {
                    "raw_value": bool(metadata.get("pmcid_present")),
                    "available": True,
                    "source": "PubMed article identifiers",
                },
                "Recency": {
                    "raw_value": year,
                    "available": year is not None,
                    "source": "PubMed publication date",
                },
                "Source Activity": {
                    "raw_value": source_works,
                    "available": bool(activity.get("available")),
                    "source": "OpenAlex source works count",
                },
                "Author Activity": {
                    "raw_value": author_works,
                    "available": bool(activity.get("available")),
                    "source": "OpenAlex first-author works count",
                },
            },
            "methodology": (
                "Five explainable discovery proxies scaled from 0–100. They are not a "
                "quality, truth, reputation, or peer-review score. Missing data scores zero, "
                "except PMC availability retains the original AIONEX baseline of 30."
            ),
            "limitations": [
                "Citation links and activity counts change over time.",
                "First-author and source activity describe volume, not research quality.",
                (
                    "PMC presence is a discoverability proxy and does not guarantee "
                    "unrestricted reuse."
                ),
            ],
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        self._cache.set(pmid, result)
        return result
