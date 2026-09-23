import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const DATA_DIR = join(ROOT, "data", "candidates");
const PROFILE_IDS = ["strategic_analysis", "business_performance_goal_management", "business_strategy_focused_analysis", "data_analytics", "data_science"];
const SCENARIOS = ["Direct Match", "Adjacent Transfer", "Career Transition", "Weak / Low Evidence", "Ambiguous Case"];
const TARGET_SCENARIOS = { "Direct Match": 15, "Adjacent Transfer": 13, "Career Transition": 12, "Weak / Low Evidence": 10, "Ambiguous Case": 10 };
const TARGET_BY_PROFILE = {
  strategic_analysis: { "Direct Match": 3, "Adjacent Transfer": 3, "Career Transition": 2, "Weak / Low Evidence": 2, "Ambiguous Case": 2 },
  business_performance_goal_management: { "Direct Match": 3, "Adjacent Transfer": 3, "Career Transition": 2, "Weak / Low Evidence": 2, "Ambiguous Case": 2 },
  business_strategy_focused_analysis: { "Direct Match": 3, "Adjacent Transfer": 3, "Career Transition": 2, "Weak / Low Evidence": 2, "Ambiguous Case": 2 },
  data_analytics: { "Direct Match": 3, "Adjacent Transfer": 2, "Career Transition": 3, "Weak / Low Evidence": 2, "Ambiguous Case": 2 },
  data_science: { "Direct Match": 3, "Adjacent Transfer": 2, "Career Transition": 3, "Weak / Low Evidence": 2, "Ambiguous Case": 2 },
};
const MODEL_FIELDS = ["candidate_id", "current_job_title", "desired_work_directions", "skills", "experience_narrative", "years_experience"].sort();
const FULL_FIELDS = [...MODEL_FIELDS, "industry_context"].sort();
const GOVERNANCE_FIELDS = ["candidate_id", "split", "intended_role_profile", "secondary_sampling_profile", "scenario_category"].sort();
const LEAKAGE_TERMS = [
  "Strategic Analysis", "Business Performance & Goal Management", "Business Strategy & Focused Analysis", "Data Analytics", "Data Science",
  ...PROFILE_IDS, ...SCENARIOS, "intended_role_profile", "secondary_sampling_profile", "scenario_category",
];

function assert(condition, message) { if (!condition) throw new Error(message); }
function sameKeys(row, expected) { return JSON.stringify(Object.keys(row).sort()) === JSON.stringify(expected); }
function countBy(rows, key) { const out = {}; for (const row of rows) out[row[key]] = (out[row[key]] ?? 0) + 1; return out; }
function sameCounts(actual, expected) { return JSON.stringify(Object.fromEntries(Object.entries(actual).sort())) === JSON.stringify(Object.fromEntries(Object.entries(expected).sort())); }
function tokens(text) { return new Set((text.toLowerCase().match(/[a-z0-9]+/g) ?? [])); }
function jaccard(leftText, rightText) {
  const left = tokens(leftText), right = tokens(rightText);
  const intersection = [...left].filter((token) => right.has(token)).length;
  return intersection / new Set([...left, ...right]).size;
}
function ngrams(text, size) {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(Array.from({ length: Math.max(0, words.length - size + 1) }, (_, index) => words.slice(index, index + size).join(" ")));
}
function parseCsv(text) {
  const rows = []; let row = []; let cell = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ",") { row.push(cell); cell = ""; }
    else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); if (row.some((value) => value !== "")) rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const load = async (name) => JSON.parse(await readFile(join(DATA_DIR, name), "utf8"));
const dev = await load("development.json");
const test = await load("test.json");
const full = await load("profiles.json");
const governance = await load("governance.json");
const manifest = await load("manifest.json");

assert(full.length === 60, "full set must contain 60 candidates");
assert(dev.length === 20, "development set must contain 20 candidates");
assert(test.length === 40, "test set must contain 40 candidates");
assert(full.every((row) => sameKeys(row, FULL_FIELDS)), "full schema changed");
assert([...dev, ...test].every((row) => sameKeys(row, MODEL_FIELDS)), "model-facing schema changed");
assert(governance.length === 60 && governance.every((row) => sameKeys(row, GOVERNANCE_FIELDS)), "governance schema changed");
assert(manifest.schema_version === "1.3", "candidate schema version mismatch");
assert(manifest.provenance?.synthetic === true, "dataset synthetic provenance missing");
assert(manifest.provenance?.construction_basis === "neutral work episode; not copied from ESCO or Role Profile text", "dataset construction basis mismatch");
assert(manifest.review_controls?.contains_direct_quotes === false, "direct-quotation control missing");
assert(manifest.review_controls?.maps_to_single_real_person === false, "non-identification control missing");
assert(manifest.governance_metadata_is_relevance_label === false, "governance/label boundary missing");

const fullIds = full.map((row) => row.candidate_id);
const devIds = new Set(dev.map((row) => row.candidate_id));
const testIds = new Set(test.map((row) => row.candidate_id));
assert(new Set(fullIds).size === 60, "candidate_id values are not unique");
assert(fullIds.slice().sort().join(",") === Array.from({ length: 60 }, (_, index) => `C${String(index + 1).padStart(3, "0")}`).join(","), "candidate IDs must be C001-C060");
assert([...devIds].every((id) => !testIds.has(id)), "dev/test candidate_id overlap");
assert(devIds.size === 20 && testIds.size === 40 && [...devIds, ...testIds].every((id) => fullIds.includes(id)), "split membership mismatch");

