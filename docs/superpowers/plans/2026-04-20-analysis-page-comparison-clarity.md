# Analysis Page Comparison Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the experiment analysis page so users can separately understand "same strategy across scenarios" and "same scenario across strategies" without changing backend experiment behavior.

**Architecture:** Keep the backend payload untouched and move all clarity improvements into the frontend presentation layer. Add one small view-model helper for strategy-vs-scenario slicing, add two selector states in `App.jsx`, and rebuild the analysis deck so each section answers one fixed analytical question.

**Tech Stack:** React 18, Recharts, Vite, Node test runner with `tsx`

---

## File Map

- Modify: `frontend/src/experimentInsights.js`
  - Add a normalized helper for "selected scenario + selected metric" strategy rows.
- Modify: `frontend/src/experimentInsights.test.js`
  - Add unit coverage for the new helper.
- Modify: `frontend/src/App.jsx`
  - Add analysis-page selector state and pass the new derived rows into the deck.
- Modify: `frontend/src/components/dashboard/ExperimentDeck.jsx`
  - Replace the current mixed-dimension comparison layout with a question-oriented layout.
- Modify: `frontend/src/components/dashboard/layout.test.jsx`
  - Update rendering expectations for the new analysis sections.
- Modify: `frontend/src/i18n.js`
  - Add labels and helper copy for the new analysis sections and controls.
- Modify: `frontend/src/styles.css`
  - Add layout and control styling for the redesigned analysis board.

### Task 1: Add the Strategy Comparison View-Model Helper

**Files:**
- Modify: `frontend/src/experimentInsights.js`
- Test: `frontend/src/experimentInsights.test.js`

- [ ] **Step 1: Write the failing helper test**

Add this test near the existing `experimentInsights` tests:

```javascript
test("buildStrategyMetricComparisonRows filters one scenario and maps the selected metric", () => {
  const rows = buildStrategyMetricComparisonRows(
    [
      {
        strategy: "nearest",
        scenario: "with_comm_fault",
        task_completion_rate: 0.68,
        coverage_rate: 0.31,
        average_information_age: 28.4,
        assignment_conflicts: 12
      },
      {
        strategy: "current",
        scenario: "with_comm_fault",
        task_completion_rate: 0.72,
        coverage_rate: 0.29,
        average_information_age: 30.1,
        assignment_conflicts: 15
      },
      {
        strategy: "current",
        scenario: "with_comm_normal",
        task_completion_rate: 0.84,
        coverage_rate: 0.44,
        average_information_age: 52.0,
        assignment_conflicts: 21
      }
    ],
    "with_comm_fault",
    "coverage_rate"
  );

  assert.deepEqual(rows, [
    {
      strategy: "current",
      scenario: "with_comm_fault",
      metric_key: "coverage_rate",
      metric_label_key: "statMetric.coverage_rate",
      value: 29,
      raw_value: 0.29,
      value_suffix: "%"
    },
    {
      strategy: "nearest",
      scenario: "with_comm_fault",
      metric_key: "coverage_rate",
      metric_label_key: "statMetric.coverage_rate",
      value: 31,
      raw_value: 0.31,
      value_suffix: "%"
    }
  ]);
});
```

- [ ] **Step 2: Run the helper tests to verify the new test fails**

Run:

```bash
cd frontend
node --import tsx --test src/experimentInsights.test.js
```

Expected: FAIL because `buildStrategyMetricComparisonRows` is not exported yet.

- [ ] **Step 3: Implement the helper in `experimentInsights.js`**

Add this helper below `buildDerivedCards` and above `buildTradeoffScatterRows`:

```javascript
const STRATEGY_METRIC_META = {
  task_completion_rate: {
    metric_label_key: "statMetric.task_completion_rate",
    transform: (value) => round((value ?? 0) * 100, 0),
    suffix: "%"
  },
  coverage_rate: {
    metric_label_key: "statMetric.coverage_rate",
    transform: (value) => round((value ?? 0) * 100, 0),
    suffix: "%"
  },
  average_information_age: {
    metric_label_key: "statMetric.average_information_age",
    transform: (value) => round(value ?? 0, 2),
    suffix: ""
  },
  assignment_conflicts: {
    metric_label_key: "statMetric.assignment_conflicts",
    transform: (value) => round(value ?? 0, 2),
    suffix: ""
  }
};

export function buildStrategyMetricComparisonRows(strategyRows, selectedScenario, metricKey) {
  const metricMeta = STRATEGY_METRIC_META[metricKey] ?? STRATEGY_METRIC_META.task_completion_rate;
  const rows = (Array.isArray(strategyRows) ? strategyRows : [])
    .filter((row) => String(row?.scenario ?? "") === String(selectedScenario ?? ""))
    .map((row) => {
      const rawValue = Number(row?.[metricKey] ?? 0);
      return {
        strategy: String(row.strategy ?? ""),
        scenario: String(row.scenario ?? ""),
        metric_key: metricKey,
        metric_label_key: metricMeta.metric_label_key,
        value: metricMeta.transform(rawValue),
        raw_value: rawValue,
        value_suffix: metricMeta.suffix
      };
    });

  return sortByKnownOrder(rows, STRATEGY_ORDER, "strategy");
}
```

