# Data Card

## 1. Dataset summary

This project uses one authoritative Candidate Dataset for a controlled, offline evaluation of explainable career-direction ranking. The dataset is designed for career exploration research; it is not a hiring, screening, employability, or job-performance dataset.

There is currently no authoritative or labelled JD dataset. `experimental/jd_analysis/jd_evidence_phrases.json` is an experimental application configuration, not training data or evaluation ground truth. Consequently, the Candidate Dataset and its reported metrics cannot be used to claim validity for JD classification.

| Item | Current record |
|---|---|
| Candidate records | 60 fully synthetic, non-identifying profiles |
| Development split | 20 candidates |
| Frozen test pool | 40 candidates |
| Primary annotation coverage | All 20 development and all 40 test candidates |
| Annotation unit | Candidate × occupation–Role-Profile membership |
| Memberships per annotated candidate | 18 |
| Frozen primary judgements | 1,080: 360 development and 720 held-out test |
| Annotators | One researcher-annotator |
| Test annotation coverage | All 40 test candidates |
| Candidate freeze date | 2026-08-16 |
| Full annotation freeze date | 2026-09-24 |

The Candidate Dataset has no public iteration suffix. Its integrity is defined by the hashes in `data/candidates/manifest.json`, not by a version number embedded in its name.

## 2. Candidate composition

Each of the five Analytical Role Profiles contributes 12 candidates. The dataset intentionally covers five construction scenarios:

| Scenario | Count |
|---|---:|
| Direct Match | 15 |
| Adjacent Transfer | 13 |
| Career Transition | 12 |
| Weak / Low Evidence | 10 |
| Ambiguous Case | 10 |
| **Total** | **60** |

The 20-candidate development split contains four candidates from every Role Profile and four candidates from every scenario. The scenario distribution is controlled coverage for method and boundary testing; it is not an estimate of candidate prevalence in any labour market.

Candidate IDs are the neutral sequential values `C001`–`C060`. They do not encode split, intended Role Profile, scenario, or expected relevance.

## 3. Candidate fields and data separation

The model-facing schema contains:

- `candidate_id`;
- `current_job_title`;
- `desired_work_directions`;
- `skills`;
- `experience_narrative`; and
- `years_experience`.

Current matching uses `current_job_title`, `skills`, and `experience_narrative` as background evidence and `desired_work_directions` as direction evidence. `years_experience` is descriptive context only and is excluded from the current relevance score.

Construction and governance metadata is isolated in `data/candidates/governance.json`. It includes split, intended Role Profile, secondary sampling profile, scenario, and review controls. Here, `intended_role_profile` means the primary stratum used to construct and balance the synthetic dataset; it does not assert that the candidate matches that profile. The field name is retained for frozen-dataset compatibility. These fields are prohibited from matching and blinded annotation and must not be treated as relevance ground truth.

The two layers deliberately have different units. Governance describes one candidate's construction provenance and therefore has one row per candidate. Annotation answers the research question at the system's primary target level and therefore has one row per `candidate_id × membership_id`. The only authoritative relevance labels are the frozen annotation values. For secondary Role Profile evaluation, membership labels are aggregated to the five profiles after annotation; governance fields are never used as answers.

| Data class | Authoritative location | Permitted use |
|---|---|---|
| Full reviewed profiles | `data/candidates/profiles.json` | Dataset audit and traceability |
| Development model input | `data/candidates/development.json` | Method and aggregation selection only |
| Test model input | `data/candidates/test.json` | Complete frozen held-out evaluation set |
| Construction metadata | `data/candidates/governance.json` | Governance audit and post-hoc descriptive slicing only |
| Candidate freeze | `data/candidates/manifest.json`, `reports/freezes/CANDIDATE_DATASET_FREEZE.md` | Integrity and change control |
| Complete labels | `data/annotation/annotation_all_60.csv` | Frozen development and test ground truth |
| Test labels | `data/annotation/annotation_test_full.csv` | Frozen 40-candidate test ground truth |
| Annotation freeze | `data/annotation/annotation_v2_manifest.json` | Scope, quality control, and hashes |

## 4. Construction, review, and privacy

**Researcher-role clarification:** The sole researcher used AI assistance to draft the 60 synthetic candidates, reviewed them, and supplied all 1,080 relevance labels. The annotation view hid model outputs and construction metadata, but prior involvement in design and construction limits independence. No independent second annotator participated. The data-source policy separately records five de-identified real-person seed profiles as controlled synthesis references, excluded from released ranking inputs.

Profiles were constructed to express plausible work evidence and career direction without copying Analytical Role Profile definitions, ESCO descriptions, task lists, or expected-answer labels. Automated and human review covered:

- schema completeness and candidate-ID uniqueness;
- content plausibility and concrete work evidence;
- skills-to-narrative support;
- scenario and Role Profile coverage;
- development/test separation;
- duplicate and near-duplicate narratives;
- taxonomy and ESCO text leakage;
- seniority and protected-attribute leakage; and
- privacy and non-identification.

