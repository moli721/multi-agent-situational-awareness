# Simulation Stage Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the simulation page so the world stage becomes the dominant thesis-defense surface while preserving existing simulation behavior.

**Architecture:** Keep the existing simulation data flow and components, but reorganize presentation responsibilities. The implementation will refactor the center stage into one continuous surface, compress the right rail into a narrow summary column, and update the SVG symbol language plus CSS styling to match the approved academic-sandtable direction.

**Tech Stack:** React 18, Vite, CSS, Node test runner, react-dom/server static markup tests

---

## File Structure

- Modify: `frontend/src/components/dashboard/layout.test.jsx`
  Add failing assertions for the new stage shell, summary rail, and stage status structure.
- Modify: `frontend/src/components/dashboard/SimulationPage.jsx`
  Keep three-column composition but pass stage-adjacent summary data into the right rail.
- Modify: `frontend/src/components/dashboard/SimulationStage.jsx`
  Replace the fragmented stage layout with an integrated stage viewport, toolbar, and bottom status strip.
- Modify: `frontend/src/components/dashboard/LiveInsightRail.jsx`
  Replace the equal-weight cards with a narrow summary rail focused on status, mission snapshot, and entity focus.
- Modify: `frontend/src/components/dashboard/WorldSvg.jsx`
  Redraw the field, trails, obstacles, hotspots, targets, and agents with a more coherent symbol language.
- Modify: `frontend/src/styles.css`
  Add the new stage, toolbar, right-rail, and world-surface styles while preserving existing responsive behavior.

### Task 1: Lock in the New Stage Structure with Tests

**Files:**
- Modify: `frontend/src/components/dashboard/layout.test.jsx`
- Test: `frontend/src/components/dashboard/layout.test.jsx`

- [ ] **Step 1: Write the failing markup assertions for the integrated stage and narrow summary rail**

```jsx
test("SimulationStage renders an integrated stage viewport and compact status strip", () => {
  const html = renderToStaticMarkup(
    <SimulationStage
      t={(key, vars = {}) =>
        key === "playback.status"
          ? `frame ${vars.current}/${vars.total} step ${vars.step}`
          : key
      }
      displayWorld={{
        width: 10,
        height: 8,
        obstacles: [[1, 1]],
        hotspots: [[2, 2]],
        active_targets: [{ x: 6, y: 3 }],
        completed_targets: [{ x: 4, y: 5 }],
        agents: [{ id: 1, x: 3, y: 4, failed: false }]
      }}
      timeline={[{ step: 1 }]}
      history={[{ step: 1 }, { step: 2 }]}
      metrics={null}
      trails={new Map([[1, [{ x: 2, y: 3 }, { x: 3, y: 4 }]]])}
      simConfig={{ vision_range: 3 }}
      config={{ vision_range: 3 }}
      safeFrameIndex={1}
      activeFrame={{ step: 2 }}
      isPlaying={false}
      playSpeed={2}
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

  assert.match(html, /stage-viewport/);
  assert.match(html, /stage-toolbar/);
  assert.match(html, /stage-status-strip/);
  assert.match(html, /stage-legend-inline/);
});

test("SimulationPage renders a narrow simulation summary rail with entity focus", () => {
  const html = renderToStaticMarkup(
    <SimulationPage
      t={(key) => key}
      config={{ vision_range: 3 }}
      runs={20}
      history={[{ step: 1 }]}
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
      activeFrame={{ step: 1 }}
      isPlaying={false}
      playSpeed={1}
      selectedKeyframe="__current__"
      keyframes={[]}
      hoverInfo="agent hover"
      onHoverChange={() => {}}
      onPlayPause={() => {}}
      onStepFrame={() => {}}
      onJumpKeyframe={() => {}}
      onPlaySpeedChange={() => {}}
      onToggleVision={() => {}}
      onToggleTrails={() => {}}
      onExportTimelineCsv={() => {}}
      metricCards={[["metric.coverage", 0.92]]}
      expResult={null}
      derivedCards={[]}
    />
  );

  assert.match(html, /live-insight-rail compact-summary-rail/);
  assert.match(html, /summary-rail-block/);
  assert.match(html, /entity-focus-copy/);
});
```

