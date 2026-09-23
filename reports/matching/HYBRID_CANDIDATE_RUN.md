# Semantic and Hybrid Candidate Run

**Run date:** 2026-08-16  
**Status:** Passed  
**Scope:** Development-only, unlabelled candidate generation

## Semantic output

- Candidates: 20 development profiles.
- Intermediate scoring units: 18 Occupation–Role Profile memberships per candidate.
- Aggregation stored in the Semantic entry file: `mean_top_2` engineering default.
- Embedding model: frozen `sentence-transformers/all-MiniLM-L6-v2` revision.
- Execution: CPU, forced offline cache.
- Combined embedding SHA-256: `4a9a317230877eacfa7f8d27e150464e99537341d93b4fe64a7db669800270a9`.
- Test rankings: not generated.

## Hybrid candidate grid

- Aggregations: `max`, `mean_top_2`, `mean_all`.
- Structured weights: `0`, `0.25`, `0.5`, `0.75`, `1`.
- Semantic weight: `1 - structured_weight`.
- Total candidate trials: 15.
- Candidates per trial: 20.
- Role Profile rankings per candidate: 5.
- Labels used: no.
- Metrics computed: no.
- Parameter recommendation: no.
- Test rankings: not generated.

## Output hashes

| Output | SHA-256 |
|---|---|
| `development_semantic_entry.json` | `dd6cc7de45fbab650983c9c8c8470bb0e7a466981a6e89f366ea4103ca3955eb` |
| `development_hybrid_candidate_grid.json` | `ef5ee30bbce94154eb8abba768e9490e3c8e42905c7f93a83a555f83f6a61ca7` |

These files establish the pre-annotation candidate grid. They must not be used to choose an aggregation or Hybrid weight until the resolved development labels are available.
