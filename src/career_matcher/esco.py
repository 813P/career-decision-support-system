from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path

from .normalization import normalize_text
from .schemas import JobProfile, ValidationError


DATA_VERSION = "ESCO-v1.2.1-en"
TITLE_SCOPE_TERMS = (
    "analyst", "data", "database", "artificial intelligence", "machine learning",
    "business intelligence", "statistic", "operations research", "decision scientist",
    "economist", "actuar", "market research", "knowledge engineer", "bioinformatics",
    "geographic information systems", "chief information officer", "cloud devops",
    "digital product manager", "business consultant", "strategic planning manager",
    "economic adviser", "pricing specialist", "business valuer",
)
EXCLUDED_TITLES = (
    "air pollution analyst", "aquaculture environmental analyst", "call centre analyst",
    "food analyst", "material stress analyst", "water quality analyst",
    "aviation data communications manager", "data centre operator", "data entry clerk",
    "data entry supervisor",
)


def _find(directory: Path, prefix: str) -> Path:
    matches = sorted(directory.glob(f"{prefix}*.csv"))
    if not matches:
        raise ValidationError(f"missing ESCO file matching {prefix}*.csv in {directory}")
    return matches[0]


def _read(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def _first(row: dict[str, str], names: tuple[str, ...], default: str = "") -> str:
    for name in names:
        if row.get(name):
            return row[name].strip()
    return default


def build_esco_catalog(raw_dir: str | Path, output_dir: str | Path, min_jobs: int = 50, max_jobs: int = 100) -> list[JobProfile]:
    """Build a frozen catalog from the official English ESCO v1.2.1 CSV package.

    The ESCO exporter has changed column labels between releases, so common aliases
    are accepted and a clear error is raised if the required identifiers are absent.
    """
    raw = Path(raw_dir)
    occupation_rows = _read(_find(raw, "occupations"))
    occupations_by_uri: dict[str, dict[str, str]] = {}
    for row in sorted(occupation_rows, key=lambda item: item.get("modifiedDate", "")):
        uri = _first(row, ("conceptUri", "conceptURI", "occupationUri"))
        if uri:
            occupations_by_uri[uri] = row
    occupations = list(occupations_by_uri.values())
    # v1.2.1 contains a small number of repeated skill URIs with different
    # modification timestamps. Process older rows first so the newest released
    # record deterministically becomes the canonical label/metadata row.
    skills = sorted(_read(_find(raw, "skills")), key=lambda row: row.get("modifiedDate", ""))
    relations = _read(_find(raw, "occupationSkillRelations"))

    skill_labels: dict[str, str] = {}
    skill_aliases: dict[str, str] = {}
    for row in skills:
        uri = _first(row, ("conceptUri", "conceptURI", "skillUri"))
        label = _first(row, ("preferredLabel", "preferredTerm", "title"))
        if uri and label:
            skill_labels[uri] = label
            for alias in _first(row, ("altLabels", "alternativeLabels")).split("\n"):
                if alias.strip():
                    skill_aliases[alias.strip()] = uri

    essential: dict[str, list[str]] = defaultdict(list)
    optional: dict[str, list[str]] = defaultdict(list)
    for row in relations:
        occupation_uri = _first(row, ("occupationUri", "occupationURI"))
        skill_uri = _first(row, ("skillUri", "skillURI"))
        relation_type = normalize_text(_first(row, ("relationType", "type")))
        if occupation_uri and skill_uri:
            (essential if "essential" in relation_type else optional)[occupation_uri].append(skill_uri)

    jobs = []
    for row in occupations:
        uri = _first(row, ("conceptUri", "conceptURI", "occupationUri"))
        title = _first(row, ("preferredLabel", "preferredTerm", "title"))
        description = _first(row, ("description", "definition"))
        alternatives = tuple(item.strip() for item in _first(row, ("altLabels", "alternativeLabels")).split("\n") if item.strip())
        normalized_title = normalize_text(title)
        in_scope = any(term in normalized_title for term in TITLE_SCOPE_TERMS)
        excluded = normalized_title in EXCLUDED_TITLES
        if uri and title and in_scope and not excluded:
            e_ids = tuple(dict.fromkeys(essential.get(uri, [])))
            o_ids = tuple(dict.fromkeys(optional.get(uri, [])))
            jobs.append(JobProfile(
                job_id=uri,
                title=title,
                alternative_titles=alternatives,
                description=description,
                essential_skill_ids=e_ids,
                optional_skill_ids=o_ids,
                essential_skills=tuple(skill_labels.get(item, item) for item in e_ids),
                optional_skills=tuple(skill_labels.get(item, item) for item in o_ids),
                data_version=DATA_VERSION,
            ))
    jobs = sorted(jobs, key=lambda job: (normalize_text(job.title), job.job_id))[:max_jobs]
    if len(jobs) < min_jobs:
        raise ValidationError(f"scope filter returned {len(jobs)} jobs; expected at least {min_jobs}. Review ESCO columns or scope terms.")

    target = Path(output_dir)
    target.mkdir(parents=True, exist_ok=True)
    (target / "jobs.json").write_text(json.dumps([job.to_dict() for job in jobs], indent=2, ensure_ascii=False), encoding="utf-8")
    (target / "skills.json").write_text(json.dumps({"labels": skill_labels, "aliases": skill_aliases}, indent=2, ensure_ascii=False), encoding="utf-8")
    manifest = {
        "data_version": DATA_VERSION,
        "job_count": len(jobs),
        "source_occupation_row_count": len(occupation_rows),
        "unique_occupation_count": len(occupations),
        "selection_method": "preferred occupation title contains a frozen data/AI/business-analysis term; explicit off-scope titles excluded",
        "title_scope_terms": list(TITLE_SCOPE_TERMS),
        "excluded_titles": list(EXCLUDED_TITLES),
        "source_files": [path.name for path in (_find(raw, "occupations"), _find(raw, "skills"), _find(raw, "occupationSkillRelations"))],
    }
    (target / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return jobs
