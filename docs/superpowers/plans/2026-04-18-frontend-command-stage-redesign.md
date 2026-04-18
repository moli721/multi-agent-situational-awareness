# Frontend Thesis Presentation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the frontend into two dedicated pages, one for simulation presentation and one for experiment analysis, while preserving existing simulation, playback, analysis, and export behavior.

**Architecture:** Keep the top-level fetch and state orchestration in `App.jsx`, but replace the old single-page composition with lightweight page navigation plus two page containers: `SimulationPage` and `AnalysisPage`. Reuse the extracted dashboard model and current analytics helpers, move thesis-specific layout concerns into focused page components, and update the CSS system so the simulation page privileges the final world view while the analysis page prioritizes chart density and screenshot quality.

**Tech Stack:** React 18, Vite, plain CSS, Recharts, Node built-in test runner with `tsx`, `react-dom/server`

---

### Task 1: Add page navigation and test the two-page shell

**Files:**
- Create: `frontend/src/components/dashboard/PageTabs.jsx`
- Create: `frontend/src/components/dashboard/SimulationPage.jsx`
- Create: `frontend/src/components/dashboard/AnalysisPage.jsx`
- Modify: `frontend/src/components/dashboard/layout.test.jsx`
- Modify: `frontend/src/App.jsx`
- Test: `frontend/src/components/dashboard/layout.test.jsx`

- [ ] **Step 1: Write the failing render tests for the new page-level shell**

```jsx
test("PageTabs renders simulation and analysis tabs", () => {
  const html = renderToStaticMarkup(
    <PageTabs
      t={(key) => key}
      currentPage="simulation"
      onChange={() => {}}
    />
  );

  assert.match(html, /page\.simulation/);
  assert.match(html, /page\.analysis/);
});

test("SimulationPage renders a dedicated final world section", () => {
  const html = renderToStaticMarkup(
    <SimulationPage
      t={(key) => key}
      displayWorld={null}
      history={[]}
      timeline={[]}
    />
  );

  assert.match(html, /panel\.finalWorld/);
  assert.doesNotMatch(html, /panel\.scenarioComparison/);
});

test("AnalysisPage renders chart sections without the simulation stage", () => {
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

  assert.match(html, /panel\.scenarioComparison/);
  assert.doesNotMatch(html, /panel\.finalWorld/);
});
```

- [ ] **Step 2: Run the layout render tests and verify they fail**

Run: `npm test -- src/components/dashboard/layout.test.jsx`  
Expected: FAIL because `PageTabs`, `SimulationPage`, and `AnalysisPage` do not exist yet

- [ ] **Step 3: Implement the page-level shell and switch `App.jsx` to page navigation**

```jsx
// frontend/src/components/dashboard/PageTabs.jsx
import React from "react";

export default function PageTabs({ t, currentPage, onChange }) {
  return (
    <div className="page-tabs" role="tablist" aria-label={t("page.navigation")}>
      {["simulation", "analysis"].map((page) => (
        <button
          key={page}
          className={`page-tab ${currentPage === page ? "active" : ""}`}
          onClick={() => onChange(page)}
        >
          {t(`page.${page}`)}
        </button>
      ))}
    </div>
  );
}
```

```jsx
// frontend/src/App.jsx
const [currentPage, setCurrentPage] = useState("simulation");

return (
  <div className="page thesis-shell">
    <HeroHeader
      t={t}
      language={language}
      setLanguage={setLanguage}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      loadingSim={loadingSim}
      loadingExp={loadingExp}
      onRunSimulation={runSimulation}
      onRunExperiments={runExperiments}
      metricCards={metricCards}
    />
    {error ? <div className="error card">{error}</div> : null}
    {currentPage === "simulation" ? (
      <SimulationPage /* simulation props */ />
    ) : (
      <AnalysisPage /* analysis props */ />
    )}
  </div>
);
```

- [ ] **Step 4: Run the layout tests again and verify they pass**

Run: `npm test -- src/components/dashboard/layout.test.jsx`  
Expected: PASS with the page-shell tests green

- [ ] **Step 5: Commit the page-shell refactor**

```bash
git add frontend/src/App.jsx frontend/src/components/dashboard/PageTabs.jsx frontend/src/components/dashboard/SimulationPage.jsx frontend/src/components/dashboard/AnalysisPage.jsx frontend/src/components/dashboard/layout.test.jsx
git commit -m "feat: split frontend into simulation and analysis pages"
```

### Task 2: Rebuild the simulation page around a larger final world view

