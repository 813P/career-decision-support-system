# Candidate Profile Schema

**Schema name:** `CandidateProfile`  
**Schema version:** 1.3  
**Current research dataset:** `data/candidates`  
**Status:** Candidate evidence frozen on 2026-08-16; metadata layout normalized in schema 1.2 on 2026-08-30; candidate field names clarified in schema 1.3 on 2026-09-06; primary annotation is frozen for 20 development and 10 preselected test candidates

## 1. Purpose

This document defines the candidate data contract used by the matching system and separates three kinds of information that must not be mixed:

1. model-facing candidate evidence;
2. governance-only construction metadata; and
3. human audit and annotation outputs.

The source-of-truth implementation is `src/career_matcher/schemas.py`. This document adds research meaning, permitted use, CSV representation, privacy boundaries, and the audit-and-freeze workflow.

## 2. Model-Facing Candidate Schema

Only the following six fields belong to the public `CandidateProfile` contract.

| Field | Type | Required | Current code constraint | Research meaning | Current ranking use |
|---|---|---:|---|---|---|
| `candidate_id` | string | Yes | Non-empty; unique within an input file | Stable pseudonymous record identifier | Join and traceability only |
| `current_job_title` | string | Yes | Non-empty | Current or most recent substantive job title, recorded as candidate-side natural language rather than an ESCO concept | Rules title evidence; lexical and semantic text |
| `desired_work_directions` | array of strings | Yes | Array; currently may be empty | Naturally worded desired work or development direction, not a Role Profile assignment or ESCO occupation mapping | Rules direction evidence; lexical and semantic text |
| `skills` | array of strings | Yes | Array; currently may be empty | Skills claimed by the candidate record and supported where possible by the experience narrative | Essential/optional skill matching; lexical and semantic text |
| `experience_narrative` | string | Yes | String; current code permits an empty string | Evidence-based work experience narrative describing context, analytical contribution, methods, ownership, and decision or action | Lexical and semantic text |
| `years_experience` | number | Yes | Numeric and non-negative | Descriptive career context only | Excluded from the current Role Profile relevance score |

`desired_work_directions`, `skills`, and `experience_narrative` are conceptually required evidence even though the current parser accepts empty values. Empty values must therefore be flagged during candidate audit. For backward compatibility, the parser accepts legacy `profile_text` input, but the Candidate Dataset and all new outputs use `experience_narrative`. Supplying both names with conflicting values is invalid.

The reviewed master file `profiles.json` also retains `industry_context`. It varies by candidate and supports coverage description, but it is not part of the public `CandidateProfile` contract and must not enter the current ranking score or blinded relevance annotation.

### 2.1 Terminology boundary

- `current_job_title` and `desired_work_directions` are candidate-side natural-language evidence. They do not contain or imply an ESCO occupation identifier.
- A **Role Profile** is a project-defined analytical-work construct used to group work by substantive purpose.
- An **Occupation** is an externally sourced ESCO concept identified by an ESCO URI.
- Candidate evidence is scored against reviewed occupation–Role-Profile memberships. The three concepts are related by matching, but they are not interchangeable entities.

## 3. Field Semantics and Content Rules

### 3.1 `candidate_id`

- Must not contain a real name, email address, employee number, or other directly identifying information.
- Must remain stable across model input, governance metadata, audit records, annotation records, and evaluation output.
- Must not encode the intended relevance answer. The Candidate Dataset uses neutral sequential identifiers `C001` through `C060`; split, sampled Role Profile, and scenario remain in separate governance metadata.

### 3.2 `current_job_title`

- Records the natural-language title of the candidate's substantive work, not grade, management level, team size, reporting line, IC/POC status, or organisational prestige.
- Is not assumed to be an ESCO preferred title and must not be treated as an ESCO occupation without a separate, explicit mapping field.
- Must not be treated as sufficient evidence by itself; task and experience evidence take priority.
- Seniority or management words should be removed when they do not change the substantive work content.

### 3.3 `desired_work_directions`

- Represents the candidate's stated development intention.
- Should use natural career-language rather than copying an Analytical Role Profile name, definition, ESCO title, or expected answer.
- May contain more than one direction where the candidate is genuinely exploring alternatives.
- Aspiration alone is not evidence of current capability.
- Is not an assigned Role Profile and is not a list of ESCO occupations.

### 3.4 `skills`

- Contains concise skill labels, not personality judgements or protected attributes.
- Each material skill should be credible in relation to `experience_narrative`; unsupported or implausibly broad skill lists must be revised.
- A missing skill means that the supplied record contains no evidence for it, not that the person lacks the ability.
- Skill wording may be normalised for matching, but the original reviewed wording must remain traceable.

### 3.5 `experience_narrative`

- Adds evidence rather than repeating `current_job_title`, `desired_work_directions`, `skills`, or `years_experience` as a template sentence.
- Should describe a plausible work episode: context or problem, evidence or method, analytical contribution or ownership, and result, decision, or action.
- Must not copy Analytical Role Profile definitions, typical-task lists, skill lists, or ESCO descriptions.
- Must not include names, contact information, protected attributes, employer-confidential details, or direct résumé quotations.
- Absence of evidence must not be rewritten as a claim that a candidate lacks an ability.

### 3.6 `years_experience`

- Is retained for descriptive context and future research only.
- Must not contribute to current relevance labels or rankings.
- Must not be repeated in `experience_narrative` or used as a proxy for seniority, management readiness, or capability.
- Should be hidden from relevance annotators in the current study.

## 4. Serialization

### 4.1 JSON

