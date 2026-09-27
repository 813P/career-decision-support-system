# Experiment protocol

1. Validate and freeze the 60-candidate dataset: 20 development candidates and a 40-candidate test pool.
2. Build, audit and freeze the 18-membership matching evidence.
3. Complete model-output-blinded researcher annotation for all 20 development candidates and all 40 test candidates.
4. Freeze the 1,080 candidate–membership judgements and record the single-annotator limitation.
5. Use only the 360 development judgements to compare Structured, TF-IDF, Semantic and Hybrid methods and the declared aggregation rules.
6. Approve and freeze `tfidf + mean_all` with background/direction weights of `0.5 / 0.5` as the selected configuration.
7. Run the selected configuration once on all 40 held-out test candidates and report candidate-bootstrap uncertainty.
8. Prohibit post-test retuning. Any later method or data change requires a separately versioned study.

Candidate background input is `current_job_title + skills + experience_narrative`; direction input is `desired_work_directions`. Governance metadata, split, intended role, scenario and audit outputs are prohibited model inputs.

This frozen protocol applies only to candidate-to-membership ranking. The experimental JD multi-label analyzer, its phrase configuration, thresholds, and regression cases are outside this protocol and outside the reported evaluation. A future JD study requires its own annotated `job_description × Role Profile` dataset, development/test split, method selection, and freeze record.

The primary ranking metric is candidate-level nDCG at 3. Report Top-1 agreement, nDCG at 5, mean reciprocal rank, coverage and candidate-level bootstrap confidence intervals as supporting measures.

The protocol above is complete for the selected TF-IDF full-test evaluation. Earlier three-annotator A/B/C drafts belong to historical snapshots, not the current repository's annotation design or evaluation labels.

A `0.01` development membership nDCG@3 difference was used as a study-specific near-tie heuristic when comparing closely performing configurations. It is not a universal nDCG threshold or a statistical equivalence criterion. The paired candidate-level bootstrap interval, reproducibility, interpretability, implementation simplicity, and dependency/runtime burden were also considered.
