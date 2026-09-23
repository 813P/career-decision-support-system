import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { RoleProfileExperimentMatcher, buildMembershipEvidence, evaluateRankings } from "../shared/role_profile_experiment.mjs";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const configPath = join(ROOT, "config", "selected", "matching_selected.json");
const freezePath = join(ROOT, "reports", "freezes", "MATCHING_SELECTED_FREEZE.md");
const outputPaths = {
  scores: join(ROOT, "results", "matching_selected_test_scores.csv"),
  rankings: join(ROOT, "reports", "matching", "matching_selected_test_rankings.json"),
  evaluation: join(ROOT, "reports", "evaluation", "matching_selected_test_evaluation.json"),
  summary: join(ROOT, "reports", "evaluation", "MATCHING_SELECTED_TEST_EVALUATION.md"),
  manifest: join(ROOT, "reports", "evaluation", "matching_selected_test_run_manifest.json"),
};
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const sha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");
const rootRelative = (path) => relative(ROOT, path).replaceAll("\\", "/");

function parseCsv(text) {
  const records = [];
  let record = [], field = "", quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { record.push(field); field = ""; }
    else if (character === "\n") {
      record.push(field.replace(/\r$/, ""));
      if (record.some((value) => value !== "")) records.push(record);
      record = []; field = "";
    } else field += character;
  }
  if (quoted) throw new Error("TEST_EVALUATION_BLOCKED: unterminated quoted CSV field");
  if (field || record.length) {
    record.push(field.replace(/\r$/, ""));
    if (record.some((value) => value !== "")) records.push(record);
  }
  const headers = records[0] ?? [];
  return records.slice(1).map((values, index) => {
    if (values.length !== headers.length) throw new Error(`TEST_EVALUATION_BLOCKED: annotation row ${index + 2} is malformed`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function labelsForSelectedCandidates(rows, selectedIds) {
  const selected = new Set(selectedIds), labels = {}, roleByMembership = new Map();
  for (const row of rows) {
    if (!selected.has(row.candidate_id)) continue;
    const label = Number(row.human_relevance);
    if (![0, 1, 2].includes(label)) throw new Error(`TEST_EVALUATION_BLOCKED: invalid label for ${row.candidate_id}/${row.membership_id}`);
    labels[row.candidate_id] ??= {};
    if (row.membership_id in labels[row.candidate_id]) throw new Error(`TEST_EVALUATION_BLOCKED: duplicate label ${row.candidate_id}/${row.membership_id}`);
    labels[row.candidate_id][row.membership_id] = label;
    roleByMembership.set(row.membership_id, row.role_profile_id);
  }
  if (Object.keys(labels).length !== selectedIds.length || roleByMembership.size !== 18) throw new Error("TEST_EVALUATION_BLOCKED: selected test annotation matrix mismatch");
  for (const candidateId of selectedIds) if (Object.keys(labels[candidateId] ?? {}).length !== 18) throw new Error(`TEST_EVALUATION_BLOCKED: ${candidateId} does not have 18 labels`);
  return { labels, roleByMembership };
}

function roleLabels(labels, roleByMembership) {
  return Object.fromEntries(Object.entries(labels).map(([candidateId, membershipLabels]) => {
    const grouped = new Map();
    for (const [membershipId, label] of Object.entries(membershipLabels)) {
      const roleId = roleByMembership.get(membershipId);
      grouped.set(roleId, Math.max(grouped.get(roleId) ?? 0, label));
    }
    if (grouped.size !== 5) throw new Error(`TEST_EVALUATION_BLOCKED: ${candidateId} does not map to five Role Profiles`);
    return [candidateId, Object.fromEntries(grouped)];
  }));
}

function addCoverage(report, rankings, universeSize) {
  for (const k of [3, 5]) report.metrics[`coverage@${k}`] = new Set(Object.values(rankings).flatMap((ranking) => ranking.slice(0, k))).size / universeSize;
  return report;
}

function formatMetric(value) {
  return value === null || value === undefined ? "n/a" : Number(value).toFixed(6);
}

async function refuseOverwrite() {
  for (const path of Object.values(outputPaths)) {
    try {
      await access(path);
      throw new Error(`TEST_EVALUATION_ALREADY_EXISTS: refusing to overwrite ${rootRelative(path)}`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

await refuseOverwrite();
const config = await json(configPath);
if (config.status !== "frozen" || config.version !== "matching_selected") throw new Error("TEST_EVALUATION_BLOCKED: selected configuration is not frozen");
if (config.method !== "tfidf" || config.aggregation !== "mean_all" || config.component_weights?.background !== 0.5 || config.component_weights?.direction !== 0.5) throw new Error("TEST_EVALUATION_BLOCKED: selected configuration differs from approved parameters");
const freezeText = await readFile(freezePath, "utf8");
const configHash = await sha256(configPath);
if (!/Status:\*\* Frozen/i.test(freezeText) || !freezeText.includes(configHash)) throw new Error("TEST_EVALUATION_BLOCKED: freeze record does not pin the selected configuration");
for (const [relativePath, expectedHash] of Object.entries(config.frozen_input_hashes ?? {})) {
  const actualHash = await sha256(join(ROOT, relativePath));
  if (actualHash !== expectedHash) throw new Error(`TEST_EVALUATION_BLOCKED: frozen input changed ${relativePath}`);
}

const selectionManifest = await json(join(ROOT, "data", "annotation", "portfolio_annotation_selection_manifest.json"));
const selectedIds = selectionManifest.primary_sample?.selected_test_candidate_ids;
if (JSON.stringify(selectedIds) !== JSON.stringify(config.test_scope.selected_candidate_ids)) throw new Error("TEST_EVALUATION_BLOCKED: selected test candidate IDs changed");
const allTestCandidates = await json(join(ROOT, "data", "candidates", "test.json"));
const selectedSet = new Set(selectedIds);
const candidates = allTestCandidates.filter((candidate) => selectedSet.has(candidate.candidate_id));
if (candidates.length !== 10 || new Set(candidates.map((candidate) => candidate.candidate_id)).size !== 10) throw new Error("TEST_EVALUATION_BLOCKED: expected ten unique selected test candidates");

const memberships = buildMembershipEvidence(
  await json(join(ROOT, "taxonomy", "role_profiles.json")),
  await json(join(ROOT, "taxonomy", "role_skill_evidence.json")),
  await json(join(ROOT, "taxonomy", "esco_occupations.json")),
  await json(join(ROOT, "config", "shared", "matching_direction_phrases.json")),
);
const aliasConfig = await json(join(ROOT, "config", "shared", "matching_aliases.json"));
const matcher = new RoleProfileExperimentMatcher(memberships, { aggregation: config.aggregation, aliasConfig });
const runs = candidates.map((candidate) => ({
  candidate_id: candidate.candidate_id,
  method: "tfidf",
  aggregation: config.aggregation,
  specification: config.version,
  rankings: matcher.rank(candidate, "tfidf"),
})).sort((left, right) => left.candidate_id.localeCompare(right.candidate_id));

const scoreRows = [];
const membershipRankings = {}, roleRankings = {};
for (const run of runs) {
  const flattened = run.rankings.flatMap((role) => role.memberships.map((membership) => ({
    candidate_id: run.candidate_id,
    membership_id: membership.membership_id,
    occupation_id: membership.occupation_uri,
    role_profile_id: membership.role_profile_id,
    background_score: membership.background_score,
    direction_score: membership.direction_score,
    final_score: membership.score,
  }))).sort((left, right) => right.final_score - left.final_score || left.membership_id.localeCompare(right.membership_id));
  if (flattened.length !== 18 || new Set(flattened.map((row) => row.membership_id)).size !== 18) throw new Error(`TEST_EVALUATION_BLOCKED: incomplete membership ranking for ${run.candidate_id}`);
  flattened.forEach((row, index) => scoreRows.push({ ...row, rank: index + 1 }));
  membershipRankings[run.candidate_id] = flattened.map((row) => row.membership_id);
  roleRankings[run.candidate_id] = run.rankings.map((role) => role.role_profile_id);
}

const annotationRows = parseCsv(await readFile(join(ROOT, "data", "annotation", "annotation_primary.csv"), "utf8"));
const { labels, roleByMembership } = labelsForSelectedCandidates(annotationRows, selectedIds);
const bootstrap = { iterations: 2000, confidence: 0.95, seed: "career-final-test-bootstrap" };
const membershipEvaluation = addCoverage(evaluateRankings(membershipRankings, labels, bootstrap), membershipRankings, 18);
const roleEvaluation = addCoverage(evaluateRankings(roleRankings, roleLabels(labels, roleByMembership), bootstrap), roleRankings, 5);
const evaluation = {
  report_name: "Selected matching one-time test evaluation",
  status: "final_one_time_test_completed_no_retuning",
  specification: config.version,
  method: config.method,
  aggregation: config.aggregation,
  component_weights: config.component_weights,
  test_scope: { type: "preselected_stratified_subset", candidate_count: 10, membership_judgement_count: 180, selected_candidate_ids: selectedIds },
  primary_evaluation_unit: "candidate_x_membership",
  primary_metric: "candidate-level membership nDCG@3",
  membership_evaluation: membershipEvaluation,
  secondary_role_profile_evaluation: { label_derivation: config.role_profile_label_derivation, ...roleEvaluation },
  bootstrap,
  limitations: [
    "Single-annotator exploratory offline evaluation; no inter-annotator reliability estimate is available.",
    "The test result covers a preselected stratified subset of 10 candidates, not the complete 40-candidate frozen test split.",
    "No parameter or method may be changed after this test evaluation.",
  ],
  retuning_after_test: false,
};

const headers = ["candidate_id", "membership_id", "occupation_id", "role_profile_id", "background_score", "direction_score", "final_score", "rank"];
const scoreCsv = `\uFEFF${[headers, ...scoreRows.map((row) => headers.map((header) => row[header]))].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
const summary = `# Selected Matching — Final Test Evaluation

**Status:** Final one-time test completed; no retuning permitted  
**Configuration:** \`${config.method} + ${config.aggregation}\`  
**Scope:** 10 preselected stratified test candidates × 18 memberships = 180 judgements

## Primary membership-ranking result

| Metric | Result | 95% candidate-bootstrap interval |
|---|---:|---:|
| nDCG@3 | ${formatMetric(membershipEvaluation.metrics["ndcg@3"])} | [${formatMetric(membershipEvaluation.confidence_intervals["ndcg@3"].lower)}, ${formatMetric(membershipEvaluation.confidence_intervals["ndcg@3"].upper)}] |
| nDCG@5 | ${formatMetric(membershipEvaluation.metrics["ndcg@5"])} | [${formatMetric(membershipEvaluation.confidence_intervals["ndcg@5"].lower)}, ${formatMetric(membershipEvaluation.confidence_intervals["ndcg@5"].upper)}] |
| Top-1 agreement | ${formatMetric(membershipEvaluation.metrics.top1_agreement)} | [${formatMetric(membershipEvaluation.confidence_intervals.top1_agreement.lower)}, ${formatMetric(membershipEvaluation.confidence_intervals.top1_agreement.upper)}] |
| MRR (label 2 eligible) | ${formatMetric(membershipEvaluation.metrics.mrr_label2_eligible)} | [${formatMetric(membershipEvaluation.confidence_intervals.mrr_label2_eligible.lower)}, ${formatMetric(membershipEvaluation.confidence_intervals.mrr_label2_eligible.upper)}] |
| Coverage@3 | ${formatMetric(membershipEvaluation.metrics["coverage@3"])} | — |

## Secondary Role Profile result

| Metric | Result |
|---|---:|
| nDCG@3 | ${formatMetric(roleEvaluation.metrics["ndcg@3"])} |
| nDCG@5 | ${formatMetric(roleEvaluation.metrics["ndcg@5"])} |
| Top-1 agreement | ${formatMetric(roleEvaluation.metrics.top1_agreement)} |
| Coverage@3 | ${formatMetric(roleEvaluation.metrics["coverage@3"])} |

Role Profile relevance is derived as the maximum frozen membership relevance within each Role Profile, matching the frozen development-selection specification.

## Interpretation limits

- This is a single-annotator exploratory offline evaluation; reliability is not estimated.
- The result covers the preselected 10-candidate stratified test subset, not all 40 frozen test candidates.
- The selected configuration is frozen and must not be retuned after viewing these results.
`;

for (const path of Object.values(outputPaths)) await mkdir(dirname(path), { recursive: true });
await writeFile(outputPaths.scores, scoreCsv, "utf8");
await writeFile(outputPaths.rankings, `${JSON.stringify(runs, null, 2)}\n`, "utf8");
await writeFile(outputPaths.evaluation, `${JSON.stringify(evaluation, null, 2)}\n`, "utf8");
await writeFile(outputPaths.summary, summary, "utf8");
const outputHashes = Object.fromEntries(await Promise.all(Object.entries(outputPaths).filter(([name]) => name !== "manifest").map(async ([, path]) => [rootRelative(path), await sha256(path)])));
const runManifest = {
  manifest_name: "Selected matching final test run",
  status: "final_one_time_test_completed_no_retuning",
  specification_sha256: configHash,
  test_candidate_ids: selectedIds,
  test_candidate_count: 10,
  judgement_count: 180,
  outputs: outputHashes,
  rerun_policy: "The runner refuses to overwrite these outputs. Any rerun would require explicit versioning and must not be used for retuning.",
};
await writeFile(outputPaths.manifest, `${JSON.stringify(runManifest, null, 2)}\n`, "utf8");
process.stdout.write(`FINAL_TEST_EVALUATION_COMPLETED specification=${config.version} candidates=10 memberships=180 ndcg3=${membershipEvaluation.metrics["ndcg@3"].toFixed(6)} no_retuning=true\n`);
