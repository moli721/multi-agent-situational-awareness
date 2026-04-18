import React from "react";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import SectionShell from "./SectionShell.jsx";

export default function TimelineStrip({ t, timeline, metrics }) {
  return (
    <SectionShell
      className="timeline-shell card"
      label={t("timeline.kicker")}
      title={t("panel.timeline")}
      actions={
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
      }
    >
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
    </SectionShell>
  );
}
