from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def _require_matplotlib():
    try:
        import matplotlib.pyplot as plt  # type: ignore
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "matplotlib is required for rendering. Install with: uv sync --extra viz"
        ) from exc
    return plt


def render_simulation_outputs(
    detailed_result: Dict[str, Any],
    output_dir: Path,
) -> Dict[str, str]:
    plt = _require_matplotlib()
    output_dir.mkdir(parents=True, exist_ok=True)

    history: List[Dict[str, Any]] = detailed_result.get("history") or []
    if not history:
        raise RuntimeError("No history recorded. Enable config.record_history=True before rendering.")

    final = history[-1]
    obstacles: List[Tuple[int, int]] = [tuple(p) for p in final.get("obstacles", [])]
    hotspots: List[Tuple[int, int]] = [tuple(p) for p in final.get("hotspots", [])]

    # Final snapshot
    fig, ax = plt.subplots(figsize=(8, 8))
    if obstacles:
        ox, oy = zip(*obstacles)
        ax.scatter(ox, oy, c="black", marker="s", s=28, label="Obstacles")
    if hotspots:
        hx, hy = zip(*hotspots)
        ax.scatter(hx, hy, c="orange", marker="*", s=120, label="Hotspots")

    for agent_id, payload in final["agents"].items():
        x, y = payload["pos"]
        if payload["failed"]:
            ax.scatter([x], [y], c="gray", marker="x", s=80)
        else:
            ax.scatter([x], [y], c="tab:blue", marker="o", s=45)

    for target_id, payload in final["targets"].items():
        x, y = payload["pos"]
        if payload["active"]:
            ax.scatter([x], [y], c="tab:red", marker="^", s=55)
        else:
            ax.scatter([x], [y], c="tab:green", marker=".", s=90)

    ax.set_title("Final Snapshot: Multi-Agent Situational Simulation")
    ax.set_xlabel("X")
    ax.set_ylabel("Y")
    ax.legend(loc="upper right")
    ax.grid(True, alpha=0.25)
    ax.set_aspect("equal", adjustable="box")
    snapshot_path = output_dir / "final_snapshot.png"
    fig.savefig(snapshot_path, dpi=160, bbox_inches="tight")
    plt.close(fig)

    # Coverage heatmap from trajectory.
    width = int(detailed_result["config"]["width"])
    height = int(detailed_result["config"]["height"])
    heat = [[0 for _ in range(width)] for _ in range(height)]

    for frame in history:
        for payload in frame["agents"].values():
            x, y = payload["pos"]
            if 0 <= x < width and 0 <= y < height:
                heat[y][x] += 1

    fig, ax = plt.subplots(figsize=(8, 7))
    im = ax.imshow(heat, origin="lower", cmap="viridis")
    ax.set_title("Coverage Heatmap")
    ax.set_xlabel("X")
    ax.set_ylabel("Y")
    plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04, label="Visits")
    heatmap_path = output_dir / "coverage_heatmap.png"
    fig.savefig(heatmap_path, dpi=160, bbox_inches="tight")
    plt.close(fig)

    return {
        "final_snapshot": str(snapshot_path),
        "coverage_heatmap": str(heatmap_path),
    }


