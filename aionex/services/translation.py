"""Optional content translation with an explicit third-party disclosure boundary."""

from __future__ import annotations

from typing import Any

SUPPORTED_LANGUAGES = {
    "en": "en",
    "es": "es",
    "fr": "fr",
    "hi": "hi",
    "zh": "zh-CN",
    "ar": "ar",
}


class TranslationUnavailable(RuntimeError):
    pass


class TranslationService:
    def __init__(self, enabled: bool = False) -> None:
        self.enabled = enabled

    def translate(self, texts: list[str], language: str) -> list[str]:
        if not self.enabled:
            raise TranslationUnavailable("Content translation is disabled by the operator.")
        target = SUPPORTED_LANGUAGES.get(language)
        if target is None:
            raise ValueError("Unsupported translation language.")
        if language == "en":
            return texts
        try:
            from deep_translator import GoogleTranslator

            translated: Any = GoogleTranslator(source="auto", target=target).translate_batch(texts)
        except Exception as exc:
            raise TranslationUnavailable("The translation provider is unavailable.") from exc
        if not isinstance(translated, list) or len(translated) != len(texts):
            raise TranslationUnavailable("The translation provider returned an invalid response.")
        return [str(item) for item in translated]
