# Multi-Agent Situational Awareness Platform

Single-source project README for this repository.

## What This Project Is

This is a simulation-first multi-agent situational awareness platform for a graduation thesis project.  
The runnable system is under `app/` and includes:

- Python simulation engine
- FastAPI backend
- React + Vite frontend
- Experiment and tracking workflow for reproducible evaluation

## Main Features

- Dynamic 2D environment with obstacles, hotspots, and moving targets
- Decentralized OODA-style agent loop
- Communication constraints (range, delay, loss, bandwidth limit)
- Scenario presets (`normal`, `no-comm`, `fault`)
- Config-driven runs with YAML files
- Run tracking with metadata (config hash, git info, runtime context)
- PettingZoo Parallel API interoperability (MARL smoke test)

## Repository Layout

```text
.
|-- app/
|   |-- configs/
|   |-- src/mas_platform/
|   |-- web/
|   |-- run_demo.py
|   |-- run_experiments.py
|   |-- run_render.py
|   |-- pyproject.toml
|   `-- uv.lock
`-- thesis/
```

## Quick Start

### 1) Backend

```bash
cd app
uv sync --extra api
uv run mas-api
```

Backend: `http://127.0.0.1:8000`

### 2) Frontend

```bash
cd app/web
npm install
npm run dev
```

Frontend: `http://127.0.0.1:5173`

## Common Commands (run in `app/`)

```bash
uv run mas-demo
uv run mas-experiments
uv run mas-experiments --runs 30 --strategies current,nearest,random
uv run mas-render
uv run mas-dump-config --out configs/default.generated.yaml
```

Config-based usage:

```bash
uv run python -m mas_platform demo --config configs/default.yaml --seed 2026
uv run python -m mas_platform experiments --config configs/fault_heavy.yaml --runs 30
uv run python -m mas_platform render --config configs/default.yaml
```

MARL smoke test:

```bash
uv sync --extra marl
uv run mas-marl-smoke --steps 20
```

## API

- `GET /api/health`
- `GET /api/config/default`
- `GET /api/presets`
- `POST /api/simulate`
- `POST /api/experiments`

## Outputs

- `app/results/experiment_summary.csv`
- `app/results/experiment_strategy_matrix.csv`
- `app/results/experiment_report.md`
- `app/results/runs/<timestamp>-<run_type>/`