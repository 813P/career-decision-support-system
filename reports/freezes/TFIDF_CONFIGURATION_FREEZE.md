# Selected TF-IDF Configuration Freeze

**Status:** Frozen  
**Date:** 2026-09-24  
**Configuration:** `tfidf + mean_all` with 0.5 background / 0.5 direction weights  
**Development scope:** 20 candidates × 18 memberships = 360 judgements  
**Test scope:** 40 candidates × 18 memberships = 720 judgements  

## Configuration checksum

- `config/selected/tfidf.json`: `629f772ba47017e17cbd6af1f92529e75059d5d54787da2f25927c00a07b0dea`

**Presentation amendment, 2026-09-26:** The selected configuration uses the conclusion-oriented filename `tfidf.json`; runtime references and the evaluation-code checksum were updated accordingly. The selected method, aggregation, weights, inputs, rankings, metrics, and test outputs did not change.

**Terminology and status amendment, 2026-09-27:** Documentation and machine-readable metadata now describe the `0.01` decision aid as a study-specific near-tie heuristic, use model-output-blinded researcher annotation terminology, and record development selection as complete rather than awaiting sign-off. The Semantic runtime documentation was aligned with the frozen Python 3.12.14 environment, and an unsupported online/offline equivalence statement was removed. The selected method, aggregation, weights, candidate evidence, labels, rankings, metrics, and test outputs did not change.

## Guardrails

- Development labels determine the method and aggregation.
- All 40 test labels are evaluation-only.
- No method, target, weight, aggregation, or candidate evidence is changed after the freeze.
- Historical files and results remain unchanged.
