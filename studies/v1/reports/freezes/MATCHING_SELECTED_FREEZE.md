# Selected Matching Configuration Freeze

**Status:** Frozen  
**Freeze date:** 2026-08-22  
**Configuration:** `matching_selected`

## Frozen configuration

- Method: `tfidf`
- Runtime method: `tfidf`
- Background weight: `0.5`
- Direction weight: `0.5`
- Occupation-to-Role-Profile aggregation: `mean_all`
- Primary evaluation unit: candidate × membership
- Primary metric: candidate-level membership nDCG@3
- Role Profile label derivation: maximum human relevance among memberships assigned to the Role Profile

The researcher approved this configuration after development-only comparison of Structured, TF-IDF, Semantic, and the predeclared Structured–Semantic Hybrid grid. Semantic had the highest development nDCG@3 point estimate, but TF-IDF was selected under the approved practical-tie rule because the observed gap was below `0.01`, the paired candidate-bootstrap interval included zero, and TF-IDF was the simpler interpretable configuration.

## Frozen test scope

The final evaluation is limited to the ten test candidates selected before model-output inspection:

`C010`, `C011`, `C019`, `C024`, `C027`, `C029`, `C041`, `C044`, `C054`, `C056`

This is a stratified 10-candidate test subset containing 180 candidate–membership judgements. It is not the complete frozen 40-candidate test split.

## Configuration checksum

`config/selected/matching_selected.json`  
SHA-256: `8eaa5f79ce119d65b80c0fbd0be935041735499f5fc8c4c8c108690fadf26170`

The configuration pins the hashes of the matching inputs, frozen annotations, development-selection report, scoring implementation, parameter-selection implementation, and one-time test runner.

**Metadata amendment, 2026-08-30:** the checksum changed only because candidate schema 1.2 normalized repeated dataset-wide metadata and the annotation freeze manifest recorded the new `profiles.json` hash. `test.json`, matching parameters, relevance labels and test results did not change. The previous configuration checksum was `3289b4dc00f04e4a8a6582b5d2706bed5ab1d65bcd174523432efed20ff5b22d`.

**Schema-key amendment, 2026-09-06:** candidate schema 1.3 renamed the two candidate text fields to `current_job_title` and `desired_work_directions`. Candidate values, scoring semantics, matching parameters, relevance labels, and reported test results did not change. Input and configuration hashes were refreshed to record the engineering migration.

## Test and change control

1. Generate and evaluate rankings for the frozen 10-candidate subset once.
2. Do not compare alternative methods, weights, or aggregations on test data.
3. Do not change labels after viewing test results.
4. Do not retune this configuration after test evaluation.
5. Any later engineering rerun must use a new version and must not be represented as an independent confirmatory test.
