# Technical Appendix: Career-Direction Ranking

This appendix preserves the mathematical and runtime details of the selected TF-IDF full-test evaluation. See [Research Design and Evaluation](../RESEARCH_DESIGN.md) for motivation, design rationale, findings, and limitations. Submission-ready revision: 2026-09-26. No experimental inputs, scores, or parameters are changed.

Notation: c is a candidate, m is an occupation–Role Profile membership, and r is a Role Profile. Dollar signs delimit LaTeX mathematics; they are not executable code.

## A. Candidate-to-membership matching architecture

### A.1 Frozen text representations

For candidate $c$:

$$
B_c = \text{join}(\text{current job title}, \text{skills}, \text{experience narrative})
$$

$$
D_c = \text{join}(\text{desired work directions})
$$

For membership $m$, the background target combines the ESCO occupation description, Role Profile core tasks, candidate-evidence standards, and reviewed membership skills. The direction target combines the Role Profile names and purpose, typical work directions, naturalised career-direction descriptions, and occupation preferred and alternative titles.

Every method produces a background score $b_{c,m}$, a direction score $d_{c,m}$, and a final membership score:

$$
s_{c,m}=0.5b_{c,m}+0.5d_{c,m}
$$

All public component and final scores are bounded to $[0,1]$. Scores are relative ranking signals, not calibrated probabilities.

### A.2 Structured baseline

The Structured background score is weighted coverage of explicitly listed candidate skills over the membership's frozen skill set:

$$
b^{structured}_{c,m}=
\frac{\sum_{s \in S_m} w(s)\,I[s \in S_c]}
{\sum_{s \in S_m} w(s)}
$$

where $S_m$ is the membership skill set, $S_c$ is the candidate's explicit skill set, and $I$ is an exact-normalised match indicator. The experience narrative does not increase this Structured coverage score.

Structured direction alignment combines candidate-token recall and exact-phrase recall against the frozen direction target:

$$
d^{structured}_{c,m}=0.5\times\text{token recall}+0.5\times\text{phrase recall}
$$

Only frozen, scoped aliases may be applied. There is no candidate-specific fuzzy matching or semantic inference within this baseline.

### A.3 TF-IDF lexical baseline

Separate TF-IDF spaces are fitted over the 18 frozen membership background targets and the 18 direction targets. Tokens are NFKC-normalised and lowercased. Term frequency is normalised by retained document length, and inverse document frequency is:

$$
idf(t)=\log\left(\frac{1+N}{1+df(t)}\right)+1
$$

Vectors are L2-normalised. Background and direction scores are cosine similarities between the corresponding candidate and membership vectors:

$$
b^{tfidf}_{c,m}=\cos(\mathbf{v}(B_c),\mathbf{v}(B_m))
$$

$$
d^{tfidf}_{c,m}=\cos(\mathbf{v}(D_c),\mathbf{v}(D_m))
$$

This method tests how far deterministic lexical similarity can support useful rankings without an embedding model.

### A.4 Semantic method

