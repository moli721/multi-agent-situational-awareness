# Communication Effectiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the communication-enabled collaborative strategy so it turns shared awareness into lower contention and fairer experiment results.

**Architecture:** Keep the public API and frontend payload shape unchanged. Modify the backend simulation engine by separating random streams and using the existing conflict resolver during assignment. Rebalance built-in fault scenarios and retune communication defaults so experiments represent selective shared awareness rather than broad noisy broadcast.

**Tech Stack:** Python dataclasses, standard `random.Random`, pytest/unittest, existing `uv` backend workflow.

---

## File Structure

- Modify `backend/src/mas_platform/simulation.py`: random-stream ownership and conflict-aware assignment logic.
- Modify `backend/src/mas_platform/config.py`: package-level communication defaults.
- Modify `backend/src/mas_platform/api.py`: API fault scenario configuration.
- Modify `backend/src/mas_platform/cli.py`: CLI fault scenario configuration.
- Modify `frontend/src/dashboardModel.js`: frontend default configuration sent to the API.
- Create `backend/tests/test_simulation_coordination.py`: behavior tests for random-stream isolation and conflict-aware assignment.

### Task 1: Add Failing Coordination Tests

**Files:**
- Create: `backend/tests/test_simulation_coordination.py`
- Test: `backend/tests/test_simulation_coordination.py`

- [ ] **Step 1: Write tests for random-stream isolation and conflict-aware assignment**

Add this file:

```python
from dataclasses import replace
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from mas_platform.config import SimulationConfig  # noqa: E402
from mas_platform.entities import TargetBelief  # noqa: E402
from mas_platform.simulation import SituationalSimulation, run_simulation  # noqa: E402


class SimulationCoordinationTests(unittest.TestCase):
    def test_random_strategy_does_not_change_environment_failure_count(self) -> None:
        base = SimulationConfig(
            width=18,
            height=18,
            num_agents=8,
            num_targets=8,
            max_steps=90,
            num_obstacles=12,
            hotspot_count=2,
            vision_range=3,
            comm_range=6,
            enable_communication=True,
            packet_loss_prob=0.35,
            comm_delay_steps=2,
            sense_miss_prob=0.2,
            agent_failure_prob=0.04,
            fault_injection_start=10,
            random_seed=777,
        )

        current = run_simulation(replace(base, decision_strategy="current"), seed=777)
        random_result = run_simulation(replace(base, decision_strategy="random"), seed=777)

        self.assertEqual(current["failed_agents"], random_result["failed_agents"])

    def test_collaborative_decision_resolves_first_choice_contention(self) -> None:
        config = SimulationConfig(
            width=8,
            height=8,
            num_agents=3,
            num_targets=2,
            max_steps=1,
            num_obstacles=0,
            hotspot_count=1,
            enable_communication=True,
            decision_strategy="current",
            random_seed=91,
        )
        sim = SituationalSimulation(config=config, seed=91)
        sim.obstacles.clear()
        sim.hotspots = [(7, 7)]
        sim.current_step = 0

        sim.agents[0].pos = (0, 0)
        sim.agents[1].pos = (1, 0)
        sim.agents[2].pos = (7, 7)
        sim.targets[0].pos = (2, 0)
        sim.targets[1].pos = (7, 6)

        for agent in sim.agents.values():
            agent.belief_map.clear()
            agent.locally_observed_this_step.clear()
            agent.assigned_target = None

        sim.agents[0].belief_map[0] = TargetBelief(0, (2, 0), 1.0, 0, 0)
        sim.agents[1].belief_map[0] = TargetBelief(0, (2, 0), 1.0, 0, 1)
        sim.agents[1].belief_map[1] = TargetBelief(1, (7, 6), 0.9, 0, 1)
        sim.agents[2].belief_map[1] = TargetBelief(1, (7, 6), 1.0, 0, 2)

        sim._phase_decide()

        assigned_targets = {
            agent.assigned_target
            for agent in sim.agents.values()
            if agent.assigned_target is not None
        }
        self.assertEqual(assigned_targets, {0, 1})
        self.assertEqual(sim.assignment_conflicts, 1)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the new tests and verify the RED state**

Run:

```bash
cd backend
uv run pytest tests/test_simulation_coordination.py -q
```

Expected: at least one test fails because current code shares the RNG stream and does not use `_resolve_conflict_winner` during assignment.

### Task 2: Separate Simulation Random Streams

**Files:**
- Modify: `backend/src/mas_platform/simulation.py`
- Test: `backend/tests/test_simulation_coordination.py`

- [ ] **Step 1: Add named random streams**

In `SituationalSimulation.__init__`, keep `self.rng` for backwards-compatible world generation, then add deterministic child streams:

```python
self.rng = random.Random(self.seed)
self.env_rng = random.Random(self.seed + 10_001)
self.sense_rng = random.Random(self.seed + 20_001)
self.comm_rng = random.Random(self.seed + 30_001)
self.motion_rng = random.Random(self.seed + 40_001)
self.strategy_rng = random.Random(self.seed + 50_001)
```

- [ ] **Step 2: Route random calls by responsibility**

Use:

```python
self.env_rng
```

for `_inject_agent_failures` and `_update_target_dynamics`.

Use:

```python
self.sense_rng
```

for `agent.observe(...)`.

Use:

```python
self.comm_rng
```

for packet loss.

Use:

```python
self.motion_rng
```

for exploration movement when an agent has no target.

Use:

```python
self.strategy_rng
```

for `_resolve_conflict_winner` and `choose_target(..., rng=...)`.

- [ ] **Step 3: Run the random-stream isolation test**

Run:

```bash
cd backend
uv run pytest tests/test_simulation_coordination.py::SimulationCoordinationTests::test_random_strategy_does_not_change_environment_failure_count -q
```

Expected: PASS.

### Task 3: Use Conflict Resolution In Collaborative Assignment

**Files:**
- Modify: `backend/src/mas_platform/simulation.py`
- Test: `backend/tests/test_simulation_coordination.py`

- [ ] **Step 1: Resolve contested first choices before final assignment**

Update `_phase_decide` so it builds `first_choice_groups`, increments `assignment_conflicts`, assigns a winner for contested targets through `_resolve_conflict_winner`, and lets losing agents perform a second selection with occupied targets excluded.

The intended flow is:

```python
conflict_winners = {}
for target_id, agent_ids in first_choice_groups.items():
    if len(agent_ids) > 1:
        winner = self._resolve_conflict_winner(target_id, agent_ids)
        if winner is not None:
            conflict_winners[winner] = target_id
