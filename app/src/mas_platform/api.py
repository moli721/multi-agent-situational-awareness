from dataclasses import asdict, replace
from statistics import mean
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from .config import SimulationConfig
from .simulation import run_monte_carlo, run_simulation_detailed


class SimulateRequest(BaseModel):
    config: Dict[str, Any] = Field(default_factory=dict)


class ExperimentRequest(BaseModel):
    config: Dict[str, Any] = Field(default_factory=dict)
    runs: int = 20
    strategies: Optional[List[str]] = None


def _base_config(seed: int = 2026) -> SimulationConfig:
    return SimulationConfig(
        width=42,
        height=42,
        num_agents=12,
        num_targets=14,
        max_steps=160,
        num_obstacles=70,
        hotspot_count=3,
        vision_range=3,
        comm_range=8,
        enable_communication=True,
        sense_miss_prob=0.15,
        position_noise_radius=1,
        min_tracking_confidence=0.25,
        belief_decay=0.08,
        max_shared_targets=6,
        owner_hint_penalty=0.30,
        packet_loss_prob=0.0,
        comm_delay_steps=1,
        target_move_prob=0.08,
        target_hotspot_bias=0.7,
        agent_failure_prob=0.0,
        fault_injection_start=40,
        record_history=True,
        decision_strategy="current",
        random_seed=seed,
    )


def _config_from_payload(payload: Dict[str, Any], record_history: bool) -> SimulationConfig:
    base = _base_config(seed=int(payload.get("random_seed", 2026)))
    allowed = set(asdict(base).keys())
    cleaned = {k: v for k, v in payload.items() if k in allowed}
    return replace(base, **cleaned, record_history=record_history)


def _aggregate(records: List[Dict[str, float]]) -> Dict[str, float]:
    keys = [
        "steps_used",
        "task_completion_rate",
        "collaboration_efficiency",
        "task_completion_latency",
        "decision_response_time_steps",
        "messages_sent",
        "messages_received",
        "failed_agents",
        "coverage_rate",
        "average_information_age",
        "assignment_conflicts",
    ]
    return {k: round(mean(r[k] for r in records), 4) for k in keys}


def _normalize_strategy(strategy: Any) -> str:
    allowed = {"current", "nearest", "random"}
    name = str(strategy).strip().lower()
    return name if name in allowed else "current"


def _resolve_strategies(strategies: Optional[List[str]], default_strategy: str) -> List[str]:
    ordered: List[str] = []
    if strategies:
        for strategy in strategies:
            name = _normalize_strategy(strategy)
            if name not in ordered:
                ordered.append(name)
    if not ordered:
        ordered = ["current", "nearest", "random"]
    if default_strategy not in ordered:
        ordered.append(default_strategy)
    return ordered


def _compute_robustness(rows: Dict[str, Dict[str, float]]) -> float:
    normal = rows.get("with_comm_normal", {}).get("task_completion_rate", 0.0)
    fault = rows.get("with_comm_fault", {}).get("task_completion_rate", 0.0)
    retention = (fault / normal) if normal > 0 else 0.0
    # Weighted robustness: prioritize fault-scene absolute completion and
    # keep retention as a secondary stability factor.
    return round(0.7 * fault + 0.3 * retention, 4)


app = FastAPI(title="MAS Simulation API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {"ok": True}


@app.post("/api/simulate")
def simulate(req: SimulateRequest) -> Dict[str, Any]:
    config = _config_from_payload(req.config, record_history=True)
    detailed = run_simulation_detailed(config)
    history = detailed.get("history") or []

    timeline: List[Dict[str, Any]] = []
    prev_active_targets: Optional[int] = None
    for frame in history:
        active_targets = sum(1 for payload in frame["targets"].values() if payload["active"])
        failed_agents = sum(1 for payload in frame["agents"].values() if payload["failed"])
        captures_per_step = 0
        if prev_active_targets is not None:
            captures_per_step = max(0, prev_active_targets - active_targets)
        prev_active_targets = active_targets
        timeline.append(
            {
                "step": frame["step"],
                "active_targets": active_targets,
                "failed_agents": failed_agents,
                "captures_per_step": captures_per_step,
            }
        )

    world = {}
    if history:
        frame = history[-1]
        world = {
            "width": config.width,
            "height": config.height,
            "obstacles": frame["obstacles"],
            "hotspots": frame["hotspots"],
            "agents": [
                {"x": payload["pos"][0], "y": payload["pos"][1], "failed": payload["failed"]}
                for payload in frame["agents"].values()
            ],
            "active_targets": [
                {"x": payload["pos"][0], "y": payload["pos"][1]}
                for payload in frame["targets"].values()
                if payload["active"]
            ],
            "completed_targets": [
                {"x": payload["pos"][0], "y": payload["pos"][1]}
                for payload in frame["targets"].values()
                if not payload["active"]
            ],
        }

    return {
        "config": asdict(config),
        "metrics": detailed["metrics"],
        "timeline": timeline,
        "world": world,
        "history": history,
    }


@app.post("/api/experiments")
def experiments(req: ExperimentRequest) -> Dict[str, Any]:
    base = _config_from_payload(req.config, record_history=False)
    default_strategy = _normalize_strategy(base.decision_strategy)
    runs = max(3, min(int(req.runs), 100))
    strategies = _resolve_strategies(req.strategies, default_strategy)

    scenarios = [
        ("with_comm_normal", base),
        ("without_comm_baseline", replace(base, enable_communication=False)),
        (
            "with_comm_fault",
            replace(
            base,
            packet_loss_prob=min(0.8, base.packet_loss_prob + 0.25),
            comm_delay_steps=min(6, base.comm_delay_steps + 1),
            sense_miss_prob=min(0.6, base.sense_miss_prob + 0.10),
            agent_failure_prob=max(base.agent_failure_prob, 0.03),
            fault_injection_start=min(base.max_steps - 1, max(10, base.fault_injection_start)),
        ),
        ),
    ]

    by_strategy: Dict[str, Dict[str, Dict[str, float]]] = {}
    strategy_rows: List[Dict[str, Any]] = []
    for strategy in strategies:
        by_strategy[strategy] = {}

    for idx, (scenario_name, scenario_cfg) in enumerate(scenarios):
        scenario_seed_start = 1000 + idx * 1000
        for strategy in strategies:
            eval_cfg = replace(scenario_cfg, decision_strategy=strategy)
            records = run_monte_carlo(eval_cfg, runs=runs, seed_start=scenario_seed_start)
            summary = _aggregate(records)
            summary["scenario"] = scenario_name
            summary["strategy"] = strategy
            strategy_rows.append(summary)
            by_strategy[strategy][scenario_name] = summary

    rows: List[Dict[str, Any]] = []
    for scenario_name, _ in scenarios:
        row = dict(by_strategy[default_strategy][scenario_name])
        row.pop("strategy", None)
        rows.append(row)

    robustness_by_strategy = {
        strategy: _compute_robustness(by_strategy[strategy]) for strategy in strategies
    }
    robustness_index = robustness_by_strategy.get(default_strategy, 0.0)

    return {
        "runs": runs,
        "rows": rows,
        "strategy_rows": strategy_rows,
        "robustness_index": robustness_index,
        "robustness_by_strategy": robustness_by_strategy,
        "default_strategy": default_strategy,
        "strategies": strategies,
    }


def run_api() -> int:
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
    return 0
