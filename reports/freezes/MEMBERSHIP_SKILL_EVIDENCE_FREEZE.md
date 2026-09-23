# Membership and Skill Evidence Freeze

**Status:** Frozen  
**Freeze date:** 2026-08-16  
**Scope:** Matching-entry input package

## Frozen scope

- 15 unique ESCO occupations.
- 18 Occupation–Analytical Role Profile memberships across 5 Role Profiles.
- Skill Evidence V1, including the reviewed core/supporting/excluded logic.
- Direction targets and scoped deterministic aliases used to build membership evidence.

The source skill audit contains 552 ESCO membership-level decisions: 181 core, 138 supporting and 233 excluded. It also retains 60 reviewed role-specific project-custom assignments. The derived membership file contains 313 core and 213 supporting evidence occurrences after membership construction and custom-evidence expansion.

ESCO-optional relations, excluded decisions and candidate-derived/governance fields are outside this freeze and may not enter matching, scoring, explanations or missing-evidence output.

## Frozen artifact hashes

| Artifact | SHA-256 |
|---|---|
| `taxonomy/role_profiles.json` | `e6c28291d16f5aecb12de6f8389bbdad6b7e7af5efd23bc916de2ca7db48d83e` |
| `taxonomy/esco_occupations.json` | `2e09771ab0c8b364568c92ad30332076369ff6ab59ca007ece8382298f3ec9e6` |
| `taxonomy/role_skill_evidence.json` | `b66ec4e997d60c6a7a55e13057d55a3bae1de9107696672345bd88bc5ae7b2d7` |
| `reports/audits/role_skill_audit.json` | `d0acda31468370c7b23c13ca887189384b3fc7940725277953a69832238c8680` |
| `taxonomy/role_occupation_memberships.json` | `ab942b647f6dfef05e024038c30ab2d918b99240df945157732068b274d76bd5` |

The full source and derived hash map is stored in `taxonomy/manifest.json`.

## 2026-08-29 structural relocation

The frozen taxonomy artifacts were consolidated under the top-level `taxonomy/` directory to separate occupational definitions and evidence from runtime configuration and candidate-instance data. The skill audit moved to `reports/audits/`. Retired Job Family and Prototype fields were removed from the ESCO occupation snapshot. This maintenance change does not alter the five Role Profiles, the 18 active memberships, or the reviewed skill-evidence decisions; hashes and path references were refreshed after relocation.

## Change control

Any addition, removal, tier change, label normalisation, optional-skill inclusion, membership reassignment, direction-target change or alias change requires:

1. a new version rather than an in-place overwrite;
2. impact review against the frozen candidate and Role Profile inputs;
3. automated validation;
4. researcher sign-off; and
5. a new freeze record.

Aggregation selection, Hybrid parameters, labels, evaluation metrics and final test execution are not frozen by this record. They remain downstream matching decisions and must be selected using development data only.
