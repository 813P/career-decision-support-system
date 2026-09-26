# Model Card

## Intended use

Rank five potentially relevant Analytical Role Profiles for a job seeker and explain occupation-level skill overlap or evidence gaps. The system is suitable for education, portfolio demonstration, and low-stakes career exploration.

## Prohibited use

Do not use the output to screen, shortlist, reject, hire, compensate, or rank real people for employment decisions.

## Rankers

1. Structured baseline: deterministic token and exact-phrase overlap using frozen core (`1.0`) and supporting (`0.5`) evidence, with background and direction components weighted `0.5` each. Only pre-frozen, sourced occupational aliases may be used; there is no fuzzy or semantic matching in this baseline.
2. TF-IDF: lexical cosine similarity between candidate text and membership-level background/direction targets using a deterministic local implementation.
3. Semantic: cosine similarity from `sentence-transformers==5.0.0` and `sentence-transformers/all-MiniLM-L6-v2` revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41` in evaluation mode without fine-tuning or random sampling. Background uses `current_job_title`, explicit `skills`, and `experience_narrative`; direction uses `desired_work_directions`. The verified runtime is Windows 64-bit, Python 3.11.9 in project-local `.venv`, `torch==2.7.1+cpu`, and CUDA unavailable. Raw cosine is retained for audit and mapped to `[0, 1]` as `clip((cosine + 1) / 2, 0, 1)`.
4. Hybrid: weighted structured and semantic scores. The weight is selected on the development set only.

Scores are comparable within a ranker execution but are not calibrated probabilities. The 15 occupations create 18 occupation–Role Profile memberships as the primary scoring and evaluation units. Development-only comparison selected TF-IDF with `mean_all` aggregation and equal background/direction weights. Five Role Profile rankings are derived as the user-facing secondary level.

The submission-ready v2 evaluation uses 20 development candidates for selection and all 40 held-out test candidates for final evaluation. Membership nDCG@3 is 0.660627 (95% candidate-bootstrap interval [0.565457, 0.753311]); secondary Role Profile nDCG@3 is 0.898108 ([0.847969, 0.940831]). These synthetic, single-annotator results are exploratory and do not establish real-world effectiveness.

## Experimental JD analyzer

The application contains a separate deterministic multi-label JD analyzer. It matches ordered, contiguous bilingual responsibility phrases into weighted evidence groups, applies substantive-purpose anchors and counter-evidence, and returns `primary`, `supporting`, or `insufficient` components. It can abstain when no direction has sufficient evidence.

This analyzer is not one of the four candidate rankers, does not score the 18 occupation memberships, and does not use the selected candidate-side TF-IDF parameters. Its coverage scores are transparent rule diagnostics, not probabilities or candidate–job fit scores. No labelled JD dataset currently supports a performance claim; see [`experimental/jd_analysis/`](../experimental/jd_analysis/README.md).

## Explanations

Explanations are computed from the same membership evidence and components used by the score; they are not post-hoc natural-language rationalisations. Evidence gaps are displayed only for the user-visible Top 3 Role Profiles, with at most three frozen core-evidence items per profile. Every item must originate from a membership that actually contributed under the selected aggregation and may be shown only when neither explicit skills nor the experience narrative demonstrates it. Supporting evidence is not a primary deficiency, and all wording states absence from the supplied evidence rather than absence of ability.

## Evaluation

Primary metric: candidate-level membership nDCG@3 over the 18 occupation–Role-Profile memberships. Supporting membership measures include nDCG@5, tied-max Top-1 agreement, MRR, pairwise ordering agreement, and coverage. Five-Role-Profile metrics are reported as a secondary evaluation. All-zero human-label cases are reported separately. Aggregation was chosen on development labels only and frozen before test evaluation. Experience band must not be used as relevance evidence in the current study.

All ranking metrics use 95% candidate-level percentile bootstrap confidence intervals with 2,000 fixed-seed resamples. The study has no arbitrary absolute success threshold. Method choice considers the pre-specified primary metric, paired candidate-level bootstrap uncertainty, interpretability, and critical error cases.

## Known risks

- Vocabulary matching can underrate transferable or newly emerging skills.
- Semantic embeddings can reproduce biases from their pretraining data.
- Occupational taxonomies simplify jobs and may over-recommend popular adjacent roles.
- The frozen 15-occupation/18-membership mapping is practitioner-defined and does not comprehensively represent the labour market.
- Business Performance & Goal Management lacks a clean core ESCO occupation, so its supporting evidence may be less balanced than other profiles.
- A missing skill may be absent from the résumé rather than absent from the candidate.
- Synthetic metrics are not estimates of real-world quality or fairness.
- JD phrase coverage may miss paraphrases, employer-specific language, multilingual variation, or implicit responsibilities, and its thresholds have regression coverage but no formal annotated-JD evaluation.
