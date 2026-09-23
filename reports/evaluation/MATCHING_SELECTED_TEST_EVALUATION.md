# Selected Matching — Final Test Evaluation

**Status:** Final one-time test completed; no retuning permitted  
**Configuration:** `tfidf + mean_all`  
**Scope:** 10 preselected stratified test candidates × 18 memberships = 180 judgements

## Primary membership-ranking result

| Metric | Result | 95% candidate-bootstrap interval |
|---|---:|---:|
| nDCG@3 | 0.624306 | [0.419773, 0.812810] |
| nDCG@5 | 0.649045 | [0.459582, 0.820791] |
| Top-1 agreement | 0.600000 | [0.300000, 0.900000] |
| MRR (label 2 eligible) | 0.707292 | [0.414583, 1.000000] |
| Coverage@3 | 0.777778 | — |

## Secondary Role Profile result

| Metric | Result |
|---|---:|
| nDCG@3 | 0.894400 |
| nDCG@5 | 0.944160 |
| Top-1 agreement | 0.800000 |
| Coverage@3 | 1.000000 |

Role Profile relevance is derived as the maximum frozen membership relevance within each Role Profile, matching the frozen development-selection specification.

## Interpretation limits

- This is a single-annotator exploratory offline evaluation; reliability is not estimated.
- The result covers the preselected 10-candidate stratified test subset, not all 40 frozen test candidates.
- The selected configuration is frozen and must not be retuned after viewing these results.
