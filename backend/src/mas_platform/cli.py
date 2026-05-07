import argparse
import csv
import json
import sys
from dataclasses import asdict, replace
from pathlib import Path
from statistics import mean
from typing import Any, Dict, List, Optional

from .config import SimulationConfig
from .simulation import run_monte_carlo, run_simulation, run_simulation_detailed
from .visualization import render_experiment_outputs, render_simulation_outputs


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
    summary: Dict[str, float] = {}
    for key in keys:
        summary[key] = round(mean(record[key] for record in records), 4)
    return summary


def _parse_strategies(raw: str) -> List[str]:
    values = [item.strip() for item in raw.split(",")]
    parsed: List[str] = []
    for value in values:
        if not value or value in parsed:
            continue
        parsed.append(value)
    return parsed or ["current", "nearest", "random"]


def _parse_experiments_cli_args() -> tuple[int, List[str]]:
    parser = argparse.ArgumentParser(
        prog="mas-experiments",
        description="Run Monte Carlo experiments across strategies and scenarios.",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=20,
        help="Monte Carlo runs per strategy-scenario pair (default: 20).",
    )
    parser.add_argument(
        "--strategies",
        type=str,
        default="current,nearest,random",
        help="Comma-separated strategy names (default: current,nearest,random).",
    )
    args = parser.parse_args(sys.argv[1:])
    return int(args.runs), _parse_strategies(args.strategies)


def _build_scenarios(base: SimulationConfig) -> Dict[str, SimulationConfig]:
    return {
        "with_comm_normal": base,
        "without_comm_baseline": replace(base, enable_communication=False),
        "with_comm_fault": replace(
            base,
            packet_loss_prob=0.25,
            comm_delay_steps=2,
            sense_miss_prob=0.23,
            agent_failure_prob=0.005,
            fault_injection_start=60,
        ),
    }


def _apply_strategy_config(
    base: SimulationConfig,
    strategy: str,
) -> tuple[SimulationConfig, str]:
    # If the engine exposes decision_strategy in config, use it directly.
    config_keys = set(asdict(base).keys())
    if "decision_strategy" in config_keys:
        return replace(base, decision_strategy=strategy), "config_field"
    # Fallback mode: keep behavior unchanged and treat strategy as label only.
    return base, "labels_only"


def _compute_robustness_by_strategy(
    matrix_rows: List[Dict[str, Any]],
) -> Dict[str, float]:
    grouped: Dict[str, Dict[str, float]] = {}
    for row in matrix_rows:
        strategy = str(row["strategy"])
        scenario = str(row["scenario"])
        grouped.setdefault(strategy, {})[scenario] = float(row["task_completion_rate"])

    robustness: Dict[str, float] = {}
    for strategy, scenario_map in grouped.items():
        normal = scenario_map.get("with_comm_normal", 0.0)
        fault = scenario_map.get("with_comm_fault", 0.0)
        retention = (fault / normal) if normal > 0 else 0.0
        robustness[strategy] = round(0.7 * fault + 0.3 * retention, 4)
    return robustness


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
        comm_range=10,
        enable_communication=True,
        sense_miss_prob=0.15,
        position_noise_radius=1,
        min_tracking_confidence=0.25,
        belief_decay=0.08,
        max_shared_targets=3,
        owner_hint_penalty=0.60,
        packet_loss_prob=0.0,
        comm_delay_steps=1,
        target_move_prob=0.08,
        target_hotspot_bias=0.7,
        agent_failure_prob=0.0,
        fault_injection_start=40,
        record_history=False,
        random_seed=seed,
    )


