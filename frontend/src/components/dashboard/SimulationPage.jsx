import React from "react";

import ControlRail from "./ControlRail.jsx";
import LiveInsightRail from "./LiveInsightRail.jsx";
import SimulationStage from "./SimulationStage.jsx";
import TimelineStrip from "./TimelineStrip.jsx";

export default function SimulationPage(props) {
  const {
    t,
    config,
    runs,
    history,
    safeFrameIndex,
    strategyOptions,
    strategyLabel,
    fieldGroups,
    showVision,
    showTrails,
    showLabels,
    trailLength,
    onUpdateField,
    onUpdateSelectField,
    onRunsChange,
    onShowVisionChange,
    onShowTrailsChange,
    onShowLabelsChange,
    onTrailLengthChange,
    onFrameIndexChange,
    displayWorld,
    timeline,
    metrics,
    trails,
    simConfig,
    activeFrame,
    isPlaying,
    playSpeed,
    selectedKeyframe,
    keyframes,
    hoverInfo,
    onHoverChange,
    onPlayPause,
    onStepFrame,
    onJumpKeyframe,
    onPlaySpeedChange,
    onToggleVision,
    onToggleTrails,
    onExportTimelineCsv,
    metricCards,
    expResult,
    derivedCards
  } = props;

  return (
    <main className="simulation-page">
      <ControlRail
        t={t}
        config={config}
        runs={runs}
        history={history}
        safeFrameIndex={safeFrameIndex}
        strategyOptions={strategyOptions}
        strategyLabel={strategyLabel}
        fieldGroups={fieldGroups}
        showVision={showVision}
        showTrails={showTrails}
        showLabels={showLabels}
        trailLength={trailLength}
        onUpdateField={onUpdateField}
        onUpdateSelectField={onUpdateSelectField}
        onRunsChange={onRunsChange}
        onShowVisionChange={onShowVisionChange}
        onShowTrailsChange={onShowTrailsChange}
        onShowLabelsChange={onShowLabelsChange}
        onTrailLengthChange={onTrailLengthChange}
        onFrameIndexChange={onFrameIndexChange}
      />

      <section className="simulation-page-content">
        <div className="simulation-stage-row">
          <div className="simulation-stage-pane">
            <SimulationStage
              t={t}
              displayWorld={displayWorld}
              timeline={timeline}
              history={history}
              metrics={metrics}
              trails={trails}
              simConfig={simConfig}
              config={config}
              safeFrameIndex={safeFrameIndex}
              activeFrame={activeFrame}
              isPlaying={isPlaying}
              playSpeed={playSpeed}
              selectedKeyframe={selectedKeyframe}
              keyframes={keyframes}
              showVision={showVision}
              showTrails={showTrails}
              showLabels={showLabels}
              hoverInfo={hoverInfo}
              onHoverChange={onHoverChange}
              onPlayPause={onPlayPause}
              onStepFrame={onStepFrame}
              onJumpKeyframe={onJumpKeyframe}
              onFrameIndexChange={onFrameIndexChange}
              onPlaySpeedChange={onPlaySpeedChange}
              onToggleVision={onToggleVision}
              onToggleTrails={onToggleTrails}
              onExportTimelineCsv={onExportTimelineCsv}
            />
          </div>

          <LiveInsightRail
            t={t}
            metricCards={metricCards}
            hoverInfo={hoverInfo}
            expResult={expResult}
            derivedCards={derivedCards}
            summaryTitleKey="panel.simulationInfo"
          />
        </div>

        <TimelineStrip t={t} timeline={timeline} metrics={metrics} />
      </section>
    </main>
  );
}
