from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import replace
from typing import Protocol, Sequence

import numpy as np

from .normalization import SkillNormalizer, normalize_text
from .schemas import CandidateProfile, JobProfile, MatchResult, ValidationError


MODEL_VERSIONS = {
    "rules": "rules-1.0",
    "tfidf": "tfidf-1.0",
    "semantic": "sentence-transformers/all-MiniLM-L6-v2",
    "hybrid": "hybrid-1.0+sentence-transformers/all-MiniLM-L6-v2",
}


def _tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9+#.]{2,}", normalize_text(text))


def _candidate_text(candidate: CandidateProfile) -> str:
    return " ".join((candidate.current_job_title, *candidate.desired_work_directions, *candidate.skills, candidate.experience_narrative))


def _job_text(job: JobProfile) -> str:
    essential = " ".join(job.essential_skills)
    optional = " ".join(job.optional_skills)
    return " ".join((job.title, *job.alternative_titles, job.description, essential, essential, optional))


def _clip(value: float) -> float:
    return float(max(0.0, min(1.0, value)))


class TextEncoder(Protocol):
    version: str

    def encode(self, texts: Sequence[str]) -> np.ndarray: ...


class SentenceTransformerEncoder:
    version = "sentence-transformers/all-MiniLM-L6-v2"

    def __init__(self, model_name: str = version, cache_folder: str | None = None):
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:
            raise RuntimeError("Install the semantic extra: pip install -e .[semantic]") from exc
        self.version = model_name
        self.model = SentenceTransformer(model_name, cache_folder=cache_folder)

    def encode(self, texts: Sequence[str]) -> np.ndarray:
        return np.asarray(self.model.encode(list(texts), normalize_embeddings=True, show_progress_bar=False))


def _cosine_rows(matrix: np.ndarray, vector: np.ndarray) -> np.ndarray:
    matrix_norm = np.linalg.norm(matrix, axis=1)
    vector_norm = np.linalg.norm(vector)
    denom = matrix_norm * vector_norm
    return np.divide(matrix @ vector, denom, out=np.zeros(matrix.shape[0]), where=denom != 0)


