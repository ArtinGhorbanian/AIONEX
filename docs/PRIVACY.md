# Privacy and data flow

Last reviewed: 2026-08-08.

AIONEX has no account system, analytics SDK, advertising code, upload feature, application database, or server-side user profile. Privacy still depends on which features an operator enables.

## Core data flows

| User action | Recipient | Data sent | Persistence |
| --- | --- | --- | --- |
| Search | NCBI PubMed E-utilities | Search query plus tool identifier; optional operator contact/key | Governed by NCBI and network intermediaries; AIONEX keeps a short process cache. |
| Open paper | NCBI PubMed E-utilities | PMID | Short process cache. |
| Load signals | NCBI; optionally OpenAlex | PMID; optional OpenAlex API key server-side | Short process cache. |
| Save/search history | Browser only | Query/title/PubMed URL/date | Bounded `localStorage` on that browser profile. |
| Read aloud | Browser speech synthesis | Displayed text | Browser/OS dependent; AIONEX stores nothing. |

Extractive summaries and abstract Q&A run in the server process and are not sent to an AI provider.

## Optional providers

### Content translation

When `AIONEX_TRANSLATION_ENABLED=true` and the translation extra is installed, selected article title/summary/abstract text is sent to a Google-backed translation service through `deep-translator`. Do not enable this for confidential or unpublished text.

### OpenAI assistant

When both `AIONEX_CHAT_ENABLED=true` and `OPENAI_API_KEY` are configured, chat messages and the last three user/assistant turns are sent to OpenAI's Responses API. AIONEX sets `store=false`. The local process retains at most three turns per conversation in a bounded 30-minute TTL cache. Browser chat is not persisted by AIONEX.

`store=false` is an API request setting, not a substitute for reviewing the provider's current privacy and abuse-monitoring terms.

## Logs

Application code does not intentionally log request bodies, queries, abstracts, chat messages, API keys, or upstream authorization headers. A reverse proxy, platform, browser, operating system, or network may keep separate logs. Operators must configure and disclose those systems independently.

## Local deletion

Recent searches can be cleared from the Library dialog. Saved papers can be removed individually. Clearing site data for the AIONEX origin removes both collections.

## Operator responsibilities

Before deployment beyond loopback, publish a deployment-specific privacy notice, define log retention, confirm provider agreements, protect server environment variables, use TLS, and assess applicable research, employment, education, health, and privacy obligations.
