import React from "react";

import LegendRow from "./LegendRow.jsx";
import SectionShell from "./SectionShell.jsx";
import WorldSvg from "./WorldSvg.jsx";

export default function SimulationStage({
  t,
  displayWorld,
  timeline,
  history,
  metrics,
  trails,
  simConfig,
  config,
  safeFrameIndex,
  activeFrame,
  isPlaying,
  playSpeed,
  selectedKeyframe,
  keyframes,
  showVision,
  showTrails,
  showLabels,
  hoverInfo,
  onHoverChange,
  onPlayPause,
  onStepFrame,
  onJumpKeyframe,
  onFrameIndexChange,
  onPlaySpeedChange,
  onToggleVision,
  onToggleTrails,
  onExportTimelineCsv
}) {
  const failedAgents = displayWorld?.agents?.filter((agent) => agent.failed).length ?? 0;
  const activeTargets = displayWorld?.active_targets?.length ?? 0;
  const stageStats = [
    {
      key: "current-frame",
      label: t("playback.currentFrame"),
      value: history.length > 0 ? `${safeFrameIndex + 1}/${history.length}` : "-"
    },
    {
      key: "step",
      label: "Step",
      value: activeFrame?.step ?? "-"
    },
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
    <SectionShell
      className="simulation-stage-shell card"
      label={t("stage.kicker")}
      title={t("panel.finalWorld")}
    >
      {displayWorld ? (
        <div className="stage-viewport card-lite">
          {history.length > 0 ? (
            <div className="stage-toolbar">
              <div className="stage-toolbar-row">
                <div className="stage-toolbar-group">
                  <button className="btn btn-sm" onClick={() => onStepFrame(-1)}>
                    {t("action.prev")}
                  </button>
                  <button className="btn btn-sm primary" onClick={onPlayPause}>
                    {isPlaying ? t("action.pause") : t("action.play")}
                  </button>
                  <button className="btn btn-sm" onClick={() => onStepFrame(1)}>
                    {t("action.next")}
                  </button>
                  <span className="playback-status">
                    {t("playback.status", {
                      current: safeFrameIndex + 1,
                      total: history.length,
                      step: activeFrame?.step ?? 0
                    })}
                  </span>
                </div>
                <div className="stage-toolbar-group stage-toolbar-group-secondary">
                  {[0.5, 1, 2, 4].map((speed) => (
                    <button
                      key={speed}
                      className={`btn btn-sm ${playSpeed === speed ? "active" : ""}`}
                      onClick={() => onPlaySpeedChange(speed)}
                    >
                      {speed}x
                    </button>
                  ))}
                  <button className="btn btn-sm" onClick={onToggleVision}>
                    {showVision ? t("action.hideVision") : t("action.showVision")}
                  </button>
                  <button className="btn btn-sm" onClick={onToggleTrails}>
                    {showTrails ? t("action.hideTrails") : t("action.showTrails")}
                  </button>
                  <button className="btn btn-sm" onClick={onExportTimelineCsv} disabled={timeline.length === 0}>
                    {t("action.exportTimelineCsv")}
                  </button>
                </div>
              </div>

              <div className="stage-toolbar-row stage-toolbar-row-compact">
                <input
                  className="frame-slider"
                  type="range"
                  min={0}
                  max={Math.max(0, history.length - 1)}
                  step={1}
                  value={safeFrameIndex}
                  onChange={(e) => onFrameIndexChange(Number(e.target.value))}
                />

                <div className="stage-toolbar-group stage-toolbar-group-secondary">
                  <button className="btn btn-sm" onClick={() => onJumpKeyframe(-1)}>
                    {t("action.prevKeyframe")}
                  </button>
                  <button className="btn btn-sm" onClick={() => onJumpKeyframe(1)}>
                    {t("action.nextKeyframe")}
                  </button>
                </div>
                <select
                  className="keyframe-select"
                  value={selectedKeyframe}
                  onChange={(e) => {
                    if (e.target.value === "__current__") return;
                    onFrameIndexChange(Number(e.target.value));
                  }}
                >
                  <option value="__current__">{t("playback.currentFrame")}</option>
                  {keyframes.map((item) => (
                    <option key={item.frameIndex} value={item.frameIndex}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          <div className="stage-world-frame">
            <div className="world-canvas stage-world-canvas">
              <WorldSvg
                world={displayWorld}
                visionRange={Number(simConfig?.vision_range ?? config?.vision_range)}
                showVision={showVision}
                showTrails={showTrails}
                showLabels={showLabels}
                trails={trails}
                t={t}
                onHoverChange={onHoverChange}
              />
            </div>
          </div>

          <div className="stage-status-strip">
            <div className="stage-status-grid">
              {stageStats.map((item) => (
                <div className="stage-status-card" key={item.key}>
                  <div className="stage-status-label">{item.label}</div>
                  <div className="stage-status-value">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="stage-legend-inline">
              <div className="stage-legend-inline-title">{t("world.legend")}</div>
              <div className="stage-legend-inline-grid">
                <LegendRow color="#334155" shape="square" label={t("world.obstacle.label")} desc={t("world.obstacle.desc")} />
                <LegendRow color="#0ea5e9" shape="dot" label={t("world.agent.label")} desc={t("world.agent.desc")} />
                <LegendRow color="#ef4444" shape="triangle" label={t("world.activeTarget.label")} desc={t("world.activeTarget.desc")} />
                <LegendRow color="#f59e0b" shape="star" label={t("world.hotspot.label")} desc={t("world.hotspot.desc")} />
                <LegendRow color="#7c3aed" shape="line" label={t("world.trail.label")} desc={t("world.trail.desc")} />
                <LegendRow color="#0ea5e9" shape="ring" label={t("world.vision.label")} desc={t("world.vision.desc")} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="stage-empty-state">
          <div className="stage-empty-graphic" />
          <div className="stage-empty-copy">
            <h4>{t("panel.finalWorld")}</h4>
            <p>{t("placeholder.simulationGuide")}</p>
          </div>
        </div>
      )}
    </SectionShell>
  );
}
