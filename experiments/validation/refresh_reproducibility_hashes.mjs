import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const readJson = async (path) => JSON.parse(await readFile(join(ROOT, path), "utf8"));
const writeJson = async (path, value) => writeFile(join(ROOT, path), `${JSON.stringify(value, null, 2)}\n`, "utf8");
const hash = async (path) => createHash("sha256").update(await readFile(join(ROOT, path))).digest("hex");

const configPath = "config/selected/matching_selected.json";
const config = await readJson(configPath);
config.frozen_input_hashes = Object.fromEntries(
  await Promise.all(Object.keys(config.frozen_input_hashes).map(async (path) => [path, await hash(path)])),
);
await writeJson(configPath, config);

const configHash = await hash(configPath);
const manifestPath = "reports/evaluation/matching_selected_test_run_manifest.json";
const manifest = await readJson(manifestPath);
manifest.specification_sha256 = configHash;
manifest.outputs = Object.fromEntries(
  await Promise.all(Object.keys(manifest.outputs).map(async (path) => [path, await hash(path)])),
);
await writeJson(manifestPath, manifest);

const freezePath = join(ROOT, "reports/freezes/MATCHING_SELECTED_FREEZE.md");
const freeze = await readFile(freezePath, "utf8");
await writeFile(freezePath, freeze.replace(/SHA-256: `[a-f0-9]{64}`/, `SHA-256: \`${configHash}\``), "utf8");

process.stdout.write(`REPRODUCIBILITY_HASHES_REFRESHED configuration=${configHash}\n`);
