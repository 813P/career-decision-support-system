# Annotation guide

The authoritative instructions are in `docs/HUMAN_ANNOTATION_GUIDELINE.md`.

Each annotation unit is one `candidate_id × membership_id` judgement. Assign one relevance label:

- `0`: weak or no credible fit;
- `1`: partial, adjacent, or plausible transitional fit; or
- `2`: strong evidence supporting both the occupation and Role Profile context.

Primary annotation remained blind to model scores, ranks, construction metadata, split assignments, and intended strata. The frozen v2 dataset contains 1,080 judgements from one researcher-annotator: 360 development and 720 test judgements. The planned second-annotator reliability exercise was not executed, so no inter-annotator agreement or adjudication claim is made.
