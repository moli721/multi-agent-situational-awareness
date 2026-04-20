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
  const gridSize = Math.max(18, Math.min(sx, sy) * 2.2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="world-svg">
      <defs>
        <linearGradient id="world-surface-base" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f9fbff" />
          <stop offset="100%" stopColor="#eef5ff" />
        </linearGradient>
        <radialGradient id="world-surface-glow" cx="18%" cy="14%" r="78%">
          <stop offset="0%" stopColor="rgba(14,165,233,0.16)" />
          <stop offset="100%" stopColor="rgba(14,165,233,0)" />
        </radialGradient>
        <radialGradient id="world-surface-glow-secondary" cx="84%" cy="84%" r="44%">
          <stop offset="0%" stopColor="rgba(20,184,166,0.14)" />
          <stop offset="100%" stopColor="rgba(20,184,166,0)" />
        </radialGradient>
        <pattern id="world-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          <path
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
            fill="none"
            stroke="rgba(125, 156, 195, 0.14)"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      <rect x="0" y="0" width={width} height={height} fill="url(#world-surface-base)" />
      <rect x="0" y="0" width={width} height={height} fill="url(#world-surface-glow)" />
      <rect x="0" y="0" width={width} height={height} fill="url(#world-surface-glow-secondary)" />
      <rect x="0" y="0" width={width} height={height} fill="url(#world-grid)" />

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
              stroke="#6366f1"
              strokeWidth={Math.max(1.1, sx * 0.035)}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.4"
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
          rx={Math.max(1.5, sx * 0.08)}
          fill="#25354a"
          opacity="0.94"
        />
      ))}

      {world.hotspots.map((p, idx) => (
        <g
          key={`h-${idx}`}
          onMouseEnter={() => onHoverChange?.(t("world.hover.hotspot", { x: p[0], y: p[1] }))}
        >
          <circle
            cx={(p[0] + 0.5) * sx}
            cy={height - (p[1] + 0.5) * sy}
            r={Math.max(6, sx * 0.38)}
            fill="rgba(245, 158, 11, 0.15)"
            stroke="rgba(245, 158, 11, 0.9)"
            strokeWidth={Math.max(1.6, sx * 0.06)}
          />
          <circle
            cx={(p[0] + 0.5) * sx}
            cy={height - (p[1] + 0.5) * sy}
            r={Math.max(2.2, sx * 0.1)}
            fill="#f59e0b"
          />
        </g>
      ))}

      {world.completed_targets.map((p, idx) => (
        <g
          key={`ct-${idx}`}
          onMouseEnter={() =>
            onHoverChange?.(t("world.hover.completedTarget", { x: p.x, y: p.y }))
          }
        >
          <circle
            cx={(p.x + 0.5) * sx}
            cy={height - (p.y + 0.5) * sy}
            r={Math.max(4, sx * 0.18)}
            fill="#16a34a"
          />
          <circle
            cx={(p.x + 0.5) * sx}
            cy={height - (p.y + 0.5) * sy}
            r={Math.max(6, sx * 0.26)}
            fill="none"
            stroke="rgba(22, 163, 74, 0.35)"
            strokeWidth={1}
          />
        </g>
      ))}

      {world.active_targets.map((p, idx) => (
        <polygon
          key={`at-${idx}`}
          points={`${(p.x + 0.5) * sx},${height - (p.y + 0.18) * sy} ${(p.x + 0.22) * sx},${height - (p.y + 0.82) * sy} ${(p.x + 0.78) * sx},${height - (p.y + 0.82) * sy}`}
          fill="#ef4444"
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
                fill="rgba(14,165,233,0.05)"
                stroke="rgba(14,165,233,0.22)"
                strokeWidth={1}
              />
            )}
            <circle
              cx={cx}
              cy={cy}
              r={Math.max(3.3, sx * 0.31)}
              fill={agent.failed ? "#7b8798" : "#0ea5e9"}
              stroke="#f8fbff"
              strokeWidth={Math.max(1.4, sx * 0.05)}
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
            <circle
              cx={cx}
              cy={cy}
              r={Math.max(1.2, sx * 0.08)}
              fill="#f8fbff"
              opacity={agent.failed ? 0.7 : 1}
            />
            {showLabels ? (
              <text x={cx + 6} y={cy - 7} className="agent-label">
                A{agent.id}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
