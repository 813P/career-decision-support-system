# Experiment protocol

1. Validate and freeze the 60-candidate dataset: 20 development candidates and a 40-candidate test pool.
2. Build, audit and freeze the 18-membership matching evidence.
3. Complete blind primary annotation for all 20 development candidates and the 10-candidate test subset selected before model-output inspection.
4. Freeze the 540 candidate–membership judgements and record the single-annotator limitation.
5. Use only the 360 development judgements to compare Structured, TF-IDF, Semantic and Hybrid methods and the declared aggregation rules.
6. Approve and freeze `tfidf + mean_all` with background/direction weights of `0.5 / 0.5` as `matching_selected`.
7. Run the selected configuration once on the 10 labelled held-out test candidates and report candidate-bootstrap uncertainty.
8. Prohibit post-test retuning. Treat any use of the remaining 30 unlabelled test candidates as a separately versioned extended study requiring labels fixed before rankings are evaluated.

Candidate background input is `current_job_title + skills + experience_narrative`; direction input is `desired_work_directions`. Governance metadata, split, intended role, scenario and audit outputs are prohibited model inputs.

This frozen protocol applies only to candidate-to-membership ranking. The experimental JD multi-label analyzer, its phrase configuration, thresholds, and regression cases are outside this protocol and outside the reported evaluation. A future JD study requires its own annotated `job_description × Role Profile` dataset, development/test split, method selection, and freeze record.

The primary ranking metric is candidate-level nDCG at 3. Report Top-1 agreement, nDCG at 5, mean reciprocal rank, coverage and candidate-level bootstrap confidence intervals as supporting measures.

The protocol above is complete for `matching_selected`. The superseded three-annotator A/B/C draft files remain only as historical workflow artefacts and are not the current annotation design.
