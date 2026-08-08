"""Optional OpenAI Responses API integration with bounded in-memory history."""

from __future__ import annotations

import re
from typing import Any

from aionex.cache import TTLCache
from aionex.http import HttpClient, UpstreamError

CONVERSATION_ID = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
SYSTEM_INSTRUCTIONS = (
    "You are the optional AIONEX space-biology research assistant. Answer only questions "
    "about space biology, spaceflight, astronomy, or the scientific-literature workflow. "
    "State uncertainty, do not invent citations, do not provide medical advice, and answer "
    "in the language used by the user. Politely decline unrelated requests."
)


class ChatUnavailable(RuntimeError):
    pass


class ChatService:
    def __init__(
        self,
        http: HttpClient,
        *,
        enabled: bool,
        api_key: str,
        model: str,
    ) -> None:
        self.http = http
        self.enabled = enabled
        self.api_key = api_key
        self.model = model
        self._histories: TTLCache[list[dict[str, str]]] = TTLCache(ttl_seconds=1_800, max_items=256)

    @property
    def available(self) -> bool:
        return self.enabled and bool(self.api_key)

    def reply(self, conversation_id: str, message: str) -> str:
        if not self.available:
            raise ChatUnavailable("Chat is disabled or OPENAI_API_KEY is not configured.")
        if not CONVERSATION_ID.fullmatch(conversation_id):
            raise ValueError("Invalid conversation identifier.")
        history = list(self._histories.get(conversation_id) or [])[-6:]
        inputs: list[dict[str, Any]] = [
            {"role": item["role"], "content": item["content"]} for item in history
        ]
        inputs.append({"role": "user", "content": message})
        response = self.http.post_json(
            "OpenAI",
            "https://api.openai.com/v1/responses",
            payload={
                "model": self.model,
                "instructions": SYSTEM_INSTRUCTIONS,
                "input": inputs,
                "max_output_tokens": 600,
                "store": False,
            },
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=(3.05, 30.0),
        )
        reply = self._extract_output_text(response)
        if not reply:
            raise UpstreamError("OpenAI", "empty model response")
        next_history = history + [
            {"role": "user", "content": message},
            {"role": "assistant", "content": reply},
        ]
        self._histories.set(conversation_id, next_history[-6:])
        return reply

    @staticmethod
    def _extract_output_text(response: dict[str, Any]) -> str:
        direct = response.get("output_text")
        if isinstance(direct, str) and direct.strip():
            return direct.strip()
        for item in response.get("output", []):
            if not isinstance(item, dict) or item.get("type") != "message":
                continue
            for content in item.get("content", []):
                if isinstance(content, dict) and content.get("type") == "output_text":
                    text = content.get("text")
                    if isinstance(text, str) and text.strip():
                        return text.strip()
        return ""
