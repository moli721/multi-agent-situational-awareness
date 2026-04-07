# Multi-Agent Situational Awareness Platform

[中文说明 / Chinese version](README.zh-CN.md)

Graduation project repository for a simulation-first multi-agent situational awareness system.

## Overview

- Python simulation engine for dynamic multi-agent collaboration
- FastAPI backend for simulation and experiment APIs
- React dashboard for parameter control and visual analysis
- Scenario-based experiments for thesis evaluation and defense demos

## Key Features

- Dynamic 2D environment (obstacles, hotspots, moving targets)
- Decentralized OODA-style perception and decision loop
- Communication constraints (range, delay, packet loss, bandwidth cap)
- Conflict-aware task allocation and failure injection
- Experiment pipelines for normal / no-comm / fault scenarios

## Repository Layout

```text
.
|-- app/                         # runnable project
|   |-- src/mas_platform/        # simulation + API + CLI
|   |-- web/                     # React + Vite frontend
|   |-- run_demo.py
|   |-- run_experiments.py
|   |-- run_render.py
|   |-- pyproject.toml
|   `-- uv.lock
|-- thesis/                      # thesis materials
`-- *.extracted.txt              # extracted assignment/topic texts
```

## Quick Start

### Start Backend API

```bash
cd app
uv sync --extra api
uv run mas-api
```

Backend URL: `http://127.0.0.1:8000`

### Start Frontend

Open a new terminal:

```bash
cd app/web
npm install
npm run dev
```

Frontend URL: `http://127.0.0.1:5173`

## CLI Commands (run in `app/`)

```bash
uv run mas-demo
uv run mas-experiments
uv run mas-render
uv run mas-api
uv run mas-frontend
```

## API Endpoints

- `GET /api/health`
- `POST /api/simulate`
- `POST /api/experiments`

Example request:

```json
{
  "config": {
    "num_agents": 12,
    "num_targets": 14,
    "enable_communication": true
  }
}
```

## Core Metrics

- `task_completion_rate`
- `collaboration_efficiency`
- `decision_response_time_steps`
- `coverage_rate`
- `average_information_age`
- `assignment_conflicts`
- `messages_sent`
- `messages_received`
- `failed_agents`

## Tech Stack

- Backend: Python, FastAPI, Pydantic, uvicorn
- Simulation: custom MAS engine
- Frontend: React, Vite, Recharts
- Environment management: uv

## Additional Docs

- Detailed runtime notes: [app/README.md](app/README.md)
