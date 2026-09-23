# Human Annotation Guideline

## Researcher-role clarification — 2026-09-06

The final labels were supplied by the sole researcher, who also reviewed the AI-assisted synthetic profiles and defined the targets. The annotation view hid model outputs and governance fields; this is a restriction on displayed information, not independent external annotation. Prior construction knowledge and judgement dependence remain limitations. No second annotator participated. This clarification changes no frozen labels.

## Annotation objective

The objective is to record human relevance judgements for evaluating the frozen selected matching configuration. Annotation measures how well a candidate's stated background and intended direction support one specific occupation–Role Profile membership. It does not assess hiring eligibility, predict job performance, or change the matching formula or weights.

Primary annotation should be blind: annotators must not see model scores, ranks, candidate construction metadata, split assignments, intended sampling profiles, scenario labels, audit decisions, or other annotators' labels. The workflow therefore keeps `model_rank` and `model_score` blank by default. Model output may be exposed only for a separately identified post-annotation error-analysis pass.

## Annotation unit definition

One row is one `candidate_id × membership_id` judgement. A membership identifies one ESCO occupation in one Analytical Role Profile. The same occupation can appear in more than one Role Profile and must then be judged separately because the intended work purpose differs.

The complete annotation frame contains 60 candidates × 18 memberships = 1,080 unique judgements. Each candidate therefore appears in 18 rows and each membership appears in 60 rows; a specific `candidate_id × membership_id` pair must appear exactly once. Candidate identifiers remain `C001` through `C060`, while development/test membership is intentionally hidden from annotators.

## Active portfolio annotation sample

The portfolio evaluation uses a predeclared subset of the complete frame:

- `data/annotation/annotation_primary.csv`: all 20 development candidates plus 10 researcher-stratified test candidates, for 30 × 18 = 540 completed primary judgements;
- `data/annotation/portfolio_annotation_selection_manifest.json`: researcher-only selection provenance. Do not distribute this manifest to annotators because it contains split and construction strata.

The test subset was fixed before model-output inspection and balances the five Role Profiles and five construction scenarios at two candidates each. Formal reporting must call this a stratified test subset rather than the complete frozen test set.

The completed dataset is a single-annotator exploratory evaluation set. Inter-annotator agreement, adjudication, and reliability statistics must not be reported. This limitation should be stated in portfolio and evaluation reports.

Annotators may use only the displayed candidate evidence (`current_job_title`, `desired_work_directions`, `skills`, and `experience_narrative`) and the displayed membership context (`occupation_title`, `role_profile_name`, and `mapping_type`). Do not infer protected characteristics, undisclosed experience, seniority, credentials, or capability from absence of evidence.

## Label definitions

### 2 — Strong Match

The candidate provides clear, specific experience or skill evidence supporting this membership, and the stated career direction is compatible with it. Evidence may be direct or clearly transferable, but aspiration alone is not enough.

### 1 — Partial Match

The candidate provides some relevant or transferable evidence, but alignment is incomplete, indirect, adjacent, or requires meaningful capability development. Use `1` when background is strong but direction is weak or conflicting, or direction is clear but background evidence is still limited.

### 0 — Weak / No Match

The supplied profile contains insufficient relevant evidence, only generic wording, or a substantive mismatch with the occupation–Role Profile membership. Missing evidence means only that the evidence is not present in the supplied profile.

`evidence_strength` records how well the supplied text supports the label, using `strong`, `moderate`, or `weak`. It is annotator confidence in the evidence trace, not the candidate-construction field with the same name.

## Decision procedure

1. Read the candidate evidence without consulting model output or governance metadata.
2. Read both parts of the membership: the occupation and the Role Profile purpose.
3. Identify concrete background evidence from skills, current role, or experience narrative.
4. Identify whether the desired roles support, merely permit, or conflict with the membership.
5. Assign `2`, `1`, or `0` using the definitions above. Do not mechanically average background and direction.
6. `human_relevance` is the only field required on every row.
7. Fill `evidence_strength` only when assigning label `1` or when uncertain; otherwise it may remain blank.
8. Fill `annotation_reason` only for ambiguous or boundary cases. Use one short evidence phrase rather than a full sentence; otherwise leave it blank.
9. `annotator_id` is prefilled. After finishing, fill `annotation_timestamp` down the complete column once, or record one completion timestamp during consolidation.
10. Judge every row independently. Do not force a fixed number of labels per candidate and do not adjust a label to match the model ordering.

## Ambiguous case handling

- If two labels remain plausible, choose the lower label unless a concrete evidence trace justifies the higher one, and describe the ambiguity.
- Generic terms such as “analysis”, “strategy”, or “data” are insufficient without task, method, or outcome context.
- Treat equivalent terminology and clearly demonstrated transferable work as evidence even when titles differ.
- A desired role without supporting experience normally receives `1`, not `2`; a strong background with a conflicting direction also normally receives `1`.
- If the occupation fits but the Role Profile purpose does not, judge the full membership and reduce the label.
- If information is too sparse to distinguish adjacent memberships, use `0` or `1` according to the concrete evidence available and set `evidence_strength=weak`.
- Do not contact another annotator or inspect their file before independent annotation is complete. Flag unresolved interpretation issues for guide clarification, not case-by-case coordination.

## Examples

### Direct Match

A candidate reports building forecasting models, evaluating experiments, and deploying Python/SQL pipelines, and wants Data Scientist roles. For a data scientist × Data Science membership, assign `2`: both background and direction provide specific, consistent evidence. Use `evidence_strength=strong`.

### Adjacent Transfer

A commercial analyst has SQL, dashboarding, KPI diagnosis, and stakeholder reporting experience and wants broader analytics roles. For a data analyst × Data Analytics membership, assign `2` when the work is already substantively analytical; for a more statistical Data Science membership, assign `1` because the evidence is transferable but model-development capability is not yet demonstrated.

### Career Transition

A finance operations specialist describes process improvement and Excel reporting and wants to move into business analysis. For a business analyst × Business Strategy & Focused Analysis membership, assign `1`: the direction is explicit and some evidence transfers, but structured requirements or consulting evidence still needs development.

### Weak Evidence

A profile states only that the candidate “works with data” and wants “a strategic role”, without methods, tasks, or outcomes. Assign `0` for a strategic planning manager × Strategic Analysis membership because the wording does not substantiate the membership. Use `evidence_strength=weak`.

### Ambiguous Case

A candidate has market research, KPI ownership, and financial modelling and wants “strategy and performance” roles. Both Strategic Analysis and Business Performance & Goal Management memberships may be plausible. Judge each separately: use `2` only where the cited tasks directly support that membership purpose; otherwise use `1`, describe the boundary ambiguity, and use `evidence_strength=moderate` or `weak`.

## Quality checks before submission

- `human_relevance` contains only `0`, `1`, or `2`.
- Every row has `human_relevance`; conditional evidence/reason fields follow the reduced-work policy above.
- `annotator_id` remains unchanged, and one completion timestamp is recorded per finished file.
- Candidate and membership identifiers are unchanged.
- Blank model fields remain blank during primary blind annotation.
- No construction metadata, model inference, or other annotator judgement appears in the rationale.

## Frozen annotation status

The 540-row primary annotation was completed and frozen on 2026-08-22. It contains 30 complete candidate blocks, 18 memberships per candidate, and one judgement per unique `candidate_id × membership_id` pair. All primary judgements were produced by the researcher using the restricted annotation view. The freeze record and final checksum are stored in `reports/freezes/HUMAN_ANNOTATION_FREEZE.md` and `data/annotation/annotation_primary_freeze_manifest.json`.
