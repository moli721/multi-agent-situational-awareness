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

export function buildTradeoffScatterRows(runRows) {
  return (Array.isArray(runRows) ? runRows : []).map((row) => ({
    strategy: String(row.strategy ?? ""),
    scenario: String(row.scenario ?? ""),
    run_index: Number(row.run_index ?? 0),
    messages_sent: Number(row.messages_sent ?? 0),
    completion_pct: round((row.task_completion_rate ?? 0) * 100, 2),
    conflicts: Number(row.assignment_conflicts ?? 0),
    info_age: Number(row.average_information_age ?? 0),
    label: `${row.strategy} | ${row.scenario} | run ${row.run_index}`
  }));
}
