import React from "react";

export default function MetricCard({ label, value, tone = "default", compact = false }) {
  return (
    <article className={`metric-card metric-card-${tone} ${compact ? "metric-card-compact" : ""}`.trim()}>
      <div className="metric-card-label">{label}</div>
      <div className="metric-card-value">{value}</div>
    </article>
  );
}
