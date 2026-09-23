from __future__ import annotations

import csv
import importlib.util
import json
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def load_script(name: str):
    path = PROJECT_ROOT / "scripts" / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def write_json(path: Path, value) -> None:
    path.write_text(json.dumps(value), encoding="utf-8")


def test_annotation_join_is_blinded_by_default(tmp_path: Path) -> None:
    builder = load_script("create_annotation_dataset")
    candidates = tmp_path / "candidates.json"
    memberships = tmp_path / "memberships.json"
    scores = tmp_path / "scores.csv"
    write_json(candidates, [{
        "candidate_id": "C001", "current_job_title": "Analyst", "desired_work_directions": ["Data Analyst"],
        "skills": ["SQL"], "experience_narrative": "Built reporting dashboards.",
        "scenario_category": "must_not_leak",
    }])
    write_json(memberships, [{
        "membership_id": "r1::o1", "occupation_uri": "o1", "occupation_title": "data analyst",
        "role_profile_id": "r1", "role_profile_name": "Data Analytics", "mapping_type": "core",
    }])
    with scores.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=[
            "candidate_id", "membership_id", "occupation_id", "role_profile_id",
            "background_score", "direction_score", "final_score", "rank",
        ])
        writer.writeheader()
        writer.writerow({
            "candidate_id": "C001", "membership_id": "r1::o1", "occupation_id": "o1",
            "role_profile_id": "r1", "background_score": "0.4", "direction_score": "0.6",
            "final_score": "0.5", "rank": "1",
        })
    rows = builder.create_rows(candidates, memberships, scores)
    assert len(rows) == 1
    assert rows[0]["model_rank"] == ""
    assert rows[0]["model_score"] == ""
    assert "scenario_category" not in rows[0]
    visible = builder.create_rows(candidates, memberships, scores, model_visibility="visible")
    assert visible[0]["model_rank"] == "1"
    assert visible[0]["model_score"] == "0.5"


def test_blind_annotation_builds_full_candidate_membership_matrix_without_scores(tmp_path: Path) -> None:
    builder = load_script("create_annotation_dataset")
    candidates = tmp_path / "candidates.json"
    memberships = tmp_path / "memberships.json"
    output = tmp_path / "annotation.csv"
    write_json(candidates, [
        {"candidate_id": "C001", "current_job_title": "A", "desired_work_directions": [], "skills": [], "experience_narrative": ""},
        {"candidate_id": "C002", "current_job_title": "B", "desired_work_directions": [], "skills": [], "experience_narrative": ""},
    ])
    write_json(memberships, [
        {"membership_id": "r1::o1", "occupation_uri": "o1", "role_profile_id": "r1"},
        {"membership_id": "r2::o2", "occupation_uri": "o2", "role_profile_id": "r2"},
    ])
    rows = builder.create_rows(candidates, memberships)
    assert len(rows) == 4
    assert len({(row["candidate_id"], row["membership_id"]) for row in rows}) == 4
    assert all(row["model_rank"] == row["model_score"] == "" for row in rows)
    builder.write_dataset(rows, output)
    with pytest.raises(FileExistsError):
        builder.write_dataset(rows, output)
    builder.write_dataset(rows, output, replace_unannotated=True)
    with output.open(encoding="utf-8-sig", newline="") as handle:
        annotated = list(csv.DictReader(handle))
    annotated[0]["human_relevance"] = "2"
    with output.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=builder.OUTPUT_COLUMNS)
        writer.writeheader()
        writer.writerows(annotated)
    with pytest.raises(ValueError, match="containing human input"):
        builder.write_dataset(rows, output, replace_unannotated=True)
