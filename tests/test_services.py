from __future__ import annotations

from aionex.services.chat import ChatService
from aionex.services.signals import scale_log


class ChatHttp:
    def __init__(self):
        self.last_payload = None
        self.last_url = None

    def post_json(self, _service, url, *, payload, headers, timeout):
        self.last_url = url
        self.last_payload = payload
        assert headers["Authorization"].startswith("Bearer ")
        return {
            "output": [
                {
                    "type": "message",
                    "content": [{"type": "output_text", "text": "A grounded reply."}],
                }
            ]
        }


def test_preserved_log_scaling_is_clamped():
    assert scale_log(0, 200) == 0
    assert 0 < scale_log(10, 200) < 100
    assert scale_log(200, 200) == 100
    assert scale_log(10_000, 200) == 100


def test_chat_uses_responses_api_and_disables_storage():
    http = ChatHttp()
    chat = ChatService(http, enabled=True, api_key="test-key", model="test-model")
    reply = chat.reply("session_1234", "Explain space biology")
    assert reply == "A grounded reply."
    assert http.last_url == "https://api.openai.com/v1/responses"
    assert http.last_payload["store"] is False
    assert http.last_payload["model"] == "test-model"
