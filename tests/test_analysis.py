from __future__ import annotations

from aionex.services.analysis import AnalysisService


def test_summary_is_deterministic_and_extractive():
    service = AnalysisService()
    abstract = (
        "Microgravity changes cellular structure. "
        "Cells were cultured for fourteen days in orbit. "
        "Microgravity also changed gene expression in the sampled cells. "
        "The ground control retained its expected structure."
    )
    first = service.summarize(abstract, max_sentences=2)
    second = service.summarize(abstract, max_sentences=2)
    assert first == second
    assert first["method"] == "extractive-frequency-v1"
    assert all(sentence in abstract for sentence in first["summary"].split(". "))


def test_answer_declines_when_evidence_is_missing():
    result = AnalysisService().answer(
        "Which spacecraft carried the sample?",
        "The study measured cell growth under simulated microgravity.",
    )
    assert result["found"] is False
    assert result["score"] == 0.0
