import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RoleProfileExperimentMatcher, buildMembershipEvidence } from "../shared/role_profile_experiment.mjs";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const args = Object.fromEntries(process.argv.slice(2).map((item) => item.split("=", 2)));
const method = args["--method"] ?? "structured";
const aggregation = args["--aggregation"] ?? "mean_top_2";
const output = args["--output"] ?? join(ROOT, "reports", `development_${method}_rankings.json`);
if (!["structured", "tfidf"].includes(method)) throw new Error("This Node runner supports structured/tfidf; use experiments/development_selection/generate_semantic_rankings.py for the pinned Semantic pipeline");
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const memberships = buildMembershipEvidence(
  await json(join(ROOT, "taxonomy", "role_profiles.json")),
  await json(join(ROOT, "taxonomy", "role_skill_evidence.json")),
  await json(join(ROOT, "taxonomy", "esco_occupations.json")),
  await json(join(ROOT, "config", "shared", "matching_direction_phrases.json")),
);
const candidates = await json(join(ROOT, "data", "candidates", "development.json"));
const aliasConfig = await json(join(ROOT, "config", "shared", "matching_aliases.json"));
const matcher = new RoleProfileExperimentMatcher(memberships, { aggregation, aliasConfig });
const rows = candidates.map((candidate) => ({
  candidate_id: candidate.candidate_id, method, aggregation, engineering_only_unlabelled: true,
  rankings: matcher.rank(candidate, method),
}));
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
process.stdout.write(`DEVELOPMENT_RANKINGS_GENERATED candidates=${rows.length} method=${method} split=development labels_used=false\n`);
