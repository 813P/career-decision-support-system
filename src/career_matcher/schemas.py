from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Mapping


class ValidationError(ValueError):
    """Raised when an input violates the public data contract."""


def _text(value: Any, field_name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"{field_name} must be a non-empty string")
    return value.strip()


def _text_list(value: Any, field_name: str, allow_empty: bool = True) -> tuple[str, ...]:
    if value is None and allow_empty:
        return ()
    if not isinstance(value, (list, tuple)):
        raise ValidationError(f"{field_name} must be a list of strings")
    items = tuple(str(item).strip() for item in value if str(item).strip())
    if not allow_empty and not items:
        raise ValidationError(f"{field_name} must not be empty")
    return items


@dataclass(frozen=True)
#快速建立“主要用于保存数据”的类
class CandidateProfile:
#定义一种新的对象类型，这个数据结构叫做candidateprofile。所有候选人资料都要遵守这个模板。
    candidate_id: str
    current_job_title: str
    desired_work_directions: tuple[str, ...]
    #···代表字符串数量不固定
    skills: tuple[str, ...]
    experience_narrative: str
    years_experience: float

    def __post_init__(self) -> None:
        object.__setattr__(self, "candidate_id", _text(self.candidate_id, "candidate_id"))
        object.__setattr__(self, "current_job_title", _text(self.current_job_title, "current_job_title"))
        object.__setattr__(self, "desired_work_directions", _text_list(self.desired_work_directions, "desired_work_directions"))
        object.__setattr__(self, "skills", _text_list(self.skills, "skills"))
        if not isinstance(self.experience_narrative, str):
            raise ValidationError("experience_narrative must be a string")
        object.__setattr__(self, "experience_narrative", self.experience_narrative.strip())
        try:
            years = float(self.years_experience)
        except (TypeError, ValueError) as exc:
            raise ValidationError("years_experience must be numeric") from exc
        if years < 0:
            raise ValidationError("years_experience must be non-negative")
        object.__setattr__(self, "years_experience", years)

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "CandidateProfile":
        value = dict(data)
        if "experience_narrative" not in value and "profile_text" in value:
            value["experience_narrative"] = value["profile_text"]
        if "experience_narrative" in value and "profile_text" in value and value["experience_narrative"] != value["profile_text"]:
            raise ValidationError("experience_narrative and legacy profile_text must not conflict")
        required = {"candidate_id", "current_job_title", "desired_work_directions", "skills", "experience_narrative", "years_experience"}
        missing = sorted(required - set(value))
        if missing:
            raise ValidationError(f"missing candidate fields: {missing}")
        # Extra fields are intentionally ignored: protected metadata cannot enter ranking.
        return cls(**{name: value[name] for name in required})

    def to_dict(self) -> dict[str, Any]:
        value = asdict(self)
        value["desired_work_directions"] = list(self.desired_work_directions)
        value["skills"] = list(self.skills)
        return value


@dataclass(frozen=True)
class JobProfile:
    job_id: str
    title: str
    alternative_titles: tuple[str, ...] = ()
    description: str = ""
    essential_skill_ids: tuple[str, ...] = ()
    optional_skill_ids: tuple[str, ...] = ()
    essential_skills: tuple[str, ...] = ()
    optional_skills: tuple[str, ...] = ()
    data_version: str = "demo-1.0"

    def __post_init__(self) -> None:
        object.__setattr__(self, "job_id", _text(self.job_id, "job_id"))
        object.__setattr__(self, "title", _text(self.title, "title"))
        for name in ("alternative_titles", "essential_skill_ids", "optional_skill_ids", "essential_skills", "optional_skills"):
            object.__setattr__(self, name, _text_list(getattr(self, name), name))
        if not isinstance(self.description, str):
            raise ValidationError("description must be a string")

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "JobProfile":
        if "job_id" not in data or "title" not in data:
            raise ValidationError("job requires job_id and title")
        return cls(**{name: data[name] for name in cls.__dataclass_fields__ if name in data})

    def to_dict(self) -> dict[str, Any]:
        value = asdict(self)
        for name in ("alternative_titles", "essential_skill_ids", "optional_skill_ids", "essential_skills", "optional_skills"):
            value[name] = list(value[name])
        return value


@dataclass(frozen=True)
class MatchResult:
    job_id: str
    title: str
    rank: int
    overall_score: float
    structured_score: float
    semantic_score: float
    matched_essential_skills: tuple[str, ...] = field(default_factory=tuple)
    missing_essential_skills: tuple[str, ...] = field(default_factory=tuple)
    reason_codes: tuple[str, ...] = field(default_factory=tuple)
    model_version: str = ""
    data_version: str = ""
    parameters: Mapping[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        value = asdict(self)
        for name in ("matched_essential_skills", "missing_essential_skills", "reason_codes"):
            value[name] = list(value[name])
        return value
