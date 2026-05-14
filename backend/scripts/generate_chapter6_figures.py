from __future__ import annotations

import csv
import json
import math
import sys
from dataclasses import asdict, replace
from pathlib import Path
from statistics import mean, median, stdev
from typing import Any, Dict, Iterable, List

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

import matplotlib.pyplot as plt
import numpy as np

from mas_platform.config import SimulationConfig
from mas_platform.simulation import run_monte_carlo


RUNS = 30
SEED0 = 2026
OUT_DIR = ROOT / "results" / "chapter6_unified_30"

STRATEGIES = ["current", "nearest", "random"]
SCENARIOS = ["with_comm_normal", "without_comm_baseline", "with_comm_fault"]

STRATEGY_LABELS = {
    "current": "current",
    "nearest": "nearest",
    "random": "random",
}

SCENARIO_LABELS = {
    "with_comm_normal": "normal",
    "without_comm_baseline": "no-comm",
    "with_comm_fault": "fault",
}

CHINESE_SCENARIO_LABELS = {
    "with_comm_normal": "正常通信",
    "without_comm_baseline": "无通信",
    "with_comm_fault": "通信故障",
}

COLORS = {
    "current": "#0F4D92",
    "nearest": "#42949E",
    "random": "#B64342",
    "with_comm_normal": "#0F4D92",
    "without_comm_baseline": "#767676",
    "with_comm_fault": "#B64342",
}

METRIC_KEYS = [
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


def apply_style() -> None:
    plt.rcParams["font.family"] = "Microsoft YaHei"
    plt.rcParams["font.sans-serif"] = [
        "Microsoft YaHei",
        "SimHei",
        "DengXian",
        "Arial",
        "DejaVu Sans",
        "Liberation Sans",
    ]
    plt.rcParams["svg.fonttype"] = "none"
    plt.rcParams["pdf.fonttype"] = 42
    plt.rcParams["axes.unicode_minus"] = False
    plt.rcParams["font.size"] = 8
    plt.rcParams["axes.linewidth"] = 0.8
    plt.rcParams["axes.spines.top"] = False
    plt.rcParams["axes.spines.right"] = False
    plt.rcParams["legend.frameon"] = False
    plt.rcParams["figure.facecolor"] = "white"
    plt.rcParams["axes.facecolor"] = "white"


def base_config() -> SimulationConfig:
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
        target_hotspot_bias=0.70,
        agent_failure_prob=0.0,
        fault_injection_start=40,
        record_history=False,
        decision_strategy="current",
        random_seed=SEED0,
    )


def scenario_configs(base: SimulationConfig) -> Dict[str, SimulationConfig]:
    return {
        "with_comm_normal": base,
        "without_comm_baseline": replace(base, enable_communication=False),
        "with_comm_fault": replace(
            base,
            packet_loss_prob=0.25,
            comm_delay_steps=2,
            sense_miss_prob=0.25,
            agent_failure_prob=0.03,
            fault_injection_start=40,
        ),
    }


def summarize(records: List[Dict[str, float]]) -> Dict[str, float]:
    return {key: round(mean(record[key] for record in records), 4) for key in METRIC_KEYS}


def metric_stats(records: List[Dict[str, float]], key: str) -> Dict[str, float]:
    values = [float(row[key]) for row in records]
    avg = mean(values)
    sd = stdev(values) if len(values) > 1 else 0.0
    ci = 1.96 * sd / math.sqrt(len(values)) if len(values) > 1 else 0.0
    return {
        "mean": round(avg, 4),
        "std": round(sd, 4),
        "min": round(min(values), 4),
        "median": round(median(values), 4),
        "max": round(max(values), 4),
        "ci95_low": round(avg - ci, 4),
        "ci95_high": round(avg + ci, 4),
    }


def write_csv(path: Path, rows: List[Dict[str, Any]], fieldnames: Iterable[str]) -> None:
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(fieldnames))
        writer.writeheader()
        writer.writerows(rows)


def save_figure(fig: plt.Figure, stem: str) -> Dict[str, str]:
    paths = {
        "svg": OUT_DIR / f"{stem}.svg",
        "pdf": OUT_DIR / f"{stem}.pdf",
        "tiff": OUT_DIR / f"{stem}.tiff",
        "png": OUT_DIR / f"{stem}.png",
    }
    fig.savefig(paths["svg"], bbox_inches="tight")
    fig.savefig(paths["pdf"], bbox_inches="tight")
    fig.savefig(paths["tiff"], dpi=600, bbox_inches="tight")
    fig.savefig(paths["png"], dpi=300, bbox_inches="tight")
    plt.close(fig)
    return {key: value.name for key, value in paths.items()}


