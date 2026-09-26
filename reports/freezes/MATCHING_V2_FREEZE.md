# Matching v2 Freeze

**Status:** Frozen  
**Date:** 2026-09-24  
**Configuration:** `tfidf + mean_all` with 0.5 background / 0.5 direction weights  
**Development scope:** 20 candidates × 18 memberships = 360 judgements  
**Test scope:** 40 candidates × 18 memberships = 720 judgements  

## Configuration checksum

- `config/selected/tfidf.json`: `2eb1cd051ee9fff2a7ffd20b872d8fc82e644f7007e73357a38402a8ceb95fb1`

**Submission-path amendment, 2026-09-26:** The selected configuration was renamed from `matching_v2.json` to `tfidf.json`, and runtime references plus the evaluation-code checksum were updated accordingly. The selected method, aggregation, weights, inputs, rankings, metrics, and test outputs did not change.

## Guardrails

- Development labels determine the method and aggregation.
- All 40 test labels are evaluation-only.
- No method, target, weight, aggregation, or candidate evidence is changed after the freeze.
- v1 files and results remain unchanged.
