"""Create the frozen portfolio annotation sample and 20% reliability sample."""

from __future__ import annotations

import argparse
import csv
import hashlib
import itertools
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from create_annotation_dataset import create_rows, write_dataset


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SEED = "mair-portfolio-annotation-v1"
DEFAULT_CANDIDATES = ROOT / "data" / "candidates" / "profiles.json"
DEFAULT_MEMBERSHIPS = ROOT / "taxonomy" / "role_occupation_memberships.json"
DEFAULT_GOVERNANCE = ROOT / "data" / "candidates" / "governance.json"
DEFAULT_PRIMARY = ROOT / "data" / "annotation" / "annotation_primary.csv"
DEFAULT_MANIFEST = ROOT / "data" / "annotation" / "portfolio_annotation_selection_manifest.json"


def _hash_key(seed: str, label: str, values: Iterable[str]) -> str:
    payload = f"{seed}|{label}|{'|'.join(sorted(values))}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _balance(rows: Iterable[dict[str, Any]], field: str) -> dict[str, int]:
    return dict(sorted(Counter(str(row[field]) for row in rows).items()))


def select_test_candidate_ids(governance: list[dict[str, Any]], seed: str) -> list[str]:
    test = [row for row in governance if row.get("split") == "test"]
    roles = sorted({str(row["intended_role_profile"]) for row in test})
    scenarios = sorted({str(row["scenario_category"]) for row in test})
    if len(roles) != 5 or len(scenarios) != 5:
        raise ValueError("Portfolio stratification requires five roles and five scenarios")

    selected: list[dict[str, Any]] = []
    # Select two cyclic scenario cells per role. This produces 10 cells with
    # exactly two selected candidates per role and per scenario.
    for role_index, role in enumerate(roles):
        for offset in (1, 2):
            scenario = scenarios[(role_index + offset) % len(scenarios)]
            cell = [
                row for row in test
                if row["intended_role_profile"] == role and row["scenario_category"] == scenario
            ]
            if not cell:
                raise ValueError(f"Empty test stratum: {role}/{scenario}")
            selected.append(min(
                cell,
                key=lambda row: (
                    _hash_key(seed, f"test-cell:{role}:{scenario}", [row["candidate_id"]]),
                    row["candidate_id"],
                ),
            ))

    if len(selected) != 10:
        raise ValueError(f"Expected 10 selected test candidates; found {len(selected)}")
    if set(_balance(selected, "intended_role_profile").values()) != {2}:
        raise ValueError("Selected test candidates are not balanced two per role")
    if set(_balance(selected, "scenario_category").values()) != {2}:
        raise ValueError("Selected test candidates are not balanced two per scenario")
    return sorted(row["candidate_id"] for row in selected)


def _combination_score(rows: tuple[dict[str, Any], ...], seed: str, label: str) -> tuple[Any, ...]:
    role_counts = Counter(str(row["intended_role_profile"]) for row in rows)
    scenario_counts = Counter(str(row["scenario_category"]) for row in rows)
    return (
        -len(role_counts),
        -len(scenario_counts),
        sum(value * value for value in role_counts.values()),
        sum(value * value for value in scenario_counts.values()),
        _hash_key(seed, label, [row["candidate_id"] for row in rows]),
    )