- [ ] **Step 4: Update the imports and expectations in the helper test file**

Replace the import block at the top of `frontend/src/experimentInsights.test.js` with:

```javascript
import {
  buildDerivedComparisonRows,
  buildStrategyMetricComparisonRows,
  buildStrategyStatRows,
  buildTradeoffScatterRows,
  formatStatBand
} from "./experimentInsights.js";
```

- [ ] **Step 5: Re-run the helper tests and confirm they pass**

Run:

```bash
cd frontend
node --import tsx --test src/experimentInsights.test.js
```

Expected: PASS

- [ ] **Step 6: Commit the helper task**

```bash
git add frontend/src/experimentInsights.js frontend/src/experimentInsights.test.js
git commit -m "feat: add strategy comparison metric helper"
```

### Task 2: Thread the New Analysis Controls Through `App.jsx`

**Files:**
- Modify: `frontend/src/App.jsx`
- Test: `frontend/src/components/dashboard/layout.test.jsx`

- [ ] **Step 1: Write the failing layout assertion for the new analysis structure**

Extend the `ExperimentDeck renders analytics sections even before experiment data exists` test with these checks:

```javascript
assert.match(html, /panel\.currentStrategyScenarios/);
assert.match(html, /panel\.scenarioStrategyMetric/);
assert.match(html, /analysis\.fixedStrategyNote/);
assert.match(html, /analysis\.fixedScenarioNote/);
```

Extend the `AnalysisPage renders a summary band ahead of experiment charts` test with:

```javascript
assert.match(html, /panel\.currentStrategyScenarios/);
assert.match(html, /panel\.scenarioStrategyMetric/);
assert.doesNotMatch(html, /panel\.scenarioComparison/);
```

- [ ] **Step 2: Run the dashboard layout tests to verify the new assertions fail**

Run:

```bash
cd frontend
node --import tsx --test src/components/dashboard/layout.test.jsx
```

Expected: FAIL because the new section keys are not rendered yet.

- [ ] **Step 3: Add new analysis state and derived rows in `App.jsx`**

Update the imports at the top of `App.jsx`:

```javascript
import {
  buildDerivedCards,
  buildDerivedComparisonRows,
  buildStrategyMetricComparisonRows,
  buildStrategyStatRows,
  buildTradeoffScatterRows
} from "./experimentInsights";
```

Add new state near the existing analysis controls:

```javascript
const [selectedStrategyScenario, setSelectedStrategyScenario] = useState("with_comm_normal");
const [selectedStrategyMetric, setSelectedStrategyMetric] = useState("task_completion_rate");
```

Add these derived values near the current `scenarioRows` / `strategyRows` logic:

```javascript
const currentStrategyKey = String(
  expResult?.default_strategy ?? config.decision_strategy ?? "current"
);

const currentStrategyContext = useMemo(
  () => ({
    strategy: currentStrategyKey,
    label: strategyLabel(currentStrategyKey)
  }),
  [currentStrategyKey, strategyLabel]
);

const strategyMetricRows = useMemo(
  () =>
    buildStrategyMetricComparisonRows(
      strategyRows,
      selectedStrategyScenario,
      selectedStrategyMetric
    ),
  [strategyRows, selectedStrategyScenario, selectedStrategyMetric]
);
```

Pass the new props into `AnalysisPage`:

```jsx
currentStrategyContext={currentStrategyContext}
selectedStrategyScenario={selectedStrategyScenario}
selectedStrategyMetric={selectedStrategyMetric}
strategyMetricRows={strategyMetricRows}
onSelectedStrategyScenarioChange={setSelectedStrategyScenario}
onSelectedStrategyMetricChange={setSelectedStrategyMetric}
```

- [ ] **Step 4: Re-run the layout tests and confirm they still fail for the deck only**

Run:

```bash
cd frontend
node --import tsx --test src/components/dashboard/layout.test.jsx
```

Expected: still FAIL, but now because `ExperimentDeck.jsx` does not use the new props yet.

- [ ] **Step 5: Commit the `App.jsx` state wiring**

