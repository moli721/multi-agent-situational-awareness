# Tradeoff Tooltip Judgment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add conclusion-first tooltip diagnostics to the run-level tradeoff scatter so hovered points explain whether a run is strong, weak, or balanced.

**Architecture:** Keep the chart layout unchanged and move all new judgment logic into `frontend/src/experimentInsights.js`, where scenario-filtered scatter rows can be enriched with absolute labels, relative standing, and explanation copy. `App.jsx` continues to own the scenario filter, while `ExperimentDeck.jsx` only renders the richer tooltip structure using translated strings from `i18n.js`.

**Tech Stack:** React 18, Vite, Recharts, Node test runner

---

### Task 1: Set up an isolated workspace and capture the failing expectations

**Files:**
- Modify: `docs/superpowers/plans/2026-04-21-tradeoff-tooltip-judgment.md`
- Test: `frontend/src/experimentInsights.test.js`

- [ ] **Step 1: Create a worktree branch for the feature**

```bash
git -C h:\实验报告汇总\毕业论文\multi-agent-situational-awareness worktree add h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\.worktrees\tradeoff-tooltip-judgment -b feature/tradeoff-tooltip-judgment
```

- [ ] **Step 2: Switch all subsequent commands to the new worktree**

```bash
cd /d h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\.worktrees\tradeoff-tooltip-judgment
```

- [ ] **Step 3: Extend the scatter helper test with tooltip diagnostics expectations**

```js
test("buildTradeoffScatterRows adds tooltip diagnostics for a strong low-cost run", () => {
  const rows = buildTradeoffScatterRows([
    { strategy: "current", scenario: "with_comm_normal", run_index: 0, messages_sent: 80, task_completion_rate: 0.95, assignment_conflicts: 0, average_information_age: 8.5 },
    { strategy: "nearest", scenario: "with_comm_normal", run_index: 1, messages_sent: 180, task_completion_rate: 0.78, assignment_conflicts: 2, average_information_age: 14.2 },
    { strategy: "random", scenario: "with_comm_normal", run_index: 2, messages_sent: 240, task_completion_rate: 0.62, assignment_conflicts: 4, average_information_age: 22.3 }
  ]);

  assert.equal(rows[0].judgment_key, "tooltip.judgment.highReturnLowCost");
  assert.equal(rows[0].standing_key, "tooltip.standing.strong");
  assert.match(rows[0].explanation_key, /^tooltip\.explanation\./);
});
```

- [ ] **Step 4: Add edge-case tests for identical message counts and small scenario sizes**

```js
test("buildTradeoffScatterRows handles identical message counts without dividing by zero", () => {
  const rows = buildTradeoffScatterRows([
    { strategy: "current", scenario: "with_comm_fault", run_index: 0, messages_sent: 100, task_completion_rate: 0.88, assignment_conflicts: 1, average_information_age: 9.1 },
    { strategy: "nearest", scenario: "with_comm_fault", run_index: 1, messages_sent: 100, task_completion_rate: 0.73, assignment_conflicts: 2, average_information_age: 16.5 }
  ]);

  assert.equal(rows[0].cost_band, "medium");
  assert.ok(rows[1].standing_key);
});
```

- [ ] **Step 5: Run the focused test file to verify the new expectations fail**

Run: `npm test -- src/experimentInsights.test.js`  
Expected: FAIL because the scatter helper does not expose `judgment_key`, `standing_key`, or explanation fields yet.

### Task 2: Implement scatter-row diagnostics in the helper layer

**Files:**
- Modify: `frontend/src/experimentInsights.js`
- Test: `frontend/src/experimentInsights.test.js`

- [ ] **Step 1: Add small helper functions for normalization and ranking**

```js
function normalizeRange(value, min, max) {
  if (max <= min) return 0.5;
  return (value - min) / (max - min);
}

function inverseNormalized(value, min, max) {
  return 1 - normalizeRange(value, min, max);
}
```

- [ ] **Step 2: Add helpers that derive return band, cost band, judgment key, standing key, and explanation metadata**

```js
function resolveReturnBand(completionPct) {
  if (completionPct >= 85) return "high";
  if (completionPct >= 70) return "medium";
  return "low";
}

function resolveJudgmentKey(returnBand, costBand) {
  if (returnBand === "high" && costBand === "low") return "tooltip.judgment.highReturnLowCost";
  if (returnBand === "high" && costBand === "high") return "tooltip.judgment.highReturnHighCost";
  if (returnBand === "low" && costBand === "low") return "tooltip.judgment.lowReturnLowCost";
  if (returnBand === "low" && costBand === "high") return "tooltip.judgment.lowReturnHighCost";
  return "tooltip.judgment.balanced";
}
```

- [ ] **Step 3: Enrich `buildTradeoffScatterRows` using scenario-group statistics rather than per-row local logic**

```js
export function buildTradeoffScatterRows(runRows) {
  const rows = Array.isArray(runRows) ? runRows : [];
  const grouped = new Map();

  for (const row of rows) {
    const scenario = String(row.scenario ?? "");
    if (!grouped.has(scenario)) grouped.set(scenario, []);
    grouped.get(scenario).push(row);
  }

  return rows.map((row) => {
    const scenarioRows = grouped.get(String(row.scenario ?? "")) ?? [];
    return buildTradeoffPoint(row, scenarioRows);
  });
}
```

