# Repository Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将仓库重组为 `frontend/`、`backend/`、`docs/` 三层结构，并删除废弃脚本、缓存和历史实验垃圾文件。

**Architecture:** 保持核心 Python 包 `mas_platform` 不变，只调整顶层目录和运行入口；前端从 `app/web` 上移为 `frontend/`，后端从 `app/` 中抽出可用部分到 `backend/`。实验结果采用“只保留当前主结果”的精简策略。

**Tech Stack:** Python 3.10+, Hatchling, FastAPI, React, Vite, npm, PowerShell

---

### Task 1: 归档文档与工作日志

**Files:**
- Create: `docs/worklog/`
- Create: `docs/thesis/`
- Move: `task_plan.md`
- Move: `findings.md`
- Move: `progress.md`
- Move: `任务书-肖翰.extracted.txt`
- Move: `基于Multi-Agent的态势精准感知平台-课题申报.extracted.txt`
- Move: `thesis/论文写作骨架.md`

- [ ] **Step 1: 创建文档归档目录**

Run:

```powershell
New-Item -ItemType Directory -Force -Path `
  'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\docs\worklog' | Out-Null
New-Item -ItemType Directory -Force -Path `
  'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\docs\thesis' | Out-Null
```

- [ ] **Step 2: 移动工作日志文件**

Run:

```powershell
Move-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\task_plan.md' `
  -Destination 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\docs\worklog\task_plan.md'
Move-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\findings.md' `
  -Destination 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\docs\worklog\findings.md'
Move-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\progress.md' `
  -Destination 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\docs\worklog\progress.md'
```

- [ ] **Step 3: 移动论文辅助材料**

Run:

```powershell
Move-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\任务书-肖翰.extracted.txt' `
  -Destination 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\docs\thesis\任务书-肖翰.extracted.txt'
Move-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\基于Multi-Agent的态势精准感知平台-课题申报.extracted.txt' `
  -Destination 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\docs\thesis\基于Multi-Agent的态势精准感知平台-课题申报.extracted.txt'
Move-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\thesis\论文写作骨架.md' `
  -Destination 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\docs\thesis\论文写作骨架.md'
