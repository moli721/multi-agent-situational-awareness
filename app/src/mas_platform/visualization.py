from pathlib import Path
from typing import Any, Dict, List, Tuple


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
