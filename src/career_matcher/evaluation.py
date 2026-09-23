from __future__ import annotations

import math
import time
from collections import defaultdict
from collections.abc import Callable, Iterable, Mapping, Sequence

from .rankers import JobMatcher
from .schemas import CandidateProfile


def ndcg_at_k(ranked_ids: Sequence[str], relevance: Mapping[str, int], k: int = 5) -> float:
    gains = [relevance.get(job_id, 0) for job_id in ranked_ids[:k]]
    dcg = sum((2**gain - 1) / math.log2(index + 2) for index, gain in enumerate(gains))
    ideal = sorted(relevance.values(), reverse=True)[:k]
    idcg = sum((2**gain - 1) / math.log2(index + 2) for index, gain in enumerate(ideal))
    return dcg / idcg if idcg else 0.0


def precision_at_k(ranked_ids: Sequence[str], relevance: Mapping[str, int], k: int = 5) -> float:
    selected = ranked_ids[:k]
    return sum(relevance.get(job_id, 0) > 0 for job_id in selected) / k if k else 0.0


def hit_rate_at_k(ranked_ids: Sequence[str], relevance: Mapping[str, int], k: int = 5) -> float:
    return float(any(relevance.get(job_id, 0) > 0 for job_id in ranked_ids[:k]))


def evaluate_matcher(
    matcher: JobMatcher,
    candidates: Iterable[CandidateProfile],
    labels: Mapping[str, Mapping[str, int]],
    model: str,
    k: int = 5,
) -> dict[str, object]:
    candidates = list(candidates)
    rows = []
    for candidate in candidates:
        started = time.perf_counter()
        results = matcher.rank(candidate, top_k=k, model=model)
        elapsed_ms = (time.perf_counter() - started) * 1000
        ranked = [result.job_id for result in results]
        relevance = labels.get(candidate.candidate_id, {})
        rows.append({
            "candidate_id": candidate.candidate_id,
            "ndcg@5": ndcg_at_k(ranked, relevance, k),
            "precision@5": precision_at_k(ranked, relevance, k),
            "hitrate@5": hit_rate_at_k(ranked, relevance, k),
            "latency_ms": elapsed_ms,
        })
    metrics = {name: sum(row[name] for row in rows) / len(rows) for name in ("ndcg@5", "precision@5", "hitrate@5", "latency_ms")} if rows else {}
    coverage = len({result.job_id for candidate in candidates for result in matcher.rank(candidate, top_k=k, model=model)}) / len(matcher.jobs) if rows else 0.0
    metrics["job_coverage"] = coverage
    return {"model": model, "metrics": metrics, "candidates": rows}


def tune_hybrid_weight(
    matcher_factory: Callable[[float], JobMatcher],
    candidates: Sequence[CandidateProfile],
    labels: Mapping[str, Mapping[str, int]],
    weights: Sequence[float] = (0.0, 0.25, 0.5, 0.75, 1.0),
) -> tuple[float, list[dict[str, float]]]:
    trials = []
    for weight in weights:
        report = evaluate_matcher(matcher_factory(weight), candidates, labels, "hybrid")
        trials.append({"weight": weight, "ndcg@5": float(report["metrics"]["ndcg@5"])})
    # Stable tie-break favours the more interpretable structured component.
    best = max(trials, key=lambda row: (row["ndcg@5"], row["weight"]))
    return best["weight"], trials
