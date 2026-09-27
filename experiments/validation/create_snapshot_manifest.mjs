import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const outputPath = join(ROOT, "submission_manifest.json");
const excluded = new Set(["snapshot_manifest.json", "submission_manifest.json"]);
const run = promisify(execFile);
const { stdout } = await run("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "buffer", maxBuffer: 10 * 1024 * 1024 });
const paths = stdout.toString("utf8").split("\0").filter(Boolean).filter((path) => !excluded.has(path)).sort().map((path) => join(ROOT, path));
const files = [];
for (const path of paths) {
  const bytes = await readFile(path);
  files.push({ path: relative(ROOT, path).replaceAll("\\", "/"), bytes: (await stat(path)).size, sha256: createHash("sha256").update(bytes).digest("hex") });
}
const manifest = { manifest_name: "Submission-ready repository", status: "complete", created_at: new Date().toISOString().slice(0, 10), file_count: files.length, files };
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`SUBMISSION_MANIFEST_CREATED files=${files.length}\n`);
