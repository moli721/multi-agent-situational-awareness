export const STRATEGY_OPTIONS = ["current", "nearest", "random"];
export const SCENARIO_KEYS = ["with_comm_normal", "without_comm_baseline", "with_comm_fault"];

export const STRATEGY_COLORS = {
  current: "#0ea5e9",
  nearest: "#14b8a6",
  random: "#f97316"
};

export const STAT_METRIC_OPTIONS = [
  { value: "task_completion_rate", labelKey: "statMetric.task_completion_rate" },
  { value: "task_completion_latency", labelKey: "statMetric.task_completion_latency" },
  { value: "coverage_rate", labelKey: "statMetric.coverage_rate" },
  { value: "messages_sent", labelKey: "statMetric.messages_sent" },
  { value: "average_information_age", labelKey: "statMetric.average_information_age" },
  { value: "assignment_conflicts", labelKey: "statMetric.assignment_conflicts" }
];

export const PLAY_SPEED_OPTIONS = [0.5, 1, 2, 4];

export const DEFAULT_CONFIG = {
  random_seed: 2026,
  width: 42,
  height: 42,
  num_agents: 12,
  num_targets: 14,
  num_obstacles: 70,
  max_steps: 160,
  vision_range: 3,
  comm_range: 10,
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
  max_shared_targets: 3,
  owner_hint_penalty: 0.6,
  decision_strategy: "current"
};

export const FIELD_GROUPS = [
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

export function pct(v, digits = 1) {
  return `${(Number(v) * 100).toFixed(digits)}%`;
}

export function downloadText(filename, content, mime = "text/plain;charset=utf-8") {
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

export function rowsToCsv(headers, rows) {
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

export function buildWorldFromFrame(frame, config) {
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

export function buildTrails(history, frameIndex, trailLength) {
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

export function enrichTimeline(timeline) {
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

export function buildPlaybackKeyframes(timeline, t) {
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
