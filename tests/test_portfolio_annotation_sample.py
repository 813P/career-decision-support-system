from __future__ import annotations

import importlib.util
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def load_script(name: str):
    path = PROJECT_ROOT / "scripts" / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def synthetic_governance():
    roles = [f"r{index}" for index in range(5)]
    scenarios = [f"s{index}" for index in range(5)]
    rows = []
    counter = 1
    for split in ("dev", "test"):
        for role_index, role in enumerate(roles):
            for scenario_index, scenario in enumerate(scenarios):
                if split == "dev" and role_index == scenario_index:
                    continue
                rows.append({
                    "candidate_id": f"C{counter:03d}",
                    "split": split,
                    "intended_role_profile": role,
                    "scenario_category": scenario,
                })
                counter += 1
    return rows


def test_portfolio_selection_is_deterministic_balanced_and_candidate_level() -> None:
    selector = load_script("create_portfolio_annotation_sample")
    governance = synthetic_governance()
    first = selector.select_test_candidate_ids(governance, "fixed-seed")
    second = selector.select_test_candidate_ids(governance, "fixed-seed")
    assert first == second
    assert len(first) == len(set(first)) == 10
    by_id = {row["candidate_id"]: row for row in governance}
    selected = [by_id[candidate_id] for candidate_id in first]
    assert set(selector._balance(selected, "intended_role_profile").values()) == {2}
    assert set(selector._balance(selected, "scenario_category").values()) == {2}


def test_reliability_selection_uses_three_candidates_per_split_and_covers_strata() -> None:
    selector = load_script("create_portfolio_annotation_sample")
    governance = synthetic_governance()
    test_ids = selector.select_test_candidate_ids(governance, "fixed-seed")
    reliability = selector.select_reliability_candidate_ids(governance, test_ids, "fixed-seed")
    by_id = {row["candidate_id"]: row for row in governance}
    rows = [by_id[candidate_id] for candidate_id in reliability]
    assert len(reliability) == len(set(reliability)) == 6
    assert sum(row["split"] == "dev" for row in rows) == 3
    assert sum(row["split"] == "test" for row in rows) == 3
    assert len({row["intended_role_profile"] for row in rows}) == 5
    assert len({row["scenario_category"] for row in rows}) == 5


def test_annotator_assignment_copies_rows_without_cross_file_mutation() -> None:
    selector = load_script("create_portfolio_annotation_sample")
    source = [{"candidate_id": "C001", "annotator_id": ""}]
    primary = selector.assign_annotator(source, "annotator_A")
    reliability = selector.assign_annotator(source, "annotator_B")
    assert source[0]["annotator_id"] == ""
    assert primary[0]["annotator_id"] == "annotator_A"
    assert reliability[0]["annotator_id"] == "annotator_B"
