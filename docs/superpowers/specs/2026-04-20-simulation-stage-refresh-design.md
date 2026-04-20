# Simulation Stage Refresh Design

## Goal

Refresh the simulation presentation page so the final world view feels like the primary thesis-defense stage rather than a debugging visualization.

The approved direction is:

- visual tone: academic presentation screen with light sandtable cues
- page focus: preserve the simulation page structure, but make the world stage visually dominant
- layout: keep a left control rail, a center primary stage, and a narrow right summary rail
- interaction tone: restrained, clear, thesis-friendly, and suitable for screenshots

## Current Context

The current simulation presentation is composed from:

- [`frontend/src/components/dashboard/SimulationPage.jsx`](../../../../frontend/src/components/dashboard/SimulationPage.jsx)
- [`frontend/src/components/dashboard/SimulationStage.jsx`](../../../../frontend/src/components/dashboard/SimulationStage.jsx)
- [`frontend/src/components/dashboard/WorldSvg.jsx`](../../../../frontend/src/components/dashboard/WorldSvg.jsx)
- [`frontend/src/components/dashboard/LiveInsightRail.jsx`](../../../../frontend/src/components/dashboard/LiveInsightRail.jsx)
- [`frontend/src/styles.css`](../../../../frontend/src/styles.css)

The current page already has the right functional pieces:

- playback controls
- world rendering
- simulation controls
- metric summaries
- timeline strip
- hover feedback

The current visual problems are presentation problems, not missing functionality:

- the world canvas still looks like a direct algorithm visualization instead of a presentation surface
- the center stage is fragmented by separate control, legend, and summary containers
- the symbol language is inconsistent enough that the scene reads as ad hoc marks instead of a coherent simulation stage
- the right-side insight rail competes with the world view instead of supporting it

## User-Validated Direction

The approved direction from the user is:

1. Use the `Academic Sandtable Hybrid` direction rather than the pure academic alternative.
2. Keep the page in a three-zone layout:
   - left control rail
   - center primary simulation stage
   - right narrow summary rail
3. Keep the right rail, but compress it into a light summary column rather than a second major information surface.
4. Keep the interface thesis-friendly and screenshot-friendly.
5. Emphasize the center world stage over all other UI elements.

## Design Principles

- The world stage is the first visual priority.
- Controls remain usable but visually subordinate.
- Supporting information should clarify the scene without becoming a second stage.
- Visual polish should come from hierarchy, restraint, and symbol consistency rather than heavy decoration.
- The redesign should improve presentation quality without changing simulation or analytics behavior.

## Non-Goals

This refresh does not:

- change backend APIs
- change simulation calculations
- change experiment analysis logic
- rewrite playback state management
- introduce a new visualization library
- add heavy animation or game-like effects

## Information Architecture

The simulation page should remain a dedicated simulation presentation screen, but with clearer hierarchy.

### 1. Left Control Rail

The left rail remains the parameter and configuration surface.

It should continue to contain:

- communication controls
- decision strategy selection
- grouped configuration fields
- experiment run count
- map layer toggles
- frame input when relevant

Design intent:

- keep it fully usable
- reduce its visual prominence
- let the center stage own the page

### 2. Center Primary Stage

The center column becomes a single continuous stage surface made of:

- a compact integrated playback toolbar
- the world visualization canvas
- a short bottom state band

The center stage must feel like one composed presentation object rather than stacked separate cards.

### 3. Right Narrow Summary Rail

The right rail remains, but only as a narrow thesis-appropriate summary column.

It should contain only high-value, low-volume information:

- current status
- mission summary
- hover/entity inspection details

It must not look like a second dashboard with equal visual weight.

## Layout Design

### Simulation Page Composition

The page should keep the existing three-column relationship, but with different emphasis:

- left rail width stays near its current footprint
- center stage grows visually through stronger grouping and reduced fragmentation
- right rail narrows and lightens so it reads as support, not competition

### Center Stage Composition

The center stage should be organized as:

1. stage header / playback toolbar
2. enlarged world canvas
3. short bottom state band

This is a structural change in presentation only. The playback features remain the same, but they move into a cleaner integrated toolbar.

### Bottom State Band

The current large support band should be replaced by a much shorter stage-adjacent state strip.

It should surface three to four core values such as:

- current keyframe
- remaining targets
- failed agents
- current step or active strategy

Legend content should be reduced so the stage is not followed by a large explanatory block.

### Right Rail Content

The right rail should be compressed into three lightweight blocks:

- `Current Status`: current frame, keyframe location, playback speed, strategy
- `Mission Snapshot`: remaining targets, failed agents, and completion-oriented summary
- `Entity Focus`: hover-driven contextual information or a fallback hint

These blocks should be visually lighter than the center stage and should avoid large equal-weight cards.

## Visual System

The visual language should be a light academic interface with measured sandtable cues.

