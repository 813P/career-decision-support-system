from __future__ import annotations

import argparse
import json
import mimetypes
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from .jd_profiles import JdProfileAnalyzer
from .role_profiles import RoleProfileMatcher, validate_rank_model
from .presentation_i18n import (
    normalize_language,
    occupation_name,
    role_for_presentation,
    role_text,
    skill_name,
)
from .schemas import CandidateProfile, ValidationError


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_WEB_DIR = ROOT / "webapp"
DEFAULT_ROLE_PROFILES = ROOT / "taxonomy" / "role_profiles.json"
DEFAULT_MEMBERSHIPS = ROOT / "taxonomy" / "role_occupation_memberships.json"
DEFAULT_ALIASES = ROOT / "config" / "shared" / "matching_aliases.json"
DEFAULT_MATCHING_CONFIG = ROOT / "config" / "selected" / "matching_v2.json"
DEFAULT_JD_EVIDENCE_CONFIG = ROOT / "config" / "shared" / "jd_evidence_phrases.json"


@dataclass
class AppRuntime:
    role_profiles: list[dict[str, Any]]
    matching_config: dict[str, Any]
    matcher: RoleProfileMatcher
    jd_analyzer: JdProfileAnalyzer


def load_runtime(
    role_profiles_path: str | Path = DEFAULT_ROLE_PROFILES,
    memberships_path: str | Path = DEFAULT_MEMBERSHIPS,
    aliases_path: str | Path = DEFAULT_ALIASES,
    matching_config_path: str | Path = DEFAULT_MATCHING_CONFIG,
    jd_evidence_config_path: str | Path = DEFAULT_JD_EVIDENCE_CONFIG,
) -> AppRuntime:
    schema = json.loads(Path(role_profiles_path).read_text(encoding="utf-8"))
    role_profiles = schema["role_profiles"]
    memberships = json.loads(Path(memberships_path).read_text(encoding="utf-8"))
    aliases = json.loads(Path(aliases_path).read_text(encoding="utf-8"))
    matching_config = json.loads(Path(matching_config_path).read_text(encoding="utf-8"))
    jd_evidence_config = json.loads(Path(jd_evidence_config_path).read_text(encoding="utf-8"))
    if matching_config.get("status") != "frozen":
        raise ValueError("selected matching configuration must have frozen status")
    weights = matching_config.get("component_weights")
    if not isinstance(weights, dict):
        raise ValueError("selected matching configuration must define component_weights")
    method = matching_config.get("runtime_method", matching_config.get("method"))
    aggregation = matching_config.get("aggregation")
    version = matching_config.get("version")
    if not all(isinstance(value, str) and value for value in (method, aggregation, version)):
        raise ValueError("selected matching configuration must define version, method, and aggregation")
    return AppRuntime(
        role_profiles=role_profiles,
        matching_config=matching_config,
        matcher=RoleProfileMatcher(
            memberships=memberships,
            role_profiles=role_profiles,
            aliases=aliases,
            method=method,
            aggregation=aggregation,
            background_weight=weights.get("background"),
            direction_weight=weights.get("direction"),
        ),
        jd_analyzer=JdProfileAnalyzer(config=jd_evidence_config, role_profiles=role_profiles),
    )


def rank_candidate(runtime: AppRuntime, payload: dict[str, Any]) -> dict[str, Any]:
    candidate_data = dict(payload.get("candidate", payload))
    candidate_data.setdefault("candidate_id", "web-demo")
    candidate = CandidateProfile.from_dict(candidate_data)
    configured_model = runtime.matcher.method
    model = payload.get("model", configured_model)
    validate_rank_model(model, configured_model)
    results = runtime.matcher.rank(candidate)
    language = normalize_language(payload.get("language"))
    for result in results:
        result["role_profile_name"] = (
            result["role_profile_name_en"] if language == "en" else result["role_profile_name_zh"]
        )
        result["definition_localized"] = role_text(
            next(role for role in runtime.role_profiles if role["role_profile_id"] == result["role_profile_id"]),
            "definition",
            language,
        )
        result["strongest_occupation"]["title_localized"] = occupation_name(
            result["strongest_occupation"]["title"], language
        )
        result["matched_skills_localized"] = [skill_name(label, language) for label in result["matched_skills"]]
        for item in result["missing_core_evidence"]:
            item["skill_label_localized"] = skill_name(item["skill_label"], language)
            item["evidence_absence_message_localized"] = (
                item["evidence_absence_message"]
                if language == "en"
                else f"提交的资料中没有显示“{item['skill_label_localized']}”的明确证据。"
            )
    return {
        "candidate_id": candidate.candidate_id,
        "model": model,
        "configuration": runtime.matching_config["version"],
        "aggregation": runtime.matcher.aggregation,
        "component_weights": {
            "background": runtime.matcher.background_weight,
            "direction": runtime.matcher.direction_weight,
        },
        "scores_are_probabilities": False,
        "role_profiles": results,
    }