- [ ] **Step 2: Run the focused test file and verify it fails for the new class names**

Run: `npm test -- src/components/dashboard/layout.test.jsx --runInBand`

Expected: FAIL with missing `stage-viewport`, `stage-toolbar`, or `compact-summary-rail` markup.

- [ ] **Step 3: Add the minimal test scaffolding imports or helper adjustments if the failure is caused by fixture shape instead of missing markup**

```jsx
const t = (key, vars = {}) => {
  if (key === "header.endpoints") {
    return `Frontend: ${vars.frontend}; Backend API: ${vars.backend}.`;
  }
  if (key === "playback.status") {
    return `frame ${vars.current}/${vars.total} step ${vars.step}`;
  }
  return key;
};
```

- [ ] **Step 4: Re-run the focused layout test until it fails for the intended structural assertions**

Run: `npm test -- src/components/dashboard/layout.test.jsx --runInBand`

Expected: FAIL only because the new structure is not implemented yet.

- [ ] **Step 5: Commit the test-first checkpoint**

```bash
git add frontend/src/components/dashboard/layout.test.jsx
git commit -m "test: cover simulation stage refresh layout"
```

### Task 2: Refactor the Center Stage into One Continuous Presentation Surface

**Files:**
- Modify: `frontend/src/components/dashboard/SimulationStage.jsx`
- Modify: `frontend/src/components/dashboard/SimulationPage.jsx`
- Test: `frontend/src/components/dashboard/layout.test.jsx`

- [ ] **Step 1: Implement the integrated stage viewport in `SimulationStage.jsx`**

```jsx
const stageStats = [
  {
    key: "current",
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
    value: displayWorld?.active_targets?.length ?? 0
  },
  {
    key: "failed",
    label: t("world.failedAgent.label"),
    value: displayWorld?.agents?.filter((agent) => agent.failed).length ?? 0
  }
];
```

```jsx
<div className="stage-viewport card-lite">
  {history.length > 0 ? (
    <div className="stage-toolbar">
      <div className="stage-toolbar-group">
        <button className="btn btn-sm" onClick={() => onStepFrame(-1)}>{t("action.prev")}</button>
        <button className="btn btn-sm primary" onClick={onPlayPause}>
          {isPlaying ? t("action.pause") : t("action.play")}
        </button>
        <button className="btn btn-sm" onClick={() => onStepFrame(1)}>{t("action.next")}</button>
        <span className="playback-status">
          {t("playback.status", { current: safeFrameIndex + 1, total: history.length, step: activeFrame?.step ?? 0 })}
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
      </div>
    </div>
  ) : null}

  <div className="stage-world-frame">
    <WorldSvg ... />
  </div>

  <div className="stage-status-strip">
    {stageStats.map((item) => (
      <div className="stage-status-card" key={item.key}>
        <div className="stage-status-label">{item.label}</div>
        <div className="stage-status-value">{item.value}</div>
      </div>
    ))}
    <div className="stage-legend-inline">
      <LegendRow color="#334155" shape="square" label={t("world.obstacle.label")} desc={t("world.obstacle.desc")} />
      <LegendRow color="#0ea5e9" shape="dot" label={t("world.agent.label")} desc={t("world.agent.desc")} />
      <LegendRow color="#ef4444" shape="triangle" label={t("world.activeTarget.label")} desc={t("world.activeTarget.desc")} />
    </div>
  </div>
</div>
```

- [ ] **Step 2: Keep `SimulationPage.jsx` as a three-zone shell, but wire stage-adjacent summary props into the right rail**

```jsx
<LiveInsightRail
  t={t}
  metricCards={metricCards}
  hoverInfo={hoverInfo}
  activeFrame={activeFrame}
  history={history}
  playSpeed={playSpeed}
  strategyLabel={strategyLabel(config?.decision_strategy)}
  displayWorld={displayWorld}
  summaryTitleKey="panel.simulationInfo"
/>
```