```json
{
  "candidate_id": "C001",
  "current_job_title": "Reporting Analyst",
  "desired_work_directions": ["own planning and performance cycles"],
  "skills": ["SQL", "metric definitions", "management reporting"],
  "experience_narrative": "Automated recurring reports and facilitated metric-definition workshops, while assisting with target and forecast assumptions.",
  "years_experience": 3
}
```

### 4.2 CSV

CSV files must use UTF-8 or UTF-8 with BOM. `desired_work_directions` and `skills` are semicolon-delimited within a cell.

```csv
candidate_id,current_job_title,desired_work_directions,skills,experience_narrative,years_experience
C001,Reporting Analyst,own planning and performance cycles,SQL;metric definitions;management reporting,"Automated recurring reports and facilitated metric-definition workshops, while assisting with target and forecast assumptions.",3
```

The candidate CSV contains model-facing fields only. Governance, audit, annotation, protected, and identifying fields must not be appended to the model input file.

## 5. Governance-Only Metadata

The following fields are stored separately and must never enter feature generation, ranking, model selection, or independent relevance annotation.

| Field | Purpose |
|---|---|
| `split` | Development/test assignment |
| `intended_role_profile` | Sampling profile used during synthetic construction; not a label |
| `secondary_sampling_profile` | Adjacent or transition profile used to create a boundary case |
| `scenario_category` | Candidate-role relationship scenario: `Direct Match`, `Adjacent Transfer`, `Career Transition`, `Weak / Low Evidence`, or `Ambiguous Case` |

These fields may be shown to the candidate-content reviewer because that reviewer is auditing the synthesis process. They must be hidden from relevance annotators.

`industry_context` remains in `profiles.json`, rather than being moved into governance, because it is part of the reviewed descriptive master record. It remains prohibited from matching and blinded annotation.

## 6. Dataset-Level Metadata

Facts that apply uniformly to all 60 candidates are recorded once in `manifest.json`, not repeated in every profile or governance row:

- synthetic provenance;
- construction basis;
- direct-quotation control;
- whether records map to a single real person;
- dataset-level content- and privacy-review status; and
- the explicit declaration that governance metadata is not a relevance label.

If a future dataset contains mixed provenance or candidate-specific review outcomes, the varying facts must move to a separate candidate audit table keyed by `candidate_id`; they must not be silently represented by a dataset-level constant.

## 7. Human Audit Record

Candidate audit results must be stored as a separate file joined by `candidate_id`. The audit record must not overwrite candidate evidence. Its contract is defined in `docs/CANDIDATE_PROFILE_AUDIT_TEMPLATE.md`.

Minimum reviewer outputs are:

- `evidence_strength`: audit-only judgement of `strong`, `medium`, or `weak` based on the combined skills, experience tasks, and outputs; it is never inferred automatically from `scenario_category`;

- `content_decision`: `approve` or `revise`;
- `content_issue_codes`;
- `content_reason`;
- `privacy_decision`: `approve` or `revise`;
- `privacy_reason`;
- `reviewer_id`; and
- `reviewed_at`.

Candidate content review is not relevance annotation. No 0/1/2 relevance label may be entered at this stage.

## 8. Relevance-Annotation View

After candidate content review, revision, validation, and freeze, independent annotators should receive only:

- a blinded candidate identifier;
- `current_job_title`;
- `desired_work_directions`;
- `skills`; and
- `experience_narrative`.

They must not receive `years_experience`, construction metadata, audit decisions, model names, model rankings, model scores, or other expected-answer signals.

Annotation outputs are stored separately at the candidate–occupation–Role-Profile-membership level:

- `candidate_id`;
- `membership_id`;
- `occupation_uri` and `role_profile_id`;
- `relevance_label` (`0`, `1`, or `2`);
- `background_evidence`;
- `direction_evidence`;
- `annotator_id`; and
- `annotation_version`.

## 9. Privacy and Excluded Data

The following information is excluded from candidate inputs and ranking features:

- names and contact details;
- photographs and identity numbers;
- employer-confidential identifiers;
- age, gender, ethnicity, disability, religion, family or marital status;
- management grade, reporting line, team size, IC/POC positioning, and other organisational-status signals; and
- any other sensitive attribute not required by the research construct.

The current parser intentionally ignores extra fields rather than forwarding them to ranking. Audit must nevertheless flag unexpected columns because silent ignoring can conceal misspelled required fields or accidental sensitive data.

## 10. Audit, Freeze, and Evaluation Workflow

```text
Role Profile definitions and boundaries frozen
    → Candidate Profile Schema frozen
    → Candidate Audit Template frozen
    → 60-candidate content and privacy review
    → Candidate revisions and automated revalidation
    → Candidate dataset and split frozen
    → Matching experiment specification frozen
    → Independent human relevance annotation
    → Evaluation
```

Candidate evidence and the Candidate Audit Template were fixed at version 1.1 for the Candidate Dataset. Schema 1.2 changes only metadata placement: repeated dataset-wide constants moved to `manifest.json`, while candidate evidence, `industry_context`, split membership and relevance labels remain unchanged. All sixty records completed content, privacy, leakage, duplication, and scenario review before the 20/40 development/test split was frozen on 2026-08-16. Primary annotation is complete and frozen for all 20 development candidates and a 10-candidate test subset selected before model-output inspection: 30 candidates × 18 memberships = 540 judgements. The remaining 30 test candidates are an untouched, unlabelled reserve.

## 11. Versioning Requirements

Each formal candidate release should record:

- `candidate_schema_version`;
- `candidate_dataset_version`;
- `audit_template_version`;
- `content_review_status`;
- `privacy_review_status`;
- `freeze_status` and freeze date;
- development/test split counts; and
- file hashes in the dataset manifest.

Any change to model-facing candidate text after freeze creates a new dataset version and invalidates labels or evaluation results tied to the previous hashes.
