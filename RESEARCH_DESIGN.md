# Exploring Analytical Career Directions: Research Design and Evaluation

**Project:** Career Decision Support System
**Study status:** Completed; final configuration frozen and evaluated on the held-out test set.
**Document scope:** Research questions, design rationale, protocol interpretation, findings, and limitations. For the system overview and operating instructions, see the [project README](README.md).

## Abstract

This study examines how candidate background and stated career direction can be represented separately and compared with a two-level career space consisting of ESCO occupations and five project-defined Role Profiles. Using 60 fully synthetic, non-identifying candidate profiles and 1,080 candidate–membership relevance annotations assigned by a single researcher, it compares Structured, TF-IDF, Semantic, and Hybrid ranking approaches on 20 development candidates. The selected TF-IDF configuration was frozen before evaluation on 40 held-out test candidates. Membership nDCG@3 was 0.6606 and Role Profile nDCG@3 was 0.8981; these values describe distinct ranking levels and are not directly comparable. Error analysis identified aspiration-heavy, mixed-direction, and low-evidence cases as important failure patterns. The findings support the feasibility of the two-level framework as a controlled methodological pilot, not real-world predictive validity.

## 1. Problem formulation

Analytical career exploration presents two linked representation problems. On the career-space side, job titles are inconsistent proxies for work: different titles can describe similar responsibilities, while similar titles can describe different work. On the candidate side, demonstrated background and intended direction may diverge, particularly for people entering work or changing careers. A ranking based mainly on past experience can therefore reproduce a person's existing field rather than support exploration.

The study operationalises these problems by comparing candidate evidence with concrete occupational evidence and then organising the membership-level results into broader analytical directions. Background and stated direction remain separate evidence channels so that aspiration can affect exploration without being presented as demonstrated readiness.

The completed study evaluates agreement with researcher relevance judgements on synthetic candidate profiles, analyses disagreement at two ranking levels, and examines how the displayed explanations relate to the computation. Real-user decision usefulness, career outcomes, and hiring suitability are outside its scope.

## 2. Research positioning and questions

### 2.1 Positioning

The task is a form of content-based recommendation: candidate and occupational descriptions are compared through their attributes rather than through other users' clicks or career histories. TF-IDF provides a lexical information-retrieval baseline, while a pretrained sentence encoder tests whether semantic representation adds value beyond vocabulary overlap [1].

ESCO supplies externally defined occupational descriptions and skills [2]. It does not define or validate the project's five Role Profiles or their occupation mappings. Explainable-recommendation research also motivates a distinction between tracing the evidence used by a system and attributing a numerical score to particular features [3].

The study is positioned as a controlled methodological pilot rather than a new ranking algorithm or a real-world effectiveness trial. Its contribution lies in how the career-exploration problem is represented, compared, evaluated, and explained; Section 7 consolidates the specific contributions.

### 2.2 Research questions

**RQ1 — Ranking configuration and held-out performance.** Which ranking configuration is selected on the development set, and how does the frozen configuration perform against held-out researcher relevance labels?

**RQ2 — Error patterns.** Where do rankings disagree with researcher judgements, particularly for mixed directions, transferable experience, or little direct evidence?

**RQ3 — Output traceability.** Which displayed outputs can be traced directly to score computation or aggregation, and what are the limits of supplementary skill-evidence prompts?

RQ1 is addressed by the ranking experiment, RQ2 by descriptive analysis of frozen test cases, and RQ3 by implementation inspection and regression checks.

## 3. Study design

### 3.1 A two-level career space

The pilot is bounded to five researcher-defined Analytical Role Profiles: Strategic Analysis, Business Performance & Goal Management, Business Strategy & Focused Analysis, Data Analytics, and Data Science. They reflect recurring types of analytical work encountered in recruitment; they are neither ByteDance's official job architecture nor an official ESCO taxonomy.

The grouping criterion is work purpose rather than title, tool, or seniority. For example, a multi-year assessment of technological change belongs closer to Strategic Analysis, while a product-profitability investigation belongs closer to Business Strategy & Focused Analysis even when both use market data. The full definitions and boundary decisions are retained in the [taxonomy records](taxonomy/README.md).

