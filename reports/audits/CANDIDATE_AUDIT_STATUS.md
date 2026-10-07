# Candidate Audit Status

**Status:** Retained; non-blocking for matching  
**Recorded review date:** 2026-08-16

**Record clarification:** 2026-10-07

The current dataset contains 60 synthetic candidates, split into 20 development and 40 frozen test profiles. All 60 records were manually reviewed by the project researcher; content and privacy review are complete. Candidate Audit is a governance record, not a source of relevance labels and not a matcher input.

## Retained artifacts

| Artifact | SHA-256 |
|---|---|
| `candidate_profile_audit.xlsx` | `b7b1d1832cad4a887b40ecd63fb9bc7b150d1694874139aa7406a2297d2465c1` |
| `CANDIDATE_DATASET_SYSTEM_REVIEW.md` | `1c65596b7463aadbdfe9a6419e9bf7fbd5de61ffdd486e6ce85796acc51ca83a` |

These files preserve the audit outcome used to approve the current candidate set. The canonical candidate hashes remain in `data/candidates/manifest.json`.

## Record clarification

The workbook retains the construction-stage sheet name `Candidate Audit v5`, legacy candidate field names, and qualitative review tags. It corresponds to the current candidate values, as described in the [system review](CANDIDATE_DATASET_SYSTEM_REVIEW.md).

On 2026-10-07, `reviewer_id` was standardised to `project_researcher` for all 60 manually reviewed records, correcting the previous mixed automated-check and user-review identifiers. The `privacy_reason` column was removed. Original review dates and all other cell values were preserved. This correction does not add an independent reviewer or change candidate evidence, approval outcomes, relevance labels, or ranking results.

## Use restriction

Audit decisions, evidence-strength notes, scenario categories, intended Role Profiles and other construction metadata must not enter scoring, ranking, explanations or annotator views. Changes to candidate evidence or approval outcomes require a new candidate dataset version, impact review, and a new freeze record. Administrative record corrections are documented above and refresh the audit-artifact checksums without changing the frozen research inputs.
