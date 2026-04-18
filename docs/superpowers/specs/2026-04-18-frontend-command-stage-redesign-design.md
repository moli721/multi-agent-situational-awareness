# Frontend Command Stage Redesign Design

## Goal

Redesign the frontend into a presentation-first experience for the multi-agent situational awareness project.

The selected direction is:

- visual tone: primarily academic and light
- presentation style: stronger demo-stage emphasis for the simulation view
- motion: restrained technology accents rather than heavy sci-fi styling
- scope: full frontend restructuring is allowed

The redesign should make the simulation screen feel like the main stage during a demo or thesis defense while preserving the experiment analysis depth needed for screenshots, reports, and comparison work.

## Current Context

The current frontend is a single-page React + Vite application centered in [`frontend/src/App.jsx`](../../../../frontend/src/App.jsx) with styling in [`frontend/src/styles.css`](../../../../frontend/src/styles.css).

Current strengths:

- simulation and experiment workflows already exist
- world playback controls are functional
- experiment charts, summary tables, and exports are already implemented
- lightweight bilingual support already exists

Current issues affecting the redesign:

- the page reads like a dense utility dashboard rather than a polished research presentation
- the simulation map, timeline, and analytics compete for attention on the same visual level
- `App.jsx` mixes layout, state wiring, data formatting, and rendering concerns in one file
- styling is serviceable but does not create a memorable visual identity for demos or thesis presentation material

## User-Validated Direction

The approved design direction is:

1. Use an academic light theme as the base.
2. Add a small amount of command-center motion and glow to the simulation stage only.
3. Prioritize both the presentation page and the data page, with the presentation area slightly favored.
4. Allow a full frontend restructure.
5. Choose approach A: "Command Stage" as the dominant layout concept.

## Design Principles

- Put the simulation world map in the strongest visual position on the page.
- Preserve analytical rigor even when the first screen becomes more presentation-oriented.
- Make the layout easier to scan in a thesis defense setting.
- Improve visual quality without changing backend semantics or experiment meaning.
- Keep motion subtle and valuable instead of flashy.
- Preserve existing user workflows: simulate, replay, compare, inspect, and export.

## Non-Goals

This redesign does not:

- change backend APIs
- change simulation logic or experiment calculation logic
- introduce a new routing system
- remove bilingual support
- remove CSV or JSON export features
- add brand-new analytical metrics unrelated to the current project

## Information Architecture

The page should be reorganized into a staged reading flow.

### 1. Hero Header

The top of the page becomes a concise research header with:

- project title
- short research-oriented subtitle
- frontend/backend endpoint hint
- primary actions for running simulation and experiments
- language switch
- a compact summary of current configuration or run state when useful

Purpose:

- give the page a stronger identity
- reduce the feeling of a generic admin panel
- bring the main actions into a deliberate hero area

### 2. Main Stage Layout

The primary content area becomes a three-column stage:

- left: `ControlRail`
- center: `SimulationStage`
- right: `LiveInsightRail`

This is the most important structural change in the redesign.

#### Left: ControlRail

Contains the configuration and toggles already present in the sidebar:

- communication toggle
- strategy selector
- grouped numeric configuration fields
- experiment run count
- map layer toggles
- optional frame input when history exists

Design intent:

- keep configuration accessible but visually subordinate to the center stage
- turn the current sidebar into a more refined control rail with grouped shells and improved spacing

#### Center: SimulationStage

This is the visual hero of the application.

It contains:

- the world map visualization
- playback controls
- quick simulation status chips
- local legend or contextual overlay information where appropriate

Design intent:

- make the map feel like the "demo centerpiece"
- allow the playback controls to read as part of a coherent stage rather than detached utility rows
- visually separate the map stage from lower-priority content using elevation, background treatment, and motion accents

#### Right: LiveInsightRail

Contains real-time supporting context for the stage, for example:

- key metric cards
- hover detail or entity detail summary
- scenario status notes
- derived summary insights that help narrate what the audience is seeing

Design intent:

- support the demo narrative without pushing charts into the hero position
- create a lightweight "operator insight" column that reinforces the simulation stage

### 3. Timeline Strip

The timeline remains present but moves into a dedicated secondary strip below the map stage.

It contains:

- line chart timeline
- summary counters for steps, remaining active targets, and failed agents

Design intent:

- keep temporal analysis close to the simulation stage
- stop the timeline from crowding the main map area

### 4. Experiment Deck

All experiment-heavy analysis moves into a lower section called `ExperimentDeck`.

It will contain grouped subsections for:

- scenario comparison
- strategy comparison
- statistical summary
- benefit-cost view
- run-level tradeoff scatter

Design intent:

- preserve analytical depth
- improve screenshot quality for thesis writing
- keep the first screen presentation-focused without deleting research content

