# Frontend Command Stage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the frontend into a command-stage presentation layout that elevates the simulation map, keeps experiment analytics intact, and preserves existing simulation/experiment behavior.

**Architecture:** Extract the current monolithic `App.jsx` into a page container plus focused presentation components, move reusable data/formatting helpers into a dashboard model module, and replace the current flat dashboard styling with a staged hero/control/stage/insight/deck composition. Keep fetch orchestration and top-level state in the page container while feeding pure props into the new components.

**Tech Stack:** React 18, Vite, plain CSS, Recharts, Node built-in test runner, `react-dom/server` for render assertions

---

### Task 1: Create a testable dashboard model boundary

**Files:**
- Create: `frontend/src/dashboardModel.js`
- Create: `frontend/src/dashboardModel.test.js`
- Modify: `frontend/package.json`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Write the failing tests for extracted dashboard helpers**

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CONFIG,
  FIELD_GROUPS,
  PLAY_SPEED_OPTIONS,
  STAT_METRIC_OPTIONS,
  buildPlaybackKeyframes,
  buildTrails,
  buildWorldFromFrame,
  enrichTimeline
} from "./dashboardModel.js";

test("buildWorldFromFrame maps agents, hotspots, and targets for the stage", () => {
  const world = buildWorldFromFrame(
    {
      agents: { 1: { pos: [2, 3], failed: false } },
      targets: { a: { pos: [4, 5], active: true }, b: { pos: [6, 7], active: false } },
      obstacles: [[1, 1]],
      hotspots: [[8, 8]]
    },
    { width: 20, height: 16 }
  );

  assert.equal(world.width, 20);
  assert.equal(world.agents[0].id, 1);
  assert.equal(world.active_targets.length, 1);
  assert.equal(world.completed_targets.length, 1);
});

test("enrichTimeline backfills captures_per_step when backend omits it", () => {
  const rows = enrichTimeline([
    { step: 0, active_targets: 4 },
    { step: 1, active_targets: 3 },
    { step: 2, active_targets: 1 }
  ]);

  assert.deepEqual(rows.map((row) => row.captures_per_step), [0, 1, 2]);
});

test("buildPlaybackKeyframes creates start, capture, and failure labels", () => {
  const labels = buildPlaybackKeyframes(
    [
      { step: 0, captures_per_step: 0, failed_agents: 0 },
      { step: 1, captures_per_step: 1, failed_agents: 0 },
      { step: 2, captures_per_step: 0, failed_agents: 1 }
    ],
    (key, vars) => `${key}:${JSON.stringify(vars ?? {})}`
  );

  assert.equal(labels[0].frameIndex, 0);
  assert.equal(labels.length, 3);
});

test("dashboard model exports presentation constants for controls", () => {
  assert.equal(DEFAULT_CONFIG.random_seed, 2026);
  assert.ok(FIELD_GROUPS.length >= 3);
  assert.deepEqual(PLAY_SPEED_OPTIONS, [0.5, 1, 2, 4]);
  assert.equal(STAT_METRIC_OPTIONS[0].value, "task_completion_rate");
});
```

- [ ] **Step 2: Run the new model test file and verify it fails**

Run: `npm test -- src/dashboardModel.test.js`  
Expected: FAIL with a module-not-found or missing-export error for `./dashboardModel.js`

- [ ] **Step 3: Implement the dashboard model module and rewire `App.jsx` to import it**

```js
// frontend/src/dashboardModel.js
export const PLAY_SPEED_OPTIONS = [0.5, 1, 2, 4];

export const DEFAULT_CONFIG = {
  random_seed: 2026,
  width: 42,
  height: 42,
  // ...existing defaults from App.jsx
};

