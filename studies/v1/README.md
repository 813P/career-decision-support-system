# Study v1 — selected 10-candidate test

This directory is a self-contained archival snapshot of the original matching workflow.

## Scope

- 20 development candidates used for parameter selection.
- 10 test candidates selected before model-output inspection.
- 18 occupation–Role Profile memberships per candidate.
- Frozen method: TF-IDF with `mean_all` aggregation and equal background/direction weights.
- Final evaluation: 10 × 18 = 180 held-out judgements.

## Key outputs

- `reports/matching/development_parameter_selection.json`
- `results/matching_selected_test_scores.csv`
- `reports/matching/matching_selected_test_rankings.json`
- `reports/evaluation/matching_selected_test_evaluation.json`
- `reports/evaluation/MATCHING_SELECTED_TEST_EVALUATION.md`
- `reports/evaluation/matching_selected_test_run_manifest.json`

## Verification

Run the deterministic unit tests:

```powershell
node --test .\tests\role_profile_experiment.test.mjs
```

The final-test runner refuses to overwrite archived outputs. To reproduce the run, copy this entire directory to a disposable location, delete the five files listed in `reports/evaluation/matching_selected_test_run_manifest.json`, and run:

```powershell
node .\experiments\evaluation\run_selected_test_evaluation.mjs
```

The regenerated output hashes must match the archived run manifest.

## Change control

This v1 snapshot is immutable. New annotation scopes, runners, results and comparisons belong in a separate study directory and Git version. Do not replace these inputs or outputs in place.

See `ARCHIVE_INTEGRITY.md` for the documentation-only hash drift discovered during archival.
