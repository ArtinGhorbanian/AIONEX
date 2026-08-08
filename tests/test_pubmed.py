from __future__ import annotations

from aionex.services.pubmed import (
    PubMedService,
    normalize_pub_date,
    pmid_from_url,
    validate_pmid,
)


class FakeHttp:
    def get_json(self, _service, url, *, params=None):
        if url.endswith("esearch.fcgi"):
            return {"esearchresult": {"idlist": ["12345678"]}}
        if url.endswith("esummary.fcgi"):
            return {
                "result": {
                    "12345678": {
                        "title": "A result",
                        "pubdate": "2025 Oct 04",
                        "authors": [{"name": "A. Researcher"}],
                        "fulljournalname": "Space Biology",
                        "articleids": [{"idtype": "pmcid", "value": "PMC1"}],
                    }
                }
            }
        if url.endswith("elink.fcgi"):
            return {"linksets": [{"linksetdbs": [{"links": ["1", "2"]}]}]}
        raise AssertionError(url)

    def get_bytes(self, _service, url, *, params=None):
        assert url.endswith("efetch.fcgi")
        return b"""<?xml version="1.0"?><PubmedArticleSet><PubmedArticle>
        <MedlineCitation><Article><Journal><Title>Space Biology</Title></Journal>
        <ArticleTitle>Cells in <i>microgravity</i></ArticleTitle><Abstract>
        <AbstractText Label="METHODS">We measured cells.</AbstractText>
        <AbstractText>They adapted.</AbstractText></Abstract></Article></MedlineCitation>
        </PubmedArticle></PubmedArticleSet>"""


def test_pubmed_url_validation_is_strict():
    assert pmid_from_url("https://pubmed.ncbi.nlm.nih.gov/12345678/") == "12345678"
    assert pmid_from_url("http://pubmed.ncbi.nlm.nih.gov/12345678/") is None
    assert pmid_from_url("https://example.com/12345678") is None
    assert validate_pmid("12345678") == "12345678"


def test_date_parser_preserves_precision():
    assert normalize_pub_date("2025 Oct 04") == ("2025-10-04", "day")
    assert normalize_pub_date("2025 Oct") == ("2025-10", "month")
    assert normalize_pub_date("2025") == ("2025", "year")
    assert normalize_pub_date("unknown") == ("", "unknown")


def test_search_article_and_signal_metadata_parsing():
    service = PubMedService(FakeHttp(), cache_ttl=0)
    result = service.search("microgravity")
    assert result[0]["date"] == "2025-10-04"
    article = service.article("12345678")
    assert article["title"] == "Cells in microgravity"
    assert article["abstract"].startswith("METHODS: We measured cells.")
    metadata = service.signal_metadata("12345678")
    assert metadata["citations"] == 2
    assert metadata["pmcid_present"] is True
