"""Resilient outbound HTTP client with conservative retries and timeouts."""

from __future__ import annotations

from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class UpstreamError(RuntimeError):
    """A sanitized error raised when a configured upstream is unavailable."""

    def __init__(self, service: str, message: str = "upstream request failed") -> None:
        super().__init__(message)
        self.service = service


class HttpClient:
    def __init__(
        self,
        *,
        timeout: tuple[float, float],
        user_agent: str,
    ) -> None:
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Accept": "application/json, application/xml;q=0.9, text/xml;q=0.8",
                "User-Agent": user_agent,
            }
        )
        retry = Retry(
            total=2,
            connect=2,
            read=2,
            status=2,
            backoff_factor=0.35,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=frozenset({"GET"}),
            respect_retry_after_header=True,
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retry, pool_connections=8, pool_maxsize=16)
        self.session.mount("https://", adapter)

    def get_json(
        self, service: str, url: str, *, params: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        try:
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            payload = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise UpstreamError(service) from exc
        if not isinstance(payload, dict):
            raise UpstreamError(service, "unexpected response shape")
        return payload

    def get_bytes(self, service: str, url: str, *, params: dict[str, Any] | None = None) -> bytes:
        try:
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            return response.content
        except requests.RequestException as exc:
            raise UpstreamError(service) from exc

    def post_json(
        self,
        service: str,
        url: str,
        *,
        payload: dict[str, Any],
        headers: dict[str, str] | None = None,
        timeout: tuple[float, float] | None = None,
    ) -> dict[str, Any]:
        try:
            response = self.session.post(
                url,
                json=payload,
                headers=headers,
                timeout=timeout or self.timeout,
            )
            response.raise_for_status()
            result = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise UpstreamError(service) from exc
        if not isinstance(result, dict):
            raise UpstreamError(service, "unexpected response shape")
        return result
