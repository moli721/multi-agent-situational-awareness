# Analysis Page Comparison Clarity Design

**Date:** 2026-04-20

**Goal:** Rework the experiment analysis page so users can clearly distinguish strategy comparisons from communication-scenario comparisons without changing backend experiment semantics.

## Problem

The current analysis page mixes three dimensions in a way that is hard to parse:

- strategy: `current`, `nearest`, `random`
- scenario: `with_comm_normal`, `without_comm_baseline`, `with_comm_fault`
- metric: completion, coverage, robustness, and several derived cost indicators

Two specific presentation issues are causing confusion:

1. The current `Scenario Comparison` chart uses color to encode metrics (`completion`, `coverage`).
2. The current `Strategy Comparison` chart uses color to encode scenarios (`normal comm`, `no comm`, `comm fault`).

This forces the user to remap the meaning of color between adjacent charts. It also makes it difficult to answer two practical questions:

- How does my currently selected strategy behave across communication conditions?
- Under one communication condition, which strategy performs better?

## Scope

This redesign is limited to the frontend analysis page and the existing experiment response shape.

In scope:

- Reorganize the analysis layout in `frontend/src/components/dashboard/ExperimentDeck.jsx`
- Add lightweight derived view-model helpers in the frontend if needed
- Add explicit labels and controls that separate strategy and scenario questions
- Preserve current exports unless a small rename is needed for clarity

Out of scope:

- Backend experiment logic
- New backend metrics
- Changing Monte Carlo experiment semantics
- Simulation page redesign

## Design Direction

The new analysis page should be organized by user questions rather than by raw dataset shape.

### Section 1: Same Strategy, Different Communication Conditions

This section answers:

> For the currently selected strategy, how does behavior change across `normal communication`, `no communication`, and `communication fault`?

Design rules:

- Show an explicit context label such as `Current strategy: Collaborative`
- Use scenario as the primary horizontal or categorical dimension
- Do not mix metric meaning into color in a way that conflicts with later charts
- Split `completion` and `coverage` into separate small charts or into a metric switcher

Recommended implementation:

- Keep `scenarioRows` as the source
- Render two stacked compact bar charts:
  - chart A: completion by scenario
  - chart B: coverage by scenario
- Use consistent scenario colors across both charts:
  - normal communication
  - no communication
  - communication fault

This preserves the current data while making the chart answer one clear question.

### Section 2: Same Communication Condition, Different Strategies

This section answers:

> Under one fixed scenario, which strategy performs better?

Design rules:

- Add a scenario filter control with the three experiment scenarios
- Add a metric filter control with at least:
  - completion rate
  - coverage rate
  - average information age
  - assignment conflicts
- Show only one metric at a time for strategy comparison
- Keep strategy as the x-axis and use a single metric definition per view

Recommended implementation:

- Build a new frontend view-model derived from `strategyRows`
- Filter rows by selected scenario
- Map each strategy to a normalized metric field for charting
- Render a single strategy comparison chart for the selected scenario and metric

This removes the current need to mentally compare scenarios and strategies in the same figure.

### Section 3: Robustness and Derived Cost Signals

This section remains useful, but it should no longer be visually chained to the strategy comparison chart.

Design rules:

- Keep robustness as its own small chart or summary band
- Keep benefit-cost cards and derived comparison table
- Clarify that the summary cards correspond to the current default strategy

Recommended implementation:

- Preserve the current derived cards and benefit-cost section
- Move robustness into a separate card with its own explanation line
- Add short helper copy explaining what each card represents

### Section 4: Run-Level Tradeoff Scatter

The scatter plot remains valuable as a distribution view, but it should be positioned as an advanced diagnostic section rather than a primary comparison chart.

Design rules:

- Keep the scenario selector
- Keep the tooltip contents
- Add a note that each point is one Monte Carlo run under the selected scenario

## Data Flow

No backend changes are required.

Existing frontend data sources remain:

- `scenarioRows`: current default strategy across scenarios
- `strategyRows`: all strategies across all scenarios
- `robustnessRows`: one robustness value per strategy
- `derivedCards`: default-strategy summary cards
- `derivedComparisonRows`: derived comparison table across strategies
- `tradeoffRows`: run-level scatter data

New frontend-only state should be added:

- `selectedStrategyScenario`: scenario used by the strategy comparison section
- `selectedStrategyMetric`: metric used by the strategy comparison section

New helper output should be added:

- a normalized `strategyMetricRows` collection for the selected scenario and metric
- optional `currentStrategyLabel` or equivalent view label for the scenario comparison section

## Component Boundaries

### `frontend/src/App.jsx`

Responsibilities after redesign:

- Hold state for the new strategy-comparison controls
- Build the new strategy comparison rows from `strategyRows`
- Continue passing derived metrics, scenario rows, and tradeoff rows to the analysis page

### `frontend/src/experimentInsights.js`

Responsibilities after redesign:

- Provide reusable helper(s) for metric-driven strategy comparison rows
- Keep formatting and percentage conversion logic out of component JSX

### `frontend/src/components/dashboard/ExperimentDeck.jsx`

Responsibilities after redesign:

- Present the analysis board in the new question-oriented order
- Render:
  - current strategy across scenarios
  - selected scenario across strategies
  - robustness and benefit-cost summaries
  - run-level tradeoff scatter

The component should stop overloading adjacent charts with different color semantics.

## Interaction Design

Required controls:

- Scenario selector for the strategy comparison section
- Metric selector for the strategy comparison section

Required labels:

- Current strategy label in the scenario comparison section
- Short chart notes that explain what is fixed and what is being compared

Example helper copy:

- `Fixed strategy, compare communication scenarios`
- `Fixed scenario, compare strategies`

## Visual Language

To reduce confusion, color semantics should become stable.

Recommended rule:

- Scenario colors are reserved for charts comparing scenarios
- Metric colors are reserved for charts comparing metrics
- Never place two adjacent charts where the same color means different domains without a note

Because this redesign removes the mixed-role charts, the need for explanatory legend-reading should be lower.

## Testing Strategy

Frontend verification should include:

- Existing analysis page renders without experiment data
- Scenario comparison section renders with current default strategy context
- Strategy comparison section updates when scenario selector changes
- Strategy comparison section updates when metric selector changes
- Export buttons continue to work with the unchanged data structures

Test work should focus on:

- new view-model helper coverage
- updated analysis layout rendering

## Risks

- The page may become too control-heavy if selectors are repeated in too many places.
- Reusing old copy labels may preserve some ambiguity if not renamed carefully.
- Keeping too many charts on screen at once may reduce the clarity benefit of the reorganization.

Mitigations:

- Keep only one selector pair for the strategy-comparison section
- Rename section titles so the fixed dimension is explicit
- Prefer fewer, clearer charts over dense dashboards

## Acceptance Criteria

The redesign is successful when:

1. A user can identify which section answers "same strategy, different scenarios".
2. A user can identify which section answers "same scenario, different strategies".
3. The current strategy context is visible without inspecting tooltips.
4. Coverage is no longer confused with a scenario color.
5. Backend responses remain unchanged.
