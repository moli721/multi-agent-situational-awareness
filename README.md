# Multi-Agent Situational Awareness Platform

This repository is organized into three top-level areas:

- `backend/`: Python simulation engine, FastAPI backend, CLI, tests, and retained results
- `frontend/`: React + Vite interface for simulation and experiment analysis
- `docs/`: thesis materials, planning notes, and implementation specs

## Repository Layout

```text
.
|-- backend/
|   |-- src/mas_platform/
|   |-- tests/
|   |-- results/
|   |-- pyproject.toml
|   |-- uv.lock
|   `-- README.md
|-- frontend/
|   |-- src/
|   |-- index.html
|   |-- package.json
|   |-- package-lock.json
|   `-- vite.config.js
|-- docs/
|   |-- superpowers/
|   |-- thesis/
|   `-- worklog/
|-- .gitignore
`-- README.md
```

## Quick Start

### Backend

```bash
cd backend
uv sync --extra api
uv run mas-api
```

Backend API: `http://127.0.0.1:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://127.0.0.1:5173`

## Common Commands

### In `backend/`

```bash
uv run mas-api
uv run mas-experiments
uv run mas-experiments --runs 30 --strategies current,nearest,random
uv run mas-render
uv run mas-frontend
```

## API

- `GET /api/health`
- `GET /api/config/default`
- `GET /api/presets`
- `POST /api/simulate`
- `POST /api/experiments`

## Retained Outputs

Current retained experiment outputs live in `backend/results/`, including:

- `experiment_summary.csv`
- `experiment_strategy_matrix.csv`
- `experiment_runs_long.csv`
- `experiment_report.md`
- `experiment_manifest.json`
- `experiment_completion_by_scenario.png`
- `experiment_robustness_by_strategy.png`
- `experiment_tradeoff_scatter.png`
