from __future__ import annotations

from dataclasses import replace

from conftest import FakeChat, FakePubMed, FakeSignals, FakeTranslation

from aionex import create_app


def test_index_and_health_are_lightweight(client):
    page = client.get("/")
    assert page.status_code == 200
    assert b"AIONEX" in page.data
    assert b'href="/static/favicon.svg"' in page.data

    favicon = client.get("/static/favicon.svg")
    assert favicon.status_code == 200
    assert favicon.mimetype == "image/svg+xml"

    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json["status"] == "ok"
    assert health.json["version"] == "1.0.0"


def test_security_headers_are_present(client):
    response = client.get("/")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert "default-src 'self'" in response.headers["Content-Security-Policy"]
    assert response.headers["Cross-Origin-Opener-Policy"] == "same-origin"


def test_search_contract(client):
    response = client.post("/api/search", json={"query": "microgravity cells"})
    assert response.status_code == 200
    assert response.json[0]["pmid"] == "12345678"
    assert response.json[0]["date_precision"] == "day"
    assert response.headers["Cache-Control"] == "no-store"


def test_search_rejects_non_json_and_oversized_query(client):
    wrong_type = client.post("/api/search", data="query=space")
    assert wrong_type.status_code == 400
    assert wrong_type.json["code"] == "invalid_request"

    oversized = client.post("/api/search", json={"query": "x" * 201})
    assert oversized.status_code == 400


def test_unknown_api_route_is_json(client):
    response = client.get("/api/does-not-exist")
    assert response.status_code == 404
    assert response.json["code"] == "route_not_found"


def test_analyze_uses_canonical_pubmed_url_and_extractive_method(client):
    bad = client.post("/api/analyze", json={"url": "https://example.com/12345678"})
    assert bad.status_code == 400

    response = client.post(
        "/api/analyze",
        json={"url": "https://pubmed.ncbi.nlm.nih.gov/12345678/"},
    )
    assert response.status_code == 200
    assert response.json["pmid"] == "12345678"
    assert response.json["method"] == "extractive-frequency-v1"
    assert "reading aid" in response.json["analysis_note"]


def test_ask_returns_evidence_sentence(client):
    response = client.post(
        "/api/ask",
        json={
            "question": "What changes in spaceflight?",
            "context": "Spaceflight changes cell behavior. The control stayed stable.",
        },
    )
    assert response.status_code == 200
    assert response.json["found"] is True
    assert "cell behavior" in response.json["answer"]


def test_signals_and_legacy_alias(client):
    response = client.get("/api/signals/12345678")
    assert response.status_code == 200
    assert len(response.json["components"]) == 5
    legacy = client.get("/api/reputation/12345678")
    assert legacy.status_code == 200
    assert legacy.headers["Deprecation"] == "true"


def test_translation_and_chat_contracts(client):
    translated = client.post("/api/translate", json={"texts": ["hello"], "lang": "fr"})
    assert translated.status_code == 200
    assert translated.json["translations"] == ["fr:hello"]
    assert "Google-backed" in translated.json["provider_notice"]

    chat = client.post(
        "/api/chat",
        json={"message": "Explain microgravity", "conversation_id": "session_1234"},
    )
    assert chat.status_code == 200
    assert chat.json["reply"].startswith("Reply")
    assert "store=false" in chat.json["privacy_notice"]


def test_cross_origin_requests_are_denied(client):
    response = client.post(
        "/api/search",
        json={"query": "space"},
        headers={"Origin": "https://attacker.example"},
    )
    assert response.status_code == 403
    assert response.json["code"] == "origin_denied"


def test_rate_limit_is_per_endpoint(settings):
    limited = replace(settings, rate_limit_per_minute=2)
    app = create_app(
        limited,
        service_overrides={
            "pubmed": FakePubMed(),
            "signals": FakeSignals(),
            "translation": FakeTranslation(),
            "chat": FakeChat(),
        },
    )
    app.config.update(TESTING=True)
    client = app.test_client()
    assert client.post("/api/search", json={"query": "one"}).status_code == 200
    assert client.post("/api/search", json={"query": "two"}).status_code == 200
    response = client.post("/api/search", json={"query": "three"})
    assert response.status_code == 429
    assert int(response.headers["Retry-After"]) >= 1
