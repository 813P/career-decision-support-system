# v1 archive integrity

The archived labels, selected configuration, runner and final output hashes remain unchanged and reproducible.

One documentation-only mismatch exists in `data/annotation/annotation_primary_freeze_manifest.json`:

- Recorded `docs/HUMAN_ANNOTATION_GUIDELINE.md` SHA-256: `436ee0c6e756da48deb0c3a54f701316624767de6566e7c15beb2706a1334d44`
- Current clarified guide SHA-256: `3679ba6de58121dddc94af0b401fcbc390fbf4312a278cf4a72c5c0031d73dfc`

The guide received a later researcher-role clarification. The frozen annotation CSV, candidate data, taxonomy, selected configuration, runner and historical result files still match their recorded hashes. The original freeze artifacts have not been rewritten to conceal this post-freeze documentation change.

For archival verification, use the final run manifest and reproduce the runner in a disposable copy. The standard `validate_experiment.mjs` intentionally reports the stale guide hash.
