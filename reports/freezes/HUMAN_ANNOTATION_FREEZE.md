# Human Annotation v2 Freeze

**Status:** Frozen for the full v2 evaluation  
**Freeze date:** 2026-09-24  
**Annotation unit:** `candidate_id × membership_id`

## Frozen datasets

- `data/annotation/annotation_all_60.csv`: 60 candidates, 1,080 unique judgements.
- `data/annotation/annotation_test_full.csv`: all 40 test candidates, 720 unique judgements.
- 18 occupation–Role Profile memberships per candidate.
- One researcher-annotator (`annotator_813`).

The 20 development candidates support method and aggregation selection. All 40 test candidates are evaluation-only. No independent second-annotator study was completed, so the evaluation is a single-annotator exploratory offline study.

## Complete label distribution

| Human relevance | Definition | Count | Share |
|---:|---|---:|---:|
| 0 | Weak / No Match | 614 | 56.9% |
| 1 | Partial Match | 279 | 25.8% |
| 2 | Strong Match | 187 | 17.3% |
| **Total** |  | **1,080** | **100.0%** |

The test-only distribution is 428 label-0, 169 label-1, and 123 label-2 judgements.

## Quality-control result

- 1,080 rows and 1,080 unique candidate–membership pairs.
- 60 complete candidate blocks, each containing all 18 memberships.
- No missing, blank, or invalid `human_relevance` labels.
- No label-1 row missing `evidence_strength`; no invalid evidence-strength value.
- No model rank or score exposed during annotation.
- No invalid annotation timestamp.

## Frozen checksums

- `annotation_all_60.csv`: `e67a0f7e167ac67baa4170397fbfcba0fcf308693fed4dc45b96f5a679ab9a56`
- `annotation_test_full.csv`: `52b43a28aa156f7bbc2346aa68aa2610bac359808c68567fd86485fd6e45ce84`

The complete source and documentation hash set is stored in `data/annotation/annotation_v2_manifest.json`.

## Change control

Do not edit frozen files in place. Any candidate evidence, label, rationale, evidence-strength value, membership, matching target, method, parameter, or split change requires a new study version, validation run, checksum manifest, and freeze record.
