# Annotation data

## Current authority

- The annotation unit is `candidate_id × membership_id`.
- `annotation_all_60.csv` is the authoritative dataset: 60 candidates × 18 memberships = 1,080 judgements.
- `annotation_test_full.csv` is the derived 40-candidate held-out subset: 720 judgements.
- `annotation_manifest.json` records scope, quality checks, provenance, hashes, and consolidation of the completed annotation batches before the final freeze. Process-level correction details remain in Git history.

The complete distribution is 614 label-0, 279 label-1, and 187 label-2 judgements. Every candidate has one row for each membership; validation found no duplicate pairs, invalid relevance values, missing conditional `evidence_strength`, invalid evidence-strength values, exposed model fields, or invalid timestamps.

## Split policy

The 20 development candidates and their 360 judgements are used for method and aggregation selection. The 40 test candidates and their 720 judgements are evaluation-only. The complete test split is evaluated only after freezing the configuration; test labels must not be used for retuning.

Earlier study states remain recoverable through Git tags. They are historical records, not parallel current inputs.

## Reliability limitation

All labels were produced by one researcher-annotator using a view that hid model outputs and construction metadata. No independent second-annotator study was completed, so the project makes no inter-annotator agreement, consensus, or adjudication claim.

Do not edit frozen annotation files in place. Any label, rationale, evidence-strength, candidate, membership, or split change requires a new governed study version and freeze.
