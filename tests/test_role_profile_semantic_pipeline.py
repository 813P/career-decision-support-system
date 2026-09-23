from experiments.development_selection.run_semantic_dry_run import (
    candidate_background,
    public_score,
    select_contributors,
)


def test_semantic_background_ignores_prohibited_and_governance_fields():
    base = {
        "current_job_title": "Analyst",
        "skills": ["SQL", "metric design"],
        "experience_narrative": "Built a reusable metric layer.",
    }
    changed = {
        **base,
        "years_experience": 99,
        "intended_role_profile": "data_science",
        "scenario_category": "Direct Match",
        "evidence_strength": "strong",
        "split": "test",
        "audit_results": "approved",
    }
    assert candidate_background(base) == candidate_background(changed)


def test_semantic_public_score_transform_is_bounded_and_monotonic():
    assert public_score(-1.0) == 0.0
    assert public_score(0.0) == 0.5
    assert public_score(1.0) == 1.0
    assert public_score(-0.25) < public_score(0.25)


def test_semantic_aggregation_selects_declared_contributors():
    rows = [
        {"membership_id": "b", "score": 0.8},
        {"membership_id": "a", "score": 0.8},
        {"membership_id": "c", "score": 0.2},
    ]
    assert [row["membership_id"] for row in select_contributors(rows, "max")] == ["a"]
    assert [row["membership_id"] for row in select_contributors(rows, "mean_top_2")] == ["a", "b"]
    assert len(select_contributors(rows, "mean_all")) == 3