def axis_limits(values: List[float], lower: float = 0.0, upper: float = 1.0, min_span: float = 0.04) -> tuple[float, float]:
    lo = min(values)
    hi = max(values)
    span = max(hi - lo, min_span)
    pad = span * 0.35
    return max(lower, lo - pad), min(upper, hi + pad)


def plot_completion_zoom(strategy_rows: List[Dict[str, Any]]) -> Dict[str, str]:
    rows = [row for row in strategy_rows if row["strategy"] == "current"]
    values = [float(row["task_completion_rate"]) for row in rows]
    labels = [CHINESE_SCENARIO_LABELS[row["scenario"]] for row in rows]
    colors = [COLORS[row["scenario"]] for row in rows]
    ci = [float(row["task_completion_rate_ci95"]) for row in rows]

    y0, y1 = axis_limits(values, min_span=0.08)
    fig, ax = plt.subplots(figsize=(89 / 25.4, 72 / 25.4))
    x = np.arange(len(rows))
    ax.bar(x, values, yerr=ci, color=colors, edgecolor="#272727", linewidth=0.6, capsize=3)
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylabel("任务完成率")
    ax.set_ylim(y0, y1)
    ax.grid(axis="y", color="#D8D8D8", linewidth=0.55, alpha=0.75)
    ax.set_axisbelow(True)
    ax.set_title("current策略在不同通信条件下的完成率", loc="left", fontsize=8.5, pad=8)
    ax.text(0.02, 0.96, "纵轴局部放大", transform=ax.transAxes, fontsize=6.5, color="#606060", va="top")
    ax.text(0.98, 0.04, "误差线: 95% CI", transform=ax.transAxes, fontsize=6.2, color="#606060", ha="right")
    for xi, value in zip(x, values):
        ax.text(xi, value + (y1 - y0) * 0.025, f"{value:.3f}", ha="center", va="bottom", fontsize=6.7)
    return save_figure(fig, "fig6-2_completion_zoom_current")


def plot_strategy_small_multiples(strategy_rows: List[Dict[str, Any]]) -> Dict[str, str]:
    fig, axes = plt.subplots(1, 3, figsize=(183 / 25.4, 58 / 25.4), sharey=False)
    for ax, scenario in zip(axes, SCENARIOS):
        rows = [row for row in strategy_rows if row["scenario"] == scenario]
        values = [float(row["task_completion_rate"]) for row in rows]
        x = np.arange(len(rows))
        ax.bar(
            x,
            values,
            color=[COLORS[row["strategy"]] for row in rows],
            edgecolor="#272727",
            linewidth=0.55,
        )
        y0, y1 = axis_limits(values, min_span=0.045)
        ax.set_ylim(y0, y1)
        ax.set_xticks(x)
        ax.set_xticklabels([STRATEGY_LABELS[row["strategy"]] for row in rows], rotation=0)
        ax.set_title(CHINESE_SCENARIO_LABELS[scenario], fontsize=8, pad=6)
        ax.grid(axis="y", color="#D8D8D8", linewidth=0.5, alpha=0.7)
        ax.set_axisbelow(True)
        for xi, value in zip(x, values):
            ax.text(xi, value + (y1 - y0) * 0.025, f"{value:.3f}", ha="center", va="bottom", fontsize=6.4)
    axes[0].set_ylabel("任务完成率")
    fig.suptitle("不同场景下三种策略的完成率局部对比", x=0.06, ha="left", fontsize=8.8, y=1.04)
    fig.text(
        0.995,
        -0.02,
        "柱高为30次均值；各子图纵轴按本场景数据区间局部放大",
        ha="right",
        fontsize=6.5,
        color="#606060",
    )
    return save_figure(fig, "fig6-3_strategy_small_multiples")