### Stage Surface

The world surface should no longer be a plain white field.

It should use:

- a very light measured gradient
- weak grid or survey cues
- subtle atmospheric tinting
- restrained frame and edge treatment

The result should suggest a prepared simulation field without becoming a militarized or game-like map.

### Symbol Language

The visual objects should be unified into one coherent system.

- obstacles: deep blue-gray modules instead of stark black blocks
- agents: clearer blue position markers with cleaner contrast treatment
- active targets: retained as red triangles for fast recognition, but redrawn with cleaner scale and proportion
- hotspots: promoted from incidental dots into clearer high-value region markers
- completed targets and failed agents: kept distinct but visually normalized into the same palette family
- trails: thinner and more restrained so they support interpretation without dominating the field
- vision ranges: lighter fill and thinner boundaries to reduce the current bubble-like clutter

### Information Hierarchy

The hierarchy should be fixed as:

1. world stage
2. playback and stage status
3. right summary rail and reduced legend

The user should not encounter competing major cards before understanding the map itself.

## Interaction Design

### Playback Controls

Playback actions remain in the center stage because they are stage-native interactions.

The toolbar should still expose:

- previous frame
- play or pause
- next frame
- speed controls
- view toggles such as vision and trails
- export action where useful

The difference is presentation:

- controls should read as one tool strip
- primary and secondary actions should be visually separated
- the toolbar should feel embedded into the stage rather than floating above it

### Hover Behavior

Hover remains driven by the world view.

The display location changes:

- hover details should be presented in the right rail `Entity Focus` block
- the stage itself should avoid accumulating extra floating explanation UI

This keeps the map visually clean while still supporting explanation during demos.

### Empty and Sparse States

When there is no simulation result or no history:

- keep the existing empty-state behavior
- restyle it to match the new stage language
- avoid showing false metrics or fake timeline detail

The empty state should remain instructional and presentation-appropriate.

## Component Responsibilities

### `SimulationPage.jsx`

Responsible for:

- left, center, right column composition
- assigning the narrow summary rail role
- preserving timeline placement beneath the main stage area

### `SimulationStage.jsx`

Responsible for:

- integrated stage structure
- playback toolbar grouping
- world canvas placement
- short bottom state band

### `WorldSvg.jsx`

Responsible for:

- base field rendering
- visual symbol language
- consistent presentation of obstacles, agents, targets, hotspots, trails, and vision
- hover event emission

### `LiveInsightRail.jsx`

Responsible for:

- narrow summary presentation only
- current status summary
- mission snapshot summary
- hover/entity observation panel

It should stop behaving like a second dashboard column with equal structural weight.

### `LegendRow.jsx`

If retained, it should serve only compact explanatory needs. It should not reintroduce a large secondary support band below the stage.

## Data and State Handling

This redesign should prefer display reorganization over data-model changes.

- existing simulation props remain the source of truth
- hover continues to originate from `WorldSvg`
- stage status values should be derived from current existing data where possible
- no new backend fields should be required

The redesign should remain largely presentational in implementation scope.

## Responsive Behavior

Desktop should preserve the intended three-zone composition.

At narrower widths:

- the right rail may drop below the center stage
- the control rail may stack above the main content
- the center stage must remain the first major content area once the page collapses

On smaller screens, the layout may become single-column, but the world stage should still appear before secondary informational sections.

## Error Handling and Fallbacks

- if `displayWorld` is missing, show the redesigned empty state
- if `history` is empty, degrade the playback toolbar and bottom band gracefully
- if a metric is unavailable, render a simple fallback value such as `-`
- if hover is inactive, the right rail should show a stable hint rather than empty space

The layout must not collapse or produce misleading pseudo-data when simulation context is missing.

## Testing Strategy

The refresh should be verified as a presentation refactor with regression checks.

### Existing Verification

Run existing frontend tests relevant to dashboard rendering and layout.

### Additional Coverage

If current tests do not cover the new composition clearly, add targeted assertions for:

- simulation stage still rendering with world content
- empty-state behavior remaining valid
- right summary rail rendering hover detail or fallback text
- timeline and control rail remaining present after layout changes

### Manual Verification

Manual checking should confirm:

- the center stage is visually dominant on desktop
- the right rail reads as support, not a competing dashboard
- the map is clearer and more coherent in screenshots
- responsive stacking preserves the stage priority

## Acceptance Criteria

The refresh is successful when:

- the simulation page reads first as a presentation stage and only second as a control surface
- the world view becomes the dominant visual object
- the right rail supports interpretation without competing for attention
- the symbol language appears coherent and thesis-appropriate
- playback, hover, toggles, timeline, and export behavior remain intact
- the page works for both live demo use and thesis screenshot capture

## Implementation Notes

Implementation should begin in an isolated git worktree after this design is approved and reviewed by the user.
