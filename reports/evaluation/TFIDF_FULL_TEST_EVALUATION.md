# Final Held-out Evaluation Report

**Study:** *Exploring Analytical Career Directions*<br>
**Status:** Completed; final configuration frozen and evaluated on the held-out test set<br>
**Configuration:** TF-IDF + `mean_all` aggregation + 0.5 background / 0.5 direction weighting<br>
**Evaluation scope:** 40 test candidates × 18 memberships = 720 relevance judgements<br>
**Configuration freeze:** 2026-09-24

## Executive summary

The selected configuration was evaluated once on the complete 40-candidate held-out test set after method and aggregation selection had been completed on the 20-candidate development set. No test result was used to change the method, targets, component weights, aggregation, candidate evidence, or labels.

The primary membership-ranking result was nDCG@3 **0.660627** with a 95% candidate-bootstrap interval of **[0.565457, 0.753311]**. The secondary Role Profile result was nDCG@3 **0.898108**, interval **[0.847969, 0.940831]**. The two values describe different ranking levels and are not directly comparable accuracy measures.

The results support the feasibility of the two-level ranking framework in this controlled synthetic setting. They do not establish real-world predictive validity, production readiness, or suitability for employment decisions.

## 1. Frozen configuration and evaluation scope

| Element | Frozen evaluation setting |
|---|---|
| Membership ranker | TF-IDF lexical similarity |
| Candidate evidence channels | Background and stated direction |
| Component weights | 0.5 background / 0.5 direction |
| Primary scoring level | 18 occupation–Role Profile memberships per candidate |
| Role Profile aggregation | `mean_all` over memberships assigned to each profile |
| Primary evaluation unit | Candidate × membership |
| Secondary evaluation level | Five aggregated Role Profiles |
| Role Profile reference label | Maximum frozen membership relevance within the profile |

The 40 test candidates have no overlap with the 20 development candidates. All test candidates were included, producing 720 held-out candidate–membership judgements. Thirty-four candidates had at least one label-2 membership; no test candidate had all-zero relevance labels.

The labels were assigned by one researcher without access to ranking outputs, scores, model names, or construction metadata. This model-output-blinded procedure reduces direct model influence but does not provide independent or multi-rater validation.

> **No-retuning statement:** the held-out results and error cases were used only for final evaluation and interpretation. The selected configuration was not revised after test inspection. Any later method, data, target, or evaluation-code change requires a separately versioned study.

## 2. Evaluation framework

The primary metric is candidate-level membership nDCG@3. It measures how well the ranked memberships agree with graded relevance labels near the top of the list; it is not classification accuracy. The five-profile ranking is a secondary evaluation produced after membership aggregation.

| Measure | Interpretation |
|---|---|
| nDCG@3 / nDCG@5 | Graded ranking agreement near the top three or five positions |
| Top-1 agreement | Whether rank 1 receives the candidate's highest available relevance label, allowing ties |
| MRR for label 2 | How early the first label-2 item appears |
| Pairwise ordering agreement | Agreement on pairs whose human relevance labels differ |
| Coverage@k | Share of the target universe appearing at least once in Top-k across candidates; breadth, not accuracy |

Uncertainty intervals use 2,000 candidate-level percentile-bootstrap resamples at 95% confidence. Resampling candidates keeps the 18 membership judgements belonging to one candidate together. Coverage is a dataset-level breadth measure and does not receive a bootstrap interval.

## 3. Complete held-out results

| Metric | Membership result (95% interval) | Role Profile result (95% interval) |
|---|---|---|
| nDCG@3 | 0.660627 [0.565457, 0.753311] | 0.898108 [0.847969, 0.940831] |
| nDCG@5 | 0.678189 [0.593030, 0.761010] | 0.950726 [0.921429, 0.974234] |
| Top-1 agreement | 0.725000 [0.575000, 0.850000] | 0.900000 [0.800000, 0.975000] |
| MRR, all candidates | 0.689375 [0.558104, 0.815005] | 0.808333 [0.687500, 0.912500] |
| MRR, label-2 eligible | 0.811029 [0.699988, 0.910816] | 0.950980 [0.892157, 1.000000] |
| Pairwise ordering agreement | 0.781436 [0.731674, 0.826934] | 0.853423 [0.799397, 0.901786] |
| Coverage@3 | 0.944444 | 1.000000 |
| Coverage@5 | 1.000000 | 1.000000 |

Exact machine-readable values, candidate-level rows, eligibility counts, bootstrap settings, and test candidate identifiers are retained in [`tfidf_full_test_evaluation.json`](tfidf_full_test_evaluation.json).

