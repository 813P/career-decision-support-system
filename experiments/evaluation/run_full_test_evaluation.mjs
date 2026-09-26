import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { RoleProfileExperimentMatcher, buildMembershipEvidence, evaluateRankings } from "../shared/role_profile_experiment.mjs";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const configPath = join(ROOT, "config", "selected", "tfidf.json");
const freezePath = join(ROOT, "reports", "freezes", "TFIDF_CONFIGURATION_FREEZE.md");
const outputPaths = {
  scores: join(ROOT, "results", "tfidf_full_test_scores.csv"),
  rankings: join(ROOT, "reports", "matching", "tfidf_full_test_rankings.json"),
  evaluation: join(ROOT, "reports", "evaluation", "tfidf_full_test_evaluation.json"),
  summary: join(ROOT, "reports", "evaluation", "TFIDF_FULL_TEST_EVALUATION.md"),
  manifest: join(ROOT, "reports", "evaluation", "tfidf_full_test_run_manifest.json"),
};
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const sha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");
const rel = (path) => relative(ROOT, path).replaceAll("\\", "/");

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
  if (quoted) throw new Error("FULL_TEST_BLOCKED: unterminated quoted CSV field");
  if (field || record.length) {
    record.push(field.replace(/\r$/, ""));
    if (record.some((value) => value !== "")) records.push(record);
  }
  const headers = records[0] ?? [];
  return records.slice(1).map((values, index) => {
    if (values.length !== headers.length) throw new Error(`FULL_TEST_BLOCKED: malformed annotation row ${index + 2}`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function labelsForCandidates(rows, candidateIds) {
  const expected = new Set(candidateIds), labels = {}, roleByMembership = new Map();
  for (const row of rows) {
    if (!expected.has(row.candidate_id)) continue;
    const label = Number(row.human_relevance);
    if (![0, 1, 2].includes(label)) throw new Error(`FULL_TEST_BLOCKED: invalid label ${row.candidate_id}/${row.membership_id}`);
    labels[row.candidate_id] ??= {};
    if (row.membership_id in labels[row.candidate_id]) throw new Error(`FULL_TEST_BLOCKED: duplicate label ${row.candidate_id}/${row.membership_id}`);
    labels[row.candidate_id][row.membership_id] = label;
    const previous = roleByMembership.get(row.membership_id);
    if (previous && previous !== row.role_profile_id) throw new Error(`FULL_TEST_BLOCKED: inconsistent role for ${row.membership_id}`);
    roleByMembership.set(row.membership_id, row.role_profile_id);
  }
  if (Object.keys(labels).length !== candidateIds.length || roleByMembership.size !== 18) throw new Error("FULL_TEST_BLOCKED: annotation matrix mismatch");
  for (const candidateId of candidateIds) if (Object.keys(labels[candidateId] ?? {}).length !== 18) throw new Error(`FULL_TEST_BLOCKED: ${candidateId} does not have 18 labels`);
  return { labels, roleByMembership };
}

function roleLabels(labels, roleByMembership) {
  return Object.fromEntries(Object.entries(labels).map(([candidateId, membershipLabels]) => {
    const grouped = new Map();
    for (const [membershipId, label] of Object.entries(membershipLabels)) {
      const roleId = roleByMembership.get(membershipId);
      grouped.set(roleId, Math.max(grouped.get(roleId) ?? 0, label));
    }
    if (grouped.size !== 5) throw new Error(`FULL_TEST_BLOCKED: ${candidateId} does not map to five Role Profiles`);
    return [candidateId, Object.fromEntries(grouped)];
  }));
}

function addCoverage(report, rankings, universeSize) {
  for (const k of [3, 5]) report.metrics[`coverage@${k}`] = new Set(Object.values(rankings).flatMap((ranking) => ranking.slice(0, k))).size / universeSize;
  return report;
}

function pick(object, ids) {
  return Object.fromEntries(ids.map((id) => [id, object[id]]));
}

function evaluateScope(ids, membershipRankings, roleRankings, labels, roleByMembership, seed) {
  const scopedLabels = pick(labels, ids);
  const bootstrap = { iterations: 2000, confidence: 0.95, seed };
  return {
    candidate_ids: ids,
    candidate_count: ids.length,
    membership_evaluation: addCoverage(evaluateRankings(pick(membershipRankings, ids), scopedLabels, bootstrap), pick(membershipRankings, ids), 18),
    role_profile_evaluation: addCoverage(evaluateRankings(pick(roleRankings, ids), roleLabels(scopedLabels, roleByMembership), bootstrap), pick(roleRankings, ids), 5),
  };
}

function format(value) {
  return value === null || value === undefined ? "n/a" : Number(value).toFixed(6);
}

for (const path of Object.values(outputPaths)) {
  try { await access(path); throw new Error(`FULL_TEST_ALREADY_EXISTS: refusing to overwrite ${rel(path)}`); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
}
const config = await json(configPath);
if (config.status !== "frozen" || config.study_id !== "tfidf_full_test_evaluation") throw new Error("FULL_TEST_BLOCKED: configuration is not the frozen TF-IDF specification");
if (config.method !== "tfidf" || config.aggregation !== "mean_all" || config.component_weights?.background !== 0.5 || config.component_weights?.direction !== 0.5) throw new Error("FULL_TEST_BLOCKED: approved parameters changed");
const configHash = await sha256(configPath);
const freezeText = await readFile(freezePath, "utf8");
if (!/Status:\*\* Frozen/i.test(freezeText) || !freezeText.includes(configHash)) throw new Error("FULL_TEST_BLOCKED: freeze record does not pin the configuration");
for (const [path, expected] of Object.entries(config.frozen_input_hashes)) {
  if (await sha256(join(ROOT, path)) !== expected) throw new Error(`FULL_TEST_BLOCKED: frozen input changed ${path}`);
}
const candidates = (await json(join(ROOT, "data", "candidates", "test.json"))).sort((a, b) => a.candidate_id.localeCompare(b.candidate_id));
const candidateIds = candidates.map((row) => row.candidate_id);
if (JSON.stringify(candidateIds) !== JSON.stringify(config.test_scope.candidate_ids) || candidateIds.length !== 40) throw new Error("FULL_TEST_BLOCKED: full test candidate scope changed");
const memberships = buildMembershipEvidence(
  await json(join(ROOT, "taxonomy", "role_profiles.json")),
  await json(join(ROOT, "taxonomy", "role_skill_evidence.json")),
  await json(join(ROOT, "taxonomy", "esco_occupations.json")),
  await json(join(ROOT, "config", "shared", "matching_direction_phrases.json")),
);
const aliasConfig = await json(join(ROOT, "config", "shared", "matching_aliases.json"));
const matcher = new RoleProfileExperimentMatcher(memberships, { aggregation: config.aggregation, aliasConfig });
const runs = candidates.map((candidate) => ({ candidate_id: candidate.candidate_id, method: config.method, aggregation: config.aggregation, specification: config.study_id, rankings: matcher.rank(candidate, config.method) }));
const scoreRows = [], membershipRankings = {}, roleRankings = {};
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
  if (flattened.length !== 18 || new Set(flattened.map((row) => row.membership_id)).size !== 18) throw new Error(`FULL_TEST_BLOCKED: incomplete ranking ${run.candidate_id}`);
  flattened.forEach((row, index) => scoreRows.push({ ...row, rank: index + 1 }));
  membershipRankings[run.candidate_id] = flattened.map((row) => row.membership_id);
  roleRankings[run.candidate_id] = run.rankings.map((role) => role.role_profile_id);
}
const annotationRows = parseCsv(await readFile(join(ROOT, "data", "annotation", "annotation_test_full.csv"), "utf8"));
const { labels, roleByMembership } = labelsForCandidates(annotationRows, candidateIds);
const full = evaluateScope(candidateIds, membershipRankings, roleRankings, labels, roleByMembership, "career-v2-full-test-bootstrap");
const evaluation = {
  report_name: "Selected TF-IDF complete 40-candidate test evaluation",
  status: "full_test_completed_no_retuning",
  specification: config.study_id,
  method: config.method,
  aggregation: config.aggregation,
  component_weights: config.component_weights,
  test_scope: { type: "complete_frozen_test_split", candidate_count: 40, membership_judgement_count: 720 },
  primary_evaluation_unit: "candidate_x_membership",
  primary_metric: "candidate-level membership nDCG@3",
  full_test: full,
  role_profile_label_derivation: config.role_profile_label_derivation,
  limitations: [
    "Single-annotator exploratory offline evaluation; no inter-annotator reliability estimate is available.",
    "The evaluation uses a fixed synthetic candidate dataset and does not establish population validity.",
    "Scores are relevance-ranking measures, not employment or career-success probabilities."
  ],
  retuning_after_test: false,
};
const headers = ["candidate_id", "membership_id", "occupation_id", "role_profile_id", "background_score", "direction_score", "final_score", "rank"];
const scoreCsv = `\uFEFF${[headers, ...scoreRows.map((row) => headers.map((header) => row[header]))].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
const membership = full.membership_evaluation;
const role = full.role_profile_evaluation;
const summary = `# Selected TF-IDF — Full 40-Candidate Test Evaluation\n\n**Status:** Full frozen test completed; no retuning permitted  \n**Configuration:** \`${config.method} + ${config.aggregation}\`  \n**Scope:** 40 test candidates × 18 memberships = 720 judgements\n\n## Primary membership-ranking result\n\n| Metric | Result | 95% candidate-bootstrap interval |\n|---|---:|---:|\n| nDCG@3 | ${format(membership.metrics["ndcg@3"])} | [${format(membership.confidence_intervals["ndcg@3"].lower)}, ${format(membership.confidence_intervals["ndcg@3"].upper)}] |\n| nDCG@5 | ${format(membership.metrics["ndcg@5"])} | [${format(membership.confidence_intervals["ndcg@5"].lower)}, ${format(membership.confidence_intervals["ndcg@5"].upper)}] |\n| Top-1 agreement | ${format(membership.metrics.top1_agreement)} | [${format(membership.confidence_intervals.top1_agreement.lower)}, ${format(membership.confidence_intervals.top1_agreement.upper)}] |\n| MRR (label 2 eligible) | ${format(membership.metrics.mrr_label2_eligible)} | [${format(membership.confidence_intervals.mrr_label2_eligible.lower)}, ${format(membership.confidence_intervals.mrr_label2_eligible.upper)}] |\n| Coverage@3 | ${format(membership.metrics["coverage@3"])} | — |\n\n## Secondary Role Profile result\n\n| Metric | Result |\n|---|---:|\n| nDCG@3 | ${format(role.metrics["ndcg@3"])} |\n| nDCG@5 | ${format(role.metrics["ndcg@5"])} |\n| Top-1 agreement | ${format(role.metrics.top1_agreement)} |\n| Coverage@3 | ${format(role.metrics["coverage@3"])} |\n\nThe evaluation covers the complete 40-candidate test split. No method or parameter is changed after test evaluation.\n`;
for (const path of Object.values(outputPaths)) await mkdir(dirname(path), { recursive: true });
await writeFile(outputPaths.scores, scoreCsv, "utf8");
await writeFile(outputPaths.rankings, `${JSON.stringify(runs, null, 2)}\n`, "utf8");
await writeFile(outputPaths.evaluation, `${JSON.stringify(evaluation, null, 2)}\n`, "utf8");
await writeFile(outputPaths.summary, summary, "utf8");
const outputHashes = Object.fromEntries(await Promise.all(Object.entries(outputPaths).filter(([name]) => name !== "manifest").map(async ([, path]) => [rel(path), await sha256(path)])));
const runManifest = {
  manifest_name: "Selected TF-IDF complete test run",
  status: "full_test_completed_no_retuning",
  specification_sha256: configHash,
  test_candidate_ids: candidateIds,
  test_candidate_count: 40,
  judgement_count: 720,
  outputs: outputHashes,
  rerun_policy: "The runner refuses to overwrite these outputs. Any changed input, code, or result requires a new study version."
};
await writeFile(outputPaths.manifest, `${JSON.stringify(runManifest, null, 2)}\n`, "utf8");
process.stdout.write(`FULL_TEST_COMPLETED specification=${config.study_id} candidates=40 memberships=720 ndcg3=${membership.metrics["ndcg@3"].toFixed(6)} no_retuning=true\n`);