def parse_jd(runtime: AppRuntime, text: str, language: str = "en") -> dict[str, Any]:
    return runtime.jd_analyzer.analyze(text, normalize_language(language))


def compare_role_profiles(runtime: AppRuntime, role_profile_ids: list[str], language: str = "en") -> dict[str, Any]:
    if not isinstance(role_profile_ids, list) or not 2 <= len(role_profile_ids) <= 3:
        raise ValidationError("compare requires two or three role_profile_ids")
    by_id = {row["role_profile_id"]: row for row in runtime.role_profiles}
    unknown = sorted(set(role_profile_ids) - set(by_id))
    if unknown:
        raise ValidationError(f"unknown role_profile_ids: {unknown}")
    language = normalize_language(language)
    return {
        "role_profiles": [
            {
                "role_profile_id": by_id[role_profile_id]["role_profile_id"],
                "name_zh": by_id[role_profile_id]["display_name_zh"],
                "name_en": by_id[role_profile_id]["display_name_en"],
                "name": by_id[role_profile_id]["display_name_en"] if language == "en" else by_id[role_profile_id]["display_name_zh"],
                "definition": role_text(by_id[role_profile_id], "definition", language),
                "typical_tasks": role_text(by_id[role_profile_id], "core_task_areas", language),
            }
            for role_profile_id in role_profile_ids
        ]
    }


def readiness_plan(
    runtime: AppRuntime,
    role_profile_id: str,
    missing_skills: list[str],
    language: str = "zh",
) -> dict[str, Any]:
    role_profile = next(
        (row for row in runtime.role_profiles if row["role_profile_id"] == role_profile_id),
        None,
    )
    if role_profile is None:
        raise ValidationError(f"unknown role_profile_id: {role_profile_id}")
    language = normalize_language(language)
    clean_missing = [str(item).strip() for item in missing_skills if str(item).strip()][:6]
    if language == "en":
        stages = [
            {
                "stage": "1. Test your interest",
                "goal": "Use low-cost tasks to see whether you want to keep doing this kind of work",
                "actions": [f"Complete a small exercise: {task}" for task in role_profile["core_task_areas"][:2]],
            },
            {
                "stage": "2. Build practical ability",
                "goal": "Create a working artifact around the most important evidence gaps",
                "actions": [f"Complete a reproducible exercise using {skill}" for skill in (clean_missing[:3] or ["a core method", "an analytical tool"])],
            },
            {
                "stage": "3. Package the evidence",
                "goal": "Turn the process, judgement, outcome, and limitations into application evidence",
                "actions": [
                    "Write a one-page project brief covering the problem, data, method, outcome, and limitations",
                    "Prepare a three-minute walkthrough and a retrospective on one failed attempt",
                ],
            },
        ]
    else:
        localized_tasks = role_text(role_profile, "core_task_areas", language)
        localized_missing = [skill_name(skill, language) for skill in clean_missing]
        stages = [
            {
                "stage": "1. 验证兴趣",
                "goal": "用低成本任务确认是否愿意持续从事这类工作",
                "actions": [f"完成一次“{task}”微型练习" for task in localized_tasks[:2]],
            },
            {
                "stage": "2. 补齐实践",
                "goal": "围绕最重要的技能差距形成可运行作品",
                "actions": [f"针对 {skill} 完成一个可复现练习" for skill in (localized_missing[:3] or ["核心方法", "分析工具"])],
            },
            {
                "stage": "3. 形成证据",
                "goal": "把过程、判断、结果和限制整理为申请证据",
                "actions": [
                    "写一页项目说明：问题、数据、方法、结果与限制",
                    "准备三分钟演示和一个失败案例复盘",
                ],
            },
        ]
    return {
        "role_profile_id": role_profile_id,
        "plan_is_rank_evidence": False,
        "stages": stages,
    }


