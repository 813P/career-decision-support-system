import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const outputPath = join(ROOT, "submission_manifest.json");
const excluded = new Set(["snapshot_manifest.json", "submission_manifest.json"]);
const excludedDirectories = new Set([
  ".cache",
  ".git",
  ".pytest_cache",
  ".venv",
  ".venv-v2",
  "__pycache__",
  "outputs",
  "work",
]);

async function filesUnder(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await filesUnder(path));
    else if (entry.isFile()) output.push(path);
  }
  return output;
}

const paths = (await filesUnder(ROOT)).filter((path) => !excluded.has(relative(ROOT, path).replaceAll("\\", "/"))).sort();
const files = [];
for (const path of paths) {
  const bytes = await readFile(path);
  files.push({ path: relative(ROOT, path).replaceAll("\\", "/"), bytes: (await stat(path)).size, sha256: createHash("sha256").update(bytes).digest("hex") });
}
const manifest = { manifest_name: "Submission-ready repository", status: "complete", created_at: new Date().toISOString().slice(0, 10), file_count: files.length, files };
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`SUBMISSION_MANIFEST_CREATED files=${files.length}\n`);
