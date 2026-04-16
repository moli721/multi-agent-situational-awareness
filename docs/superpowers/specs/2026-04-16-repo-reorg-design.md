# Repository Reorganization Design

## Goal

将当前仓库整理为清晰的 `frontend/`、`backend/`、`docs/` 三层结构，删除已废弃入口脚本、缓存目录和历史实验垃圾文件，仅保留当前仍有价值的源码、测试、论文材料和一套权威实验结果。

## Scope

本次整理包含：

- 将 `app/web` 上移并重命名为 `frontend`
- 将 `app/src`、`app/tests`、`app/pyproject.toml`、`app/uv.lock`、`app/results` 重组到 `backend`
- 将根目录散落的工作日志和论文辅助材料归档到 `docs`
- 删除已经长期不用、且已有等价正式入口替代的运行脚本
- 删除缓存、浏览器痕迹、历史实验副产物和仅剩 `pyc` 的空壳目录
- 更新 README、后端打包配置和前后端启动路径

本次整理不包含：

- 改写核心算法逻辑
- 调整前端视觉设计
- 变更 API 协议
- 新增功能模块

## Target Structure

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
|-- README.md
`-- .gitignore
```

## Deletion Policy

### Safe to delete

- `.playwright-mcp/`
- `backend/.pytest_cache/`（由 `app/.pytest_cache/` 迁移前删除）
- `frontend/dist/`（由 `app/web/dist/` 删除）
- `backend/src/mas_platform/__pycache__/`
- `backend/tests/__pycache__/`
- `backend/src/mas_platform/marl/`（当前仅剩 `pyc`）
- `app/run_demo.py`
- `app/run_experiments.py`
- `app/run_render.py`
- `app/run_frontend.py`

### Experiment results to keep

只保留一套当前权威输出：

- `experiment_summary.csv`
- `experiment_strategy_matrix.csv`
- `experiment_runs_long.csv`
- `experiment_report.md`
- `experiment_manifest.json`
- `experiment_completion_by_scenario.png`
- `experiment_robustness_by_strategy.png`
- `experiment_tradeoff_scatter.png`

### Experiment results to remove

- 带 `steps40`、`steps80`、`latest`、`after_fix`、`adaptive` 后缀的历史对照文件
- `results/runs/` 下的历史逐次运行目录
- `_api_runtime.log`
- `_web_runtime.log`
- `demo_result.json`
- `detailed_result.json`
- `agent_trajectories.png`
- `coverage_heatmap.png`
- `final_snapshot.png`
- `target_activity_timeline.png`

## Code and Config Updates

### README

- 根 README 改为顶层结构说明
- 后端启动命令切换为 `cd backend`
- 前端启动命令切换为 `cd frontend`
- 输出目录说明更新为 `backend/results`

### Backend packaging

- `pyproject.toml` 迁移到 `backend/`
- 去掉对 `run_demo.py`、`run_experiments.py`、`run_render.py`、`run_frontend.py` 的 sdist 包含
- 增加 `backend/README.md`，避免打包元数据继续依赖旧位置

### Frontend launcher

- `backend/src/mas_platform/web_frontend.py` 需要把前端目录解析为仓库根下的 `frontend/`

### Tests

- `backend/tests/test_api_experiment_metrics.py` 中的路径注入改为 `backend/src`

## Risks and Mitigations

### Risk 1: Python 路径断裂

重组后，后端测试与打包最容易因为 `src` 相对路径变化失效。

Mitigation:

- 保持 `backend/src/mas_platform` 包结构不变
- 更新测试中的 `sys.path` 注入逻辑
- 运行后端单测验证

### Risk 2: 前端/后端入口文档失真

README 和运行说明如果不跟着改，会让后续使用者按旧路径执行失败。

Mitigation:

- 本次整理把 README 更新作为必做项
- 同步验证 `npm test`、`npm run build`

### Risk 3: 误删仍有参考价值的实验文件

历史结果很多，但并非都毫无价值。

Mitigation:

- 仅保留一套当前主结果
- 删除名单显式固定，不做模糊匹配清理
- 不删除 `experiment_runs_long.csv`，保留最完整明细

## Success Criteria

- 根目录只剩 `frontend/`、`backend/`、`docs/`、`README.md`、`.gitignore`
- 不再存在 `app/` 目录
- 不再存在 `.playwright-mcp/`
- `run_demo.py` 等废弃入口脚本被删除
- 后端单测通过
- 前端测试和构建通过
- README 中的路径与新结构一致
