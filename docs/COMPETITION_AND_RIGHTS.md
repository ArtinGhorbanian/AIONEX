# Competition origin and rights clearance

Status as of 2026-08-08: **private release; public release not yet cleared under the project's strict verified-license-first gate.**

## Project origin

AIONEX was originally created for the [“Build a Space Biology Knowledge Engine”](https://www.spaceappschallenge.org/2025/challenges/build-a-space-biology-knowledge-engine/) challenge during the 2025 NASA International Space Apps Challenge (October 4–5, 2025), then independently hardened and expanded.

This project is not affiliated with or endorsed by NASA or the NASA Space Apps Challenge. “NASA” and the event name are used only for factual attribution. NASA identifiers and logos are not included.

No award, finalist result, official partnership, sole-authorship claim, or complete team roster has been verified; none is claimed.

## Official rules reviewed

| Source | Date shown by source | Verified relevance |
| --- | --- | --- |
| [2025 Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/) | 2025-10-03 | Requires external resources/permissions to be listed, AI use disclosed, originality certified, and excludes commercial promotion from submission content. |
| [2025 Judging & Awards Guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/) | 2025-10-03 | Contains the originality/permission certification used for judging. |
| [2025 Space Apps Brand Guide](https://assets.spaceappschallenge.org/media/documents/Space_Apps_Brand_Guide_-_23_May_2025.pdf) | 2025-05-23 | Governs the separate event identity; it does not grant use of the NASA meatball. |
| [NASA Advertising Guidelines](https://www.nasa.gov/nasa-brand-center/advertising-guidelines/) | Updated 2025-03-31 when reviewed | Prohibits implied NASA endorsement and NASA identifiers in third-party promotion. |
| [NASA Brand Guidelines](https://www.nasa.gov/nasa-brand-center/brand-guidelines/) | Current page reviewed 2026-08-08 | States that the NASA meatball is not public domain and requires permission. |

The official [participant legal page](https://www.spaceappschallenge.org/legal/) is mutable and now displays 2026 terms, updated 2026-06-22. The historical `/2025/legal/` route does not provide the accepted 2025 terms. Preserved official 2024 terms and current 2026 terms contain similar open-source/default-license clauses, but continuity is an inference—not verified 2025 evidence. AIONEX therefore does not claim that a 2025 default Apache-2.0 clause applies.

## License determination

The repository's README declared MIT before the October 4 event; the declaration is present in the 2025-10-03 history and persisted through the competition. That is strong contemporaneous evidence of an intentional OSI-approved license selection.

The full MIT text is now included for original AIONEX application code:

> Copyright © 2025 AIONEX and project contributors.

This does not erase third-party rights or resolve contributor authority. Public visibility remains blocked until the accepted 2025 Participant Terms (or written organizer clarification) and authority to license all contributed code are confirmed.

## Dataset decision

The local development file `SB_publication_PMC.csv` is byte-identical to `SB_publication_PMC.csv` in `jgalazka/SB_publications`, commit [`68399f2795e89beda9a8112983f0ef387423b7fa`](https://github.com/jgalazka/SB_publications/commit/68399f2795e89beda9a8112983f0ef387423b7fa), linked by the official challenge:

- SHA-256: `8f6bad8df8f1a6b818643de4458594a95aade410365fbba6cc1170db62e3cf1c`
- 607 parsed records and 572 unique PMC links
- no license declared in the source repository when reviewed

The application does not use this CSV. It remains excluded from version control and is not redistributed. PMC access is not itself a grant of unrestricted reuse; article-specific licenses still apply. See the [PMC Copyright Notice](https://pmc.ncbi.nlm.nih.gov/about/copyright/) and [Open Access Subset terms](https://pmc.ncbi.nlm.nih.gov/tools/openftlist/).

## Asset decision

The following historical/local files are excluded from the release because permission or provenance is absent, unclear, or unnecessary:

- NASA meatball image previously labeled “Partner Logo”
- competition/splash video
- stock-style generative artwork
- prior AIONEX, astronaut, chat, speaker, message, and action raster images
- the unlicensed CSV described above

They are preserved locally for provenance review and in pre-existing Git history; the release uses authored HTML/CSS/SVG only. No history was rewritten.

## AI-use disclosure

The 2026 transformation used OpenAI Codex under user direction to assist with architecture, code, tests, interface copy, documentation, and review. Outputs were inspected and validated through automated tests and live execution. No AI-generated raster, video, audio, dataset, or modified NASA identity is distributed. The current extractive summary and evidence Q&A algorithms are deterministic code, not generative model outputs.

Original 2025 team AI-tool usage cannot be reconstructed completely from the available repository and is not represented as verified.

## Public-release checklist

- [ ] Recover the exact Participant Terms accepted for the 2025 submission, or obtain written organizer clarification.
- [ ] Confirm contributor/team authority for MIT licensing and public redistribution of every retained code contribution.
- [x] Remove NASA meatball and implied “Partner” relationship.
- [x] Exclude the unlicensed challenge CSV and all unverified media.
- [x] Add scoped MIT text, third-party notices, origin statement, and AI-use disclosure.
- [x] Keep repository private until the two open authority questions are resolved.