The profiles are fully synthetic and do not map to individual people. Names, contact details, photographs, identity numbers, exact addresses, age, gender, ethnicity, disability, religion, health information, and marital or family status are excluded. The project does not scrape recruitment-platform profiles or résumés.

## 5. Occupational taxonomy and membership evidence

The candidate data is evaluated against five project-specific Analytical Role Profiles supported by 15 reviewed occupations from English ESCO v1.2.1. Eighteen many-to-many occupation–Role-Profile memberships are the primary matching and annotation targets.

- `taxonomy/role_profiles.json` contains the five project-defined Role Profiles and their boundaries.
- `taxonomy/esco_occupations.json` contains the 15 reviewed ESCO occupations and their source skills.
- `taxonomy/role_skill_evidence.json` contains reviewed project-custom and ESCO skill evidence.
- `taxonomy/role_occupation_memberships.json` contains the 18 occupation–Role-Profile membership targets used consistently by matching and annotation.
- `taxonomy/manifest.json` records the frozen source and derived artifact hashes.

Only reviewed core and supporting evidence may enter current matching. ESCO-optional relations, excluded evidence, candidate-derived terms, and governance metadata are outside the frozen evidence layer.

## 6. Human relevance annotation

One researcher-annotator judged all 60 candidates against all 18 memberships:

- 20 development candidates × 18 memberships = 360 judgements; and
- 40 test candidates × 18 memberships = 720 judgements.

The resulting 1,080 unique judgements use a three-point scale:

- `0`: weak or no credible fit;
- `1`: partial, adjacent, or plausible transitional fit; and
- `2`: strong evidence supporting both the occupation and Role Profile context.

The annotation view hid model names, scores, rankings, construction scenarios, intended profiles, split assignments, and audit decisions. This restriction did not remove the researcher-annotator's prior construction knowledge. Quality control found no duplicate candidate–membership pairs, invalid labels, missing required evidence-strength values, exposed model fields, or candidate/membership metadata mismatches.

The earlier A/B/C annotation views are superseded workflow artefacts. They are not evaluation labels. Because the planned reliability annotation was not completed, the study makes no inter-annotator agreement, consensus, adjudication, or label-reliability claim.

## 7. Development and test policy

Only the 20-candidate development split may influence method choice, Hybrid weight, aggregation selection, or other documented parameters.

The complete 40-candidate test split was annotated and frozen before final evaluation. Method and aggregation selection used only the 20-candidate development split; the selected TF-IDF configuration was then evaluated on all 40 test candidates without retuning.

## 8. Intended and prohibited uses

### Intended uses

- controlled comparison of Structured, TF-IDF, Semantic, and Hybrid matching methods;
- development-only method and aggregation selection;
- evaluation on the held-out test set against researcher relevance judgements with model outputs hidden during annotation;
- membership- and Role-Profile-level boundary and error analysis; and
- testing reproducibility, score provenance, and explanation traceability.

### Prohibited or unsupported uses

- accepting, rejecting, screening, or ranking real applicants;
- predicting employability, hiring probability, job performance, compensation, satisfaction, or career success;
- claiming calibrated probabilities of occupational fit;
- inferring protected characteristics or using seniority as a proxy for capability;
- treating missing evidence as proof that a person lacks a skill;
- treating construction metadata as human ground truth; and
- claiming validity for the Chinese or wider labour market from this dataset alone.
- using the candidate labels or candidate-side metrics as evidence that the experimental JD analyzer is accurate.

## 9. Limitations

- All candidates are synthetic, so the study cannot establish real-user or real-market validity.
- Synthetic construction may create stylistic regularities despite leakage controls.
- The taxonomy covers only five adjacent analytical Role Profiles and 15 English ESCO occupations.
- ESCO may not represent Chinese job titles, employer language, or fast-changing internet-industry boundaries.
- Primary labels come from one annotator, so human-label reliability is unknown.
- The development sample contains 20 candidates and the test sample 40; uncertainty intervals and scenario findings remain exploratory.
- The dataset contains no protected-group attributes and cannot support a protected-group fairness estimate.

## 10. Change control and reproducibility

The hashes in the candidate, matching, and annotation manifests bind the data used in the completed study. Any change to candidate text, split, membership evidence, labels, or test scope requires a new governed study record and a fresh assessment of whether earlier results remain valid.

Authoritative references:

- [`RESEARCH_DESIGN.md`](../RESEARCH_DESIGN.md);
- [`reports/freezes/CANDIDATE_DATASET_FREEZE.md`](../reports/freezes/CANDIDATE_DATASET_FREEZE.md);
- [`docs/HUMAN_ANNOTATION_GUIDELINE.md`](HUMAN_ANNOTATION_GUIDELINE.md);
- [`reports/freezes/HUMAN_ANNOTATION_FREEZE.md`](../reports/freezes/HUMAN_ANNOTATION_FREEZE.md); and
- [`reports/evaluation/MATCHING_V2_FULL_TEST_EVALUATION.md`](../reports/evaluation/MATCHING_V2_FULL_TEST_EVALUATION.md).
