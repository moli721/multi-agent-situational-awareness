import React from "react";

import MetricCard from "./MetricCard.jsx";
import SectionShell from "./SectionShell.jsx";

function formatMetricValue(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  if (value <= 1) return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(3);
}

export default function LiveInsightRail({
  t,
  metricCards = [],
  hoverInfo,
  activeFrame,
  history = [],
  safeFrameIndex = 0,
  playSpeed = 1,
  strategyLabel = "-",
  displayWorld,
  summaryTitleKey = "insight.stageSummary"
}) {
  const activeTargets = displayWorld?.active_targets?.length ?? 0;
  const failedAgents = displayWorld?.agents?.filter((agent) => agent.failed).length ?? 0;
  const summaryRows = [
    {
      key: "frame",
      label: t("playback.currentFrame"),
      value: history.length > 0 ? `${safeFrameIndex + 1}/${history.length}` : "-"
    },
    {
      key: "step",
      label: "Step",
      value: activeFrame?.step ?? "-"
    },
    {
      key: "speed",
      label: t("playback.speed"),
      value: `${playSpeed}x`
    },
    {
      key: "strategy",
      label: t("table.strategy"),
      value: strategyLabel || "-"
    }
  ];
  const missionRows = [
    {
      key: "targets",
      label: t("world.activeTarget.label"),
      value: activeTargets
    },
    {
      key: "failed",
      label: t("world.failedAgent.label"),
      value: failedAgents
    }
  ];

  return (
    <aside className="live-insight-rail compact-summary-rail">
      <SectionShell
        className="summary-rail-block card"
        label={t("insight.liveTitle")}
        title={t(summaryTitleKey)}
      >
        <div className="summary-rail-stack">
          {summaryRows.map((item) => (
            <div className="summary-rail-row" key={item.key}>
              <span className="summary-rail-label">{item.label}</span>
              <strong className="summary-rail-value">{item.value}</strong>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell
        className="summary-rail-block card"
        label={t("insight.analyticsTitle")}
        title={t("panel.simulationInfo")}
      >
        <div className="summary-rail-metrics">
          {metricCards.slice(0, 3).map(([label, value], idx) => (
            <MetricCard
              key={`${label}-${idx}`}
              label={label}
              value={formatMetricValue(value)}
              tone={idx === 0 ? "accent" : "default"}
              compact
            />
          ))}
          {missionRows.map((item) => (
            <div className="summary-rail-row summary-rail-row-compact" key={item.key}>
              <span className="summary-rail-label">{item.label}</span>
              <strong className="summary-rail-value">{item.value}</strong>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell
        className="summary-rail-block card"
        label={t("insight.entityTitle")}
        title={t("world.legend")}
      >
        <p className="entity-focus-copy">{hoverInfo || t("world.hoverHint")}</p>
      </SectionShell>
    </aside>
  );
}
