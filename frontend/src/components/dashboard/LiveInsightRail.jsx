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
  expResult,
  derivedCards = [],
  summaryTitleKey = "insight.stageSummary"
}) {
  return (
    <aside className="live-insight-rail">
      <SectionShell
        className="stage-insight-card card"
        label={t("insight.liveTitle")}
        title={t(summaryTitleKey)}
      >
        <div className="live-insight-grid">
          {metricCards.slice(0, 4).map(([label, value], idx) => (
            <MetricCard
              key={`${label}-${idx}`}
              label={label}
              value={formatMetricValue(value)}
              tone={idx === 0 ? "accent" : "default"}
            />
          ))}
        </div>
      </SectionShell>

      <SectionShell
        className="stage-insight-card card"
        label={t("insight.entityTitle")}
        title={t("world.legend")}
      >
        <p className="world-note">{hoverInfo || t("world.hoverHint")}</p>
      </SectionShell>

      <SectionShell
        className="stage-insight-card card"
        label={t("insight.analyticsTitle")}
        title={t("chart.robustness")}
      >
        <div className="insight-stack">
          <div className="insight-card card-lite">
            <div className="insight-label">{t("chart.robustness")}</div>
            <div className="insight-value">
              {Number(expResult?.robustness_index ?? 0).toFixed(4)}
            </div>
          </div>
          {derivedCards.slice(0, 2).map((card) => (
            <div className="insight-card card-lite" key={card.key}>
              <div className="insight-label">{t(card.key)}</div>
              <div className="insight-value">{card.value}</div>
            </div>
          ))}
        </div>
      </SectionShell>
    </aside>
  );
}
