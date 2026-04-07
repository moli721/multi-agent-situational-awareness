# 多智能体态势精准感知平台（App 目录）

[English version / 英文说明](README.md)

这个目录是可直接运行的项目主体（后端 + 前端 + 脚本）。

## 目录结构

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

## 启动后端 API

```bash
cd app
uv sync --extra api
uv run mas-api
```

API 接口：
- `GET /api/health`
- `POST /api/simulate`
- `POST /api/experiments`

## 启动 React 前端

新开一个终端：

```bash
cd app/web
npm install
npm run dev
```

访问地址：
- 前端：`http://127.0.0.1:5173`
- 后端：`http://127.0.0.1:8000`

## 可选 CLI 快捷命令

```bash
cd app
uv run mas-demo
uv run mas-experiments
uv run mas-render
```
