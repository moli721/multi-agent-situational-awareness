# Frontend Thesis Presentation Redesign Design

## Goal

Redesign the frontend into a thesis-friendly presentation interface for the multi-agent situational awareness project.

The updated direction is:

- visual tone: light academic presentation interface
- page structure: split the product into two dedicated pages
- simulation emphasis: make the final world view the dominant visual element
- analysis emphasis: move experiment charts into a separate analysis page
- motion: restrained technology accents only where they improve presentation quality

The redesign should support two different use cases clearly:

- a simulation presentation page suitable for graduation-project demonstrations and thesis defense
- an experiment analysis page suitable for screenshots, explanation, and report writing

## Current Context

The current frontend is a React + Vite application centered in [`frontend/src/App.jsx`](../../../../frontend/src/App.jsx) with styling in [`frontend/src/styles.css`](../../../../frontend/src/styles.css).

Current strengths:

- simulation and experiment flows already exist
- world playback controls already work
- experiment charts, tables, and export actions already exist
- bilingual support already exists

Current issues that triggered this revision:

- the single-page layout still leaves too much empty space in several states
- the final world view is not large enough to feel like the core presentation surface
- the previous right-side "stage summary" treatment does not match a graduation-project tone
- the language switch layout is visually awkward
- simulation and analytics still compete for attention when they should serve different presentation goals

## User-Validated Direction

The approved revised direction is:

1. Keep the academic light visual base.
2. Keep a restrained amount of technology styling.
3. Split the frontend into two dedicated pages.
4. Page one is for simulation presentation.
5. Page two is for experiment analysis.
6. The final world view should become significantly larger.
7. The previous "stage summary" framing should be removed or replaced with more thesis-appropriate supporting content.
8. The language switch should be corrected as a standard page-header control.

## Design Principles

- Give the simulation page a strong, presentation-first hierarchy.
- Avoid large empty panels when there is no meaningful content to show.
- Use terminology and layout that feel appropriate for a graduation-project interface.
- Separate "live demonstration" content from "research analysis" content.
- Keep all current simulation and experiment behaviors intact.
- Prefer clarity and page rhythm over trying to fit everything above the fold.

## Non-Goals

This redesign does not:

- change backend APIs
- change simulation or experiment calculation logic
- remove export features
- remove bilingual support
- introduce unrelated new metrics
- expand into backend refactors

## Information Architecture

The frontend should be reorganized into two dedicated pages instead of one long mixed dashboard.

### 1. Shared Page Header

Both pages should share a coherent top header containing:

- project title
- concise subtitle
- page navigation
- language switch
- primary actions when relevant

The language switch should become a normal, correctly sized segmented control instead of a cramped decorative pill.

The page navigation should clearly expose:

- `仿真展示` / `Simulation`
- `实验分析` / `Analysis`

This navigation should feel like page-level routing, not a small afterthought.

### 2. Simulation Presentation Page

This page is the primary thesis-defense screen.

Its purpose is to show the system running, explain the current state, and keep the final world view visually dominant.

#### Core Layout

The page should be structured as:

- header area
- main simulation presentation area
- compact supporting analysis strip

#### Main Simulation Presentation Area

This area should become the strongest part of the interface.

Recommended composition:

- left: compact control panel
- center: enlarged final world view / playback stage
- optional right: thesis-appropriate supporting information

The final world view must be enlarged substantially relative to the current revision.

Design intent:

- the map should be the first thing an audience notices
- the playback experience should feel central, not secondary
- the map should not be visually squeezed by decorative side content

#### Control Panel

The control area should remain available but take less visual dominance.

It contains:

- communication toggle
- decision strategy selector
- grouped configuration fields
- experiment run count
- map layer toggles
- optional frame input

Design intent:

- keep controls usable
- avoid letting controls overpower the visual stage
- allow grouped expansion or visual compression if needed

#### Supporting Information

The previous "stage summary" concept should be replaced.

Acceptable replacements:

- `运行信息` / `Simulation Info`
- `仿真说明` / `Simulation Notes`
- `关键指标` / `Key Metrics`

This area should only exist if it contains genuinely useful, thesis-appropriate information such as:

- current strategy
- current step
- remaining targets
- failed agents
- keyframe status

If the content is weak or sparse, the right column should be removed and the world view should grow instead.

#### Timeline Placement

The timeline should remain on the simulation page, but as a compact secondary strip below the main world view.

It should:

- preserve the key three-line story
- stay visually flatter and shorter than before
- support interpretation without creating a large empty block

#### Empty State

The no-simulation state should not appear as a mostly blank card.

It should become a designed empty state with:

- a clear visual placeholder
- concise guidance text
- an obvious next action

### 3. Experiment Analysis Page

This page is the dedicated research-analysis screen.

Its purpose is to present experiment findings cleanly and with enough density for thesis screenshots and explanation.

#### Top Summary Band

