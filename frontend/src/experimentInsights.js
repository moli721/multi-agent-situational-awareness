const STRATEGY_ORDER = ["current", "nearest", "random"];
const SCENARIO_ORDER = [
  "with_comm_normal",
  "without_comm_baseline",
  "with_comm_fault"
];

function round(value, digits = 4) {
  return Number(Number(value ?? 0).toFixed(digits));
}

function sortByKnownOrder(values, order, key) {
  return [...values].sort((left, right) => {
    const leftValue = key ? left[key] : left;
    const rightValue = key ? right[key] : right;
    const leftIndex = order.indexOf(leftValue);
    const rightIndex = order.indexOf(rightValue);
    const safeLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const safeRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
    if (safeLeft !== safeRight) return safeLeft - safeRight;
    return String(leftValue).localeCompare(String(rightValue));
  });
}

function normalizeRange(value, min, max) {
  if (max <= min) return 0.5;
  return (Number(value ?? 0) - min) / (max - min);
}

function inverseNormalized(value, min, max) {
  return 1 - normalizeRange(value, min, max);
}

function buildRange(values) {
  const numbers = values.map((value) => Number(value ?? 0));
  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers)
  };
}

function resolveReturnBand(completionPct) {
  if (completionPct >= 85) return "high";
  if (completionPct >= 70) return "medium";
  return "low";
}

function resolveCostBand(messagesSent, range) {
  if (range.max <= range.min) return "medium";
  const normalized = normalizeRange(messagesSent, range.min, range.max);
  if (normalized <= 0.35) return "low";
  if (normalized >= 0.65) return "high";
  return "medium";
}

function resolveJudgmentKey(returnBand, costBand) {
  if (returnBand === "high" && costBand === "low") return "tooltip.judgment.highReturnLowCost";
  if (returnBand === "high" && costBand === "high") return "tooltip.judgment.highReturnHighCost";
  if (returnBand === "low" && costBand === "low") return "tooltip.judgment.lowReturnLowCost";
  if (returnBand === "low" && costBand === "high") return "tooltip.judgment.lowReturnHighCost";
  return "tooltip.judgment.balanced";
}

function resolveExplanationKey(judgmentKey) {
  switch (judgmentKey) {
    case "tooltip.judgment.highReturnLowCost":
      return "tooltip.explanation.highReturnLowCost";
    case "tooltip.judgment.highReturnHighCost":
      return "tooltip.explanation.highReturnHighCost";
    case "tooltip.judgment.lowReturnLowCost":
      return "tooltip.explanation.lowReturnLowCost";
    case "tooltip.judgment.lowReturnHighCost":
      return "tooltip.explanation.lowReturnHighCost";
    default:
      return "tooltip.explanation.balanced";
  }
}

function resolveExtremeDetailKey(row, stats) {
  const conflictNorm = normalizeRange(row.conflicts, stats.conflicts.min, stats.conflicts.max);
  if (conflictNorm <= 0.25) return "tooltip.detail.lowConflicts";
  if (conflictNorm >= 0.75) return "tooltip.detail.highConflicts";

  const infoAgeNorm = normalizeRange(row.info_age, stats.infoAge.min, stats.infoAge.max);
  if (infoAgeNorm <= 0.25) return "tooltip.detail.lowInfoAge";
  if (infoAgeNorm >= 0.75) return "tooltip.detail.highInfoAge";

  return null;
}

