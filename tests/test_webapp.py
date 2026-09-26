from __future__ import annotations

import sys
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from career_matcher.schemas import ValidationError
from career_matcher.webapp import (
    compare_role_profiles,
    load_runtime,
    parse_jd,
    rank_candidate,
    readiness_plan,
)


class WebAppTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.runtime = load_runtime()

    def test_runtime_uses_five_role_profiles_and_eighteen_memberships(self):
        self.assertEqual(len(self.runtime.role_profiles), 5)
        self.assertEqual(len(self.runtime.matcher.memberships), 18)
        self.assertEqual(self.runtime.matching_config["study_id"], "tfidf_full_test_evaluation")
        self.assertEqual(self.runtime.matching_config["study_name"], "Selected TF-IDF full-test evaluation")
        self.assertEqual(self.runtime.matcher.method, self.runtime.matching_config["method"])
        self.assertEqual(self.runtime.matcher.aggregation, self.runtime.matching_config["aggregation"])

    def test_candidate_path_returns_all_role_profiles_with_evidence(self):
        result = rank_candidate(
            self.runtime,
            {
                "model": "tfidf",
                "candidate": {
                    "candidate_id": "test-profile",
                    "current_job_title": "Reporting Analyst",
                    "desired_work_directions": ["Data Analytics"],
                    "skills": ["SQL", "Excel", "data visualisation"],
                    "experience_narrative": "Builds KPI dashboards, validates data and explains performance changes.",
                    "years_experience": 2,
                },
            },
        )
        self.assertEqual(result["aggregation"], "mean_all")
        self.assertEqual(len(result["role_profiles"]), 5)
        self.assertFalse(result["scores_are_probabilities"])
        self.assertEqual(result["component_weights"], {"background": 0.5, "direction": 0.5})
        for index, row in enumerate(result["role_profiles"], start=1):
            self.assertGreaterEqual(row["score"], 0)
            self.assertLessEqual(row["score"], 1)
            self.assertIn("strongest_occupation", row)
            self.assertEqual(len(row["contributing_membership_ids"]), len(row["memberships"]))
            self.assertLessEqual(len(row["missing_core_evidence"]), 3)
            if index > 3:
                self.assertEqual(row["missing_core_evidence"], [])

    def test_runtime_reads_component_weights_from_selected_config(self):
        config = dict(self.runtime.matching_config)
        config["component_weights"] = {"background": 1.0, "direction": 0.0}
        with tempfile.TemporaryDirectory() as directory:
            config_path = Path(directory) / "tfidf.json"
            config_path.write_text(json.dumps(config), encoding="utf-8")
            runtime = load_runtime(matching_config_path=config_path)

        result = rank_candidate(
            runtime,
            {
                "candidate": {
                    "candidate_id": "config-test",
                    "current_job_title": "Reporting Analyst",
                    "desired_work_directions": ["Data Analytics"],
                    "skills": ["SQL", "Excel"],
                    "experience_narrative": "Builds KPI dashboards and validates data.",
                    "years_experience": 2,
                },
            },
        )
        self.assertEqual(result["component_weights"], {"background": 1.0, "direction": 0.0})
        for role in result["role_profiles"]:
            for membership in role["memberships"]:
                self.assertEqual(membership["score"], membership["background_score"])

    def test_jd_compare_and_readiness_paths(self):
        jd = parse_jd(
            self.runtime,
            "Own KPI system design, budgeting, forecasting, performance variance analysis and management reporting.",
        )
        self.assertEqual(len(jd["results"]), 5)
        self.assertEqual(jd["classification_mode"], "multi_label_with_abstention")
        self.assertIn("business_performance_goal_management", jd["primary_role_profile_ids"])
        comparison = compare_role_profiles(
            self.runtime,
            ["business_performance_goal_management", "data_analytics"],
        )
        self.assertEqual(len(comparison["role_profiles"]), 2)
        plan = readiness_plan(
            self.runtime,
            "data_analytics",
            ["statistics", "data visualisation"],
        )
        self.assertEqual(len(plan["stages"]), 3)
        self.assertFalse(plan["plan_is_rank_evidence"])

    def test_presentation_endpoints_support_chinese_and_english(self):
        candidate_request = {
            "model": "tfidf",
            "candidate": {
                "candidate_id": "language-invariance",
                "current_job_title": "Reporting Analyst",
                "desired_work_directions": ["Data Analytics"],
                "skills": ["SQL", "Excel"],
                "experience_narrative": "Builds dashboards, validates data, and explains changes.",
                "years_experience": 2,
            },
        }
        english_rank = rank_candidate(self.runtime, {**candidate_request, "language": "en"})
        chinese_rank = rank_candidate(self.runtime, {**candidate_request, "language": "zh"})
        self.assertEqual(
            [row["score"] for row in english_rank["role_profiles"]],
            [row["score"] for row in chinese_rank["role_profiles"]],
        )
        self.assertNotEqual(
            english_rank["role_profiles"][0]["strongest_occupation"]["title_localized"],
            chinese_rank["role_profiles"][0]["strongest_occupation"]["title_localized"],
        )

        chinese_jd = parse_jd(
            self.runtime,
            "负责目标管理、预算、滚动预测、经营复盘和绩效偏差分析，推动业务改善行动。",
            "zh",
        )
        self.assertEqual(chinese_jd["results"][0]["role_profile_name"], "经营绩效与目标管理")
        self.assertTrue(chinese_jd["results"][0]["keyword_hits"])

        comparison = compare_role_profiles(
            self.runtime,
            ["business_performance_goal_management", "data_analytics"],
            "zh",
        )
        self.assertEqual(comparison["role_profiles"][0]["name"], "经营绩效与目标管理")
        self.assertIn("业务目标", comparison["role_profiles"][0]["definition"])

        english_plan = readiness_plan(self.runtime, "data_analytics", ["statistics"], "en")
        chinese_plan = readiness_plan(self.runtime, "data_analytics", ["statistics"], "zh")
        self.assertEqual(english_plan["stages"][0]["stage"], "1. Test your interest")
        self.assertEqual(chinese_plan["stages"][1]["actions"][0], "针对 统计学 完成一个可复现练习")

    def test_invalid_requests_are_rejected(self):
        with self.assertRaises(ValidationError):
            parse_jd(self.runtime, "too short")
        with self.assertRaises(ValidationError):
            compare_role_profiles(self.runtime, ["data_analytics"])
        with self.assertRaises(ValidationError):
            readiness_plan(self.runtime, "unknown", [])


if __name__ == "__main__":
    unittest.main()
