# Frontend Lightweight i18n Design

## Goal

为当前前端增加轻量级中英文切换能力，不引入额外 i18n 库，并顺手补充“前端 5173 / 后端 8000”入口提示，减少使用时的地址混淆。

## Scope

- 保持前后端分离
- 新增轻量级本地语言字典
- 默认中文，支持英文切换
- 使用 `localStorage` 记住语言偏好
- 当前主要可见页面文案全部接入 i18n
- 在页面中增加前端入口提示

## Design

### 1. Lightweight i18n Helper

新增 `app/web/src/i18n.js`，提供：

- `normalizeLanguage(value)`
- `resolveInitialLanguage(savedValue)`
- `translate(language, key, vars?)`

使用本地字典对象完成文案查找与变量替换，不引入第三方依赖。

### 2. UI Integration

在 `App.jsx` 中增加：

- `language` 状态
- 顶部语言切换按钮
- `t()` 包装函数

把当前页面的核心静态文案改为通过字典获取。

### 3. UX Fix

在头部增加提示：

- 前端入口：`127.0.0.1:5173`
- 后端 API：`127.0.0.1:8000`

从 UI 侧解释“为什么 8000 打开不是前端页面”。

### 4. Testing

先为 `i18n.js` 写失败测试，覆盖：

- 语言规范化
- 初始语言解析
- 文案翻译与变量插值
