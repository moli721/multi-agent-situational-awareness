from dataclasses import asdict, replace
from statistics import mean
from typing import Any, Dict, List

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
        owner_hint_penalty=0.18,
        packet_loss_prob=0.10,
        comm_delay_steps=1,
        target_move_prob=0.08,
        target_hotspot_bias=0.7,
        agent_failure_prob=0.0,
        fault_injection_start=40,
        record_history=True,
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
        "decision_response_time_steps",
        "messages_sent",
        "messages_received",
        "failed_agents",
        "coverage_rate",
        "average_information_age",
        "assignment_conflicts",
    ]
    return {k: round(mean(r[k] for r in records), 4) for k in keys}


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
    for frame in history:
        active_targets = sum(1 for payload in frame["targets"].values() if payload["active"])
        failed_agents = sum(1 for payload in frame["agents"].values() if payload["failed"])
        timeline.append(
            {
                "step": frame["step"],
                "active_targets": active_targets,
                "failed_agents": failed_agents,
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
    }


@app.post("/api/experiments")
def experiments(req: ExperimentRequest) -> Dict[str, Any]:
    base = _config_from_payload(req.config, record_history=False)
    runs = max(3, min(int(req.runs), 100))

    scenarios = {
        "with_comm_normal": base,
        "without_comm_baseline": replace(base, enable_communication=False),
        "with_comm_fault": replace(
            base,
            packet_loss_prob=min(0.8, base.packet_loss_prob + 0.25),
            comm_delay_steps=min(6, base.comm_delay_steps + 1),
            sense_miss_prob=min(0.6, base.sense_miss_prob + 0.10),
            agent_failure_prob=max(base.agent_failure_prob, 0.03),
            fault_injection_start=min(base.max_steps - 1, max(10, base.fault_injection_start)),
        ),
    }

    rows: List[Dict[str, Any]] = []
    for idx, (name, cfg) in enumerate(scenarios.items()):
        records = run_monte_carlo(cfg, runs=runs, seed_start=1000 + idx * 100)
        summary = _aggregate(records)
        summary["scenario"] = name
        rows.append(summary)

    normal = next(r for r in rows if r["scenario"] == "with_comm_normal")["task_completion_rate"]
    fault = next(r for r in rows if r["scenario"] == "with_comm_fault")["task_completion_rate"]
    robustness_index = round(fault / normal, 4) if normal > 0 else 0.0

    return {"runs": runs, "rows": rows, "robustness_index": robustness_index}


def run_api() -> int:
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
    return 0
