from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from career_matcher.jd_profiles import phrase_is_present
from career_matcher.webapp import load_runtime, parse_jd


CAINIAO_BUSINESS_ANALYST_JD = """
Business Analyst | Cainiao

Conduct business and performance analysis for logistics-related operations, with a
focus on key metrics such as revenue, cost, fulfilment efficiency, and customer mix.
Perform ad hoc and thematic analyses to identify growth opportunities, operational
issues, and potential risks, providing data-driven support for business strategy and
resource allocation. Apply structured problem-solving skills to break down complex
business questions. Analyse multi-dimensional data across orders, merchants,
customers, warehousing, and delivery operations. Support target setting, business
performance reviews, KPI frameworks, dashboards, and recurring reporting. Translate
analytical findings into actionable recommendations and track the impact of implemented
initiatives. Qualifications may include Management Science or Computer Science.
Experience with SQL, extracting and cleaning data, forecasting, Tableau, or Power BI.
"""


class JdProfileAnalyzerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.runtime = load_runtime()

    def test_phrase_matching_preserves_word_order_and_adjacency(self):
        self.assertFalse(phrase_is_present("analyse data management science", "data science"))
        self.assertTrue(phrase_is_present("this role applies data science methods", "data science"))

    def test_cainiao_business_analyst_is_not_misclassified_as_data_science(self):
        result = parse_jd(self.runtime, CAINIAO_BUSINESS_ANALYST_JD, "en")
        by_id = {row["role_profile_id"]: row for row in result["results"]}

        self.assertEqual(result["classification_mode"], "multi_label_with_abstention")
        self.assertEqual(result["evaluation_status"], "not_formally_evaluated")
        self.assertEqual(
            set(result["primary_role_profile_ids"]),
            {"business_performance_goal_management", "business_strategy_focused_analysis"},
        )
        self.assertEqual(by_id["data_analytics"]["evidence_level"], "supporting")
        self.assertEqual(by_id["data_science"]["evidence_level"], "insufficient")
        self.assertEqual(by_id["data_science"]["evidence_score"], 0)

    def test_model_terms_produce_data_science_evidence(self):
        result = parse_jd(
            self.runtime,
            "Build predictive models using machine learning and feature engineering. "
            "Design A/B tests, perform causal inference, and own model evaluation and monitoring.",
            "en",
        )
        by_id = {row["role_profile_id"]: row for row in result["results"]}
        self.assertEqual(by_id["data_science"]["evidence_level"], "primary")
        self.assertTrue(by_id["data_science"]["anchor_satisfied"])

    def test_sparse_generic_jd_can_abstain(self):
        result = parse_jd(
            self.runtime,
            "Work with colleagues, communicate clearly, prepare materials, and support the team as needed.",
            "en",
        )
        self.assertFalse(result["has_sufficient_evidence"])
        self.assertTrue(all(row["evidence_level"] == "insufficient" for row in result["results"]))

    def test_chinese_business_performance_evidence_is_supported(self):
        result = parse_jd(
            self.runtime,
            "负责经营分析、目标管理与 KPI 体系建设，开展预算和滚动预测，组织月度经营复盘并跟进改善行动。",
            "zh",
        )
        by_id = {row["role_profile_id"]: row for row in result["results"]}
        self.assertEqual(by_id["business_performance_goal_management"]["evidence_level"], "primary")
        self.assertEqual(by_id["business_performance_goal_management"]["role_profile_name"], "经营绩效与目标管理")


if __name__ == "__main__":
    unittest.main()
