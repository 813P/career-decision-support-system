from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable, Mapping


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold()
    value = re.sub(r"[^\w+#.]+", " ", value, flags=re.UNICODE)
    return " ".join(value.split())


class SkillNormalizer:
    """Maps preferred labels and aliases to stable skill IDs."""

    def __init__(self, labels: Mapping[str, str] | None = None, aliases: Mapping[str, str] | None = None):
        self.labels = dict(labels or {})
        self.lookup: dict[str, str] = {}
        for skill_id, label in self.labels.items():
            self.lookup[normalize_text(label)] = skill_id
        for alias, skill_id in (aliases or {}).items():
            self.lookup[normalize_text(alias)] = skill_id

    def resolve(self, skills: Iterable[str]) -> tuple[set[str], list[str]]:
        resolved: set[str] = set()
        unknown: list[str] = []
        for raw in skills:
            normalized = normalize_text(raw)
            skill_id = self.lookup.get(normalized)
            if skill_id:
                resolved.add(skill_id)
            elif normalized:
                unknown.append(raw.strip())
        return resolved, unknown

    def label(self, skill_id: str) -> str:
        return self.labels.get(skill_id, skill_id)

