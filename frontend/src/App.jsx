import React, { useEffect, useMemo, useState } from "react";
import {
  buildDerivedCards,
  buildDerivedComparisonRows,
  buildStrategyMetricComparisonRows,
  buildStrategyStatRows,
  buildTradeoffScatterRows
} from "./experimentInsights";
import { resolveInitialLanguage, translate } from "./i18n";
import {
  buildPlaybackKeyframes,
  buildTrails,
  buildWorldFromFrame,
  DEFAULT_CONFIG,
  downloadText,
  enrichTimeline,
  FIELD_GROUPS,
  rowsToCsv,
  SCENARIO_KEYS,
  STAT_METRIC_OPTIONS,
  STRATEGY_OPTIONS
} from "./dashboardModel";
import AnalysisPage from "./components/dashboard/AnalysisPage.jsx";
import HeroHeader from "./components/dashboard/HeroHeader.jsx";
import SimulationPage from "./components/dashboard/SimulationPage.jsx";

function App() {
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") return "zh";
    return resolveInitialLanguage(window.localStorage.getItem("mas_lang"));
  });
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [runs, setRuns] = useState(20);
  const [loadingSim, setLoadingSim] = useState(false);
  const [loadingExp, setLoadingExp] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [expResult, setExpResult] = useState(null);
  const [error, setError] = useState("");

  const [showVision, setShowVision] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [trailLength, setTrailLength] = useState(120);
  const [hoverInfo, setHoverInfo] = useState("");
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [selectedStatMetric, setSelectedStatMetric] = useState("task_completion_rate");
  const [selectedStrategyScenario, setSelectedStrategyScenario] = useState("with_comm_normal");
  const [selectedStrategyMetric, setSelectedStrategyMetric] = useState("task_completion_rate");
  const [selectedTradeoffScenario, setSelectedTradeoffScenario] =
    useState("with_comm_normal");
  const [currentPage, setCurrentPage] = useState("simulation");

  const t = (key, vars) => translate(language, key, vars);
  const strategyLabel = (value) => t(`strategy.${value}`);
  const scenarioLabel = (value) => t(`scenario.${value}`);

  const metrics = simResult?.metrics ?? null;
  const history = Array.isArray(simResult?.history) ? simResult.history : [];
  const timeline = useMemo(() => enrichTimeline(simResult?.timeline ?? []), [simResult]);
  const world = simResult?.world ?? null;
  const simConfig = simResult?.config ?? config;

  const safeFrameIndex =
    history.length > 0 ? Math.max(0, Math.min(frameIndex, history.length - 1)) : 0;
  const activeFrame = history.length > 0 ? history[safeFrameIndex] : null;
  const displayWorld = activeFrame ? buildWorldFromFrame(activeFrame, simConfig) : world;

  const trails = useMemo(
    () => buildTrails(history, safeFrameIndex, trailLength),
    [history, safeFrameIndex, trailLength]
  );
  const keyframes = useMemo(() => buildPlaybackKeyframes(timeline, t), [timeline, t]);
  const selectedKeyframe = useMemo(
    () =>
      keyframes.some((item) => item.frameIndex === safeFrameIndex)
        ? String(safeFrameIndex)
        : "__current__",
    [keyframes, safeFrameIndex]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("mas_lang", language);
  }, [language]);

  useEffect(() => {
    if (!isPlaying || history.length === 0) return undefined;
    const delayMs = Math.max(60, Math.round(420 / playSpeed));
    const timer = window.setInterval(() => {
      setFrameIndex((prev) => {
        if (prev >= history.length - 1) {
          setIsPlaying(false);
          return history.length - 1;
        }
        return prev + 1;
      });
    }, delayMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, playSpeed, history.length]);

  const metricCards = useMemo(() => {
    if (!metrics) return [];
    return [
      [t("metric.completion"), metrics.task_completion_rate],
      [t("metric.coverage"), metrics.coverage_rate],
      [
        t("metric.completionLatency"),
        metrics.task_completion_latency ?? metrics.decision_response_time_steps
      ],
      [t("metric.infoAge"), metrics.average_information_age],
      [t("metric.collabEff"), metrics.collaboration_efficiency],
      [t("metric.conflicts"), metrics.assignment_conflicts]
    ];
  }, [metrics, t]);

  const scenarioRows = useMemo(() => {
    const rows = Array.isArray(expResult?.rows) ? expResult.rows : [];
    return rows.map((row) => ({
      ...row,
      scenario_label: scenarioLabel(row.scenario),
      completion_pct: Number(row.task_completion_rate ?? 0) * 100,
      coverage_pct: Number(row.coverage_rate ?? 0) * 100
    }));
  }, [expResult, scenarioLabel]);

  const strategyRows = useMemo(
    () => (Array.isArray(expResult?.strategy_rows) ? expResult.strategy_rows : []),
    [expResult]
  );

  const currentStrategyKey = String(
    expResult?.default_strategy ?? config.decision_strategy ?? "current"
  );

  const currentStrategyContext = useMemo(
    () => ({
      strategy: currentStrategyKey,
      label: strategyLabel(currentStrategyKey)
    }),
    [currentStrategyKey, strategyLabel]
  );

  const robustnessRows = useMemo(() => {
    const obj = expResult?.robustness_by_strategy ?? {};
    return Object.entries(obj).map(([strategy, robustness]) => ({
      strategy,
      robustness: Number(robustness)
    }));
  }, [expResult]);

  const strategyStatRows = useMemo(
    () => buildStrategyStatRows(expResult?.strategy_stats ?? [], selectedStatMetric),
    [expResult, selectedStatMetric]
  );

  const strategyMetricRows = useMemo(
    () =>
      buildStrategyMetricComparisonRows(
        strategyRows,
        selectedStrategyScenario,
        selectedStrategyMetric
      ),
    [strategyRows, selectedStrategyScenario, selectedStrategyMetric]
  );

  const derivedComparisonRows = useMemo(
    () => buildDerivedComparisonRows(expResult?.derived_metrics ?? {}),
    [expResult]
  );

  const derivedCards = useMemo(
    () => buildDerivedCards(expResult?.derived_metrics?.default_strategy ?? null),
    [expResult]
  );

  const tradeoffRows = useMemo(
    () => buildTradeoffScatterRows(expResult?.run_rows ?? []),
    [expResult]
  );

  const filteredTradeoffRows = useMemo(
    () => tradeoffRows.filter((row) => row.scenario === selectedTradeoffScenario),
    [tradeoffRows, selectedTradeoffScenario]
  );

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || `Request failed: ${res.status}`);
    }
    return res.json();
  }

  async function runSimulation() {
    setError("");
    setLoadingSim(true);
    try {
      const data = await postJson("/api/simulate", { config });
      setSimResult(data);
      setFrameIndex(0);
      setIsPlaying(false);
      setHoverInfo("");
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoadingSim(false);
    }
  }

  async function runExperiments() {
    setError("");
    setLoadingExp(true);
    try {
      const data = await postJson("/api/experiments", {
        config,
        runs,
        strategies: STRATEGY_OPTIONS
      });
      setExpResult(data);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoadingExp(false);
    }
  }

  function updateField(key, value, isCheckbox = false) {
    setConfig((prev) => ({
      ...prev,
      [key]: isCheckbox ? value : Number(value)
    }));
  }

  function updateSelectField(key, value) {
    setConfig((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  function exportScenarioSummaryCsv() {
    if (scenarioRows.length === 0) return;
    const headers = [
      { key: "scenario", label: "scenario" },
      { key: "task_completion_rate", label: "task_completion_rate" },
      { key: "coverage_rate", label: "coverage_rate" },
      { key: "collaboration_efficiency", label: "collaboration_efficiency" },
      { key: "task_completion_latency", label: "task_completion_latency" },
      { key: "average_information_age", label: "average_information_age" },
      { key: "assignment_conflicts", label: "assignment_conflicts" }
    ];
    const csv = rowsToCsv(headers, scenarioRows);
    downloadText(`scenario_summary_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
  }

  function exportStrategyMatrixCsv() {
    if (strategyRows.length === 0) return;
    const headers = [
      { key: "strategy", label: "strategy" },
      { key: "scenario", label: "scenario" },
      { key: "task_completion_rate", label: "task_completion_rate" },
      { key: "coverage_rate", label: "coverage_rate" },
      { key: "task_completion_latency", label: "task_completion_latency" },
      { key: "average_information_age", label: "average_information_age" },
      { key: "assignment_conflicts", label: "assignment_conflicts" }
    ];
    const csv = rowsToCsv(headers, strategyRows);
    downloadText(`strategy_matrix_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
  }

  function exportTimelineCsv() {
    if (timeline.length === 0) return;
    const headers = [
      { key: "step", label: "step" },
      { key: "active_targets", label: "active_targets" },
      { key: "captures_per_step", label: "captures_per_step" },
      { key: "failed_agents", label: "failed_agents" }
    ];
    const csv = rowsToCsv(headers, timeline);
    downloadText(`timeline_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
  }

  function exportExperimentJson() {
    if (!expResult) return;
    downloadText(
      `experiment_result_${Date.now()}.json`,
      JSON.stringify(expResult, null, 2),
      "application/json;charset=utf-8"
    );
  }

  function exportStrategyStatsCsv() {
    if (strategyStatRows.length === 0) return;
    const headers = [
      { key: "strategy", label: "strategy" },
      { key: "scenario", label: "scenario" },
      { key: "mean", label: "mean" },
      { key: "std", label: "std" },
      { key: "min", label: "min" },
      { key: "median", label: "median" },
      { key: "max", label: "max" },
      { key: "ci95_low", label: "ci95_low" },
      { key: "ci95_high", label: "ci95_high" }
    ];
    const csv = rowsToCsv(headers, strategyStatRows);
    downloadText(
      `strategy_stats_${selectedStatMetric}_${Date.now()}.csv`,
      csv,
      "text/csv;charset=utf-8"
    );
  }

  function exportRunRowsCsv() {
    if (tradeoffRows.length === 0) return;
    const headers = [
      { key: "strategy", label: "strategy" },
      { key: "scenario", label: "scenario" },
      { key: "run_index", label: "run_index" },
      { key: "messages_sent", label: "messages_sent" },
      { key: "completion_pct", label: "completion_pct" },
      { key: "conflicts", label: "conflicts" },
      { key: "info_age", label: "info_age" }
    ];
    const csv = rowsToCsv(headers, tradeoffRows);
    downloadText(`experiment_runs_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
  }

  function handlePlayPause() {
    if (history.length === 0) return;
    if (!isPlaying && safeFrameIndex >= history.length - 1) {
      setFrameIndex(0);
    }
    setIsPlaying((prev) => !prev);
  }

  function stepFrame(delta) {
    if (history.length === 0) return;
    setIsPlaying(false);
    const maxFrame = Math.max(0, history.length - 1);
    setFrameIndex((prev) => Math.max(0, Math.min(maxFrame, prev + delta)));
  }

  function jumpKeyframe(direction) {
    if (keyframes.length === 0) return;
    setIsPlaying(false);
    if (direction < 0) {
      for (let idx = keyframes.length - 1; idx >= 0; idx -= 1) {
        const item = keyframes[idx];
        if (item.frameIndex < safeFrameIndex) {
          setFrameIndex(item.frameIndex);
          return;
        }
      }
      setFrameIndex(0);
      return;
    }
    for (const item of keyframes) {
      if (item.frameIndex > safeFrameIndex) {
        setFrameIndex(item.frameIndex);
        return;
      }
    }
    setFrameIndex(Math.max(0, history.length - 1));
  }

  function handleFrameIndexChange(nextFrameIndex) {
    setIsPlaying(false);
    setFrameIndex(nextFrameIndex);
  }

  return (
    <div className="page command-stage-page thesis-shell">
      <HeroHeader
        t={t}
        language={language}
        setLanguage={setLanguage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        loadingSim={loadingSim}
        loadingExp={loadingExp}
        onRunSimulation={runSimulation}
        onRunExperiments={runExperiments}
        metricCards={metricCards}
      />

      {error ? <div className="error card">{error}</div> : null}

      {currentPage === "simulation" ? (
        <SimulationPage
          t={t}
          config={config}
          runs={runs}
          history={history}
          safeFrameIndex={safeFrameIndex}
          strategyOptions={STRATEGY_OPTIONS}
          strategyLabel={strategyLabel}
          fieldGroups={FIELD_GROUPS}
          showVision={showVision}
          showTrails={showTrails}
          showLabels={showLabels}
          trailLength={trailLength}
          onUpdateField={updateField}
          onUpdateSelectField={updateSelectField}
          onRunsChange={setRuns}
          onShowVisionChange={setShowVision}
          onShowTrailsChange={setShowTrails}
          onShowLabelsChange={setShowLabels}
          onTrailLengthChange={setTrailLength}
          onFrameIndexChange={handleFrameIndexChange}
          displayWorld={displayWorld}
          timeline={timeline}
          metrics={metrics}
          trails={trails}
          simConfig={simConfig}
          activeFrame={activeFrame}
          isPlaying={isPlaying}
          playSpeed={playSpeed}
          selectedKeyframe={selectedKeyframe}
          keyframes={keyframes}
          hoverInfo={hoverInfo}
          onHoverChange={setHoverInfo}
          onPlayPause={handlePlayPause}
          onStepFrame={stepFrame}
          onJumpKeyframe={jumpKeyframe}
          onPlaySpeedChange={setPlaySpeed}
          onToggleVision={() => setShowVision((v) => !v)}
          onToggleTrails={() => setShowTrails((v) => !v)}
          onExportTimelineCsv={exportTimelineCsv}
          metricCards={metricCards}
          expResult={expResult}
          derivedCards={derivedCards}
        />
      ) : (
        <AnalysisPage
          t={t}
          scenarioRows={scenarioRows}
          strategyRows={strategyRows}
          robustnessRows={robustnessRows}
          strategyStatRows={strategyStatRows}
          derivedCards={derivedCards}
          derivedComparisonRows={derivedComparisonRows}
          filteredTradeoffRows={filteredTradeoffRows}
          tradeoffRows={tradeoffRows}
          currentStrategyContext={currentStrategyContext}
          selectedStrategyScenario={selectedStrategyScenario}
          selectedStrategyMetric={selectedStrategyMetric}
          strategyMetricRows={strategyMetricRows}
          selectedStatMetric={selectedStatMetric}
          selectedTradeoffScenario={selectedTradeoffScenario}
          scenarioLabel={scenarioLabel}
          strategyLabel={strategyLabel}
          onSelectedStrategyScenarioChange={setSelectedStrategyScenario}
          onSelectedStrategyMetricChange={setSelectedStrategyMetric}
          onSelectedStatMetricChange={setSelectedStatMetric}
          onSelectedTradeoffScenarioChange={setSelectedTradeoffScenario}
          onExportScenarioSummaryCsv={exportScenarioSummaryCsv}
          onExportExperimentJson={exportExperimentJson}
          onExportStrategyMatrixCsv={exportStrategyMatrixCsv}
          onExportStrategyStatsCsv={exportStrategyStatsCsv}
          onExportRunRowsCsv={exportRunRowsCsv}
        />
      )}
    </div>
  );
}

export default App;
