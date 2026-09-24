import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AGGREGATIONS, RoleProfileExperimentMatcher, buildMembershipEvidence, evaluateRankings, ndcgAtK, pairedCandidateBootstrapDifference } from "../experiments/shared/role_profile_experiment.mjs";
import { HYBRID_EXACT_TIE_PRIORITY, hybridRoleRanking, orderMetricTrials, resolvedLabelsFromRows } from "../experiments/shared/ranking_selection.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const memberships = buildMembershipEvidence(
  await json(join(ROOT, "taxonomy", "role_profiles.json")),
  await json(join(ROOT, "taxonomy", "role_skill_evidence.json")),
  await json(join(ROOT, "taxonomy", "esco_occupations.json")),
  await json(join(ROOT, "config", "shared", "matching_direction_phrases.json")),
);
const candidate = (await json(join(ROOT, "data", "candidates", "development.json")))[0];

test("membership evidence matches frozen counts and excludes optional evidence", () => {
  assert.equal(memberships.length, 18); assert.equal(new Set(memberships.map((row) => row.occupation_uri)).size, 15);
  for (const membership of memberships) for (const skill of membership.skills) {
    assert.ok(["core", "supporting"].includes(skill.evidence_tier));
    assert.ok(skill.source_types.every((source) => !source.toLowerCase().includes("optional")));
  }
});

test("structured and tfidf are deterministic, bounded, and complete", () => {
  const matcher = new RoleProfileExperimentMatcher(memberships);
  for (const method of ["structured", "tfidf"]) {
    const first = matcher.rank(candidate, method); const second = matcher.rank(candidate, method);
    assert.deepEqual(first, second); assert.equal(first.length, 5); assert.deepEqual(first.map((row) => row.rank), [1, 2, 3, 4, 5]);
    assert.ok(first.every((row) => row.score >= 0 && row.score <= 1));
  }
});

test("governance and years fields cannot affect output", () => {
  const matcher = new RoleProfileExperimentMatcher(memberships);
  const changed = { ...candidate, years_experience: 99, scenario_category: "Direct Match", intended_role_profile: "data_science", evidence_strength: "strong" };
  assert.deepEqual(matcher.rank(candidate, "tfidf"), matcher.rank(changed, "tfidf"));
});

test("all predeclared aggregations run", () => {
  for (const aggregation of AGGREGATIONS) assert.equal(new RoleProfileExperimentMatcher(memberships, { aggregation }).rank(candidate).length, 5);
  assert.throws(() => new RoleProfileExperimentMatcher(memberships, { aggregation: "median" }));
});

test("missing evidence is Top-3 only, core-only, and contributor-traceable", () => {
  const matcher = new RoleProfileExperimentMatcher(memberships);
  const rows = matcher.rank(candidate, "structured");
  for (const row of rows) {
    if (row.rank > 3) assert.deepEqual(row.missing_core_evidence, []);
    else {
      assert.ok(row.missing_core_evidence.length <= 3);
      for (const item of row.missing_core_evidence) {
        assert.ok(item.source_membership_ids.every((id) => row.contributing_membership_ids.includes(id)));
        assert.match(item.evidence_absence_message, /does not show explicit evidence/i);
      }
    }
  }
});

test("explicit narrative phrase prevents a core item from being shown as missing", () => {
  const membership = memberships.find((row) => row.skills.some((skill) => skill.evidence_tier === "core"));
  const coreLabel = membership.skills.find((skill) => skill.evidence_tier === "core").skill_label;
  const synthetic = { ...candidate, skills: [], experience_narrative: `The work explicitly used ${coreLabel} in a documented analysis.` };
  const detail = new RoleProfileExperimentMatcher(memberships).structured(synthetic, membership);
  assert.ok(!detail.missing_core_evidence.includes(coreLabel));
});

