# Experiment Backend Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扩展 `/api/experiments` 后端响应，返回逐 run 明细、统计摘要和收益代价派生指标，同时保持现有前端兼容。

**Architecture:** 在 `api.py` 内新增小型纯函数负责统计和派生指标计算，`experiments()` 组装新响应结构。优先复用现有 Monte Carlo 输出，避免改动仿真核心。

**Tech Stack:** Python, FastAPI, unittest

---

### Task 1: Lock the backend contract with failing tests

**Files:**
- Create: `app/tests/test_api_experiment_metrics.py`
- Modify: `app/src/mas_platform/api.py`

- [ ] **Step 1: Write the failing tests**

```python
def test_metric_summary_contains_distribution_fields(self): ...
def test_compute_derived_metrics_returns_expected_ratios(self): ...
def test_experiments_response_includes_new_data_blocks(self): ...
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.\app\.venv\Scripts\python.exe -m unittest app.tests.test_api_experiment_metrics -v`
Expected: FAIL because helper functions and response fields do not exist yet.

### Task 2: Implement statistical helpers

**Files:**
- Modify: `app/src/mas_platform/api.py`
- Test: `app/tests/test_api_experiment_metrics.py`

- [ ] **Step 1: Add metric summary helper**

```python
def _summarize_metric(records: List[Dict[str, float]], key: str) -> Dict[str, float]:
    ...
```

- [ ] **Step 2: Add per-strategy statistics builder**

```python
def _build_strategy_stats(...):
    ...
```

- [ ] **Step 3: Run tests**

Run: `.\app\.venv\Scripts\python.exe -m unittest app.tests.test_api_experiment_metrics -v`
Expected: summary-related tests move toward PASS.

### Task 3: Implement derived metrics and API response expansion

**Files:**
- Modify: `app/src/mas_platform/api.py`
- Test: `app/tests/test_api_experiment_metrics.py`

- [ ] **Step 1: Add derived metrics builder**

```python
def _compute_derived_metrics(...):
    ...
```

- [ ] **Step 2: Extend `experiments()` response**

```python
return {
    ...existing_fields,
    "run_rows": run_rows,
    "strategy_stats": strategy_stats,
    "derived_metrics": derived_metrics,
}
```

- [ ] **Step 3: Run tests again**

Run: `.\app\.venv\Scripts\python.exe -m unittest app.tests.test_api_experiment_metrics -v`
Expected: PASS

### Task 4: Sanity-check real endpoint behavior

**Files:**
- Modify: `app/src/mas_platform/api.py` if needed

- [ ] **Step 1: Call the endpoint function with real code path**

Run: `.\app\.venv\Scripts\python.exe -c "from pathlib import Path; import sys; sys.path.insert(0, str(Path('app/src').resolve())); from mas_platform.api import ExperimentRequest, experiments; print(experiments(ExperimentRequest(runs=3, strategies=['current'])).keys())"`

- [ ] **Step 2: Verify response contains old and new blocks**

Expected keys include:
- `rows`
- `strategy_rows`
- `run_rows`
- `strategy_stats`
- `derived_metrics`
