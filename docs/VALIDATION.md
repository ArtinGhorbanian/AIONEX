# Validation evidence

Validation date: 2026-08-08. Host: Windows, Python 3.12.10, Node.js syntax checker, local Chrome, loopback Waitress server.

No OpenAI or translation request was made. Chat and translation were explicitly disabled. Live read-only product checks contacted NCBI PubMed; OpenAlex remained unconfigured.

## Automated checks

| Check | Command/result |
| --- | --- |
| Python syntax | `python -m compileall -q app.py aionex tests` — pass |
| Tests | Python 3.12.10, `python -m pytest` — 18 passed in 6.03 s |
| Python lint | `python -m ruff check .` — pass |
| Python format | `python -m ruff format --check .` — 18 files already formatted/pass |
| JavaScript syntax | `node --check static/script.js` — pass |
| Current-tree secret patterns | OpenAI/GitHub/AWS/private-key pattern scan — 0 files |
| Reachable Git history | OpenAI-shaped key scan — 0 matches |
| Direct dependency audit | `pip-audit` for the four exact production pins — no known vulnerabilities |

The complete lock audit is also run in CI. A local full-lock audit was bounded-stopped after its network/cache operation exceeded 120 seconds; it produced no vulnerability finding before timeout.

## Isolated installation evidence

### Original baseline

- Fresh `.venv-baseline`, Python 3.12.10.
- Original requirement resolution selected Flask 3.0.3, Transformers 4.35.2, TensorFlow 2.16.2, and NumPy 1.26.4.
- Install was stopped after 434.360 s during wheel retrieval; no resolver conflict was reported.
- Offline import failed in 0.210 s on the first absent dependency (`dotenv`) before any `.env` read or external/model call.

### Hardened release

- Production resolution succeeds for four direct packages; the exact resolved set is in `requirements.lock`.
- Three clean pip attempts on this host (workspace dev environment, temp dev environment, and temp production-only environment with bytecode disabled) reached `Installing collected packages` and then became CPU/IO-idle until bounded termination at 180–307 s.
- The stall reproduced outside OneDrive and after all wheels were cached. It is recorded as host-level pip/filesystem/security-scanner contention, not a resolver or application failure.
- The system Python already contained the exact four production versions; the app imported, started, and completed all checks there.

CI is the independent clean Linux installation gate. A clean clone is not reported as locally passing until that workflow succeeds.

## Live API journey

Running Waitress bound to `127.0.0.1:8765` with paid/optional features disabled:

| Flow | Result |
| --- | --- |
| `/api/health` | `200`, version `1.0.0`; chat/translation/OpenAlex false; CSP and `no-store` present |
| Search “microgravity bone loss” | `200`, 20 records, 2.899 s |
| Analyze PMID `37759400` | source abstract available; 352-character extractive summary from 10 sentences; 0.928 s |
| Ask a focused abstract question | evidence sentence found; lexical match 0.52; 0.0125 s |
| Five signals | citations 68, PMC availability 100, recency 85, optional activity signals unavailable/zero; 1.051 s |
| Translation disabled | explicit `503` |
| Chat disabled | explicit `503`; no OpenAI request |

Security probes: untrusted Origin `403`, non-JSON body `400`, 70 KB body `413`, invalid PMID `400`, untrusted Host `400`, disabled chat `503`.

## Browser journey

The complete search → results → article → summary → signals → Q&A → save/library journey executed against the live server.

- 20 rendered result cards
- 352 rendered summary characters
- five rendered signal rows
- 173-character evidence sentence
- save persisted in bounded local storage and appeared in Library
- native Library dialog opened with Enter, closed with Escape, and restored focus
- the assistant disclosure remained available while its message field and send action were disabled
- Arabic selection changed `<html dir>` to `rtl`
- 0 console errors and 0 uncaught page errors on the live provider journey
- 0 visible unnamed buttons/fields
- 0 visible targets below 44 px in either dimension on home and article views
- no horizontal overflow at 375 × 812, 667 × 375, 768 × 1024, 1024 × 768, or 1440 × 1000
- reduced-motion emulation yielded `0s` decorative animation duration
- forced CSP correctly blocked injected inline test styling

The bundled in-app browser automation runtime initially could not initialize its local kernel assets. The live journey and screenshots therefore used installed Chrome through a local debugging connection. A final recovery pass then succeeded through Playwright CLI with provider responses mocked to avoid repeating external calls: loading, success, empty, error, disabled-assistant, save/dialog, focus restoration, RTL, 1440 × 900, 768 × 1024, and 375 × 812 all passed. Its deliberately mocked `502` produced the expected browser resource entry; there were no unexpected console, page, or network errors.

SkillUI extraction, UI/UX Pro Max guidance, and an Impeccable technical audit were applied to the final interface. The audit's only material finding was a missing favicon request; the release now serves an authored local SVG with `200`. The Playwright error-state pass also found and corrected a frontend mapping gap so upstream `5xx` responses show the documented temporary-service recovery message. The detector's generic “Inter is overused” warning was treated as a false positive because AIONEX neither fetches nor bundles that font and intentionally falls back to the local system stack. The preferred 21st component service was not available in this session.

## Contrast sampling

WCAG contrast ratios for core token pairs:

| Pair | Ratio |
| --- | ---: |
| Dark primary text / background | 17.75:1 |
| Dark muted text / surface | 9.35:1 |
| Dark button text / primary | 11.54:1 |
| Light primary text / background | 14.93:1 |
| Light muted text / surface | 6.13:1 |
| Light button text / primary | 5.98:1 |

## Performance

With browser cache disabled:

- 4 requests: document, CSS, JavaScript, local health
- 142,239 encoded bytes
- DOM content loaded: 1.175 s
- load: 1.181 s

With cache/revalidation:

- DOM content loaded: 0.328 s
- load: 0.335 s

Measurements are single-machine observations, not a service-level objective.