```bash
git add frontend/src/App.jsx frontend/src/components/dashboard/layout.test.jsx
git commit -m "feat: wire analysis comparison controls"
```

### Task 3: Rebuild the Analysis Deck Around Two Clear Questions

**Files:**
- Modify: `frontend/src/components/dashboard/ExperimentDeck.jsx`
- Modify: `frontend/src/i18n.js`
- Test: `frontend/src/components/dashboard/layout.test.jsx`

- [ ] **Step 1: Add the new translation keys needed by the redesigned deck**

Append these keys to both language maps in `frontend/src/i18n.js`:

```javascript
"panel.currentStrategyScenarios": "Current Strategy Across Scenarios",
"panel.scenarioStrategyMetric": "Selected Scenario Across Strategies",
"analysis.fixedStrategyNote": "Fixed strategy, compare communication scenarios.",
"analysis.fixedScenarioNote": "Fixed scenario, compare strategies on one metric.",
"analysis.currentStrategyLabel": "Current strategy",
"analysis.metricSelector": "Metric",
"analysis.scenarioSelector": "Scenario",
"analysis.robustnessNote": "Robustness stays separate from the main comparison chart."
```

For the Chinese map, add equivalent labels using the same keys.

- [ ] **Step 2: Refactor `ExperimentDeck.jsx` props and imports**

Update the prop list so the component accepts:

```javascript
currentStrategyContext,
selectedStrategyScenario,
selectedStrategyMetric,
strategyMetricRows,
onSelectedStrategyScenarioChange,
onSelectedStrategyMetricChange,
```

Update the Recharts import to include `Cell`:

```javascript
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
```

- [ ] **Step 3: Replace the first comparison grid with the new question-oriented pair**

Replace the current first `panel-grid-2` block with this structure:

```jsx
<div className="panel-grid-2 analysis-focus-grid">
  <SectionShell
    className="card"
    label={t("panel.currentStrategyScenarios")}
    title={t("panel.currentStrategyScenarios")}
    actions={
      <div className="inline-actions">
        <span className="context-pill">
          {t("analysis.currentStrategyLabel")}: {currentStrategyContext?.label}
        </span>
        <button className="btn btn-sm" onClick={onExportScenarioSummaryCsv} disabled={scenarioRows.length === 0}>
          {t("action.exportSummaryCsv")}
        </button>
      </div>
    }
  >
    {scenarioRows.length > 0 ? (
      <>
        <p className="chart-note">{t("analysis.fixedStrategyNote")}</p>
        <div className="analysis-dual-metric-grid">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scenarioRows} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="scenario_label" />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, t("chart.completion")]} />
              <Bar dataKey="completion_pct" name={t("chart.completion")}>
                {scenarioRows.map((row) => (
                  <Cell key={`completion-${row.scenario}`} fill={SCENARIO_COLORS[row.scenario]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scenarioRows} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="scenario_label" />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, t("chart.coverage")]} />
              <Bar dataKey="coverage_pct" name={t("chart.coverage")}>
                {scenarioRows.map((row) => (
                  <Cell key={`coverage-${row.scenario}`} fill={SCENARIO_COLORS[row.scenario]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </>
    ) : (
      <div className="placeholder compact">{t("placeholder.runExperimentsFirst")}</div>
    )}
  </SectionShell>

  <SectionShell
    className="card"
    label={t("panel.scenarioStrategyMetric")}
    title={t("panel.scenarioStrategyMetric")}
    actions={
      <div className="inline-actions analysis-filter-row">
        <label className="analysis-inline-field">
          <span>{t("analysis.scenarioSelector")}</span>
          <select
            className="panel-select"
            value={selectedStrategyScenario}
            onChange={(e) => onSelectedStrategyScenarioChange(e.target.value)}
          >
            {SCENARIO_KEYS.map((value) => (
              <option key={value} value={value}>
                {scenarioLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="analysis-inline-field">
          <span>{t("analysis.metricSelector")}</span>
          <select
            className="panel-select"
            value={selectedStrategyMetric}
            onChange={(e) => onSelectedStrategyMetricChange(e.target.value)}
          >
            {STAT_METRIC_OPTIONS.filter((item) =>
              ["task_completion_rate", "coverage_rate", "average_information_age", "assignment_conflicts"].includes(item.value)
            ).map((item) => (
              <option key={item.value} value={item.value}>
                {t(item.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-sm" onClick={onExportStrategyMatrixCsv} disabled={strategyRows.length === 0}>
          {t("action.exportMatrixCsv")}
        </button>
      </div>
    }
  >
    {strategyMetricRows.length > 0 ? (
      <>
        <p className="chart-note">{t("analysis.fixedScenarioNote")}</p>
        <ResponsiveContainer width="100%" height={270}>
          <BarChart data={strategyMetricRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="strategy" tickFormatter={strategyLabel} />
            <YAxis />
            <Tooltip
              formatter={(v, _name, item) => {
                const suffix = item?.payload?.value_suffix ?? "";
                return [`${Number(v).toFixed(suffix ? 1 : 2)}${suffix}`, t(item?.payload?.metric_label_key ?? "statMetric.task_completion_rate")];
              }}
            />
            <Bar dataKey="value" name={t(strategyMetricRows[0]?.metric_label_key ?? "statMetric.task_completion_rate")}>
              {strategyMetricRows.map((row) => (
                <Cell key={`strategy-metric-${row.strategy}`} fill={STRATEGY_COLORS[row.strategy]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </>
    ) : (
      <div className="placeholder compact">{t("placeholder.runExperimentsFirst")}</div>
    )}
  </SectionShell>
</div>
```

