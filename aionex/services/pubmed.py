"""NCBI PubMed E-utilities integration.

Only documented E-utilities endpoints are used. XML is parsed with the standard
library so a clean install does not depend on a separately installed XML parser.
"""

from __future__ import annotations

import re
from calendar import month_abbr
from datetime import datetime, timezone
from typing import Any
from xml.etree import ElementTree

from aionex.cache import TTLCache
from aionex.http import HttpClient, UpstreamError

NCBI_EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
PMID_PATTERN = re.compile(r"^[1-9]\d{0,8}$")
PUBMED_URL_PATTERN = re.compile(
    r"^https://pubmed\.ncbi\.nlm\.nih\.gov/(?P<pmid>[1-9]\d{0,8})/?(?:[?#].*)?$",
    re.IGNORECASE,
)


def validate_pmid(value: str) -> str:
    pmid = str(value).strip()
    if not PMID_PATTERN.fullmatch(pmid):
        raise ValueError("Invalid PubMed identifier.")
    return pmid


def pmid_from_url(url: str) -> str | None:
    match = PUBMED_URL_PATTERN.fullmatch(url.strip())
    return match.group("pmid") if match else None


def _element_text(element: ElementTree.Element | None) -> str:
    if element is None:
        return ""
    return " ".join("".join(element.itertext()).split())


def normalize_pub_date(value: str) -> tuple[str, str]:
    """Return an ISO-like date and its precision without inventing a 1900 date."""

    clean = " ".join((value or "").replace("-", " ").split())
    year_match = re.search(r"\b(18|19|20|21)\d{2}\b", clean)
    if not year_match:
        return "", "unknown"
    year = int(year_match.group(0))
    month = 0
    month_lookup = {name.lower(): index for index, name in enumerate(month_abbr) if name}
    for token in re.findall(r"[A-Za-z]+", clean):
        candidate = month_lookup.get(token[:3].lower())
        if candidate:
            month = candidate
            break
    day = 0
    remainder = clean[year_match.end() :]
    for token in re.findall(r"\b\d{1,2}\b", remainder):
        candidate = int(token)
        if 1 <= candidate <= 31:
            day = candidate
            break
    if month and day:
        try:
            return datetime(year, month, day).strftime("%Y-%m-%d"), "day"
        except ValueError:
            day = 0
    if month:
        return f"{year:04d}-{month:02d}", "month"
    return f"{year:04d}", "year"