- [ ] **Step 3: Run the layout test file and verify the new stage structure passes**

Run: `npm test -- src/components/dashboard/layout.test.jsx --runInBand`

Expected: PASS for the new stage and summary-rail assertions.

- [ ] **Step 4: Refactor duplicated local expressions only after the focused tests are green**

```jsx
const failedAgents = displayWorld?.agents?.filter((agent) => agent.failed).length ?? 0;
const activeTargets = displayWorld?.active_targets?.length ?? 0;
const playbackSummary = history.length > 0
  ? t("playback.status", { current: safeFrameIndex + 1, total: history.length, step: activeFrame?.step ?? 0 })
  : t("world.noHistory");
```

- [ ] **Step 5: Commit the stage-structure checkpoint**

```bash
git add frontend/src/components/dashboard/SimulationPage.jsx frontend/src/components/dashboard/SimulationStage.jsx
git commit -m "feat: restructure simulation stage layout"
```

### Task 3: Compress the Right Rail into a Thesis Summary Column

**Files:**
- Modify: `frontend/src/components/dashboard/LiveInsightRail.jsx`
- Test: `frontend/src/components/dashboard/layout.test.jsx`

- [ ] **Step 1: Replace the equal-weight cards with compact summary blocks**

```jsx
const summaryRows = [
  {
    key: "frame",
    label: t("playback.currentFrame"),
    value: history.length > 0 ? `${history.length}` : "-"
  },
  {
    key: "speed",
    label: t("playback.speed"),
    value: `${playSpeed}x`
  },
  {
    key: "strategy",
    label: t("table.strategy"),
    value: strategyLabel || "-"
  }
];
```

```jsx
<aside className="live-insight-rail compact-summary-rail">
  <SectionShell className="summary-rail-block card" label={t("insight.liveTitle")} title={t(summaryTitleKey)}>
    <div className="summary-rail-stack">
      {summaryRows.map((item) => (
        <div className="summary-rail-row" key={item.key}>
          <span className="summary-rail-label">{item.label}</span>
          <strong className="summary-rail-value">{item.value}</strong>
        </div>
      ))}
    </div>
  </SectionShell>

  <SectionShell className="summary-rail-block card" label={t("insight.analyticsTitle")} title={t("panel.simulationInfo")}>
    <div className="summary-rail-metrics">
      {metricCards.slice(0, 3).map(([label, value], idx) => (
        <MetricCard
          key={`${label}-${idx}`}
          label={label}
          value={formatMetricValue(value)}
          tone={idx === 0 ? "accent" : "default"}
          compact
        />
      ))}
    </div>
  </SectionShell>

  <SectionShell className="summary-rail-block card" label={t("insight.entityTitle")} title={t("world.legend")}>
    <p className="entity-focus-copy">{hoverInfo || t("world.hoverHint")}</p>
  </SectionShell>
</aside>
```

- [ ] **Step 2: Run the focused layout test to verify the rail assertions now pass**

Run: `npm test -- src/components/dashboard/layout.test.jsx --runInBand`

Expected: PASS with `compact-summary-rail`, `summary-rail-block`, and `entity-focus-copy` present.

- [ ] **Step 3: Commit the summary-rail checkpoint**

```bash
git add frontend/src/components/dashboard/LiveInsightRail.jsx
git commit -m "feat: compress simulation summary rail"
```

### Task 4: Refresh the SVG Symbol Language and CSS Styling

**Files:**
- Modify: `frontend/src/components/dashboard/WorldSvg.jsx`
- Modify: `frontend/src/styles.css`
- Test: `frontend/src/components/dashboard/layout.test.jsx`

- [ ] **Step 1: Redraw the SVG field and symbols with a thesis-friendly sandtable language**