## Visual Language

### Theme

The visual base should be a light academic palette:

- soft off-white / blue-white background
- cool blue as the primary action and map highlight color
- teal as the secondary support color
- orange reserved for warnings, conflicts, or emphasis
- slate text tones for readability

The redesign should explicitly avoid:

- heavy neon sci-fi dark mode
- purple gradient tropes
- flat generic white dashboard styling

### Typography

Typography should feel more editorial and thesis-ready than a default dashboard.

Guidance:

- use a more distinctive display treatment for headings
- keep body and control text highly readable
- create stronger hierarchy between hero titles, section labels, metric values, and auxiliary notes

### Surfaces

Cards and panels should evolve from plain white boxes into refined presentation surfaces:

- larger radii on hero and stage surfaces
- subtle gradients
- softer layered shadows
- gentle border highlights
- occasional translucent or glow accents in the simulation stage

### Motion

Motion should stay limited to high-value areas:

- staged entrance for header, metrics, and main stage
- soft breathing/glow accents around the simulation stage
- polished hover/focus feedback for buttons and controls
- chart reveal timing that feels intentional rather than abrupt

Motion should not become the main point of attention.

## Data Visualization Style

Charts should be restyled to look more publication-ready while staying readable.

Planned improvements:

- lighter grids
- cleaner legends
- better spacing around chart titles and actions
- stronger card hierarchy between chart sections
- more polished metric cards and insight cards
- better table shells and row rhythm for statistical sections

The experiment area should feel like a coherent research deck rather than unrelated chart blocks.

## Component Plan

The redesign should split the current large `App.jsx` into focused presentation components while keeping business logic understandable.

Suggested component structure:

- `AppShell`
- `HeroHeader`
- `SummaryStrip` or `QuickMetricRow`
- `ControlRail`
- `SimulationStage`
- `PlaybackPanel`
- `TimelineStrip`
- `LiveInsightRail`
- `ExperimentDeck`
- `MetricCard`
- `InsightCard`
- `SectionShell`
- `EmptyState`
- `ErrorBanner`

The component split should follow visual boundaries first, not arbitrary micro-components.

## State and Data Flow

The current state model should be preserved as much as possible.

Keep the existing behavior around:

- `config`
- `runs`
- `simResult`
- `expResult`
- playback state
- language state
- display toggles such as vision, trails, and labels

Derived data helpers already in use should continue to feed the new components rather than being rewritten unnecessarily.

Preferred direction:

- keep fetch and orchestration logic near the top-level page container
- pass clean props into presentation components
- move layout rendering out of the top-level logic file where practical

## Error, Empty, and Transitional States

The redesign should standardize empty and error states so that the interface remains polished even before data is available.

Required states:

- no simulation result yet
- no experiment result yet
- request error
- loading simulation
- loading experiments

Design intent:

- placeholders should feel like designed shells rather than plain blank boxes
- loading states should match the presentation tone
- errors should be visible but not visually jarring

## Responsiveness

Desktop is the primary target, but the redesign must still work well on narrower screens.

Responsive behavior:

- desktop: three-column command stage
- tablet: collapse right rail below the stage and soften horizontal density
- mobile: stack sections in this order
  1. hero header
  2. simulation stage
  3. timeline
  4. live insights
  5. control rail
  6. experiment deck

Responsive design should preserve clarity instead of trying to keep the desktop composition unchanged.

## Accessibility and Usability

The redesign should maintain or improve usability by:

- preserving readable contrast
- keeping controls discoverable
- ensuring buttons and toggles still have clear interaction states
- preserving chart readability and export affordances
- avoiding motion that interferes with comprehension

## Verification Plan

Before claiming completion, verify:

- frontend tests still pass
- production build succeeds
- simulation can still run successfully
- playback controls still work: play, pause, step, jump to keyframe, slider
- map layers still toggle correctly
- experiment run flow still works
- metric selection and scenario selection still work
- CSV / JSON exports still work
- layout remains usable on both desktop and narrow widths

Expected verification commands:

- `npm test`
- `npm run build`

Manual UI verification should also cover the main simulate and experiment flows.

## Implementation Notes

- Preserve existing translation keys where practical; add new keys only where the redesign introduces new labels or helper text.
- Styling should continue to live in frontend CSS, but it may be reorganized for clearer section ownership.
- Reuse the current chart data and helper functions rather than re-deriving analysis logic in the UI.
- Keep the redesign focused; do not expand scope into backend or unrelated refactors.

## Repo Hygiene Note

The visual brainstorming workflow created `.superpowers/` files in the repository root. That directory is not currently ignored by the repo-level `.gitignore`.

This does not block the redesign itself, but the implementation phase should avoid accidentally committing brainstorming artifacts.
