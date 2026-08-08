# Engineering decision record

These concise records capture the release's high-impact decisions. Dates use the 2026-08-08 transformation review.

## ADR-001 — Preserve the PubMed reading workflow

**Decision:** keep live PubMed search, article analysis, grounded questions, five signals, multilingual UI, local library, TTS, and optional chat while replacing unsafe boundaries.

**Why:** these are the distinctive product behaviors. A generic rewrite or framework migration would add risk without strengthening them.

## ADR-002 — Deterministic analysis replaces eager local models

**Decision:** use extractive frequency ranking and evidence-sentence overlap in the core path.

**Why:** the original import eagerly loaded three TensorFlow pipelines and could not serve after one model/dependency failure. The deterministic method starts without a download, is testable, and supports precise disclosure. Its lexical limits remain visible.

## ADR-003 — Optional providers are off by default

**Decision:** require explicit flags and operator keys for translation, chat, and OpenAlex activity signals.

**Why:** core research discovery must not create paid calls, disclose article text, or fail startup because an optional service is unavailable.

## ADR-004 — Vanilla same-origin frontend

**Decision:** retain an HTML/CSS/JavaScript client with no CDN or build-time framework.

**Why:** the product needs a small accessible interface, not a component runtime. Safe DOM construction, cancellation, and semantic controls address the original risks with a four-request page.

## ADR-005 — Explainable signals, not reputation

**Decision:** name the output “discovery signals,” retain the five 0–100 components, expose raw details, and deprecate the old reputation route.

**Why:** citation/activity proxies help triage but cannot establish scientific quality or truth. Compatibility remains available without preserving a deceptive label.

## ADR-006 — Private release under scoped MIT

**Decision:** formalize the pre-existing MIT declaration for original AIONEX code, exclude unlicensed data/media, and keep GitHub private.

**Why:** exact 2025 Participant Terms and complete contributor authorization remain unverified. Adjacent-year terms are not substituted for the contract that governed the submission. See [LICENSE_DECISION.md](../LICENSE_DECISION.md).

## ADR-007 — No history rewrite

**Decision:** remove the credential from current code, scan reachable history, rotate it externally, and preserve the existing 92-commit remote history.

**Why:** no secret pattern remains in reachable commits, and rewriting collaborative history would be destructive. Provider revocation is still mandatory because source exposure occurred.