def demo_main() -> int:
    root = Path.cwd()
    config = _base_config(seed=2026)
    result = run_simulation(config)

    out_dir = root / "results"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "demo_result.json"
    out_file.write_text(
        json.dumps(result, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print("Demo run completed.")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"Saved: {out_file}")
    return 0


def experiments_main(
    runs: Optional[int] = None,
    strategies: Optional[List[str]] = None,
) -> int:
    if runs is None and strategies is None:
        runs, strategies = _parse_experiments_cli_args()

    root = Path.cwd()
    runs = max(1, min(int(runs if runs is not None else 20), 200))
    strategy_list = list(strategies or ["current", "nearest", "random"])

    base = _base_config(seed=1000)
    out_dir = root / "results"
    out_dir.mkdir(parents=True, exist_ok=True)

    metric_columns = [
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

    strategy_matrix_rows: List[Dict[str, Any]] = []
    strategy_mode = "labels_only"

    for strategy in strategy_list:
        strategy_base, mode = _apply_strategy_config(base, strategy)
        if mode == "config_field":
            strategy_mode = "config_field"

        scenarios = _build_scenarios(strategy_base)
        for scenario_name, scenario_cfg in scenarios.items():
            records = run_monte_carlo(
                config=scenario_cfg,
                runs=runs,
                # Reuse the user-selected base seed across scenarios so comparisons stay aligned.
                seed_start=base.random_seed,
            )
            summary = _aggregate(records)
            strategy_matrix_rows.append(
                {
                    "strategy": strategy,
                    "scenario": scenario_name,
                    **summary,
                }
            )

    primary_strategy = strategy_list[0]
    summary_rows = [
        row for row in strategy_matrix_rows if row["strategy"] == primary_strategy
    ]

    summary_csv_path = out_dir / "experiment_summary.csv"
    with summary_csv_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["scenario", *metric_columns])
        for row in summary_rows:
            writer.writerow([row["scenario"], *[row[col] for col in metric_columns]])

    matrix_csv_path = out_dir / "experiment_strategy_matrix.csv"
    with matrix_csv_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["strategy", "scenario", *metric_columns])
        for row in strategy_matrix_rows:
            writer.writerow([row["strategy"], row["scenario"], *[row[col] for col in metric_columns]])

    robustness_by_strategy = _compute_robustness_by_strategy(strategy_matrix_rows)
    figure_outputs = render_experiment_outputs(
        strategy_rows=strategy_matrix_rows,
        output_dir=out_dir,
        robustness_by_strategy=robustness_by_strategy,
    )

    manifest_path = out_dir / "experiment_manifest.json"
    artifacts = {
        "experiment_summary_csv": str(Path("results") / summary_csv_path.name),
        "experiment_strategy_matrix_csv": str(Path("results") / matrix_csv_path.name),
        "experiment_manifest_json": str(Path("results") / manifest_path.name),
        "experiment_completion_by_scenario_png": str(
            Path("results") / Path(figure_outputs["experiment_completion_by_scenario"]).name
        ),
        "experiment_robustness_by_strategy_png": str(
            Path("results") / Path(figure_outputs["experiment_robustness_by_strategy"]).name
        ),
    }
    manifest = {
        "runs": runs,
        "strategies": strategy_list,
        "robustness": robustness_by_strategy,
        "strategy_mode": strategy_mode,
        "artifacts": artifacts,
    }
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print("Experiments completed.")
    if strategy_mode == "labels_only":
        print("Note: decision_strategy not found in SimulationConfig; strategy labels share the same engine logic.")
    print(f"Saved: {summary_csv_path}")
    print(f"Saved: {matrix_csv_path}")
    print(f"Saved: {manifest_path}")
    print(f"Saved: {figure_outputs['experiment_completion_by_scenario']}")
    print(f"Saved: {figure_outputs['experiment_robustness_by_strategy']}")
    for strategy in strategy_list:
        value = robustness_by_strategy.get(strategy, 0.0)
        print(f"Robustness[{strategy}]: {value}")
    return 0


def render_main() -> int:
    root = Path.cwd()
    config = replace(_base_config(seed=2026), record_history=True)
    detailed = run_simulation_detailed(config=config)

    out_dir = root / "results"
    out_dir.mkdir(parents=True, exist_ok=True)

    detailed_json = out_dir / "detailed_result.json"
    detailed_json.write_text(
        json.dumps(detailed["metrics"], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    outputs = render_simulation_outputs(detailed_result=detailed, output_dir=out_dir)
    print("Render completed.")
    print(f"Saved metrics: {detailed_json}")
    print(f"Saved final snapshot: {outputs['final_snapshot']}")
    print(f"Saved heatmap: {outputs['coverage_heatmap']}")
    return 0


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="mas-platform",
        description="CLI for multi-agent situational awareness simulation.",
    )
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("demo", help="Run one demo simulation and save JSON result.")
    exp = sub.add_parser(
        "experiments",
        help="Run Monte Carlo scenarios and save summary/report.",
    )
    exp.add_argument(
        "--runs",
        type=int,
        default=20,
        help="Monte Carlo runs per strategy-scenario pair (default: 20).",
    )
    exp.add_argument(
        "--strategies",
        type=str,
        default="current,nearest,random",
        help="Comma-separated strategy names (default: current,nearest,random).",
    )
    sub.add_parser(
        "render",
        help="Run one simulation with trajectory history and export visual figures.",
    )
    return parser


def main() -> int:
    parser = _build_parser()
    args = parser.parse_args()
    if args.command == "demo":
        return demo_main()
    if args.command == "experiments":
        return experiments_main(
            runs=args.runs,
            strategies=_parse_strategies(args.strategies),
        )
    if args.command == "render":
        return render_main()
    parser.error(f"Unsupported command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
