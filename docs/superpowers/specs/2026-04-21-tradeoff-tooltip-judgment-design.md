# Tradeoff Tooltip Judgment Design

**Date:** 2026-04-21

**Goal:** Improve the run-level tradeoff scatter tooltip so users can immediately judge whether a hovered point represents strong, weak, or balanced performance without changing backend experiment semantics or the chart's primary layout.

## Problem

The current tradeoff scatter tooltip is a raw metric dump:

- strategy / scenario / run index
- messages sent
- completion percentage
- conflicts
- information age

This is accurate, but it leaves too much interpretation work to the user. In practice, the tooltip does not answer the question users most naturally ask when hovering a point:

> Is this run doing well or poorly, and why?

That gap is especially noticeable on the experiment analysis page because:

- users already struggle with overlapping points and dense distributions
- the scatter plot is positioned as a diagnostic chart rather than a primary comparison chart
- numeric values alone do not help a thesis reader quickly form a conclusion

## Scope

This redesign is limited to the frontend tradeoff scatter explanation layer.

In scope:

- enrich the run-level scatter view model in `frontend/src/experimentInsights.js`
- restructure the tooltip content in `frontend/src/components/dashboard/ExperimentDeck.jsx`
- add localized labels and explanation strings in `frontend/src/i18n.js`
- add or update unit tests for tooltip judgment logic

Out of scope:

- backend experiment logic
- experiment response shape
- scatter plot coordinates, scenario filter, legend, or export behavior
- overlap handling, jittering, point sizing, or density visualization

## User Question

The redesigned tooltip should answer three questions in order:

1. What run is this?
2. Is its performance good, weak, or balanced?
3. What evidence explains that judgment?

The tooltip should no longer behave like a plain debug readout. It should behave like a compact analytical caption that supports thesis screenshots, demos, and oral explanation.

## Design Direction

The tooltip should follow a `conclusion first, evidence second` structure.

### Tooltip Layout

For each hovered point, show:

1. `Identity line`
   - strategy label
   - scenario label
   - run index

2. `Primary judgment`
   - one short categorical label such as:
     - `high return, low cost`
     - `high return, high cost`
     - `balanced`
     - `low return, low cost`
     - `low return, high cost`

3. `Relative standing`
   - one short line that compares the run against other runs in the currently selected scenario
   - examples:
     - `among the stronger runs in this scenario`
     - `mid-pack in this scenario`
     - `among the weaker runs in this scenario`

4. `Evidence lines`
   - messages sent
   - completion percentage
   - assignment conflicts
   - average information age

5. `One-sentence explanation`
   - a plain-language interpretation generated from the same judgment logic

This keeps the tooltip readable while turning the chart into something users can explain aloud without translating raw numbers on the fly.

## Judgment Model

The tooltip should provide both an absolute judgment and a relative judgment.

### Absolute Judgment

Absolute judgment answers:

> Looking only at the point's own coordinates, is this run high-return or low-return, and is it cheap or expensive?

#### Return Bands

Return is based on `completion_pct`.

- `>= 85`: high return
- `>= 70` and `< 85`: medium return
- `< 70`: low return

These thresholds stay fixed so the semantic meaning of completion remains stable across sessions and screenshots.

#### Cost Bands

Cost is based on `messages_sent`, but should be interpreted relative to the current scenario's horizontal spread rather than by hardcoded absolute message counts.

For the selected scenario:

- normalize each point's `messages_sent` into the scenario's observed min-max range
- `<= 0.35`: low cost
- `>= 0.65`: high cost
- otherwise: medium cost

If all points in the scenario share the same `messages_sent`, treat cost as `medium` for every point.

#### Primary Labels

Map return band and cost band to one of five labels:

- high return + low cost => `high return, low cost`
- high return + high cost => `high return, high cost`
- low return + low cost => `low return, low cost`
- low return + high cost => `low return, high cost`
- all other combinations => `balanced`

