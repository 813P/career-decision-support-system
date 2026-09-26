# Selected TF-IDF — Full 40-Candidate Test Evaluation

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

The evaluation covers the complete 40-candidate test split. No method or parameter is changed after test evaluation.
