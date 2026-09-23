# Human Annotation Freeze

**Status:** Frozen  
**Freeze date:** 2026-08-22  
**Scope:** Primary human relevance judgements for the selected matching evaluation

## Frozen dataset

- `data/annotation/annotation_primary.csv`
- 30 candidates: all 20 development candidates and 10 researcher-stratified test candidates
- 18 occupation–Role Profile memberships per candidate
- 540 unique `candidate_id × membership_id` judgements
- one blinded annotator (`annotator_813`)

The planned second-annotator reliability sample was not executed. The project therefore does not report inter-annotator agreement, adjudication, or reliability statistics. Evaluation using this dataset must be described as a single-annotator exploratory offline evaluation.

## Label distribution

| Human relevance | Definition | Count | Share |
|---:|---|---:|---:|
| 0 | Weak / No Match | 282 | 52.2% |
| 1 | Partial Match | 168 | 31.1% |
| 2 | Strong Match | 90 | 16.7% |
| **Total** |  | **540** | **100.0%** |

## Quality-control result

- 540 rows and 540 unique candidate–membership pairs
- 30 complete candidate blocks, each containing all 18 memberships
- each membership represented for all 30 candidates
- no missing, blank, or invalid `human_relevance` labels
- no label-1 row missing `evidence_strength`
- no invalid `evidence_strength` value
- no missing or invalid annotation timestamp
- no model rank or score exposed during annotation
- no candidate-profile or membership-metadata mismatch
- all nonblank `annotation_reason` values standardised as concise English evidence phrases

## Frozen checksum

`data/annotation/annotation_primary.csv`  
SHA-256: `eb5e8140038d909a8d96f5b16d488a4667cf63d87d926f3fc71c3493fe7b4d76`

The complete source and documentation hash set is stored in `data/annotation/annotation_primary_freeze_manifest.json`.

**Schema-key amendment, 2026-09-06:** Candidate context columns were renamed from `current_role` to `current_job_title` and from `desired_roles` to `desired_work_directions`. No candidate value, human label, rationale, evidence-strength value, annotator identifier, or timestamp changed; the checksum change records only the header migration.

## Change control

Do not edit the frozen file in place. Any later change to a label, evidence-strength value, rationale, candidate field, membership field, annotator identifier, or timestamp requires:

1. a new annotation version;
2. a fresh structural and semantic quality-control run;
3. an updated checksum manifest; and
4. a new freeze record.
