"""HTTP routes and strict request/response contracts for AIONEX."""

from __future__ import annotations

from typing import Any

from flask import Blueprint, current_app, jsonify, render_template, request

from aionex.http import UpstreamError
from aionex.services.analysis import AnalysisService
from aionex.services.chat import ChatService, ChatUnavailable
from aionex.services.pubmed import PubMedService, pmid_from_url, validate_pmid
from aionex.services.signals import SignalsService
from aionex.services.translation import TranslationService, TranslationUnavailable

web = Blueprint("web", __name__)
api = Blueprint("api", __name__, url_prefix="/api")


def _services() -> dict[str, Any]:
    return current_app.extensions["aionex_services"]


def _error(message: str, status: int, code: str):
    return jsonify({"error": message, "code": code}), status


def _payload() -> dict[str, Any]:
    if not request.is_json:
        raise ValueError("Content-Type must be application/json.")
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object.")
    return payload


def _required_string(payload: dict[str, Any], field: str, *, minimum: int = 1, maximum: int) -> str:
    value = payload.get(field)
    if not isinstance(value, str):
        raise ValueError(f'"{field}" must be a string.')
    value = " ".join(value.split()) if field != "context" else value.strip()
    if len(value) < minimum or len(value) > maximum:
        raise ValueError(f'"{field}" must contain {minimum}–{maximum} characters.')
    return value


@web.get("/")
def index():
    return render_template("index.html")


@api.get("/health")
def health():
    services = _services()
    chat: ChatService = services["chat"]
    translation: TranslationService = services["translation"]
    signals: SignalsService = services["signals"]
    return jsonify(
        {
            "status": "ok",
            "service": "aionex",
            "version": current_app.config["AIONEX_VERSION"],
            "features": {
                "chat": chat.available,
                "translation": translation.enabled,
                "openalex": bool(signals.openalex.api_key),
            },
        }
    )


@api.post("/search")
def search():
    payload = _payload()
    query = _required_string(payload, "query", maximum=200)
    pubmed: PubMedService = _services()["pubmed"]
    return jsonify(pubmed.search(query, current_app.config["AIONEX_SEARCH_LIMIT"]))


@api.post("/analyze")
def analyze():
    payload = _payload()
    url = _required_string(payload, "url", maximum=200)
    pmid = pmid_from_url(url)
    if not pmid:
        raise ValueError("Provide a canonical https://pubmed.ncbi.nlm.nih.gov/<PMID>/ URL.")
    services = _services()
    article = services["pubmed"].article(pmid)
    analysis = services["analysis"].summarize(article["abstract"])
    return jsonify(
        {
            **article,
            **analysis,
            "analysis_note": (
                "The summary is an extractive reading aid assembled from the abstract; "
                "verify all claims in the source article."
            ),
        }
    )


@api.post("/ask")
def ask():
    payload = _payload()
    question = _required_string(payload, "question", minimum=3, maximum=500)
    context = _required_string(payload, "context", maximum=12_000)
    analysis: AnalysisService = _services()["analysis"]
    return jsonify(analysis.answer(question, context))


@api.post("/translate")
def translate():
    payload = _payload()
    raw_texts = payload.get("texts")
    language = payload.get("lang")
    if not isinstance(raw_texts, list) or not 1 <= len(raw_texts) <= 12:
        raise ValueError('"texts" must be a list containing 1–12 strings.')
    if not isinstance(language, str):
        raise ValueError('"lang" must be a supported language code.')
    texts: list[str] = []
    total = 0
    for item in raw_texts:
        if not isinstance(item, str) or not item.strip() or len(item) > 4_000:
            raise ValueError("Each translation item must contain 1–4,000 characters.")
        cleaned = item.strip()
        total += len(cleaned)
        texts.append(cleaned)
    if total > 8_000:
        raise ValueError("Translation requests are limited to 8,000 characters total.")
    service: TranslationService = _services()["translation"]
    return jsonify(
        {
            "translations": service.translate(texts, language),
            "provider_notice": (
                "When needed, text is sent to a Google-backed translation service."
            ),
        }
    )


@api.get("/signals/<pmid>")
def signals(pmid: str):
    validate_pmid(pmid)
    service: SignalsService = _services()["signals"]
    return jsonify(service.get(pmid))


@api.get("/reputation/<pmid>")
def legacy_reputation(pmid: str):
    response = signals(pmid)
    response.headers["Deprecation"] = "true"
    response.headers["Link"] = f'</api/signals/{pmid}>; rel="successor-version"'
    return response


@api.post("/chat")
def chat():
    payload = _payload()
    message = _required_string(payload, "message", maximum=2_000)
    conversation_id = _required_string(payload, "conversation_id", minimum=8, maximum=64)
    service: ChatService = _services()["chat"]
    return jsonify(
        {
            "reply": service.reply(conversation_id, message),
            "sources": [],
            "privacy_notice": "When enabled, this message is sent to OpenAI with store=false.",
        }
    )


@api.errorhandler(ValueError)
def invalid_request(error: ValueError):
    return _error(str(error), 400, "invalid_request")


@api.errorhandler(LookupError)
def not_found(error: LookupError):
    return _error(str(error), 404, "not_found")


@api.errorhandler(TranslationUnavailable)
def translation_unavailable(error: TranslationUnavailable):
    return _error(str(error), 503, "translation_unavailable")


@api.errorhandler(ChatUnavailable)
def chat_unavailable(error: ChatUnavailable):
    return _error(str(error), 503, "chat_unavailable")


@api.errorhandler(UpstreamError)
def upstream_unavailable(error: UpstreamError):
    return _error(f"{error.service} is temporarily unavailable.", 502, "upstream_unavailable")


@api.errorhandler(413)
def request_too_large(_error_value):
    return _error("Request body exceeds the configured size limit.", 413, "request_too_large")


@api.errorhandler(404)
def api_not_found(_error_value):
    return _error("API route not found.", 404, "route_not_found")
