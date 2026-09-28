# Selected TF-IDF — Full 40-Candidate Test Evaluation

**Status:** Full frozen test completed; no retuning permitted  
**Configuration:** `tfidf + mean_all`  
**Scope:** 40 test candidates × 18 memberships = 720 judgements

## Complete held-out metric summary

| Metric | Membership result (95% interval) | Role Profile result (95% interval) |
|---|---|---|
| nDCG@3 | 0.660627 [0.565457, 0.753311] | 0.898108 [0.847969, 0.940831] |
| nDCG@5 | 0.678189 [0.593030, 0.761010] | 0.950726 [0.921429, 0.974234] |
| Top-1 agreement | 0.725000 [0.575000, 0.850000] | 0.900000 [0.800000, 0.975000] |
| MRR, label-2 eligible | 0.811029 [0.699988, 0.910816] | 0.950980 [0.892157, 1.000000] |
| Pairwise ordering agreement | 0.781436 [0.731674, 0.826934] | 0.853423 [0.799397, 0.901786] |
| Coverage@3 | 0.944444 | 1.000000 |
| Coverage@5 | 1.000000 | 1.000000 |

Intervals are 95% candidate-level percentile-bootstrap intervals. Coverage is a dataset-level breadth measure and does not receive a bootstrap interval. Thirty-four candidates were eligible for label-2 MRR; no test candidate had all-zero relevance labels.

The evaluation covers the complete 40-candidate test split. Membership and Role Profile metrics describe different ranking levels and should not be treated as directly comparable accuracy measures. No method or parameter was changed after test evaluation. Exact machine-readable values, candidate-level rows, bootstrap settings, and test candidate identifiers are retained in [`tfidf_full_test_evaluation.json`](tfidf_full_test_evaluation.json).