function applyRelativeStandings(rows, scoreByLabel) {
  if (rows.length <= 1) {
    rows.forEach((row) => {
      row.standing_key = "tooltip.standing.middle";
    });
    return;
  }

  const ranked = [...rows].sort((left, right) => {
    const scoreDiff = (scoreByLabel.get(right.label) ?? 0) - (scoreByLabel.get(left.label) ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return left.label.localeCompare(right.label);
  });

  const topCount = Math.max(1, Math.ceil(ranked.length * 0.25));
  const bottomCount = Math.max(1, Math.ceil(ranked.length * 0.25));

  ranked.forEach((row, index) => {
    if (index < topCount) {
      row.standing_key = "tooltip.standing.strong";
      return;
    }
    if (index >= ranked.length - bottomCount) {
      row.standing_key = "tooltip.standing.weak";
      return;
    }
    row.standing_key = "tooltip.standing.middle";
  });
}

function addTradeoffDiagnostics(rows) {
  if (rows.length === 0) return rows;

  const stats = {
    completion: buildRange(rows.map((row) => row.completion_pct)),
    messages: buildRange(rows.map((row) => row.messages_sent)),
    conflicts: buildRange(rows.map((row) => row.conflicts)),
    infoAge: buildRange(rows.map((row) => row.info_age))
  };

  const scoreByLabel = new Map();
  rows.forEach((row) => {
    row.return_band = resolveReturnBand(row.completion_pct);
    row.cost_band = resolveCostBand(row.messages_sent, stats.messages);
    row.judgment_key = resolveJudgmentKey(row.return_band, row.cost_band);
    row.explanation_key = resolveExplanationKey(row.judgment_key);
    row.explanation_detail_key = resolveExtremeDetailKey(row, stats);

    const completionScore = normalizeRange(
      row.completion_pct,
      stats.completion.min,
      stats.completion.max
    );
    const costScore = inverseNormalized(row.messages_sent, stats.messages.min, stats.messages.max);
    scoreByLabel.set(row.label, 0.7 * completionScore + 0.3 * costScore);
  });

  applyRelativeStandings(rows, scoreByLabel);
  return rows;
}

export function formatStatBand(stat) {
  if (!stat) return "-";
  return `${Number(stat.mean ?? 0).toFixed(3)} ± ${Number(stat.std ?? 0).toFixed(3)} (95% CI ${Number(
    stat.ci95_low ?? 0
  ).toFixed(3)}-${Number(stat.ci95_high ?? 0).toFixed(3)})`;
}

export function buildStrategyStatRows(strategyStats, metricKey) {
  const rows = (Array.isArray(strategyStats) ? strategyStats : [])
    .map((row) => {
      const stat = row?.metrics?.[metricKey];
      if (!stat) return null;
      return {
        strategy: String(row.strategy ?? ""),
        scenario: String(row.scenario ?? ""),
        mean: round(stat.mean),
        std: round(stat.std),
        min: round(stat.min),
        median: round(stat.median),
        max: round(stat.max),
        ci95_low: round(stat.ci95_low),
        ci95_high: round(stat.ci95_high),
        band: formatStatBand(stat)
      };
    })
    .filter(Boolean);

  return sortByKnownOrder(
    sortByKnownOrder(rows, SCENARIO_ORDER, "scenario"),
    STRATEGY_ORDER,
    "strategy"
  );
}

export function buildDerivedComparisonRows(derivedMetrics) {
  const rows = Array.isArray(derivedMetrics?.by_strategy) ? derivedMetrics.by_strategy : [];
  return sortByKnownOrder(rows, STRATEGY_ORDER, "strategy").map((row) => ({
    ...row,
    fault_retention_pct: round((row.fault_retention ?? 0) * 100, 0),
    comm_gain_pct: round((row.comm_gain ?? 0) * 100, 0)
  }));
}

export function buildDerivedCards(defaultDerived) {
  if (!defaultDerived || !defaultDerived.strategy) return [];
  return [
    {
      key: "insight.faultRetention",
      value: `${((defaultDerived.fault_retention ?? 0) * 100).toFixed(1)}%`
    },
    {
      key: "insight.commGain",
      value: `${((defaultDerived.comm_gain ?? 0) * 100).toFixed(1)}%`
    },
    {
      key: "insight.msgCostNormal",
      value: Number(defaultDerived.message_cost_per_success_normal ?? 0).toFixed(2)
    },
    {
      key: "insight.conflictCostFault",
      value: Number(defaultDerived.conflict_cost_per_success_fault ?? 0).toFixed(2)
    }
  ];
}

const STRATEGY_METRIC_META = {
  task_completion_rate: {
    metric_label_key: "statMetric.task_completion_rate",
    transform: (value) => round((value ?? 0) * 100, 0),
    suffix: "%"
  },
  coverage_rate: {
    metric_label_key: "statMetric.coverage_rate",
    transform: (value) => round((value ?? 0) * 100, 0),
    suffix: "%"
  },
  average_information_age: {
    metric_label_key: "statMetric.average_information_age",
    transform: (value) => round(value ?? 0, 2),
    suffix: ""
  },
  assignment_conflicts: {
    metric_label_key: "statMetric.assignment_conflicts",
    transform: (value) => round(value ?? 0, 2),
    suffix: ""
  }
};

export function buildStrategyMetricComparisonRows(strategyRows, selectedScenario, metricKey) {
  const resolvedMetricKey = STRATEGY_METRIC_META[metricKey]
    ? metricKey
    : "task_completion_rate";
  const metricMeta = STRATEGY_METRIC_META[resolvedMetricKey];
  const rows = (Array.isArray(strategyRows) ? strategyRows : [])
    .filter((row) => String(row?.scenario ?? "") === String(selectedScenario ?? ""))
    .map((row) => {
      const rawValue = Number(row?.[resolvedMetricKey] ?? 0);
      return {
        strategy: String(row?.strategy ?? ""),
        scenario: String(row?.scenario ?? ""),
        metric_key: resolvedMetricKey,
        metric_label_key: metricMeta.metric_label_key,
        value: metricMeta.transform(rawValue),
        raw_value: rawValue,
        value_suffix: metricMeta.suffix
      };
    });

  return sortByKnownOrder(rows, STRATEGY_ORDER, "strategy");
}

export function buildTradeoffScatterRows(runRows) {
  const rows = (Array.isArray(runRows) ? runRows : []).map((row) => ({
    strategy: String(row.strategy ?? ""),
    scenario: String(row.scenario ?? ""),
    run_index: Number(row.run_index ?? 0),
    messages_sent: Number(row.messages_sent ?? 0),
    completion_pct: round((row.task_completion_rate ?? 0) * 100, 2),
    conflicts: Number(row.assignment_conflicts ?? 0),
    info_age: Number(row.average_information_age ?? 0),
    label: `${row.strategy} | ${row.scenario} | run ${row.run_index}`
  }));

  const rowsByScenario = new Map();
  rows.forEach((row) => {
    if (!rowsByScenario.has(row.scenario)) rowsByScenario.set(row.scenario, []);
    rowsByScenario.get(row.scenario).push(row);
  });

  rowsByScenario.forEach((scenarioRows) => {
    addTradeoffDiagnostics(scenarioRows);
  });

  return rows;
}
