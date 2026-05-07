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
from mas_platform.simulation import SituationalSimulation  # noqa: E402


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

        current_sim = SituationalSimulation(
            replace(base, decision_strategy="current"),
            seed=777,
        )
        random_sim = SituationalSimulation(
            replace(base, decision_strategy="random"),
            seed=777,
        )

        for step in range(30):
            current_sim.current_step = step
            random_sim.current_step = step
            current_sim.step()
            random_sim.step()

        current_failed = sum(1 for agent in current_sim.agents.values() if agent.failed)
        random_failed = sum(1 for agent in random_sim.agents.values() if agent.failed)
        self.assertEqual(current_failed, random_failed)

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
        sim.agents[1].belief_map[1] = TargetBelief(1, (7, 6), 0.4, 0, 1)
        sim.agents[2].belief_map[1] = TargetBelief(1, (7, 6), 1.0, 0, 2)

        resolver_calls = []

        def fixed_winner(target_id, agent_ids):
            resolver_calls.append((target_id, tuple(agent_ids)))
            return 1

        sim._resolve_conflict_winner = fixed_winner  # type: ignore[method-assign]
        sim._phase_decide()

        assigned_targets = {
            agent.assigned_target
            for agent in sim.agents.values()
            if agent.assigned_target is not None
        }
        self.assertEqual(len(resolver_calls), 1)
        self.assertEqual(resolver_calls[0][0], 0)
        self.assertEqual(set(resolver_calls[0][1]), {0, 1})
        self.assertEqual(sim.agents[1].assigned_target, 0)
        self.assertEqual(assigned_targets, {0, 1})
        self.assertEqual(sim.assignment_conflicts, 1)


if __name__ == "__main__":
    unittest.main()
