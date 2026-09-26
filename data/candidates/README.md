# Candidate profiles

This directory is the only active candidate dataset in the repository.

- `profiles.json`: complete reviewed candidate records, including per-candidate `industry_context`.
- `development.json`: development split for documented method selection.
- `test.json`: frozen test split.
- `governance.json`: per-candidate construction, coverage and split metadata; prohibited from matching and blinded annotation.
- `coverage.csv`: one-row-per-candidate coverage table for Role Profile, scenario and split counts.
- `manifest.json`: dataset-wide provenance, review controls, status and integrity hashes.
- `../../reports/freezes/CANDIDATE_DATASET_FREEZE.md`: freeze policy.

Run `node experiments/validation/validate_candidate_data.mjs` before use.

Dataset-wide constants are recorded once in `manifest.json`, rather than repeated in every candidate row. These include synthetic provenance, construction basis, quotation control, non-identification review and the explicit statement that governance metadata is not a relevance label.

## Governance is not ground truth

`intended_role_profile` is the primary Role Profile used to stratify synthetic
candidate construction. Despite the word `intended`, it is not a judgement that
the candidate matches that Role Profile. `secondary_sampling_profile` similarly
records how an adjacent, transitional or ambiguous case was sampled. Every
governance metadata is therefore declared not to be a relevance label once at
dataset level in `manifest.json`.

The authoritative v2 relevance answers are the blinded human judgements in
`data/annotation/annotation_all_60.csv`; the held-out subset is also stored in
`data/annotation/annotation_test_full.csv`. Their unit is finer-grained:
`candidate_id × membership_id`, where a membership is one ESCO occupation in
one Role Profile context. Role Profile-level human relevance may be derived
from those frozen membership labels for secondary evaluation; it must not be
read from `governance.json`.
