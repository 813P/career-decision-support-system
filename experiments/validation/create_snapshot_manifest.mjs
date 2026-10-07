import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const outputPath = join(ROOT, "submission_manifest.json");
const excluded = new Set(["snapshot_manifest.json", "submission_manifest.json"]);
const run = promisify(execFile);
// Stage intended changes first. Hash Git index blobs so the manifest matches
// committed bytes even when Windows converts working-tree line endings.
const { stdout } = await run("git", ["ls-files", "--stage", "-z"], { cwd: ROOT, encoding: "buffer", maxBuffer: 10 * 1024 * 1024 });
const entries = stdout.toString("utf8").split("\0").filter(Boolean).map((entry) => {
  const separator = entry.indexOf("\t");
  const [, objectId, stage] = entry.slice(0, separator).split(" ");
  if (stage !== "0") throw new Error("Resolve merge conflicts before creating the submission manifest.");
  return { path: entry.slice(separator + 1), objectId };
}).filter((entry) => !excluded.has(entry.path)).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
const files = [];
for (const entry of entries) {
  const { stdout: bytes } = await run("git", ["cat-file", "blob", entry.objectId], { cwd: ROOT, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
  files.push({ path: entry.path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
}
const manifest = { manifest_name: "Submission-ready repository", status: "complete", created_at: new Date().toISOString().slice(0, 10), file_count: files.length, files };
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`SUBMISSION_MANIFEST_CREATED files=${files.length}\n`);
