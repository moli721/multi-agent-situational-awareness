from dataclasses import dataclass


@dataclass(frozen=True)
class SimulationConfig:
    # World setup
    width: int = 30
    height: int = 30
    num_agents: int = 12
    num_targets: int = 8
    max_steps: int = 120
    num_obstacles: int = 36
    hotspot_count: int = 3

    # Perception and communication
    vision_range: int = 4
    comm_range: int = 7
    enable_communication: bool = True
    sense_miss_prob: float = 0.10
    position_noise_radius: int = 1
    min_tracking_confidence: float = 0.25
    belief_decay: float = 0.07
    max_shared_targets: int = 6
    owner_hint_penalty: float = 0.30
    packet_loss_prob: float = 0.00
    comm_delay_steps: int = 1

    # Dynamics and disturbance
    target_move_prob: float = 0.05
    target_hotspot_bias: float = 0.70
    agent_failure_prob: float = 0.00
    fault_injection_start: int = 40

    # Runtime and export
    record_history: bool = False
    decision_strategy: str = "current"

    # Reproducibility
    random_seed: int = 42