export function buildWorldFromFrame(frame, config) {
  if (!frame || !config) return null;
  return {
    width: Number(config.width),
    height: Number(config.height),
    obstacles: Array.isArray(frame.obstacles) ? frame.obstacles : [],
    hotspots: Array.isArray(frame.hotspots) ? frame.hotspots : [],
    agents: Object.entries(frame.agents ?? {}).map(([id, payload]) => ({
      id: Number(id),
      x: payload.pos?.[0] ?? 0,
      y: payload.pos?.[1] ?? 0,
      failed: Boolean(payload.failed)
    })),
    active_targets: Object.values(frame.targets ?? {})
      .filter((item) => item.active)
      .map((item) => ({ x: item.pos?.[0] ?? 0, y: item.pos?.[1] ?? 0 })),
    completed_targets: Object.values(frame.targets ?? {})
      .filter((item) => !item.active)
      .map((item) => ({ x: item.pos?.[0] ?? 0, y: item.pos?.[1] ?? 0 }))
  };
}
```

- [ ] **Step 4: Run the model test file again and verify it passes**

Run: `npm test -- src/dashboardModel.test.js`  
Expected: PASS with 4 passing tests

- [ ] **Step 5: Commit the model extraction**

```bash
git add frontend/package.json frontend/src/App.jsx frontend/src/dashboardModel.js frontend/src/dashboardModel.test.js
git commit -m "refactor: extract frontend dashboard model helpers"
```

### Task 2: Add render-level tests and build the new stage components

**Files:**
- Create: `frontend/src/components/dashboard/SectionShell.jsx`
- Create: `frontend/src/components/dashboard/HeroHeader.jsx`
- Create: `frontend/src/components/dashboard/ControlRail.jsx`
- Create: `frontend/src/components/dashboard/SimulationStage.jsx`
- Create: `frontend/src/components/dashboard/LiveInsightRail.jsx`
- Create: `frontend/src/components/dashboard/TimelineStrip.jsx`
- Create: `frontend/src/components/dashboard/ExperimentDeck.jsx`
- Create: `frontend/src/components/dashboard/MetricCard.jsx`
- Create: `frontend/src/components/dashboard/layout.test.js`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Write failing render tests for the new page sections**

```js
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import HeroHeader from "./HeroHeader.jsx";
import SimulationStage from "./SimulationStage.jsx";
import ExperimentDeck from "./ExperimentDeck.jsx";

const t = (key) => key;

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
    />
  );

  assert.match(html, /header\.title/);
  assert.match(html, /action\.runSimulation/);
  assert.match(html, /127\.0\.0\.1:8000/);
});

test("SimulationStage renders the main stage title and playback shell", () => {
  const html = renderToStaticMarkup(
    <SimulationStage
      t={t}
      displayWorld={null}
      timeline={[]}
      history={[]}
      metrics={null}
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
    />
  );

  assert.match(html, /panel\.scenarioComparison/);
  assert.match(html, /panel\.runTradeoff/);
});
```

- [ ] **Step 2: Run the layout render tests and verify they fail**

Run: `npm test -- src/components/dashboard/layout.test.js`  
Expected: FAIL because the dashboard component files do not exist yet

- [ ] **Step 3: Implement the new presentation components with prop-driven boundaries**

```jsx
// frontend/src/components/dashboard/SectionShell.jsx
export default function SectionShell({ label, title, actions, className = "", children }) {
  return (
    <section className={`section-shell ${className}`.trim()}>
      {label ? <div className="section-shell-label">{label}</div> : null}
      <div className="section-shell-header">
        <h3>{title}</h3>
        {actions ? <div className="section-shell-actions">{actions}</div> : null}
      </div>
      <div className="section-shell-body">{children}</div>
    </section>
  );
}
```

```jsx
// frontend/src/components/dashboard/HeroHeader.jsx
import MetricCard from "./MetricCard.jsx";