- [ ] **Step 4: Keep the original export-friendly numeric fields unchanged while adding tooltip diagnostics**

```js
return {
  strategy,
  scenario,
  run_index,
  messages_sent,
  completion_pct,
  conflicts,
  info_age,
  label,
  return_band,
  cost_band,
  judgment_key,
  standing_key,
  explanation_key,
  explanation_detail_key
};
```

- [ ] **Step 5: Run the focused helper tests**

Run: `npm test -- src/experimentInsights.test.js`  
Expected: PASS

### Task 3: Add localized judgment and explanation copy

**Files:**
- Modify: `frontend/src/i18n.js`
- Test: `frontend/src/i18n.test.js`

- [ ] **Step 1: Add zh/en translation keys for judgment labels, standing labels, and explanation sentences**

```js
"tooltip.judgment.highReturnLowCost": "高收益低成本",
"tooltip.standing.strong": "当前场景中表现前列",
"tooltip.explanation.highReturnLowCost": "完成率高，且通信代价控制较好。"
```

- [ ] **Step 2: Add optional explanation detail strings for low/high conflicts and low/high information age**

```js
"tooltip.detail.lowConflicts": "冲突较少，协同更顺。",
"tooltip.detail.highInfoAge": "信息年龄偏高，说明态势信息较旧。"
```

- [ ] **Step 3: Extend the i18n test file with at least one zh and one en assertion for the new keys**

```js
assert.equal(translate("zh", "tooltip.judgment.highReturnLowCost"), "高收益低成本");
assert.equal(translate("en", "tooltip.standing.weak"), "Among the weaker runs in this scenario");
```

- [ ] **Step 4: Run the i18n tests**

Run: `npm test -- src/i18n.test.js`  
Expected: PASS

### Task 4: Render the richer tooltip structure in the scatter chart

**Files:**
- Modify: `frontend/src/components/dashboard/ExperimentDeck.jsx`
- Modify: `frontend/src/styles.css`
- Test: `frontend/src/components/dashboard/layout.test.jsx`

- [ ] **Step 1: Replace the raw metric-only tooltip body with a conclusion-first layout**

```jsx
<div className="tooltip-card tooltip-card-diagnostic">
  <div className="tooltip-run-label">{t("tooltip.runLabel", {...})}</div>
  <div className="tooltip-pill">{t(point.judgment_key)}</div>
  <div className="tooltip-standing">{t(point.standing_key)}</div>
  <div>{t("tooltip.messages")}: {point.messages_sent}</div>
  <div>{t("tooltip.completion")}: {point.completion_pct.toFixed(1)}%</div>
  <div>{t("tooltip.conflicts")}: {point.conflicts}</div>
  <div>{t("tooltip.infoAge")}: {point.info_age.toFixed(2)}</div>
  <div className="tooltip-explanation">
    {t(point.explanation_key)} {point.explanation_detail_key ? t(point.explanation_detail_key) : ""}
  </div>
</div>
```

- [ ] **Step 2: Add only the minimum CSS needed for visual hierarchy inside the existing tooltip card**

```css
.tooltip-pill { font-weight: 700; }
.tooltip-standing { color: var(--text-muted); }
.tooltip-explanation { margin-top: 0.4rem; line-height: 1.4; }
```

- [ ] **Step 3: Extend the layout test so a populated tradeoff row keeps the new tooltip fields in the rendered tree**

```jsx
assert.match(html, /tooltip\.judgment\.highReturnLowCost/);
assert.match(html, /tooltip\.standing\.strong/);
```

- [ ] **Step 4: Run the dashboard layout test**

Run: `npm test -- src/components/dashboard/layout.test.jsx`  
Expected: PASS

### Task 5: Run the full frontend verification pass and commit

**Files:**
- Modify: `frontend/src/experimentInsights.js`
- Modify: `frontend/src/experimentInsights.test.js`
- Modify: `frontend/src/i18n.js`
- Modify: `frontend/src/i18n.test.js`
- Modify: `frontend/src/components/dashboard/ExperimentDeck.jsx`
- Modify: `frontend/src/components/dashboard/layout.test.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Run the full frontend test suite**

Run: `npm test`  
Expected: PASS

- [ ] **Step 2: Run the production build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 3: Review the final diff for scope drift**

```bash
git diff -- frontend/src/experimentInsights.js frontend/src/experimentInsights.test.js frontend/src/i18n.js frontend/src/i18n.test.js frontend/src/components/dashboard/ExperimentDeck.jsx frontend/src/components/dashboard/layout.test.jsx frontend/src/styles.css
```

- [ ] **Step 4: Commit the implementation**

```bash
git add frontend/src/experimentInsights.js frontend/src/experimentInsights.test.js frontend/src/i18n.js frontend/src/i18n.test.js frontend/src/components/dashboard/ExperimentDeck.jsx frontend/src/components/dashboard/layout.test.jsx frontend/src/styles.css
git commit -m "Improve tradeoff tooltip diagnostics"
```
