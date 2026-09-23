import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AGGREGATIONS, RoleProfileExperimentMatcher, buildMembershipEvidence, evaluateRankings } from "../shared/role_profile_experiment.mjs";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const args = Object.fromEntries(process.argv.slice(2).map((item) => item.split("=", 2)));
if (!args["--labels"]) throw new Error("Missing --labels=completed_dev_annotation.json");
const output = args["--output"] ?? join(ROOT, "reports", "development_aggregation_trials.json");
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const labelRows = await json(args["--labels"]);
const labels = {};
for (const row of labelRows) {
  if (![0, 1, 2].includes(row.relevance_label)) throw new Error("ANNOTATION_INCOMPLETE: development labels must all be 0, 1, or 2");
  labels[row.candidate_id] ??= {}; labels[row.candidate_id][row.role_profile_id] = row.relevance_label;
}
if (Object.keys(labels).length !== 20 || Object.values(labels).some((row) => Object.keys(row).length !== 5)) throw new Error("Expected 20 development candidates × 5 labels");
const memberships = buildMembershipEvidence(
  await json(join(ROOT, "taxonomy", "role_profiles.json")),
  await json(join(ROOT, "taxonomy", "role_skill_evidence.json")),
  await json(join(ROOT, "taxonomy", "esco_occupations.json")),
  await json(join(ROOT, "config", "shared", "matching_direction_phrases.json")),
);
const candidates = await json(join(ROOT, "data", "candidates", "development.json"));
const aliasConfig = await json(join(ROOT, "config", "shared", "matching_aliases.json"));
const trials = AGGREGATIONS.map((aggregation) => {
  const matcher = new RoleProfileExperimentMatcher(memberships, {
    aggregation,
    aliasConfig,
  });
  const rankings = Object.fromEntries(candidates.map((candidate) => [candidate.candidate_id, matcher.rank(candidate, "structured").map((row) => row.role_profile_id)]));
  return { aggregation, ...evaluateRankings(rankings, labels).metrics };
});
const tiePriority = { mean_top_2: 0, max: 1, mean_all: 2 };
const ordered = [...trials].sort((a, b) => b["ndcg@3"] - a["ndcg@3"] || b["ndcg@5"] - a["ndcg@5"] || b.top1_agreement - a.top1_agreement || tiePriority[a.aggregation] - tiePriority[b.aggregation]);
const report = {
  status: "draft_rule_output_requires_researcher_signoff", split: "dev", method: "structured",
  selection_rule: "highest eligible nDCG@3; ties by eligible nDCG@5, Top-1 agreement, then pre-specified mean_top_2 default",
  trials, recommended_under_draft_rule: ordered[0].aggregation,
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`DEVELOPMENT_AGGREGATION_COMPARISON_OK trials=${trials.length} signoff_required=true\n`);
