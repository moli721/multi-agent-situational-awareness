from pathlib import Path
import sys
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from mas_platform import api  # noqa: E402
from mas_platform.api import ExperimentRequest  # noqa: E402


class ApiExperimentMetricTests(unittest.TestCase):
    def test_metric_summary_contains_distribution_fields(self) -> None:
        records = [
            {"task_completion_rate": 0.5},
            {"task_completion_rate": 0.7},
            {"task_completion_rate": 0.9},
        ]

        summary = api._summarize_metric(records, "task_completion_rate")

        self.assertEqual(summary["mean"], 0.7)
        self.assertEqual(summary["median"], 0.7)
        self.assertEqual(summary["min"], 0.5)
        self.assertEqual(summary["max"], 0.9)
        self.assertAlmostEqual(summary["std"], 0.2, places=4)
        self.assertLess(summary["ci95_low"], summary["mean"])
        self.assertGreater(summary["ci95_high"], summary["mean"])

    def test_compute_derived_metrics_returns_expected_ratios(self) -> None:
        rows = {
            "current": {
                "with_comm_normal": {
                    "task_completion_rate": 0.8,
                    "messages_sent": 100.0,
                    "assignment_conflicts": 2.0,
                    "average_information_age": 4.0,
                },
                "without_comm_baseline": {
                    "task_completion_rate": 0.6,
                    "messages_sent": 0.0,
                    "assignment_conflicts": 1.0,
                    "average_information_age": 5.0,
                },
                "with_comm_fault": {
                    "task_completion_rate": 0.4,
                    "messages_sent": 60.0,
                    "assignment_conflicts": 3.0,
                    "average_information_age": 5.0,
                },
            }
        }

        derived = api._compute_derived_metrics(rows, num_targets=10)
        current = derived["by_strategy"][0]

        self.assertEqual(current["strategy"], "current")
        self.assertEqual(current["fault_retention"], 0.5)
        self.assertEqual(current["comm_gain"], 0.2)
        self.assertEqual(current["message_cost_per_success_normal"], 12.5)
        self.assertEqual(current["message_cost_per_success_fault"], 15.0)
        self.assertEqual(current["conflict_cost_per_success_normal"], 0.25)
        self.assertEqual(current["completion_vs_age_ratio_normal"], 0.2)

    def test_experiments_response_includes_new_data_blocks(self) -> None:
        def fake_run_monte_carlo(config, runs, seed_start=None):
            if not config.enable_communication:
                base_completion = 0.6
                messages = 0.0
            elif config.packet_loss_prob > 0 or config.agent_failure_prob > 0:
                base_completion = 0.5
                messages = 60.0
            else:
                base_completion = 0.8
                messages = 100.0

            strategy_shift = {"current": 0.0, "nearest": -0.05, "random": -0.1}.get(
                config.decision_strategy,
                0.0,
            )
            records = []
            for idx in range(runs):
                completion = round(base_completion + strategy_shift + 0.01 * idx, 4)
                records.append(
                    {
                        "seed": float((seed_start or 1000) + idx),
                        "steps_used": 40.0 + idx,
                        "task_completion_rate": completion,
                        "collaboration_efficiency": 0.1,
                        "task_completion_latency": 5.0 + idx,
                        "decision_response_time_steps": 5.0 + idx,
                        "messages_sent": messages + idx,
                        "messages_received": messages + idx,
                        "failed_agents": 1.0 if config.agent_failure_prob > 0 else 0.0,
                        "coverage_rate": 0.3 + 0.01 * idx,
                        "average_information_age": 4.0 + idx,
                        "assignment_conflicts": 2.0 + idx,
                    }
                )
            return records

        with patch.object(api, "run_monte_carlo", side_effect=fake_run_monte_carlo):
            result = api.experiments(
                ExperimentRequest(config={"num_targets": 10}, runs=3, strategies=["current"])
            )

        self.assertIn("rows", result)
        self.assertIn("strategy_rows", result)
        self.assertIn("run_rows", result)
        self.assertIn("strategy_stats", result)
        self.assertIn("derived_metrics", result)
        self.assertTrue(result["run_rows"])
        self.assertEqual(result["run_rows"][0]["run_index"], 0)
        self.assertEqual(result["strategy_stats"][0]["strategy"], "current")
        self.assertIn("task_completion_rate", result["strategy_stats"][0]["metrics"])
        self.assertEqual(result["derived_metrics"]["by_strategy"][0]["strategy"], "current")

    def test_experiments_uses_request_seed_for_all_scenarios(self) -> None:
        captured_seed_starts = []

        def fake_run_monte_carlo(config, runs, seed_start=None):
            captured_seed_starts.append(seed_start)
            return [
                {
                    "seed": float((seed_start or 0) + idx),
                    "steps_used": 40.0,
                    "task_completion_rate": 0.5,
                    "collaboration_efficiency": 0.1,
                    "task_completion_latency": 5.0,
                    "decision_response_time_steps": 5.0,
                    "messages_sent": 10.0,
                    "messages_received": 10.0,
                    "failed_agents": 0.0,
                    "coverage_rate": 0.3,
                    "average_information_age": 4.0,
                    "assignment_conflicts": 2.0,
                }
                for idx in range(runs)
            ]

        with patch.object(api, "run_monte_carlo", side_effect=fake_run_monte_carlo):
            api.experiments(
                ExperimentRequest(
                    config={"random_seed": 4321, "num_targets": 10},
                    runs=3,
                    strategies=["current"],
                )
            )

        self.assertEqual(captured_seed_starts, [4321, 4321, 4321])


if __name__ == "__main__":
    unittest.main()
