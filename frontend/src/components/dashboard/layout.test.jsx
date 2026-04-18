import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ExperimentDeck from "./ExperimentDeck.jsx";
import HeroHeader from "./HeroHeader.jsx";
import SimulationStage from "./SimulationStage.jsx";

const t = (key, vars = {}) => {
  if (key === "header.endpoints") {
    return `Frontend: ${vars.frontend}; Backend API: ${vars.backend}.`;
  }
  return key;
};

test("HeroHeader renders title, actions, and endpoints", () => {
  const html = renderToStaticMarkup(
    <HeroHeader
      t={t}
      language="zh"
      setLanguage={() => {}}
      loadingSim={false}
      loadingExp={false}
      onRunSimulation={() => {}}
      onRunExperiments={() => {}}
      metricCards={[
        ["metric.completion", 0.91],
        ["metric.coverage", 0.87]
      ]}
    />
  );

  assert.match(html, /header\.title/);
  assert.match(html, /action\.runSimulation/);
  assert.match(html, /127\.0\.0\.1:8000/);
});

test("SimulationStage renders the main stage title and placeholder shell", () => {
  const html = renderToStaticMarkup(
    <SimulationStage
      t={t}
      displayWorld={null}
      timeline={[]}
      history={[]}
      metrics={null}
      trails={new Map()}
      simConfig={{ vision_range: 3 }}
      config={{ vision_range: 3 }}
      safeFrameIndex={0}
      activeFrame={null}
      isPlaying={false}
      playSpeed={1}
      selectedKeyframe="__current__"
      keyframes={[]}
      showVision={true}
      showTrails={true}
      showLabels={false}
      hoverInfo=""
      onHoverChange={() => {}}
      onPlayPause={() => {}}
      onStepFrame={() => {}}
      onJumpKeyframe={() => {}}
      onFrameIndexChange={() => {}}
      onPlaySpeedChange={() => {}}
      onToggleVision={() => {}}
      onToggleTrails={() => {}}
      onExportTimelineCsv={() => {}}
    />
  );

  assert.match(html, /panel\.finalWorld/);
  assert.match(html, /placeholder\.runSimulationFirst/);
});

test("ExperimentDeck renders analytics sections even before experiment data exists", () => {
  const html = renderToStaticMarkup(
    <ExperimentDeck
      t={t}
      scenarioRows={[]}
      strategyRows={[]}
      strategyComparisonRows={[]}
      robustnessRows={[]}
      strategyStatRows={[]}
      derivedCards={[]}
      derivedComparisonRows={[]}
      filteredTradeoffRows={[]}
      tradeoffRows={[]}
      selectedStatMetric="task_completion_rate"
      selectedTradeoffScenario="with_comm_normal"
      scenarioLabel={(value) => value}
      strategyLabel={(value) => value}
      onSelectedStatMetricChange={() => {}}
      onSelectedTradeoffScenarioChange={() => {}}
      onExportScenarioSummaryCsv={() => {}}
      onExportExperimentJson={() => {}}
      onExportStrategyMatrixCsv={() => {}}
      onExportStrategyStatsCsv={() => {}}
      onExportRunRowsCsv={() => {}}
    />
  );

  assert.match(html, /panel\.scenarioComparison/);
  assert.match(html, /panel\.runTradeoff/);
  assert.match(html, /placeholder\.runExperimentsFirst/);
});
