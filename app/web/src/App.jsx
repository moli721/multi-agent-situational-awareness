import { useMemo, useState } from "react";
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
  packet_loss_prob: 0.1,
  comm_delay_steps: 1,
  target_move_prob: 0.08,
  target_hotspot_bias: 0.7,
  agent_failure_prob: 0.0,
  fault_injection_start: 40,
  min_tracking_confidence: 0.25,
  belief_decay: 0.08,
  max_shared_targets: 6,
  owner_hint_penalty: 0.18
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
      ["comm_delay_steps", "Delay Steps", "number", 0, 10, 1],
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

function App() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [runs, setRuns] = useState(20);
  const [loadingSim, setLoadingSim] = useState(false);
  const [loadingExp, setLoadingExp] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [expResult, setExpResult] = useState(null);
  const [error, setError] = useState("");

  const metrics = simResult?.metrics ?? null;
  const timeline = simResult?.timeline ?? [];
  const world = simResult?.world ?? null;

  const metricCards = useMemo(() => {
    if (!metrics) return [];
    return [
      ["Completion", metrics.task_completion_rate],
      ["Coverage", metrics.coverage_rate],
      ["Response Steps", metrics.decision_response_time_steps],
      ["Info Age", metrics.average_information_age],
      ["Collab Eff", metrics.collaboration_efficiency],
      ["Conflicts", metrics.assignment_conflicts]
    ];
  }, [metrics]);

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
      const data = await postJson("/api/experiments", { config, runs });
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

  return (
    <div className="page">
      <header className="header card">
        <div>
          <h1>MAS 可视化前端</h1>
          <p>毕业设计演示面板: 参数配置、仿真运行、实验对照、清晰图表输出。</p>
        </div>
        <div className="header-actions">
          <button className="btn primary" onClick={runSimulation} disabled={loadingSim}>
            {loadingSim ? "运行中..." : "运行仿真"}
          </button>
          <button className="btn" onClick={runExperiments} disabled={loadingExp}>
            {loadingExp ? "实验中..." : "运行实验"}
          </button>
        </div>
      </header>

      {error && <div className="error card">{error}</div>}

      <main className="layout">
        <aside className="sidebar card">
          <h2>参数配置</h2>
          <label className="check-line">
            <span>Enable Communication</span>
            <input
              type="checkbox"
              checked={config.enable_communication}
              onChange={(e) => updateField("enable_communication", e.target.checked, true)}
            />
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
                max={100}
                step={1}
                value={runs}
                onChange={(e) => setRuns(Number(e.target.value))}
              />
            </label>
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

          <div className="chart-grid">
            <article className="card chart-card">
              <h3>Timeline</h3>
              {timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeline}>
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
                    />
                    <Line
                      type="monotone"
                      dataKey="failed_agents"
                      stroke="#334155"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="placeholder">先点击“运行仿真”</div>
              )}
            </article>

            <article className="card chart-card">
              <h3>Final World</h3>
              {world ? (
                <WorldSvg world={world} />
              ) : (
                <div className="placeholder">暂无场景数据</div>
              )}
            </article>
          </div>

          <article className="card chart-card">
            <h3>Scenario Comparison</h3>
            {expResult?.rows?.length ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={expResult.rows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="scenario" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="task_completion_rate" fill="#0ea5e9" />
                  <Bar dataKey="coverage_rate" fill="#14b8a6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="placeholder">先点击“运行实验”</div>
            )}
            {expResult && (
              <p className="robustness">
                Robustness Index: <strong>{expResult.robustness_index}</strong>
              </p>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}

function WorldSvg({ world }) {
  const width = 540;
  const height = 540;
  const sx = width / world.width;
  const sy = height / world.height;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="world-svg">
      <rect x="0" y="0" width={width} height={height} fill="#f8fafc" />
      {world.obstacles.map((p, idx) => (
        <rect
          key={`o-${idx}`}
          x={p[0] * sx}
          y={height - (p[1] + 1) * sy}
          width={sx}
          height={sy}
          fill="#0f172a"
          opacity="0.9"
        />
      ))}
      {world.hotspots.map((p, idx) => (
        <circle
          key={`h-${idx}`}
          cx={(p[0] + 0.5) * sx}
          cy={height - (p[1] + 0.5) * sy}
          r={Math.max(5, sx * 0.45)}
          fill="#f59e0b"
          opacity="0.75"
        />
      ))}
      {world.completed_targets.map((p, idx) => (
        <circle
          key={`ct-${idx}`}
          cx={(p.x + 0.5) * sx}
          cy={height - (p.y + 0.5) * sy}
          r={Math.max(3, sx * 0.25)}
          fill="#16a34a"
        />
      ))}
      {world.active_targets.map((p, idx) => (
        <polygon
          key={`at-${idx}`}
          points={`${(p.x + 0.5) * sx},${height - (p.y + 0.2) * sy} ${(p.x + 0.2) * sx},${height - (p.y + 0.8) * sy} ${(p.x + 0.8) * sx},${height - (p.y + 0.8) * sy}`}
          fill="#dc2626"
        />
      ))}
      {world.agents.map((a, idx) => (
        <circle
          key={`a-${idx}`}
          cx={(a.x + 0.5) * sx}
          cy={height - (a.y + 0.5) * sy}
          r={Math.max(3, sx * 0.3)}
          fill={a.failed ? "#64748b" : "#0ea5e9"}
        />
      ))}
    </svg>
  );
}

export default App;
