import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const paths = {
  all: join(ROOT, "data", "annotation", "annotation_all_60.csv"),
  test: join(ROOT, "data", "annotation", "annotation_test_full.csv"),
  development: join(ROOT, "data", "candidates", "development.json"),
  testCandidates: join(ROOT, "data", "candidates", "test.json"),
  guideline: join(ROOT, "docs", "HUMAN_ANNOTATION_GUIDELINE.md"),
  output: join(ROOT, "data", "annotation", "annotation_manifest.json"),
};
const rel = (path) => relative(ROOT, path).replaceAll("\\", "/");
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const sha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

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
  if (quoted) throw new Error("ANNOTATION_INVALID: unterminated quoted field");
  if (field || record.length) {
    record.push(field.replace(/\r$/, ""));
    if (record.some((value) => value !== "")) records.push(record);
  }
  const headers = records[0] ?? [];
  if (new Set(headers).size !== headers.length) throw new Error("ANNOTATION_INVALID: duplicate headers");
  return records.slice(1).map((values, index) => {
    if (values.length !== headers.length) throw new Error(`ANNOTATION_INVALID: row ${index + 2} has ${values.length} fields; expected ${headers.length}`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

function validateRows(rows, expectedIds, expectedCount, label) {
  if (rows.length !== expectedCount * 18) throw new Error(`${label}: expected ${expectedCount * 18} rows; found ${rows.length}`);
  const pairs = new Set(), memberships = new Set(), seenCandidates = new Set();
  const distribution = { 0: 0, 1: 0, 2: 0 };
  let missingLabel1Evidence = 0, invalidEvidence = 0, exposedModelFields = 0, invalidTimestamps = 0;
  for (const row of rows) {
    if (!expectedIds.has(row.candidate_id)) throw new Error(`${label}: unexpected candidate ${row.candidate_id}`);
    const pair = `${row.candidate_id}\u0000${row.membership_id}`;
    if (pairs.has(pair)) throw new Error(`${label}: duplicate pair ${row.candidate_id}/${row.membership_id}`);
    pairs.add(pair); memberships.add(row.membership_id); seenCandidates.add(row.candidate_id);
    if (!["0", "1", "2"].includes(row.human_relevance)) throw new Error(`${label}: invalid relevance ${row.candidate_id}/${row.membership_id}`);
    distribution[row.human_relevance] += 1;
    if (row.human_relevance === "1" && !row.evidence_strength) missingLabel1Evidence += 1;
    if (row.evidence_strength && !["strong", "moderate", "weak"].includes(row.evidence_strength)) invalidEvidence += 1;
    if (row.model_rank || row.model_score) exposedModelFields += 1;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.annotation_timestamp)) invalidTimestamps += 1;
  }
  if (seenCandidates.size !== expectedCount || memberships.size !== 18) throw new Error(`${label}: candidate or membership matrix mismatch`);
  for (const candidateId of expectedIds) {
    const count = rows.filter((row) => row.candidate_id === candidateId).length;
    if (count !== 18) throw new Error(`${label}: ${candidateId} has ${count} rows`);
  }
  if (missingLabel1Evidence || invalidEvidence || exposedModelFields || invalidTimestamps) {
    throw new Error(`${label}: QC failed missing_label1_evidence=${missingLabel1Evidence} invalid_evidence=${invalidEvidence} exposed_model=${exposedModelFields} invalid_timestamps=${invalidTimestamps}`);
  }
  return { candidate_count: expectedCount, membership_count: memberships.size, judgement_count: rows.length, unique_pairs: pairs.size, label_distribution: distribution, missing_label_1_evidence_strength: 0, invalid_evidence_strength: 0, model_fields_exposed: 0, invalid_timestamps: 0 };
}

const [development, testCandidates, allRows, testRows] = await Promise.all([
  json(paths.development), json(paths.testCandidates), parseCsv(await readFile(paths.all, "utf8")), parseCsv(await readFile(paths.test, "utf8")),
]);
const developmentIds = new Set(development.map((row) => row.candidate_id));
const testIds = new Set(testCandidates.map((row) => row.candidate_id));
if (developmentIds.size !== 20 || testIds.size !== 40 || [...developmentIds].some((id) => testIds.has(id))) throw new Error("ANNOTATION_INVALID: development/test split mismatch");
const allIds = new Set([...developmentIds, ...testIds]);
const allQc = validateRows(allRows, allIds, 60, "all_60");
const testQc = validateRows(testRows, testIds, 40, "test_full");
const testFromAll = new Map(allRows.filter((row) => testIds.has(row.candidate_id)).map((row) => [`${row.candidate_id}\u0000${row.membership_id}`, row]));
for (const row of testRows) {
  const other = testFromAll.get(`${row.candidate_id}\u0000${row.membership_id}`);
  for (const field of ["human_relevance", "annotation_reason", "evidence_strength", "annotator_id", "annotation_timestamp"]) {
    if (!other || other[field] !== row[field]) throw new Error(`ANNOTATION_INVALID: test/all mismatch ${row.candidate_id}/${row.membership_id}/${field}`);
  }
}
const hashPaths = [paths.all, paths.test, paths.development, paths.testCandidates, paths.guideline];
const manifest = {
  manifest_name: "Human Annotation Full Evaluation Freeze",
  status: "frozen_for_full_test_evaluation",
  frozen_at: "2026-09-24",
  annotation_unit: "candidate × membership",
  split_policy: "20 development candidates for selection; 40 test candidates for evaluation only; no test-label retuning",
  provenance: {
    collection_history: "Completed annotation batches were consolidated before the full-dataset freeze.",
    collection_batches_are_not_analytical_subgroups: true,
    original_source_workbooks_preserved_outside_current_snapshot: true,
  },
  development: { candidate_count: 20, judgement_count: 360 },
  test: testQc,
  complete: allQc,
  sha256: Object.fromEntries(await Promise.all(hashPaths.map(async (path) => [rel(path), await sha256(path)]))),
  change_control: "Any candidate evidence, label, rationale, evidence strength, membership, matching target, method, parameter, or split change requires a new study freeze.",
};
await writeFile(paths.output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`ANNOTATION_MANIFEST_PREPARED candidates=60 test_candidates=40 judgements=1080 test_judgements=720\n`);
