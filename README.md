# Contract Review Agent · 合同审核助手

桌面端 AI 合同审核工具：上传旅游合同（PDF / Word），调用大模型做内容审核与合规检查，并可按模板生成合规文档。基于 Electron 打包为 macOS / Windows 桌面应用。

## 功能

- **AI 对话审核**：针对合同条款逐项提问、审查风险点，支持 Markdown 渲染的审核结论
- **政策库管理**：内置政策与模板管理（`policy-service`），审核依据可维护、可扩展
- **双模型通道**：同时集成 Anthropic Claude 与 OpenAI SDK，在设置页切换并本地保存 API 配置（localStorage，不上传）
- **文档解析与生成**：PDF 解析（pdfjs-dist）、Word 解析（mammoth）、合规文档导出（docx + file-saver）

## 技术栈

| 层 | 选型 |
|---|---|
| 桌面壳 | Electron 33 + electron-builder（nsis / mac）|
| 前端 | React 18 + TypeScript + Vite 6 + Tailwind CSS |
| AI | @anthropic-ai/sdk, openai |
| 文档 | mammoth, pdfjs-dist, docx, file-saver |
| 状态 / 路由 / UI | zustand, react-router-dom, lucide-react, react-markdown |

## 本地运行

```bash
npm install

# Web 预览
npm run dev

# Electron 桌面端（开发）
npm run electron:dev

# 打包
npm run electron:build        # Windows
npm run electron:build:mac    # macOS
```

## 项目结构

```text
electron/        # Electron 主进程
src/
  components/    # Chat / PolicyManager / Settings / Sidebar
  services/      # policy-service（政策与模板加载）
  stores/        # app-store（zustand 全局状态）
  App.tsx        # 视图路由入口
```

## 说明

个人 side project：从"审一份旅游合同要逐条翻政策"这个真实痛点出发，把政策库、模板和大模型审核串成一个桌面工作流。
