# Annotation data

## Current authority

- The project uses one annotation unit throughout the active study: `candidate_id × membership_id`.
- `annotation_primary.csv` is the authoritative frozen relevance-label dataset.
- `annotation_primary_freeze_manifest.json` records its scope, quality controls and hashes.
- It contains 540 completed candidate–membership judgements: all 20 development candidates and the 10 test candidates selected before model-output inspection, each judged against 18 memberships.
- `portfolio_annotation_selection_manifest.json` records the pre-model selection of the 10-candidate test subset. Its original output hashes describe the files at creation time; current annotation integrity is governed by the later primary freeze manifest.
- The blank membership-level template is stored at `docs/templates/annotation_template.csv`, outside the data directory.
- The unlabelled CSV prepared for the planned second-annotator study is not retained as project data. Its selection provenance remains in `portfolio_annotation_selection_manifest.json`, and it can be regenerated explicitly with `scripts/create_portfolio_annotation_sample.py` if a separately approved reliability study is started.

This directory contains only completed primary annotation results and their governing manifests.

Superseded blank `candidate × Role Profile` pilot views and their unexecuted three-annotator workflow are not part of the active repository.

## Test coverage

The full candidate dataset contains 40 frozen test candidates. Only the preselected 10-candidate subset has primary relevance labels and can enter the current evaluation metrics. The other 30 candidates remain an untouched, unlabelled reserve pool for a separately versioned extended evaluation or reliability study.

## Reliability limitation

The current primary labels were produced by one annotator. The primary annotation is complete and frozen for the defined exploratory evaluation scope. The planned second-annotator reliability study was outside that completed scope and was not executed, so no inter-annotator reliability result is claimed. A future reliability study must use a separately approved protocol and must not alter the frozen primary labels.
