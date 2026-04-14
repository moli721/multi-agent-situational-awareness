import random
from dataclasses import asdict, replace
from statistics import mean
from typing import Any, Dict, List, Optional, Set, Tuple

from .config import SimulationConfig
from .entities import Message, Position, SituationalAgent, Target, manhattan_distance


class SituationalSimulation:
    def __init__(self, config: SimulationConfig, seed: Optional[int] = None):
        self.config = config
        self.seed = config.random_seed if seed is None else seed
        self.rng = random.Random(self.seed)
        self.current_step = 0

        self.agents: Dict[int, SituationalAgent] = {}
        self.targets: Dict[int, Target] = {}
        self.obstacles: Set[Position] = set()
        self.hotspots: List[Position] = []
        self.visited_cells: Set[Position] = set()

        self.target_first_observed_step: Dict[int, int] = {}
        self.target_first_assigned_step: Dict[int, int] = {}
        self.target_completion_step: Dict[int, int] = {}
        self.target_owner_hint: Dict[int, int] = {}
        self.assignment_conflicts: int = 0
        self.info_age_total: float = 0.0
        self.info_age_samples: int = 0

        self.history: List[Dict[str, Any]] = []

        self._init_world()

    def _random_pos(self) -> Position:
        return (
            self.rng.randrange(self.config.width),
            self.rng.randrange(self.config.height),
        )

    def _clamp_pos(self, x: int, y: int) -> Position:
        return (
            max(0, min(x, self.config.width - 1)),
            max(0, min(y, self.config.height - 1)),
        )

    def _free_neighbors(self, pos: Position, blocked: Set[Position]) -> List[Position]:
        neighbors: List[Position] = []
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0:
                    continue
                candidate = self._clamp_pos(pos[0] + dx, pos[1] + dy)
                if candidate in blocked:
                    continue
                neighbors.append(candidate)
        return neighbors

    def _random_free_pos(self, blocked: Set[Position]) -> Position:
        for _ in range(self.config.width * self.config.height * 2):
            p = self._random_pos()
            if p not in blocked:
                return p
        # Fallback in extreme crowded cases.
        for x in range(self.config.width):
            for y in range(self.config.height):
                p = (x, y)
                if p not in blocked:
                    return p
        return (0, 0)

    def _init_world(self) -> None:
        occupied: Set[Position] = set()

        # Obstacles
        for _ in range(max(0, self.config.num_obstacles)):
            p = self._random_free_pos(occupied)
            self.obstacles.add(p)
            occupied.add(p)

        # Hotspots (where targets are likely to move toward)
        for _ in range(max(1, self.config.hotspot_count)):
            p = self._random_free_pos(occupied)
            self.hotspots.append(p)
            occupied.add(p)

        # Agents
        for agent_id in range(self.config.num_agents):
            p = self._random_free_pos(occupied)
            self.agents[agent_id] = SituationalAgent(agent_id=agent_id, pos=p)
            occupied.add(p)
            self.visited_cells.add(p)

        # Targets
        for target_id in range(self.config.num_targets):
            p = self._random_free_pos(occupied)
            self.targets[target_id] = Target(target_id=target_id, pos=p)
            occupied.add(p)

    def _move_towards_with_obstacle_avoidance(
        self,
        src: Position,
        dst: Position,
        blocked: Set[Position],
    ) -> Position:
        if src == dst:
            return src

        candidates = self._free_neighbors(src, blocked)
        if not candidates:
            return src

        candidates.sort(
            key=lambda p: (
                manhattan_distance(p, dst),
                abs(p[0] - src[0]) + abs(p[1] - src[1]),
            )
        )
        return candidates[0]

    def _inject_agent_failures(self) -> None:
        if self.current_step < self.config.fault_injection_start:
            return
        if self.config.agent_failure_prob <= 0:
            return

        for agent in self.agents.values():
            if agent.failed:
                continue
            if self.rng.random() < self.config.agent_failure_prob:
                agent.failed = True
                agent.assigned_target = None
                agent.inbox.clear()

    def _nearest_hotspot(self, pos: Position) -> Position:
        return min(self.hotspots, key=lambda h: manhattan_distance(pos, h))

    def _update_target_dynamics(self) -> None:
        blocked = set(self.obstacles)
        blocked.update(agent.pos for agent in self.agents.values())
        blocked.update(target.pos for target in self.targets.values() if target.active)

        for target in self.targets.values():
            if not target.active:
                continue
            if self.rng.random() > self.config.target_move_prob:
                continue

            # Bias target movement toward event hotspots, plus random disturbance.
            if self.rng.random() < self.config.target_hotspot_bias:
                hotspot = self._nearest_hotspot(target.pos)
                next_pos = self._move_towards_with_obstacle_avoidance(
                    src=target.pos,
                    dst=hotspot,
                    blocked=blocked,
                )
            else:
                neighbors = self._free_neighbors(target.pos, blocked)
                next_pos = self.rng.choice(neighbors) if neighbors else target.pos

            blocked.discard(target.pos)
            target.pos = next_pos
            blocked.add(target.pos)

    def _comm_neighbors(self, source: SituationalAgent) -> List[SituationalAgent]:
        neighbors: List[SituationalAgent] = []
        for other in self.agents.values():
            if other.agent_id == source.agent_id or other.failed:
                continue
            if manhattan_distance(source.pos, other.pos) <= self.config.comm_range:
                neighbors.append(other)
        return neighbors

    def _phase_process_inbox(self) -> None:
        for agent in self.agents.values():
            agent.reset_step_cache()
            agent.process_inbox(
                current_step=self.current_step,
                belief_decay=self.config.belief_decay,
                min_tracking_confidence=self.config.min_tracking_confidence,
            )

    def _sample_information_age(self) -> None:
        active_target_ids = {target_id for target_id, target in self.targets.items() if target.active}
        if not active_target_ids:
            return
        for agent in self.agents.values():
            if agent.failed:
                continue
            for target_id in active_target_ids:
                belief = agent.belief_map.get(target_id)
                if belief is None:
                    # Penalize blind spots so "unknown targets" are reflected in age metric.
                    self.info_age_total += float(self.current_step)
                    self.info_age_samples += 1
                    continue
                self.info_age_total += float(max(0, self.current_step - belief.observed_step))
                self.info_age_samples += 1

    def _phase_observe(self) -> None:
        for agent in self.agents.values():
            seen_ids = agent.observe(
                targets=self.targets,
                current_step=self.current_step,
                vision_range=self.config.vision_range,
                sense_miss_prob=self.config.sense_miss_prob,
                position_noise_radius=self.config.position_noise_radius,
                clamp_fn=self._clamp_pos,
                rng=self.rng,
            )
            for target_id in seen_ids:
                self.target_first_observed_step.setdefault(target_id, self.current_step)

    def _phase_communicate(self) -> None:
        if not self.config.enable_communication:
            return

        for agent in self.agents.values():
            if agent.failed:
                continue

            payload = agent.select_share_payload(
                current_step=self.current_step,
                belief_decay=self.config.belief_decay,
                max_shared_targets=self.config.max_shared_targets,
                min_tracking_confidence=self.config.min_tracking_confidence,
            )
            if not payload:
                continue

            for neighbor in self._comm_neighbors(agent):
                if self.rng.random() < self.config.packet_loss_prob:
                    continue
                message = Message(
                    deliver_step=self.current_step + self.config.comm_delay_steps,
                    sender_id=agent.agent_id,
                    beliefs=payload,
                )
                neighbor.inbox.append(message)
                agent.messages_sent += 1

    def _build_team_distance_hints(self) -> Dict[int, Tuple[int, int]]:
        hints: Dict[int, Tuple[int, int]] = {}
        for target_id, target in self.targets.items():
            if not target.active:
                continue
            best: Optional[Tuple[int, int]] = None
            for agent in self.agents.values():
                if agent.failed:
                    continue
                belief = agent.belief_map.get(target_id)
                if belief is None:
                    continue
                age = max(0, self.current_step - belief.observed_step)
                eff_conf = belief.confidence * ((1 - self.config.belief_decay) ** age)
                if eff_conf < self.config.min_tracking_confidence:
                    continue
                candidate = (manhattan_distance(agent.pos, belief.pos), agent.agent_id)
                if best is None or candidate < best:
                    best = candidate
            if best is not None:
                best_distance, best_agent_id = best
                hints[target_id] = (best_agent_id, best_distance)
        return hints

    def _resolve_conflict_winner(self, target_id: int, agent_ids: List[int]) -> Optional[int]:
        strategy = (self.config.decision_strategy or "current").lower()
        if strategy == "random":
            if not agent_ids:
                return None
            return self.rng.choice(sorted(agent_ids))

        ranked: List[Tuple[int, float, int, int]] = []
        for agent_id in agent_ids:
            agent = self.agents[agent_id]
            belief = agent.belief_map.get(target_id)
            if belief is None:
                continue
            age = max(0, self.current_step - belief.observed_step)
            eff_conf = belief.confidence * ((1 - self.config.belief_decay) ** age)
            distance = manhattan_distance(agent.pos, belief.pos)
            local_priority = 0 if target_id in agent.locally_observed_this_step else 1
            if strategy == "nearest":
                local_priority = 1
            ranked.append((distance, -eff_conf, local_priority, agent_id))
        if not ranked:
            return None
        ranked.sort()
        return ranked[0][3]

    def _best_candidate_distance(self, agent: SituationalAgent) -> int:
        best_distance: Optional[int] = None
        for target_id, target in self.targets.items():
            if not target.active:
                continue
            belief = agent.belief_map.get(target_id)
            if belief is None:
                continue
            age = max(0, self.current_step - belief.observed_step)
            eff_conf = belief.confidence * ((1 - self.config.belief_decay) ** age)
            if eff_conf < self.config.min_tracking_confidence:
                continue
            dist = manhattan_distance(agent.pos, belief.pos)
            if best_distance is None or dist < best_distance:
                best_distance = dist
        if best_distance is None:
            return 10**9
        return best_distance

    def _phase_decide(self) -> None:
        for agent in self.agents.values():
            agent.assigned_target = None
            if agent.failed:
                continue

        team_distance_hints = self._build_team_distance_hints()
        occupied_targets: Set[int] = set()
        active_agent_ids = [
            agent_id for agent_id, agent in self.agents.items() if not agent.failed
        ]
        active_agent_ids.sort(
            key=lambda agent_id: (self._best_candidate_distance(self.agents[agent_id]), agent_id)
        )
        first_choice_groups: Dict[int, List[int]] = {}
        for agent_id in active_agent_ids:
            first_choice = self.agents[agent_id].choose_target(
                targets=self.targets,
                current_step=self.current_step,
                belief_decay=self.config.belief_decay,
                min_tracking_confidence=self.config.min_tracking_confidence,
                owner_hint=self.target_owner_hint,
                owner_penalty=self.config.owner_hint_penalty,
                occupied=set(),
                team_distance_hints=team_distance_hints,
                strategy=self.config.decision_strategy,
                rng=self.rng,
            )
            if first_choice is None:
                continue
            first_choice_groups.setdefault(first_choice, []).append(agent_id)
        self.assignment_conflicts += sum(
            1 for agent_ids in first_choice_groups.values() if len(agent_ids) > 1
        )

        for agent_id in active_agent_ids:
            agent = self.agents[agent_id]

            chosen_target = agent.choose_target(
                targets=self.targets,
                current_step=self.current_step,
                belief_decay=self.config.belief_decay,
                min_tracking_confidence=self.config.min_tracking_confidence,
                owner_hint=self.target_owner_hint,
                owner_penalty=self.config.owner_hint_penalty,
                occupied=occupied_targets,
                team_distance_hints=team_distance_hints,
                strategy=self.config.decision_strategy,
                rng=self.rng,
            )
            if chosen_target is None:
                continue

            occupied_targets.add(chosen_target)
            agent.assigned_target = chosen_target
            agent.total_decisions += 1
            self.target_owner_hint[chosen_target] = agent_id

            winner_belief = agent.belief_map.get(chosen_target)
            if winner_belief is not None and winner_belief.source_agent_id != agent_id:
                agent.shared_based_decisions += 1
            if chosen_target in self.target_first_observed_step:
                self.target_first_assigned_step.setdefault(chosen_target, self.current_step)

    def _phase_act(self) -> None:
        blocked = set(self.obstacles)
        blocked.update(agent.pos for agent in self.agents.values())

        # Move active agents with collision avoidance.
        for agent_id in sorted(self.agents):
            agent = self.agents[agent_id]
            if agent.failed:
                continue
            blocked.discard(agent.pos)

            target_pos: Optional[Position] = None
            if agent.assigned_target is not None:
                belief = agent.belief_map.get(agent.assigned_target)
                if belief is not None:
                    target_pos = belief.pos

            if target_pos is None:
                candidates = self._free_neighbors(agent.pos, blocked)
                next_pos = self.rng.choice(candidates) if candidates else agent.pos
            else:
                next_pos = self._move_towards_with_obstacle_avoidance(
                    src=agent.pos,
                    dst=target_pos,
                    blocked=blocked,
                )

            blocked.add(next_pos)
            agent.pos = next_pos
            self.visited_cells.add(next_pos)

            for target in self.targets.values():
                if not target.active:
                    continue
                if agent.pos == target.pos:
                    target.active = False
                    self.target_completion_step.setdefault(target.target_id, self.current_step)

    def _record_history_step(self) -> None:
        if not self.config.record_history:
            return
        self.history.append(
            {
                "step": self.current_step,
                "agents": {
                    agent_id: {"pos": agent.pos, "failed": agent.failed}
                    for agent_id, agent in self.agents.items()
                },
                "targets": {
                    target_id: {"pos": target.pos, "active": target.active}
                    for target_id, target in self.targets.items()
                },
                "obstacles": list(self.obstacles),
                "hotspots": list(self.hotspots),
            }
        )

    def step(self) -> None:
        self._inject_agent_failures()
        self._update_target_dynamics()
        self._phase_process_inbox()
        self._phase_observe()
        self._phase_communicate()
        self._phase_decide()
        self._phase_act()
        self._sample_information_age()
        self._record_history_step()

    def run(self) -> Dict[str, Any]:
        total_steps = self.config.max_steps
        for step in range(self.config.max_steps):
            self.current_step = step
            self.step()
            if all(not target.active for target in self.targets.values()):
                total_steps = step + 1
                break

        metrics = self._build_metrics(total_steps=total_steps)
        return {
            "config": asdict(self.config),
            "metrics": metrics,
            "history": self.history if self.config.record_history else None,
        }

    def _build_metrics(self, total_steps: int) -> Dict[str, float]:
        completed_targets = sum(1 for target in self.targets.values() if not target.active)
        completion_rate = completed_targets / max(1, self.config.num_targets)

        decision_latencies: List[int] = []
        for target_id, completion_step in self.target_completion_step.items():
            observed_step = self.target_first_observed_step.get(target_id)
            if observed_step is None:
                continue
            decision_latencies.append(max(0, completion_step - observed_step))
        task_completion_latency = (
            mean(decision_latencies)
            if decision_latencies
            else float(self.config.max_steps)
        )

        total_decisions = sum(agent.total_decisions for agent in self.agents.values())
        shared_decisions = sum(agent.shared_based_decisions for agent in self.agents.values())
        collaboration_efficiency = shared_decisions / total_decisions if total_decisions else 0.0

        messages_sent = sum(agent.messages_sent for agent in self.agents.values())
        messages_received = sum(agent.messages_received for agent in self.agents.values())
        failed_agents = sum(1 for agent in self.agents.values() if agent.failed)

        coverage_denominator = max(1, self.config.width * self.config.height - len(self.obstacles))
        coverage_rate = len(self.visited_cells) / coverage_denominator
        mean_info_age = (
            self.info_age_total / self.info_age_samples
            if self.info_age_samples > 0
            else 0.0
        )

        return {
            "seed": float(self.seed),
            "steps_used": float(total_steps),
            "task_completion_rate": float(round(completion_rate, 4)),
            "collaboration_efficiency": float(round(collaboration_efficiency, 4)),
            "task_completion_latency": float(round(task_completion_latency, 4)),
            # Backward-compatible alias for existing consumers.
            "decision_response_time_steps": float(round(task_completion_latency, 4)),
            "messages_sent": float(messages_sent),
            "messages_received": float(messages_received),
            "failed_agents": float(failed_agents),
            "coverage_rate": float(round(coverage_rate, 4)),
            "average_information_age": float(round(mean_info_age, 4)),
            "assignment_conflicts": float(self.assignment_conflicts),
        }


def run_simulation(config: SimulationConfig, seed: Optional[int] = None) -> Dict[str, float]:
    simulation = SituationalSimulation(config=config, seed=seed)
    result = simulation.run()
    return result["metrics"]


def run_simulation_detailed(config: SimulationConfig, seed: Optional[int] = None) -> Dict[str, Any]:
    simulation = SituationalSimulation(config=config, seed=seed)
    return simulation.run()


def run_monte_carlo(
    config: SimulationConfig,
    runs: int,
    seed_start: Optional[int] = None,
) -> List[Dict[str, float]]:
    base_seed = config.random_seed if seed_start is None else seed_start
    results: List[Dict[str, float]] = []
    for run_idx in range(runs):
        run_seed = base_seed + run_idx
        run_config = replace(config, random_seed=run_seed)
        result = run_simulation(run_config, seed=run_seed)
        results.append(result)
    return results
