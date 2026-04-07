import argparse
import csv
import json
from dataclasses import replace
from pathlib import Path
from statistics import mean
from typing import Dict, List

from .config import SimulationConfig
from .simulation import run_monte_carlo, run_simulation, run_simulation_detailed
from .visualization import render_simulation_outputs


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
    summary: Dict[str, float] = {}
    for key in keys:
        summary[key] = round(mean(record[key] for record in records), 4)
    return summary


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


def experiments_main() -> int:
    root = Path.cwd()
    runs = 20
    base = _base_config(seed=1000)

    scenarios = {
        "with_comm_normal": base,
        "without_comm_baseline": replace(base, enable_communication=False),
        "with_comm_fault": replace(
            base,
            packet_loss_prob=0.35,
            comm_delay_steps=2,
            sense_miss_prob=0.20,
            agent_failure_prob=0.03,
            fault_injection_start=30,
        ),
    }

    scenario_summaries: Dict[str, Dict[str, float]] = {}
    for idx, (name, config) in enumerate(scenarios.items()):
        records = run_monte_carlo(
            config=config,
            runs=runs,
            seed_start=base.random_seed + idx * 100,
        )
        scenario_summaries[name] = _aggregate(records)

    normal = scenario_summaries["with_comm_normal"]["task_completion_rate"]
    fault = scenario_summaries["with_comm_fault"]["task_completion_rate"]
    robustness_index = round(fault / normal, 4) if normal > 0 else 0.0

    out_dir = root / "results"
    out_dir.mkdir(parents=True, exist_ok=True)

    csv_path = out_dir / "experiment_summary.csv"
    with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "scenario",
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
        )
        for scenario, metrics in scenario_summaries.items():
            writer.writerow(
                [
                    scenario,
                    metrics["steps_used"],
                    metrics["task_completion_rate"],
                    metrics["collaboration_efficiency"],
                    metrics["decision_response_time_steps"],
                    metrics["messages_sent"],
                    metrics["messages_received"],
                    metrics["failed_agents"],
                    metrics["coverage_rate"],
                    metrics["average_information_age"],
                    metrics["assignment_conflicts"],
                ]
            )

    report_path = out_dir / "experiment_report.md"
    report = [
        "# Experiment Report",
        "",
        f"- Monte Carlo runs per scenario: {runs}",
        f"- Robustness index: {robustness_index}",
        "",
        "| Scenario | Completion | Collaboration | Response Steps | Coverage | Info Age | Conflicts | Failed Agents |",
        "|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for scenario, metrics in scenario_summaries.items():
        report.append(
            f"| {scenario} | {metrics['task_completion_rate']} | "
            f"{metrics['collaboration_efficiency']} | "
            f"{metrics['decision_response_time_steps']} | "
            f"{metrics['coverage_rate']} | "
            f"{metrics['average_information_age']} | "
            f"{metrics['assignment_conflicts']} | "
            f"{metrics['failed_agents']} |"
        )
    report_path.write_text("\n".join(report), encoding="utf-8")

    print("Experiments completed.")
    print(f"Saved: {csv_path}")
    print(f"Saved: {report_path}")
    print(f"Robustness index: {robustness_index}")
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
    sub.add_parser(
        "experiments",
        help="Run Monte Carlo scenarios and save summary/report.",
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
        return experiments_main()
    if args.command == "render":
        return render_main()
    parser.error(f"Unsupported command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