This intentionally avoids over-fragmenting the label space. The goal is fast comprehension, not analytical exhaustiveness.

### Relative Judgment

Relative judgment answers:

> Within the currently selected scenario, how strong is this run compared with the other runs shown on the chart?

Compute a lightweight score inside the selected scenario only:

- normalize completion percentage so higher is better
- normalize message count so lower is better
- combined score = `0.7 * normalized_completion + 0.3 * inverse_normalized_cost`

Then assign standing labels:

- top 25% => `among the stronger runs in this scenario`
- middle 50% => `mid-pack in this scenario`
- bottom 25% => `among the weaker runs in this scenario`

If the scenario has too few points to make quartiles meaningful, use rank ordering with the same three buckets.

This weighting keeps task completion as the main success criterion while still reflecting communication cost as an important secondary factor.

## Explanation Sentence

The tooltip should end with one plain-language interpretation sentence.

Base sentence by primary label:

- `high return, low cost` => `Completion is strong while communication cost stays well controlled.`
- `high return, high cost` => `Completion is strong, but it relies on heavier communication overhead.`
- `low return, low cost` => `Communication cost stays low, but the run does not convert that into strong completion.`
- `low return, high cost` => `Communication cost is high, yet the overall return remains weak.`
- `balanced` => `Cost and return both stay in the middle band, producing a balanced result.`

Then optionally append one short clause when a support metric is clearly notable inside the current scenario:

- low conflicts => `Conflicts remain low, which suggests smoother coordination.`
- high conflicts => `Conflict pressure is elevated, which may be hurting coordination efficiency.`
- low information age => `Information stays relatively fresh.`
- high information age => `Information is relatively stale.`

Only one optional clause should be appended, and only when the metric is clearly near an extreme for the selected scenario. This keeps the tooltip concise.

## View-Model Responsibilities

### `frontend/src/experimentInsights.js`

Responsibilities after redesign:

- keep `buildTradeoffScatterRows`
- add helper logic that derives tooltip diagnostics from all points in the selected scenario
- return chart-friendly rows that already include:
  - primary judgment label
  - relative standing label
  - explanation sentence

The component should not compute quartiles, normalization ranges, or explanation text inline.

### `frontend/src/App.jsx`

Responsibilities after redesign:

- continue deriving `tradeoffRows` and `filteredTradeoffRows`
- pass the scenario-filtered point set needed for relative judgment
- avoid introducing new global state for the tooltip

### `frontend/src/components/dashboard/ExperimentDeck.jsx`

Responsibilities after redesign:

- preserve the current scatter chart structure
- render the enriched tooltip content in the approved order
- keep the export button, legend, and scenario selector unchanged

## Localization

The tooltip should remain fully localizable.

New translation keys should be added for:

- primary judgment labels
- relative standing labels
- explanation sentences
- any optional explanation fragments or helper prefixes

Avoid baking user-facing judgment copy directly into JSX or helper logic. Helper functions should return semantic keys or stable enums whenever practical.

## Testing Strategy

Testing should focus on the helper layer rather than the chart library.

### Unit Tests

Add or extend tests in `frontend/src/experimentInsights.test.js` to cover:

- absolute judgment classification
- relative standing classification
- explanation sentence generation
- stable handling of edge cases:
  - empty scenario rows
  - identical message counts across a scenario
  - identical completion rates across a scenario
  - very small scenario sample counts

### Component Confidence

Keep component-level expectations lightweight:

- the tradeoff section still renders
- tooltip data flow still includes the enriched diagnostic fields

The redesign should not require heavy visual snapshot tests.

## Expected Outcome

After this redesign, hovering a point on the tradeoff scatter should let a user say, within one glance:

- what run they are looking at
- whether it is strong, weak, or balanced
- whether it is strong because of high completion, low communication cost, or both

This makes the chart more suitable for thesis explanation, classroom demonstration, and dense analysis workflows without changing the underlying experiment data model.
