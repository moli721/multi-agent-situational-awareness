# Communication Effectiveness Design

## Goal

Improve the simulation so the collaborative communication path produces clearer, defensible benefits in thesis experiments without fabricating results or only repainting charts.

## Current Problem

The current model gives communication agents more shared target knowledge, but that knowledge also makes many agents select the same target. This raises `assignment_conflicts` and can dilute the completion-rate gain. The fault scenario also combines communication degradation with a persistent agent failure probability that can remove almost the whole team, so the result can read as a broad disaster rather than a communication robustness test. Finally, strategy choices and environment events currently share one random stream, so a random strategy can alter target motion, sensing misses, packet loss, and failures just by consuming additional random numbers.

## Approach

The change keeps the existing backend API shape and strategy labels. It improves the simulation engine in three focused areas:

1. Separate random streams for world generation, environment dynamics, sensing, communication, agent fallback motion, and strategy choice. Strategy randomness must not change the environment faced by the other strategies.
2. Strengthen collaborative assignment for `current`: when communication is enabled, build team-wide target hints, resolve first-choice conflicts with a deterministic winner, and let losing agents reselect around occupied targets. This converts shared information into coordination rather than crowding.
3. Rebalance the built-in communication-fault scenario so it models degraded communication first: packet loss, delay, and moderate sensing degradation remain; persistent agent failure becomes light enough that the experiment still evaluates the communication layer.
4. Retune communication defaults to a wider but more selective communication pattern: `comm_range=10`, `max_shared_targets=3`, and `owner_hint_penalty=0.60`.

## Behavioral Requirements

- Normal communication should usually improve or at least not materially harm `task_completion_rate` compared with `without_comm_baseline` under the default experiment configuration.
- Normal communication should reduce completion latency or improve information availability enough to justify the communication overhead.
- Assignment conflict accounting should reflect actual contested first choices, but the assignment phase should use conflict resolution so contested targets do not cascade into repeated redundant pursuit.
- `random` strategy may still make random target choices, but that choice must not perturb target movement, sensing misses, packet loss, or agent failure events for the same seed.
- Existing API consumers keep receiving the same top-level fields: `rows`, `strategy_rows`, `run_rows`, `strategy_stats`, `derived_metrics`, and robustness values.

## Implementation Units

- `backend/src/mas_platform/simulation.py`
  - Add named random streams in `SituationalSimulation.__init__`.
  - Route environment, sensing, communication, motion, and strategy random calls through their named streams.
  - Use `_resolve_conflict_winner` inside `_phase_decide` for the collaborative strategy and reselect losing agents around occupied targets.

- `backend/src/mas_platform/api.py`
  - Reduce the agent failure contribution in the API experiment `with_comm_fault` scenario.

- `backend/src/mas_platform/cli.py`
  - Apply the same communication-fault scenario semantics to retained CLI outputs.

- `backend/tests/test_simulation_coordination.py`
  - Add tests for random-stream isolation and conflict-aware collaborative assignment.

- `backend/tests/test_api_experiment_metrics.py`
  - Keep existing response-shape coverage and update assumptions only if the fault scenario values affect them.

## Testing

Backend tests must cover:

- Same seed and same non-random strategy keep environment event metrics stable when only `decision_strategy` changes.
- Random strategy choices do not perturb target dynamics, packet loss, sensing misses, or failure counts compared with other strategies for a controlled configuration.
- In a controlled conflict setup, the collaborative strategy assigns one winner to a contested target and allows another capable agent to select a different target.
- Existing API experiment tests still pass.

Verification commands:

```bash
cd backend
uv run pytest
uv run mas-experiments --runs 30 --strategies current,nearest,random
```

## Thesis Interpretation

The resulting claim should be framed as: communication improves situational awareness when coupled with conflict-aware task allocation. The ablation remains honest because no-communication and degraded-communication scenarios are still present, and communication cost is still visible through messages and conflict-cost metrics.