```jsx
<svg viewBox={`0 0 ${width} ${height}`} className="world-svg">
  <defs>
    <pattern id="world-grid" width={24} height={24} patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(116, 149, 190, 0.16)" strokeWidth="1" />
    </pattern>
    <radialGradient id="stage-glow" cx="20%" cy="18%" r="80%">
      <stop offset="0%" stopColor="rgba(14,165,233,0.12)" />
      <stop offset="100%" stopColor="rgba(14,165,233,0)" />
    </radialGradient>
  </defs>

  <rect x="0" y="0" width={width} height={height} fill="#f7fbff" />
  <rect x="0" y="0" width={width} height={height} fill="url(#stage-glow)" />
  <rect x="0" y="0" width={width} height={height} fill="url(#world-grid)" />
```

```jsx
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
```

```jsx
{world.agents.map((agent, idx) => {
  const cx = (agent.x + 0.5) * sx;
  const cy = height - (agent.y + 0.5) * sy;
  return (
    <g key={`a-${idx}`}>
      {showVision && !agent.failed ? (
        <circle
          cx={cx}
          cy={cy}
          r={Math.max(4, visionRange * ((sx + sy) / 2))}
          fill="rgba(14,165,233,0.05)"
          stroke="rgba(14,165,233,0.22)"
          strokeWidth={1}
        />
      ) : null}
      <circle cx={cx} cy={cy} r={Math.max(3.2, sx * 0.26)} fill={agent.failed ? "#7b8798" : "#0ea5e9"} />
      <circle cx={cx} cy={cy} r={Math.max(1.2, sx * 0.08)} fill="#f8fbff" />
    </g>
  );
})}
```

- [ ] **Step 2: Replace the stage and rail CSS with the approved hierarchy**

```css
.simulation-stage-row {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(240px, 0.55fr);
  gap: 18px;
  align-items: start;
}

.stage-viewport {
  display: grid;
  gap: 0;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(circle at 10% 10%, rgba(14, 165, 233, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(241, 247, 255, 0.94));
}

.stage-toolbar,
.stage-status-strip {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
}

.stage-world-frame {
  padding: 0 16px 16px;
}

.compact-summary-rail {
  gap: 12px;
}

.summary-rail-block .section-shell-body,
.summary-rail-stack {
  display: grid;
  gap: 10px;
}

.summary-rail-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}
```

- [ ] **Step 3: Run the full frontend test suite**

Run: `npm test -- --runInBand`

Expected: PASS with all existing tests green after the layout and SVG refactor.

- [ ] **Step 4: Launch a local preview and manually verify the desktop hierarchy before final cleanup**

Run: `npm run dev -- --host 127.0.0.1`

Expected: the center stage reads as the dominant surface, the right rail is clearly secondary, and the world symbols feel more coherent than the current implementation.

- [ ] **Step 5: Commit the visual refresh checkpoint**

```bash
git add frontend/src/components/dashboard/WorldSvg.jsx frontend/src/styles.css
git commit -m "feat: refresh simulation stage visuals"
```

### Task 5: Final Regression Pass

**Files:**
- Verify: `frontend/src/components/dashboard/layout.test.jsx`
- Verify: `frontend/src/components/dashboard/SimulationPage.jsx`
- Verify: `frontend/src/components/dashboard/SimulationStage.jsx`
- Verify: `frontend/src/components/dashboard/LiveInsightRail.jsx`
- Verify: `frontend/src/components/dashboard/WorldSvg.jsx`
- Verify: `frontend/src/styles.css`

- [ ] **Step 1: Re-run the focused layout tests one more time**

Run: `npm test -- src/components/dashboard/layout.test.jsx --runInBand`

Expected: PASS for the simulation layout, stage, and page-structure coverage.

- [ ] **Step 2: Re-run the full frontend test suite**

Run: `npm test -- --runInBand`

Expected: PASS with 0 failures.

- [ ] **Step 3: Inspect the worktree diff before handoff**

Run: `git status --short`

Expected: only the planned frontend files and the plan doc appear as modified or committed work.

- [ ] **Step 4: Prepare a concise handoff summary**

```text
Changed the simulation page composition, integrated the stage viewport, compressed the right summary rail, and refreshed the world SVG styling. Verified with the focused layout tests and the full frontend test suite.
```
