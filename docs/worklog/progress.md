# Progress Log

## 2026-04-16

- 初始化 `task_plan.md`、`findings.md`、`progress.md`。
- 开始第一阶段：盘点前端页面、后端接口和现有输出数据。
- 确认截图中的中文大屏并非当前仓库前端源码直接对应页面。
- 发现 `app/results/` 中已有多份更细粒度实验产物，当前默认前端未完全利用。
- 确认 `experiment_runs_long.csv` 包含逐 run 明细，可支撑更完整的统计对照。
- 发现长表与汇总表存在数值不一致，推断当前结果目录混有不同批次实验产物。
- 完成缺口分析，并整理出三类增强方向：统计增强、收益代价增强、参数敏感性增强。
- 新增后端设计文档与实现计划：
  - `docs/superpowers/specs/2026-04-16-experiment-backend-design.md`
  - `docs/superpowers/plans/2026-04-16-experiment-backend.md`
- 采用 TDD 补充后端测试：
  - `app/tests/test_api_experiment_metrics.py`
- 在 `app/src/mas_platform/api.py` 中实现了：
  - 统计摘要函数
  - 派生收益/代价指标函数
  - `/api/experiments` 新响应字段扩展
- 验证结果：
  - `.\app\.venv\Scripts\python.exe -m unittest app.tests.test_api_experiment_metrics -v` 通过
  - 实际调用 `experiments()` 已返回 `run_rows`、`strategy_stats`、`derived_metrics`
- 前端新增：
  - `app/web/src/experimentInsights.js`
  - `app/web/src/experimentInsights.test.js`
- 前端页面已完成三类展示增强：
  - 统计摘要表
  - 收益代价卡片与对照图
  - run-level 权衡散点图
- 前端验证结果：
  - `npm test` 通过
  - `npm run build` 通过
