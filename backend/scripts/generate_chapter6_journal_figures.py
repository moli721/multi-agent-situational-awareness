from __future__ import annotations

import csv
import math
from collections import defaultdict
from pathlib import Path
from statistics import mean, stdev
from typing import Any, Iterable

import matplotlib.pyplot as plt
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "results" / "chapter6_unified_30"
OUT_DIR = SOURCE_DIR / "journal_v2"

SCENARIOS = ["with_comm_normal", "without_comm_baseline", "with_comm_fault"]
STRATEGIES = ["current", "nearest", "random"]

SCENARIO_LABELS = {
    "with_comm_normal": "正常通信",
    "without_comm_baseline": "无通信",
    "with_comm_fault": "通信故障",
}

SCENARIO_SHORT = {
    "with_comm_normal": "normal",
    "without_comm_baseline": "no-comm",
    "with_comm_fault": "fault",
}

STRATEGY_LABELS = {
    "current": "current",
    "nearest": "nearest",
    "random": "random",
}

COLORS = {
    "current": "#2F5F9E",
    "nearest": "#3E9A96",
    "random": "#BC5A54",
    "with_comm_normal": "#2F5F9E",
    "without_comm_baseline": "#7A7A7A",
    "with_comm_fault": "#BC5A54",
    "neutral": "#262626",
    "grid": "#D8D8D8",
}

MARKERS = {
    "current": "o",
    "nearest": "s",
    "random": "^",
    "with_comm_normal": "o",
    "with_comm_fault": "^",
}

NUMERIC_FIELDS = {
    "run_index",
    "seed",
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
    "task_completion_rate_ci95",
    "fault_retention",
    "robustness_index",
    "comm_gain",
    "message_cost_per_success_normal",
    "message_cost_per_success_fault",
    "conflict_cost_per_success_normal",
    "conflict_cost_per_success_fault",
}


def apply_style() -> None:
    plt.rcParams.update(
        {
            "font.family": "sans-serif",
            "font.sans-serif": [
                "Microsoft YaHei",
                "Arial",
                "Helvetica",
                "DejaVu Sans",
                "sans-serif",
            ],
            "svg.fonttype": "none",
            "pdf.fonttype": 42,
            "axes.unicode_minus": False,
            "font.size": 7,
            "axes.labelsize": 7.2,
            "axes.titlesize": 7.4,
            "xtick.labelsize": 6.7,
            "ytick.labelsize": 6.7,
            "legend.fontsize": 6.5,
            "axes.linewidth": 0.65,
            "xtick.major.width": 0.55,
            "ytick.major.width": 0.55,
            "xtick.major.size": 2.6,
            "ytick.major.size": 2.6,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "legend.frameon": False,
            "figure.facecolor": "white",
            "axes.facecolor": "white",
        }
    )


def parse_value(key: str, value: str) -> Any:
    if key not in NUMERIC_FIELDS:
        return value
    if value == "":
        return math.nan
    if key in {"run_index"}:
        return int(float(value))
    return float(value)