```

Then, during final assignment:

```python
preselected_target = conflict_winners.get(agent_id)
if preselected_target is not None and preselected_target not in occupied_targets:
    chosen_target = preselected_target
else:
    chosen_target = agent.choose_target(... occupied=occupied_targets ...)
```

Only assign the chosen target if it is still active and not occupied.

- [ ] **Step 2: Run the conflict-resolution test**

Run:

```bash
cd backend
uv run pytest tests/test_simulation_coordination.py::SimulationCoordinationTests::test_collaborative_decision_resolves_first_choice_contention -q
```

Expected: PASS.

### Task 4: Rebalance Defaults And Communication Fault Scenarios

**Files:**
- Modify: `backend/src/mas_platform/config.py`
- Modify: `backend/src/mas_platform/api.py`
- Modify: `backend/src/mas_platform/cli.py`
- Modify: `frontend/src/dashboardModel.js`
- Test: `backend/tests/test_api_experiment_metrics.py`

- [ ] **Step 1: Update shared communication defaults**

Use this tuned default set in `config.py`, both backend `_base_config` functions, and `frontend/src/dashboardModel.js`:

```python
comm_range=10
max_shared_targets=3
owner_hint_penalty=0.60
```

- [ ] **Step 2: Update API fault scenario**

In `api.experiments`, keep packet loss and delay but reduce persistent agent failure:

```python
packet_loss_prob=min(0.8, base.packet_loss_prob + 0.25),
comm_delay_steps=min(6, base.comm_delay_steps + 1),
sense_miss_prob=min(0.6, base.sense_miss_prob + 0.08),
agent_failure_prob=max(base.agent_failure_prob, 0.005),
```

- [ ] **Step 3: Update CLI retained-output scenario**

In `cli._build_scenarios`, use the same semantics:

```python
packet_loss_prob=0.25,
comm_delay_steps=2,
sense_miss_prob=0.23,
agent_failure_prob=0.005,
fault_injection_start=60,
```

- [ ] **Step 4: Run existing API tests**

Run:

```bash
cd backend
uv run pytest tests/test_api_experiment_metrics.py -q
```

Expected: PASS.

### Task 5: Full Verification And Experiment Refresh

**Files:**
- Verify all touched files.

- [ ] **Step 1: Run full backend tests**

Run:

```bash
cd backend
uv run pytest -q
```

Expected: all tests pass.

- [ ] **Step 2: Run retained experiments**

Run:

```bash
cd backend
uv run mas-experiments --runs 30 --strategies current,nearest,random
```

Expected: command completes and updates `backend/results/` CSV and PNG outputs.

- [ ] **Step 3: Inspect key retained metrics**

Run:

```bash
cd backend
powershell -Command "Import-Csv .\\results\\experiment_strategy_matrix.csv | Format-Table strategy,scenario,task_completion_rate,task_completion_latency,messages_sent,assignment_conflicts,failed_agents -AutoSize"
```

Expected: normal communication has a defensible completion or latency benefit over no communication, and communication fault no longer represents near-total team loss.
