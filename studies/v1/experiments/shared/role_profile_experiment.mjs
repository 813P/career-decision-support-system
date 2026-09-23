export const SPEC_NAME = "matching-experiment-specification";
export const CORE_WEIGHT = 1.0;
export const SUPPORTING_WEIGHT = 0.5;
export const BACKGROUND_WEIGHT = 0.5;
export const DIRECTION_WEIGHT = 0.5;
export const AGGREGATIONS = ["max", "mean_top_2", "mean_all"];
export const HYBRID_WEIGHTS = [0, 0.25, 0.5, 0.75, 1];

export function normalizeText(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}+#.]+/gu, " ").trim().replace(/\s+/g, " ");
}

function tokens(value) {
  return normalizeText(value).match(/[a-z0-9+#.]{2,}/g) ?? [];
}

function joinText(values) {
  return values.flat(Infinity).filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()).join(" ");
}

function clip(value) {
  return Math.max(0, Math.min(1, Number(value)));
}

export function candidateViews(candidate) {
  return {
    background: joinText([candidate.current_job_title, candidate.skills, candidate.experience_narrative]),
    direction: joinText(candidate.desired_work_directions),
  };
}

export function buildMembershipEvidence(roleSchema, skillEvidence, occupations, directionTargets) {
  const roles = new Map(roleSchema.role_profiles.map((row) => [row.role_profile_id, row]));
  const jobs = new Map(occupations.map((row) => [normalizeText(row.title), row]));
  const directions = new Map(directionTargets.role_profiles.map((row) => [row.role_profile_id, row]));
  const custom = new Map(roleSchema.role_profiles.map((row) => [row.role_profile_id, []]));
  for (const row of skillEvidence.role_custom_skills) custom.get(row.role_profile_id).push(row);
  const memberships = skillEvidence.occupation_memberships.map((source) => {
    const role = roles.get(source.role_profile_id);
    const job = jobs.get(normalizeText(source.occupation_title));
    const direction = directions.get(source.role_profile_id);
    if (!role || !job || !direction) throw new Error(`Unresolved membership dependency: ${source.occupation_title}/${source.role_profile_id}`);
    const merged = new Map();
    for (const row of [...source.skills, ...custom.get(source.role_profile_id)]) {
      if (!["core", "supporting"].includes(row.evidence_tier)) throw new Error(`Invalid retained tier: ${row.evidence_tier}`);
      const key = normalizeText(row.skill_label);
      const sourceType = row.source_type ?? row.source_relation_type ?? "unknown";
      const previous = merged.get(key);
      if (!previous) {
        merged.set(key, {
          skill_label: row.skill_label.trim(), evidence_tier: row.evidence_tier,
          weight: row.evidence_tier === "core" ? CORE_WEIGHT : SUPPORTING_WEIGHT,
          source_types: [sourceType], skill_uri: row.skill_uri ?? null,
        });
      } else {
        previous.source_types = [...new Set([...previous.source_types, sourceType])].sort();
        if (row.evidence_tier === "core") { previous.evidence_tier = "core"; previous.weight = CORE_WEIGHT; }
        if (!previous.skill_uri && row.skill_uri) previous.skill_uri = row.skill_uri;
      }
    }
    const skills = [...merged.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row);
    const tasks = joinText(role.core_task_areas);
    const backgroundTarget = joinText([
      job.description, tasks,
      role.candidate_evidence, skills.map((row) => row.skill_label),
    ]);
    const directionTarget = joinText([
      role.display_name_en, role.display_name_zh, role.primary_purpose,
      direction.typical_work_directions, direction.natural_career_direction_descriptions,
      job.title, job.alternative_titles,
    ]);
    return {
      membership_id: `${source.role_profile_id}::${job.job_id}`,
      occupation_uri: job.job_id,
      occupation_title: job.title,
      alternative_titles: job.alternative_titles ?? [],
      occupation_description: job.description ?? "",
      role_profile_id: source.role_profile_id,
      role_profile_name: role.display_name_en,
      mapping_type: source.mapping_type,
      skills,
      background_target: backgroundTarget,
      direction_target: directionTarget,
      typical_work_directions: direction.typical_work_directions,
      natural_career_direction_descriptions: direction.natural_career_direction_descriptions,
    };
  }).sort((a, b) => a.role_profile_id.localeCompare(b.role_profile_id) || a.occupation_uri.localeCompare(b.occupation_uri));
  if (memberships.length !== 18 || new Set(memberships.map((row) => row.occupation_uri)).size !== 15) {
    throw new Error("Expected 18 memberships across 15 occupations");
  }
  return memberships;
}

class TfidfSpace {
  constructor(documents) {
    const counts = documents.map((text) => {
      const row = new Map();
      for (const token of tokens(text)) row.set(token, (row.get(token) ?? 0) + 1);
      return row;
    });
    const df = new Map();
    for (const row of counts) for (const token of row.keys()) df.set(token, (df.get(token) ?? 0) + 1);
    this.idf = new Map([...df].map(([token, frequency]) => [token, Math.log((1 + documents.length) / (1 + frequency)) + 1]));
    this.documentVectors = counts.map((row) => this.transformCounts(row));
  }
  transformCounts(counts) {
    const retained = [...counts].filter(([token]) => this.idf.has(token));
    const total = retained.reduce((sum, [, count]) => sum + count, 0);
    if (!total) return new Map();
    const raw = new Map(retained.map(([token, count]) => [token, (count / total) * this.idf.get(token)]));
    const norm = Math.sqrt([...raw.values()].reduce((sum, value) => sum + value * value, 0));
    return new Map([...raw].map(([token, value]) => [token, norm ? value / norm : 0]));
  }
  transform(text) {
    const counts = new Map();
    for (const token of tokens(text)) counts.set(token, (counts.get(token) ?? 0) + 1);
    return this.transformCounts(counts);
  }
  static cosine(left, right) {
    let sum = 0;
    for (const [token, value] of left) sum += value * (right.get(token) ?? 0);
    return clip(sum);
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function canonicalize(value, roleProfileId, scope, aliasConfig) {
  let result = normalizeText(value);
  if (!aliasConfig || aliasConfig.status !== "frozen") return result;
  const applicable = aliasConfig.aliases
    .filter((row) => row.scope.includes(scope) && row.role_profile_scope.includes(roleProfileId))
    .flatMap((row) => row.aliases.map((alias) => ({ alias: normalizeText(alias), canonical: normalizeText(row.canonical_term) })))
    .sort((a, b) => b.alias.length - a.alias.length);
  for (const row of applicable) {
    result = result.replace(new RegExp(`(^| )${escapeRegex(row.alias)}(?= |$)`, "g"), `$1${row.canonical}`);
  }
  return result;
}

function directionOverlap(desiredRoles, target, roleProfileId, aliasConfig) {
  const phrases = desiredRoles.map((value) => canonicalize(value, roleProfileId, "structured_direction", aliasConfig)).filter(Boolean);
  if (!phrases.length) return 0;
  const candidateTokens = new Set(phrases.flatMap(tokens));
  const targetText = canonicalize(target, roleProfileId, "structured_direction", aliasConfig);
  const targetTokens = new Set(tokens(targetText));
  const tokenRecall = candidateTokens.size
    ? [...candidateTokens].filter((token) => targetTokens.has(token)).length / candidateTokens.size
    : 0;
  const phraseRecall = phrases.filter((phrase) => targetText.includes(phrase)).length / phrases.length;
  return clip(0.5 * tokenRecall + 0.5 * phraseRecall);
}

function hasExplicitCandidateEvidence(label, skills, narrative, roleProfileId, aliasConfig) {
  const canonicalLabel = canonicalize(label, roleProfileId, "missing_evidence_check", aliasConfig);
  const canonicalSkills = skills.map((skill) => canonicalize(skill, roleProfileId, "missing_evidence_check", aliasConfig));
  const canonicalNarrative = canonicalize(narrative, roleProfileId, "missing_evidence_check", aliasConfig);
  return canonicalLabel.length >= 2 && (
    canonicalSkills.includes(canonicalLabel)
    || (` ${canonicalNarrative} `).includes(` ${canonicalLabel} `)
  );
}

function selectContributors(rows, rule) {
  if (!rows.length) throw new Error("Cannot aggregate empty membership rows");
  const ordered = [...rows].sort((a, b) => b.score - a.score || a.membership_id.localeCompare(b.membership_id));
  if (rule === "max") return ordered.slice(0, 1);
  if (rule === "mean_top_2") return ordered.slice(0, 2);
  if (rule === "mean_all") return ordered;
  throw new Error(`Unknown aggregation: ${rule}`);
}

export class RoleProfileExperimentMatcher {
  constructor(memberships, { aggregation = "mean_top_2", hybridWeight = 0.5, encoder = null, aliasConfig = null } = {}) {
    if (memberships.length !== 18) throw new Error("Expected 18 memberships");
    if (!AGGREGATIONS.includes(aggregation)) throw new Error(`Invalid aggregation: ${aggregation}`);
    if (!HYBRID_WEIGHTS.includes(hybridWeight)) throw new Error(`Invalid hybrid weight: ${hybridWeight}`);
    this.memberships = memberships;
    this.aggregation = aggregation;
    this.hybridWeight = hybridWeight;
    this.encoder = encoder;
    this.aliasConfig = aliasConfig;
    this.backgroundSpace = new TfidfSpace(memberships.map((row) => row.background_target));
    this.directionSpace = new TfidfSpace(memberships.map((row) => row.direction_target));
  }
  structured(candidate, membership) {
    const labels = new Set(candidate.skills.map(normalizeText));
    const matched = membership.skills.filter((skill) => labels.has(normalizeText(skill.skill_label)));
    const denominator = membership.skills.reduce((sum, skill) => sum + skill.weight, 0);
    const background = denominator ? matched.reduce((sum, skill) => sum + skill.weight, 0) / denominator : 0;
    const direction = directionOverlap(candidate.desired_work_directions, membership.direction_target, membership.role_profile_id, this.aliasConfig);
    const matchedKeys = new Set(matched.map((skill) => normalizeText(skill.skill_label)));
    return {
      background_score: clip(background), direction_score: clip(direction),
      score: clip(BACKGROUND_WEIGHT * background + DIRECTION_WEIGHT * direction),
      matched_skills: matched,
      missing_core_evidence: membership.skills.filter((skill) =>
        skill.evidence_tier === "core"
        && !matchedKeys.has(normalizeText(skill.skill_label))
        && !hasExplicitCandidateEvidence(skill.skill_label, candidate.skills, candidate.experience_narrative, membership.role_profile_id, this.aliasConfig)
      ).map((skill) => skill.skill_label),
    };
  }
  tfidf(candidate, index) {
    const view = candidateViews(candidate);
    const background = TfidfSpace.cosine(this.backgroundSpace.transform(view.background), this.backgroundSpace.documentVectors[index]);
    const direction = TfidfSpace.cosine(this.directionSpace.transform(view.direction), this.directionSpace.documentVectors[index]);
    return { background_score: background, direction_score: direction, score: clip(0.5 * background + 0.5 * direction) };
  }
  rank(candidate, method = "structured") {
    if (!["structured", "tfidf"].includes(method)) throw new Error("The Node dry run supports structured and tfidf only");
    const membershipResults = this.memberships.map((membership, index) => {
      const structured = this.structured(candidate, membership);
      const selected = method === "structured" ? structured : this.tfidf(candidate, index);
      return {
        membership_id: membership.membership_id, occupation_uri: membership.occupation_uri,
        occupation_title: membership.occupation_title, role_profile_id: membership.role_profile_id,
        mapping_type: membership.mapping_type,
        background_score: Number(selected.background_score.toFixed(6)),
        direction_score: Number(selected.direction_score.toFixed(6)),
        score: Number(selected.score.toFixed(6)), matched_skills: structured.matched_skills,
        missing_core_evidence: structured.missing_core_evidence,
      };
    });
    const groups = new Map();
    for (const row of membershipResults) {
      if (!groups.has(row.role_profile_id)) groups.set(row.role_profile_id, []);
      groups.get(row.role_profile_id).push(row);
    }
    const names = new Map(this.memberships.map((row) => [row.role_profile_id, row.role_profile_name]));
    const results = [...groups].map(([roleId, rows]) => {
      const contributors = selectContributors(rows, this.aggregation);
      const mean = (field) => contributors.reduce((sum, row) => sum + row[field], 0) / contributors.length;
      return {
        role_profile_id: roleId, role_profile_name: names.get(roleId),
        score: Number(mean("score").toFixed(6)),
        background_score: Number(mean("background_score").toFixed(6)),
        direction_score: Number(mean("direction_score").toFixed(6)),
        aggregation: this.aggregation, method,
        method_name: `role-profile-${method}`, specification: SPEC_NAME,
        contributing_membership_ids: contributors.map((row) => row.membership_id),
        memberships: rows.sort((a, b) => b.score - a.score || a.membership_id.localeCompare(b.membership_id)),
        missing_core_evidence: [],
      };
    }).sort((a, b) => b.score - a.score || a.role_profile_id.localeCompare(b.role_profile_id));
    results.forEach((row, index) => {
      row.rank = index + 1;
      if (row.rank > 3) return;
      const contributorSet = new Set(row.contributing_membership_ids);
      const missing = new Map();
      for (const membership of row.memberships.filter((item) => contributorSet.has(item.membership_id))) {
        for (const label of membership.missing_core_evidence) {
          const key = normalizeText(label);
          if (!missing.has(key)) missing.set(key, { skill_label: label, source_membership_ids: [] });
          missing.get(key).source_membership_ids.push(membership.membership_id);
        }
      }
      row.missing_core_evidence = [...missing.values()].slice(0, 3).map((item) => ({
        ...item,
        evidence_absence_message: `The current candidate profile does not show explicit evidence of ${item.skill_label}.`,
      }));
    });
    if (results.length !== 5) throw new Error("Expected five Role Profile results");
    return results;
  }
}

export function ndcgAtK(ranking, labels, k = 3) {
  const gain = (values) => values.reduce((sum, value, index) => sum + ((2 ** value - 1) / Math.log2(index + 2)), 0);
  const observed = ranking.slice(0, k).map((roleId) => labels[roleId] ?? 0);
  const ideal = Object.values(labels).sort((a, b) => b - a).slice(0, k);
  const denominator = gain(ideal);
  return denominator ? gain(observed) / denominator : 0;
}

function summariseEvaluationRows(rows) {
  const average = (selected, name) => selected.length ? selected.reduce((sum, row) => sum + row[name], 0) / selected.length : null;
  const ndcgEligible = rows.filter((row) => !row.all_zero_labels);
  const mrrEligible = rows.filter((row) => row.has_label2);
  return {
    "ndcg@3": average(ndcgEligible, "ndcg@3"),
    "ndcg@5": average(ndcgEligible, "ndcg@5"),
    "ndcg@3_all_candidates": average(rows, "ndcg@3"),
    "ndcg@5_all_candidates": average(rows, "ndcg@5"),
    top1_agreement: average(rows, "top1_agreement"),
    mrr_label2_all: average(rows, "mrr_label2"),
    mrr_label2_eligible: average(mrrEligible, "mrr_label2"),
    pairwise_ordering_agreement: average(rows, "pairwise_ordering_agreement"),
  };
}

function seededRandom(seed) {
  let state = 2166136261;
  for (const character of seed) state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function percentile(sorted, probability) {
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index), upper = Math.ceil(index);
  return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function candidateBootstrapConfidenceIntervals(rows, { iterations = 2000, confidence = 0.95, seed = "career-candidate-bootstrap" } = {}) {
  if (!Number.isInteger(iterations) || iterations < 1) throw new Error("Bootstrap iterations must be a positive integer");
  if (!(confidence > 0 && confidence < 1)) throw new Error("Bootstrap confidence must be between 0 and 1");
  if (!rows.length) throw new Error("Bootstrap requires at least one candidate row");
  const random = seededRandom(seed);
  const metricNames = Object.keys(summariseEvaluationRows(rows));
  const distributions = Object.fromEntries(metricNames.map((name) => [name, []]));
  for (let iteration = 0; iteration < iterations; iteration++) {
    const sample = Array.from({ length: rows.length }, () => rows[Math.floor(random() * rows.length)]);
    const metrics = summariseEvaluationRows(sample);
    for (const name of metricNames) if (metrics[name] !== null) distributions[name].push(metrics[name]);
  }
  const tail = (1 - confidence) / 2;
  return Object.fromEntries(metricNames.map((name) => {
    const values = distributions[name].sort((left, right) => left - right);
    return [name, {
      lower: percentile(values, tail), upper: percentile(values, 1 - tail), confidence,
      method: "candidate-level percentile bootstrap", iterations, valid_resamples: values.length, seed,
    }];
  }));
}

export function pairedCandidateBootstrapDifference(methodRows, baselineRows, metric = "ndcg@3", { iterations = 2000, confidence = 0.95, seed = "career-paired-bootstrap" } = {}) {
  const baselineById = new Map(baselineRows.map((row) => [row.candidate_id, row]));
  const pairs = methodRows
    .filter((row) => metric.startsWith("ndcg@") ? !row.all_zero_labels : true)
    .map((row) => {
      const baseline = baselineById.get(row.candidate_id);
      if (!baseline) throw new Error(`Missing baseline candidate row: ${row.candidate_id}`);
      return row[metric] - baseline[metric];
    });
  if (!pairs.length) throw new Error("Paired bootstrap requires at least one eligible candidate");
  if (baselineById.size !== methodRows.length) throw new Error("Paired bootstrap candidate mismatch");
  const random = seededRandom(seed), distribution = [];
  for (let iteration = 0; iteration < iterations; iteration++) {
    let total = 0;
    for (let index = 0; index < pairs.length; index++) total += pairs[Math.floor(random() * pairs.length)];
    distribution.push(total / pairs.length);
  }
  distribution.sort((left, right) => left - right);
  const tail = (1 - confidence) / 2;
  return {
    metric,
    observed_difference: pairs.reduce((sum, value) => sum + value, 0) / pairs.length,
    lower: percentile(distribution, tail),
    upper: percentile(distribution, 1 - tail),
    confidence,
    method: "paired candidate-level percentile bootstrap",
    eligible_candidates: pairs.length,
    iterations,
    seed,
  };
}

export function evaluateRankings(rankings, labels, bootstrapOptions = {}) {
  const candidateIds = Object.keys(labels).sort();
  if (JSON.stringify(candidateIds) !== JSON.stringify(Object.keys(rankings).sort())) throw new Error("Ranking/label candidate mismatch");
  const rows = candidateIds.map((candidateId) => {
    const ranking = rankings[candidateId];
    const rowLabels = labels[candidateId];
    const maxLabel = Math.max(...Object.values(rowLabels));
    const label2Index = ranking.findIndex((roleId) => rowLabels[roleId] === 2);
    let comparable = 0, correct = 0;
    for (let left = 0; left < ranking.length; left++) for (let right = left + 1; right < ranking.length; right++) {
      const l = ranking[left], r = ranking[right];
      if (rowLabels[l] === rowLabels[r]) continue;
      comparable += 1; correct += Number(rowLabels[l] > rowLabels[r]);
    }
    return {
      candidate_id: candidateId, "ndcg@3": ndcgAtK(ranking, rowLabels, 3), "ndcg@5": ndcgAtK(ranking, rowLabels, 5),
      top1_agreement: Number(rowLabels[ranking[0]] === maxLabel), mrr_label2: label2Index < 0 ? 0 : 1 / (label2Index + 1),
      pairwise_ordering_agreement: comparable ? correct / comparable : 0, has_label2: label2Index >= 0,
      all_zero_labels: Object.values(rowLabels).every((value) => value === 0),
    };
  });
  const metrics = summariseEvaluationRows(rows);
  metrics.candidate_count = rows.length;
  metrics.candidate_count_with_label2 = rows.filter((row) => row.has_label2).length;
  metrics.all_zero_label_candidate_count = rows.filter((row) => row.all_zero_labels).length;
  return {
    metrics,
    confidence_intervals: candidateBootstrapConfidenceIntervals(rows, bootstrapOptions),
    all_zero_label_candidate_ids: rows.filter((row) => row.all_zero_labels).map((row) => row.candidate_id),
    candidate_rows: rows,
  };
}
