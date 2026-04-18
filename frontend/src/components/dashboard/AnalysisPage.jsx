import React from "react";

import ExperimentDeck from "./ExperimentDeck.jsx";

export default function AnalysisPage(props) {
  const {
    t,
    scenarioRows = [],
    strategyRows = [],
    tradeoffRows = [],
    onExportScenarioSummaryCsv,
    onExportExperimentJson,
    onExportStrategyStatsCsv,
    onExportRunRowsCsv
  } = props;
  const scenarioCount = scenarioRows.length;
  const strategyCount = new Set(strategyRows.map((row) => row.strategy)).size;
  const runCount = tradeoffRows.length;

  return (
    <main className="analysis-page">
      <section className="analysis-summary-band card">
        <div className="analysis-summary-copy">
          <p className="section-shell-label">{t("page.analysis")}</p>
          <h2>{t("analysis.summaryTitle")}</h2>
          <p className="analysis-summary-note">{t("analysis.summaryNote")}</p>
        </div>

        <div className="analysis-summary-metrics">
          <article className="analysis-summary-stat card-lite">
            <span className="analysis-summary-label">{t("analysis.summaryScenarios")}</span>
            <strong>{scenarioCount}</strong>
          </article>
          <article className="analysis-summary-stat card-lite">
            <span className="analysis-summary-label">{t("analysis.summaryStrategies")}</span>
            <strong>{strategyCount}</strong>
          </article>
          <article className="analysis-summary-stat card-lite">
            <span className="analysis-summary-label">{t("analysis.summaryRuns")}</span>
            <strong>{runCount}</strong>
          </article>
        </div>

        <div className="analysis-summary-actions">
          <span className="analysis-summary-actions-label">{t("analysis.exportLabel")}</span>
          <div className="inline-actions">
            <button className="btn btn-sm" onClick={onExportScenarioSummaryCsv} disabled={scenarioCount === 0}>
              {t("action.exportSummaryCsv")}
            </button>
            <button className="btn btn-sm" onClick={onExportStrategyStatsCsv} disabled={strategyCount === 0}>
              {t("action.exportStatsCsv")}
            </button>
            <button className="btn btn-sm" onClick={onExportRunRowsCsv} disabled={runCount === 0}>
              {t("action.exportRunCsv")}
            </button>
            <button className="btn btn-sm" onClick={onExportExperimentJson} disabled={strategyRows.length === 0}>
              {t("action.exportJson")}
            </button>
          </div>
        </div>
      </section>

      <ExperimentDeck {...props} showHeader={false} />
    </main>
  );
}
