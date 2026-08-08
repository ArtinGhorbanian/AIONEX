"""Environment-backed configuration for AIONEX.

Configuration is intentionally small and explicit. Optional network features are
off by default, and the development server binds to loopback unless an operator
chooses otherwise.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _as_int(value: str | None, default: int, *, minimum: int, maximum: int) -> int:
    if value is None:
        return default
    try:
        parsed = int(value)
    except ValueError:
        return default
    return max(minimum, min(maximum, parsed))


def _as_float(value: str | None, default: float, *, minimum: float, maximum: float) -> float:
    if value is None:
        return default
    try:
        parsed = float(value)
    except ValueError:
        return default
    return max(minimum, min(maximum, parsed))


def _csv(value: str | None) -> tuple[str, ...]:
    if not value:
        return ()
    return tuple(item.strip().rstrip("/") for item in value.split(",") if item.strip())


@dataclass(frozen=True, slots=True)
class Settings:
    """Runtime settings with secure, low-cost defaults."""

    host: str = "127.0.0.1"
    port: int = 5000
    max_content_length: int = 65_536
    request_connect_timeout: float = 3.05
    request_read_timeout: float = 15.0
    search_limit: int = 20
    cache_ttl_seconds: int = 300
    rate_limit_per_minute: int = 60
    pubmed_email: str = ""
    ncbi_api_key: str = ""
    openalex_api_key: str = ""
    openai_api_key: str = ""
    openai_model: str = "gpt-5.6"
    chat_enabled: bool = False
    translation_enabled: bool = False
    cors_origins: tuple[str, ...] = ()
    trusted_hosts: tuple[str, ...] = ("127.0.0.1", "localhost", "[::1]")

    @classmethod
    def from_env(cls) -> Settings:
        """Load `.env` without overriding values supplied by the host."""

        load_dotenv(override=False)
        return cls(
            host=os.getenv("AIONEX_HOST", "127.0.0.1").strip() or "127.0.0.1",
            port=_as_int(os.getenv("AIONEX_PORT"), 5000, minimum=1, maximum=65_535),
            max_content_length=_as_int(
                os.getenv("AIONEX_MAX_CONTENT_LENGTH"),
                65_536,
                minimum=8_192,
                maximum=1_048_576,
            ),
            request_connect_timeout=_as_float(
                os.getenv("AIONEX_CONNECT_TIMEOUT"),
                3.05,
                minimum=0.5,
                maximum=30.0,
            ),
            request_read_timeout=_as_float(
                os.getenv("AIONEX_READ_TIMEOUT"),
                15.0,
                minimum=1.0,
                maximum=60.0,
            ),
            search_limit=_as_int(os.getenv("AIONEX_SEARCH_LIMIT"), 20, minimum=1, maximum=50),
            cache_ttl_seconds=_as_int(os.getenv("AIONEX_CACHE_TTL"), 300, minimum=0, maximum=3_600),
            rate_limit_per_minute=_as_int(
                os.getenv("AIONEX_RATE_LIMIT"), 60, minimum=5, maximum=600
            ),
            pubmed_email=os.getenv("PUBMED_EMAIL", "").strip(),
            ncbi_api_key=os.getenv("NCBI_API_KEY", "").strip(),
            openalex_api_key=os.getenv("OPENALEX_API_KEY", "").strip(),
            openai_api_key=os.getenv("OPENAI_API_KEY", "").strip(),
            openai_model=os.getenv("OPENAI_MODEL", "gpt-5.6").strip() or "gpt-5.6",
            chat_enabled=_as_bool(os.getenv("AIONEX_CHAT_ENABLED")),
            translation_enabled=_as_bool(os.getenv("AIONEX_TRANSLATION_ENABLED")),
            cors_origins=_csv(os.getenv("AIONEX_CORS_ORIGINS")),
            trusted_hosts=_csv(os.getenv("AIONEX_TRUSTED_HOSTS"))
            or ("127.0.0.1", "localhost", "[::1]"),
        )

    @property
    def timeout(self) -> tuple[float, float]:
        return (self.request_connect_timeout, self.request_read_timeout)

    @property
    def chat_available(self) -> bool:
        return self.chat_enabled and bool(self.openai_api_key)

    @property
    def openalex_available(self) -> bool:
        return bool(self.openalex_api_key)
