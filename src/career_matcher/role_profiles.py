from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass
from typing import Any, Iterable

from .schemas import CandidateProfile, ValidationError


TOKEN_RE = re.compile(r"[a-z0-9+#.]{2,}")


def normalize_text(value: Any) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).casefold()
    return " ".join(re.sub(r"[^\w+#.]+", " ", text, flags=re.UNICODE).split())


def tokens(value: Any) -> list[str]:
    return TOKEN_RE.findall(normalize_text(value))


def join_text(values: Iterable[Any]) -> str:
    parts: list[str] = []
    for value in values:
        if isinstance(value, str) and value.strip():
            parts.append(value.strip())
        elif isinstance(value, (list, tuple)):
            parts.extend(item.strip() for item in value if isinstance(item, str) and item.strip())
    return " ".join(parts)


class TfidfSpace:
    def __init__(self, documents: list[str]):
        counts = [Counter(tokens(document)) for document in documents]
        document_frequency = Counter(token for row in counts for token in row)
        self.idf = {
            token: math.log((1 + len(documents)) / (1 + frequency)) + 1
            for token, frequency in document_frequency.items()
        }
        self.document_vectors = [self._transform_counts(row) for row in counts]

    def _transform_counts(self, counts: Counter[str]) -> dict[str, float]:
        retained = {token: count for token, count in counts.items() if token in self.idf}
        total = sum(retained.values())
        if not total:
            return {}
        raw = {token: count / total * self.idf[token] for token, count in retained.items()}
        norm = math.sqrt(sum(value * value for value in raw.values()))
        return {token: value / norm for token, value in raw.items()} if norm else {}

    def transform(self, text: str) -> dict[str, float]:
        return self._transform_counts(Counter(tokens(text)))

    @staticmethod
    def cosine(left: dict[str, float], right: dict[str, float]) -> float:
        return max(0.0, min(1.0, sum(value * right.get(token, 0.0) for token, value in left.items())))


