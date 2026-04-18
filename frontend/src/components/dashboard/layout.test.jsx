import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import App from "../../App.jsx";
import AnalysisPage from "./AnalysisPage.jsx";
import ExperimentDeck from "./ExperimentDeck.jsx";
import HeroHeader from "./HeroHeader.jsx";
import SimulationPage from "./SimulationPage.jsx";
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

test("HeroHeader uses the current frontend host when window location is available", () => {
  const previousWindow = globalThis.window;
  globalThis.window = { location: { host: "127.0.0.1:5174" } };

  try {
    const html = renderToStaticMarkup(
      <HeroHeader
        t={t}
        language="zh"
        setLanguage={() => {}}
        currentPage="simulation"
        onPageChange={() => {}}
        loadingSim={false}
        loadingExp={false}
        onRunSimulation={() => {}}
        onRunExperiments={() => {}}
        metricCards={[]}
      />
    );

    assert.match(html, /127\.0\.0\.1:5174/);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("App renders dedicated simulation navigation and hides analysis panels on the default page", () => {
  const html = renderToStaticMarkup(<App />);

  assert.match(html, /仿真展示/);
  assert.match(html, /实验分析/);
  assert.match(html, /最终态势视图/);
  assert.doesNotMatch(html, /panel\.scenarioComparison/);
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
  assert.match(html, /stage-empty-state/);
  assert.match(html, /placeholder\.simulationGuide/);
});

test("SimulationPage uses thesis-style supporting labels instead of stage summary", () => {
  const html = renderToStaticMarkup(
    <SimulationPage
      t={(key) => key}
      config={{ vision_range: 3 }}
      runs={20}
      history={[]}
      safeFrameIndex={0}
      strategyOptions={[]}
      strategyLabel={(value) => value}
      fieldGroups={[]}
      showVision={true}
      showTrails={true}
      showLabels={false}
      trailLength={120}
      onUpdateField={() => {}}
      onUpdateSelectField={() => {}}
      onRunsChange={() => {}}
      onShowVisionChange={() => {}}
      onShowTrailsChange={() => {}}
      onShowLabelsChange={() => {}}
      onTrailLengthChange={() => {}}
      onFrameIndexChange={() => {}}
      displayWorld={null}
      timeline={[]}
      metrics={null}
      trails={new Map()}
      simConfig={{ vision_range: 3 }}
      activeFrame={null}
      isPlaying={false}
      playSpeed={1}
      selectedKeyframe="__current__"
      keyframes={[]}
      hoverInfo=""
      onHoverChange={() => {}}
      onPlayPause={() => {}}
      onStepFrame={() => {}}
      onJumpKeyframe={() => {}}
      onPlaySpeedChange={() => {}}
      onToggleVision={() => {}}
      onToggleTrails={() => {}}
      onExportTimelineCsv={() => {}}
      metricCards={[]}
      expResult={null}
      derivedCards={[]}
    />
  );

  assert.match(html, /panel\.simulationInfo/);
  assert.doesNotMatch(html, /insight\.stageSummary/);
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

test("AnalysisPage renders a summary band ahead of experiment charts", () => {
  const html = renderToStaticMarkup(
    <AnalysisPage
      t={(key) => key}
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

  assert.match(html, /analysis-summary-band/);
  assert.match(html, /panel\.scenarioComparison/);
  assert.doesNotMatch(html, /panel\.finalWorld/);
});
