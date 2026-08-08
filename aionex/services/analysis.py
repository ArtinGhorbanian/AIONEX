"""Deterministic, dependency-light analysis for article abstracts.

These helpers intentionally avoid presenting heuristic output as scientific
sentiment or model-generated fact. They are transparent extractive aids whose
source is always the supplied abstract.
"""

from __future__ import annotations

import re
from collections import Counter
from typing import Any

SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9])|\n{2,}")
WORD = re.compile(r"[A-Za-z][A-Za-z0-9'-]{1,}")
STOP_WORDS = {
    "and",
    "an",
    "are",
    "as",
    "at",
    "be",
    "by",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "the",
    "to",
    "we",
    "for",
    "from",
    "has",
    "into",
    "its",
    "not",
    "our",
    "that",
    "was",
    "will",
    "about",
    "after",
    "also",
    "among",
    "because",
    "been",
    "before",
    "being",
    "between",
    "both",
    "could",
    "does",
    "during",
    "each",
    "have",
    "more",
    "most",
    "other",
    "over",
    "such",
    "than",
    "their",
    "these",
    "they",
    "this",
    "those",
    "through",
    "under",
    "using",
    "were",
    "what",
    "when",
    "where",
    "which",
    "while",
    "with",
    "would",
}


def _sentences(text: str) -> list[str]:
    normalized = " ".join(text.split())
    return [part.strip() for part in SENTENCE_BOUNDARY.split(normalized) if part.strip()]


def _terms(text: str) -> list[str]:
    return [token.casefold() for token in WORD.findall(text) if token.casefold() not in STOP_WORDS]


class AnalysisService:
    """Transparent extractive summary and evidence-sentence retrieval."""

    def summarize(self, abstract: str, *, max_sentences: int = 3) -> dict[str, Any]:
        sentences = _sentences(abstract)
        if not sentences:
            return {
                "summary": "",
                "method": "extractive-frequency-v1",
                "source_sentence_count": 0,
            }
        if len(sentences) <= max_sentences:
            return {
                "summary": " ".join(sentences),
                "method": "extractive-frequency-v1",
                "source_sentence_count": len(sentences),
            }
        frequencies = Counter(_terms(abstract))
        highest = max(frequencies.values(), default=1)
        ranked: list[tuple[float, int]] = []
        for index, sentence in enumerate(sentences):
            terms = _terms(sentence)
            if not terms:
                continue
            lexical = sum(frequencies[term] / highest for term in terms) / len(terms)
            position_bonus = 0.18 if index == 0 else max(0.0, 0.08 - index * 0.01)
            length_penalty = 0.12 if len(sentence) > 500 else 0.0
            ranked.append((lexical + position_bonus - length_penalty, index))
        chosen = sorted(index for _, index in sorted(ranked, reverse=True)[:max_sentences])
        summary = " ".join(sentences[index] for index in chosen)
        if len(summary) > 1_200:
            summary = summary[:1_197].rsplit(" ", 1)[0] + "…"
        return {
            "summary": summary,
            "method": "extractive-frequency-v1",
            "source_sentence_count": len(sentences),
        }

    def answer(self, question: str, context: str) -> dict[str, Any]:
        question_terms = set(_terms(question))
        if not question_terms:
            return {
                "answer": "Ask a more specific question using terms from the abstract.",
                "score": 0.0,
                "method": "evidence-sentence-overlap-v1",
                "found": False,
            }
        ranked: list[tuple[float, int, str]] = []
        for index, sentence in enumerate(_sentences(context)):
            sentence_terms = set(_terms(sentence))
            if not sentence_terms:
                continue
            overlap = len(question_terms & sentence_terms)
            if not overlap:
                continue
            precision = overlap / len(question_terms)
            density = overlap / max(1, len(sentence_terms))
            ranked.append((precision * 0.8 + density * 0.2, -index, sentence))
        if not ranked:
            return {
                "answer": "No clear evidence sentence was found in this abstract.",
                "score": 0.0,
                "method": "evidence-sentence-overlap-v1",
                "found": False,
            }
        score, _, answer = max(ranked)
        return {
            "answer": answer,
            "score": round(min(1.0, score), 3),
            "method": "evidence-sentence-overlap-v1",
            "found": True,
        }
