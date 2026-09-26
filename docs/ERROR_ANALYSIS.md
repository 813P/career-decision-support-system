# Final Held-out Error Analysis

This descriptive analysis uses the frozen TF-IDF + `mean_all` rankings and frozen human labels for all forty held-out test candidates. It does not retune the selected configuration. Governance scenarios were consulted only after rankings and labels were frozen. Earlier cases C019, C024, and C056 remain useful descriptive examples within the complete test set.

## Scope

- 40 candidates × 18 memberships = 720 primary judgements.
- Primary membership nDCG@3: 0.6606, 95% candidate-bootstrap interval [0.5655, 0.7533].
- Secondary Role Profile nDCG@3: 0.8981, interval [0.8480, 0.9408].
- Membership Top-1 agreement: 0.7250.
- Role Profile Top-1 agreement: 0.9000.

Role Profile metrics were higher on this sample, but target count and label construction differ between levels. The difference does not isolate an aggregation benefit or establish broader reliability. The likely sources below are descriptive interpretations, not experimentally isolated causes. The lowest membership nDCG@3 cases were C032 (0.0000), C022 (0.0000), C024 (0.1769), C057 (0.2346), C010 (0.2346), and C030 (0.2346).

## Priority cases

| Candidate | Frozen observation | Likely source of disagreement | Potential user risk | Future testable improvement |
|---|---|---|---|---|
| C032 | Membership nDCG@3 was 0.0000; no label-2 membership existed, although the candidate was not an all-zero case. | Fine-grained lexical ordering failed to surface the limited partially relevant evidence near the top. | A weak-evidence profile may receive a misleadingly specific occupational ordering. | Test abstention or confidence wording on development data without treating absence of label 2 as absence of potential. |
| C022 | Membership nDCG@3 was 0.0000 and the first label-2 membership appeared at rank 6. | Relevant evidence was present but lexical competitors dominated the first positions. | The most relevant concrete target can be hidden despite a plausible broad direction. | Evaluate phrase-aware lexical features and membership diversification in a new development study. |
| C057 | Membership nDCG@3 was 0.2346 and Top-1 disagreed with the maximum human label. | Mixed transferable evidence was not separated cleanly at membership level. | A user may overinterpret rank 1 when several adjacent targets are plausible. | Evaluate ambiguity signalling and show score gaps and contributing memberships. |
| C010 | Business Performance & Goal Management ranked first, while human labels also identified strong Strategic Analysis and Business Strategy evidence. The first label-2 membership appeared below the leading membership block. | Current-role and recurring-review vocabulary dominated longer-horizon competitor, technology, scenario, and allocation evidence. `mean_all` also spreads profile evidence across all mapped occupations. | The interface may frame an adjacent current-function match as more decisive than the candidate's stated transition direction. | In a separately versioned development study, test a direction-sensitive lexical representation that preserves the frozen 0.5/0.5 construct but improves multi-word phrase handling. |
| C019 | The top Role Profile was acceptable at the profile level, but its first occupation membership, budget analyst, had human relevance 0; a strong data-analyst membership appeared later. | KPI, threshold, monitoring, and action-review language supported the performance profile, while the ESCO budget occupation supplied an overly strong lexical route within that profile. | A user may mistake the strongest displayed occupation for the evidence actually supporting the broader Role Profile. | Make the interface emphasise all contributing memberships and label the strongest occupation as one lexical contributor, not a recommended occupation. Evaluate membership-level diversification on development data only. |
| C024 | Business Performance ranked first, but Business Strategy & Focused Analysis and Strategic Analysis contained stronger human-labelled memberships. | The candidate is intentionally mixed: recurring goal-tree ownership and a one-off profitability investigation. Recurring cadence terms were more frequent and aligned with several performance memberships. | A single ranking may hide legitimate dual-direction evidence and encourage premature narrowing. | Add an ambiguity indicator based on small Role Profile score gaps and mixed high-relevance evidence; evaluate user comprehension without changing the frozen score. |
| C056 | Data Science ranked first even though its leading statistician membership had relevance 0 and no membership received label 2. The profile explicitly says little evidence exists for feature choices, inference, or evaluation design. | Desired-role wording and model-operations vocabulary created lexical overlap with modelling targets despite explicit negative evidence in the narrative. Bag-of-words TF-IDF cannot reliably interpret negation or evidence absence. | The system may appear confident about a transition when the supplied profile supports only weak or adjacent fit. | Add a separately evaluated low-evidence/negation diagnostic that lowers confidence wording rather than silently changing relevance scores. |

## Boundary patterns

### Business Performance versus Business Strategy

C010 and C024 show that recurring review, forecasting, and goal vocabulary can dominate longer-horizon or one-off strategic investigation evidence. The five-profile output should therefore present adjacent alternatives and component scores rather than treating rank 1 as a definitive recommendation.

### Data Analytics versus Data Science

C041 and C054 ranked the expected broad analytical direction first, but both had strong or adjacent evidence across the Analytics/Science boundary. C056 demonstrates the more important failure mode: model-adjacent operational work and aspiration language can resemble Data Science even when modelling evidence is explicitly weak.

### Occupation membership versus Role Profile

C019 illustrates why membership-level evaluation remains primary. A correct broad Role Profile can still be supported by an implausible leading occupation membership. User-facing explanations must retain membership provenance and must not describe the strongest occupation as the candidate's best career.

## Interpretation

No case justifies changing the frozen selected configuration after test inspection. The final study supports a limited claim: the pipeline produced useful broad Role Profile ordering in this controlled setting, while fine-grained occupation–profile discrimination, mixed-direction cases, negation, and low-evidence transitions remain material limitations.
