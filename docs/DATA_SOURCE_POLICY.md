# Data Source Policy

## Decision

The project does not scrape individual profiles or résumés from recruitment platforms. Public visibility is not treated as permission for automated collection, model development, redistribution, or high-impact employment use.

LinkedIn explicitly prohibits unauthorised crawlers, bots, and scripts that scrape profiles or other service data. BOSS Zhipin's user agreement describes spider, crawler, and human-simulation programs used to read, copy, or retain data through abnormal browsing as illegal acquisition. Any future platform integration therefore requires a documented official API, written permission, and a separate privacy/legal review.

## Approved source hierarchy

1. **Core occupation catalog — ESCO v1.2.1.** Use official occupation descriptions, skill concepts, and occupation–skill relations. Pin the downloaded version and retain the source manifest.
2. **Career-transition extension — JobHop.** This CC BY 4.0 dataset contains pseudonymised career trajectories mapped to ESCO codes. It is useful for a future transition-prior feature, not for training résumé-text similarity because it releases structured occupation histories rather than original personal résumé text.
3. **Fairness test extension — Resume-Job Fairness Evaluation.** This MIT-licensed set contains 960 synthetic résumé–job pairs designed for counterfactual education-prestige audits. Use it only as a supplementary fairness benchmark; it has no ground-truth match labels and only 12 jobs.
4. **Synthetic text stress tests.** Fully synthetic résumé/job datasets may test parsers, robustness, multilingual handling, or long-text behaviour. Their generated scores must never be reported as human hiring judgments.
5. **Voluntary project participants.** If real profiles are ever added, obtain specific opt-in consent for this project, collect only necessary fields, strip direct identifiers before storage, document deletion procedures, and do not publish row-level records.

## Dataset admission checklist

A new dataset may enter the repository only when all answers below are recorded:

- Is the source official or is the collector clearly identified?
- Does the license permit download, transformation, model evaluation, and redistribution of derived artifacts?
- Does it contain real people, direct identifiers, sensitive fields, or text that could enable re-identification?
- Is the intended matching task compatible with how its labels were created?
- Is the geography and language relevant to the claimed use case?
- Can an individual opt out or request deletion when applicable?
- Can results be reported without implying real-world hiring validity?

If the license is absent, ambiguous, or conflicts with platform terms, the dataset is rejected.

## Processing rules for any real-person data

- Store raw data outside Git and restrict access.
- Replace source identifiers with project-scoped random IDs; do not assume pseudonymisation makes data anonymous.
- Drop names, photos, contact details, exact addresses, dates of birth, gender, ethnicity, religion, health/disability data, marital/family status, identity numbers, and free-text fragments that reveal them.
- Keep a field-level purpose register and a deletion date.
- Use protected attributes only in a separately controlled audit dataset when legally justified; never feed them to the ranker.
- Publish only aggregate metrics and carefully reviewed examples.

## Practical recommendation for this portfolio

Use the single human-reviewed and frozen 60-profile Candidate Dataset under `data/candidates`. Annotation is frozen for all 20 development and 40 test candidates; only development labels may influence selection, while all test labels are evaluation-only. Superseded candidate datasets and former hand-authored fixtures are not active research inputs. Do not use the five de-identified real-person seed profiles as ranking input; they were controlled synthesis references and are not part of the released Candidate Dataset. Add JobHop later only as a clearly separated career-transition signal and use the synthetic fairness dataset only for counterfactual tests.

This produces a stronger application narrative than unauthorised scraping: it demonstrates data governance, task–dataset alignment, reproducibility, and responsible AI judgment.