Role Profiles and occupations answer different questions. A Role Profile describes a broad kind of analytical work a person might explore; an ESCO occupation supplies concrete tasks, descriptions, and skills for evidence comparison. Fifteen reviewed occupations are linked to the five profiles through 18 occupation–Role Profile memberships. A membership is one occupation viewed within one profile's work purpose. The matcher ranks memberships first and then aggregates them into the five Role Profiles.

This structure retains source detail while reducing reliance on inconsistent job titles. It also makes it possible to detect a plausible broad direction supported by an implausible leading occupation. The exact ESCO snapshot, membership records, and evidence decisions are retained in the taxonomy records and [technical appendix](docs/RESEARCH_TECHNICAL_APPENDIX.md).

### 3.2 Background and stated direction

Candidate evidence is divided into two channels:

- **Background:** current job title, explicit skills, and experience narrative.
- **Stated direction (aspiration):** desired work directions.

The occupational targets are constructed in the corresponding two channels. Every method returns separate background and direction components, combined with equal weight in the completed study. This gives aspiration a formal role without treating it as demonstrated readiness. Alternative component weights were not evaluated.

<p align="center">
  <img src="docs/assets/membership-score-construction.svg" alt="Parallel background and direction evidence channels feeding an equally weighted final membership score" width="760">
</p>

For readability, the figure prefixes the membership-side target names with `membership_`; the implementation stores them as `background_target` and `direction_target` on each membership record. The membership targets deliberately combine occupation evidence with the Role Profile context in which that occupation is used. Identifiers and provenance fields—such as membership ID, occupation URI, Role Profile ID, mapping type, skill URI, and source type—support grouping and traceability but do not enter the TF-IDF text similarity.

Years of experience is descriptive context and does not affect ranking. Construction metadata—including intended sampling profile, scenario, split, and audit results—is excluded from both ranking and annotation.

### 3.3 Synthetic candidates and annotation

The study uses 60 fully synthetic, non-identifying candidate profiles drafted with AI assistance under controlled coverage of the five Role Profiles and predefined scenarios, followed by validation and manual audit. Review covered realism, schema consistency, privacy risk, duplication, split separation, and leakage from the occupational targets. The scenario mix supports boundary testing and does not estimate real-world prevalence.

Twenty development candidates supported method and configuration selection. Forty non-overlapping candidates formed the held-out test set, which remained unavailable for retuning. Both sets cover all five Role Profiles and multiple candidate scenarios.

A single researcher assigned all 1,080 candidate–membership relevance annotations on a three-point scale:

| Label | Interpretation |
|---:|---|
| 0 | Insufficient relevant evidence or a substantive mismatch |
| 1 | Partial, adjacent, or transferable evidence; alignment is incomplete |
| 2 | Clear supporting experience or skills with a compatible stated direction |

Aspiration alone is insufficient for label 2. Annotation considers the combined occupation–Role Profile target rather than mechanically averaging the two evidence channels.

Ranking outputs, scores, model names, and construction metadata were hidden during annotation. This is **model-output-blinded researcher annotation**: it reduces direct influence from the evaluated outputs but is not independent, multi-rater, inter-rater, or double-blind validation. The same researcher designed the Role Profiles, reviewed the synthetic profiles, and supplied the labels.

The [Data Card](docs/DATA_CARD.md) is authoritative for construction, governance, privacy, and dataset limitations; the [annotation guideline](docs/HUMAN_ANNOTATION_GUIDELINE.md) defines the labels.

## 4. Methods and experimental protocol

### 4.1 Compared approaches

| Method | Role in the comparison |
|---|---|
| Structured | Transparent rule-based matching over explicit skills and direction phrases |
| TF-IDF | Lexical representation and cosine-similarity ranking |
| Semantic | Fixed pretrained sentence representations and cosine-similarity ranking |
| Hybrid | A weighted combination of Structured and Semantic evidence |

The Structured baseline deliberately uses more constrained evidence than the text-based methods, so method differences reflect both representation and evidence use. TF-IDF tests deterministic lexical similarity; Semantic tests meaning beyond exact vocabulary overlap; Hybrid tests whether the two signals complement one another.

Three aggregation rules were compared after membership-method selection: the highest membership score, the mean of the highest two, and the mean of all memberships assigned to a Role Profile. Exact text construction, formulas, model and dependency versions, score transformations, tie handling, and aggregation definitions are documented in the [technical appendix](docs/RESEARCH_TECHNICAL_APPENDIX.md).

