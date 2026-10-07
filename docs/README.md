# Documentation guide

Start with the [project overview](../README.md). This index separates research design, supporting evidence, and implementation guidance.

## Choose a reading path

| Reader or question | Suggested path |
|---|---|
| Admissions reviewer: what was built, studied, and learned? | [Project README](../README.md) → [Research Design and Evaluation](../RESEARCH_DESIGN.md) |
| Research reviewer: how were the claims produced? | [Protocol](EXPERIMENT_PROTOCOL.md) → [Data Card](DATA_CARD.md) → [Annotation Guideline](HUMAN_ANNOTATION_GUIDELINE.md) → [Development Selection Report](../reports/matching/DEVELOPMENT_PARAMETER_SELECTION.md) → [Final Evaluation Report](../reports/evaluation/TFIDF_FULL_TEST_EVALUATION.md) → [Error Analysis](ERROR_ANALYSIS.md) |
| System user: what can the prototype support? | [Model Card](MODEL_CARD.md) → [Data Card](DATA_CARD.md) |
| Technical reader: how is it computed and reproduced? | [Technical Appendix](RESEARCH_TECHNICAL_APPENDIX.md) → source and tests |

## Document responsibilities

- **Root README:** one-page application entry covering the problem origin, artifact, study design, core results, representative failures, and routes to evidence.
- **Research Design and Evaluation:** authoritative methodological narrative connecting the motivating problem to research questions, design choices, findings, interpretation, and limitations.
- **Technical appendix:** detailed formulas, exact score definitions, and runtime settings.
- **Data card and schemas:** contents, provenance, field meanings, and permitted uses.
- **Protocol and annotation guideline:** the procedure used to construct the evaluation.
- **Model card:** system behaviour, output interpretation, and scope.
- **Error analysis:** case-level interpretation of the frozen results.

Personal history, development, and programme fit belong in the applicant's personal statement outside the repository. Repository documents may identify the work experience that motivated the problem, but they do not duplicate the personal narrative or serve as application essays.

The [reports directory](../reports/README.md) holds run-specific observations, decisions, metrics, and freeze records. Documents explain the design; reports provide evidence for what was done. Preserve completed records when changing presentation.

## Secondary interfaces and experimental work

- [MCP integration](MCP_INTEGRATION.md) is optional technical setup for compatible clients, not part of the ranking study.
- [JD Analyzer](../experimental/jd_analysis/README.md) is a separate experimental extension without a labelled evaluation.

<details>
<summary>Audit and repository-maintenance records</summary>

The audit layer retains candidate and skill reviews, schema-migration notes, freeze manifests, and the repository submission manifest. These records support reproducibility and change control. The [reports index](../reports/README.md) explains how historical stage fields relate to the completed study. Git tags retain earlier repository versions.

</details>

## Further reference

- [Candidate schema](CANDIDATE_PROFILE_SCHEMA.md) and [Role Profile schema](ANALYTICAL_ROLE_PROFILE_SCHEMA.md)
- [Data-source policy](DATA_SOURCE_POLICY.md)
- [Full annotation guideline](HUMAN_ANNOTATION_GUIDELINE.md)
- [Taxonomy guide](../taxonomy/README.md)
- [Candidate data guide](../data/candidates/README.md) and [annotation data guide](../data/annotation/README.md)
