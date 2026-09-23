from __future__ import annotations

from functools import lru_cache
from typing import Any

try:
    from mcp.server.fastmcp import FastMCP
except ImportError as exc:  # pragma: no cover - exercised only without the optional extra
    raise RuntimeError(
        'MCP support is optional. Install it with: pip install -e ".[mcp]"'
    ) from exc

from .webapp import (
    AppRuntime,
    compare_role_profiles,
    load_runtime,
    parse_jd,
    rank_candidate,
    readiness_plan,
)


mcp = FastMCP(
    name="MAIR Career Exploration",
    instructions=(
        "Use these tools for low-risk career exploration. Scores are relative evidence, "
        "not hiring probabilities, and must not be used to screen or reject applicants."
    ),
)


@lru_cache(maxsize=1)
def runtime() -> AppRuntime:
    return load_runtime()


@mcp.tool()
def get_job_taxonomy() -> dict[str, Any]:
    """Return MAIR's five canonical Analytical Role Profiles."""
    value = runtime()
    return {
        "role_profiles": value.role_profiles,
        "role_profile_count": 5,
    }


@mcp.tool()
def rank_candidate_profile(
    current_job_title: str,
    desired_work_directions: list[str],
    skills: list[str],
    experience_narrative: str,
    years_experience: float,
) -> dict[str, Any]:
    """Rank five Analytical Role Profiles with the selected frozen configuration.

    The result is for exploration only. Interest and protected personal attributes
    are intentionally excluded from the model input.
    """
    return rank_candidate(
        runtime(),
        {
            "candidate": {
                "candidate_id": "mcp-user",
                "current_job_title": current_job_title,
                "desired_work_directions": desired_work_directions,
                "skills": skills,
                "experience_narrative": experience_narrative,
                "years_experience": years_experience,
            },
        },
    )


@mcp.tool()
def analyze_job_description(job_description: str) -> dict[str, Any]:
    """Extract experimental multi-label Role Profile evidence from a JD, with abstention."""
    return parse_jd(runtime(), job_description)


@mcp.tool()
def compare_role_profile_options(role_profile_ids: list[str]) -> dict[str, Any]:
    """Compare two or three Role Profiles by definition and typical tasks."""
    return compare_role_profiles(runtime(), role_profile_ids)


@mcp.tool()
def build_readiness_plan(
    role_profile_id: str,
    missing_skills: list[str],
) -> dict[str, Any]:
    """Build a three-stage exploration and portfolio preparation plan."""
    return readiness_plan(runtime(), role_profile_id, missing_skills)


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