### 4.2 Development selection and configuration freeze

The study followed this sequence:

1. Freeze the candidate set, career-space evidence, annotation protocol, and development/test separation.
2. Compare Structured, TF-IDF, Semantic, and Hybrid membership ranking on the development set.
3. Select the membership method, then compare aggregation rules for that method.
4. Freeze the final configuration.
5. Evaluate it once on the complete held-out test set.
6. Prohibit post-test retuning; later method or data changes require a separately versioned study.

This was a sequential method-then-aggregation procedure, not a joint search across every combination. The selected configuration was **TF-IDF + `mean_all` aggregation + equal background/direction weighting**.

A 0.01 difference in development membership nDCG@3 was used as a **study-specific near-tie heuristic** when configurations performed closely. It was considered alongside paired uncertainty, reproducibility, interpretability, implementation simplicity, and dependency burden. It is not a universal nDCG threshold or a statistical equivalence criterion.

### 4.3 Evaluation strategy

The primary evaluation unit is candidate × occupation–Role Profile membership, with candidate-level membership nDCG@3 as the primary metric. The secondary evaluation ranks the five Role Profiles after aggregation. A profile's reference relevance is the maximum human label among its memberships, whereas the selected model averages membership scores. The two levels therefore answer different questions and their metric values are not directly comparable measures of task difficulty.

Candidate-level bootstrap resampling was used to retain dependence among the 18 judgements belonging to each candidate. Full metric definitions, uncertainty intervals, supporting measures, candidate-level results, and machine-readable outputs belong to the [Final Evaluation Report](reports/evaluation/TFIDF_FULL_TEST_EVALUATION.md), not this design narrative.

The [Experiment Protocol](docs/EXPERIMENT_PROTOCOL.md) is authoritative for annotation, development/test separation, configuration selection, and the near-tie heuristic.

## 5. Findings

### 5.1 Development selection

Semantic produced the highest development membership nDCG@3 point estimate (0.7533), followed closely by TF-IDF (0.7464). The observed difference was below the study-specific near-tie heuristic, and the paired candidate-level interval included zero. TF-IDF was selected because it reduced runtime and dependency complexity while retaining inspectable lexical computation. This supports a bounded engineering choice; it does not establish statistical equivalence, TF-IDF superiority, or a general preference for simpler models.

For TF-IDF, `mean_all` produced the strongest development Role Profile point estimate among the compared aggregation rules and was frozen. The comparison does not establish a statistically reliable aggregation advantage.

### 5.2 Held-out evaluation

On the 40 held-out test candidates:

- membership nDCG@3 was **0.6606**;
- Role Profile nDCG@3 was **0.8981**.

Broad Role Profile ordering showed higher agreement with the reference labels, while membership-level agreement was lower. Because the two levels contain different target counts and use different label construction and aggregation, the numerical gap does not isolate a causal benefit of aggregation.

These results support the feasibility of the ranking framework under the study conditions. They are ranking metrics, not accuracy percentages, and do not establish real-world predictive validity.

### 5.3 Representative failure patterns

The completed [error analysis](docs/ERROR_ANALYSIS.md) examines frozen rankings descriptively. The interpretations below are plausible explanations, not experimentally isolated causes.

| Case | Observation | Research implication |
|---|---|---|
| C019 | A broadly acceptable first profile contained a leading budget-analyst membership labelled 0, while a strongly relevant data-analyst membership appeared later. | Broad ordering can conceal an implausible occupational contributor; both ranking levels matter. |
| C024 | Business Performance ranked first despite stronger labelled memberships in adjacent strategy directions. | Recurring performance vocabulary can dominate mixed evidence and hide credible alternatives. |
| C056 | Data Science ranked first, its leading statistician membership was labelled 0, and no membership received label 2. | Aspiration and model-related vocabulary can outweigh evidence limitations; lexical similarity does not reliably interpret negation. |

The cases motivate further study of evidence sufficiency, mixed directions, and negation. They do not support population-level conclusions about candidate scenarios.

### 5.4 Explanation findings

The implementation provides three distinct forms of decision support:

| Output | Relationship to ranking | Boundary |
|---|---|---|
| Score decomposition | Shows the background and direction components used in the final score | Does not establish readiness or a calibrated probability |
| Aggregation provenance | Identifies the membership scores contributing to a Role Profile result | Does not make the highest-scoring occupation the person's best career |
| Rule-based skill prompts | Checks explicit matched skills and possible missing evidence | Is supplementary evidence, not TF-IDF feature attribution |

