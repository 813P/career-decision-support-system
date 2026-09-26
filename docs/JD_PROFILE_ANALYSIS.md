# Experimental JD Role-Profile Analysis

## Status and boundary

The JD path is an experimental, deterministic, multi-label evidence analysis. It is not
part of the frozen candidate-ranking study and has not yet been evaluated on an annotated
JD dataset. Its scores are evidence-group coverage values, not probabilities and not
candidate–job fit scores.

The five canonical Role Profiles remain defined by `taxonomy/role_profiles.json`. The JD
path reuses their IDs and boundaries so its output can be compared with the candidate
path, but it does not use the frozen TF-IDF model or the 18 occupation memberships.

## JD path

```text
job description
  -> ordered, contiguous phrase matching
  -> positive responsibility groups + counter-evidence groups
  -> anchor checks for substantive work purpose
  -> weighted evidence-group coverage
  -> primary / supporting / insufficient
  -> multi-label result or abstention
```

Implementation and configuration:

- `src/career_matcher/jd_profiles.py`: normalization, ordered phrase matching, evidence
  aggregation, anchor rules, multi-label classification, and abstention.
- `config/shared/jd_evidence_phrases.json`: versioned bilingual evidence groups, weights,
  anchors, counter-evidence, and thresholds.
- `src/career_matcher/webapp.py`: loads both runtimes and routes `/api/parse-jd` to the JD
  analyzer.
- `webapp/app.js`: renders primary, supporting, insufficient, and counter-evidence groups.
- `tests/test_jd_profiles.py`: regression cases for adjacent terms, business-analysis JDs,
  Data Science JDs, Chinese evidence, and low-information abstention.

## Candidate path

```text
current role + skills + experience narrative
  -> background evidence

desired roles
  -> direction evidence

both channels
  -> frozen TF-IDF scoring of 18 occupation–Role Profile memberships
  -> 0.5 background + 0.5 direction
  -> mean_all aggregation
  -> ranked five Role Profiles + occupation and skill evidence
```

The candidate path uses `src/career_matcher/role_profiles.py`, the frozen matching contract
in `config/selected/tfidf.json`, and the evidence in
`taxonomy/role_occupation_memberships.json`. Its reported evaluation applies only to this
path.

## Relationship between the paths

The paths answer different questions:

- Candidate path: "Which analytical directions are supported by my current evidence and
  stated direction?"
- JD path: "Which kinds of analytical work are substantively present in this job?"

They share Role Profile IDs so a later decision-support layer can compare candidate-side
evidence with JD-side work composition. The current implementation deliberately does not
combine the two scores because the values have different meanings and evaluation status.

## Change control

Changes to JD phrases, weights, anchors, or thresholds require a new JD configuration
version and regression tests. They do not modify the frozen candidate configuration.
Before JD results are presented as validated performance, create and blind-label a
representative JD dataset, predeclare metrics, select parameters on development data, and
evaluate once on a held-out test set.
