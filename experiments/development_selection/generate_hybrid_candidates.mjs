import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { AGGREGATIONS, HYBRID_WEIGHTS } from "../shared/role_profile_experiment.mjs";
import { hybridRoleRanking } from "../shared/ranking_selection.mjs";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const args = Object.fromEntries(process.argv.slice(2).map((item) => item.split("=", 2)));
const structuredPath = args["--structured"] ?? join(ROOT, "reports", "matching", "development_structured_entry.json");
const semanticPath = args["--semantic"] ?? join(ROOT, "reports", "matching", "development_semantic_entry.json");
const outputPath = args["--output"] ?? join(ROOT, "reports", "matching", "development_hybrid_candidate_grid.json");
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const hash = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

const [structuredRows, semanticReport] = await Promise.all([json(structuredPath), json(semanticPath)]);
if (!Array.isArray(structuredRows) || structuredRows.length !== 20) {
  throw new Error("HYBRID_INPUT_INVALID: expected 20 development Structured rows");
}
if (semanticReport.split !== "dev" || semanticReport.test_rankings_generated !== false || semanticReport.results?.length !== 20) {
  throw new Error("HYBRID_INPUT_INVALID: Semantic input must contain exactly 20 development candidates and no test rankings");
}

const structuredByCandidate = new Map(structuredRows.map((row) => [row.candidate_id, row.rankings]));
const semanticByCandidate = new Map(semanticReport.results.map((row) => [row.candidate_id, row.rankings]));
if (structuredByCandidate.size !== 20 || semanticByCandidate.size !== 20) {
  throw new Error("HYBRID_INPUT_INVALID: duplicate candidate IDs");
}

const trials = [];
for (const aggregation of AGGREGATIONS) {
  for (const structuredWeight of HYBRID_WEIGHTS) {
    const candidates = [...structuredByCandidate.keys()].sort().map((candidateId) => {
      const structured = structuredByCandidate.get(candidateId);
      const semantic = semanticByCandidate.get(candidateId);
      if (!semantic) throw new Error(`HYBRID_INPUT_INVALID: Semantic row missing for ${candidateId}`);
      const rankings = hybridRoleRanking(structured, semantic, structuredWeight, aggregation).map((row, index) => ({
        rank: index + 1,
        role_profile_id: row.role_profile_id,
        score: Number(row.score.toFixed(6)),
        contributing_membership_ids: row.contributing_membership_ids,
      }));
      return { candidate_id: candidateId, rankings };
    });
    trials.push({
      aggregation,
      structured_weight: structuredWeight,
      semantic_weight: 1 - structuredWeight,
      candidates,
    });
  }
}

const report = {
  report_name: "Development Hybrid Candidate Grid",
  status: "candidate_grid_unlabelled_no_selection",
  split: "development",
  labels_used: false,
  metrics_computed: false,
  parameter_recommendation_made: false,
  test_rankings_generated: false,
  alpha_definition: "score = structured_weight * structured_score + semantic_weight * semantic_score",
  grid: {
    aggregations: AGGREGATIONS,
    structured_weights: HYBRID_WEIGHTS,
    trials: trials.length,
    candidates_per_trial: structuredByCandidate.size,
    role_profiles_per_candidate: 5,
  },
  inputs: {
    [relative(ROOT, structuredPath).replaceAll("\\", "/")]: await hash(structuredPath),
    [relative(ROOT, semanticPath).replaceAll("\\", "/")]: await hash(semanticPath),
  },
  trials,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`HYBRID_CANDIDATE_GRID_OK trials=${trials.length} candidates_per_trial=20 labels_used=false metrics=false recommendation=false test_rankings=false\n`);
