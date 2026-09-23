import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const hash = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

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
  assert(!quoted, "Primary annotation contains an unterminated quoted field");
  if (field || record.length) {
    record.push(field.replace(/\r$/, ""));
    if (record.some((value) => value !== "")) records.push(record);
  }
  const headers = records[0] ?? [];
  return records.slice(1).map((values, index) => {
    assert(values.length === headers.length, `Primary annotation row ${index + 2} is malformed`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

const manifest = await json(join(ROOT, "taxonomy", "manifest.json"));
assert(manifest.unique_occupations === 15 && manifest.memberships === 18 && manifest.role_profiles === 5, "Derived evidence counts invalid");
assert(manifest.status === "frozen", "Matching inputs are not frozen");
assert(manifest.frozen_at === "2026-08-16", "Matching freeze date is missing or changed");
assert(manifest.freeze_record === "reports/freezes/MEMBERSHIP_SKILL_EVIDENCE_FREEZE.md", "Matching freeze record is missing");
const freezeRecord = await readFile(join(ROOT, manifest.freeze_record), "utf8");
assert(/Status:\*\* Frozen/i.test(freezeRecord), "Matching freeze record does not declare frozen status");
for (const [relativePath, expected] of Object.entries(manifest.source_files)) {
  assert(await hash(join(ROOT, relativePath)) === expected, `Source hash changed: ${relativePath}`);
}
for (const [relativePath, expected] of Object.entries(manifest.derived_files)) {
  assert(await hash(join(ROOT, relativePath)) === expected, `Derived hash changed: ${relativePath}`);
}

const memberships = await json(join(ROOT, "taxonomy", "role_occupation_memberships.json"));
assert(memberships.length === 18, "Membership evidence row count invalid");
assert(memberships.every((row) => row.skills.every((skill) => ["core", "supporting"].includes(skill.evidence_tier))), "Invalid retained tier");
assert(memberships.every((row) => row.skills.every((skill) => skill.source_types.every((source) => !source.toLowerCase().includes("optional")))), "Optional evidence leaked");

const annotationPath = join(ROOT, "data", "annotation", "annotation_primary.csv");
const annotationManifest = await json(join(ROOT, "data", "annotation", "annotation_primary_freeze_manifest.json"));
assert(annotationManifest.status === "frozen", "Primary annotation is not frozen");
assert(annotationManifest.annotation_scope?.candidate_count === 30, "Primary annotation candidate count invalid");
assert(annotationManifest.annotation_scope?.membership_count === 18, "Primary annotation membership count invalid");
assert(annotationManifest.annotation_scope?.judgement_count === 540, "Primary annotation judgement count invalid");
for (const [relativePath, expected] of Object.entries(annotationManifest.sha256 ?? {})) {
  assert(await hash(join(ROOT, relativePath)) === expected, `Primary annotation freeze hash changed: ${relativePath}`);
}

const annotationRows = parseCsv(await readFile(annotationPath, "utf8"));
assert(annotationRows.length === 540, "Primary annotation must contain 540 judgements");
const annotationPairs = new Set(annotationRows.map((row) => `${row.candidate_id}::${row.membership_id}`));
assert(annotationPairs.size === 540, "Primary annotation contains duplicate candidate-membership pairs");
assert(annotationRows.every((row) => ["0", "1", "2"].includes(row.human_relevance)), "Primary annotation contains a missing or invalid label");
assert(annotationRows.every((row) => row.model_rank === "" && row.model_score === ""), "Model output leaked into primary annotation");
assert(annotationRows.every((row) => row.annotator_id === annotationManifest.annotation_method.annotator_id), "Primary annotator identity mismatch");

const developmentIds = new Set((await json(join(ROOT, "data", "candidates", "development.json"))).map((row) => row.candidate_id));
const selectionManifest = await json(join(ROOT, "data", "annotation", "portfolio_annotation_selection_manifest.json"));
const selectedTestIds = new Set(selectionManifest.primary_sample.selected_test_candidate_ids);
const annotatedIds = new Set(annotationRows.map((row) => row.candidate_id));
assert(developmentIds.size === 20 && selectedTestIds.size === 10 && annotatedIds.size === 30, "Primary annotation split coverage invalid");
assert([...developmentIds, ...selectedTestIds].every((candidateId) => annotatedIds.has(candidateId)), "Primary annotation candidate selection mismatch");
for (const candidateId of annotatedIds) {
  const rows = annotationRows.filter((row) => row.candidate_id === candidateId);
  assert(rows.length === 18 && new Set(rows.map((row) => row.membership_id)).size === 18, `Primary annotation coverage invalid for ${candidateId}`);
}

process.stdout.write("EXPERIMENT_INPUTS_VALID occupations=15 memberships=18 primary_annotation=540 development_judgements=360 held_out_test_judgements=180 reserve_test_candidates=30\n");
