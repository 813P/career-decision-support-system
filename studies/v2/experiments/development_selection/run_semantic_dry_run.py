"""Development-only Semantic dry run over 18 occupation–Role Profile memberships."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np
import sentence_transformers
import torch
from sentence_transformers import SentenceTransformer


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / "reports" / "development_semantic_dry_run.json"
ALLOWED_AGGREGATIONS = {"max", "mean_top_2", "mean_all"}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def join_text(values: Any) -> str:
    if isinstance(values, list):
        return " ".join(str(value).strip() for value in values if str(value).strip())
    return str(values or "").strip()


def candidate_background(candidate: dict[str, Any]) -> str:
    return join_text([
        candidate.get("current_job_title", ""),
        join_text(candidate.get("skills", [])),
        candidate.get("experience_narrative", ""),
    ])


def public_score(cosine: float) -> float:
    """Map cosine [-1, 1] monotonically into the common public score range [0, 1]."""
    return float(np.clip((cosine + 1.0) / 2.0, 0.0, 1.0))


def select_contributors(rows: list[dict[str, Any]], aggregation: str) -> list[dict[str, Any]]:
    ordered = sorted(rows, key=lambda row: (-row["score"], row["membership_id"]))
    if aggregation == "max":
        return ordered[:1]
    if aggregation == "mean_top_2":
        return ordered[:2]
    if aggregation == "mean_all":
        return ordered
    raise ValueError(f"Unsupported aggregation: {aggregation}")


def mean(rows: list[dict[str, Any]], field: str) -> float:
    return sum(row[field] for row in rows) / len(rows)


def assert_runtime(runtime: dict[str, Any]) -> None:
    expected = runtime["runtime"]
    actual_python = platform.python_version()
    if actual_python != expected["python_version"]:
        raise RuntimeError(f"Python version mismatch: expected {expected['python_version']}, found {actual_python}")
    if sentence_transformers.__version__ != expected["sentence_transformers_version"]:
        raise RuntimeError(
            "sentence-transformers version mismatch: "
            f"expected {expected['sentence_transformers_version']}, found {sentence_transformers.__version__}"
        )
    if torch.__version__ != expected["pytorch_version"]:
        raise RuntimeError(f"PyTorch version mismatch: expected {expected['pytorch_version']}, found {torch.__version__}")
    if torch.cuda.is_available():
        raise RuntimeError("CUDA must remain unavailable for the frozen CPU Semantic runtime")


def encode(model: SentenceTransformer, texts: list[str], batch_size: int) -> np.ndarray:
    vectors = model.encode(
        texts,
        batch_size=batch_size,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    result = np.asarray(vectors, dtype=np.float32)
    if result.ndim != 2 or result.shape[1] != 384:
        raise RuntimeError(f"Unexpected embedding shape: {result.shape}")
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--aggregation", choices=sorted(ALLOWED_AGGREGATIONS), default="mean_top_2")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--batch-size", type=int, default=16)
    args = parser.parse_args()

    if args.offline:
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"

    runtime_path = ROOT / "config" / "experiments" / "semantic_runtime.json"
    memberships_path = ROOT / "taxonomy" / "role_occupation_memberships.json"
    candidates_path = ROOT / "data" / "candidates" / "development.json"
    target_config_path = ROOT / "config" / "shared" / "matching_direction_phrases.json"
    candidate_manifest_path = ROOT / "data" / "candidates" / "manifest.json"
    evidence_manifest_path = ROOT / "taxonomy" / "manifest.json"
    runtime = read_json(runtime_path)
    target_config = read_json(target_config_path)
    candidate_manifest = read_json(candidate_manifest_path)
    memberships = read_json(memberships_path)
    candidates = read_json(candidates_path)
    evidence_manifest = read_json(evidence_manifest_path)

    assert_runtime(runtime)
    if len(memberships) != 18:
        raise RuntimeError(f"Expected 18 memberships; found {len(memberships)}")
    if len(candidates) != 20:
        raise RuntimeError(f"Expected 20 development candidates; found {len(candidates)}")

    torch.set_grad_enabled(False)
    torch.use_deterministic_algorithms(True)
    torch.manual_seed(0)
    model_config = runtime["model"]
    model = SentenceTransformer(
        model_config["model_name"],
        revision=model_config["model_revision"],
        cache_folder=str(ROOT / model_config["cache_folder"]),
        device="cpu",
        local_files_only=args.offline,
    )
    model.eval()

    target_background = encode(model, [row["background_target"] for row in memberships], args.batch_size)
    target_direction = encode(model, [row["direction_target"] for row in memberships], args.batch_size)
    candidate_background_vectors = encode(model, [candidate_background(row) for row in candidates], args.batch_size)
    candidate_direction_vectors = encode(model, [join_text(row["desired_work_directions"]) for row in candidates], args.batch_size)

    vector_digest = hashlib.sha256()
    for matrix in (target_background, target_direction, candidate_background_vectors, candidate_direction_vectors):
        vector_digest.update(np.ascontiguousarray(matrix, dtype=np.float32).tobytes())

    results = []
    for candidate_index, candidate in enumerate(candidates):
        membership_results = []
        for membership_index, membership in enumerate(memberships):
            raw_background = float(candidate_background_vectors[candidate_index] @ target_background[membership_index])
            raw_direction = float(candidate_direction_vectors[candidate_index] @ target_direction[membership_index])
            background = public_score(raw_background)
            direction = public_score(raw_direction)
            score = 0.5 * background + 0.5 * direction
            membership_results.append({
                "membership_id": membership["membership_id"],
                "occupation_uri": membership["occupation_uri"],
                "occupation_title": membership["occupation_title"],
                "role_profile_id": membership["role_profile_id"],
                "mapping_type": membership["mapping_type"],
                "raw_background_cosine": round(raw_background, 6),
                "raw_direction_cosine": round(raw_direction, 6),
                "background_score": round(background, 6),
                "direction_score": round(direction, 6),
                "score": round(score, 6),
            })

        groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in membership_results:
            groups[row["role_profile_id"]].append(row)
        rankings = []
        for role_profile_id, rows in groups.items():
            contributors = select_contributors(rows, args.aggregation)
            rankings.append({
                "role_profile_id": role_profile_id,
                "score": round(mean(contributors, "score"), 6),
                "background_score": round(mean(contributors, "background_score"), 6),
                "direction_score": round(mean(contributors, "direction_score"), 6),
                "aggregation": args.aggregation,
                "method": "semantic",
                "method_version": "role-profile-semantic-0.1-draft",
                "contributing_membership_ids": [row["membership_id"] for row in contributors],
                "memberships": sorted(rows, key=lambda row: (-row["score"], row["membership_id"])),
            })
        rankings.sort(key=lambda row: (-row["score"], row["role_profile_id"]))
        for rank, row in enumerate(rankings, start=1):
            row["rank"] = rank
        results.append({
            "candidate_id": candidate["candidate_id"],
            "method": "semantic",
            "aggregation": args.aggregation,
            "engineering_only_unlabelled": True,
            "rankings": rankings,
        })

    output = {
        "report_name": "Development Semantic Membership Dry Run",
        "report_version": "0.1-draft",
        "status": "engineering_only_unlabelled",
        "split": "dev",
        "test_rankings_generated": False,
        "provenance": {
            "operating_system": runtime["runtime"]["operating_system"],
            "python_version": platform.python_version(),
            "sentence_transformers_version": sentence_transformers.__version__,
            "pytorch_version": torch.__version__,
            "cuda_available": torch.cuda.is_available(),
            "model_name": model_config["model_name"],
            "model_revision": model_config["model_revision"],
            "model_local_hash": model_config.get("local_model_hash"),
            "cache_mode": "forced_offline" if args.offline else "normal_cache",
            "cache_folder": model_config["cache_folder"],
            "embedding_dimension": 384,
            "embedding_dtype": "float32",
            "normalised_embeddings": True,
            "similarity": "cosine",
            "public_score_transform": "clip((cosine + 1) / 2, 0, 1)",
            "background_weight": 0.5,
            "direction_weight": 0.5,
            "aggregation_rule": args.aggregation,
            "runtime_config_version": runtime.get("config_version", "active-frozen"),
            "runtime_config_hash": sha256_file(runtime_path),
            "target_config_version": target_config.get("config_version", "active-frozen"),
            "target_config_hash": sha256_file(target_config_path),
            "candidate_dataset_version": candidate_manifest.get("dataset_version", "active-frozen"),
            "membership_evidence_hash": sha256_file(memberships_path),
            "candidate_data_hash": sha256_file(candidates_path),
            "derived_manifest_hash": sha256_file(evidence_manifest_path),
            "source_occupations": evidence_manifest["unique_occupations"],
            "intermediate_memberships": evidence_manifest["memberships"],
            "combined_embedding_sha256": vector_digest.hexdigest(),
            "batch_size": args.batch_size,
        },
        "results": results,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        "ROLE_PROFILE_SEMANTIC_DRY_RUN_OK "
        f"candidates={len(results)} memberships={len(memberships)} aggregation={args.aggregation} "
        f"offline={str(args.offline).lower()} labels_used=false test_rankings=false"
    )


if __name__ == "__main__":
    main()