@dataclass
class RoleProfileMatcher:
    memberships: list[dict[str, Any]]
    role_profiles: list[dict[str, Any]]
    aliases: dict[str, Any]
    method: str
    aggregation: str
    background_weight: float
    direction_weight: float

    def __post_init__(self) -> None:
        if len(self.memberships) != 18:
            raise ValueError("membership evidence must contain 18 records")
        if len(self.role_profiles) != 5:
            raise ValueError("role profile schema must contain five records")
        if self.method != "tfidf":
            raise ValueError("the application matcher currently supports only the tfidf method")
        if self.aggregation != "mean_all":
            raise ValueError("the selected application configuration requires mean_all")
        for name, weight in (
            ("background", self.background_weight),
            ("direction", self.direction_weight),
        ):
            if not isinstance(weight, (int, float)) or isinstance(weight, bool) or not math.isfinite(weight):
                raise ValueError(f"{name} weight must be a finite number")
            if not 0 <= weight <= 1:
                raise ValueError(f"{name} weight must be between 0 and 1")
        if not math.isclose(self.background_weight + self.direction_weight, 1.0):
            raise ValueError("background and direction weights must sum to 1")
        self._roles = {row["role_profile_id"]: row for row in self.role_profiles}
        self._background_space = TfidfSpace([row["background_target"] for row in self.memberships])
        self._direction_space = TfidfSpace([row["direction_target"] for row in self.memberships])

    def _canonicalize(self, value: str, role_profile_id: str, scope: str) -> str:
        result = normalize_text(value)
        if self.aliases.get("status") != "frozen":
            return result
        applicable: list[tuple[str, str]] = []
        for row in self.aliases.get("aliases", []):
            if scope not in row.get("scope", []) or role_profile_id not in row.get("role_profile_scope", []):
                continue
            canonical = normalize_text(row["canonical_term"])
            applicable.extend((normalize_text(alias), canonical) for alias in row.get("aliases", []))
        for alias, canonical in sorted(applicable, key=lambda pair: -len(pair[0])):
            result = re.sub(rf"(^| ){re.escape(alias)}(?= |$)", rf"\1{canonical}", result)
        return result

    def _has_candidate_evidence(self, label: str, candidate: CandidateProfile, role_profile_id: str) -> bool:
        canonical = self._canonicalize(label, role_profile_id, "missing_evidence_check")
        skills = {
            self._canonicalize(skill, role_profile_id, "missing_evidence_check")
            for skill in candidate.skills
        }
        narrative = self._canonicalize(candidate.experience_narrative, role_profile_id, "missing_evidence_check")
        return len(canonical) >= 2 and (canonical in skills or f" {canonical} " in f" {narrative} ")

    def _structured_details(self, candidate: CandidateProfile, membership: dict[str, Any]) -> dict[str, Any]:
        explicit = {normalize_text(skill) for skill in candidate.skills}
        matched = [skill for skill in membership["skills"] if normalize_text(skill["skill_label"]) in explicit]
        matched_keys = {normalize_text(skill["skill_label"]) for skill in matched}
        missing = [
            skill["skill_label"]
            for skill in membership["skills"]
            if skill["evidence_tier"] == "core"
            and normalize_text(skill["skill_label"]) not in matched_keys
            and not self._has_candidate_evidence(skill["skill_label"], candidate, membership["role_profile_id"])
        ]
        return {"matched_skills": matched, "missing_core_evidence": missing}

    def rank(self, candidate: CandidateProfile) -> list[dict[str, Any]]:
        background_text = join_text([candidate.current_job_title, candidate.skills, candidate.experience_narrative])
        direction_text = join_text([candidate.desired_work_directions])
        background_vector = self._background_space.transform(background_text)
        direction_vector = self._direction_space.transform(direction_text)
        membership_results: list[dict[str, Any]] = []
        for index, membership in enumerate(self.memberships):
            background = self._background_space.cosine(background_vector, self._background_space.document_vectors[index])
            direction = self._direction_space.cosine(direction_vector, self._direction_space.document_vectors[index])
            details = self._structured_details(candidate, membership)
            membership_results.append({
                "membership_id": membership["membership_id"],
                "occupation_uri": membership["occupation_uri"],
                "occupation_title": membership["occupation_title"],
                "role_profile_id": membership["role_profile_id"],
                "mapping_type": membership["mapping_type"],
                "background_score": round(background, 6),
                "direction_score": round(direction, 6),
                "score": round(
                    self.background_weight * background + self.direction_weight * direction,
                    6,
                ),
                **details,
            })

        results: list[dict[str, Any]] = []
        for role_profile_id, role in self._roles.items():
            rows = sorted(
                (row for row in membership_results if row["role_profile_id"] == role_profile_id),
                key=lambda row: (-row["score"], row["membership_id"]),
            )
            mean = lambda field: round(sum(row[field] for row in rows) / len(rows), 6)
            matched = sorted({skill["skill_label"] for row in rows for skill in row["matched_skills"]})
            strongest = rows[0]
            results.append({
                "role_profile_id": role_profile_id,
                "role_profile_name_en": role["display_name_en"],
                "role_profile_name_zh": role["display_name_zh"],
                "definition": role["definition"],
                "typical_tasks": role["core_task_areas"],
                "score": mean("score"),
                "background_score": mean("background_score"),
                "direction_score": mean("direction_score"),
                "aggregation": self.aggregation,
                "method": self.method,
                "contributing_membership_ids": [row["membership_id"] for row in rows],
                "strongest_occupation": {
                    "occupation_uri": strongest["occupation_uri"],
                    "title": strongest["occupation_title"],
                    "score": strongest["score"],
                },
                "matched_skills": matched[:8],
                "missing_core_evidence": [],
                "memberships": rows,
            })
        results.sort(key=lambda row: (-row["score"], row["role_profile_id"]))
        for index, result in enumerate(results, start=1):
            result["rank"] = index
            if index > 3:
                continue
            missing: dict[str, dict[str, Any]] = {}
            for membership in result["memberships"]:
                for label in membership["missing_core_evidence"]:
                    key = normalize_text(label)
                    item = missing.setdefault(key, {"skill_label": label, "source_membership_ids": []})
                    item["source_membership_ids"].append(membership["membership_id"])
            result["missing_core_evidence"] = [
                {
                    **item,
                    "evidence_absence_message": f"The supplied profile does not show explicit evidence of {item['skill_label']}.",
                }
                for item in list(missing.values())[:3]
            ]
        return results


def validate_rank_model(model: str, configured_model: str) -> None:
    if model != configured_model:
        raise ValidationError(
            f"the published application uses the frozen {configured_model} configuration"
        )
