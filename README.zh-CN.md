# 多智能体态势精准感知平台

[English version / 英文说明](README.md)

这是一个面向毕业设计的仿真优先多智能体态势精准感知系统仓库。

## 项目简介

- 基于 Python 的动态多智能体协同仿真引擎
- 提供 FastAPI 后端接口，用于仿真与实验调用
- 提供 React 可视化面板，用于参数配置与结果展示
- 支持场景化对照实验，便于论文评估与答辩演示

## 核心能力

- 二维动态环境（障碍、热点、目标移动）
- 去中心化 OODA 风格感知-决策闭环
- 通信约束建模（半径、时延、丢包、带宽上限）
- 冲突感知任务分配与故障注入
- 支持 normal / no-comm / fault 三类对照实验

## 仓库结构

```text
.
|-- app/                         # 可运行主项目
|   |-- src/mas_platform/        # simulation + API + CLI
|   |-- web/                     # React + Vite frontend
|   |-- run_demo.py
|   |-- run_experiments.py
|   |-- run_render.py
|   |-- pyproject.toml
|   `-- uv.lock
|-- thesis/                      # 论文相关材料
`-- *.extracted.txt              # 任务书/选题提取文本
```

## 快速开始

### 启动后端 API

```bash
cd app
uv sync --extra api
uv run mas-api
```

后端地址：`http://127.0.0.1:8000`

### 启动前端

新开一个终端：

```bash
cd app/web
npm install
npm run dev
```

前端地址：`http://127.0.0.1:5173`

## 命令行入口（在 `app/` 下执行）

```bash
uv run mas-demo
uv run mas-experiments
uv run mas-render
uv run mas-api
uv run mas-frontend
```

## 接口说明

- `GET /api/health`
- `POST /api/simulate`
- `POST /api/experiments`

请求示例：

```json
{
  "config": {
    "num_agents": 12,
    "num_targets": 14,
    "enable_communication": true
  }
}
```

## 主要指标

- `task_completion_rate`
- `collaboration_efficiency`
- `decision_response_time_steps`
- `coverage_rate`
- `average_information_age`
- `assignment_conflicts`
- `messages_sent`
- `messages_received`
- `failed_agents`

## 技术栈

- 后端：Python、FastAPI、Pydantic、uvicorn
- 仿真引擎：自研 MAS 仿真模块
- 前端：React、Vite、Recharts
- 环境管理：uv

## 补充文档

- 更详细运行说明见：[app/README.zh-CN.md](app/README.zh-CN.md)
