from dataclasses import dataclass, field, replace
from typing import Dict, List, Optional, Set, Tuple

Position = Tuple[int, int]


def manhattan_distance(a: Position, b: Position) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


@dataclass(frozen=True)
class TargetBelief:
    target_id: int
    pos: Position
    confidence: float
    observed_step: int
    source_agent_id: int


@dataclass(frozen=True)
class Message:
    deliver_step: int
    sender_id: int
    beliefs: Dict[int, TargetBelief]


@dataclass
class Target:
    target_id: int
    pos: Position
    active: bool = True


@dataclass
class SituationalAgent:
    agent_id: int
    pos: Position
    failed: bool = False

    belief_map: Dict[int, TargetBelief] = field(default_factory=dict)
    locally_observed_this_step: Set[int] = field(default_factory=set)
    inbox: List[Message] = field(default_factory=list)

    assigned_target: Optional[int] = None

    messages_sent: int = 0
    messages_received: int = 0
    total_decisions: int = 0
    shared_based_decisions: int = 0
    resolved_conflicts: int = 0

    def reset_step_cache(self) -> None:
        self.locally_observed_this_step.clear()

    def process_inbox(
        self,
        current_step: int,
        belief_decay: float,
        min_tracking_confidence: float,
    ) -> None:
        if self.failed:
            self.inbox.clear()
            return

        pending: List[Message] = []
        for msg in self.inbox:
            if msg.deliver_step > current_step:
                pending.append(msg)
                continue

            self.messages_received += 1
            for target_id, incoming in msg.beliefs.items():
                age = max(0, current_step - incoming.observed_step)
                decayed_conf = incoming.confidence * ((1 - belief_decay) ** age)
                if decayed_conf < min_tracking_confidence:
                    continue

                refreshed = replace(incoming, confidence=decayed_conf)
                current = self.belief_map.get(target_id)
                if current is None or refreshed.observed_step >= current.observed_step:
                    self.belief_map[target_id] = refreshed
                else:
                    # Fuse old and new estimates with a confidence-weighted midpoint.
                    tot = max(1e-6, current.confidence + refreshed.confidence)
                    px = int(
                        round(
                            (current.pos[0] * current.confidence + refreshed.pos[0] * refreshed.confidence)
                            / tot
                        )
                    )
                    py = int(
                        round(
                            (current.pos[1] * current.confidence + refreshed.pos[1] * refreshed.confidence)
                            / tot
                        )
                    )
                    self.belief_map[target_id] = TargetBelief(
                        target_id=target_id,
                        pos=(px, py),
                        confidence=max(current.confidence, refreshed.confidence),
                        observed_step=max(current.observed_step, refreshed.observed_step),
                        source_agent_id=refreshed.source_agent_id,
                    )

        self.inbox = pending

    def observe(
        self,
        targets: Dict[int, Target],
        current_step: int,
        vision_range: int,
        sense_miss_prob: float,
        position_noise_radius: int,
        clamp_fn,
        rng,
    ) -> Set[int]:
        if self.failed:
            return set()

        seen: Set[int] = set()
        for target in targets.values():
            if not target.active:
                continue
            if manhattan_distance(self.pos, target.pos) > vision_range:
                continue
            if rng.random() < sense_miss_prob:
                continue

            nx = target.pos[0] + rng.randint(-position_noise_radius, position_noise_radius)
            ny = target.pos[1] + rng.randint(-position_noise_radius, position_noise_radius)
            noisy_pos = clamp_fn(nx, ny)
            confidence = max(0.35, 1.0 - 0.5 * sense_miss_prob)

            self.belief_map[target.target_id] = TargetBelief(
                target_id=target.target_id,
                pos=noisy_pos,
                confidence=confidence,
                observed_step=current_step,
                source_agent_id=self.agent_id,
            )
            self.locally_observed_this_step.add(target.target_id)
            seen.add(target.target_id)

        return seen

    def select_share_payload(
        self,
        current_step: int,
        belief_decay: float,
        max_shared_targets: int,
        min_tracking_confidence: float,
    ) -> Dict[int, TargetBelief]:
        if self.failed:
            return {}

        scored: List[Tuple[float, TargetBelief]] = []
        for belief in self.belief_map.values():
            age = max(0, current_step - belief.observed_step)
            eff_conf = belief.confidence * ((1 - belief_decay) ** age)
            if eff_conf < min_tracking_confidence:
                continue
            priority = eff_conf - 0.01 * age
            # Share the raw belief payload; receiver applies a single unified decay.
            scored.append((priority, belief))

        scored.sort(key=lambda item: item[0], reverse=True)
        top = scored[:max_shared_targets]
        return {belief.target_id: belief for _, belief in top}

    def choose_target(
        self,
        targets: Dict[int, Target],
        current_step: int,
        belief_decay: float,
        min_tracking_confidence: float,
        owner_hint: Dict[int, int],
        owner_penalty: float,
        occupied: Set[int],
        team_distance_hints: Optional[Dict[int, Tuple[int, int]]] = None,
        strategy: str = "current",
        rng=None,
    ) -> Optional[int]:
        if self.failed:
            return None

        strategy_name = (strategy or "current").lower()
        candidates: List[Tuple[int, int, float, float, float, float, float]] = []
        for target_id, belief in self.belief_map.items():
            target = targets.get(target_id)
            if target is None or not target.active or target_id in occupied:
                continue

            age = max(0, current_step - belief.observed_step)
            eff_conf = belief.confidence * ((1 - belief_decay) ** age)
            if eff_conf < min_tracking_confidence:
                continue

            distance = manhattan_distance(self.pos, belief.pos)
            local_bonus = 0.15 if target_id in self.locally_observed_this_step else 0.0
            handoff_penalty = 0.0
            proximity_penalty = 0.0
            stale_shared_penalty = 0.0
            preferred_owner = owner_hint.get(target_id)
            if preferred_owner is not None and preferred_owner != self.agent_id:
                # Increase owner bias to reduce redundant re-take behavior.
                handoff_penalty = owner_penalty * 1.25
                if target_id in self.locally_observed_this_step:
                    handoff_penalty *= 0.8

            hint = team_distance_hints.get(target_id) if team_distance_hints else None
            if hint is not None:
                nearest_agent_id, nearest_distance = hint
                if nearest_agent_id != self.agent_id:
                    dist_gap = distance - nearest_distance
                    if dist_gap <= 0:
                        # Stable tie-break to avoid repeated equal-distance contention.
                        proximity_penalty = 0.22
                    elif dist_gap >= 1:
                        # Soft "closest-agent-first" penalty.
                        proximity_penalty = min(1.0, 0.28 * dist_gap)
                    if preferred_owner is not None and preferred_owner == nearest_agent_id:
                        handoff_penalty += min(0.65, owner_penalty * 0.4 * max(0, dist_gap))

            if belief.source_agent_id != self.agent_id and age >= 3:
                # Shared beliefs become risky under comm faults when they are stale.
                stale_shared_penalty = min(0.7, 0.08 * (age - 2))

            candidates.append(
                (
                    target_id,
                    distance,
                    eff_conf,
                    local_bonus,
                    handoff_penalty,
                    proximity_penalty,
                    stale_shared_penalty,
                )
            )

        if not candidates:
            return None

        if strategy_name == "nearest":
            candidates.sort(key=lambda item: (item[1], -item[2], item[0]))
            return candidates[0][0]

        if strategy_name == "random":
            choices = [item[0] for item in candidates]
            if rng is not None:
                return rng.choice(choices)
            choices.sort()
            return choices[0]

        ranked: List[Tuple[float, int]] = []
        for (
            target_id,
            distance,
            eff_conf,
            local_bonus,
            handoff_penalty,
            proximity_penalty,
            stale_shared_penalty,
        ) in candidates:
            utility = (
                eff_conf / (1 + distance)
                + local_bonus
                - handoff_penalty
                - proximity_penalty
                - stale_shared_penalty
            )
            ranked.append((utility, target_id))

        ranked.sort(key=lambda item: (item[0], -item[1]), reverse=True)
        return ranked[0][1]
