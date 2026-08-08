# Third-party notices

Last reviewed: 2026-08-08.

AIONEX does not vendor third-party source, fonts, JavaScript, images, logos, video, or model weights. Installed Python packages retain their own licenses; this file is attribution and inventory, not a replacement for their license texts.

## Runtime packages

| Package | Pinned version | License metadata | Project |
| --- | ---: | --- | --- |
| Flask | 3.1.3 | BSD-3-Clause | <https://palletsprojects.com/p/flask/> |
| Requests | 2.34.2 | Apache-2.0 | <https://requests.readthedocs.io/> |
| python-dotenv | 1.2.2 | BSD-3-Clause | <https://github.com/theskumar/python-dotenv> |
| Waitress | 3.0.2 | Zope Public License 2.1 | <https://docs.pylonsproject.org/projects/waitress/> |

## Optional package

| Package | Pinned version | License metadata | Project |
| --- | ---: | --- | --- |
| deep-translator | 1.11.4 | MIT | <https://github.com/nidhaloff/deep-translator> |

## Development tools

| Package | Pinned version | License metadata | Project |
| --- | ---: | --- | --- |
| pytest | 9.1.1 | MIT | <https://pytest.org/> |
| Ruff | 0.15.22 | MIT | <https://docs.astral.sh/ruff/> |
| pip-audit | 2.10.1 | Apache-2.0 | <https://github.com/pypa/pip-audit> |

Transitive production versions are recorded in `requirements.lock`.

## Data and network services

### NCBI PubMed

AIONEX queries [NCBI E-utilities](https://www.ncbi.nlm.nih.gov/books/NBK25501/) for PubMed records, abstracts, identifiers, and cited-by links. NCBI/PubMed names identify the source; no affiliation is implied. Rights in article titles, abstracts, and full text can vary. See the [PMC Copyright Notice](https://pmc.ncbi.nlm.nih.gov/about/copyright/) before reuse.

### OpenAlex

Optional activity counts come from the [OpenAlex API](https://developers.openalex.org/). OpenAlex states that its dataset is CC0. API access currently requires an operator key and is disabled when none is configured.

### Google-backed translation

Optional content translation uses `deep-translator`'s Google translator adapter. Text can be sent to a third-party provider. Google branding or code is not bundled.

### OpenAI

Optional chat calls the [OpenAI Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses) with an operator-supplied key and `store=false`. OpenAI code/model assets are not bundled.

## Challenge resource excluded from distribution

During development, the project used `SB_publication_PMC.csv` from the challenge-linked [`jgalazka/SB_publications`](https://github.com/jgalazka/SB_publications) repository, commit `68399f2795e89beda9a8112983f0ef387423b7fa`. The source repository declared no license when reviewed, so the CSV is neither tracked nor redistributed.

## Historical/local media excluded from distribution

Unknown or unsuitable rights prevented distribution of the historical NASA meatball image, competition/splash video, stock-style generative artwork, and prior raster brand/chat/astronaut/action assets. The current interface uses only authored HTML, CSS, and SVG paths.

NASA and the NASA International Space Apps Challenge are referenced solely for factual attribution. NASA is not a partner, sponsor, or endorser of AIONEX.