def plot_robustness_zoom(robustness_rows: List[Dict[str, Any]]) -> Dict[str, str]:
    values = [float(row["robustness_index"]) for row in robustness_rows]
    labels = [STRATEGY_LABELS[row["strategy"]] for row in robustness_rows]
    colors = [COLORS[row["strategy"]] for row in robustness_rows]
    y0, y1 = axis_limits(values, min_span=0.035)

    fig, ax = plt.subplots(figsize=(89 / 25.4, 68 / 25.4))
    x = np.arange(len(values))
    ax.bar(x, values, color=colors, edgecolor="#272727", linewidth=0.6)
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylabel("鲁棒性指数")
    ax.set_ylim(y0, y1)
    ax.grid(axis="y", color="#D8D8D8", linewidth=0.55, alpha=0.75)
    ax.set_axisbelow(True)
    ax.set_title("故障加权鲁棒性对比", loc="left", fontsize=8.5, pad=8)
    ax.text(0.02, 0.96, "纵轴局部放大", transform=ax.transAxes, fontsize=6.5, color="#606060", va="top")
    for xi, value in zip(x, values):
        ax.text(xi, value + (y1 - y0) * 0.03, f"{value:.3f}", ha="center", va="bottom", fontsize=6.7)
    return save_figure(fig, "fig6-4_robustness_zoom")


def plot_benefit_cost_scatter(
    run_rows: List[Dict[str, Any]],
    strategy_rows: List[Dict[str, Any]],
) -> Dict[str, str]:
    fig, ax = plt.subplots(figsize=(120 / 25.4, 82 / 25.4))
    scenario_markers = {"with_comm_normal": "o", "with_comm_fault": "^"}
    for strategy in STRATEGIES:
        for scenario in ["with_comm_normal", "with_comm_fault"]:
            points = [row for row in run_rows if row["strategy"] == strategy and row["scenario"] == scenario]
            ax.scatter(
                [float(row["messages_sent"]) for row in points],
                [100 * float(row["task_completion_rate"]) for row in points],
                s=12,
                marker=scenario_markers[scenario],
                color=COLORS[strategy],
                alpha=0.22,
                linewidths=0,
            )

    for row in strategy_rows:
        if row["scenario"] not in {"with_comm_normal", "with_comm_fault"}:
            continue
        ax.scatter(
            [float(row["messages_sent"])],
            [100 * float(row["task_completion_rate"])],
            s=64,
            marker=scenario_markers[row["scenario"]],
            color=COLORS[row["strategy"]],
            edgecolor="#272727",
            linewidth=0.7,
            zorder=5,
        )
        label_offsets = {
            ("current", "with_comm_normal"): (8, 0.45),
            ("nearest", "with_comm_normal"): (8, 1.15),
            ("random", "with_comm_normal"): (8, 0.4),
            ("current", "with_comm_fault"): (8, 0.4),
            ("nearest", "with_comm_fault"): (8, -1.0),
            ("random", "with_comm_fault"): (8, 0.55),
        }
        dx, dy = label_offsets.get((row["strategy"], row["scenario"]), (8, 0.4))
        ax.text(
            float(row["messages_sent"]) + dx,
            100 * float(row["task_completion_rate"]) + dy,
            f"{STRATEGY_LABELS[row['strategy']]}-{SCENARIO_LABELS[row['scenario']]}",
            fontsize=5.8,
            color="#272727",
        )

    ax.set_xlabel("消息发送数")
    ax.set_ylabel("任务完成率 (%)")
    ax.set_title("收益-代价关系：完成率与通信开销", loc="left", fontsize=8.5, pad=8)
    ax.grid(color="#D8D8D8", linewidth=0.55, alpha=0.75)
    ax.set_axisbelow(True)
    ax.set_ylim(55, 92)

    legend_handles = []
    for strategy in STRATEGIES:
        legend_handles.append(
            plt.Line2D([0], [0], marker="o", color="w", label=STRATEGY_LABELS[strategy],
                       markerfacecolor=COLORS[strategy], markeredgecolor="#272727", markersize=5)
        )
    legend_handles.extend(
        [
            plt.Line2D([0], [0], marker="o", color="#272727", label="normal", linestyle="None", markersize=4),
            plt.Line2D([0], [0], marker="^", color="#272727", label="fault", linestyle="None", markersize=4),
        ]
    )
    ax.legend(handles=legend_handles, loc="lower right", ncols=2, fontsize=6.2, handletextpad=0.4, columnspacing=0.8)
    return save_figure(fig, "fig6-5_benefit_cost_scatter")


