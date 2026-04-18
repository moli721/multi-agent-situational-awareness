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
  return (
    <SectionShell
      className="simulation-stage-shell card"
      label={t("stage.kicker")}
      title={t("panel.finalWorld")}
      actions={
        <button className="btn" onClick={onExportTimelineCsv} disabled={timeline.length === 0}>
          {t("action.exportTimelineCsv")}
        </button>
      }
    >
      {displayWorld ? (
        <>
          {history.length > 0 ? (
            <div className="playback-panel card-lite">
              <div className="playback-row">
                <div className="playback-nav">
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
                <div className="playback-speed">
                  <span>{t("playback.speed")}</span>
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
                </div>
              </div>
              <input
                className="frame-slider"
                type="range"
                min={0}
                max={Math.max(0, history.length - 1)}
                step={1}
                value={safeFrameIndex}
                onChange={(e) => onFrameIndexChange(Number(e.target.value))}
              />
              <div className="playback-row playback-row-bottom">
                <div className="playback-nav">
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

          <div className="world-layout">
            <div className="world-canvas">
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

            <div className="world-legend card-lite">
              <div className="world-legend-title">{t("world.legend")}</div>
              <LegendRow color="#0f172a" shape="square" label={t("world.obstacle.label")} desc={t("world.obstacle.desc")} />
              <LegendRow color="#f59e0b" shape="star" label={t("world.hotspot.label")} desc={t("world.hotspot.desc")} />
              <LegendRow color="#dc2626" shape="triangle" label={t("world.activeTarget.label")} desc={t("world.activeTarget.desc")} />
              <LegendRow color="#16a34a" shape="dot" label={t("world.completedTarget.label")} desc={t("world.completedTarget.desc")} />
              <LegendRow color="#0ea5e9" shape="dot" label={t("world.agent.label")} desc={t("world.agent.desc")} />
              <LegendRow color="#64748b" shape="dot" label={t("world.failedAgent.label")} desc={t("world.failedAgent.desc")} />
              <LegendRow color="#7c3aed" shape="line" label={t("world.trail.label")} desc={t("world.trail.desc")} />
              <LegendRow color="#0ea5e9" shape="ring" label={t("world.vision.label")} desc={t("world.vision.desc")} />
              <p className="world-note">
                {history.length > 0
                  ? t("world.frameNote", {
                      current: safeFrameIndex + 1,
                      total: history.length,
                      step: activeFrame?.step ?? 0
                    })
                  : t("world.noHistory")}
              </p>
              <p className="world-note">{hoverInfo || t("world.hoverHint")}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="placeholder">{t("placeholder.runSimulationFirst")}</div>
      )}
    </SectionShell>
  );
}
