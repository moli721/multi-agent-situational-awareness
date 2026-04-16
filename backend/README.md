# Backend

Python backend package for the multi-agent situational awareness platform.

This directory contains:

- `src/mas_platform/`: simulation engine, API, CLI, and rendering logic
- `tests/`: backend unit tests
- `results/`: current retained experiment outputs
- `pyproject.toml`: backend packaging and CLI entrypoints

Common commands:

```bash
uv sync --extra api
uv run mas-api
uv run mas-experiments
uv run mas-render
```