The Semantic method uses `sentence-transformers==5.0.0` with the pinned `sentence-transformers/all-MiniLM-L6-v2` revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`. The frozen runtime uses PyTorch `2.7.1+cpu`, no CUDA, and no fine-tuning.

Candidate and membership background texts are encoded separately from direction texts. Raw cosine similarity is preserved and mapped monotonically to the public score range:

$$
public(x)=clip\left(\frac{x+1}{2},0,1\right)
$$

The recorded development run used the pinned model revision from a copied local Hugging Face cache in forced-offline mode. The frozen record does not claim a verified normal-cache versus forced-offline equivalence comparison.

### A.5 Hybrid method

The Hybrid method combines Structured and Semantic membership scores:

$$
s^{hybrid}_{c,m}(\alpha)=\alpha s^{structured}_{c,m}+(1-\alpha)s^{semantic}_{c,m}
$$

The recorded Structured-weight grid is $\alpha \in \{0,0.25,0.5,0.75,1\}$. The endpoints are exact equivalents of Semantic and Structured and are not interpreted as separate models.

### A.6 Determinism and tie handling

All 18 membership results are returned for every candidate. Ties are resolved deterministically by stable membership or Role Profile identifiers after score sorting. Numeric outputs are rounded according to the shared output contract, and version/hash provenance is retained in experiment artefacts.

## B. Occupation-to-Role Profile aggregation

For Role Profile $r$, let $M_r$ be its set of memberships and $s_{c,m}$ a selected method's membership score. Three rules were compared:

$$
score_{max}(c,r)=\max_{m\in M_r}s_{c,m}
$$

$$
score_{mean\_top\_2}(c,r)=\frac{1}{\min(2,|M_r|)}\sum_{m\in Top2(M_r)}s_{c,m}
$$

$$
score_{mean\_all}(c,r)=\frac{1}{|M_r|}\sum_{m\in M_r}s_{c,m}
$$

The same contributor rule is applied to the background and direction components. The selected `mean_all` rule uses every membership assigned to a Role Profile, reducing dependence on a single high-scoring occupation.

For secondary human-reference evaluation only, Role Profile relevance is derived as the maximum frozen membership relevance assigned to the profile. This label derivation is not the model's aggregation formula.

## C. Evaluation framework

### C.1 Relevance gain and nDCG

The primary metric is candidate-level membership nDCG@3. For relevance label $rel_i \in \{0,1,2\}$:

$$
DCG@k=\sum_{i=1}^{k}\frac{2^{rel_i}-1}{\log_2(i+1)}
$$

$$
nDCG@k=\frac{DCG@k}{IDCG@k}
$$

nDCG@3 prioritises the top directions exposed to a user while respecting graded relevance. nDCG@5 is a supporting membership metric and also evaluates the complete five-profile ordering at the secondary level. Candidates with all-zero labels are excluded from eligible nDCG and reported separately; no such candidate appears in the 40-candidate test split.

### C.2 Supporting metrics

- **Top-1 agreement:** correct when the first model result is any item tied for the candidate's maximum human label.
- **MRR for label 2:** reciprocal rank of the first Strong Match; reported for all candidates and for candidates with at least one label 2.
- **Pairwise ordering agreement:** share of unequal-label item pairs ordered in the same direction as the human labels; human-label ties are excluded.
- **Coverage@k:** fraction of the complete membership or Role Profile universe appearing at least once within Top-k across evaluated candidates.

### C.3 Uncertainty

Confidence intervals use 2,000 candidate-level percentile bootstrap resamples. Resampling candidates rather than candidate–membership rows preserves the dependence among the 18 judgements belonging to one candidate.

Method comparisons use paired candidate-level bootstrap differences. A development nDCG@3 difference of no more than `0.01` was used as a study-specific near-tie heuristic; when the paired interval also included zero, the simpler configuration was preferred. This is not a universal threshold or statistical equivalence criterion, and the available Git history does not establish when the threshold was first formulated.

### C.4 Evaluation levels

The primary evaluation ranks 18 memberships per candidate. The secondary evaluation ranks five Role Profiles after aggregation. Secondary profile metrics do not replace the finer-grained membership result.



## D. Evidence inventory and implementation records

The source audit records 552 ESCO membership-level decisions: 181 core, 138 supporting, and 233 excluded. It also records 60 reviewed Role Profile-specific project-custom assignments. After membership construction and custom-evidence expansion, the derived evidence contains 313 core and 213 supporting occurrences across 18 memberships. Occurrences are not unique skills.

The frozen configuration and manifests retain exact versions, hashes, bootstrap provenance, and the complete 40-candidate test scope.

| Purpose | Record |
|---|---|
| Selected configuration and hashes | [tfidf.json](../config/selected/tfidf.json) |
| Development comparison | [Selection report](../reports/matching/DEVELOPMENT_PARAMETER_SELECTION.md) |
| Final evaluation | [Full-test report](../reports/evaluation/TFIDF_FULL_TEST_EVALUATION.md) |
| Membership evidence | [Evidence freeze](../reports/freezes/MEMBERSHIP_SKILL_EVIDENCE_FREEZE.md) |
| Application ranker | [role_profiles.py](../src/career_matcher/role_profiles.py) |
| Experimental ranking | [role_profile_experiment.mjs](../experiments/shared/role_profile_experiment.mjs) |
| Existing regression checks | [Ranking tests](../tests/role_profile_experiment.test.mjs) |
| Repository map | [Documentation guide](README.md) |

The Structured method deliberately uses less background evidence than the text methods. Public 0–1 ranges do not calibrate distributions across methods. Exact-input determinism is not paraphrase robustness. Human profile labels use maximum membership relevance, while the selected model uses the mean score; see the main report for interpretation.

## E. Annotation and change history

The final study used one researcher-annotator. Earlier proposals for three independent annotators and a second-annotator reliability sample were not executed. Historical A/B/C workflow files do not supply evaluation labels.

The 2026-09-06 report revision records the researcher's confirmation that AI assisted candidate drafting and that the researcher reviewed and annotated the profiles. This is a provenance clarification, not a change to labels or the original experimental chronology.