class PubMedService:
    def __init__(
        self,
        http: HttpClient,
        *,
        email: str = "",
        api_key: str = "",
        cache_ttl: int = 300,
    ) -> None:
        self.http = http
        self._tool_params = {"tool": "aionex-literature-explorer"}
        if email:
            self._tool_params["email"] = email
        if api_key:
            self._tool_params["api_key"] = api_key
        self._search_cache: TTLCache[list[dict[str, Any]]] = TTLCache(cache_ttl, max_items=128)
        self._article_cache: TTLCache[dict[str, Any]] = TTLCache(cache_ttl, max_items=256)
        self._metadata_cache: TTLCache[dict[str, Any]] = TTLCache(cache_ttl, max_items=256)

    def search(self, query: str, limit: int = 20) -> list[dict[str, Any]]:
        key = f"{limit}:{query.casefold()}"
        cached = self._search_cache.get(key)
        if cached is not None:
            return cached
        search = self.http.get_json(
            "PubMed",
            f"{NCBI_EUTILS}/esearch.fcgi",
            params={
                "db": "pubmed",
                "term": query,
                "retmax": str(limit),
                "retmode": "json",
                "sort": "relevance",
                **self._tool_params,
            },
        )
        raw_ids = search.get("esearchresult", {}).get("idlist", [])
        if not isinstance(raw_ids, list):
            raise UpstreamError("PubMed", "unexpected search response")
        pmids = [str(item) for item in raw_ids if PMID_PATTERN.fullmatch(str(item))]
        if not pmids:
            self._search_cache.set(key, [])
            return []
        summary = self.http.get_json(
            "PubMed",
            f"{NCBI_EUTILS}/esummary.fcgi",
            params={
                "db": "pubmed",
                "id": ",".join(pmids),
                "retmode": "json",
                **self._tool_params,
            },
        ).get("result", {})
        if not isinstance(summary, dict):
            raise UpstreamError("PubMed", "unexpected summary response")
        articles: list[dict[str, Any]] = []
        for pmid in pmids:
            item = summary.get(pmid)
            if not isinstance(item, dict):
                continue
            date, precision = normalize_pub_date(str(item.get("pubdate", "")))
            authors = [
                str(author.get("name", "")).strip()
                for author in item.get("authors", [])
                if isinstance(author, dict) and str(author.get("name", "")).strip()
            ]
            articles.append(
                {
                    "pmid": pmid,
                    "title": str(item.get("title") or "Untitled PubMed record"),
                    "link": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                    "date": date,
                    "date_precision": precision,
                    "authors": authors[:8],
                    "journal": str(item.get("fulljournalname") or item.get("source") or ""),
                }
            )
        self._search_cache.set(key, articles)
        return articles

    def article(self, pmid: str) -> dict[str, Any]:
        pmid = validate_pmid(pmid)
        cached = self._article_cache.get(pmid)
        if cached is not None:
            return cached
        raw_xml = self.http.get_bytes(
            "PubMed",
            f"{NCBI_EUTILS}/efetch.fcgi",
            params={
                "db": "pubmed",
                "id": pmid,
                "retmode": "xml",
                **self._tool_params,
            },
        )
        try:
            root = ElementTree.fromstring(raw_xml)
        except ElementTree.ParseError as exc:
            raise UpstreamError("PubMed", "invalid article XML") from exc
        article = root.find(".//PubmedArticle")
        if article is None:
            raise LookupError("Article was not found in PubMed.")
        title = _element_text(article.find(".//ArticleTitle")) or "Untitled PubMed record"
        abstract_parts: list[str] = []
        for node in article.findall(".//Abstract/AbstractText"):
            text = _element_text(node)
            if not text:
                continue
            label = (node.get("Label") or node.get("NlmCategory") or "").strip()
            abstract_parts.append(f"{label}: {text}" if label else text)
        abstract = "\n\n".join(abstract_parts)
        journal = _element_text(article.find(".//Journal/Title"))
        result = {
            "pmid": pmid,
            "title": title,
            "abstract": abstract,
            "abstract_available": bool(abstract),
            "journal": journal,
            "link": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
        }
        self._article_cache.set(pmid, result)
        return result

    def signal_metadata(self, pmid: str) -> dict[str, Any]:
        pmid = validate_pmid(pmid)
        cached = self._metadata_cache.get(pmid)
        if cached is not None:
            return cached
        result = self.http.get_json(
            "PubMed",
            f"{NCBI_EUTILS}/esummary.fcgi",
            params={
                "db": "pubmed",
                "id": pmid,
                "retmode": "json",
                **self._tool_params,
            },
        ).get("result", {})
        if not isinstance(result, dict) or not isinstance(result.get(pmid), dict):
            raise UpstreamError("PubMed", "article metadata unavailable")
        item = result[pmid]
        date, precision = normalize_pub_date(str(item.get("pubdate", "")))
        year = int(date[:4]) if date else None
        pmcid = any(
            isinstance(article_id, dict) and str(article_id.get("idtype", "")).casefold() == "pmcid"
            for article_id in item.get("articleids", [])
        )
        citations = 0
        citations_available = True
        try:
            links = self.http.get_json(
                "PubMed",
                f"{NCBI_EUTILS}/elink.fcgi",
                params={
                    "dbfrom": "pubmed",
                    "linkname": "pubmed_pubmed_citedin",
                    "id": pmid,
                    "retmode": "json",
                    **self._tool_params,
                },
            ).get("linksets", [])
            if isinstance(links, list) and links:
                databases = links[0].get("linksetdbs", []) if isinstance(links[0], dict) else []
                if databases and isinstance(databases[0], dict):
                    citations = len(databases[0].get("links", []))
        except UpstreamError:
            citations_available = False
        metadata = {
            "pmid": pmid,
            "publication_year": year,
            "date_precision": precision,
            "pmcid_present": pmcid,
            "citations": citations,
            "citations_available": citations_available,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
        }
        self._metadata_cache.set(pmid, metadata)
        return metadata
