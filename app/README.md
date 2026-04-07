# Multi-Agent Situational Awareness Platform

This folder contains the runnable project (backend + frontend) for your graduation design.

## Structure

```text
app/
|-- pyproject.toml
|-- uv.lock
|-- src/mas_platform/
|   |-- api.py
|   |-- cli.py
|   |-- config.py
|   |-- entities.py
|   |-- simulation.py
|   |-- visualization.py
|   `-- web_frontend.py
|-- web/
|   |-- package.json
|   |-- vite.config.js
|   `-- src/
|-- run_demo.py
|-- run_experiments.py
|-- run_render.py
|-- run_frontend.py
`-- results/
```

## Start Backend API

```bash
cd app
uv sync --extra api
uv run mas-api
```

API:
- `GET /api/health`
- `POST /api/simulate`
- `POST /api/experiments`

## Start React Frontend

Open another terminal:

```bash
cd app/web
npm install
npm run dev
```

Frontend URL:
- `http://127.0.0.1:5173`

Backend URL:
- `http://127.0.0.1:8000`

## Quick CLI (Optional)

```bash
cd app
uv run mas-demo
uv run mas-experiments
uv run mas-render
```
