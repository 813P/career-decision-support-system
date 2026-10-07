# Candidate Dataset System Review

- Review date: 2026-08-16
- Dataset: candidate-profiles
- Scope: 60 candidates, model-facing JSON, governance metadata, and the reviewed candidate audit workfile

## Version note

The reviewed workbook, `candidate_profile_audit.xlsx`, was created for the candidate-content version formerly identified as v5. Candidate schema 1.2 only normalised metadata placement, and schema 1.3 only renamed `current_role` to `current_job_title` and `desired_roles` to `desired_work_directions`. Candidate values, IDs, development/test membership, and relevance labels were not changed. The retained workbook therefore remains the applicable human-audit evidence for the current dataset.

## Audit-record clarification — 2026-10-07

All 60 candidate records were manually reviewed by the project researcher. The workbook's `reviewer_id` values were corrected to `project_researcher` to reflect that review. The recorded review date remains 2026-08-16; this clarification date is the metadata-correction date. The `privacy_reason` column was removed. Candidate evidence, split membership, audit decisions, qualitative review tags, and relevance labels were not changed.

The retained `evidence_strength` tags (`strong`, `medium`, `developing`, `weak`, and `mixed`) correspond to the construction scenarios. They describe the content-review record and are not independent relevance labels or annotation-confidence measures.

## Distribution checks

| Check | Result |
|---|---|
| Total candidates | PASS (60) |
| Role profile counts | {"strategic_analysis":12,"business_performance_goal_management":12,"business_strategy_focused_analysis":12,"data_analytics":12,"data_science":12} |
| Scenario counts | {"Direct Match":15,"Adjacent Transfer":13,"Career Transition":12,"Weak / Low Evidence":10,"Ambiguous Case":10} |
| Candidate IDs | PASS (unique) |
| Ambiguous secondary profile | PASS (10/10 distinct) |

## Content quality checks

| Check | Result |
|---|---|
| Narrative has concrete action verb | 60/60 |
| Narratives >= 80 characters | 60/60 |
| Intended-profile evidence cue | 60/60 |
| Ambiguous secondary evidence cue | 10/10 |
| Exact skill phrase repetition | Not required; mechanical copying check passed |
| No-skill-cue rows | 13 (reviewed as semantic rather than exact phrase support) |
| Maximum narrative Jaccard | C011/C036 = 0.271 |
| Taxonomy/PII/ESCO/leakage checks | PASS; current validation entry point: `experiments/validation/validate_candidate_data.mjs` |

## Conclusion

No blocking or obvious content-quality issue was found. The reviewed candidate content remains eligible for use under the current Candidate Dataset schema.