class JobMatcher:
    def __init__(
        self,
        jobs: Sequence[JobProfile],
        skill_normalizer: SkillNormalizer | None = None,
        encoder: TextEncoder | None = None,
        hybrid_weight: float = 0.5,
    ):
        if not jobs:
            raise ValidationError("jobs must not be empty")
        ids = [job.job_id for job in jobs]
        if len(ids) != len(set(ids)):
            raise ValidationError("job_id values must be unique")
        if not 0 <= hybrid_weight <= 1:
            raise ValidationError("hybrid_weight must be between 0 and 1")
        self.jobs = tuple(jobs)
        self.skill_normalizer = skill_normalizer or SkillNormalizer()
        self.encoder = encoder
        self.hybrid_weight = float(hybrid_weight)
        self._job_embeddings: np.ndarray | None = None
        self._tfidf_job_vectors, self._idf = self._fit_tfidf([_job_text(job) for job in self.jobs])

    @staticmethod
    def _fit_tfidf(texts: Sequence[str]) -> tuple[list[dict[str, float]], dict[str, float]]:
        documents = [Counter(_tokens(text)) for text in texts]
        doc_frequency = Counter(token for doc in documents for token in doc)
        count = len(documents)
        idf = {token: math.log((1 + count) / (1 + freq)) + 1 for token, freq in doc_frequency.items()}
        return [JobMatcher._tfidf_vector(doc, idf) for doc in documents], idf

    @staticmethod
    def _tfidf_vector(counts: Counter[str], idf: dict[str, float]) -> dict[str, float]:
        if not counts:
            return {}
        total = sum(counts.values())
        vector = {token: (value / total) * idf[token] for token, value in counts.items() if token in idf}
        norm = math.sqrt(sum(value * value for value in vector.values()))
        return {token: value / norm for token, value in vector.items()} if norm else {}

    @staticmethod
    def _sparse_cosine(left: dict[str, float], right: dict[str, float]) -> float:
        if len(left) > len(right):
            left, right = right, left
        return sum(value * right.get(token, 0.0) for token, value in left.items())

    def _structured(self, candidate: CandidateProfile, job: JobProfile) -> tuple[float, tuple[str, ...], tuple[str, ...], tuple[str, ...]]:
        candidate_ids, unknown = self.skill_normalizer.resolve(candidate.skills)
        candidate_labels = {normalize_text(skill) for skill in candidate.skills}

        def match_skills(ids: tuple[str, ...], labels: tuple[str, ...]) -> tuple[float, tuple[str, ...], tuple[str, ...]]:
            requirements: list[tuple[str | None, str]] = []
            for index, label in enumerate(labels):
                requirements.append((ids[index] if index < len(ids) else None, label))
            for skill_id in ids[len(labels):]:
                requirements.append((skill_id, self.skill_normalizer.label(skill_id)))
            matched_labels, missing_labels = [], []
            for skill_id, label in requirements:
                is_match = (skill_id in candidate_ids if skill_id else False) or normalize_text(label) in candidate_labels
                (matched_labels if is_match else missing_labels).append(label)
            score = len(matched_labels) / len(requirements) if requirements else 0.0
            return score, tuple(sorted(set(matched_labels))), tuple(sorted(set(missing_labels)))

        essential_score, matched, missing = match_skills(job.essential_skill_ids, job.essential_skills)
        optional_score, optional_matched, _ = match_skills(job.optional_skill_ids, job.optional_skills)
        desired = " ".join(candidate.desired_work_directions)
        titles = " ".join((job.title, *job.alternative_titles))
        desired_tokens = set(_tokens(desired))
        title_tokens = set(_tokens(titles))
        title_score = len(desired_tokens & title_tokens) / max(len(desired_tokens), 1)
        score = _clip(0.65 * essential_score + 0.15 * optional_score + 0.20 * title_score)
        reasons = []
        if matched:
            reasons.append("ESSENTIAL_SKILL_MATCH")
        if optional_matched:
            reasons.append("OPTIONAL_SKILL_MATCH")
        if title_score > 0:
            reasons.append("DESIRED_ROLE_MATCH")
        if unknown:
            reasons.append("UNMAPPED_SKILLS_RETAINED_IN_TEXT")
        return score, matched, missing, tuple(reasons or ["NO_STRUCTURED_MATCH"])

    def _tfidf_scores(self, candidate: CandidateProfile) -> list[float]:
        vector = self._tfidf_vector(Counter(_tokens(_candidate_text(candidate))), self._idf)
        return [_clip(self._sparse_cosine(vector, job_vector)) for job_vector in self._tfidf_job_vectors]

    def _semantic_scores(self, candidate: CandidateProfile) -> list[float]:
        if self.encoder is None:
            self.encoder = SentenceTransformerEncoder()
        if self._job_embeddings is None:
            self._job_embeddings = self.encoder.encode([_job_text(job) for job in self.jobs])
        candidate_embedding = self.encoder.encode([_candidate_text(candidate)])[0]
        # Cosine spans [-1, 1]; convert to the public 0-1 score contract.
        return [_clip((float(value) + 1.0) / 2.0) for value in _cosine_rows(self._job_embeddings, candidate_embedding)]

    def rank(self, candidate: CandidateProfile, top_k: int = 10, model: str = "hybrid") -> list[MatchResult]:
        if not isinstance(top_k, int) or isinstance(top_k, bool) or top_k < 1 or top_k > len(self.jobs):
            raise ValidationError(f"top_k must be an integer between 1 and {len(self.jobs)}")
        if model not in MODEL_VERSIONS:
            raise ValidationError(f"model must be one of {sorted(MODEL_VERSIONS)}")

        structured_details = [self._structured(candidate, job) for job in self.jobs]
        structured = [item[0] for item in structured_details]
        tfidf = self._tfidf_scores(candidate) if model == "tfidf" else [0.0] * len(self.jobs)
        semantic = self._semantic_scores(candidate) if model in {"semantic", "hybrid"} else [0.0] * len(self.jobs)

        if model == "rules":
            overall = structured
        elif model == "tfidf":
            overall = tfidf
        elif model == "semantic":
            overall = semantic
        else:
            overall = [self.hybrid_weight * a + (1 - self.hybrid_weight) * b for a, b in zip(structured, semantic)]

        order = sorted(range(len(self.jobs)), key=lambda i: (-overall[i], self.jobs[i].job_id))[:top_k]
        results = []
        for rank, index in enumerate(order, 1):
            job = self.jobs[index]
            _, matched, missing, reasons = structured_details[index]
            if model in {"semantic", "hybrid"} and semantic[index] >= 0.65:
                reasons = reasons + ("SEMANTIC_SIMILARITY",)
            model_version = MODEL_VERSIONS[model]
            if model in {"semantic", "hybrid"} and self.encoder is not None:
                model_version = self.encoder.version if model == "semantic" else f"hybrid-1.0+{self.encoder.version}"
            parameters = {"top_k": top_k}
            if model == "hybrid":
                parameters["hybrid_weight"] = self.hybrid_weight
            results.append(MatchResult(
                job_id=job.job_id,
                title=job.title,
                rank=rank,
                overall_score=round(_clip(overall[index]), 6),
                structured_score=round(_clip(structured[index]), 6),
                semantic_score=round(_clip(semantic[index] if model != "tfidf" else tfidf[index]), 6),
                matched_essential_skills=matched,
                missing_essential_skills=missing,
                reason_codes=reasons,
                model_version=model_version,
                data_version=job.data_version,
                parameters=parameters,
            ))
        return results


def rank_jobs(
    candidate: CandidateProfile,
    jobs: Sequence[JobProfile],
    top_k: int = 10,
    model: str = "hybrid",
    *,
    skill_normalizer: SkillNormalizer | None = None,
    encoder: TextEncoder | None = None,
    hybrid_weight: float = 0.5,
) -> list[MatchResult]:
    return JobMatcher(jobs, skill_normalizer, encoder, hybrid_weight).rank(candidate, top_k, model)