test("a frozen occupational alias in explicit skills prevents a false missing-evidence claim", () => {
  const membership = memberships.find((row) => row.role_profile_id === "data_science" && row.skills.some((skill) => skill.skill_label === "A/B testing"));
  const aliasConfig = {
    status: "frozen",
    aliases: [{
      canonical_term: "A/B testing",
      aliases: ["AB testing"],
      scope: ["missing_evidence_check"],
      role_profile_scope: ["data_science"],
    }],
  };
  const synthetic = { ...candidate, skills: ["AB testing"], experience_narrative: "" };
  const detail = new RoleProfileExperimentMatcher(memberships, { aliasConfig }).structured(synthetic, membership);
  assert.ok(!detail.missing_core_evidence.includes("A/B testing"));
});

test("evaluation metrics handle tied human maxima", () => {
  const labels = { a: 2, b: 2, c: 1, d: 0, e: 0 }; const ranking = ["a", "b", "c", "d", "e"];
  assert.equal(ndcgAtK(ranking, labels, 3), 1);
  const report = evaluateRankings({ C001: ranking }, { C001: labels });
  assert.equal(report.metrics.top1_agreement, 1); assert.equal(report.metrics.candidate_count, 1);
  assert.equal(report.metrics.mrr_label2_all, 1); assert.equal(report.metrics.mrr_label2_eligible, 1);
  assert.equal(report.metrics.all_zero_label_candidate_count, 0);
  assert.equal(report.confidence_intervals["ndcg@3"].confidence, 0.95);
  assert.equal(report.confidence_intervals["ndcg@3"].lower, 1);
  assert.equal(report.confidence_intervals["ndcg@3"].upper, 1);
});

test("all-zero nDCG is reported separately", () => {
  const ranking = ["a", "b", "c", "d", "e"];
  const report = evaluateRankings({ C001: ranking }, { C001: { a: 0, b: 0, c: 0, d: 0, e: 0 } });
  assert.equal(report.metrics["ndcg@3"], null);
  assert.equal(report.metrics["ndcg@3_all_candidates"], 0);
  assert.deepEqual(report.all_zero_label_candidate_ids, ["C001"]);
});

test("paired candidate bootstrap is deterministic and centred at zero for identical methods", () => {
  const rows = [{ candidate_id: "C001", "ndcg@3": 1, all_zero_labels: false }];
  const interval = pairedCandidateBootstrapDifference(rows, rows, "ndcg@3", { iterations: 50 });
  assert.equal(interval.observed_difference, 0);
  assert.equal(interval.lower, 0);
  assert.equal(interval.upper, 0);
});

test("resolved development labels reject blanks, duplicates, and incomplete coverage", () => {
  const candidateIds = ["C001"];
  const complete = ["strategic_analysis", "business_performance_goal_management", "business_strategy_focused_analysis", "data_analytics", "data_science"]
    .map((role_profile_id, index) => ({ candidate_id: "C001", role_profile_id, resolved_label: index % 3 }));
  assert.equal(Object.keys(resolvedLabelsFromRows(complete, candidateIds).C001).length, 5);
  assert.throws(() => resolvedLabelsFromRows(complete.slice(0, 4), candidateIds), /ANNOTATION_INCOMPLETE/);
  assert.throws(() => resolvedLabelsFromRows([...complete, complete[0]], candidateIds), /duplicate pair/);
  assert.throws(() => resolvedLabelsFromRows(complete.map((row, index) => index ? row : { ...row, resolved_label: null }), candidateIds), /ANNOTATION_INCOMPLETE/);
});

test("hybrid combines all 18 aligned memberships and applies deterministic tie priority", () => {
  const structured = new RoleProfileExperimentMatcher(memberships, { aggregation: "mean_top_2" }).rank(candidate, "structured");
  const semantic = structured.map((role) => ({
    ...role,
    memberships: role.memberships.map((row) => ({ ...row, score: 1 - row.score })),
  }));
  const hybrid = hybridRoleRanking(structured, semantic, 0.5, "mean_top_2");
  assert.equal(hybrid.length, 5);
  assert.ok(hybrid.every((row) => row.score >= 0 && row.score <= 1));
  const tied = HYBRID_EXACT_TIE_PRIORITY.map((parameter) => ({ parameter, metrics: { "ndcg@3": 1, "ndcg@5": 1, top1_agreement: 1 } }));
  assert.equal(orderMetricTrials(tied, HYBRID_EXACT_TIE_PRIORITY)[0].parameter, 0.5);
});
