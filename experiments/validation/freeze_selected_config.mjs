import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const configPath = join(ROOT, "config", "selected", "tfidf.json");
const freezePath = join(ROOT, "reports", "freezes", "SELECTED_TFIDF_CONFIGURATION_FREEZE.md");
const selectionPath = join(ROOT, "reports", "matching", "development_parameter_selection.json");
const rel = (path) => relative(ROOT, path).replaceAll("\\", "/");
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const sha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

for (const path of [configPath, freezePath]) {
  try { await access(path); throw new Error(`CONFIG_FREEZE_EXISTS: refusing to overwrite ${rel(path)}`); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
}
const selection = await json(selectionPath);
if (selection.split !== "development" || selection.test_labels_used !== false || selection.test_rankings_generated !== false) throw new Error("CONFIG_FREEZE_BLOCKED: development selection guardrails failed");
if (selection.recommended_method_requires_signoff !== "tfidf" || selection.recommended_aggregation_requires_signoff !== "mean_all") throw new Error("CONFIG_FREEZE_BLOCKED: selected method is not supported by the approved full-test runner");
const testCandidates = await json(join(ROOT, "data", "candidates", "test.json"));
const testIds = testCandidates.map((row) => row.candidate_id).sort();
if (testIds.length !== 40 || new Set(testIds).size !== 40) throw new Error("CONFIG_FREEZE_BLOCKED: expected 40 unique test candidates");
const frozenPaths = [
  "taxonomy/role_profiles.json",
  "taxonomy/role_skill_evidence.json",
  "taxonomy/esco_occupations.json",
  "taxonomy/role_occupation_memberships.json",
  "taxonomy/manifest.json",
  "config/shared/matching_direction_phrases.json",
  "config/shared/matching_aliases.json",
  "config/experiments/semantic_runtime.json",
  "data/candidates/development.json",
  "data/candidates/test.json",
  "data/candidates/manifest.json",
  "data/annotation/annotation_all_60.csv",
  "data/annotation/annotation_test_full.csv",
  "data/annotation/annotation_manifest.json",
  "docs/HUMAN_ANNOTATION_GUIDELINE.md",
  "reports/matching/development_structured_entry.json",
  "reports/matching/development_tfidf_entry.json",
  "reports/matching/development_semantic_entry.json",
  "reports/matching/development_hybrid_candidate_grid.json",
  "reports/matching/development_parameter_selection.json",
  "experiments/development_selection/run_dry_run.mjs",
  "experiments/development_selection/run_semantic_dry_run.py",
  "experiments/development_selection/generate_hybrid_candidates.mjs",
  "experiments/development_selection/select_parameters.mjs",
  "experiments/shared/role_profile_experiment.mjs",
  "experiments/evaluation/run_full_test_evaluation.mjs"
];
const config = {
  study_id: "tfidf_full_test_evaluation",
  study_name: "Selected TF-IDF full-test evaluation",
  status: "frozen",
  frozen_at: "2026-09-24",
  selection_provenance: {
    split: "development",
    candidate_count: 20,
    membership_judgement_count: 360,
    primary_metric: selection.primary_metric,
    metric_leader: selection.metric_leader,
    selected_under_practical_tie_rule: selection.recommended_method_requires_signoff,
    development_report: rel(selectionPath),
    semantic_runtime: "Fresh development run using Python 3.12.14, sentence-transformers 5.0.0, PyTorch 2.7.1+cpu, and the pinned all-MiniLM-L6-v2 model revision."
  },
  method: "tfidf",
  aggregation: "mean_all",
  component_weights: { background: 0.5, direction: 0.5 },
  intermediate_scoring_unit: "candidate_x_membership",
  membership_count_per_candidate: 18,
  role_profile_label_derivation: "maximum human_relevance among memberships assigned to each Role Profile",
  test_scope: {
    type: "complete_frozen_test_split",
    candidate_count: 40,
    membership_judgement_count: 720,
    candidate_ids: testIds,
    evaluation_only_no_retuning: true
  },
  evaluation: {
    primary_metric: "candidate-level membership nDCG@3",
    supporting_metrics: ["membership nDCG@5", "Top-1 agreement", "MRR for label 2", "coverage", "candidate-level bootstrap confidence intervals", "secondary Role Profile ranking metrics"],
    bootstrap_iterations: 2000,
    bootstrap_confidence: 0.95,
    retuning_after_test: false
  },
  frozen_input_hashes: Object.fromEntries(await Promise.all(frozenPaths.map(async (path) => [path, await sha256(join(ROOT, path))]))),
  change_control: "Any matching input, annotation, method, parameter, target, split, or evaluation-code change requires a new matching version."
};
await mkdir(dirname(configPath), { recursive: true });
await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
const configHash = await sha256(configPath);
const freeze = `# Selected TF-IDF Configuration Freeze\n\n**Status:** Frozen  \n**Date:** 2026-09-24  \n**Configuration:** \`tfidf + mean_all\` with 0.5 background / 0.5 direction weights  \n**Development scope:** 20 candidates × 18 memberships = 360 judgements  \n**Test scope:** 40 candidates × 18 memberships = 720 judgements  \n\n## Configuration checksum\n\n- \`config/selected/tfidf.json\`: \`${configHash}\`\n\n## Guardrails\n\n- Development labels determine the method and aggregation.\n- All 40 test labels are evaluation-only.\n- No method, target, weight, aggregation, or candidate evidence is changed after the freeze.\n- Historical files and results remain unchanged.\n`;
await mkdir(dirname(freezePath), { recursive: true });
await writeFile(freezePath, freeze, "utf8");
process.stdout.write(`SELECTED_CONFIG_FROZEN config_sha256=${configHash} method=tfidf aggregation=mean_all test_candidates=40\n`);
