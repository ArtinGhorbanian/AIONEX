from __future__ import annotations

from dataclasses import replace

import pytest

from aionex import create_app
from aionex.config import Settings


class FakePubMed:
    def search(self, query: str, limit: int):
        return [
            {
                "pmid": "12345678",
                "title": f"Result for {query}",
                "link": "https://pubmed.ncbi.nlm.nih.gov/12345678/",
                "date": "2025-10-04",
                "date_precision": "day",
                "authors": ["A. Researcher"],
                "journal": "Space Biology",
            }
        ][:limit]

    def article(self, pmid: str):
        return {
            "pmid": pmid,
            "title": "Spaceflight biology study",
            "abstract": (
                "Spaceflight changes cell behavior. Researchers measured the response in orbit. "
                "The results identify a reversible adaptation in the sampled cells."
            ),
            "abstract_available": True,
            "journal": "Space Biology",
            "link": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
        }


class FakeOpenAlex:
    api_key = ""


class FakeSignals:
    openalex = FakeOpenAlex()

    def get(self, pmid: str):
        return {
            "components": {
                "Citations": 12,
                "PMC Availability": 100,
                "Recency": 95,
                "Source Activity": 50,
                "Author Activity": 42,
            },
            "details": {},
            "methodology": "Discovery proxies, not quality scores.",
            "limitations": [],
            "generated_at": "2025-10-04T00:00:00+00:00",
        }


class FakeTranslation:
    enabled = True

    def translate(self, texts: list[str], language: str):
        return [f"{language}:{text}" for text in texts]


class FakeChat:
    available = True

    def reply(self, conversation_id: str, message: str):
        return f"Reply to {message}"


@pytest.fixture
def settings() -> Settings:
    return replace(
        Settings(),
        cache_ttl_seconds=0,
        rate_limit_per_minute=60,
    )


@pytest.fixture
def app(settings: Settings):
    app = create_app(
        settings,
        service_overrides={
            "pubmed": FakePubMed(),
            "signals": FakeSignals(),
            "translation": FakeTranslation(),
            "chat": FakeChat(),
        },
    )
    app.config.update(TESTING=True)
    return app


@pytest.fixture
def client(app):
    return app.test_client()
