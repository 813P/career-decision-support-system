# Selected TF-IDF Configuration Freeze

**Status:** Frozen  
**Date:** 2026-09-24  
**Configuration:** `tfidf + mean_all` with 0.5 background / 0.5 direction weights  
**Development scope:** 20 candidates × 18 memberships = 360 judgements  
**Test scope:** 40 candidates × 18 memberships = 720 judgements  

## Configuration checksum

- `config/selected/tfidf.json`: `6d25ebd7715178cd38544b58d7189bf6f30671e43875383c435cc137c7cd32e1`

**Submission-path amendment, 2026-09-26:** The selected configuration now uses the conclusion-oriented filename `tfidf.json`; runtime references and the evaluation-code checksum were updated accordingly. The selected method, aggregation, weights, inputs, rankings, metrics, and test outputs did not change.

## Guardrails

- Development labels determine the method and aggregation.
- All 40 test labels are evaluation-only.
- No method, target, weight, aggregation, or candidate evidence is changed after the freeze.
- Historical files and results remain unchanged.
