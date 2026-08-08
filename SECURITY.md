# Security policy

## Supported version

Security fixes are applied to the latest `1.x` release and the default branch.

## Reporting a vulnerability

Do not disclose a suspected vulnerability in a public issue. Use the repository's private security-advisory/reporting interface when available. If that interface is unavailable, contact the repository owner through GitHub and request a private channel without including exploit details in the initial public message.

Include:

- affected commit/version and route or browser flow
- impact and realistic attacker prerequisites
- minimal reproduction steps
- whether a credential or personal/research data may have been exposed
- suggested remediation, if known

No bounty or response-time commitment is offered. Reports will be acknowledged and triaged as capacity permits.

## Useful scope

- secret disclosure or authorization-header leakage
- DOM injection, stored injection, CSP bypass, or unsafe URL handling
- cross-origin/Host validation bypass
- request-size, rate-limit, cache, or in-memory conversation abuse
- SSRF or unsafe redirects through external integrations
- sensitive data written to logs, responses, browser storage, or screenshots
- dependency or CI compromise affecting the release

Scientific-methodology disagreements without a security impact belong in a normal issue. Provider outages and rate limits are not vulnerabilities.

## Deployment assumptions

The default server binds to loopback. Public deployment requires TLS, an intentionally configured reverse proxy/trusted-host boundary, deployment-specific privacy/logging policies, distributed abuse controls, and authentication/quotas before exposing paid chat. Process-local rate limiting is not a public-edge control.

## Credential incident note

The 2025 source snapshot contained one hard-coded OpenAI credential-shaped value. It was removed from source and placed only in a local ignored environment file; current-tree and reachable-history pattern scans are clean. Because the value existed in source and a synced local folder, it must be treated as exposed and revoked/rotated before optional chat is enabled. This file never records the value.