export default function HeroHeader(props) {
  const { t, onRunSimulation, onRunExperiments, loadingSim, loadingExp } = props;
  return (
    <header className="hero-header">
      <div className="hero-copy">
        <p className="hero-kicker">MAS Research Console</p>
        <h1>{t("header.title")}</h1>
        <p>{t("header.subtitle")}</p>
      </div>
      <div className="hero-actions">
        <button className="btn primary" onClick={onRunSimulation}>
          {loadingSim ? t("action.running") : t("action.runSimulation")}
        </button>
        <button className="btn" onClick={onRunExperiments}>
          {loadingExp ? t("action.running") : t("action.runExperiments")}
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run the layout render tests again and verify they pass**

Run: `npm test -- src/components/dashboard/layout.test.js`  
Expected: PASS with 3 passing tests

- [ ] **Step 5: Commit the stage component extraction**

```bash
git add frontend/src/App.jsx frontend/src/components/dashboard
git commit -m "feat: add command stage frontend components"
```

### Task 3: Recompose the page container around the new command-stage layout

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/i18n.js`
- Modify: `frontend/src/i18n.test.js`

- [ ] **Step 1: Write failing translation tests for the new command-stage copy**

```js
test("translate exposes new hero and deck copy", () => {
  assert.equal(translate("en", "hero.kicker"), "MAS Research Console");
  assert.equal(translate("en", "deck.title"), "Experiment Deck");
  assert.equal(translate("en", "insight.liveTitle"), "Live Insights");
});
```

- [ ] **Step 2: Run the i18n tests and verify they fail for missing keys**

Run: `npm test -- src/i18n.test.js`  
Expected: FAIL because the new keys are not yet defined

- [ ] **Step 3: Rewrite `App.jsx` to compose the new page structure and add the missing copy**

```jsx
return (
  <div className="page command-stage-page">
    <HeroHeader
      t={t}
      language={language}
      setLanguage={setLanguage}
      loadingSim={loadingSim}
      loadingExp={loadingExp}
      onRunSimulation={runSimulation}
      onRunExperiments={runExperiments}
      metricCards={metricCards}
    />

    {error ? <ErrorBanner message={error} /> : null}

    <main className="command-stage-grid">
      <ControlRail
        t={t}
        config={config}
        runs={runs}
        history={history}
        safeFrameIndex={safeFrameIndex}
        onUpdateField={updateField}
        onUpdateSelectField={updateSelectField}
      />
      <div className="stage-column">
        <SimulationStage /* existing world + playback props */ />
        <TimelineStrip /* existing timeline props */ />
      </div>
      <LiveInsightRail t={t} metrics={metrics} hoverInfo={hoverInfo} expResult={expResult} />
    </main>

    <ExperimentDeck /* existing analytics props */ />
  </div>
);
```

- [ ] **Step 4: Run the model/layout/i18n tests together and verify they pass**

Run: `npm test -- src/dashboardModel.test.js src/components/dashboard/layout.test.js src/i18n.test.js`  
Expected: PASS with all tests green

- [ ] **Step 5: Commit the recomposed page container**

```bash
git add frontend/src/App.jsx frontend/src/i18n.js frontend/src/i18n.test.js
git commit -m "feat: compose frontend into command stage layout"
```

### Task 4: Replace the flat dashboard styling with the approved command-stage visual system

**Files:**
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/components/dashboard/*.jsx`

- [ ] **Step 1: Write a failing render assertion for the new stage shell classes**

```js
test("HeroHeader exposes command-stage styling hooks", () => {
  const html = renderToStaticMarkup(
    <HeroHeader
      t={(key) => key}
      language="en"
      setLanguage={() => {}}
      loadingSim={false}
      loadingExp={false}
      onRunSimulation={() => {}}
      onRunExperiments={() => {}}
    />
  );

  assert.match(html, /hero-header/);
  assert.match(html, /hero-kicker/);
  assert.match(html, /hero-metrics/);
});
```

- [ ] **Step 2: Run the layout tests and verify the new class assertion fails**

Run: `npm test -- src/components/dashboard/layout.test.js`  
Expected: FAIL because the final class hooks are not fully present yet

- [ ] **Step 3: Implement the visual system in `styles.css`**

```css
:root {
  --bg-canvas: #f3f7fc;
  --bg-panel: rgba(255, 255, 255, 0.84);
  --bg-stage: linear-gradient(145deg, #f8fbff 0%, #ebf3ff 100%);
  --line-soft: rgba(148, 163, 184, 0.22);
  --line-strong: rgba(96, 165, 250, 0.28);
  --text-strong: #16324f;
  --text-muted: #60748d;
  --accent: #0ea5e9;
  --support: #14b8a6;
  --alert: #f97316;
}

.command-stage-page {
  position: relative;
  padding-bottom: 48px;
}

.hero-header {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
  gap: 18px;
  padding: 22px;
  border-radius: 28px;
  background: linear-gradient(145deg, rgba(255,255,255,.92), rgba(238,245,255,.88));
  border: 1px solid var(--line-strong);
  box-shadow: 0 28px 64px rgba(56, 89, 138, 0.14);
}

.command-stage-grid {
  display: grid;
  grid-template-columns: minmax(250px, 300px) minmax(0, 1fr) minmax(260px, 320px);
  gap: 18px;
  align-items: start;
}
```

- [ ] **Step 4: Run the layout tests and a production build to verify the visual rewrite is stable**

Run: `npm test -- src/components/dashboard/layout.test.js`  
Expected: PASS

Run: `npm run build`  
Expected: Vite build completes successfully

- [ ] **Step 5: Commit the visual redesign**

```bash
git add frontend/src/styles.css frontend/src/components/dashboard
git commit -m "feat: restyle frontend as command stage dashboard"
```

### Task 5: Verify behavior end-to-end and clean up repo hygiene

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add repo ignores for brainstorming and worktree artifacts**

```gitignore
.superpowers/
.worktrees/
worktrees/
```

- [ ] **Step 2: Run the full frontend verification suite**

Run: `npm test`  
Expected: PASS for `experimentInsights`, `dashboardModel`, `layout`, and `i18n` tests

Run: `npm run build`  
Expected: PASS and emit the production bundle in `frontend/dist`

- [ ] **Step 3: Manually verify the command-stage UI**

Run: `npm run dev`

Check:
- hero actions still trigger simulation and experiment requests
- playback controls still work
- map layers still toggle
- timeline still renders
- experiment charts still render and export
- narrow-width layout stacks correctly

- [ ] **Step 4: Confirm clean git status except for expected local artifacts**

Run: `git status --short`  
Expected: only intentional implementation files remain changed; `.superpowers/` stays ignored after the `.gitignore` update

- [ ] **Step 5: Commit verification and repo hygiene updates**

```bash
git add .gitignore
git commit -m "chore: ignore local frontend planning artifacts"
```
