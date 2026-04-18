import React from "react";

export default function WorldSvg({
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
          onMouseEnter={() => onHoverChange?.(t("world.hover.hotspot", { x: p[0], y: p[1] }))}
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
            {showLabels ? (
              <text x={cx + 4} y={cy - 4} className="agent-label">
                A{agent.id}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
