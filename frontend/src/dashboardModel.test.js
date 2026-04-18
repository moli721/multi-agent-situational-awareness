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
  assert.equal(world.height, 16);
  assert.equal(world.agents[0].id, 1);
  assert.equal(world.active_targets.length, 1);
  assert.equal(world.completed_targets.length, 1);
  assert.deepEqual(world.hotspots, [[8, 8]]);
});

test("buildTrails keeps a bounded history for each agent", () => {
  const trails = buildTrails(
    [
      { agents: { 1: { pos: [0, 0] } } },
      { agents: { 1: { pos: [1, 1] } } },
      { agents: { 1: { pos: [2, 2] } } }
    ],
    2,
    2
  );

  assert.deepEqual(trails.get("1"), [
    { x: 1, y: 1 },
    { x: 2, y: 2 }
  ]);
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
  assert.match(labels[1].label, /playback\.keyframeLabel/);
  assert.match(labels[2].label, /playback\.keyframeLabel/);
});

test("dashboard model exports presentation constants for controls", () => {
  assert.equal(DEFAULT_CONFIG.random_seed, 2026);
  assert.ok(FIELD_GROUPS.length >= 3);
  assert.deepEqual(PLAY_SPEED_OPTIONS, [0.5, 1, 2, 4]);
  assert.equal(STAT_METRIC_OPTIONS[0].value, "task_completion_rate");
});