The analysis page should begin with a summary band before the heavy charts.

It should contain:

- experiment configuration summary
- headline metrics
- export actions

This gives the page context before the user reaches detailed graphs.

#### Main Analysis Blocks

The analysis page should be arranged in ordered layers rather than flat equal-weight cards.

##### Layer 1: Core Comparisons

These should be the largest, most prominent blocks:

- scenario comparison
- strategy comparison

They form the main visual narrative of the analysis page.

##### Layer 2: Statistical and Cost Analysis

These should appear beneath the core comparisons in a cleaner, more report-like arrangement:

- statistical summary
- benefit-cost view
- run-level tradeoff scatter

Design intent:

- improve information density
- create a layout suitable for thesis screenshots
- reduce the "generic admin dashboard" feeling

#### Table Treatment

The statistical table should be designed more like a research table than a plain dashboard grid.

Improvements should include:

- stronger header hierarchy
- better numeric alignment
- more disciplined row spacing
- consistent card framing with surrounding charts

## Visual Language

### Theme

The base theme remains a light academic palette:

- soft off-white / blue-white canvas
- cool blue for primary emphasis
- teal for secondary support
- orange only for warnings or emphasis
- slate text tones for readability

Avoid:

- heavy dark command-center styling
- showy sci-fi neon treatment
- generic corporate dashboard flatness

### Typography

Typography should feel appropriate for a graduation-project product demo:

- stronger display treatment for titles
- clean readable body text
- clear distinction between page titles, section titles, notes, and numeric summaries

### Surfaces

Panels should feel refined but not overdesigned:

- larger radii on major presentation surfaces
- subtle gradients
- clean borders
- soft shadows
- restrained glow only around the primary simulation surface where useful

### Motion

Motion should be limited and intentional:

- soft page entrance
- polished button and tab states
- restrained emphasis around the main simulation surface
- minimal chart reveal choreography

No decorative motion should interfere with academic clarity.

## Navigation and Routing

The redesign now requires page-level separation.

This can be implemented with lightweight in-app page switching or simple local routing, but the user experience should behave like two distinct pages:

- Simulation page
- Analysis page

The user should not feel like they are still on one oversized dashboard.

## Component Plan

The redesign should split the frontend into page-level and section-level components.

Suggested structure:

- `AppShell`
- `PageNavigation`
- `SimulationPage`
- `AnalysisPage`
- `HeroHeader`
- `LanguageSwitch`
- `SimulationControls`
- `FinalWorldStage`
- `SimulationInfoPanel`
- `TimelineStrip`
- `AnalysisSummaryBand`
- `AnalysisComparisonSection`
- `AnalysisStatsSection`
- `MetricCard`
- `SectionShell`
- `EmptyState`
- `ErrorBanner`

The component split should follow page and content boundaries rather than arbitrary micro-components.

## State and Data Flow

The current state model should be preserved where possible.

Keep the existing behavior around:

- `config`
- `runs`
- `simResult`
- `expResult`
- playback state
- language state
- layer toggles

Preferred direction:

- keep fetch orchestration near the page container
- derive page-ready props with helper modules
- feed smaller presentation components with clean props

## Error, Empty, and Transitional States

The redesign should standardize:

- no simulation result yet
- no experiment result yet
- loading simulation
- loading experiments
- request errors

All of these should feel intentionally designed and should not produce large visually empty areas.

## Responsiveness

Desktop remains the primary target, but the redesign must still behave well on narrower screens.

Responsive behavior should prioritize clarity:

- simulation page: world view remains primary, controls stack beneath when necessary
- analysis page: large comparisons stack vertically on smaller widths
- navigation and language switch remain usable at small widths

## Accessibility and Usability

The redesign should maintain or improve:

- readable contrast
- discoverable controls
- clear active states for page navigation and language switching
- chart readability
- export affordances

## Verification Plan

Before claiming completion, verify:

- frontend tests still pass
- production build succeeds
- simulation page renders correctly
- analysis page renders correctly
- final world view is noticeably larger than before
- navigation between pages works
- language switch layout is corrected
- playback controls still work
- map layer toggles still work
- experiment charts and exports still work
- layout remains usable on desktop and narrow widths

Expected verification commands:

- `npm test`
- `npm run build`

Manual UI verification should explicitly check both dedicated pages.

## Implementation Notes

- Preserve existing translation keys where practical, but add page-navigation and revised section-label keys as needed.
- Remove or rename thesis-inappropriate labels such as the previous "stage summary" framing.
- Reuse existing chart data helpers and playback logic rather than rewriting analysis semantics.
- Keep the redesign focused on structure, presentation quality, and clarity.

## Repo Hygiene Note

The visual brainstorming workflow created `.superpowers/` files in the repository root. That directory is not currently ignored by the repo-level `.gitignore`.

Implementation should continue avoiding accidental commits of those brainstorming artifacts.
