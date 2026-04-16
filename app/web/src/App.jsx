import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  buildDerivedCards,
  buildDerivedComparisonRows,
  buildStrategyStatRows,
  buildTradeoffScatterRows
} from "./experimentInsights";
import { resolveInitialLanguage, translate } from "./i18n";

const STRATEGY_OPTIONS = ["current", "nearest", "random"];
const SCENARIO_KEYS = ["with_comm_normal", "without_comm_baseline", "with_comm_fault"];

const STRATEGY_COLORS = {
  current: "#0ea5e9",
  nearest: "#14b8a6",
  random: "#f97316"
};

const STAT_METRIC_OPTIONS = [
  { value: "task_completion_rate", labelKey: "statMetric.task_completion_rate" },
  { value: "task_completion_latency", labelKey: "statMetric.task_completion_latency" },
  { value: "coverage_rate", labelKey: "statMetric.coverage_rate" },
  { value: "messages_sent", labelKey: "statMetric.messages_sent" },
  { value: "average_information_age", labelKey: "statMetric.average_information_age" },
  { value: "assignment_conflicts", labelKey: "statMetric.assignment_conflicts" }
];

const PLAY_SPEED_OPTIONS = [0.5, 1, 2, 4];

const DEFAULT_CONFIG = {
  random_seed: 2026,
  width: 42,
  height: 42,
  num_agents: 12,
  num_targets: 14,
  num_obstacles: 70,
  max_steps: 160,
  vision_range: 3,
  comm_range: 8,
  enable_communication: true,
  sense_miss_prob: 0.15,
  packet_loss_prob: 0,
  comm_delay_steps: 1,
  target_move_prob: 0.08,
  target_hotspot_bias: 0.7,
  agent_failure_prob: 0.0,
  fault_injection_start: 40,
  min_tracking_confidence: 0.25,
  belief_decay: 0.08,
  max_shared_targets: 6,
  owner_hint_penalty: 0.3,
  decision_strategy: "current"
};

const FIELD_GROUPS = [
  {
    titleKey: "group.world",
    fields: [
      ["random_seed", "number", 1, 999999, 1],
      ["width", "number", 20, 80, 1],
      ["height", "number", 20, 80, 1],
      ["num_agents", "number", 4, 40, 1],
      ["num_targets", "number", 4, 40, 1],
      ["num_obstacles", "number", 0, 220, 1],
      ["max_steps", "number", 40, 500, 1]
    ]
  },
  {
    titleKey: "group.perceptionComm",
    fields: [
      ["vision_range", "number", 1, 12, 1],
      ["comm_range", "number", 1, 20, 1],
      ["sense_miss_prob", "number", 0, 0.9, 0.01],
      ["packet_loss_prob", "number", 0, 0.95, 0.01],
      ["comm_delay_steps", "number", 0, 10, 1],
      ["max_shared_targets", "number", 1, 30, 1]
    ]
  },
  {
    titleKey: "group.dynamics",
    fields: [
      ["target_move_prob", "number", 0, 0.9, 0.01],
      ["target_hotspot_bias", "number", 0, 1, 0.01],
      ["agent_failure_prob", "number", 0, 0.2, 0.001],
      ["fault_injection_start", "number", 0, 500, 1],
      ["min_tracking_confidence", "number", 0.05, 0.95, 0.01],
      ["belief_decay", "number", 0, 0.5, 0.01],
      ["owner_hint_penalty", "number", 0, 1, 0.01]
    ]
  }
];

function pct(v, digits = 1) {
  return `${(Number(v) * 100).toFixed(digits)}%`;
}

