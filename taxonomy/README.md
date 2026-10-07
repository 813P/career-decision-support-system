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

## Current study status

The five Role Profile definitions and occupation mappings are frozen. The
`pending_audit` skill-evidence status and `open` aggregation status in
[`role_profiles.json`](role_profiles.json) describe downstream work that was
still pending when that definition-stage record was frozen on 2026-08-09.
The skill review was subsequently completed and frozen on 2026-08-16 in the
[Membership and Skill Evidence Freeze](../reports/freezes/MEMBERSHIP_SKILL_EVIDENCE_FREEZE.md).
Development selection subsequently fixed `mean_all` aggregation in the
[Selected TF-IDF Configuration Freeze](../reports/freezes/TFIDF_CONFIGURATION_FREEZE.md)
on 2026-09-24. Those separate freeze records define the completed study status;
the earlier source fields are retained to preserve the recorded input hashes.

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
the [Membership and Skill Evidence Freeze](../reports/freezes/MEMBERSHIP_SKILL_EVIDENCE_FREEZE.md).