assert(sameCounts(countBy(governance, "intended_role_profile"), Object.fromEntries(PROFILE_IDS.map((profile) => [profile, 12]))), "role profile distribution mismatch");
assert(sameCounts(countBy(governance, "scenario_category"), TARGET_SCENARIOS), "overall scenario distribution mismatch");
assert(sameCounts(countBy(governance, "split"), { dev: 20, test: 40 }), "governance split mismatch");
for (const profile of PROFILE_IDS) {
  const rows = governance.filter((row) => row.intended_role_profile === profile);
  assert(sameCounts(countBy(rows, "scenario_category"), TARGET_BY_PROFILE[profile]), `scenario distribution mismatch for ${profile}`);
  assert(rows.filter((row) => row.split === "dev").length === 4 && rows.filter((row) => row.split === "test").length === 8, `split imbalance for ${profile}`);
}
for (const row of governance.filter((item) => item.scenario_category === "Ambiguous Case")) {
  assert(row.secondary_sampling_profile && row.secondary_sampling_profile !== row.intended_role_profile, `ambiguous case needs distinct secondary profile: ${row.candidate_id}`);
}
for (const split of ["dev", "test"]) {
  const rows = governance.filter((row) => row.split === split);
  assert(new Set(rows.map((row) => row.intended_role_profile)).size === 5, `${split} does not cover every profile`);
  assert(new Set(rows.map((row) => row.scenario_category)).size === 5, `${split} does not cover every scenario`);
}
assert(TARGET_SCENARIOS["Direct Match"] <= 18, "Direct Match exceeds requested ceiling");

const modelText = (row) => [row.current_job_title, ...row.desired_work_directions, ...row.skills, row.experience_narrative].join("\n");
const modelBlob = full.map(modelText).join("\n");
const lowerBlob = modelBlob.toLowerCase();
for (const term of LEAKAGE_TERMS) assert(!lowerBlob.includes(term.toLowerCase()), `taxonomy leakage: ${term}`);
assert(!/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(modelBlob), "email-like PII found");
assert(!/(?<!\d)(?:\+?\d[\d -]{8,}\d)(?!\d)/.test(modelBlob), "phone-like PII found");
assert(!/https?:\/\/|www\./i.test(modelBlob), "URL found");
assert(!/\b(?:age|aged|gender|male|female|nationality|citizenship|marital|religion|ethnicity|race|pregnan\w*)\b/i.test(modelBlob), "protected-attribute signal found");
for (const row of full) {
  assert(typeof row.current_job_title === "string" && row.current_job_title && Array.isArray(row.skills) && row.skills.length >= 3 && Array.isArray(row.desired_work_directions) && row.desired_work_directions.length >= 1 && row.experience_narrative.length >= 80, `required content incomplete: ${row.candidate_id}`);
  assert(!/\b(?:senior|junior|manager|director|head|principal|intern)\b/i.test(row.current_job_title), `title seniority leakage: ${row.candidate_id}`);
  assert(!/\b(?:\d+(?:\.\d+)?\s*(?:years?|yrs?)|seniority)\b/i.test(modelText(row)), `text seniority leakage: ${row.candidate_id}`);
  const supportedSkills = row.skills.filter((skill) => row.experience_narrative.toLowerCase().includes(skill.toLowerCase())).length;
  assert(supportedSkills < row.skills.length, `skills mechanically copied into narrative: ${row.candidate_id}`);
}

let closest = { left: "", right: "", score: 0 };
for (let left = 0; left < full.length; left += 1) {
  for (let right = left + 1; right < full.length; right += 1) {
    const score = jaccard(full[left].experience_narrative, full[right].experience_narrative);
    if (score > closest.score) closest = { left: full[left].candidate_id, right: full[right].candidate_id, score };
    assert(score < 0.60, `near-duplicate narratives: ${full[left].candidate_id}/${full[right].candidate_id} (${score.toFixed(3)})`);
  }
}

const occupations = JSON.parse(await readFile(join(ROOT, "taxonomy", "esco_occupations.json"), "utf8"));
const escoTenGrams = new Set(occupations.flatMap((row) => [...ngrams(row.description ?? "", 10)]));
for (const row of full) {
  const overlap = [...ngrams([row.experience_narrative, ...row.desired_work_directions].join(" "), 10)].find((gram) => escoTenGrams.has(gram));
  assert(!overlap, `possible ESCO description copying: ${row.candidate_id} (${overlap})`);
}

for (const [name, expected] of Object.entries(manifest.files)) {
  const payload = await readFile(join(DATA_DIR, name));
  assert(payload.length === expected.bytes, `manifest byte mismatch: ${name}`);
  assert(createHash("sha256").update(payload).digest("hex") === expected.sha256, `manifest hash mismatch: ${name}`);
}
assert(manifest.test_set_policy.toLowerCase().includes("frozen evaluation"), "test freeze policy missing");

console.log(`CANDIDATE_DATA_VALID profiles=60 development=20 test=40 scenarios=${JSON.stringify(countBy(governance, "scenario_category"))} closest_pair=${closest.left}:${closest.right} similarity=${closest.score.toFixed(3)} taxonomy_leakage=0 esco_copy_sequences=0`);
