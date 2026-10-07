# Reports

This directory records what happened in a particular study: reviewed evidence, frozen inputs, selection decisions, and evaluation results. The [documentation directory](../docs/README.md) explains the design, procedures, and interpretation. A report is evidence for a claim, rather than another copy of the project introduction.

Audit records, migration notes, freeze records, run manifests, and checksums support reproducibility and change control. Start with the completed study reports below. Git tags retain historical repository versions; temporary troubleshooting logs are excluded from the current tree.

For the completed candidate-ranking study, start with the [development selection](matching/DEVELOPMENT_PARAMETER_SELECTION.md), [selected configuration freeze](freezes/TFIDF_CONFIGURATION_FREEZE.md), and [full held-out evaluation](evaluation/TFIDF_FULL_TEST_EVALUATION.md). Case interpretation is in the [error analysis](../docs/ERROR_ANALYSIS.md).

- `audits/` retains current audit evidence and its governance status.
- `freezes/` contains immutable-input freeze records.
- `matching/` contains development selection outputs, the frozen selected rankings and stage reports.
- `evaluation/` contains the one-time held-out test evaluation, its summary and run manifest.

## Historical fields in retained records

- The `pending_audit` and `open` fields in the frozen Role Profile source describe its definition stage. Later skill and aggregation freezes record the completed decisions; see the [taxonomy guide](../taxonomy/README.md#current-study-status).
- [`development_semantic_entry.json`](matching/development_semantic_entry.json) is the raw, development-only prediction record used in the completed method comparison. Its `0.1-draft` format identifiers and `engineering_only_unlabelled` status belong to prediction generation, before scores were joined with human labels for evaluation. They do not describe the status of the completed study. The [Development Parameter Selection Report](matching/DEVELOPMENT_PARAMETER_SELECTION.md) records the evaluated comparison and selected configuration. Raw outputs and their format identifiers remain unchanged so that the frozen checksum chain is preserved.
- The [candidate audit status](audits/CANDIDATE_AUDIT_STATUS.md) records the current manual-review metadata and the retained workbook's construction-stage field meanings.

Generated experiment results belong here. Logs, screenshots, inspection dumps and superseded reports are
intentionally excluded from the repository.
