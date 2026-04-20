import React from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { SCENARIO_KEYS, STAT_METRIC_OPTIONS, STRATEGY_COLORS, STRATEGY_OPTIONS } from "../../dashboardModel.js";
import SectionShell from "./SectionShell.jsx";

const SCENARIO_COLORS = {
  with_comm_normal: "#0ea5e9",
  without_comm_baseline: "#64748b",
  with_comm_fault: "#14b8a6"
};

const STRATEGY_COMPARISON_METRICS = new Set([
  "task_completion_rate",
  "coverage_rate",
  "average_information_age",
  "assignment_conflicts"
]);

export default function ExperimentDeck({
  t,
  scenarioRows,
  strategyRows,
  robustnessRows,
  strategyStatRows,
  derivedCards,
  derivedComparisonRows,
  filteredTradeoffRows,
  tradeoffRows,
  currentStrategyContext,
  selectedStrategyScenario,
  selectedStrategyMetric,
  strategyMetricRows,
  selectedStatMetric,
  selectedTradeoffScenario,
  scenarioLabel,
  strategyLabel,
  onSelectedStrategyScenarioChange,
  onSelectedStrategyMetricChange,
  onSelectedStatMetricChange,
  onSelectedTradeoffScenarioChange,
  onExportScenarioSummaryCsv,
  onExportExperimentJson,
  onExportStrategyMatrixCsv,
  onExportStrategyStatsCsv,
  onExportRunRowsCsv,
  showHeader = true
}) {
  const strategyMetricLabelKey =
    strategyMetricRows[0]?.metric_label_key ??
    STAT_METRIC_OPTIONS.find((item) => item.value === selectedStrategyMetric)?.labelKey ??
    "statMetric.task_completion_rate";
  const strategyMetricSuffix = strategyMetricRows[0]?.value_suffix ?? "";
  const isStrategyMetricPercent = strategyMetricSuffix === "%";

  return (
    <section className="experiment-deck">
      {showHeader ? (
        <div className="experiment-deck-header">
          <p className="section-shell-label">{t("deck.kicker")}</p>
          <h2>{t("deck.title")}</h2>
        </div>
      ) : null}

      <div className="panel-grid-2 analysis-focus-grid">
        <SectionShell
          className="card"
          label={t("panel.currentStrategyScenarios")}
          title={t("panel.currentStrategyScenarios")}
          actions={
            <div className="inline-actions">
              <span className="context-pill">
                {t("analysis.currentStrategyLabel")}: {currentStrategyContext?.label}
              </span>
              <button className="btn btn-sm" onClick={onExportScenarioSummaryCsv} disabled={scenarioRows.length === 0}>
                {t("action.exportSummaryCsv")}
              </button>
            </div>
          }
        >
          <p className="chart-note">{t("analysis.fixedStrategyNote")}</p>
          {scenarioRows.length > 0 ? (
            <div className="analysis-dual-metric-grid">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={scenarioRows} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="scenario_label" />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, t("chart.completion")]} />
                  <Bar dataKey="completion_pct" name={t("chart.completion")}>
                    {scenarioRows.map((row) => (
                      <Cell key={`completion-${row.scenario}`} fill={SCENARIO_COLORS[row.scenario]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={scenarioRows} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="scenario_label" />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, t("chart.coverage")]} />
                  <Bar dataKey="coverage_pct" name={t("chart.coverage")}>
                    {scenarioRows.map((row) => (
                      <Cell key={`coverage-${row.scenario}`} fill={SCENARIO_COLORS[row.scenario]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="placeholder compact">{t("placeholder.runExperimentsFirst")}</div>
          )}
        </SectionShell>

        <SectionShell
          className="card"
          label={t("panel.scenarioStrategyMetric")}
          title={t("panel.scenarioStrategyMetric")}
          actions={
            <div className="inline-actions analysis-filter-row">
              <label className="analysis-inline-field">
                <span>{t("analysis.scenarioSelector")}</span>
                <select
                  className="panel-select"
                  value={selectedStrategyScenario}
                  onChange={(e) => onSelectedStrategyScenarioChange(e.target.value)}
                >
                  {SCENARIO_KEYS.map((value) => (
                    <option key={value} value={value}>
                      {scenarioLabel(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="analysis-inline-field">
                <span>{t("analysis.metricSelector")}</span>
                <select
                  className="panel-select"
                  value={selectedStrategyMetric}
                  onChange={(e) => onSelectedStrategyMetricChange(e.target.value)}
                >
                  {STAT_METRIC_OPTIONS.filter((item) =>
                    STRATEGY_COMPARISON_METRICS.has(item.value)
                  ).map((item) => (
                    <option key={item.value} value={item.value}>
                      {t(item.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn btn-sm" onClick={onExportStrategyMatrixCsv} disabled={strategyRows.length === 0}>
                {t("action.exportMatrixCsv")}
              </button>
            </div>
          }
        >
          <p className="chart-note">{t("analysis.fixedScenarioNote")}</p>
          {strategyMetricRows.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={strategyMetricRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="strategy" tickFormatter={strategyLabel} />
                  <YAxis tickFormatter={(v) => (isStrategyMetricPercent ? `${v}%` : Number(v).toFixed(0))} />
                  <Tooltip
                    formatter={(v, _name, item) => {
                      const suffix = item?.payload?.value_suffix ?? "";
                      const digits = suffix ? 0 : 2;
                      return [
                        `${Number(v).toFixed(digits)}${suffix}`,
                        t(item?.payload?.metric_label_key ?? strategyMetricLabelKey)
                      ];
                    }}
                  />
                  <Bar dataKey="value" name={t(strategyMetricLabelKey)}>
                    {strategyMetricRows.map((row) => (
                      <Cell key={`strategy-metric-${row.strategy}`} fill={STRATEGY_COLORS[row.strategy]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="placeholder compact">{t("placeholder.runExperimentsFirst")}</div>
          )}
        </SectionShell>
      </div>

      <SectionShell
        className="card"
        label={t("chart.robustness")}
        title={t("chart.robustness")}
      >
        <p className="chart-note">{t("analysis.robustnessNote")}</p>
        {robustnessRows.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={robustnessRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="strategy" tickFormatter={strategyLabel} />
              <YAxis domain={[0, "auto"]} />
              <Tooltip formatter={(v) => [Number(v).toFixed(4), t("chart.robustness")]} />
              <Bar dataKey="robustness" name={t("chart.robustness")} fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="placeholder compact">{t("placeholder.runExperimentsFirst")}</div>
        )}
      </SectionShell>

      <div className="panel-grid-2">
        <SectionShell
          className="card"
          label={t("panel.statisticalSummary")}
          title={t("panel.statisticalSummary")}
          actions={
            <div className="inline-actions">
              <select
                className="panel-select"
                value={selectedStatMetric}
                onChange={(e) => onSelectedStatMetricChange(e.target.value)}
              >
                {STAT_METRIC_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(item.labelKey)}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-sm"
                onClick={onExportStrategyStatsCsv}
                disabled={strategyStatRows.length === 0}
              >
                {t("action.exportStatsCsv")}
              </button>
            </div>
          }
        >
          {strategyStatRows.length > 0 ? (
            <>
              <p className="chart-note">{t("chart.statNote")}</p>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("table.strategy")}</th>
                      <th>{t("table.scenario")}</th>
                      <th>{t("table.meanBand")}</th>
                      <th>{t("table.min")}</th>
                      <th>{t("table.median")}</th>
                      <th>{t("table.max")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategyStatRows.map((row) => (
                      <tr key={`${row.strategy}-${row.scenario}`}>
                        <td>{strategyLabel(row.strategy)}</td>
                        <td>{scenarioLabel(row.scenario)}</td>
                        <td>{row.band}</td>
                        <td>{row.min.toFixed(3)}</td>
                        <td>{row.median.toFixed(3)}</td>
                        <td>{row.max.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="placeholder compact">{t("placeholder.runExperimentsFirst")}</div>
          )}
        </SectionShell>

        <SectionShell
          className="card"
          label={t("panel.benefitCost")}
          title={t("panel.benefitCost")}
          actions={
            <button className="btn btn-sm" onClick={onExportExperimentJson} disabled={!strategyRows.length}>
              {t("action.exportJson")}
            </button>
          }
        >
          {derivedComparisonRows.length > 0 ? (
            <>
              <div className="insight-grid">
                {derivedCards.map((card) => (
                  <article className="insight-card card-lite" key={card.key}>
                    <div className="insight-label">{t(card.key)}</div>
                    <div className="insight-value">{card.value}</div>
                  </article>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={derivedComparisonRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="strategy" tickFormatter={strategyLabel} />
                  <YAxis tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v, n) => [`${Number(v).toFixed(1)}%`, n]} />
                  <Legend />
                  <Bar dataKey="fault_retention_pct" name={t("chart.faultRetention")} fill="#0ea5e9" />
                  <Bar dataKey="comm_gain_pct" name={t("chart.commGain")} fill="#14b8a6" />
                </BarChart>
              </ResponsiveContainer>
              <div className="table-wrap compact-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("table.strategy")}</th>
                      <th>{t("table.msgCostNormal")}</th>
                      <th>{t("table.msgCostFault")}</th>
                      <th>{t("table.conflictCostFault")}</th>
                      <th>{t("table.completionAgeNormal")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {derivedComparisonRows.map((row) => (
                      <tr key={`derived-${row.strategy}`}>
                        <td>{strategyLabel(row.strategy)}</td>
                        <td>{Number(row.message_cost_per_success_normal ?? 0).toFixed(2)}</td>
                        <td>{Number(row.message_cost_per_success_fault ?? 0).toFixed(2)}</td>
                        <td>{Number(row.conflict_cost_per_success_fault ?? 0).toFixed(2)}</td>
                        <td>{Number(row.completion_vs_age_ratio_normal ?? 0).toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="placeholder compact">{t("placeholder.runExperimentsFirst")}</div>
          )}
        </SectionShell>
      </div>

      <SectionShell
        className="card"
        label={t("panel.runTradeoff")}
        title={t("panel.runTradeoff")}
        actions={
          <div className="inline-actions">
            <select
              className="panel-select"
              value={selectedTradeoffScenario}
              onChange={(e) => onSelectedTradeoffScenarioChange(e.target.value)}
            >
              {SCENARIO_KEYS.map((value) => (
                <option key={value} value={value}>
                  {scenarioLabel(value)}
                </option>
              ))}
            </select>
            <button className="btn btn-sm" onClick={onExportRunRowsCsv} disabled={tradeoffRows.length === 0}>
              {t("action.exportRunCsv")}
            </button>
          </div>
        }
      >
        {filteredTradeoffRows.length > 0 ? (
          <>
            <p className="chart-note">{t("chart.tradeoffNote")}</p>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="messages_sent"
                  name={t("axis.messagesSent")}
                  label={{ value: t("axis.messagesSent"), position: "insideBottom", offset: -4 }}
                />
                <YAxis
                  type="number"
                  dataKey="completion_pct"
                  name={t("axis.completionPct")}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  label={{ value: t("axis.completionPct"), angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value, name) => [
                    name === "completion_pct" ? `${Number(value).toFixed(1)}%` : Number(value).toFixed(2),
                    name
                  ]}
                  labelFormatter={() => ""}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0].payload;
                    return (
                      <div className="tooltip-card">
                        <div>
                          {t("tooltip.runLabel", {
                            strategy: strategyLabel(point.strategy),
                            scenario: scenarioLabel(point.scenario),
                            run: point.run_index
                          })}
                        </div>
                        <div>{t("tooltip.messages")}: {point.messages_sent}</div>
                        <div>{t("tooltip.completion")}: {point.completion_pct.toFixed(1)}%</div>
                        <div>{t("tooltip.conflicts")}: {point.conflicts}</div>
                        <div>{t("tooltip.infoAge")}: {point.info_age.toFixed(2)}</div>
                      </div>
                    );
                  }}
                />
                <Legend formatter={(value) => strategyLabel(value)} />
                {STRATEGY_OPTIONS.map((option) => (
                  <Scatter
                    key={option}
                    name={option}
                    data={filteredTradeoffRows.filter((row) => row.strategy === option)}
                    fill={STRATEGY_COLORS[option]}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div className="placeholder compact">{t("placeholder.runExperimentsFirst")}</div>
        )}
      </SectionShell>
    </section>
  );
}
