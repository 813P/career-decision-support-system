# Matching v2 Freeze

**Status:** Frozen  
**Date:** 2026-09-24  
**Configuration:** `tfidf + mean_all` with 0.5 background / 0.5 direction weights  
**Development scope:** 20 candidates × 18 memberships = 360 judgements  
**Test scope:** 40 candidates × 18 memberships = 720 judgements  

## Configuration checksum

- `config/selected/matching_v2.json`: `3b4ecc949f88fcc164d9033b19765756ce72192aef6f3c89dce90fe47865c067`

## Guardrails

- Development labels determine the method and aggregation.
- All 40 test labels are evaluation-only.
- No method, target, weight, aggregation, or candidate evidence is changed after the freeze.
- v1 files and results remain unchanged.