def _ordered_unique(values: List[str]) -> List[str]:
    seen = set()
    ordered: List[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        ordered.append(value)
    return ordered


def _compute_robustness_by_strategy(
    strategy_rows: List[Dict[str, Any]],
    normal_scenario: str = "with_comm_normal",
    fault_scenario: str = "with_comm_fault",
) -> Dict[str, float]:
    table: Dict[str, Dict[str, float]] = {}
    for row in strategy_rows:
        strategy = str(row.get("strategy", ""))
        scenario = str(row.get("scenario", ""))
        completion = float(row.get("task_completion_rate", 0.0))
        if not strategy or not scenario:
            continue
        table.setdefault(strategy, {})[scenario] = completion

    robustness: Dict[str, float] = {}
    for strategy, scenarios in table.items():
        normal = scenarios.get(normal_scenario, 0.0)
        fault = scenarios.get(fault_scenario, 0.0)
        retention = (fault / normal) if normal > 0 else 0.0
        robustness[strategy] = round(0.7 * fault + 0.3 * retention, 4)
    return robustness


def render_experiment_outputs(
    strategy_rows: List[Dict[str, Any]],
    output_dir: Path,
    robustness_by_strategy: Optional[Dict[str, float]] = None,
) -> Dict[str, str]:
    plt = _require_matplotlib()
    output_dir.mkdir(parents=True, exist_ok=True)

    if not strategy_rows:
        raise RuntimeError("No strategy rows provided for experiment rendering.")

    strategies = _ordered_unique([str(row.get("strategy", "")) for row in strategy_rows if row.get("strategy")])
    scenarios_found = _ordered_unique([str(row.get("scenario", "")) for row in strategy_rows if row.get("scenario")])
    preferred_scenarios = [
        "with_comm_normal",
        "without_comm_baseline",
        "with_comm_fault",
    ]
    scenarios = [scenario for scenario in preferred_scenarios if scenario in scenarios_found] + [
        scenario for scenario in scenarios_found if scenario not in preferred_scenarios
    ]

    completion_table: Dict[str, Dict[str, float]] = {
        strategy: {scenario: 0.0 for scenario in scenarios} for strategy in strategies
    }
    for row in strategy_rows:
        strategy = str(row.get("strategy", ""))
        scenario = str(row.get("scenario", ""))
        if strategy not in completion_table or scenario not in completion_table[strategy]:
            continue
        completion_table[strategy][scenario] = float(row.get("task_completion_rate", 0.0))

    # Figure 1: completion by scenario (grouped bars by strategy).
    fig, ax = plt.subplots(figsize=(10, 5.5))
    x = list(range(len(scenarios)))
    width = 0.8 / max(1, len(strategies))
    for idx, strategy in enumerate(strategies):
        offset = (idx - (len(strategies) - 1) / 2) * width
        values = [completion_table[strategy].get(scenario, 0.0) for scenario in scenarios]
        ax.bar([value + offset for value in x], values, width=width, label=strategy)

    ax.set_xticks(x)
    ax.set_xticklabels(scenarios, rotation=15, ha="right")
    ax.set_ylim(0.0, 1.05)
    ax.set_ylabel("Task Completion Rate")
    ax.set_title("Task Completion by Scenario and Strategy")
    ax.grid(axis="y", alpha=0.25)
    ax.legend(loc="upper right")
    completion_path = output_dir / "experiment_completion_by_scenario.png"
    fig.savefig(completion_path, dpi=160, bbox_inches="tight")
    plt.close(fig)

    # Figure 2: robustness by strategy.
    robustness = (
        {k: float(v) for k, v in robustness_by_strategy.items()}
        if robustness_by_strategy is not None
        else _compute_robustness_by_strategy(strategy_rows)
    )
    robust_values = [robustness.get(strategy, 0.0) for strategy in strategies]

    fig, ax = plt.subplots(figsize=(8.5, 4.8))
    ax.bar(strategies, robust_values, width=0.65)
    ax.axhline(1.0, color="tab:red", linestyle="--", linewidth=1.4, alpha=0.8, label="1.0 baseline")
    ax.set_ylabel("Robustness Index")
    ax.set_title("Robustness by Strategy (Fault-Weighted)")
    ax.grid(axis="y", alpha=0.25)
    ax.legend(loc="upper right")
    robustness_path = output_dir / "experiment_robustness_by_strategy.png"
    fig.savefig(robustness_path, dpi=160, bbox_inches="tight")
    plt.close(fig)

    return {
        "experiment_completion_by_scenario": str(completion_path),
        "experiment_robustness_by_strategy": str(robustness_path),
    }
