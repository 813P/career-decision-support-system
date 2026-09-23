# Analytical Role Profile Schema

**Status:** Frozen  
**Freeze date:** 2026-08-09  
**Machine-readable source:** `taxonomy/role_profiles.json`

## Scope

The five Analytical Role Profiles are the highest-level taxonomy used for ranking, annotation, and evaluation. They were defined by the researcher from practical analytics recruitment work in an analytics recruiting platform function at ByteDance. ESCO supplies external occupational evidence and calibration; it does not determine the five constructs.

Here, **Analytical** is a scope qualifier: these profiles describe families of work whose central contribution is turning business or data evidence into diagnosis, judgement, recommendations, measurement, experiments, or models for decisions. It does not mean that every profile is the occupation “data analyst”, that every task must be quantitative, or that `Analytical Role Profile` is an ESCO term. **Role Profile** means the project's purpose-based grouping of work; **Occupation** means an ESCO occupational concept identified by an ESCO URI.

The source boundary is therefore:

- Analytical Role Profiles: project-defined research constructs documented in `taxonomy/role_profiles.json`;
- Occupations: externally sourced from English ESCO v1.2.1 and documented in `taxonomy/esco_occupations.json`;
- occupation–Role-Profile memberships: researcher-reviewed mappings documented in `taxonomy/role_occupation_memberships.json`.

This freeze covers Role Profile IDs, names, definitions, primary purposes, core task areas, expected candidate evidence, inclusion criteria, exclusion criteria, and cross-profile boundary rules. It also references the already-frozen 15-occupation/18-membership ESCO mapping.

It does not freeze role-level or ESCO skill evidence, occupation aggregation weights, ranking features, annotation labels, or evaluation metrics. Those require separate audit and freeze decisions.

## Global construct rules

- Evaluate substantive work purpose and content, not title, years of experience, grade, reporting line, IC/manager/POC status, or team size.
- A manager, consultant, freelancer, or external provider qualifies only through the concrete analytical work performed.
- A title, tool, or isolated skill keyword is insufficient evidence.
- The retired four-direction layer and the term `prototype` are not research constructs.
- These project-specific profiles are not ByteDance's official job architecture and are not a comprehensive labour-market taxonomy.

## Frozen Role Profiles

### 1. Strategic Analysis (`strategic_analysis`)

**Definition:** Evaluates long-term internal and external change, emerging opportunities, risks, and strategic alternatives to support direction setting and resource allocation at group or business level, usually over a three-to-five-year horizon.

**Include:** broad external and internal change; long-range opportunity/risk analysis; strategic alternatives; group- or business-level direction; portfolio, capability, investment, or resource-allocation implications.

**Exclude:** routine target or budget monitoring; implementation of an already determined strategy; marketing research without broader strategic interpretation; academic/public-policy research without business application; short-term process, ICT, or operating improvement.

**Key boundary:** Focused Analysis may be transferable from Strategic Analysis when concrete problem decomposition and actionable recommendations are present. Focused Analysis does not imply Strategic Analysis unless long-horizon, external-change, alternative-comparison, and resource-allocation evidence is explicit.

### 2. Business Performance & Goal Management (`business_performance_goal_management`)

**Definition:** Translates business objectives into measurable targets, monitors performance, explains variances, and supports recurring planning, budgeting, forecasting, and business-review cycles.

**Include:** goals, KPI systems, budgets, forecasts, operating plans, variance diagnosis, recurring reviews, and corrective-action follow-up.

**Exclude:** inventory or production forecasting; accounting, audit, compliance, investment analysis, pure financial management, or budget administration; reporting without interpretation; one-off business questions; long-term direction setting.

**Key boundary:** The recurring goal–evidence–diagnosis–action loop distinguishes this profile from Focused Analysis. Finance-BP-like work is included only when embedded in a concrete business's planning and performance decisions.

### 3. Business Strategy & Focused Analysis (`business_strategy_focused_analysis`)

**Definition:** Structures ambiguous and non-routine business questions, combines quantitative and qualitative evidence, compares alternatives, and produces actionable recommendations for specific growth, product, customer, commercial, process, or operating decisions.

**Include:** a concrete business question; structured problem framing; hypotheses; quantitative or qualitative diagnosis; business-case or option comparison; recommendations, pilots, or implementation paths.

**Exclude:** ICT requirements and implementation; recurring KPI and planning cycles; broad long-horizon strategy; data pipelines and dashboards as the primary output; statistical models as the primary output; generic advisory work without substantive analysis.

**Key boundary:** “Focused” means a bounded topic or decision, not informal or weakly structured work. Consultant or external-provider work counts only when grounded in a concrete enterprise and business problem.

### 4. Data Analytics (`data_analytics`)

**Definition:** Converts raw data into reliable, interpretable, and reusable evidence for recurring business decisions through data preparation, metric-system design, analytical data foundations, reporting, visualisation, and descriptive or diagnostic analysis.

**Include:** data preparation and validation; SQL analysis; metric definitions and systems; reusable analytical datasets, data marts, semantic layers, or dictionaries; reports and dashboards; descriptive/diagnostic business analysis.

**Exclude:** predictive, causal, recommendation, or optimisation models as the primary output; dedicated warehouse, platform, data-quality governance, or production-pipeline work without business-side analytical ownership; database administration; software engineering; goal-management ownership.

**Key boundary:** Analytics-oriented data foundations are included, but dedicated infrastructure occupations are excluded. Data Science begins when modelling, experimentation, causal inference, prediction, recommendation, or optimisation becomes a central output.

### 5. Data Science (`data_science`)

**Definition:** Uses statistical modelling, machine learning, experimentation, causal inference, and optimisation to build and evaluate predictive or decision-support models from data.

**Include:** modelling data and features; model selection, baselines, validation, calibration and monitoring; prediction, classification, recommendation, causal or optimisation models; A/B tests, randomised experiments, multivariate experiments, quasi-experiments, heterogeneous-effect or uplift analysis.

**Exclude:** routine dashboards and descriptive analysis; basic statistics used only to summarise performance; data infrastructure and general software engineering; theoretical research without applied decision context; incidental modelling.

**Key boundary:** A/B testing and causal experimentation are core Data Science evidence in this project. Data Analytics is oriented toward trustworthy reusable measurement and diagnosis; Data Science is oriented toward model- or experiment-based evidence.

## Linked frozen ESCO mapping

| Role Profile | Active memberships |
|---|---:|
| Strategic Analysis | 4 |
| Business Performance & Goal Management | 4 |
| Business Strategy & Focused Analysis | 5 |
| Data Analytics | 2 |
| Data Science | 3 |
| **Total** | **18** |

Occupation-level memberships, reviewed evidence, limitations, and change control are governed by `taxonomy/` and `reports/freezes/MEMBERSHIP_SKILL_EVIDENCE_FREEZE.md`.

## Change-control rule

Any later change to a Role Profile ID, definition, inclusion/exclusion criterion, candidate-evidence standard, or boundary rule requires a new schema version, impact review of the ESCO mapping and frozen candidate dataset, automated validation, and a new freeze record. Skill audit results may add a separately versioned skill-evidence layer without changing this schema when they do not alter the frozen constructs.
