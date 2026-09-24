# Study v2 — full 40-candidate test evaluation

This directory is a self-contained, versioned extension of the original study. It preserves `studies/v1` and evaluates the frozen development-selected matching method on the complete 40-candidate test split.

## Scope

- 20 development candidates × 18 memberships = 360 development judgements.
- 40 test candidates × 18 memberships = 720 held-out test judgements.
- 60 candidates × 18 memberships = 1,080 total human judgements.
- Development-only method selection remains separate from test evaluation.
- Test labels are not used for retuning.

## Workflow

1. Validate and freeze the complete annotation matrix.
2. Regenerate Structured and TF-IDF development rankings.
3. Generate a fresh Semantic development run in the v2-pinned Python environment.
4. Compare Structured, TF-IDF, Semantic, and Hybrid methods and select from development labels only.
5. Freeze the selected v2 configuration.
6. Evaluate once on all 40 test candidates.
7. Validate output hashes and preserve a snapshot manifest.

## Key outputs

- `reports/matching/development_parameter_selection.json`
- `results/matching_v2_full_test_scores.csv`
- `reports/matching/matching_v2_full_test_rankings.json`
- `reports/evaluation/matching_v2_full_test_evaluation.json`
- `reports/evaluation/MATCHING_V2_FULL_TEST_EVALUATION.md`
- `reports/evaluation/matching_v2_full_test_run_manifest.json`

## Results

- Development method leader: Semantic, membership nDCG@3 = `0.753349`.
- Selected under the predeclared practical-tie rule: TF-IDF, membership nDCG@3 = `0.746448`.
- Selected aggregation: `mean_all`.
- Full 40-candidate test membership nDCG@3 = `0.660627` (95% candidate-bootstrap interval `[0.565457, 0.753311]`).
- Full-test membership Top-1 agreement = `0.725000`.
- Full-test Role Profile nDCG@3 = `0.898108`; Top-1 agreement = `0.900000`.

The original 10-candidate subset reproduces v1 membership nDCG@3 exactly (`0.624306`). The other 30 candidates score `0.672733`; this subgroup comparison is descriptive and is not used for retuning.

## Runtime note

The Semantic development run uses the pinned model revision in offline mode. The reproducible Python package versions are listed in `requirements-semantic-v2.txt`; the local `.venv-v2` and model cache are execution-only and are not included in the study snapshot or Git repository.

## Change control

This v2 directory is append-only after the run manifest and snapshot manifest are created. Any later method or input change requires a new study version.
