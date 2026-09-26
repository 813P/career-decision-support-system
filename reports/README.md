# Reports

This directory records what happened in a particular study: reviewed evidence, frozen inputs, selection decisions, and evaluation results. The [documentation directory](../docs/README.md) explains the design, procedures, and interpretation. A report is evidence for a claim, rather than another copy of the project introduction.

For the completed candidate-ranking study, start with the [development selection](matching/DEVELOPMENT_PARAMETER_SELECTION.md), [selected configuration freeze](freezes/SELECTED_TFIDF_CONFIGURATION_FREEZE.md), and [full held-out evaluation](evaluation/MATCHING_V2_FULL_TEST_EVALUATION.md). Case interpretation is in the [error analysis](../docs/ERROR_ANALYSIS.md).

- `audits/` retains current audit evidence and its governance status.
- `freezes/` contains immutable-input freeze records.
- `matching/` contains development selection outputs, the frozen selected rankings and stage reports.
- `evaluation/` contains the one-time held-out test evaluation, its summary and run manifest.

Generated experiment results belong here. Logs, screenshots, inspection dumps and superseded reports are
intentionally excluded from the repository.
