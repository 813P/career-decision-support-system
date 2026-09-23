import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { HYBRID_WEIGHTS, evaluateRankings, pairedCandidateBootstrapDifference } from "../shared/role_profile_experiment.mjs";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const args = Object.fromEntries(process.argv.slice(2).map((item) => item.split("=", 2)));
const outputPath = args["--output"] ?? join(ROOT, "reports", "matching", "development_parameter_selection.json");
const labelsPath = args["--labels"] ?? join(ROOT, "data", "annotation", "annotation_primary.csv");
const paths = {
  manifest: join(ROOT, "data", "annotation", "annotation_primary_freeze_manifest.json"),
  development: join(ROOT, "data", "candidates", "development.json"),
  structured: join(ROOT, "reports", "matching", "development_structured_entry.json"),
  tfidf: join(ROOT, "reports", "matching", "development_tfidf_entry.json"),
  semantic: join(ROOT, "reports", "matching", "development_semantic_entry.json"),
};
const BOOTSTRAP = { iterations: 2000, confidence: 0.95, seed: "career-development-membership-selection" };
const PRACTICAL_TIE_NDCG3 = 0.01;
const AGGREGATIONS = ["max", "mean_top_2", "mean_all"];
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const hash = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");
const rootRelative = (path) => relative(ROOT, path).replaceAll("\\", "/");

