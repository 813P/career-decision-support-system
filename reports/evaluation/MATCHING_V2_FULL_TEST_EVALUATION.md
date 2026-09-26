# Matching v2 — Full 40-Candidate Test Evaluation

**Status:** Full frozen test completed; no retuning permitted  
**Configuration:** `tfidf + mean_all`  
**Scope:** 40 test candidates × 18 memberships = 720 judgements

## Primary membership-ranking result

| Metric | Result | 95% candidate-bootstrap interval |
|---|---:|---:|
| nDCG@3 | 0.660627 | [0.565457, 0.753311] |
| nDCG@5 | 0.678189 | [0.593030, 0.761010] |
| Top-1 agreement | 0.725000 | [0.575000, 0.850000] |
| MRR (label 2 eligible) | 0.811029 | [0.699988, 0.910816] |
| Coverage@3 | 0.944444 | — |

## Secondary Role Profile result

| Metric | Result |
|---|---:|
| nDCG@3 | 0.898108 |
| nDCG@5 | 0.950726 |
| Top-1 agreement | 0.900000 |
| Coverage@3 | 1.000000 |

## Descriptive subgroup comparison

| Test subset | Candidates | Membership nDCG@3 | Top-1 agreement |
|---|---:|---:|---:|
| Original v1 selected subset | 10 | 0.624306 | 0.600000 |
| Newly annotated reserve | 30 | 0.672733 | 0.766667 |
| Complete v2 test split | 40 | 0.660627 | 0.725000 |

Subgroup results are descriptive only. No method or parameter is changed after test evaluation.