function downloadText(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function rowsToCsv(headers, rows) {
  const esc = (value) => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  const lines = [
    headers.map((h) => esc(h.label)).join(","),
    ...rows.map((row) => headers.map((h) => esc(row[h.key])).join(","))
  ];
  return lines.join("\n");
}

function buildWorldFromFrame(frame, config) {
  if (!frame || !config) return null;
  const agents = Object.entries(frame.agents ?? {}).map(([id, payload]) => ({
    id: Number(id),
    x: payload.pos?.[0] ?? 0,
    y: payload.pos?.[1] ?? 0,
    failed: Boolean(payload.failed)
  }));

  const targets = Object.values(frame.targets ?? {});
  const activeTargets = targets
    .filter((item) => item.active)
    .map((item) => ({ x: item.pos?.[0] ?? 0, y: item.pos?.[1] ?? 0 }));
  const completedTargets = targets
    .filter((item) => !item.active)
    .map((item) => ({ x: item.pos?.[0] ?? 0, y: item.pos?.[1] ?? 0 }));

  return {
    width: Number(config.width),
    height: Number(config.height),
    obstacles: Array.isArray(frame.obstacles) ? frame.obstacles : [],
    hotspots: Array.isArray(frame.hotspots) ? frame.hotspots : [],
    agents,
    active_targets: activeTargets,
    completed_targets: completedTargets
  };
}

function buildTrails(history, frameIndex, trailLength) {
  const trails = new Map();
  if (!Array.isArray(history) || history.length === 0) return trails;
  const end = Math.max(0, Math.min(frameIndex, history.length - 1));
  const start = Math.max(0, end - Math.max(1, trailLength) + 1);
  for (let i = start; i <= end; i += 1) {
    const frame = history[i];
    for (const [id, payload] of Object.entries(frame.agents ?? {})) {
      if (!trails.has(id)) trails.set(id, []);
      trails.get(id).push({ x: payload.pos?.[0] ?? 0, y: payload.pos?.[1] ?? 0 });
    }
  }
  return trails;
}

function enrichTimeline(timeline) {
  if (!Array.isArray(timeline) || timeline.length === 0) return [];
  let prevActive = Number(timeline[0].active_targets ?? 0);
  return timeline.map((row, idx) => {
    const active = Number(row.active_targets ?? 0);
    const captures = idx === 0 ? 0 : Math.max(0, prevActive - active);
    prevActive = active;
    return {
      ...row,
      captures_per_step:
        row.captures_per_step === undefined ? captures : Number(row.captures_per_step)
    };
  });
}

function buildPlaybackKeyframes(timeline, t) {
  if (!Array.isArray(timeline) || timeline.length === 0) return [];
  const result = [{ frameIndex: 0, label: t("playback.keyframeStart") }];
  let prevFailed = Number(timeline[0].failed_agents ?? 0);

  for (let idx = 1; idx < timeline.length; idx += 1) {
    const row = timeline[idx];
    const captures = Number(row.captures_per_step ?? 0);
    const failed = Number(row.failed_agents ?? 0);
    const failedDelta = Math.max(0, failed - prevFailed);
    const isLast = idx === timeline.length - 1;
    if (!isLast && captures <= 0 && failedDelta <= 0) {
      prevFailed = failed;
      continue;
    }
    const tags = [];
    if (captures > 0) tags.push(t("playback.captureTag", { value: captures }));
    if (failedDelta > 0) tags.push(t("playback.failTag", { value: failedDelta }));
    result.push({
      frameIndex: idx,
      label: tags.length
        ? t("playback.keyframeLabel", { step: row.step, tags: tags.join(", ") })
        : t("playback.keyframePlain", { step: row.step })
    });
    prevFailed = failed;
  }

  const dedup = new Map();
  for (const item of result) dedup.set(item.frameIndex, item);
  return Array.from(dedup.values()).sort((a, b) => a.frameIndex - b.frameIndex);
}

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
  const [selectedTradeoffScenario, setSelectedTradeoffScenario] =
    useState("with_comm_normal");
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

  const strategyComparisonRows = useMemo(() => {
    const grouped = new Map();
    for (const row of strategyRows) {
      const strategy = String(row.strategy ?? "");
      const scenario = String(row.scenario ?? "");
      if (!grouped.has(strategy)) {
        grouped.set(strategy, {
          strategy,
          with_comm_normal: 0,
          with_comm_fault: 0,
          without_comm_baseline: 0
        });
      }
      grouped.get(strategy)[scenario] = Number(row.task_completion_rate ?? 0);
    }
    return Array.from(grouped.values());
  }, [strategyRows]);

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
      const frames = Array.isArray(data?.history) ? data.history.length : 0;
      setFrameIndex(frames > 0 ? 0 : 0);
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
    downloadText(`strategy_stats_${selectedStatMetric}_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
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

  return (
    <div className="page">
      <header className="header card">
        <div className="header-copy">
          <h1>{t("header.title")}</h1>
          <p>{t("header.subtitle")}</p>
          <p className="header-endpoints">
            {t("header.endpoints", {
              frontend: "127.0.0.1:5173",
              backend: "127.0.0.1:8000"
            })}
          </p>
        </div>
        <div className="header-actions">
          <div className="lang-switch card-lite">
            <button
              className={`btn btn-sm ${language === "zh" ? "active" : ""}`}
              onClick={() => setLanguage("zh")}
            >
              {t("lang.zh")}
            </button>
            <button
              className={`btn btn-sm ${language === "en" ? "active" : ""}`}
              onClick={() => setLanguage("en")}
            >
              {t("lang.en")}
            </button>
          </div>
          <button className="btn primary" onClick={runSimulation} disabled={loadingSim}>
            {loadingSim ? t("action.running") : t("action.runSimulation")}
          </button>
          <button className="btn" onClick={runExperiments} disabled={loadingExp}>
            {loadingExp ? t("action.running") : t("action.runExperiments")}
          </button>
        </div>
      </header>

      {error && <div className="error card">{error}</div>}

      <main className="layout">
        <aside className="sidebar card">
          <h2>{t("sidebar.configuration")}</h2>
          <label className="check-line">
            <span>{t("sidebar.enableCommunication")}</span>
            <input
              type="checkbox"
              checked={config.enable_communication}
              onChange={(e) => updateField("enable_communication", e.target.checked, true)}
            />
          </label>
          <label className="field">
            <span>{t("sidebar.decisionStrategy")}</span>
            <select
              value={config.decision_strategy}
              onChange={(e) => updateSelectField("decision_strategy", e.target.value)}
            >
              {STRATEGY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {strategyLabel(value)}
                </option>
              ))}
            </select>
          </label>

          {FIELD_GROUPS.map((group) => (
            <section key={group.titleKey} className="group">
              <h3>{t(group.titleKey)}</h3>
              {group.fields.map(([key, type, min, max, step]) => (
                <label key={key} className="field">
                  <span>{t(`field.${key}`)}</span>
                  <input
                    type={type}
                    min={min}
                    max={max}
                    step={step}
                    value={config[key]}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                </label>
              ))}
            </section>
          ))}

          <section className="group">
            <h3>{t("sidebar.experiment")}</h3>
            <label className="field">
              <span>{t("sidebar.monteCarloRuns")}</span>
              <input
                type="number"
                min={3}
                max={120}
                step={1}
                value={runs}
                onChange={(e) => setRuns(Number(e.target.value))}
              />
            </label>
          </section>

          <section className="group">
            <h3>{t("sidebar.mapLayers")}</h3>
            <label className="check-line">
              <span>{t("sidebar.showVision")}</span>
              <input
                type="checkbox"
                checked={showVision}
                onChange={(e) => setShowVision(e.target.checked)}
              />
            </label>
            <label className="check-line">
              <span>{t("sidebar.showTrails")}</span>
              <input
                type="checkbox"
                checked={showTrails}
                onChange={(e) => setShowTrails(e.target.checked)}
              />
            </label>
            <label className="check-line">
              <span>{t("sidebar.showLabels")}</span>
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
            </label>
            <label className="field">
              <span>{t("sidebar.trailLength")}</span>
              <input
                type="number"
                min={4}
                max={500}
                step={1}
                value={trailLength}
                onChange={(e) => setTrailLength(Number(e.target.value))}
              />
            </label>
            {history.length > 0 && (
              <label className="field">
                <span>{t("sidebar.frame")}</span>
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, history.length - 1)}
                  step={1}
                  value={safeFrameIndex}
                  onChange={(e) => setFrameIndex(Number(e.target.value))}
                />
              </label>
            )}
          </section>
        </aside>

        <section className="content">
          <div className="metrics-grid">
            {metricCards.map(([name, value]) => (
              <article className="metric card" key={name}>
                <div className="metric-name">{name}</div>
                <div className="metric-value">
                  {typeof value === "number" ? value.toFixed(3) : "-"}
                </div>
              </article>
            ))}
          </div>

          <section className="card chart-card">
            <div className="panel-title-row">
              <h3>{t("panel.finalWorld")}</h3>
              <button className="btn" onClick={exportTimelineCsv} disabled={timeline.length === 0}>
                {t("action.exportTimelineCsv")}
              </button>
            </div>
            {displayWorld ? (
              <>
                {history.length > 0 && (
                  <div className="playback-panel card-lite">
                    <div className="playback-row">
                      <div className="playback-nav">
                        <button className="btn btn-sm" onClick={() => stepFrame(-1)}>
                          {t("action.prev")}
                        </button>
                        <button className="btn btn-sm primary" onClick={handlePlayPause}>
                          {isPlaying ? t("action.pause") : t("action.play")}
                        </button>
                        <button className="btn btn-sm" onClick={() => stepFrame(1)}>
                          {t("action.next")}
                        </button>
                        <span className="playback-status">
                          {t("playback.status", {
                            current: safeFrameIndex + 1,
                            total: history.length,
                            step: activeFrame?.step ?? 0
                          })}
                        </span>
                      </div>
                      <div className="playback-speed">
                        <span>{t("playback.speed")}</span>
                        {PLAY_SPEED_OPTIONS.map((speed) => (
                          <button
                            key={speed}
                            className={`btn btn-sm ${playSpeed === speed ? "active" : ""}`}
                            onClick={() => setPlaySpeed(speed)}
                          >
                            {speed}x
                          </button>
                        ))}
                        <button className="btn btn-sm" onClick={() => setShowVision((v) => !v)}>
                          {showVision ? t("action.hideVision") : t("action.showVision")}
                        </button>
                        <button className="btn btn-sm" onClick={() => setShowTrails((v) => !v)}>
                          {showTrails ? t("action.hideTrails") : t("action.showTrails")}
                        </button>
                      </div>
                    </div>
                    <input
                      className="frame-slider"
                      type="range"
                      min={0}
                      max={Math.max(0, history.length - 1)}
                      step={1}
                      value={safeFrameIndex}
                      onChange={(e) => {
                        setIsPlaying(false);
                        setFrameIndex(Number(e.target.value));
                      }}
                    />
                    <div className="playback-row playback-row-bottom">
                      <div className="playback-nav">
                        <button className="btn btn-sm" onClick={() => jumpKeyframe(-1)}>
                          {t("action.prevKeyframe")}
                        </button>
                        <button className="btn btn-sm" onClick={() => jumpKeyframe(1)}>
                          {t("action.nextKeyframe")}
                        </button>
                      </div>
                      <select
                        className="keyframe-select"
                        value={selectedKeyframe}
                        onChange={(e) => {
                          if (e.target.value === "__current__") return;
                          setIsPlaying(false);
                          setFrameIndex(Number(e.target.value));
                        }}
                      >
                        <option value="__current__">{t("playback.currentFrame")}</option>
                        {keyframes.map((item) => (
                          <option key={item.frameIndex} value={item.frameIndex}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <div className="world-layout">
                  <div className="world-canvas">
                    <WorldSvg
                      world={displayWorld}
                      visionRange={Number(simConfig.vision_range ?? config.vision_range)}
                      showVision={showVision}
                      showTrails={showTrails}
                      showLabels={showLabels}
                      trails={trails}
                      t={t}
                      onHoverChange={setHoverInfo}
                    />
                  </div>
                  <div className="world-legend card-lite">
                    <div className="world-legend-title">{t("world.legend")}</div>
                    <LegendRow color="#0f172a" shape="square" label={t("world.obstacle.label")} desc={t("world.obstacle.desc")} />
                    <LegendRow color="#f59e0b" shape="star" label={t("world.hotspot.label")} desc={t("world.hotspot.desc")} />
                    <LegendRow color="#dc2626" shape="triangle" label={t("world.activeTarget.label")} desc={t("world.activeTarget.desc")} />
                    <LegendRow color="#16a34a" shape="dot" label={t("world.completedTarget.label")} desc={t("world.completedTarget.desc")} />
                    <LegendRow color="#0ea5e9" shape="dot" label={t("world.agent.label")} desc={t("world.agent.desc")} />
                    <LegendRow color="#64748b" shape="dot" label={t("world.failedAgent.label")} desc={t("world.failedAgent.desc")} />
                    <LegendRow color="#7c3aed" shape="line" label={t("world.trail.label")} desc={t("world.trail.desc")} />
                    <LegendRow color="#0ea5e9" shape="ring" label={t("world.vision.label")} desc={t("world.vision.desc")} />
                    <p className="world-note">
                      {history.length > 0
                        ? t("world.frameNote", {
                            current: safeFrameIndex + 1,
                            total: history.length,
                            step: activeFrame?.step ?? 0
                          })
                        : t("world.noHistory")}
                    </p>
                    <p className="world-note">{hoverInfo || t("world.hoverHint")}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="placeholder">{t("placeholder.runSimulationFirst")}</div>
            )}
          </section>

          <section className="card chart-card timeline-card">
            <div className="panel-title-row">
              <h3>{t("panel.timeline")}</h3>
              <div className="timeline-summary-inline">
                <span>{t("timeline.steps", { value: Number(metrics?.steps_used ?? 0).toFixed(0) })}</span>
                <span>
                  {t("timeline.active", {
                    value: Number(timeline.at(-1)?.active_targets ?? 0).toFixed(0)
                  })}
                </span>
                <span>
                  {t("timeline.failed", {
                    value: Number(timeline.at(-1)?.failed_agents ?? 0).toFixed(0)
                  })}
                </span>
              </div>
            </div>
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={timeline} margin={{ top: 8, right: 8, left: 0, bottom: 2 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="step" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="active_targets"
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={false}
                    name={t("timeline.activeTargets")}
                  />
                  <Line
                    type="monotone"
                    dataKey="captures_per_step"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                    name={t("timeline.capturesPerStep")}
                  />
                  <Line
                    type="monotone"
                    dataKey="failed_agents"
                    stroke="#334155"
                    strokeWidth={2}
                    dot={false}
                    name={t("timeline.failedAgents")}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="placeholder compact">{t("placeholder.runSimulationFirst")}</div>
            )}
          </section>

          <section className="panel-grid-2">
            <article className="card chart-card">
              <div className="panel-title-row">
                <h3>{t("panel.scenarioComparison")}</h3>
                <div className="inline-actions">
                  <button className="btn btn-sm" onClick={exportScenarioSummaryCsv} disabled={scenarioRows.length === 0}>
                    {t("action.exportSummaryCsv")}
                  </button>
                  <button className="btn btn-sm" onClick={exportExperimentJson} disabled={!expResult}>
                    {t("action.exportJson")}
                  </button>
                </div>
              </div>
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
                  {expResult && (
                    <p className="robustness">
                      {t("chart.robustness")}:{" "}
                      <strong>{Number(expResult.robustness_index ?? 0).toFixed(4)}</strong>
                    </p>
                  )}
                </>
              ) : (
                <div className="placeholder compact">{t("placeholder.runExperimentsFirst")}</div>
              )}
            </article>

            <article className="card chart-card">
              <div className="panel-title-row">
                <h3>{t("panel.strategyComparison")}</h3>
                <button className="btn btn-sm" onClick={exportStrategyMatrixCsv} disabled={strategyRows.length === 0}>
                  {t("action.exportMatrixCsv")}
                </button>
              </div>
              {strategyComparisonRows.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={strategyComparisonRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="strategy" tickFormatter={strategyLabel} />
                      <YAxis domain={[0, 1]} tickFormatter={(v) => pct(v, 0)} />
                      <Tooltip formatter={(v, n) => [pct(v, 2), n]} />
                      <Legend />
                      <Bar
                        dataKey="with_comm_normal"
                        name={scenarioLabel("with_comm_normal")}
                        fill="#0ea5e9"
                      />
                      <Bar
                        dataKey="without_comm_baseline"
                        name={scenarioLabel("without_comm_baseline")}
                        fill="#64748b"
                      />
                      <Bar
                        dataKey="with_comm_fault"
                        name={scenarioLabel("with_comm_fault")}
                        fill="#14b8a6"
                      />
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
            </article>
          </section>

          <section className="panel-grid-2">
            <article className="card chart-card">
              <div className="panel-title-row">
                <h3>{t("panel.statisticalSummary")}</h3>
                <div className="inline-actions">
                  <select
                    className="panel-select"
                    value={selectedStatMetric}
                    onChange={(e) => setSelectedStatMetric(e.target.value)}
                  >
                    {STAT_METRIC_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {t(item.labelKey)}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-sm"
                    onClick={exportStrategyStatsCsv}
                    disabled={strategyStatRows.length === 0}
                  >
                    {t("action.exportStatsCsv")}
                  </button>
                </div>
              </div>
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
            </article>

            <article className="card chart-card">
              <div className="panel-title-row">
                <h3>{t("panel.benefitCost")}</h3>
                <button className="btn btn-sm" onClick={exportExperimentJson} disabled={!expResult}>
                  {t("action.exportJson")}
                </button>
              </div>
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
            </article>
          </section>

          <section className="card chart-card">
            <div className="panel-title-row">
              <h3>{t("panel.runTradeoff")}</h3>
              <div className="inline-actions">
                <select
                  className="panel-select"
                  value={selectedTradeoffScenario}
                  onChange={(e) => setSelectedTradeoffScenario(e.target.value)}
                >
                  {SCENARIO_KEYS.map((value) => (
                    <option key={value} value={value}>
                      {scenarioLabel(value)}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-sm"
                  onClick={exportRunRowsCsv}
                  disabled={tradeoffRows.length === 0}
                >
                  {t("action.exportRunCsv")}
                </button>
              </div>
            </div>
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
          </section>
        </section>
      </main>
    </div>
  );
}

function LegendRow({ color, shape, label, desc }) {
  return (
    <div className="world-legend-item">
      <span className={`legend-chip ${shape}`} style={{ color }} />
      <div>
        <div className="world-legend-label">{label}</div>
        <div className="world-legend-desc">{desc}</div>
      </div>
    </div>
  );
}

function WorldSvg({
  world,
  visionRange,
  showVision,
  showTrails,
  showLabels,
  trails,
  t,
  onHoverChange
}) {
  const width = 780;
  const height = 600;
  const sx = width / Math.max(1, world.width);
  const sy = height / Math.max(1, world.height);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="world-svg">
      <rect x="0" y="0" width={width} height={height} fill="#f8fafc" />

      {showTrails &&
        Array.from(trails.entries()).map(([id, points]) => {
          if (!Array.isArray(points) || points.length < 2) return null;
          const path = points
            .map((p) => `${(p.x + 0.5) * sx},${height - (p.y + 0.5) * sy}`)
            .join(" ");
          return (
            <polyline
              key={`trail-${id}`}
              points={path}
              fill="none"
              stroke="#7c3aed"
              strokeWidth={Math.max(1.2, sx * 0.08)}
              opacity="0.5"
            />
          );
        })}

      {world.obstacles.map((p, idx) => (
        <rect
          key={`o-${idx}`}
          x={p[0] * sx}
          y={height - (p[1] + 1) * sy}
          width={sx}
          height={sy}
          fill="#0f172a"
          opacity="0.92"
        />
      ))}

      {world.hotspots.map((p, idx) => (
        <circle
          key={`h-${idx}`}
          cx={(p[0] + 0.5) * sx}
          cy={height - (p[1] + 0.5) * sy}
          r={Math.max(5, sx * 0.44)}
          fill="#f59e0b"
          opacity="0.76"
          onMouseEnter={() =>
            onHoverChange?.(t("world.hover.hotspot", { x: p[0], y: p[1] }))
          }
        />
      ))}

      {world.completed_targets.map((p, idx) => (
        <circle
          key={`ct-${idx}`}
          cx={(p.x + 0.5) * sx}
          cy={height - (p.y + 0.5) * sy}
          r={Math.max(3, sx * 0.24)}
          fill="#16a34a"
          onMouseEnter={() =>
            onHoverChange?.(t("world.hover.completedTarget", { x: p.x, y: p.y }))
          }
        />
      ))}

      {world.active_targets.map((p, idx) => (
        <polygon
          key={`at-${idx}`}
          points={`${(p.x + 0.5) * sx},${height - (p.y + 0.18) * sy} ${(p.x + 0.2) * sx},${height - (p.y + 0.82) * sy} ${(p.x + 0.8) * sx},${height - (p.y + 0.82) * sy}`}
          fill="#dc2626"
          onMouseEnter={() =>
            onHoverChange?.(t("world.hover.activeTarget", { x: p.x, y: p.y }))
          }
        />
      ))}

      {world.agents.map((agent, idx) => {
        const cx = (agent.x + 0.5) * sx;
        const cy = height - (agent.y + 0.5) * sy;
        return (
          <g key={`a-${idx}`}>
            {showVision && !agent.failed && (
              <circle
                cx={cx}
                cy={cy}
                r={Math.max(4, visionRange * ((sx + sy) / 2))}
                fill="rgba(14,165,233,0.06)"
                stroke="rgba(14,165,233,0.38)"
                strokeWidth={1}
              />
            )}
            <circle
              cx={cx}
              cy={cy}
              r={Math.max(3, sx * 0.28)}
              fill={agent.failed ? "#64748b" : "#0ea5e9"}
              stroke="#ffffff"
              strokeWidth={1.2}
              onMouseEnter={() =>
                onHoverChange?.(
                  t("world.hover.agent", {
                    id: agent.id,
                    x: agent.x,
                    y: agent.y,
                    state: t(agent.failed ? "status.failed" : "status.active")
                  })
                )
              }
            />
            {showLabels && (
              <text x={cx + 4} y={cy - 4} className="agent-label">
                A{agent.id}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default App;