function parseCsv(text) {
  const records = [];
  let record = [], field = "", quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"'; index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { record.push(field); field = ""; }
    else if (character === "\n") {
      record.push(field.replace(/\r$/, ""));
      if (record.some((value) => value !== "")) records.push(record);
      record = []; field = "";
    } else field += character;
  }
  if (quoted) throw new Error("ANNOTATION_INVALID: unterminated quoted CSV field");
  if (field || record.length) {
    record.push(field.replace(/\r$/, ""));
    if (record.some((value) => value !== "")) records.push(record);
  }
  if (records.length < 2) throw new Error("ANNOTATION_INVALID: CSV has no data rows");
  const headers = records[0];
  if (new Set(headers).size !== headers.length) throw new Error("ANNOTATION_INVALID: duplicate CSV headers");
  return records.slice(1).map((values, index) => {
    if (values.length !== headers.length) throw new Error(`ANNOTATION_INVALID: row ${index + 2} has ${values.length} fields; expected ${headers.length}`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

function labelsFromCsv(rows, developmentIds) {
  const labels = {}, roleByMembership = new Map();
  let ignoredNonDevelopmentRows = 0;
  for (const row of rows) {
    if (!developmentIds.has(row.candidate_id)) { ignoredNonDevelopmentRows += 1; continue; }
    const label = Number(row.human_relevance);
    if (![0, 1, 2].includes(label)) throw new Error(`ANNOTATION_INCOMPLETE: invalid label for ${row.candidate_id}/${row.membership_id}`);
    labels[row.candidate_id] ??= {};
    if (row.membership_id in labels[row.candidate_id]) throw new Error(`ANNOTATION_INVALID: duplicate pair ${row.candidate_id}/${row.membership_id}`);
    labels[row.candidate_id][row.membership_id] = label;
    const existingRole = roleByMembership.get(row.membership_id);
    if (existingRole && existingRole !== row.role_profile_id) throw new Error(`ANNOTATION_INVALID: inconsistent Role Profile for ${row.membership_id}`);
    roleByMembership.set(row.membership_id, row.role_profile_id);
  }
  if (Object.keys(labels).length !== developmentIds.size || roleByMembership.size !== 18) throw new Error("ANNOTATION_INCOMPLETE: development annotation matrix mismatch");
  for (const candidateId of developmentIds) if (Object.keys(labels[candidateId] ?? {}).length !== 18) throw new Error(`ANNOTATION_INCOMPLETE: ${candidateId} does not have 18 membership labels`);
  return { labels, roleByMembership, ignoredNonDevelopmentRows };
}

function flattenEntry(payload, developmentIds, name) {
  const runs = Array.isArray(payload) ? payload : payload?.results;
  if (!Array.isArray(runs) || runs.length !== developmentIds.size) throw new Error(`${name.toUpperCase()}_INPUT_INVALID: expected ${developmentIds.size} development candidates`);
  const output = new Map();
  for (const run of runs) {
    if (!developmentIds.has(run.candidate_id) || output.has(run.candidate_id)) throw new Error(`${name.toUpperCase()}_INPUT_INVALID: unexpected or duplicate candidate ${run.candidate_id}`);
    const memberships = new Map();
    for (const role of run.rankings ?? []) for (const membership of role.memberships ?? []) {
      if (!membership.membership_id || memberships.has(membership.membership_id)) throw new Error(`${name.toUpperCase()}_INPUT_INVALID: duplicate or missing membership for ${run.candidate_id}`);
      const score = Number(membership.score);
      if (!Number.isFinite(score) || score < 0 || score > 1) throw new Error(`${name.toUpperCase()}_INPUT_INVALID: invalid score for ${run.candidate_id}/${membership.membership_id}`);
      memberships.set(membership.membership_id, { membership_id: membership.membership_id, role_profile_id: membership.role_profile_id ?? role.role_profile_id, score });
    }
    if (memberships.size !== 18) throw new Error(`${name.toUpperCase()}_INPUT_INVALID: ${run.candidate_id} has ${memberships.size} memberships; expected 18`);
    output.set(run.candidate_id, memberships);
  }
  return output;
}

function validateMembershipMatrices(scoreSets, labels) {
  for (const [method, candidates] of scoreSets) for (const [candidateId, candidateLabels] of Object.entries(labels)) {
    const observed = [...(candidates.get(candidateId)?.keys() ?? [])].sort();
    const expected = Object.keys(candidateLabels).sort();
    if (JSON.stringify(observed) !== JSON.stringify(expected)) throw new Error(`${method.toUpperCase()}_INPUT_INVALID: membership IDs do not match labels for ${candidateId}`);
  }
}

function hybridScores(structured, semantic, alpha) {
  const output = new Map();
  for (const [candidateId, structuredRows] of structured) {
    const combined = new Map(), semanticRows = semantic.get(candidateId);
    for (const [membershipId, left] of structuredRows) {
      const right = semanticRows?.get(membershipId);
      if (!right || right.role_profile_id !== left.role_profile_id) throw new Error(`HYBRID_INPUT_INVALID: membership mismatch ${candidateId}/${membershipId}`);
      combined.set(membershipId, { membership_id: membershipId, role_profile_id: left.role_profile_id, score: alpha * left.score + (1 - alpha) * right.score });
    }
    output.set(candidateId, combined);
  }
  return output;
}

function membershipRankings(scoreSet) {
  return Object.fromEntries([...scoreSet].map(([candidateId, memberships]) => [candidateId,
    [...memberships.values()].sort((left, right) => right.score - left.score || left.membership_id.localeCompare(right.membership_id)).map((row) => row.membership_id)]));
}

function roleLabelsFromMembershipLabels(labels, roleByMembership) {
  return Object.fromEntries(Object.entries(labels).map(([candidateId, candidateLabels]) => {
    const grouped = new Map();
    for (const [membershipId, label] of Object.entries(candidateLabels)) {
      const roleId = roleByMembership.get(membershipId);
      grouped.set(roleId, Math.max(grouped.get(roleId) ?? 0, label));
    }
    if (grouped.size !== 5) throw new Error(`ANNOTATION_INVALID: ${candidateId} does not map to five Role Profiles`);
    return [candidateId, Object.fromEntries(grouped)];
  }));
}

function roleRankings(scoreSet, aggregation) {
  return Object.fromEntries([...scoreSet].map(([candidateId, memberships]) => {
    const grouped = new Map();
    for (const row of memberships.values()) {
      if (!grouped.has(row.role_profile_id)) grouped.set(row.role_profile_id, []);
      grouped.get(row.role_profile_id).push(row);
    }
    const scores = [...grouped].map(([roleId, rows]) => {
      const ordered = [...rows].sort((left, right) => right.score - left.score || left.membership_id.localeCompare(right.membership_id));
      const selected = aggregation === "max" ? ordered.slice(0, 1) : aggregation === "mean_top_2" ? ordered.slice(0, 2) : ordered;
      return { roleId, score: selected.reduce((sum, row) => sum + row.score, 0) / selected.length };
    });
    return [candidateId, scores.sort((left, right) => right.score - left.score || left.roleId.localeCompare(right.roleId)).map((row) => row.roleId)];
  }));
}

function evaluate(rankings, labels, universeSize) {
  const report = evaluateRankings(rankings, labels, BOOTSTRAP);
  for (const k of [3, 5]) report.metrics[`coverage@${k}`] = new Set(Object.values(rankings).flatMap((ranking) => ranking.slice(0, k))).size / universeSize;
  return report;
}

function pairedDifference(trial, leader) {
  return pairedCandidateBootstrapDifference(trial.candidate_rows, leader.candidate_rows, "ndcg@3", { ...BOOTSTRAP, seed: "career-development-paired-selection" });
}

const manifest = await json(paths.manifest);
if (manifest.status !== "frozen") throw new Error("DEVELOPMENT_SELECTION_BLOCKED: annotation manifest is not frozen");
const annotationHash = await hash(labelsPath);
if (rootRelative(labelsPath) === "data/annotation/annotation_primary.csv" && manifest.sha256?.[rootRelative(labelsPath)] !== annotationHash) throw new Error("DEVELOPMENT_SELECTION_BLOCKED: frozen annotation checksum mismatch");

const development = await json(paths.development);
const developmentIds = new Set(development.map((row) => row.candidate_id));
if (developmentIds.size !== 20) throw new Error("DEVELOPMENT_SELECTION_BLOCKED: expected exactly 20 development candidates");
const { labels, roleByMembership, ignoredNonDevelopmentRows } = labelsFromCsv(parseCsv(await readFile(labelsPath, "utf8")), developmentIds);
const [structuredPayload, tfidfPayload, semanticPayload] = await Promise.all([json(paths.structured), json(paths.tfidf), json(paths.semantic)]);
if (semanticPayload.split !== "dev" || semanticPayload.test_rankings_generated !== false) throw new Error("DEVELOPMENT_SELECTION_BLOCKED: Semantic input is not development-only");

const structured = flattenEntry(structuredPayload, developmentIds, "structured");
const tfidf = flattenEntry(tfidfPayload, developmentIds, "tfidf");
const semantic = flattenEntry(semanticPayload, developmentIds, "semantic");
const methodScoreSets = new Map([["structured", structured], ["tfidf", tfidf], ["semantic", semantic]]);
for (const alpha of HYBRID_WEIGHTS.filter((value) => value > 0 && value < 1)) methodScoreSets.set(`hybrid_structured_${alpha}_semantic_${1 - alpha}`, hybridScores(structured, semantic, alpha));
validateMembershipMatrices(methodScoreSets, labels);

const simplicityPriority = new Map([["structured", 0], ["tfidf", 1], ["semantic", 2], ...[...methodScoreSets.keys()].filter((name) => name.startsWith("hybrid_")).map((name) => [name, 3])]);
const membershipTrials = [...methodScoreSets].map(([method, scoreSet]) => ({ method, ...evaluate(membershipRankings(scoreSet), labels, 18) }));
membershipTrials.sort((left, right) => right.metrics["ndcg@3"] - left.metrics["ndcg@3"] || right.metrics["ndcg@5"] - left.metrics["ndcg@5"] || right.metrics.top1_agreement - left.metrics.top1_agreement || simplicityPriority.get(left.method) - simplicityPriority.get(right.method));
const metricLeader = membershipTrials[0];
for (const trial of membershipTrials) trial.paired_ndcg3_difference_vs_metric_leader = pairedDifference(trial, metricLeader);
const practicalTies = membershipTrials.filter((trial) => metricLeader.metrics["ndcg@3"] - trial.metrics["ndcg@3"] <= PRACTICAL_TIE_NDCG3 && trial.paired_ndcg3_difference_vs_metric_leader.lower <= 0 && trial.paired_ndcg3_difference_vs_metric_leader.upper >= 0);
const recommendedMethod = [...practicalTies].sort((left, right) => simplicityPriority.get(left.method) - simplicityPriority.get(right.method))[0];

const roleLabels = roleLabelsFromMembershipLabels(labels, roleByMembership);
const aggregationPriority = new Map([["mean_top_2", 0], ["max", 1], ["mean_all", 2]]);
const aggregationTrials = AGGREGATIONS.map((aggregation) => ({ aggregation, ...evaluate(roleRankings(methodScoreSets.get(recommendedMethod.method), aggregation), roleLabels, 5) }));
aggregationTrials.sort((left, right) => right.metrics["ndcg@3"] - left.metrics["ndcg@3"] || right.metrics["ndcg@5"] - left.metrics["ndcg@5"] || right.metrics.top1_agreement - left.metrics.top1_agreement || aggregationPriority.get(left.aggregation) - aggregationPriority.get(right.aggregation));
const recommendedAggregation = aggregationTrials[0];
for (const trial of aggregationTrials) trial.paired_ndcg3_difference_vs_metric_leader = pairedDifference(trial, recommendedAggregation);

const inputPaths = [labelsPath, paths.manifest, paths.development, paths.structured, paths.tfidf, paths.semantic];
const report = {
  report_name: "Development-only matching parameter selection",
  status: "development_selected_requires_researcher_signoff",
  split: "development",
  annotation_unit: "candidate_x_membership",
  development_candidates: 20,
  development_judgements: 360,
  ignored_non_development_annotation_rows: ignoredNonDevelopmentRows,
  test_labels_used: false,
  test_rankings_generated: false,
  primary_metric: "candidate-level membership nDCG@3",
  selection_rule: "Point leader by membership nDCG@3; when the gap is <= 0.01 and the paired candidate-bootstrap interval includes zero, recommend the simpler predeclared configuration for researcher sign-off",
  practical_tie_threshold_ndcg3: PRACTICAL_TIE_NDCG3,
  method_search_space: ["structured", "tfidf", "semantic", "hybrid(structured, semantic)"],
  hybrid_alpha_definition: "score = alpha * structured_score + (1 - alpha) * semantic_score",
  hybrid_alphas: HYBRID_WEIGHTS,
  hybrid_endpoint_equivalence: { alpha_0: "semantic", alpha_1: "structured" },
  metric_leader: metricLeader.method,
  practical_tie_methods: practicalTies.map((trial) => trial.method),
  recommended_method_requires_signoff: recommendedMethod.method,
  membership_trials: membershipTrials,
  role_profile_label_derivation: "maximum human_relevance among memberships assigned to each Role Profile",
  aggregation_search_space: AGGREGATIONS,
  aggregation_evaluated_for_method: recommendedMethod.method,
  recommended_aggregation_requires_signoff: recommendedAggregation.aggregation,
  aggregation_trials: aggregationTrials,
  bootstrap: { ...BOOTSTRAP, unit: "candidate", method: "percentile bootstrap" },
  input_hashes: Object.fromEntries(await Promise.all(inputPaths.map(async (path) => [rootRelative(path), await hash(path)]))),
  guardrails: { background_direction_weights_changed: false, scoring_formulas_changed: false, candidate_data_regenerated: false, role_profiles_modified: false, memberships_modified: false, test_evaluation_run: false },
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`DEVELOPMENT_PARAMETERS_SELECTED metric_leader=${metricLeader.method} recommended_method=${recommendedMethod.method} aggregation=${recommendedAggregation.aggregation} signoff_required=true test_rankings=false\n`);
