import { AGGREGATIONS, HYBRID_WEIGHTS, evaluateRankings } from "./role_profile_experiment.mjs";

export const ROLE_PROFILE_IDS = [
  "strategic_analysis",
  "business_performance_goal_management",
  "business_strategy_focused_analysis",
  "data_analytics",
  "data_science",
];
export const HYBRID_EXACT_TIE_PRIORITY = [0.5, 0.75, 0.25, 1, 0];

export function resolvedLabelsFromRows(rows, expectedCandidateIds) {
  if (!Array.isArray(rows)) throw new Error("ANNOTATION_INVALID: labels must be a JSON array");
  const expected = new Set(expectedCandidateIds);
  const labels = {};
  const seen = new Set();
  for (const row of rows) {
    const label = row.resolved_label ?? row.relevance_label;
    if (!expected.has(row.candidate_id)) throw new Error(`ANNOTATION_INVALID: unexpected candidate ${row.candidate_id}`);
    if (!ROLE_PROFILE_IDS.includes(row.role_profile_id)) throw new Error(`ANNOTATION_INVALID: unexpected Role Profile ${row.role_profile_id}`);
    if (![0, 1, 2].includes(label)) throw new Error("ANNOTATION_INCOMPLETE: every resolved development label must be 0, 1, or 2");
    const key = `${row.candidate_id}::${row.role_profile_id}`;
    if (seen.has(key)) throw new Error(`ANNOTATION_INVALID: duplicate pair ${key}`);
    seen.add(key);
    labels[row.candidate_id] ??= {};
    labels[row.candidate_id][row.role_profile_id] = label;
  }
  if (seen.size !== expected.size * ROLE_PROFILE_IDS.length) {
    throw new Error(`ANNOTATION_INCOMPLETE: expected ${expected.size * ROLE_PROFILE_IDS.length} unique development pairs, received ${seen.size}`);
  }
  for (const candidateId of expected) {
    if (!labels[candidateId] || Object.keys(labels[candidateId]).length !== ROLE_PROFILE_IDS.length) {
      throw new Error(`ANNOTATION_INCOMPLETE: ${candidateId} does not have five resolved labels`);
    }
  }
  return labels;
}

function contributors(rows, aggregation) {
  const ordered = [...rows].sort((a, b) => b.score - a.score || a.membership_id.localeCompare(b.membership_id));
  if (aggregation === "max") return ordered.slice(0, 1);
  if (aggregation === "mean_top_2") return ordered.slice(0, 2);
  if (aggregation === "mean_all") return ordered;
  throw new Error(`Invalid aggregation: ${aggregation}`);
}

export function hybridRoleRanking(structuredRoleRows, semanticRoleRows, alpha, aggregation) {
  if (!HYBRID_WEIGHTS.includes(alpha)) throw new Error(`Invalid Hybrid alpha: ${alpha}`);
  if (!AGGREGATIONS.includes(aggregation)) throw new Error(`Invalid aggregation: ${aggregation}`);
  const structuredMemberships = new Map(structuredRoleRows.flatMap((role) => role.memberships).map((row) => [row.membership_id, row]));
  const semanticMemberships = new Map(semanticRoleRows.flatMap((role) => role.memberships).map((row) => [row.membership_id, row]));
  if (structuredMemberships.size !== 18 || semanticMemberships.size !== 18) throw new Error("HYBRID_INPUT_INVALID: expected 18 memberships from both methods");
  const groups = new Map();
  for (const [membershipId, structured] of structuredMemberships) {
    const semantic = semanticMemberships.get(membershipId);
    if (!semantic || semantic.role_profile_id !== structured.role_profile_id) throw new Error(`HYBRID_INPUT_INVALID: membership mismatch ${membershipId}`);
    const row = {
      membership_id: membershipId,
      role_profile_id: structured.role_profile_id,
      score: alpha * structured.score + (1 - alpha) * semantic.score,
    };
    if (!Number.isFinite(row.score) || row.score < 0 || row.score > 1) throw new Error(`HYBRID_OUTPUT_INVALID: score ${membershipId}`);
    if (!groups.has(row.role_profile_id)) groups.set(row.role_profile_id, []);
    groups.get(row.role_profile_id).push(row);
  }
  if (groups.size !== ROLE_PROFILE_IDS.length) throw new Error("HYBRID_OUTPUT_INVALID: expected five Role Profiles");
  return [...groups].map(([roleProfileId, rows]) => {
    const selected = contributors(rows, aggregation);
    return {
      role_profile_id: roleProfileId,
      score: selected.reduce((sum, row) => sum + row.score, 0) / selected.length,
      contributing_membership_ids: selected.map((row) => row.membership_id),
    };
  }).sort((a, b) => b.score - a.score || a.role_profile_id.localeCompare(b.role_profile_id));
}

export function orderMetricTrials(trials, exactTiePriority) {
  const priority = new Map(exactTiePriority.map((value, index) => [value, index]));
  return [...trials].sort((a, b) =>
    b.metrics["ndcg@3"] - a.metrics["ndcg@3"]
    || b.metrics["ndcg@5"] - a.metrics["ndcg@5"]
    || b.metrics.top1_agreement - a.metrics.top1_agreement
    || priority.get(a.parameter) - priority.get(b.parameter));
}

export function evaluateHybridTrials(candidates, structuredByCandidate, semanticByCandidate, labels, aggregation, bootstrapOptions = {}) {
  return HYBRID_WEIGHTS.map((alpha) => {
    const rankings = {};
    for (const candidate of candidates) {
      const structured = structuredByCandidate.get(candidate.candidate_id);
      const semantic = semanticByCandidate.get(candidate.candidate_id);
      if (!structured || !semantic) throw new Error(`HYBRID_INPUT_INVALID: missing candidate ${candidate.candidate_id}`);
      rankings[candidate.candidate_id] = hybridRoleRanking(structured, semantic, alpha, aggregation).map((row) => row.role_profile_id);
    }
    return { parameter: alpha, metrics: evaluateRankings(rankings, labels, bootstrapOptions).metrics };
  });
}
