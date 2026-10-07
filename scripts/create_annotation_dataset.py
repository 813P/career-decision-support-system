"""Build the complete candidate–membership annotation frame.

Model outputs are hidden by default. Scores are joined only in explicit visible
mode, for separately identified post-annotation inspection.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CANDIDATES = ROOT / "data" / "candidates" / "profiles.json"
DEFAULT_MEMBERSHIPS = ROOT / "taxonomy" / "role_occupation_memberships.json"
DEFAULT_OUTPUT = ROOT / "data" / "annotation" / "annotation_ready_all_candidates.csv"

TEMPLATE_COLUMNS = [
    "candidate_id",
    "membership_id",
    "occupation_id",
    "role_profile_id",
    "model_rank",
    "model_score",
    "human_relevance",
    "annotation_reason",
    "evidence_strength",
    "annotator_id",
    "annotation_timestamp",
]
CONTEXT_COLUMNS = [
    "current_job_title",
    "desired_work_directions",
    "skills",
    "experience_narrative",
    "occupation_title",
    "role_profile_name",
    "mapping_type",
]
OUTPUT_COLUMNS = TEMPLATE_COLUMNS[:6] + CONTEXT_COLUMNS + TEMPLATE_COLUMNS[6:]
HUMAN_COLUMNS = [
    "human_relevance",
    "annotation_reason",
    "evidence_strength",
    "annotator_id",
    "annotation_timestamp",
]


def _read_json_list(path: Path, label: str) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, dict):
        for key in (label, "profiles", "memberships", "results"):
            if isinstance(payload.get(key), list):
                payload = payload[key]
                break
    if not isinstance(payload, list):
        raise ValueError(f"{path} must contain a JSON list")
    return payload


def _index_unique(rows: list[dict[str, Any]], key: str, source: Path) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for row in rows:
        value = str(row.get(key, "")).strip()
        if not value:
            raise ValueError(f"Missing {key} in {source}")
        if value in result:
            raise ValueError(f"Duplicate {key}={value} in {source}")
        result[value] = row
    return result


def _human_text(value: Any) -> str:
    if isinstance(value, list):
        return " | ".join(str(item).strip() for item in value if str(item).strip())
    return str(value or "").strip()


def _read_score_index(scores_path: Path) -> dict[tuple[str, str], dict[str, str]]:
    with scores_path.open("r", encoding="utf-8-sig", newline="") as handle:
        scores = list(csv.DictReader(handle))
    missing_score_columns = {
        "candidate_id", "membership_id", "occupation_id", "role_profile_id", "final_score", "rank"
    } - set(scores[0].keys() if scores else [])
    if missing_score_columns:
        raise ValueError(f"Score CSV missing columns: {sorted(missing_score_columns)}")
    result: dict[tuple[str, str], dict[str, str]] = {}
    for score in scores:
        pair = (score["candidate_id"].strip(), score["membership_id"].strip())
        if pair in result:
            raise ValueError(f"Duplicate score pair: {pair}")
        result[pair] = score
    return result


def create_rows(
    candidates_path: Path,
    memberships_path: Path,
    scores_path: Path | None = None,
    *,
    model_visibility: str = "hidden",
) -> list[dict[str, Any]]:
    if model_visibility not in {"hidden", "visible"}:
        raise ValueError("model_visibility must be 'hidden' or 'visible'")
    candidates = _index_unique(_read_json_list(candidates_path, "candidates"), "candidate_id", candidates_path)
    memberships = _index_unique(
        _read_json_list(memberships_path, "memberships"), "membership_id", memberships_path
    )
    score_index: dict[tuple[str, str], dict[str, str]] = {}
    if model_visibility == "visible":
        if scores_path is None:
            raise ValueError("--scores is required when model_visibility is 'visible'")
        score_index = _read_score_index(scores_path)
        expected_pairs = {(candidate_id, membership_id) for candidate_id in candidates for membership_id in memberships}
        actual_pairs = set(score_index)
        if actual_pairs != expected_pairs:
            missing = len(expected_pairs - actual_pairs)
            unexpected = len(actual_pairs - expected_pairs)
            raise ValueError(
                f"Score coverage mismatch for visible output: missing_pairs={missing}, unexpected_pairs={unexpected}"
            )

    rows: list[dict[str, Any]] = []
    for candidate_id in sorted(candidates):
        candidate = candidates[candidate_id]
        for membership_id in sorted(memberships):
            membership = memberships[membership_id]
            pair = (candidate_id, membership_id)
            score = score_index.get(pair)
            membership_occupation_id = str(
                membership.get("occupation_id") or membership.get("occupation_uri") or ""
            ).strip()
            role_profile_id = str(membership.get("role_profile_id", "")).strip()
            if not membership_occupation_id or not role_profile_id:
                raise ValueError(f"Incomplete membership identity for {membership_id}")
            if score is not None:
                if membership_occupation_id != score["occupation_id"].strip():
                    raise ValueError(f"Occupation mismatch for {pair}")
                if role_profile_id != score["role_profile_id"].strip():
                    raise ValueError(f"Role Profile mismatch for {pair}")
            rows.append({
                "candidate_id": candidate_id,
                "membership_id": membership_id,
                "occupation_id": membership_occupation_id,
                "role_profile_id": role_profile_id,
                "model_rank": score["rank"].strip() if score is not None else "",
                "model_score": score["final_score"].strip() if score is not None else "",
                "current_job_title": _human_text(candidate.get("current_job_title")),
                "desired_work_directions": _human_text(candidate.get("desired_work_directions")),
                "skills": _human_text(candidate.get("skills")),
                "experience_narrative": _human_text(candidate.get("experience_narrative")),
                "occupation_title": _human_text(membership.get("occupation_title")),
                "role_profile_name": _human_text(membership.get("role_profile_name")),
                "mapping_type": _human_text(membership.get("mapping_type")),
                "human_relevance": "",
                "annotation_reason": "",
                "evidence_strength": "",
                "annotator_id": "",
                "annotation_timestamp": "",
            })

    if model_visibility == "visible":
        rows.sort(key=lambda row: (row["candidate_id"], int(row["model_rank"]), row["membership_id"]))
    else:
        rows.sort(key=lambda row: (row["candidate_id"], row["role_profile_id"], row["membership_id"]))
    return rows


def write_dataset(
    rows: list[dict[str, Any]],
    output_path: Path,
    *,
    replace_unannotated: bool = False,
) -> None:
    if output_path.exists():
        if not replace_unannotated:
            raise FileExistsError(
                f"Refusing to overwrite annotation data: {output_path}. Choose a new --output path."
            )
        with output_path.open("r", encoding="utf-8-sig", newline="") as handle:
            existing = list(csv.DictReader(handle))
        if any(str(row.get(column, "")).strip() for row in existing for column in HUMAN_COLUMNS):
            raise ValueError(f"Refusing to replace annotation data containing human input: {output_path}")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = output_path.with_suffix(output_path.suffix + ".tmp")
    with temporary_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    try:
        os.replace(temporary_path, output_path)
    except PermissionError as exc:
        raise PermissionError(
            f"Could not replace {output_path}. Close Excel or any preview using the file and retry; "
            f"the validated temporary output remains at {temporary_path}."
        ) from exc


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidates", type=Path, default=DEFAULT_CANDIDATES)
    parser.add_argument("--memberships", type=Path, default=DEFAULT_MEMBERSHIPS)
    parser.add_argument(
        "--scores",
        type=Path,
        help="Complete score matrix; required only with --model-visibility visible.",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--model-visibility",
        choices=("hidden", "visible"),
        default="hidden",
        help="Keep model_rank/model_score blank for model-output-blinded researcher annotation (default), or expose them for later review.",
    )
    parser.add_argument(
        "--replace-unannotated",
        action="store_true",
        help="Replace an existing output only when every human annotation field is blank.",
    )
    args = parser.parse_args()
    rows = create_rows(
        args.candidates.resolve(),
        args.memberships.resolve(),
        args.scores.resolve() if args.scores else None,
        model_visibility=args.model_visibility,
    )
    write_dataset(rows, args.output.resolve(), replace_unannotated=args.replace_unannotated)
    print(
        f"ANNOTATION_DATASET_CREATED rows={len(rows)} model_visibility={args.model_visibility} "
        f"output={args.output.resolve()}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
