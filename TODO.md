# TODO

- [ ] **Evaluate the experimental JD path:** Build a representative, licensed or fully
  synthetic JD corpus and blind-label every `job_description × Role Profile` pair as
  `0 = insufficient`, `1 = supporting`, or `2 = primary`. Freeze development/test splits
  and metrics before comparing the current deterministic evidence-group baseline with
  JD-specific TF-IDF, semantic, and hybrid methods. Do not reuse the candidate-side test
  result or tune against the same held-out JD cases used for final reporting.

- [ ] **Optional audit refinement:** Review exclusions currently labelled
  `not_substantive_for_this_role_profile` and replace the generic reason with a
  more specific existing or newly documented reason code where the evidence
  supports it. This is a non-blocking quality improvement; the current audit is
  complete because every excluded skill already has a recorded reason. If the
  frozen audit is changed, update the affected taxonomy artifacts, manifest
  hashes, freeze record, validation, and researcher sign-off together.