def run_experiments() -> tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    base = base_config()
    configs = scenario_configs(base)
    run_rows: List[Dict[str, Any]] = []
    strategy_rows: List[Dict[str, Any]] = []
    stat_rows: List[Dict[str, Any]] = []

    for scenario in SCENARIOS:
        for strategy in STRATEGIES:
            cfg = replace(configs[scenario], decision_strategy=strategy, random_seed=SEED0)
            records = run_monte_carlo(cfg, runs=RUNS, seed_start=SEED0)
            summary = summarize(records)
            completion_stats = metric_stats(records, "task_completion_rate")
            row = {
                "strategy": strategy,
                "scenario": scenario,
                **summary,
                "task_completion_rate_std": completion_stats["std"],
                "task_completion_rate_ci95": round(
                    (completion_stats["ci95_high"] - completion_stats["ci95_low"]) / 2,
                    4,
                ),
            }
            strategy_rows.append(row)
            for idx, record in enumerate(records):
                run_rows.append({"strategy": strategy, "scenario": scenario, "run_index": idx, **record})
            for key in [
                "task_completion_rate",
                "task_completion_latency",
                "coverage_rate",
                "messages_sent",
                "average_information_age",
                "assignment_conflicts",
            ]:
                stat_rows.append({"strategy": strategy, "scenario": scenario, "metric": key, **metric_stats(records, key)})

    by_strategy: Dict[str, Dict[str, Dict[str, Any]]] = {strategy: {} for strategy in STRATEGIES}
    for row in strategy_rows:
        by_strategy[row["strategy"]][row["scenario"]] = row

    derived_rows: List[Dict[str, Any]] = []
    for strategy in STRATEGIES:
        normal = by_strategy[strategy]["with_comm_normal"]
        baseline = by_strategy[strategy]["without_comm_baseline"]
        fault = by_strategy[strategy]["with_comm_fault"]
        normal_completion = float(normal["task_completion_rate"])
        fault_completion = float(fault["task_completion_rate"])
        normal_completed = normal_completion * base.num_targets
        fault_completed = fault_completion * base.num_targets
        fault_retention = fault_completion / normal_completion if normal_completion > 0 else 0.0
        robustness = 0.7 * fault_completion + 0.3 * fault_retention
        derived_rows.append(
            {
                "strategy": strategy,
                "fault_retention": round(fault_retention, 4),
                "robustness_index": round(robustness, 4),
                "comm_gain": round(normal_completion - float(baseline["task_completion_rate"]), 4),
                "message_cost_per_success_normal": round(float(normal["messages_sent"]) / max(1e-6, normal_completed), 4),
                "message_cost_per_success_fault": round(float(fault["messages_sent"]) / max(1e-6, fault_completed), 4),
                "conflict_cost_per_success_normal": round(float(normal["assignment_conflicts"]) / max(1e-6, normal_completed), 4),
                "conflict_cost_per_success_fault": round(float(fault["assignment_conflicts"]) / max(1e-6, fault_completed), 4),
            }
        )

    return run_rows, strategy_rows, stat_rows, derived_rows


def main() -> int:
    apply_style()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    run_rows, strategy_rows, stat_rows, derived_rows = run_experiments()

    write_csv(OUT_DIR / "experiment_runs_long.csv", run_rows, run_rows[0].keys())
    write_csv(OUT_DIR / "experiment_strategy_matrix.csv", strategy_rows, strategy_rows[0].keys())
    write_csv(OUT_DIR / "experiment_strategy_stats.csv", stat_rows, stat_rows[0].keys())
    write_csv(OUT_DIR / "experiment_derived_metrics.csv", derived_rows, derived_rows[0].keys())

    summary_rows = [row for row in strategy_rows if row["strategy"] == "current"]
    write_csv(OUT_DIR / "experiment_summary_current.csv", summary_rows, summary_rows[0].keys())

    figures = {}
    figures.update({"completion_zoom": plot_completion_zoom(strategy_rows)})
    figures.update({"strategy_small_multiples": plot_strategy_small_multiples(strategy_rows)})
    figures.update({"robustness_zoom": plot_robustness_zoom(derived_rows)})
    figures.update({"benefit_cost_scatter": plot_benefit_cost_scatter(run_rows, strategy_rows)})

    manifest = {
        "runs": RUNS,
        "seed0": SEED0,
        "strategies": STRATEGIES,
        "scenarios": SCENARIOS,
        "base_config": asdict(base_config()),
        "fault_overrides": {
            "packet_loss_prob": 0.25,
            "comm_delay_steps": 2,
            "sense_miss_prob": 0.25,
            "agent_failure_prob": 0.03,
            "fault_injection_start": 40,
        },
        "figures": figures,
        "notes": [
            "All strategy-scenario comparisons reuse the same seed sequence.",
            "Completion and robustness figures use locally enlarged y-axes for readability.",
            "The completion zoom figure includes 95% confidence intervals; the strategy small multiples emphasize locally enlarged mean differences, with full uncertainty values in experiment_strategy_stats.csv.",
        ],
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps({"output_dir": str(OUT_DIR), "figures": figures}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
