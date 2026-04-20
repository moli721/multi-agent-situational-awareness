import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDerivedComparisonRows,
  buildStrategyMetricComparisonRows,
  buildStrategyStatRows,
  buildTradeoffScatterRows,
  formatStatBand
} from "./experimentInsights.js";

test("formatStatBand formats mean, std, and ci for display", () => {
  const text = formatStatBand({
    mean: 0.8123,
    std: 0.0512,
    ci95_low: 0.7544,
    ci95_high: 0.8702
  });

  assert.equal(text, "0.812 ± 0.051 (95% CI 0.754-0.870)");
});

test("buildStrategyStatRows flattens strategy stats for the selected metric", () => {
  const rows = buildStrategyStatRows(
    [
      {
        strategy: "current",
        scenario: "with_comm_normal",
        metrics: {
          task_completion_rate: {
            mean: 0.88,
            std: 0.07,
            min: 0.7,
            median: 0.9,
            max: 1.0,
            ci95_low: 0.82,
            ci95_high: 0.94
          }
        }
      }
    ],
    "task_completion_rate"
  );

  assert.deepEqual(rows, [
    {
      strategy: "current",
      scenario: "with_comm_normal",
      mean: 0.88,
      std: 0.07,
      min: 0.7,
      median: 0.9,
      max: 1.0,
      ci95_low: 0.82,
      ci95_high: 0.94,
      band: "0.880 ± 0.070 (95% CI 0.820-0.940)"
    }
  ]);
});

test("buildDerivedComparisonRows returns sorted strategy comparison rows", () => {
  const rows = buildDerivedComparisonRows({
    by_strategy: [
      {
        strategy: "nearest",
        fault_retention: 0.66,
        comm_gain: 0.12,
        message_cost_per_success_normal: 9.8
      },
      {
        strategy: "current",
        fault_retention: 0.71,
        comm_gain: 0.18,
        message_cost_per_success_normal: 8.4
      }
    ]
  });

  assert.deepEqual(
    rows.map((row) => row.strategy),
    ["current", "nearest"]
  );
  assert.equal(rows[0].fault_retention_pct, 71);
  assert.equal(rows[1].comm_gain_pct, 12);
});

test("buildStrategyMetricComparisonRows filters one scenario and maps the selected metric", () => {
  const rows = buildStrategyMetricComparisonRows(
    [
      {
        strategy: "nearest",
        scenario: "with_comm_fault",
        task_completion_rate: 0.68,
        coverage_rate: 0.31,
        average_information_age: 28.4,
        assignment_conflicts: 12
      },
      {
        strategy: "current",
        scenario: "with_comm_fault",
        task_completion_rate: 0.72,
        coverage_rate: 0.29,
        average_information_age: 30.1,
        assignment_conflicts: 15
      },
      {
        strategy: "current",
        scenario: "with_comm_normal",
        task_completion_rate: 0.84,
        coverage_rate: 0.44,
        average_information_age: 52.0,
        assignment_conflicts: 21
      }
    ],
    "with_comm_fault",
    "coverage_rate"
  );

  assert.deepEqual(rows, [
    {
      strategy: "current",
      scenario: "with_comm_fault",
      metric_key: "coverage_rate",
      metric_label_key: "statMetric.coverage_rate",
      value: 29,
      raw_value: 0.29,
      value_suffix: "%"
    },
    {
      strategy: "nearest",
      scenario: "with_comm_fault",
      metric_key: "coverage_rate",
      metric_label_key: "statMetric.coverage_rate",
      value: 31,
      raw_value: 0.31,
      value_suffix: "%"
    }
  ]);
});

test("buildTradeoffScatterRows maps run rows to chart-friendly scatter points", () => {
  const rows = buildTradeoffScatterRows([
    {
      strategy: "current",
      scenario: "with_comm_normal",
      run_index: 2,
      messages_sent: 110,
      task_completion_rate: 0.85,
      assignment_conflicts: 3,
      average_information_age: 4.2
    }
  ]);

  assert.deepEqual(rows, [
    {
      strategy: "current",
      scenario: "with_comm_normal",
      run_index: 2,
      messages_sent: 110,
      completion_pct: 85,
      conflicts: 3,
      info_age: 4.2,
      label: "current | with_comm_normal | run 2"
    }
  ]);
});