class MairRequestHandler(BaseHTTPRequestHandler):
    runtime: AppRuntime
    web_dir: Path

    GET_ROUTES = {
        "/api/health": "handle_health",
        "/api/taxonomy": "handle_taxonomy",
    }
    POST_ROUTES = {
        "/api/rank": "handle_rank",
        "/api/parse-jd": "handle_parse_jd",
        "/api/compare": "handle_compare",
        "/api/readiness-plan": "handle_readiness_plan",
    }

    def log_message(self, format: str, *args: Any) -> None:
        return

    def send_json(self, payload: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def read_json(self) -> dict[str, Any]:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise ValidationError("invalid Content-Length") from exc
        if length < 1 or length > 1_000_000:
            raise ValidationError("request body must be between 1 byte and 1 MB")
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValidationError("request body must be UTF-8 JSON") from exc
        if not isinstance(payload, dict):
            raise ValidationError("request body must be a JSON object")
        return payload

    def do_GET(self) -> None:
        route = urlparse(self.path).path
        handler_name = self.GET_ROUTES.get(route)
        if handler_name is not None:
            handler = getattr(self, handler_name)
            self.send_json(handler())
            return
        self.serve_static(route)

    def do_POST(self) -> None:
        try:
            payload = self.read_json()
            route = urlparse(self.path).path
            handler_name = self.POST_ROUTES.get(route)
            if handler_name is None:
                self.send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)
                return
            handler = getattr(self, handler_name)
            result = handler(payload)
            self.send_json(result)
        except ValidationError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
        except Exception:
            self.send_json({"error": "internal server error"}, HTTPStatus.INTERNAL_SERVER_ERROR)

    def handle_health(self) -> dict[str, Any]:
        return {
            "status": "ok",
            "role_profiles": len(self.runtime.role_profiles),
            "configuration": self.runtime.matching_config["version"],
            "jd_configuration": self.runtime.jd_analyzer.version,
            "jd_evaluation_status": "not_formally_evaluated",
        }

    def handle_taxonomy(self) -> dict[str, Any]:
        return {"role_profiles": [role_for_presentation(role) for role in self.runtime.role_profiles]}

    def handle_rank(self, payload: dict[str, Any]) -> dict[str, Any]:
        return rank_candidate(self.runtime, payload)

    def handle_parse_jd(self, payload: dict[str, Any]) -> dict[str, Any]:
        return parse_jd(self.runtime, payload.get("job_description", ""), payload.get("language", "en"))

    def handle_compare(self, payload: dict[str, Any]) -> dict[str, Any]:
        return compare_role_profiles(
            self.runtime,
            payload.get("role_profile_ids", []),
            payload.get("language", "en"),
        )

    def handle_readiness_plan(self, payload: dict[str, Any]) -> dict[str, Any]:
        return readiness_plan(
            self.runtime,
            payload.get("role_profile_id", ""),
            payload.get("missing_skills", []),
            payload.get("language", "zh"),
        )

    def serve_static(self, route: str) -> None:
        relative = "index.html" if route in {"", "/"} else unquote(route.lstrip("/"))
        target = (self.web_dir / relative).resolve()
        web_root = self.web_dir.resolve()
        if target != web_root and web_root not in target.parents:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if not target.is_file():
            target = self.web_dir / "index.html"
        payload = target.read_bytes()
        content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8" if content_type.startswith("text/") else content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def serve(host: str = "127.0.0.1", port: int = 8765, web_dir: str | Path = DEFAULT_WEB_DIR) -> None:
    runtime = load_runtime()
    handler = type(
        "ConfiguredMairRequestHandler",
        (MairRequestHandler,),
        {"runtime": runtime, "web_dir": Path(web_dir)},
    )
    server = ThreadingHTTPServer((host, port), handler)
    print(f"MAIR web app available at http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the MAIR interactive career exploration app")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args(argv)
    serve(args.host, args.port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
