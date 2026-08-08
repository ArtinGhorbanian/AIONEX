# Changelog

All notable changes are documented here. This project follows semantic versioning for hardened releases.

## [1.0.0] — 2026-08-08

### Added

- Lightweight Flask app factory and modular PubMed, analysis, signal, translation, and chat services
- deterministic extractive summaries and evidence-sentence Q&A
- five explainable discovery proxies with raw values, sources, limitations, and stable-ID OpenAlex enrichment
- strict validation, request cap, host/origin controls, rate limits, bounded TTL caches, and security headers
- opt-in OpenAI Responses API chat with `store=false`
- responsive accessible six-locale interface with RTL, light/dark/system themes, reduced motion, forced colors, local library, and browser speech
- authored SVG favicon with a regression check for the local asset path
- tests, lint/format configuration, exact production lock, CI, Dependabot, secret scanner, screenshots, architecture/privacy/security/methodology/legal documentation
- full MIT license text and third-party notices

### Changed

- reframed “reputation” and sentiment claims as transparent reading/discovery aids
- replaced ambiguous OpenAlex name searches with stable work/source/author IDs
- replaced external fonts/icons/scripts, splash video, and raster identity with authored HTML/CSS/SVG
- changed frontend API access from a hard-coded loopback URL to same-origin requests
- default server bind from all interfaces to loopback
- mapped upstream 5xx failures to a clear temporary-service recovery message instead of a generic error

### Removed from distribution

- hard-coded credential
- eager TensorFlow/Transformer/Selenium stack
- untrusted `innerHTML` rendering paths
- NASA “Partner Logo” and all unknown-rights media
- unlicensed challenge CSV

### Security

- Treat the historical credential as exposed and rotate/revoke it before optional chat is enabled.
- Repository visibility is private pending competition-term and contributor-authority clearance.
