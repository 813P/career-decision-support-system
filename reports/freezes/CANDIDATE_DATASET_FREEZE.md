# Candidate Dataset Freeze

- Status: frozen
- Freeze date: 2026-08-16
- Records: 60
- Development split: 20
- Test split: 40
- Candidate IDs: C001–C060
- Content review: completed
- Privacy review: approved
- Relevance annotation: frozen for all 20 development and 40 test candidates

The 40-candidate test split must not be used for method selection or parameter tuning. The current evaluation uses the complete test split only after the development-selected configuration was frozen. Construction metadata remains separate from model-facing fields and is not a relevance label.

File integrity hashes are recorded in `data/candidates/manifest.json`.

## Metadata-only schema migration

On 2026-08-30, schema 1.2 normalized repeated dataset-wide metadata. `synthetic`, `construction_basis`, direct-quotation control, non-identification control, review status and the statement that governance metadata is not a relevance label are now recorded once in `data/candidates/manifest.json`. `industry_context` remains in each `data/candidates/profiles.json` record because it varies by candidate.

This migration did not change candidate evidence, candidate IDs, development/test membership, the `data/candidates/development.json` or `data/candidates/test.json` files, or any relevance annotation. Updated hashes for `data/candidates/profiles.json` and `data/candidates/governance.json` therefore record a storage-layout change rather than a new matching or annotation run.

## Field-name-only schema migration

On 2026-09-06, schema 1.3 renamed `current_role` to `current_job_title` and `desired_roles` to `desired_work_directions`. This separates candidate-side natural-language evidence from project-defined Role Profiles and ESCO Occupations. Candidate values, IDs, split membership, governance metadata, relevance labels, and scoring semantics did not change. Updated file hashes record the schema-key change only.
