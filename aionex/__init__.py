"""AIONEX application factory."""

from __future__ import annotations

import logging
from collections.abc import Mapping
from typing import Any

from flask import Flask, jsonify, request

from aionex.api import api, web
from aionex.cache import SlidingWindowRateLimiter
from aionex.config import Settings
from aionex.http import HttpClient
from aionex.services.analysis import AnalysisService
from aionex.services.chat import ChatService
from aionex.services.pubmed import PubMedService
from aionex.services.signals import OpenAlexService, SignalsService
from aionex.services.translation import TranslationService

__version__ = "1.0.0"


def _build_services(settings: Settings) -> dict[str, Any]:
    contact = settings.pubmed_email or "operator-not-configured"
    http = HttpClient(
        timeout=settings.timeout,
        user_agent=f"AIONEX/{__version__} (literature explorer; contact: {contact})",
    )
    pubmed = PubMedService(
        http,
        email=settings.pubmed_email,
        api_key=settings.ncbi_api_key,
        cache_ttl=settings.cache_ttl_seconds,
    )
    openalex = OpenAlexService(
        http, settings.openalex_api_key, cache_ttl=settings.cache_ttl_seconds
    )
    return {
        "http": http,
        "pubmed": pubmed,
        "analysis": AnalysisService(),
        "signals": SignalsService(pubmed, openalex, cache_ttl=settings.cache_ttl_seconds),
        "translation": TranslationService(settings.translation_enabled),
        "chat": ChatService(
            http,
            enabled=settings.chat_enabled,
            api_key=settings.openai_api_key,
            model=settings.openai_model,
        ),
    }


def create_app(
    settings: Settings | None = None,
    *,
    service_overrides: Mapping[str, Any] | None = None,
) -> Flask:
    """Create a lightweight app; no model download or external call occurs here."""

    settings = settings or Settings.from_env()
    app = Flask(__name__, template_folder="../templates", static_folder="../static")
    app.config.update(
        AIONEX_VERSION=__version__,
        AIONEX_SEARCH_LIMIT=settings.search_limit,
        MAX_CONTENT_LENGTH=settings.max_content_length,
        JSON_SORT_KEYS=False,
        TRUSTED_HOSTS=list(settings.trusted_hosts),
    )
    services = _build_services(settings)
    if service_overrides:
        services.update(service_overrides)
    app.extensions["aionex_services"] = services
    limiter = SlidingWindowRateLimiter(settings.rate_limit_per_minute)

    @app.before_request
    def enforce_api_boundary():
        if not request.path.startswith("/api/"):
            return None
        origin = request.headers.get("Origin", "").rstrip("/")
        same_origin = request.host_url.rstrip("/")
        if origin and origin != same_origin and origin not in settings.cors_origins:
            return jsonify(
                {"error": "Cross-origin request is not allowed.", "code": "origin_denied"}
            ), 403
        if request.endpoint == "api.health":
            return None
        client = request.remote_addr or "unknown"
        allowed, retry_after = limiter.allow(f"{client}:{request.endpoint}")
        if not allowed:
            response = jsonify(
                {"error": "Too many requests. Try again shortly.", "code": "rate_limited"}
            )
            response.status_code = 429
            response.headers["Retry-After"] = str(retry_after)
            return response
        return None

    @app.after_request
    def secure_response(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")
        response.headers.setdefault(
            "Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=()"
        )
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; "
            "form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; "
            "media-src 'none'; object-src 'none'; script-src 'self'; style-src 'self'",
        )
        if request.path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "no-store")
        if request.is_secure:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        origin = request.headers.get("Origin", "").rstrip("/")
        if origin and origin in settings.cors_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response.headers["Vary"] = "Origin"
        return response

    @app.errorhandler(404)
    def not_found(error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "API route not found.", "code": "route_not_found"}), 404
        return error

    @app.errorhandler(413)
    def request_too_large(error):
        if request.path.startswith("/api/"):
            return (
                jsonify(
                    {
                        "error": "Request body exceeds the configured size limit.",
                        "code": "request_too_large",
                    }
                ),
                413,
            )
        return error

    @app.errorhandler(500)
    def internal_error(error):
        if request.path.startswith("/api/"):
            app.logger.error("Unhandled API error: %s", type(error).__name__)
            return jsonify({"error": "Internal server error.", "code": "internal_error"}), 500
        return error

    app.register_blueprint(web)
    app.register_blueprint(api)
    app.logger.setLevel(logging.INFO)
    return app
