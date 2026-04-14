import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const STRATEGY_OPTIONS = [
  { value: "current", label: "Collaborative" },
  { value: "nearest", label: "Nearest" },
  { value: "random", label: "Random" }
];

const SCENARIO_LABELS = {
  with_comm_normal: "Comm Normal",
  without_comm_baseline: "No Comm",
  with_comm_fault: "Comm Fault"
};

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
    title: "World",
    fields: [
      ["random_seed", "Seed", "number", 1, 999999, 1],
      ["width", "Width", "number", 20, 80, 1],
      ["height", "Height", "number", 20, 80, 1],
      ["num_agents", "Agents", "number", 4, 40, 1],
      ["num_targets", "Targets", "number", 4, 40, 1],
      ["num_obstacles", "Obstacles", "number", 0, 220, 1],
      ["max_steps", "Max Steps", "number", 40, 500, 1]
    ]
  },
  {
    title: "Perception & Comm",
    fields: [
      ["vision_range", "Vision", "number", 1, 12, 1],
      ["comm_range", "Comm Range", "number", 1, 20, 1],
      ["sense_miss_prob", "Sense Miss", "number", 0, 0.9, 0.01],
      ["packet_loss_prob", "Packet Loss", "number", 0, 0.95, 0.01],
      ["comm_delay_steps", "Delay", "number", 0, 10, 1],
      ["max_shared_targets", "Shared Targets", "number", 1, 30, 1]
    ]
  },
  {
    title: "Dynamics",
    fields: [
      ["target_move_prob", "Target Move", "number", 0, 0.9, 0.01],
      ["target_hotspot_bias", "Hotspot Bias", "number", 0, 1, 0.01],
      ["agent_failure_prob", "Failure Prob", "number", 0, 0.2, 0.001],
      ["fault_injection_start", "Fault Start", "number", 0, 500, 1],
      ["min_tracking_confidence", "Min Confidence", "number", 0.05, 0.95, 0.01],
      ["belief_decay", "Belief Decay", "number", 0, 0.5, 0.01],
      ["owner_hint_penalty", "Owner Penalty", "number", 0, 1, 0.01]
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

function buildPlaybackKeyframes(timeline) {
  if (!Array.isArray(timeline) || timeline.length === 0) return [];
  const result = [{ frameIndex: 0, label: "Step 0 | Start" }];
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
    if (captures > 0) tags.push(`+${captures} cap`);
    if (failedDelta > 0) tags.push(`+${failedDelta} fail`);
    result.push({
      frameIndex: idx,
      label: `Step ${row.step}${tags.length ? ` | ${tags.join(", ")}` : ""}`
    });
    prevFailed = failed;
  }

  const dedup = new Map();
  for (const item of result) dedup.set(item.frameIndex, item);
  return Array.from(dedup.values()).sort((a, b) => a.frameIndex - b.frameIndex);
}

function App() {
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
  const keyframes = useMemo(() => buildPlaybackKeyframes(timeline), [timeline]);
  const selectedKeyframe = useMemo(
    () =>
      keyframes.some((item) => item.frameIndex === safeFrameIndex)
        ? String(safeFrameIndex)
        : "__current__",
    [keyframes, safeFrameIndex]
  );

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
      ["Completion", metrics.task_completion_rate],
      ["Coverage", metrics.coverage_rate],
      [
        "Completion Latency",
        metrics.task_completion_latency ?? metrics.decision_response_time_steps
      ],
      ["Info Age", metrics.average_information_age],
      ["Collab Eff", metrics.collaboration_efficiency],
      ["Conflicts", metrics.assignment_conflicts]
    ];
  }, [metrics]);

  const scenarioRows = useMemo(() => {
    const rows = Array.isArray(expResult?.rows) ? expResult.rows : [];
    return rows.map((row) => ({
      ...row,
      scenario_label: SCENARIO_LABELS[row.scenario] ?? row.scenario,
      completion_pct: Number(row.task_completion_rate ?? 0) * 100,
      coverage_pct: Number(row.coverage_rate ?? 0) * 100
    }));
  }, [expResult]);

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
        strategies: STRATEGY_OPTIONS.map((item) => item.value)
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
        <div>
          <h1>Multi-Agent Situational Awareness</h1>
          <p>
            Enhanced world map for interpretation, compact timeline, and algorithm comparison
            experiments.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn primary" onClick={runSimulation} disabled={loadingSim}>
            {loadingSim ? "Running..." : "Run Simulation"}
          </button>
          <button className="btn" onClick={runExperiments} disabled={loadingExp}>
            {loadingExp ? "Running..." : "Run Experiments"}
          </button>
        </div>
      </header>

      {error && <div className="error card">{error}</div>}

      <main className="layout">
        <aside className="sidebar card">
          <h2>Configuration</h2>
          <label className="check-line">
            <span>Enable Communication</span>
            <input
              type="checkbox"
              checked={config.enable_communication}
              onChange={(e) => updateField("enable_communication", e.target.checked, true)}
            />
          </label>
          <label className="field">
            <span>Decision Strategy</span>
            <select
              value={config.decision_strategy}
              onChange={(e) => updateSelectField("decision_strategy", e.target.value)}
            >
              {STRATEGY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {FIELD_GROUPS.map((group) => (
            <section key={group.title} className="group">
              <h3>{group.title}</h3>
              {group.fields.map(([key, label, type, min, max, step]) => (
                <label key={key} className="field">
                  <span>{label}</span>
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
            <h3>Experiment</h3>
            <label className="field">
              <span>Monte Carlo Runs</span>
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
            <h3>Map Layers</h3>
            <label className="check-line">
              <span>Show Vision Range</span>
              <input
                type="checkbox"
                checked={showVision}
                onChange={(e) => setShowVision(e.target.checked)}
              />
            </label>
            <label className="check-line">
              <span>Show Agent Trails</span>
              <input
                type="checkbox"
                checked={showTrails}
                onChange={(e) => setShowTrails(e.target.checked)}
              />
            </label>
            <label className="check-line">
              <span>Show Agent Labels</span>
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
            </label>
            <label className="field">
              <span>Trail Length</span>
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
                <span>Frame</span>
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
              <h3>Final World (Enhanced)</h3>
              <button className="btn" onClick={exportTimelineCsv} disabled={timeline.length === 0}>
                Export Timeline CSV
              </button>
            </div>
            {displayWorld ? (
              <>
                {history.length > 0 && (
                  <div className="playback-panel card-lite">
                    <div className="playback-row">
                      <div className="playback-nav">
                        <button className="btn btn-sm" onClick={() => stepFrame(-1)}>
                          Prev
                        </button>
                        <button className="btn btn-sm primary" onClick={handlePlayPause}>
                          {isPlaying ? "Pause" : "Play"}
                        </button>
                        <button className="btn btn-sm" onClick={() => stepFrame(1)}>
                          Next
                        </button>
                        <span className="playback-status">
                          Frame {safeFrameIndex + 1}/{history.length} | Step {activeFrame?.step ?? 0}
                        </span>
                      </div>
                      <div className="playback-speed">
                        <span>Speed</span>
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
                          {showVision ? "Hide Vision" : "Show Vision"}
                        </button>
                        <button className="btn btn-sm" onClick={() => setShowTrails((v) => !v)}>
                          {showTrails ? "Hide Trails" : "Show Trails"}
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
                          Prev Keyframe
                        </button>
                        <button className="btn btn-sm" onClick={() => jumpKeyframe(1)}>
                          Next Keyframe
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
                        <option value="__current__">Current Frame</option>
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
                      onHoverChange={setHoverInfo}
                    />
                  </div>
                  <div className="world-legend card-lite">
                    <div className="world-legend-title">Map Legend</div>
                    <LegendRow color="#0f172a" shape="square" label="Obstacle" desc="Blocked cells." />
                    <LegendRow color="#f59e0b" shape="star" label="Hotspot" desc="Target-biased region." />
                    <LegendRow color="#dc2626" shape="triangle" label="Active Target" desc="Pending target." />
                    <LegendRow color="#16a34a" shape="dot" label="Completed Target" desc="Already handled." />
                    <LegendRow color="#0ea5e9" shape="dot" label="Agent" desc="Active unit." />
                    <LegendRow color="#64748b" shape="dot" label="Failed Agent" desc="Unavailable unit." />
                    <LegendRow color="#7c3aed" shape="line" label="Agent Trail" desc="Recent movement path." />
                    <LegendRow color="#0ea5e9" shape="ring" label="Vision Range" desc="Perception radius." />
                    <p className="world-note">
                      {history.length > 0
                        ? `Frame ${safeFrameIndex + 1}/${history.length} (step ${activeFrame?.step ?? 0}).`
                        : "No trajectory history yet."}
                    </p>
                    <p className="world-note">{hoverInfo || "Hover an agent/target for details."}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="placeholder">Run simulation to render world map.</div>
            )}
          </section>

          <section className="card chart-card timeline-card">
            <div className="panel-title-row">
              <h3>Timeline (Compact)</h3>
              <div className="timeline-summary-inline">
                <span>Steps {Number(metrics?.steps_used ?? 0).toFixed(0)}</span>
                <span>Active {Number(timeline.at(-1)?.active_targets ?? 0).toFixed(0)}</span>
                <span>Failed {Number(timeline.at(-1)?.failed_agents ?? 0).toFixed(0)}</span>
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
                  <Line type="monotone" dataKey="active_targets" stroke="#dc2626" strokeWidth={2} dot={false} name="Active Targets" />
                  <Line type="monotone" dataKey="captures_per_step" stroke="#16a34a" strokeWidth={2} dot={false} name="Captures/Step" />
                  <Line type="monotone" dataKey="failed_agents" stroke="#334155" strokeWidth={2} dot={false} name="Failed Agents" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="placeholder compact">Run simulation first.</div>
            )}
          </section>

          <section className="panel-grid-2">
            <article className="card chart-card">
              <div className="panel-title-row">
                <h3>Scenario Comparison</h3>
                <div className="inline-actions">
                  <button className="btn btn-sm" onClick={exportScenarioSummaryCsv} disabled={scenarioRows.length === 0}>
                    Export Summary CSV
                  </button>
                  <button className="btn btn-sm" onClick={exportExperimentJson} disabled={!expResult}>
                    Export JSON
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
                      <Bar dataKey="completion_pct" name="Completion" fill="#0ea5e9" />
                      <Bar dataKey="coverage_pct" name="Coverage" fill="#14b8a6" />
                    </BarChart>
                  </ResponsiveContainer>
                  {expResult && (
                    <p className="robustness">
                      Robustness Index: <strong>{Number(expResult.robustness_index ?? 0).toFixed(4)}</strong>
                    </p>
                  )}
                </>
              ) : (
                <div className="placeholder compact">Run experiments first.</div>
              )}
            </article>

            <article className="card chart-card">
              <div className="panel-title-row">
                <h3>Strategy Comparison</h3>
                <button className="btn btn-sm" onClick={exportStrategyMatrixCsv} disabled={strategyRows.length === 0}>
                  Export Matrix CSV
                </button>
              </div>
              {strategyComparisonRows.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={strategyComparisonRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="strategy" />
                      <YAxis domain={[0, 1]} tickFormatter={(v) => pct(v, 0)} />
                      <Tooltip formatter={(v, n) => [pct(v, 2), n]} />
                      <Legend />
                      <Bar dataKey="with_comm_normal" name="Comm Normal" fill="#0ea5e9" />
                      <Bar dataKey="without_comm_baseline" name="No Comm" fill="#64748b" />
                      <Bar dataKey="with_comm_fault" name="Comm Fault" fill="#14b8a6" />
                    </BarChart>
                  </ResponsiveContainer>
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={robustnessRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="strategy" />
                      <YAxis domain={[0, "auto"]} />
                      <Tooltip formatter={(v) => [Number(v).toFixed(4), "Robustness"]} />
                      <Bar dataKey="robustness" name="Robustness" fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="placeholder compact">Run experiments first.</div>
              )}
            </article>
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
          onMouseEnter={() => onHoverChange?.(`Hotspot (${p[0]}, ${p[1]})`)}
        />
      ))}

      {world.completed_targets.map((p, idx) => (
        <circle
          key={`ct-${idx}`}
          cx={(p.x + 0.5) * sx}
          cy={height - (p.y + 0.5) * sy}
          r={Math.max(3, sx * 0.24)}
          fill="#16a34a"
          onMouseEnter={() => onHoverChange?.(`Completed target (${p.x}, ${p.y})`)}
        />
      ))}

      {world.active_targets.map((p, idx) => (
        <polygon
          key={`at-${idx}`}
          points={`${(p.x + 0.5) * sx},${height - (p.y + 0.18) * sy} ${(p.x + 0.2) * sx},${height - (p.y + 0.82) * sy} ${(p.x + 0.8) * sx},${height - (p.y + 0.82) * sy}`}
          fill="#dc2626"
          onMouseEnter={() => onHoverChange?.(`Active target (${p.x}, ${p.y})`)}
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
                  `Agent ${agent.id} | (${agent.x}, ${agent.y}) | ${
                    agent.failed ? "failed" : "active"
                  }`
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