## 4. Interpretation

Role Profile ordering showed higher observed agreement with the reference labels, while membership-level agreement was lower. This difference should not be interpreted as proof that Role Profile ranking is inherently easier or that aggregation caused the higher value: the two levels contain different numbers of targets, the Role Profile reference labels use a maximum-membership rule, and the model uses mean aggregation.

Membership Coverage@3 shows that 17 of the 18 memberships appeared at least once among candidates' top three; Coverage@5 reached all 18. Role Profile Coverage@3 reached all five profiles. These values show breadth of exposure across the dataset, not relevance quality for an individual candidate.

The uncertainty intervals are compatible with substantial variation across candidates. They quantify candidate-sampling uncertainty within this frozen synthetic dataset; they do not address annotator uncertainty or generalisation to a real job-seeker population.

## 5. Representative held-out errors

The following cases were selected after the configuration and rankings were frozen. They informed interpretation only and were not used for retuning.

| Case | Frozen observation | Evaluation implication |
|---|---|---|
| C019 | The leading Role Profile was acceptable, but its leading budget-analyst membership had relevance 0 while a strongly relevant data-analyst membership appeared later. | Broad profile agreement can conceal an implausible occupation-level contributor; membership provenance remains necessary. |
| C024 | Business Performance ranked first even though adjacent strategy profiles contained more strongly labelled memberships. | Repeated performance vocabulary can dominate genuinely mixed evidence and make a single ordering appear more decisive than the labels support. |
| C056 | Data Science ranked first although its leading statistician membership had relevance 0 and the candidate had no label-2 membership. | Aspiration and model-related vocabulary can outweigh explicit evidence limitations; bag-of-words similarity does not reliably interpret negation. |

The full descriptive analysis also covers the lowest membership-ranking cases, boundary patterns, potential user risks, and future testable improvements in [`docs/ERROR_ANALYSIS.md`](../../docs/ERROR_ANALYSIS.md).

## 6. Limitations and claim boundary

- **Synthetic and researcher-dependent evidence:** all profiles are synthetic, and one researcher contributed to target design, profile review, and annotation. Model-output blinding does not establish independent validity or annotator reliability.
- **Narrow career space:** the five Role Profiles, 15 occupations, and 18 memberships are project-defined and do not comprehensively represent the labour market.
- **Different evaluation levels:** membership and Role Profile results use different target counts and different label/aggregation constructions; their metric gap is descriptive rather than causal evidence about aggregation.
- **Representation limits:** TF-IDF is sensitive to vocabulary overlap and does not reliably handle paraphrase, negation, evidence absence, or multilingual variation.
- **No real-user validation:** the evaluation does not measure explanation comprehension, decision quality, career outcomes, demographic fairness, or generalisation to real job seekers.

The system is intended for exploratory, human-centred career decision support. The results must not be translated into accuracy percentages or used to justify automated hiring, screening, rejection, eligibility, or other high-stakes employment decisions.

## 7. Audit and reproducibility records

| Record | Purpose |
|---|---|
| [`config/selected/tfidf.json`](../../config/selected/tfidf.json) | Frozen configuration, input hashes, test scope, and change control |
| [`TFIDF_CONFIGURATION_FREEZE.md`](../freezes/TFIDF_CONFIGURATION_FREEZE.md) | Human-readable configuration freeze and guardrails |
| [`tfidf_full_test_run_manifest.json`](tfidf_full_test_run_manifest.json) | Test candidate scope and output hashes |
| [`tfidf_full_test_evaluation.json`](tfidf_full_test_evaluation.json) | Complete metrics, intervals, and candidate-level evaluation rows |
| [`tfidf_full_test_rankings.json`](../matching/tfidf_full_test_rankings.json) | Frozen candidate rankings |
| [`tfidf_full_test_scores.csv`](../../results/tfidf_full_test_scores.csv) | Membership-level score export |
| [`DEVELOPMENT_PARAMETER_SELECTION.md`](../matching/DEVELOPMENT_PARAMETER_SELECTION.md) | Development-only method and aggregation selection |
| [`EXPERIMENT_PROTOCOL.md`](../../docs/EXPERIMENT_PROTOCOL.md) | Development/test separation and evaluation procedure |
| [`RESEARCH_TECHNICAL_APPENDIX.md`](../../docs/RESEARCH_TECHNICAL_APPENDIX.md) | Metric definitions, formulas, runtime, and exact versions |
