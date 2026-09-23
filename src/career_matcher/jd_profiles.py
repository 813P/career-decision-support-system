from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Any

from .schemas import ValidationError


SPACE_RE = re.compile(r"[^\w+#.]+", flags=re.UNICODE)


def normalize_jd_text(value: Any) -> str:
    """Normalize text while preserving word order for contiguous phrase matching."""
    text = unicodedata.normalize("NFKC", str(value or "")).casefold()
    return " ".join(SPACE_RE.sub(" ", text).split())


def phrase_is_present(normalized_text: str, phrase: str) -> bool:
    normalized_phrase = normalize_jd_text(phrase)
    if not normalized_phrase:
        return False
    if re.search(r"[\u3400-\u9fff]", normalized_phrase):
        return normalized_phrase in normalized_text
    return f" {normalized_phrase} " in f" {normalized_text} "


@dataclass(frozen=True)
class JdProfileAnalyzer:
    config: dict[str, Any]
    role_profiles: list[dict[str, Any]]

    def __post_init__(self) -> None:
        if self.config.get("status") != "experimental":
            raise ValueError("JD evidence configuration must be marked experimental")
        thresholds = self.config.get("thresholds", {})
        primary = thresholds.get("primary")
        supporting = thresholds.get("supporting")
        anchor_cap = thresholds.get("anchor_cap")
        if not all(isinstance(value, (int, float)) for value in (primary, supporting, anchor_cap)):
            raise ValueError("JD evidence configuration must define numeric thresholds")
        if not 0 <= anchor_cap < supporting < primary <= 1:
            raise ValueError("JD evidence thresholds must satisfy anchor_cap < supporting < primary")

        canonical_ids = {row["role_profile_id"] for row in self.role_profiles}
        configured_ids = {row.get("role_profile_id") for row in self.config.get("role_profiles", [])}
        if configured_ids != canonical_ids:
            raise ValueError("JD evidence configuration must cover the five canonical Role Profiles")
        for role in self.config["role_profiles"]:
            groups = role.get("positive_groups", [])
            group_ids = {group.get("group_id") for group in groups}
            if not groups or None in group_ids or len(group_ids) != len(groups):
                raise ValueError(f"invalid positive evidence groups for {role['role_profile_id']}")
            if not set(role.get("anchor_groups", [])) <= group_ids:
                raise ValueError(f"unknown anchor group for {role['role_profile_id']}")
            if not set(role.get("primary_anchor_groups", [])) <= group_ids:
                raise ValueError(f"unknown primary anchor group for {role['role_profile_id']}")
            for group in [*groups, *role.get("counter_groups", [])]:
                if not isinstance(group.get("weight"), (int, float)) or group["weight"] <= 0:
                    raise ValueError("JD evidence group weights must be positive")
                if not group.get("phrases"):
                    raise ValueError("JD evidence groups must contain phrases")

    @property
    def version(self) -> str:
        return str(self.config["version"])

    @staticmethod
    def _matched_group(group: dict[str, Any], normalized_text: str, language: str) -> dict[str, Any] | None:
        hits = [phrase for phrase in group["phrases"] if phrase_is_present(normalized_text, phrase)]
        if not hits:
            return None
        return {
            "group_id": group["group_id"],
            "label": group["label_en"] if language == "en" else group["label_zh"],
            "weight": group["weight"],
            "hits": hits,
        }

    def analyze(self, text: str, language: str = "en") -> dict[str, Any]:
        if not isinstance(text, str) or len(text.strip()) < 20:
            raise ValidationError("job description must contain at least 20 characters")
        language = "en" if str(language).casefold().startswith("en") else "zh"
        normalized = normalize_jd_text(text)
        role_schema = {row["role_profile_id"]: row for row in self.role_profiles}
        thresholds = self.config["thresholds"]
        rows: list[dict[str, Any]] = []

        for configured_role in self.config["role_profiles"]:
            role_id = configured_role["role_profile_id"]
            positive = [
                match
                for group in configured_role["positive_groups"]
                if (match := self._matched_group(group, normalized, language)) is not None
            ]
            counter = [
                match
                for group in configured_role.get("counter_groups", [])
                if (match := self._matched_group(group, normalized, language)) is not None
            ]
            total_weight = sum(group["weight"] for group in configured_role["positive_groups"])
            positive_weight = sum(group["weight"] for group in positive)
            counter_weight = sum(group["weight"] for group in counter)
            raw_score = max(0.0, (positive_weight - counter_weight) / total_weight)
            matched_group_ids = {group["group_id"] for group in positive}
            anchors = set(configured_role.get("anchor_groups", []))
            anchor_satisfied = not anchors or bool(anchors & matched_group_ids)
            score = raw_score if anchor_satisfied else min(raw_score, thresholds["anchor_cap"])
            score = round(score, 6)
            primary_anchors = set(configured_role.get("primary_anchor_groups", []))
            primary_anchor_satisfied = not primary_anchors or bool(primary_anchors & matched_group_ids)

            if score >= thresholds["primary"] and primary_anchor_satisfied:
                level = "primary"
            elif score >= thresholds["supporting"]:
                level = "supporting"
            else:
                level = "insufficient"

            role = role_schema[role_id]
            flat_hits = list(dict.fromkeys(hit for group in positive for hit in group["hits"]))
            rows.append({
                "role_profile_id": role_id,
                "role_profile_name_zh": role["display_name_zh"],
                "role_profile_name_en": role["display_name_en"],
                "role_profile_name": role["display_name_en"] if language == "en" else role["display_name_zh"],
                "evidence_level": level,
                "evidence_score": score,
                "anchor_satisfied": anchor_satisfied,
                "primary_anchor_satisfied": primary_anchor_satisfied,
                "positive_evidence": positive,
                "counter_evidence": counter,
                # Retained for API compatibility with the original prototype response.
                "keyword_hits": flat_hits,
                "keyword_score": score,
            })

        level_order = {"primary": 0, "supporting": 1, "insufficient": 2}
        rows.sort(key=lambda row: (level_order[row["evidence_level"]], -row["evidence_score"], row["role_profile_id"]))
        primary_ids = [row["role_profile_id"] for row in rows if row["evidence_level"] == "primary"]
        supporting_ids = [row["role_profile_id"] for row in rows if row["evidence_level"] == "supporting"]
        return {
            "method": (
                "Experimental deterministic multi-label JD evidence analysis"
                if language == "en"
                else "实验性确定性 JD 多标签证据分析"
            ),
            "configuration": self.version,
            "classification_mode": "multi_label_with_abstention",
            "evaluation_status": "not_formally_evaluated",
            "has_sufficient_evidence": bool(primary_ids or supporting_ids),
            "primary_role_profile_ids": primary_ids,
            "supporting_role_profile_ids": supporting_ids,
            "results": rows,
        }
