from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any, Iterable

from .normalization import SkillNormalizer
from .schemas import CandidateProfile, JobProfile, MatchResult, ValidationError


def load_json(path: str | Path) -> Any:
    with Path(path).open(encoding="utf-8") as handle:
        return json.load(handle)


def save_json(data: Any, path: str | Path) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)


def load_candidates(path: str | Path) -> list[CandidateProfile]:
    path = Path(path)
    if path.suffix.lower() == ".json":
        rows = load_json(path)
    elif path.suffix.lower() == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
        for row in rows:
            for field in ("desired_work_directions", "skills"):
                row[field] = [item.strip() for item in row.get(field, "").split(";") if item.strip()]
    else:
        raise ValidationError("candidate input must be .json or .csv")
    candidates = [CandidateProfile.from_dict(row) for row in rows]
    ids = [candidate.candidate_id for candidate in candidates]
    if len(ids) != len(set(ids)):
        raise ValidationError("candidate_id values must be unique")
    return candidates


def load_jobs(path: str | Path) -> list[JobProfile]:
    rows = load_json(path)
    jobs = [JobProfile.from_dict(row) for row in rows]
    ids = [job.job_id for job in jobs]
    if len(ids) != len(set(ids)):
        raise ValidationError("job_id values must be unique")
    return jobs


def load_skill_normalizer(path: str | Path | None) -> SkillNormalizer:
    if path is None:
        return SkillNormalizer()
    data = load_json(path)
    return SkillNormalizer(data.get("labels", {}), data.get("aliases", {}))


def save_results(results: Iterable[MatchResult], path: str | Path) -> None:
    rows = [result.to_dict() for result in results]
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.suffix.lower() == ".json":
        save_json(rows, target)
    elif target.suffix.lower() == ".csv":
        if not rows:
            raise ValidationError("cannot save an empty result set")
        with target.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
            writer.writeheader()
            for row in rows:
                writer.writerow({key: ";".join(value) if isinstance(value, list) else json.dumps(value) if isinstance(value, dict) else value for key, value in row.items()})
    else:
        raise ValidationError("result output must be .json or .csv")

