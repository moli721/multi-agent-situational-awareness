import React from "react";

export default function LegendRow({ color, shape, label, desc }) {
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