The skill prompts use reviewed occupational evidence but are computed separately from TF-IDF similarity. A missing-evidence prompt means that the configured checks did not find explicit evidence in the supplied profile; it does not show that the person lacks the skill.

## 6. Discussion and limitations

Taken together, the experiment supports the feasibility of the proposed framework while showing that its conclusions depend on researcher-defined constructs, synthetic evidence, and evaluation choices. These conclusions are bounded by the following limitations:

- **Construct validity:** the score represents a chosen balance of demonstrated background and stated direction. It does not measure readiness, transition feasibility, career benefit, or an objectively correct career.
- **Researcher and data dependence:** one researcher defined the Role Profiles and mappings, reviewed the AI-assisted synthetic profiles, and assigned all relevance labels. Output blinding reduces direct model influence but does not supply independent judgement or annotator reliability.
- **Architectural dependence:** the 15 occupations, 18 memberships, unequal membership counts, and aggregation rule influence the result. No direct-to-Role-Profile baseline was evaluated, so the study does not show that two layers outperform direct profile scoring.
- **Statistical scope:** 20 development and 40 test candidates support exploratory comparison, not population estimates. Bootstrap intervals do not overcome synthetic sampling or quantify annotator uncertainty.
- **Representation robustness:** lexical matching remains vulnerable to vocabulary mismatch, paraphrase, and negation. Systematic noise, cross-language, and distribution-shift testing were not conducted.
- **External and user validity:** the study includes no real job seekers, independent counsellors, behavioural outcomes, explanation-comprehension study, demographic fairness evaluation, or validation beyond the narrow analytical-career space.

The prototype is intended for exploratory, human-centred career decision support. It is not designed or validated for hiring, screening, candidate rejection, promotion, employment eligibility, or autonomous high-stakes decisions. The experimental JD Analyzer is a secondary extension and is outside this empirical ranking study.

## 7. Contributions and next research steps

The study contributes:

1. a two-level formulation linking concrete occupations to broader analytical directions;
2. a representation that separates background evidence from stated aspiration;
3. a frozen comparison of structured, lexical, semantic, and hybrid approaches;
4. evaluation at membership and Role Profile levels; and
5. a clear boundary between ranking-linked explanation and supplementary skill checks.

The next research priorities are:

1. compare two-level aggregation with direct Role Profile scoring and test background-only, direction-only, and combined variants;
2. obtain independent annotations and evaluate the Role Profile boundaries with real, de-identified profiles under appropriate governance;
3. test paraphrase, negation, evidence sufficiency, and cross-language robustness systematically; and
4. evaluate whether users understand the explanations, distinguish aspiration from demonstrated readiness, and retain meaningful decision control.

Any extension should use a new study version and preserve the completed frozen evaluation unchanged.

## References

1. Reimers, N., and Gurevych, I. (2019). Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks. *EMNLP-IJCNLP*. [ACL Anthology](https://aclanthology.org/D19-1410/).
2. European Commission. *European Skills, Competences, Qualifications and Occupations (ESCO)*. [Official portal](https://esco.ec.europa.eu/en).
3. Zhang, Y., and Chen, X. (2020). Explainable Recommendation: A Survey and New Perspectives. *Foundations and Trends in Information Retrieval*, 14(1), 1–101. [Publisher record](https://doi.org/10.1561/1500000066).

## Supporting records

- [Technical appendix: formulas, runtime, versions, and evaluation definitions](docs/RESEARCH_TECHNICAL_APPENDIX.md)
- [Experiment protocol](docs/EXPERIMENT_PROTOCOL.md)
- [Data Card](docs/DATA_CARD.md) and [Model Card](docs/MODEL_CARD.md)
- [Development selection report](reports/matching/DEVELOPMENT_PARAMETER_SELECTION.md)
- [Final Evaluation Report](reports/evaluation/TFIDF_FULL_TEST_EVALUATION.md) and [machine-readable evaluation](reports/evaluation/tfidf_full_test_evaluation.json)
- [Error analysis](docs/ERROR_ANALYSIS.md)
- [Candidate, evidence, annotation, and selected-configuration freeze records](reports/freezes/)
- [Documentation guide](docs/README.md)