**Files:**
- Modify: `frontend/src/components/dashboard/HeroHeader.jsx`
- Modify: `frontend/src/components/dashboard/ControlRail.jsx`
- Modify: `frontend/src/components/dashboard/SimulationPage.jsx`
- Modify: `frontend/src/components/dashboard/SimulationStage.jsx`
- Modify: `frontend/src/components/dashboard/TimelineStrip.jsx`
- Modify: `frontend/src/components/dashboard/LiveInsightRail.jsx`
- Modify: `frontend/src/i18n.js`
- Modify: `frontend/src/i18n.test.js`
- Test: `frontend/src/components/dashboard/layout.test.jsx`

- [ ] **Step 1: Write the failing copy and structure tests for the thesis-style simulation page**

```jsx
test("translate exposes simulation and analysis page labels", () => {
  assert.equal(translate("en", "page.simulation"), "Simulation");
  assert.equal(translate("en", "page.analysis"), "Analysis");
  assert.equal(translate("en", "panel.simulationInfo"), "Simulation Info");
});

test("SimulationPage uses thesis-style supporting labels instead of stage summary", () => {
  const html = renderToStaticMarkup(
    <SimulationPage
      t={(key) => key}
      displayWorld={null}
      history={[]}
      timeline={[]}
    />
  );

  assert.match(html, /panel\.simulationInfo/);
  assert.doesNotMatch(html, /insight\.stageSummary/);
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- src/i18n.test.js src/components/dashboard/layout.test.jsx`  
Expected: FAIL because the new page labels and simulation-info labels are missing

- [ ] **Step 3: Update the simulation page composition and copy**

```jsx
// frontend/src/components/dashboard/SimulationPage.jsx
export default function SimulationPage(props) {
  return (
    <main className="simulation-page-layout">
      <div className="simulation-page-main">
        <SimulationStage {...props} />
        <TimelineStrip t={props.t} timeline={props.timeline} metrics={props.metrics} />
      </div>
      <aside className="simulation-page-side">
        <LiveInsightRail
          t={props.t}
          titleKey="panel.simulationInfo"
          metricCards={props.metricCards}
          hoverInfo={props.hoverInfo}
          expResult={props.expResult}
          derivedCards={props.derivedCards}
        />
      </aside>
    </main>
  );
}
```

```js
// frontend/src/i18n.js
"page.navigation": "Page Navigation",
"page.simulation": "Simulation",
"page.analysis": "Analysis",
"panel.simulationInfo": "Simulation Info",
```

- [ ] **Step 4: Run the updated tests and verify they pass**

Run: `npm test -- src/i18n.test.js src/components/dashboard/layout.test.jsx`  
Expected: PASS with the new copy and simulation-page structure green

- [ ] **Step 5: Commit the simulation-page thesis refactor**

```bash
git add frontend/src/components/dashboard/HeroHeader.jsx frontend/src/components/dashboard/ControlRail.jsx frontend/src/components/dashboard/SimulationPage.jsx frontend/src/components/dashboard/SimulationStage.jsx frontend/src/components/dashboard/TimelineStrip.jsx frontend/src/components/dashboard/LiveInsightRail.jsx frontend/src/i18n.js frontend/src/i18n.test.js
git commit -m "feat: redesign simulation page for thesis presentation"
```

### Task 3: Rebuild the analysis page as a denser experiment board

**Files:**
- Modify: `frontend/src/components/dashboard/AnalysisPage.jsx`
- Modify: `frontend/src/components/dashboard/ExperimentDeck.jsx`
- Modify: `frontend/src/i18n.js`
- Modify: `frontend/src/components/dashboard/layout.test.jsx`

- [ ] **Step 1: Write the failing render tests for the analysis summary band**

```jsx
test("AnalysisPage renders a summary band ahead of the chart sections", () => {
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

  assert.match(html, /analysis\.summaryTitle/);
  assert.match(html, /panel\.scenarioComparison/);
});
```

- [ ] **Step 2: Run the layout tests and verify they fail**

Run: `npm test -- src/components/dashboard/layout.test.jsx`  
Expected: FAIL because the analysis summary band is not rendered yet

- [ ] **Step 3: Implement the analysis-page summary band and denser board layout**

