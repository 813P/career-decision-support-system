# Candidate Audit Status

**Status:** Retained; non-blocking for matching  
**Recorded:** 2026-08-16

The current dataset contains 60 synthetic candidates, split into 20 development and 40 frozen test profiles. Content and privacy review are complete. Candidate Audit is a governance record, not a source of relevance labels and not a matcher input.

## Retained artifacts

| Artifact | SHA-256 |
|---|---|
| `candidate_profile_audit.xlsx` | `d1fd88e8fb6bd6c3ce061c69a1ef49b15a4f02e96bf7967de1e6f979ea1aae6d` |
| `CANDIDATE_DATASET_SYSTEM_REVIEW.md` | `d6e77c8206a6271328c869c29e8663f8ac69e34521f53ae04afe22461f9baaf2` |

These files preserve the audit outcome used to approve the current candidate set. The canonical candidate hashes remain in `data/candidates/manifest.json`.

## Use restriction

Audit decisions, evidence-strength notes, scenario categories, intended Role Profiles and other construction metadata must not enter scoring, ranking, explanations or annotator views. Later audit corrections require a new candidate dataset version, impact review and a new freeze record; they must not overwrite this result silently.