def select_reliability_candidate_ids(
    governance: list[dict[str, Any]], selected_test_ids: list[str], seed: str
) -> list[str]:
    dev = [row for row in governance if row.get("split") == "dev"]
    selected_test_set = set(selected_test_ids)
    test = [row for row in governance if row.get("candidate_id") in selected_test_set]
    if len(dev) != 20 or len(test) != 10:
        raise ValueError("Reliability selection requires 20 development and 10 selected test candidates")

    dev_choice = min(
        itertools.combinations(dev, 3),
        key=lambda rows: _combination_score(rows, seed, "reliability-dev"),
    )
    test_choices = []
    for rows in itertools.combinations(test, 3):
        combined = dev_choice + rows
        if len({row["intended_role_profile"] for row in combined}) < 5:
            continue
        if len({row["scenario_category"] for row in combined}) < 5:
            continue
        test_choices.append(rows)
    if not test_choices:
        raise ValueError("Could not construct a reliability sample covering all roles and scenarios")
    test_choice = min(
        test_choices,
        key=lambda rows: (
            _combination_score(rows, seed, "reliability-test")[:-1]
            + _combination_score(dev_choice + rows, seed, "reliability-combined")
        ),
    )
    selected = dev_choice + test_choice
    if len(selected) != 6:
        raise ValueError("Expected six reliability candidates")
    return sorted(row["candidate_id"] for row in selected)


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _write_manifest(path: Path, value: dict[str, Any]) -> None:
    if path.exists():
        raise FileExistsError(f"Refusing to overwrite selection manifest: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def assign_annotator(rows: list[dict[str, Any]], annotator_id: str) -> list[dict[str, Any]]:
    """Return independent row copies so one annotator file cannot mutate another."""
    return [{**row, "annotator_id": annotator_id} for row in rows]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidates", type=Path, default=DEFAULT_CANDIDATES)
    parser.add_argument("--memberships", type=Path, default=DEFAULT_MEMBERSHIPS)
    parser.add_argument("--governance", type=Path, default=DEFAULT_GOVERNANCE)
    parser.add_argument("--primary-output", type=Path, default=DEFAULT_PRIMARY)
    parser.add_argument(
        "--reliability-output",
        type=Path,
        required=True,
        help="Explicit output path for the optional, unlabelled reliability-study input.",
    )
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--seed", default=DEFAULT_SEED)
    args = parser.parse_args()

    candidates_path = args.candidates.resolve()
    memberships_path = args.memberships.resolve()
    governance_path = args.governance.resolve()
    governance = json.loads(governance_path.read_text(encoding="utf-8"))
    if not isinstance(governance, list):
        raise ValueError("Governance file must contain a JSON list")
    all_rows = create_rows(candidates_path, memberships_path)
    dev_ids = sorted(row["candidate_id"] for row in governance if row.get("split") == "dev")
    test_ids = select_test_candidate_ids(governance, args.seed)
    primary_ids = set(dev_ids + test_ids)
    reliability_ids = select_reliability_candidate_ids(governance, test_ids, args.seed)
    reliability_set = set(reliability_ids)
    primary_rows = assign_annotator(
        [row for row in all_rows if row["candidate_id"] in primary_ids], "annotator_A"
    )
    reliability_rows = assign_annotator(
        [row for row in all_rows if row["candidate_id"] in reliability_set], "annotator_B"
    )
    if len(primary_rows) != 540 or len(reliability_rows) != 108:
        raise ValueError(
            f"Unexpected output sizes: primary={len(primary_rows)}, reliability={len(reliability_rows)}"
        )

    primary_output = args.primary_output.resolve()
    reliability_output = args.reliability_output.resolve()
    manifest_output = args.manifest.resolve()
    write_dataset(primary_rows, primary_output)
    write_dataset(reliability_rows, reliability_output)

    governance_by_id = {row["candidate_id"]: row for row in governance}
    selected_test_rows = [governance_by_id[candidate_id] for candidate_id in test_ids]
    reliability_rows_governance = [governance_by_id[candidate_id] for candidate_id in reliability_ids]
    _write_manifest(manifest_output, {
        "manifest_name": "Portfolio Human Annotation Sample",
        "status": "researcher_only_do_not_share_with_annotators",
        "annotation_unit": "candidate × membership",
        "selection_seed": args.seed,
        "primary_sample": {
            "development_candidate_ids": dev_ids,
            "selected_test_candidate_ids": test_ids,
            "candidate_count": 30,
            "membership_count": 18,
            "judgement_count": 540,
            "test_role_balance": _balance(selected_test_rows, "intended_role_profile"),
            "test_scenario_balance": _balance(selected_test_rows, "scenario_category"),
        },
        "reliability_sample": {
            "candidate_ids": reliability_ids,
            "development_candidate_ids": [candidate_id for candidate_id in reliability_ids if governance_by_id[candidate_id]["split"] == "dev"],
            "test_candidate_ids": [candidate_id for candidate_id in reliability_ids if governance_by_id[candidate_id]["split"] == "test"],
            "candidate_count": 6,
            "membership_count": 18,
            "judgement_count": 108,
            "role_balance": _balance(reliability_rows_governance, "intended_role_profile"),
            "scenario_balance": _balance(reliability_rows_governance, "scenario_category"),
        },
        "annotator_blinding": "CSV outputs exclude split and all governance fields; model_rank and model_score remain blank.",
        "manual_input_policy": {
            "always_required": ["human_relevance"],
            "conditionally_required": {
                "evidence_strength": "Required only for label 1 or when the annotator is uncertain.",
                "annotation_reason": "Required only for ambiguous or boundary cases; otherwise leave blank.",
            },
            "prefilled": {"annotation_primary.csv": "annotator_A", "annotation_reliability_sample.csv": "annotator_B"},
            "annotation_timestamp": "Fill the complete column once after finishing the file, or record one completion timestamp during consolidation.",
        },
        "source_hashes": {
            str(candidates_path.relative_to(ROOT)).replace("\\", "/"): _sha256(candidates_path),
            str(memberships_path.relative_to(ROOT)).replace("\\", "/"): _sha256(memberships_path),
            str(governance_path.relative_to(ROOT)).replace("\\", "/"): _sha256(governance_path),
        },
        "output_hashes": {
            str(primary_output.relative_to(ROOT)).replace("\\", "/"): _sha256(primary_output),
            str(reliability_output.relative_to(ROOT)).replace("\\", "/"): _sha256(reliability_output),
        },
    })
    print(
        "PORTFOLIO_ANNOTATION_SAMPLE_CREATED "
        f"primary_rows={len(primary_rows)} reliability_rows={len(reliability_rows)} "
        f"test_candidates={len(test_ids)} reliability_candidates={len(reliability_ids)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