```jsx
// frontend/src/components/dashboard/AnalysisPage.jsx
export default function AnalysisPage(props) {
  return (
    <main className="analysis-page-layout">
      <section className="analysis-summary-band card">
        <div className="analysis-summary-copy">
          <p className="section-shell-label">{props.t("analysis.summaryKicker")}</p>
          <h2>{props.t("analysis.summaryTitle")}</h2>
        </div>
        <div className="analysis-summary-metrics">
          {props.derivedCards.slice(0, 3).map((card) => (
            <MetricCard key={card.key} label={props.t(card.key)} value={card.value} compact />
          ))}
        </div>
      </section>
      <ExperimentDeck {...props} />
    </main>
  );
}
```

- [ ] **Step 4: Run the layout tests again and verify they pass**

Run: `npm test -- src/components/dashboard/layout.test.jsx`  
Expected: PASS with the analysis summary band covered

- [ ] **Step 5: Commit the analysis-page redesign**

```bash
git add frontend/src/components/dashboard/AnalysisPage.jsx frontend/src/components/dashboard/ExperimentDeck.jsx frontend/src/i18n.js frontend/src/components/dashboard/layout.test.jsx
git commit -m "feat: redesign analysis page as thesis board"
```

### Task 4: Replace the old single-page styling with the two-page thesis presentation system

**Files:**
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/components/dashboard/HeroHeader.jsx`
- Modify: `frontend/src/components/dashboard/PageTabs.jsx`
- Modify: `frontend/src/components/dashboard/SimulationPage.jsx`
- Modify: `frontend/src/components/dashboard/AnalysisPage.jsx`
- Modify: `frontend/src/components/dashboard/SimulationStage.jsx`

- [ ] **Step 1: Write the failing render assertion for page tabs and thesis shell classes**

```jsx
test("HeroHeader exposes page tabs and language switch hooks", () => {
  const html = renderToStaticMarkup(
    <HeroHeader
      t={(key) => key}
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

  assert.match(html, /page-tabs/);
  assert.match(html, /language-switch/);
  assert.match(html, /hero-header/);
});
```

- [ ] **Step 2: Run the layout tests and verify the new class assertion fails**

Run: `npm test -- src/components/dashboard/layout.test.jsx`  
Expected: FAIL because the new two-page styling hooks are not all present yet

- [ ] **Step 3: Implement the thesis-style visual system in CSS**

```css
.thesis-shell {
  display: grid;
  gap: 20px;
}

.page-tabs {
  display: inline-flex;
  gap: 8px;
  padding: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
}

.simulation-page-layout {
  display: grid;
  grid-template-columns: minmax(250px, 290px) minmax(0, 1fr) minmax(220px, 280px);
  gap: 18px;
}

.simulation-stage-shell {
  min-height: 680px;
}

.analysis-page-layout {
  display: grid;
  gap: 18px;
}
```

- [ ] **Step 4: Run tests and a production build to verify the styling rewrite is stable**

Run: `npm test`  
Expected: PASS

Run: `npm run build`  
Expected: PASS with a successful Vite production build

- [ ] **Step 5: Commit the two-page thesis styling system**

```bash
git add frontend/src/styles.css frontend/src/components/dashboard/HeroHeader.jsx frontend/src/components/dashboard/PageTabs.jsx frontend/src/components/dashboard/SimulationPage.jsx frontend/src/components/dashboard/AnalysisPage.jsx frontend/src/components/dashboard/SimulationStage.jsx
git commit -m "feat: restyle frontend as two-page thesis interface"
```

### Task 5: Refresh repo hygiene and perform final manual verification

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Ignore local planning and worktree artifacts**

```gitignore
.superpowers/
.worktrees/
worktrees/
```

- [ ] **Step 2: Run the full frontend verification suite**

Run: `npm test`  
Expected: PASS with all render, i18n, dashboard-model, and analytics tests green

Run: `npm run build`  
Expected: PASS and emit the production bundle in `frontend/dist`

- [ ] **Step 3: Manually verify both pages in the browser**

Run: `npm run dev`

Check:
- the navigation switches between simulation and analysis pages
- the language switch is visually stable
- the final world view is noticeably larger than before
- the simulation page no longer shows a thesis-inappropriate "stage summary"
- the analysis page reads like a dense experiment board rather than a mixed dashboard
- playback, layer toggles, charts, and exports still work

- [ ] **Step 4: Confirm clean git status except for intentional implementation files**

Run: `git status --short`  
Expected: no unexpected runtime artifacts remain tracked or untracked

- [ ] **Step 5: Commit the repo hygiene refresh if needed**

```bash
git add .gitignore
git commit -m "chore: ignore local frontend planning artifacts"
```
