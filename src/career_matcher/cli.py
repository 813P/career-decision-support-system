from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from .esco import build_esco_catalog
from .io import load_candidates, load_jobs, load_skill_normalizer, save_json, save_results
from .rankers import JobMatcher


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Explainable candidate-to-job ranking")
    commands = parser.add_subparsers(dest="command", required=True)
    rank = commands.add_parser("rank", help="rank jobs for one or more candidates")
    rank.add_argument("--candidates", required=True)
    rank.add_argument("--jobs", required=True)
    rank.add_argument("--skills")
    rank.add_argument("--output", required=True)
    rank.add_argument("--model", choices=("rules", "tfidf", "semantic", "hybrid"), default="tfidf")
    rank.add_argument("--top-k", type=int, default=5)
    rank.add_argument("--hybrid-weight", type=float, default=0.5)
    rank.add_argument("--model-cache")
    build = commands.add_parser("build-esco", help="build a catalog from official ESCO CSV files")
    build.add_argument("--raw-dir", required=True)
    build.add_argument("--output-dir", required=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if args.command == "build-esco":
        jobs = build_esco_catalog(args.raw_dir, args.output_dir)
        print(f"Built {len(jobs)} jobs in {Path(args.output_dir).resolve()}")
        return 0

    candidates = load_candidates(args.candidates)
    jobs = load_jobs(args.jobs)
    normalizer = load_skill_normalizer(args.skills)
    matcher = JobMatcher(jobs, normalizer, hybrid_weight=args.hybrid_weight)
    output = []
    for candidate in candidates:
        for result in matcher.rank(candidate, args.top_k, args.model):
            row = result.to_dict()
            row["candidate_id"] = candidate.candidate_id
            output.append(row)
    target = Path(args.output)
    if target.suffix.lower() == ".json":
        save_json(output, target)
    elif target.suffix.lower() == ".csv":
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=output[0].keys())
            writer.writeheader()
            for row in output:
                writer.writerow({key: ";".join(value) if isinstance(value, list) else json.dumps(value) if isinstance(value, dict) else value for key, value in row.items()})
    else:
        raise ValueError("batch output must be .json or .csv")
    print(f"Saved {len(output)} rows to {target.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
