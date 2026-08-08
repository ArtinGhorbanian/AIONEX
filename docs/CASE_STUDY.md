# AIONEX transformation case study

## Baseline

The 2025 prototype demonstrated an unusually broad hackathon workflow: live PubMed discovery, article analysis, five proxy signals, multilingual controls, text-to-speech, local saves/history, and an optional space assistant inside a distinctive cosmic interface.

Its execution and release posture were fragile:

- one hard-coded OpenAI credential-shaped value
- three eager TensorFlow/Transformer pipelines at import, with process exit on any failure
- a 6.52 MB splash video plus CDN-critical UI dependencies
- a hard-coded `http://127.0.0.1:5000/api` browser URL
- multiple untrusted `innerHTML` paths, including persisted content
- permissive CORS, external bind, unauthenticated paid chat, and unbounded memory maps
- missing XML parser dependency and a likely Transformers/TensorFlow/Keras compatibility gap
- ambiguous OpenAlex name search presented as “reputation”
- no tests, CI, lock, environment example, security/privacy docs, or actual license file
- NASA meatball presented as a “Partner Logo” without verified permission

## Root-cause strategy

The transformation did not hide the prototype behind cosmetic polish. It separated startup, external data, deterministic analysis, signals, optional providers, and the HTTP boundary into testable modules. The browser controller was rewritten so dynamic data never becomes executable markup. Unknown-rights media was replaced with authored SVG/CSS.

## Before and after

| Area | Baseline | `1.0.0` |
| --- | --- | --- |
| Startup | Three eager remote model downloads; all-or-nothing exit | No model and no network access during import |
| Runtime dependencies | Flask + Selenium + Transformers + TensorFlow + scraping/model stack | Four direct core packages; exact resolved lock |
| Analysis | Black-box model summary/sentiment/Q&A | Transparent extractive summary and source-sentence retrieval; no sentiment claim |
| Signals | Five numeric “reputation” components; ambiguous name matching | Five named discovery proxies, raw values, methodology, limitations, stable IDs, missing-data states |
| Browser trust | Hard-coded loopback API and unsafe HTML interpolation | Same-origin client, strict PubMed URLs, DOM APIs/text nodes, cancellation/sequencing |
| Server trust | Permissive CORS, external bind, broad inputs | Loopback/trusted hosts, origin allowlist, strict schemas, 64 KiB cap, rate limits, security headers |
| Paid providers | Key embedded in source; chat always exposed | Server environment only, explicit feature flag, Responses API, `store=false`, bounded history |
| Interface payload | 6.52 MB video before CDN/runtime dependencies | 142,239 encoded bytes across four cold-load requests including health |
| Accessibility | Role-div controls, cursor suppression, blocking splash, no responsive/reduced-motion path | Native controls/dialogs, labels/live regions, focus restore, 44 px targets, RTL, forced colors, reduced motion, responsive layouts |
| Rights | Unverified logo/media/dataset; MIT claim without file | Authored SVG/CSS only; dataset/media excluded; MIT text, notices, evidence, private gate |
| Verification | No tests/CI | 18 tests, Ruff, JS syntax, live upstream/browser flows, dependency and secret scans, GitHub CI |

## Preserved original work

- Search → abstract → Q&A → signals as one continuous journey
- NCBI E-utilities integration
- the five-component logarithmic scale, now bounded by honest semantics
- six interface locales, Arabic RTL, browser speech, local history, and saved papers
- the recognizable navy/cyan cosmic visual language
- the space-biology challenge origin

## Measured result

On the 2026-08-08 validation host:

- cold local page: 142,239 encoded bytes, 4 requests, DOM content loaded in 1.175 s, load in 1.181 s
- cached navigation: DOM content loaded in 0.328 s, load in 0.335 s
- live PubMed search: 20 results in 2.899 s
- live article retrieval/analysis: 0.928 s
- local evidence Q&A: 0.0125 s
- live signals: 1.051 s with PubMed available and unconfigured OpenAlex explicitly unavailable

The initial local payload is about 97.9% smaller than the original repository's 6.49 MiB baseline, before even counting its third-party CDN downloads.

## Deliberate remaining debt

- Extractive analysis is intentionally modest and English-oriented; scientific traceability was prioritized over opaque model breadth.
- Rate limiting, caching, and chat history are process-local; public multi-instance deployment needs shared infrastructure and authentication/quotas.
- OpenAlex activity now requires an operator key and is unavailable by default.
- Content translation depends on an old but still published optional adapter and a third-party service.
- Contributor authority and exact 2025 terms remain a legal public-release gate.
