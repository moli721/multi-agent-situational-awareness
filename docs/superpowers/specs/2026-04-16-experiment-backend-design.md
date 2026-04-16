# Experiment Backend Enhancement Design

## Goal

在不破坏现有 `/api/experiments` 前端消费方式的前提下，扩展后端返回的实验数据，使其能够支持更完整的论文级对照分析。

## Scope

- 保留现有字段：`rows`、`strategy_rows`、`robustness_index`、`robustness_by_strategy`
- 新增逐 run 明细：`run_rows`
- 新增统计摘要：`strategy_stats`
- 新增收益/代价派生指标：`derived_metrics`

## Design

### 1. Backward-Compatible API Expansion

`POST /api/experiments` 继续返回原有聚合结果，同时附加更细粒度的数据块。这样前端可以分阶段升级，不会因为后端先改而失效。

### 2. Statistical Summaries

对每个 `strategy + scenario` 组合，按关键指标输出：

- `mean`
- `std`
- `min`
- `median`
- `max`
- `ci95_low`
- `ci95_high`

首批指标：

- `task_completion_rate`
- `task_completion_latency`
- `coverage_rate`
- `messages_sent`
- `average_information_age`
- `assignment_conflicts`

### 3. Benefit-Cost Derived Metrics

为每个策略生成方便前端展示和论文分析的派生指标：

- `fault_retention`
- `comm_gain`
- `message_cost_per_success_normal`
- `message_cost_per_success_fault`
- `conflict_cost_per_success_normal`
- `conflict_cost_per_success_fault`
- `completion_vs_age_ratio_normal`
- `completion_vs_age_ratio_fault`

### 4. Testing Strategy

先为统计函数、派生指标函数和 `/api/experiments` 返回结构写失败测试，再实现最小代码通过。
