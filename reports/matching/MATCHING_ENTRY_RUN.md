# Matching Entry Run

**Run date:** 2026-08-16  
**Status:** Passed  
**Scope:** Development-only engineering entry run

## Results

- Frozen input rebuild check: unchanged; no frozen artifact was overwritten.
- Candidate validation: 60 profiles, 20 development, 40 test, zero taxonomy leakage and zero ESCO copy sequences.
- Experiment input validation: 15 occupations, 18 memberships, 5 Role Profiles, 300 blinded annotation pairs and 25 pilot pairs.
- Structured dry run: 20 development candidates; labels not used.
- TF-IDF dry run: 20 development candidates; labels not used.
- Node matching tests: 12 passed.
- Python tests: 8 passed.
- Test rankings generated: no.

## Output hashes

| Output | SHA-256 |
|---|---|
| `development_structured_entry.json` | `47c21cb5a211460f8ba955be6b0f70a98abb31338ce4adc7843bbd34b6f202ad` |
| `development_tfidf_entry.json` | `2e910b71e70805a789c7c58595eb11ccd1a67ffcebf9425f19fc07d2b570fbf8` |

These outputs demonstrate pipeline readiness only. They are unlabelled engineering results and must not be reported as research performance.
