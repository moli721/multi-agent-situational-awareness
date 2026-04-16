# Findings

## Research Scope

- 当前任务是评估项目现有实验数据展示，并提出更完整、更适合论文的对照数据建议。
- 调研重点包括：前端展示模块、后端实验接口、已有结果文件、指标维度与缺失项。

## Current Discoveries

- 当前仓库的前端是 `app/web/src/App.jsx`，主要展示单次仿真结果和实验对比结果。
- 用户截图中的中文大屏标题文案未在当前仓库中找到，说明截图对应的页面不是该仓库当前前端源码直接生成的界面。
- 当前仓库已生成的结果文件明显多于默认前端展示内容，包括：
  - `experiment_summary.csv`
  - `experiment_strategy_matrix.csv`
  - `experiment_runs_long.csv`
  - 多个不同步数/版本的历史对照 CSV
  - `experiment_tradeoff_scatter.png`
  - `experiment_report.md`
- 已有论文骨架强调“实验设计、结果展示、结果分析”，说明补充数据应优先服务于：
  - 多场景对照
  - 多策略对照
  - 鲁棒性分析
  - 响应时间与协同收益解释

## Data Quality Observations

- `experiment_runs_long.csv` 提供了逐次运行级别的数据，包含：
  - `strategy`
  - `scenario`
  - `run_index`
  - `seed`
  - `steps_used`
  - `task_completion_rate`
  - `collaboration_efficiency`
  - `task_completion_latency_steps`
  - `messages_sent`
  - `failed_agents`
  - `coverage_rate`
  - `average_information_age`
  - `assignment_conflicts`
- 长表数据非常适合补充分布型统计，例如：
  - 均值 + 标准差
  - 最小值 / 最大值
  - 置信区间
  - 箱线图 / 抖动散点
  - 稳定性排名
- 当前结果文件之间存在版本不一致迹象：
  - `experiment_runs_long.csv` 的统计均值与 `experiment_summary.csv` 不一致
  - `results/` 下同时存在多个 `steps40`、`steps80`、`latest`、`after_fix` 版本
- 这意味着在扩展对照数据之前，最重要的前置动作之一是统一“当前权威实验批次”。

## Gaps In Current Dashboard

- 当前前端主要展示均值级别的汇总，没有展示实验波动性。
- 没有显示标准差、置信区间、最优/最差 run、分位数，因此很难支撑“稳定性”结论。
- 没有把“收益”和“代价”放在一起看：
  - 有完成率与覆盖率
  - 也有消息量与冲突量
  - 但缺少通信代价收益比、单位成功成本等解释型指标
- 缺少故障注入前后或不同扰动强度下的敏感性分析。
- 缺少参数扫描类对照，例如：
  - `packet_loss_prob`
  - `comm_delay_steps`
  - `comm_range`
  - `vision_range`
- 当前实验 API 只返回聚合后的 `rows` 与 `strategy_rows`，没有直接向前端暴露 run-level 明细。

## Candidate Enhancement Directions

### Direction A: Statistical Comparison Upgrade

- 基于已有长表或后端 run-level 输出，增加：
  - 均值 ± 标准差
  - 95% 置信区间
  - min / median / max
  - 箱线图或散点抖动图
- 价值：
  - 适合论文“稳定性分析”
  - 实现成本相对最低

### Direction B: Benefit-Cost / Robustness Upgrade

- 在现有指标上派生更有解释力的对照：
  - 故障保持率 `fault / normal`
  - 通信收益 `with_comm - no_comm`
  - 单位成功消息成本 `messages / completed_targets`
  - 冲突代价 `assignment_conflicts / completed_targets`
  - 信息时效收益 `completion / information_age`
- 价值：
  - 更适合写“为什么方法更优”
  - 比单纯展示完成率更有说服力

### Direction C: Sensitivity / Ablation Upgrade

- 追加参数扫描实验：
  - 不同丢包率
  - 不同通信延迟
  - 不同最大步数
  - 不同故障率
- 形成热力图、折线簇图、退化曲线。
- 价值：
  - 最适合论文实验章节
  - 但实现与算力成本最高

## Backend Implementation Outcome

- `/api/experiments` 已在兼容原字段的前提下扩展新增：
  - `run_rows`
  - `strategy_stats`
  - `derived_metrics`
- `strategy_stats` 当前覆盖的统计指标：
  - `task_completion_rate`
  - `task_completion_latency`
  - `coverage_rate`
  - `messages_sent`
  - `average_information_age`
  - `assignment_conflicts`
- 每个统计指标当前提供：
  - `mean`
  - `std`
  - `min`
  - `median`
  - `max`
  - `ci95_low`
  - `ci95_high`
- `derived_metrics` 当前提供：
  - `fault_retention`
  - `comm_gain`
  - `message_cost_per_success_normal`
  - `message_cost_per_success_fault`
  - `conflict_cost_per_success_normal`
  - `conflict_cost_per_success_fault`
  - `completion_vs_age_ratio_normal`
  - `completion_vs_age_ratio_fault`

## Frontend Implementation Outcome

- 前端新增了纯函数数据整理模块：`app/web/src/experimentInsights.js`
- 前端新增了 Node 原生测试：`app/web/src/experimentInsights.test.js`
- 页面已接入并展示：
  - `Statistical Summary`
  - `Benefit-Cost View`
  - `Run-Level Tradeoff`
- 当前前端可直接消费后端新增字段：
  - `strategy_stats`
  - `derived_metrics`
  - `run_rows`
- 现有设计语言保持不变，仅做增量增强，没有重做整体界面结构。