def read_csv(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return [{k: parse_value(k, v) for k, v in row.items()} for row in csv.DictReader(f)]


def mean_ci(values: Iterable[float]) -> tuple[float, float]:
    vals = list(values)
    avg = mean(vals)
    ci = 1.96 * stdev(vals) / math.sqrt(len(vals)) if len(vals) > 1 else 0.0
    return avg, ci


def mm(value: float) -> float:
    return value / 25.4


def save_figure(fig: plt.Figure, stem: str) -> dict[str, str]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
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


def panel_label(ax: plt.Axes, label: str) -> None:
    ax.text(
        -0.16,
        1.08,
        label,
        transform=ax.transAxes,
        fontsize=8.2,
        fontweight="bold",
        va="top",
        ha="left",
    )


def add_y_axis_break(ax: plt.Axes) -> None:
    kwargs = dict(transform=ax.transAxes, color=COLORS["neutral"], clip_on=False, lw=0.65)
    ax.plot((-0.012, 0.018), (0.018, 0.052), **kwargs)
    ax.plot((-0.012, 0.018), (0.048, 0.082), **kwargs)


def soft_grid(ax: plt.Axes) -> None:
    ax.grid(axis="y", color=COLORS["grid"], linewidth=0.45, alpha=0.55)
    ax.set_axisbelow(True)


def rows_for(rows: list[dict[str, Any]], *, strategy: str | None = None, scenario: str | None = None) -> list[dict[str, Any]]:
    out = rows
    if strategy is not None:
        out = [row for row in out if row["strategy"] == strategy]
    if scenario is not None:
        out = [row for row in out if row["scenario"] == scenario]
    return out


def plot_completion_zoom(run_rows: list[dict[str, Any]]) -> dict[str, str]:
    fig, ax = plt.subplots(figsize=(mm(89), mm(68)))
    rng = np.random.default_rng(2026)
    x = np.arange(len(SCENARIOS), dtype=float)

    by_run: dict[int, dict[str, float]] = defaultdict(dict)
    for row in rows_for(run_rows, strategy="current"):
        by_run[row["run_index"]][row["scenario"]] = row["task_completion_rate"]

    for run_index in sorted(by_run):
        values = [by_run[run_index].get(scenario, np.nan) for scenario in SCENARIOS]
        ax.plot(x, values, color="#B9B9B9", lw=0.45, alpha=0.22, zorder=1)

    for i, scenario in enumerate(SCENARIOS):
        values = [row["task_completion_rate"] for row in rows_for(run_rows, strategy="current", scenario=scenario)]
        jitter = rng.normal(0, 0.035, size=len(values))
        ax.scatter(
            np.full(len(values), x[i]) + jitter,
            values,
            s=8,
            color=COLORS[scenario],
            alpha=0.24,
            linewidths=0,
            zorder=2,
        )
        avg, ci = mean_ci(values)
        ax.errorbar(
            x[i],
            avg,
            yerr=ci,
            fmt="o",
            ms=5.2,
            mfc=COLORS[scenario],
            mec=COLORS["neutral"],
            mew=0.6,
            ecolor=COLORS["neutral"],
            elinewidth=0.8,
            capsize=2.5,
            zorder=4,
        )
        ax.text(x[i], avg + 0.035, f"{avg:.3f}", ha="center", va="bottom", fontsize=6.5)

    ax.set_xticks(x)
    ax.set_xticklabels([SCENARIO_LABELS[scenario] for scenario in SCENARIOS])
    ax.set_ylabel("任务完成率")
    ax.set_ylim(0.50, 1.02)
    ax.set_yticks(np.arange(0.5, 1.01, 0.1))
    soft_grid(ax)
    add_y_axis_break(ax)
    panel_label(ax, "a")
    fig.text(
        0.99,
        0.01,
        "n=30；淡色线为同一随机种子下的配对轨迹，粗点为均值±95% CI",
        ha="right",
        va="bottom",
        fontsize=5.8,
        color="#555555",
    )
    return save_figure(fig, "fig6-2_completion_zoom_current_journal")


def plot_strategy_small_multiples(matrix_rows: list[dict[str, Any]]) -> dict[str, str]:
    fig, axes = plt.subplots(1, 3, figsize=(mm(183), mm(62)), sharey=False)

    for idx, (ax, scenario) in enumerate(zip(axes, SCENARIOS)):
        rows = [row for row in matrix_rows if row["scenario"] == scenario]
        rows = sorted(rows, key=lambda row: STRATEGIES.index(row["strategy"]))
        x = np.arange(len(rows), dtype=float)
        values = [row["task_completion_rate"] for row in rows]
        ci = [row["task_completion_rate_ci95"] for row in rows]

        for i, row in enumerate(rows):
            strategy = row["strategy"]
            ax.errorbar(
                x[i],
                row["task_completion_rate"],
                yerr=row["task_completion_rate_ci95"],
                fmt=MARKERS[strategy],
                ms=5.5,
                mfc=COLORS[strategy],
                mec=COLORS["neutral"],
                mew=0.55,
                ecolor="#2F2F2F",
                elinewidth=0.65,
                capsize=2.0,
                zorder=3,
            )
            ax.text(
                x[i],
                row["task_completion_rate"] + 0.012,
                f"{row['task_completion_rate']:.3f}",
                ha="center",
                va="bottom",
                fontsize=5.9,
            )

        y_min = max(0.0, min(v - c for v, c in zip(values, ci)) - 0.02)
        y_max = min(1.0, max(v + c for v, c in zip(values, ci)) + 0.03)
        if y_max - y_min < 0.12:
            mid = (y_min + y_max) / 2
            y_min, y_max = max(0, mid - 0.06), min(1, mid + 0.06)
        ax.set_ylim(y_min, y_max)
        ax.set_xlim(-0.45, 2.45)
        ax.set_title(SCENARIO_LABELS[scenario], pad=5)
        ax.set_xticks(x)
        ax.set_xticklabels([STRATEGY_LABELS[row["strategy"]] for row in rows])
        soft_grid(ax)
        add_y_axis_break(ax)
        panel_label(ax, chr(ord("a") + idx))
        if idx == 0:
            ax.set_ylabel("任务完成率")
        else:
            ax.set_ylabel("")

    fig.text(0.02, 1.01, "不同策略的完成率局部比较", ha="left", va="bottom", fontsize=8.0)
    fig.text(0.98, -0.02, "均值±95% CI，n=30；各子图纵轴按本场景局部放大", ha="right", fontsize=5.8, color="#555555")
    fig.subplots_adjust(wspace=0.32)
    return save_figure(fig, "fig6-3_strategy_small_multiples_journal")


def plot_robustness_decomposition(matrix_rows: list[dict[str, Any]], derived_rows: list[dict[str, Any]]) -> dict[str, str]:
    derived_by_strategy = {row["strategy"]: row for row in derived_rows}
    fault_by_strategy = {
        row["strategy"]: row["task_completion_rate"]
        for row in matrix_rows
        if row["scenario"] == "with_comm_fault"
    }
    metrics = ["故障完成率", "故障保持率", "鲁棒性指数"]
    x = np.arange(len(metrics), dtype=float)

    fig, ax = plt.subplots(figsize=(mm(104), mm(68)))
    for strategy in STRATEGIES:
        row = derived_by_strategy[strategy]
        values = [
            fault_by_strategy[strategy],
            row["fault_retention"],
            row["robustness_index"],
        ]
        ax.plot(
            x,
            values,
            color=COLORS[strategy],
            lw=1.0,
            marker=MARKERS[strategy],
            ms=5.2,
            mec=COLORS["neutral"],
            mew=0.5,
            label=STRATEGY_LABELS[strategy],
            zorder=3,
        )
        ax.text(
            x[-1] + 0.08,
            values[-1],
            f"{STRATEGY_LABELS[strategy]}  {values[-1]:.3f}",
            va="center",
            ha="left",
            fontsize=6.1,
            color=COLORS[strategy],
        )

    ax.set_xticks(x)
    ax.set_xticklabels(metrics)
    ax.set_ylabel("指标值")
    ax.set_ylim(0.62, 0.84)
    ax.set_xlim(-0.35, 2.9)
    soft_grid(ax)
    add_y_axis_break(ax)
    panel_label(ax, "a")
    ax.text(
        0.02,
        0.96,
        "R = 0.7×故障完成率 + 0.3×故障保持率",
        transform=ax.transAxes,
        ha="left",
        va="top",
        fontsize=5.8,
        color="#555555",
    )
    return save_figure(fig, "fig6-4_robustness_decomposition_journal")


def plot_benefit_cost_scatter(matrix_rows: list[dict[str, Any]], derived_rows: list[dict[str, Any]]) -> dict[str, str]:
    matrix = {(row["strategy"], row["scenario"]): row for row in matrix_rows}
    derived = {row["strategy"]: row for row in derived_rows}
    fig, ax = plt.subplots(figsize=(mm(112), mm(76)))

    for strategy in STRATEGIES:
        points = []
        for scenario, x_key, conflict_key in [
            ("with_comm_normal", "message_cost_per_success_normal", "conflict_cost_per_success_normal"),
            ("with_comm_fault", "message_cost_per_success_fault", "conflict_cost_per_success_fault"),
        ]:
            x_value = derived[strategy][x_key]
            y_value = matrix[(strategy, scenario)]["task_completion_rate"]
            conflict_cost = derived[strategy][conflict_key]
            points.append((x_value, y_value))
            ax.scatter(
                x_value,
                y_value,
                s=38 + conflict_cost * 16,
                marker=MARKERS[scenario],
                color=COLORS[strategy],
                edgecolor=COLORS["neutral"],
                linewidth=0.55,
                alpha=0.95,
                zorder=3,
            )
            label = f"{strategy}-{SCENARIO_SHORT[scenario]}"
            offsets = {
                ("current", "with_comm_normal"): (1.0, 0.006, "left"),
                ("nearest", "with_comm_normal"): (1.0, 0.006, "left"),
                ("random", "with_comm_normal"): (-1.4, 0.006, "right"),
                ("current", "with_comm_fault"): (0.9, -0.003, "left"),
                ("nearest", "with_comm_fault"): (1.0, -0.012, "left"),
                ("random", "with_comm_fault"): (-1.3, -0.006, "right"),
            }
            dx, dy, ha = offsets[(strategy, scenario)]
            ax.text(x_value + dx, y_value + dy, label, ha=ha, va="center", fontsize=5.9)

        ax.plot(
            [points[0][0], points[1][0]],
            [points[0][1], points[1][1]],
            color=COLORS[strategy],
            lw=0.65,
            alpha=0.62,
            zorder=2,
        )

    ax.axvspan(15, 30, color="#ECECEC", alpha=0.32, zorder=0)
    ax.text(15.6, 0.883, "低通信代价区", fontsize=5.8, color="#555555", va="top")
    ax.set_xlabel("通信代价（消息数 / 已完成目标）")
    ax.set_ylabel("任务完成率")
    ax.set_xlim(14, 64)
    ax.set_ylim(0.62, 0.89)
    ax.set_xticks([15, 25, 35, 45, 55, 65])
    soft_grid(ax)
    add_y_axis_break(ax)
    panel_label(ax, "a")

    ax.text(
        0.98,
        0.04,
        "圆点=正常通信；三角=通信故障；点面积≈冲突代价",
        transform=ax.transAxes,
        ha="right",
        va="bottom",
        fontsize=5.8,
        color="#555555",
    )
    return save_figure(fig, "fig6-5_benefit_cost_scatter_journal")


def main() -> None:
    apply_style()
    run_rows = read_csv(SOURCE_DIR / "experiment_runs_long.csv")
    matrix_rows = read_csv(SOURCE_DIR / "experiment_strategy_matrix.csv")
    derived_rows = read_csv(SOURCE_DIR / "experiment_derived_metrics.csv")

    figures = {
        "completion_zoom": plot_completion_zoom(run_rows),
        "strategy_small_multiples": plot_strategy_small_multiples(matrix_rows),
        "robustness_decomposition": plot_robustness_decomposition(matrix_rows, derived_rows),
        "benefit_cost_scatter": plot_benefit_cost_scatter(matrix_rows, derived_rows),
    }

    manifest_path = OUT_DIR / "journal_manifest.json"
    with manifest_path.open("w", encoding="utf-8") as f:
        import json

        json.dump(
            {
                "source": str(SOURCE_DIR.name),
                "style": "journal_v2",
                "notes": [
                    "Uses the same 30-run source data; no experiment result was changed.",
                    "Bars were replaced by dot-range, paired-run, decomposition, and benefit-cost encodings.",
                    "SVG text remains editable; TIFF is exported at 600 dpi.",
                ],
                "figures": figures,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    print({"output_dir": str(OUT_DIR), "figures": figures})


if __name__ == "__main__":
    main()
