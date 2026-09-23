# Occupational taxonomy

This directory contains the occupational knowledge model used to define the
targets of matching and annotation. It is reference knowledge, not a collection
of candidate observations or human relevance labels.

## Contents

- `role_profiles.json`: five project-defined Analytical Role Profiles and their
  scope boundaries.
- `esco_occupations.json`: the reviewed ESCO v1.2.1 occupation snapshot used by
  this project.
- `role_skill_evidence.json`: reviewed project-custom and ESCO skill evidence.
- `role_occupation_memberships.json`: the 18 derived occupation–Role-Profile
  memberships used as the primary matching and annotation targets.
- `manifest.json`: source and derived artifact hashes, freeze status and the
  associated change-control record.

## Boundary with `data/` and `config/`

- `taxonomy/` defines **what occupational targets mean**.
- `data/candidates/` contains **who is being matched**.
- `data/annotation/` contains **human relevance judgements** for
  `candidate_id × membership_id` pairs.
- `config/` defines **how matching components use the frozen inputs**.

Candidate construction and governance metadata must not be used to create,
score or validate a relevance answer. In particular, a candidate's sampling
Role Profile is a dataset-coverage stratum, not a ground-truth label.

## Source, derived artifact and change control

`role_profiles.json`, `esco_occupations.json` and `role_skill_evidence.json` are
reviewed source artifacts. `role_occupation_memberships.json` is derived from
those sources together with the frozen shared matching inputs recorded in the
manifest.

The package is frozen. Any semantic change requires a new version, automated
validation, impact review, researcher sign-off and a new freeze record. See
`reports/freezes/MEMBERSHIP_SKILL_EVIDENCE_FREEZE.md`.
