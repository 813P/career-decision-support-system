import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const sha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

const annotationManifest = await json(join(ROOT, "data", "annotation", "annotation_manifest.json"));
if (annotationManifest.status !== "frozen_for_full_test_evaluation" || annotationManifest.complete?.judgement_count !== 1080 || annotationManifest.test?.judgement_count !== 720) throw new Error("EXPERIMENT_VALIDATION_FAILED: annotation manifest scope");
for (const [path, expected] of Object.entries(annotationManifest.sha256)) if (await sha256(join(ROOT, path)) !== expected) throw new Error(`EXPERIMENT_VALIDATION_FAILED: annotation input hash ${path}`);
const configPath = join(ROOT, "config", "selected", "tfidf.json");
const config = await json(configPath);
if (config.status !== "frozen" || config.test_scope?.candidate_count !== 40 || config.method !== "tfidf" || config.aggregation !== "mean_all") throw new Error("EXPERIMENT_VALIDATION_FAILED: frozen configuration");
for (const [path, expected] of Object.entries(config.frozen_input_hashes)) if (await sha256(join(ROOT, path)) !== expected) throw new Error(`EXPERIMENT_VALIDATION_FAILED: frozen matching input ${path}`);
const configHash = await sha256(configPath);
if (!(await readFile(join(ROOT, "reports", "freezes", "SELECTED_TFIDF_CONFIGURATION_FREEZE.md"), "utf8")).includes(configHash)) throw new Error("EXPERIMENT_VALIDATION_FAILED: freeze checksum");
const runManifest = await json(join(ROOT, "reports", "evaluation", "matching_v2_full_test_run_manifest.json"));
if (runManifest.specification_sha256 !== configHash || runManifest.test_candidate_count !== 40 || runManifest.judgement_count !== 720) throw new Error("EXPERIMENT_VALIDATION_FAILED: run manifest scope");
for (const [path, expected] of Object.entries(runManifest.outputs)) if (await sha256(join(ROOT, path)) !== expected) throw new Error(`EXPERIMENT_VALIDATION_FAILED: output hash ${path}`);
const evaluation = await json(join(ROOT, "reports", "evaluation", "matching_v2_full_test_evaluation.json"));
if (evaluation.full_test?.membership_evaluation?.metrics?.candidate_count !== 40 || evaluation.full_test?.role_profile_evaluation?.metrics?.candidate_count !== 40) throw new Error("EXPERIMENT_VALIDATION_FAILED: evaluation candidate counts");
const scores = await readFile(join(ROOT, "results", "matching_v2_full_test_scores.csv"), "utf8");
if (scores.trim().split(/\r?\n/).length !== 721) throw new Error("EXPERIMENT_VALIDATION_FAILED: score row count");
const snapshotPath = join(ROOT, "snapshot_manifest.json");
try {
  await access(snapshotPath);
  const snapshot = await json(snapshotPath);
  for (const row of snapshot.files ?? []) if (await sha256(join(ROOT, row.path)) !== row.sha256) throw new Error(`EXPERIMENT_VALIDATION_FAILED: snapshot hash ${row.path}`);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
process.stdout.write(`EXPERIMENT_VALIDATION_OK candidates=60 development=20 test=40 judgements=1080 test_judgements=720 outputs=verified\n`);
