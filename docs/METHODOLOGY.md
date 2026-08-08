# Analysis and discovery-signal methodology

AIONEX provides reading and discovery aids. It does not judge whether a paper is true, rigorous, clinically useful, reproducible, or high quality.

## Extractive abstract brief

`extractive-frequency-v1`:

1. Normalizes whitespace and splits the PubMed abstract into sentences.
2. Tokenizes terms, removes a small documented stop-word set, and counts frequency.
3. Scores each sentence using normalized term frequency, a small position bonus, and a penalty for very long sentences.
4. Selects up to three top sentences, restores source order, and caps output length.

Every summary sentence is copied from the source abstract. No model generates new claims. The UI reports the method and number of source sentences considered.

Limitations:

- Frequency is not importance, causality, or scientific validity.
- Structured abstracts and domain terminology can affect sentence ranking.
- The tokenizer is optimized for English-language abstracts.
- Users must verify every claim against the source paper.

## Abstract Q&A

`evidence-sentence-overlap-v1`:

1. Tokenizes the question and every abstract sentence with the same stop-word rules.
2. Scores sentences using question-term coverage (80%) and within-sentence term density (20%).
3. Returns the highest-scoring source sentence only when at least one meaningful term overlaps.
4. Otherwise reports that no clear evidence sentence was found.

The numeric `score` is a lexical match value between 0 and 1. It is **not** model confidence, probability, answer correctness, or evidence strength.

## Five discovery signals

The distinctive original AIONEX logarithmic scaling is preserved:

```text
score(value, cap) = min(100, floor(100 × log10(1 + value) / log10(1 + cap)))
```

| Signal | Raw input | Scale | Meaning and limitation |
| --- | --- | --- | --- |
| Citations | Count of PubMed “cited in” links | Log scale, cap 200 | Discovery/attention proxy; incomplete and time-dependent. |
| PMC availability | Presence of a PMCID | 100 if present, preserved baseline 30 otherwise | Discoverability proxy; PMC access does not guarantee unrestricted reuse. |
| Recency | PubMed publication year | `max(10, 100 - 5 × years ago)` | Time proxy only; older work is not lower quality. |
| Source activity | OpenAlex source `works_count` | Log scale, cap 50,000 | Publication-volume proxy; available only with `OPENALEX_API_KEY`. |
| Author activity | OpenAlex first-author `works_count` | Log scale, cap 300 | Volume proxy for the resolved stable author ID; not expertise or quality. |

OpenAlex enrichment first resolves the work by PMID, then follows stable OpenAlex source and author IDs. The previous implementation's ambiguous name search was removed.

Missing activity data scores zero and is visibly marked unavailable. AIONEX does not combine the components into a single reputation, quality, or truth score.

## Data freshness

PubMed/OpenAlex values can change. Responses are cached in-process for five minutes by default and include a generation timestamp. Do not use these values as a permanent bibliometric record.