Also define this constant near the top of the file:

```javascript
const SCENARIO_COLORS = {
  with_comm_normal: "#0ea5e9",
  without_comm_baseline: "#64748b",
  with_comm_fault: "#14b8a6"
};
```

- [ ] **Step 4: Move robustness into its own card**

Replace the old "robustness under strategy comparison" layout with a small dedicated card placed ahead of the benefit-cost section:

```jsx
<SectionShell
  className="card"
  label={t("chart.robustness")}
  title={t("chart.robustness")}
>
  {robustnessRows.length > 0 ? (
    <>
      <p className="chart-note">{t("analysis.robustnessNote")}</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={robustnessRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="strategy" tickFormatter={strategyLabel} />
          <YAxis domain={[0, "auto"]} />
          <Tooltip formatter={(v) => [Number(v).toFixed(4), t("chart.robustness")]} />
          <Bar dataKey="robustness" name={t("chart.robustness")} fill="#f97316" />
        </BarChart>
      </ResponsiveContainer>
    </>
  ) : (
    <div className="placeholder compact">{t("placeholder.runExperimentsFirst")}</div>
  )}
</SectionShell>
```

- [ ] **Step 5: Re-run the layout tests and confirm they pass**

Run:

```bash
cd frontend
node --import tsx --test src/components/dashboard/layout.test.jsx
```

Expected: PASS

- [ ] **Step 6: Commit the analysis deck refactor**

```bash
git add frontend/src/components/dashboard/ExperimentDeck.jsx frontend/src/components/dashboard/layout.test.jsx frontend/src/i18n.js
git commit -m "feat: clarify analysis page comparisons"
```

### Task 4: Add Styling and Run Full Frontend Verification

**Files:**
- Modify: `frontend/src/styles.css`
- Verify: `frontend/package.json` test and build scripts

- [ ] **Step 1: Add layout and control styles for the redesigned analysis board**

Append these styles near the analysis-page section in `frontend/src/styles.css`:

```css
.analysis-focus-grid {
  align-items: start;
}

.analysis-dual-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.analysis-filter-row {
  align-items: end;
}

.analysis-inline-field {
  min-width: 160px;
  display: grid;
  gap: 6px;
  color: var(--text-muted);
  font-size: 12px;
}

.context-pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.1);
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 980px) {
  .analysis-dual-metric-grid {
    grid-template-columns: 1fr;
  }

  .analysis-filter-row {
    width: 100%;
    grid-template-columns: 1fr;
  }

  .analysis-inline-field {
    min-width: 0;
  }
}
```

- [ ] **Step 2: Run the full frontend test suite**

Run:

```bash
cd frontend
npm test
```

Expected: PASS with all frontend tests green.

- [ ] **Step 3: Run a production build**

Run:

```bash
cd frontend
npm run build
```

Expected: Vite build completes successfully with no fatal errors.

- [ ] **Step 4: Commit the styles and verification pass**

```bash
git add frontend/src/styles.css
git commit -m "style: polish analysis comparison layout"
```

## Self-Review

- Spec coverage:
  - Same strategy / different scenarios: covered in Task 2 and Task 3.
  - Same scenario / different strategies: covered in Task 1, Task 2, and Task 3.
  - Robustness separated from the mixed comparison chart: covered in Task 3.
  - Existing backend response shape unchanged: no backend files are in scope.
- Placeholder scan:
  - No `TODO`, `TBD`, or "implement later" placeholders remain.
- Type consistency:
  - `selectedStrategyScenario`, `selectedStrategyMetric`, and `strategyMetricRows` are used consistently across `App.jsx` and `ExperimentDeck.jsx`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-20-analysis-page-comparison-clarity.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Because you already asked me to code in an isolated worktree, I can proceed with option 2 in a worktree unless you want to change that.
