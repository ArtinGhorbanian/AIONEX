# Contributing to AIONEX

Thank you for helping make scientific-literature discovery safer and more understandable.

The repository is currently private while contributor authority and the exact 2025 competition terms are verified. Coordinate with the repository owner before beginning substantial work.

## Local setup

```bash
python -m venv .venv
python -m pip install -r requirements-dev.txt
```

Activate the environment for your platform, copy `.env.example` to `.env`, and keep every optional provider disabled unless your change specifically tests it.

## Required checks

```bash
python -m ruff check .
python -m ruff format --check .
python -m pytest
node --check static/script.js
python scripts/secret_scan.py
```

Tests must not contact PubMed, OpenAlex, translation providers, or OpenAI. Use injected fake services. Live integration evidence belongs in a clearly identified, manually run validation step.

## Product rules

- Preserve source traceability. Do not label a proxy or heuristic as truth, quality, reputation, impact, probability, or model confidence without validated evidence.
- Keep the no-key core useful. Optional providers must be feature-flagged and fail independently.
- Do not introduce untrusted HTML sinks. Use DOM APIs and text nodes for dynamic browser content.
- Keep inputs bounded and external requests timed out, retried conservatively, and sanitized on failure.
- Maintain keyboard behavior, labels, live regions, RTL, reduced motion, forced colors, 44 px targets, and responsive layouts.
- Do not add a CDN/runtime browser dependency without a documented security, privacy, performance, and offline rationale.

## Rights and provenance

Every new image, icon, font, video, dataset, code sample, or long-form text source must include:

- creator/source URL
- exact license or written permission
- required attribution
- modification/disclosure requirements
- confirmation that use does not imply NASA or event endorsement

Do not add NASA identifiers, challenge marks, unlicensed article content, or the excluded CSV. AI-assisted code/text must be disclosed in the pull request; AI-generated visual/audio/data assets require explicit provenance and competition-rule review.

## Pull requests

Keep changes focused and explain:

- what changed and why
- root cause and user impact
- security/privacy/scientific tradeoffs
- checks run and exact results
- provider/network calls made, if any
- third-party/AI resources used

Use terse imperative commits. Repository-local commits use the AIONEX identity and an authenticated GitHub no-reply address; do not rewrite historical authorship.
