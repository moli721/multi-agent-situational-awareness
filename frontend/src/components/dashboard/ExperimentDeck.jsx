import React from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { pct, SCENARIO_KEYS, STAT_METRIC_OPTIONS, STRATEGY_COLORS, STRATEGY_OPTIONS } from "../../dashboardModel.js";
import SectionShell from "./SectionShell.jsx";

export default function ExperimentDeck({
  t,
  scenarioRows,
  strategyRows,
  strategyComparisonRows,
  robustnessRows,
  strategyStatRows,
  derivedCards,
  derivedComparisonRows,
  filteredTradeoffRows,
  tradeoffRows,
  selectedStatMetric,
  selectedTradeoffScenario,
  scenarioLabel,
  strategyLabel,
  onSelectedStatMetricChange,
  onSelectedTradeoffScenarioChange,
  onExportScenarioSummaryCsv,
  onExportExperimentJson,
  onExportStrategyMatrixCsv,
  onExportStrategyStatsCsv,
  onExportRunRowsCsv,
  showHeader = true
}) {
  return (
    <section className="experiment-deck">
      {showHeader ? (
        <div className="experiment-deck-header">
          <p className="section-shell-label">{t("deck.kicker")}</p>
          <h2>{t("deck.title")}</h2>
        </div>
      ) : null}

      <div className="panel-grid-2">
        <SectionShell
          className="card"
          label={t("panel.scenarioComparison")}
          title={t("panel.scenarioComparison")}
          actions={
            <div className="inline-actions">
              <button className="btn btn-sm" onClick={onExportScenarioSummaryCsv} disabled={scenarioRows.length === 0}>
                {t("action.exportSummaryCsv")}
              </button>
              <button className="btn btn-sm" onClick={onExportExperimentJson} disabled={!strategyRows.length}>
                {t("action.exportJson")}
              </button>
            </div>
          }
        >
          {scenarioRows.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={scenarioRows} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" width={120} dataKey="scenario_label" />
                  <Tooltip formatter={(v, n) => [`${Number(v).toFixed(1)}%`, n]} />
                  <Legend />
                  <Bar dataKey="completion_pct" name={t("chart.completion")} fill="#0ea5e9" />
                  <Bar dataKey="coverage_pct" name={t("chart.coverage")} fill="#14b8a6" />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="placeholder compact">{t("placeholder.runExperimentsFirst")}</div>
          )}
        </SectionShell>

        <SectionShell
          className="card"
          label={t("panel.strategyComparison")}
          title={t("panel.strategyComparison")}
          actions={
            <button className="btn btn-sm" onClick={onExportStrategyMatrixCsv} disabled={strategyRows.length === 0}>
              {t("action.exportMatrixCsv")}
            </button>
          }
        >
          {strategyComparisonRows.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={strategyComparisonRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="strategy" tickFormatter={strategyLabel} />
                  <YAxis domain={[0, 1]} tickFormatter={(v) => pct(v, 0)} />
                  <Tooltip formatter={(v, n) => [pct(v, 2), n]} />
                  <Legend />
                  <Bar dataKey="with_comm_normal" name={scenarioLabel("with_comm_normal")} fill="#0ea5e9" />
                  <Bar dataKey="without_comm_baseline" name={scenarioLabel("without_comm_baseline")} fill="#64748b" />
                  <Bar dataKey="with_comm_fault" name={scenarioLabel("with_comm_fault")} fill="#14b8a6" />
                </BarChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={robustnessRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="strategy" tickFormatter={strategyLabel} />
                  <YAxis domain={[0, "auto"]} />
                  <Tooltip formatter={(v) => [Number(v).toFixed(4), t("chart.robustness")]} />
                  <Bar dataKey="robustness" name={t("chart.robustness")} fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="placeholder compact">{t("placeholder.runExperimentsFirst")}</div>
          )}
        </SectionShell>
      </div>

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
