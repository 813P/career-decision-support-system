# v1 archival run issues

This log records issues discovered while packaging and replaying v1. Entries remain visible after resolution so later reviews can distinguish historical limitations from newly introduced defects.

## V1-001 — Standard validation blocked by documentation hash drift

- Stage: pre-archive validation
- Command: `node experiments/validation/validate_experiment.mjs`
- Result: failed on `docs/HUMAN_ANNOTATION_GUIDELINE.md`
- Recorded SHA-256: `436ee0c6e756da48deb0c3a54f701316624767de6566e7c15beb2706a1334d44`
- Current SHA-256: `3679ba6de58121dddc94af0b401fcbc390fbf4312a278cf4a72c5c0031d73dfc`
- Impact: the standard validation command does not pass against the later clarified guide.
- Data impact: none found. Annotation labels, candidate data, taxonomy, selected configuration, runner and historical output hashes remain unchanged.
- Status: retained as a documented historical limitation; freeze artifacts were not rewritten.

## V1-002 — Initial archive omitted a unit-test dependency

- Stage: self-contained archive test
- Command: `node --test tests/role_profile_experiment.test.mjs`
- Result: `ERR_MODULE_NOT_FOUND` for `experiments/shared/ranking_selection.mjs`
- Cause: the first archive file list included the test but omitted one of its imports.
- Impact: archive packaging was incomplete; the underlying project test had already passed from the project root.
- Resolution: added the missing shared module to `studies/v1` and reran the test.
- Status: resolved; retained for traceability.

## V1-003 — GitHub CLI unavailable

- Stage: publication setup
- Result: `gh` is not installed or available on `PATH`.
- Impact: repository creation cannot use GitHub CLI.
- Planned handling: initialize and commit locally, then create/connect the GitHub repository through an authenticated browser or an explicit remote URL.
- Status: open until the remote repository is created and pushed.
