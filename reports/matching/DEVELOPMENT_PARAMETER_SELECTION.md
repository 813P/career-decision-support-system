# Development Parameter Selection

**Status:** Researcher approved and frozen as the selected TF-IDF configuration
**Scope:** 20 development candidates × 18 memberships = 360 frozen human judgements  
**Test evaluation at the time of selection:** Not run; subsequently completed once under `reports/evaluation/`

## Recommendation

- Matching method: `tfidf`
- Occupation-to-Role-Profile aggregation: `mean_all`
- Background/direction weights: unchanged (`0.5 / 0.5`)

Semantic has the highest point estimate for membership nDCG@3 (`0.753349`), while TF-IDF scores `0.746448`. The difference is `0.006901`; the paired candidate-level 95% bootstrap interval for TF-IDF minus Semantic is `[-0.068648, 0.049863]`. Under the documented practical-tie rule (nDCG@3 gap no more than `0.01`, interval includes zero), TF-IDF is recommended because it is simpler and more interpretable.

This recommendation was reproduced and frozen on 2026-09-24. The freeze record is `reports/freezes/TFIDF_CONFIGURATION_FREEZE.md`; the full-test result must not be used for retuning.

## Membership-ranking comparison

| Method | nDCG@3 | nDCG@5 | Top-1 | MRR (label 2) | Coverage@3 |
|---|---:|---:|---:|---:|---:|
| Semantic | 0.753349 | 0.712291 | 0.700 | 0.817708 | 0.944 |
| TF-IDF | 0.746448 | 0.729148 | 0.700 | 0.838542 | 0.944 |
| Hybrid α=0.25 | 0.718066 | 0.714141 | 0.750 | 0.837500 | 0.889 |
| Hybrid α=0.50 | 0.650641 | 0.649511 | 0.600 | 0.707292 | 0.889 |
| Hybrid α=0.75 | 0.626727 | 0.629685 | 0.500 | 0.641667 | 0.833 |
| Structured | 0.587196 | 0.619842 | 0.500 | 0.617708 | 0.889 |

Hybrid α is the Structured weight in `score = α × structured_score + (1 − α) × semantic_score`. α=0 and α=1 are exact duplicates of Semantic and Structured and are recorded as endpoint equivalences rather than duplicated in the table.

## Aggregation comparison

Aggregation is evaluated for the recommended TF-IDF method. For this secondary comparison, each Role Profile's human relevance is the maximum frozen membership relevance assigned to that Role Profile.

| Aggregation | nDCG@3 | nDCG@5 | Top-1 |
|---|---:|---:|---:|
| mean_all | 0.885047 | 0.953077 | 0.900 |
| max | 0.872108 | 0.940242 | 0.850 |
| mean_top_2 | 0.871220 | 0.939575 | 0.850 |

`mean_all` leads all three reported aggregation metrics and was subsequently approved and frozen.

## Guardrails and limitations

- Only candidate IDs in `data/candidates/development.json` entered the evaluation.
- All 720 test rows present in the frozen annotation were ignored during development selection.
- No test scores or rankings were generated, inspected or evaluated during development selection. The separately frozen one-time test evaluation was run only after approval.
- Candidate data, Role Profiles, memberships, scoring formulas, and background/direction weights were not changed.
- Human labels are single-annotator judgements, so results are exploratory offline evidence rather than a reliability study.
- The sample contains only 20 development candidates; the bootstrap intervals are correspondingly wide.

The machine-readable results, candidate-level metrics, confidence intervals, input hashes, and guardrail flags are stored in `reports/matching/development_parameter_selection.json`.