```

- [ ] **Step 4: 删除空的旧 thesis 目录**

Run:

```powershell
Remove-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\thesis' -Force
```

### Task 2: 重组前后端目录

**Files:**
- Create: `frontend/`
- Create: `backend/`
- Move: `app/web/*`
- Move: `app/src/`
- Move: `app/tests/`
- Move: `app/results/`
- Move: `app/pyproject.toml`
- Move: `app/uv.lock`

- [ ] **Step 1: 创建新目录**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\frontend' | Out-Null
New-Item -ItemType Directory -Force -Path 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\backend' | Out-Null
```

- [ ] **Step 2: 迁移前端**

Run:

```powershell
Move-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\app\web\src' `
  -Destination 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\frontend\src'
Move-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\app\web\index.html' `
  -Destination 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\frontend\index.html'
Move-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\app\web\package.json' `
  -Destination 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\frontend\package.json'
Move-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\app\web\package-lock.json' `
  -Destination 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\frontend\package-lock.json'
Move-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\app\web\vite.config.js' `
  -Destination 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\frontend\vite.config.js'
```

- [ ] **Step 3: 迁移后端**

Run:

```powershell
Move-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\app\src' `
  -Destination 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\backend\src'
Move-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\app\tests' `
  -Destination 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\backend\tests'
Move-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\app\results' `
  -Destination 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\backend\results'
Move-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\app\pyproject.toml' `
  -Destination 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\backend\pyproject.toml'
Move-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\app\uv.lock' `
  -Destination 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\backend\uv.lock'
```

### Task 3: 删除废弃脚本和缓存

**Files:**
- Delete: `.playwright-mcp/`
- Delete: `app/.pytest_cache`
- Delete: `app/.venv`
- Delete: `app/run_demo.py`
- Delete: `app/run_experiments.py`
- Delete: `app/run_render.py`
- Delete: `app/run_frontend.py`
- Delete: `frontend/dist/`
- Delete: `backend/src/mas_platform/__pycache__/`
- Delete: `backend/tests/__pycache__/`
- Delete: `backend/src/mas_platform/marl/`

- [ ] **Step 1: 删除浏览器痕迹和缓存**

Run:

```powershell
Remove-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\.playwright-mcp' -Recurse -Force
Remove-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\app\.pytest_cache' -Recurse -Force
Remove-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\frontend\dist' -Recurse -Force -ErrorAction SilentlyContinue
```

- [ ] **Step 2: 删除废弃运行脚本与空壳目录**

Run:

```powershell
Remove-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\app\run_demo.py' -Force
Remove-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\app\run_experiments.py' -Force
Remove-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\app\run_render.py' -Force
Remove-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\app\run_frontend.py' -Force
Remove-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\backend\src\mas_platform\__pycache__' -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\backend\tests\__pycache__' -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\backend\src\mas_platform\marl' -Recurse -Force -ErrorAction SilentlyContinue
```

### Task 4: 精简实验结果

**Files:**
- Modify: `backend/results/`

- [ ] **Step 1: 删除历史 runs 子目录**

Run:

```powershell
Remove-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\backend\results\runs' -Recurse -Force
```

- [ ] **Step 2: 删除历史命名结果与非核心副产物**

Run:

```powershell
Get-ChildItem 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\backend\results' -File |
Where-Object {
  $_.Name -match 'steps40|steps80|latest|after_fix|adaptive' -or
  $_.Name -in @(
    '_api_runtime.log',
    '_web_runtime.log',
    'demo_result.json',
    'detailed_result.json',
    'agent_trajectories.png',
    'coverage_heatmap.png',
    'final_snapshot.png',
    'target_activity_timeline.png'
  )
} |
Remove-Item -Force
```

### Task 5: 修复配置与文档

**Files:**
- Modify: `backend/pyproject.toml`
- Create: `backend/README.md`
- Modify: `backend/src/mas_platform/web_frontend.py`
- Modify: `backend/tests/test_api_experiment_metrics.py`
- Modify: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: 更新后端打包配置和前端路径解析**

Implementation notes:

- `backend/pyproject.toml` 删除 `run_demo.py` 等 `sdist include`
- `backend/pyproject.toml` 的 `readme` 改为 `backend/README.md`
- `backend/src/mas_platform/web_frontend.py` 的前端目录改为仓库根下的 `frontend`
- 测试路径注入从旧 `app/src` 改为 `backend/src`

- [ ] **Step 2: 更新根文档与忽略规则**

Implementation notes:

- `README.md` 更新新目录结构、启动方式和输出位置
- `.gitignore` 去掉 `web/node_modules` 等旧路径描述，改成 `frontend/node_modules/`、`frontend/dist/`、`backend/results/`

- [ ] **Step 3: 删除空的旧 app 目录**

Run:

```powershell
Remove-Item -LiteralPath 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\app' -Recurse -Force
```

### Task 6: 验证

**Files:**
- Verify: `backend`
- Verify: `frontend`

- [ ] **Step 1: 运行后端单测**

Run:

```powershell
Set-Location 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness'
.\backend\.venv\Scripts\python.exe -m unittest backend.tests.test_api_experiment_metrics -v
```

Expected: 3 tests pass

- [ ] **Step 2: 运行前端测试**

Run:

```powershell
Set-Location 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\frontend'
npm test
```

Expected: all tests pass

- [ ] **Step 3: 运行前端构建**

Run:

```powershell
Set-Location 'h:\实验报告汇总\毕业论文\multi-agent-situational-awareness\frontend'
npm run build
```

Expected: build succeeds, may keep chunk-size warning
