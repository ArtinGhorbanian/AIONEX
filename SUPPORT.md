# Support

AIONEX is a self-hosted research-discovery application. Support is provided through this repository; no external support address or service-level agreement is offered.

## Before opening an issue

1. Confirm Python 3.10 or newer is active.
2. Install the exact production set with `python -m pip install -r requirements.lock`.
3. Start from `.env.example`; never attach a real `.env` file.
4. Check `/api/health` and include only its non-sensitive feature flags and version.
5. Reproduce with optional chat, translation, and OpenAlex features disabled when possible.

## Where to ask

- Use the bug-report issue form for reproducible defects.
- Use the feature-request form for a scoped improvement.
- Use a regular GitHub Issue for setup or methodology questions.
- Report vulnerabilities through the private process described in [SECURITY.md](SECURITY.md), not a public issue.

Include the operating system, Python version, command that failed, sanitized traceback, and whether the problem occurs with the default loopback configuration. Remove API keys, email addresses, article notes, and local paths that identify a person before posting.

## Scope

Maintainers can help with the application, documented configuration, and reproducible defects. Availability, rate limits, and content returned by PubMed, OpenAlex, OpenAI, or translation providers remain controlled by those services.
