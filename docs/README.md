# Documentation guide

Start with the [project overview](../README.md). This index separates research design, supporting evidence, and implementation guidance.

## Choose a reading path

| Reader or question | Suggested path |
|---|---|
| Admissions reviewer: what was studied and learned? | [Overview](../README.md) → [Research Design and Evaluation](../RESEARCH_DESIGN.md) → [Error analysis](ERROR_ANALYSIS.md) |
| Research reviewer: how were the claims evaluated? | [Protocol](EXPERIMENT_PROTOCOL.md) → [Data card](DATA_CARD.md) → [Annotation guideline](HUMAN_ANNOTATION_GUIDELINE.md) → [Selection report](../reports/matching/DEVELOPMENT_PARAMETER_SELECTION.md) → [Test report](../reports/evaluation/TFIDF_FULL_TEST_EVALUATION.md) |
| Technical reader: how is it computed? | [Technical appendix](RESEARCH_TECHNICAL_APPENDIX.md) → source and tests |
| Application user: what can I rely on? | [Model card](MODEL_CARD.md) → [Experimental JD analyzer](../experimental/jd_analysis/README.md) → [MCP setup](MCP_INTEGRATION.md) |

## Document responsibilities

- **Root README:** purpose, main design, selected results, and entry points.
- **Research Design:** motivation, questions, methodological choices, findings, interpretation, and limitations.
- **Technical appendix:** detailed formulas, exact score definitions, and runtime settings.
- **Data card and schemas:** contents, provenance, field meanings, and permitted uses.
- **Protocol and annotation guideline:** the procedure used to construct the evaluation.
- **Model card:** system behaviour, output interpretation, and scope.
- **Error analysis:** case-level interpretation of the frozen results.

The [reports directory](../reports/README.md) holds run-specific observations, decisions, metrics, and freeze records. Documents explain the design; reports provide evidence for what was done. Preserve completed records when changing presentation.

## Further reference

- [Candidate schema](CANDIDATE_PROFILE_SCHEMA.md) and [Role Profile schema](ANALYTICAL_ROLE_PROFILE_SCHEMA.md)
- [Data-source policy](DATA_SOURCE_POLICY.md)
- [Full annotation guideline](HUMAN_ANNOTATION_GUIDELINE.md)
- [Taxonomy guide](../taxonomy/README.md)
- [Candidate data guide](../data/candidates/README.md) and [annotation data guide](../data/annotation/README.md)
