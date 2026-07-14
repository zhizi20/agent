# 项目上下文

## 项目概览

**员工心声助手** - 一个温暖的员工心声平台，让每个声音都被听见、被理解、被回应。

核心功能：
- 心声墙：展示员工心声，支持分类筛选、点赞
- 发布心声：支持匿名/实名，6种分类（建议/吐槽/感恩/困惑/灵感/其他）
- AI 暖心回复：通过 LLM 流式生成温暖回应
- 数据看板：统计总心声数、分类分布、本周趋势等

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动脚本
│   ├── prepare.sh          # 预处理脚本
│   └── start.sh            # 生产环境启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   ├── components/ui/      # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   └── utils.ts        # 通用工具函数 (cn)
│   └── server.ts           # 自定义服务端入口
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

- 项目文件（如 app 目录、pages 目录、components 等）默认初始化到 `src/` 目录下。

## API 接口

| 路径 | 方法 | 功能 |
|------|------|------|
| /api/voices | GET | 获取心声列表，支持 ?category= 筛选 |
| /api/voices | POST | 创建心声 / 点赞（action: 'like'） |
| /api/voices | PUT | 更新 AI 回复 |
| /api/stats | GET | 获取统计数据 |
| /api/ai-reply | POST | AI 流式回复（SSE） |

## 核心组件

| 组件 | 路径 | 说明 |
|------|------|------|
| Header | src/components/header.tsx | 顶部导航 |
| VoiceCard | src/components/voice-card.tsx | 心声卡片（含AI回复流式渲染） |
| VoiceForm | src/components/voice-form.tsx | 发布心声表单 |
| CategoryFilter | src/components/category-filter.tsx | 分类筛选 |

## 数据存储

当前使用内存存储（src/lib/store.ts），服务重启后数据重置。如需持久化可接入数据库。

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

### next.config 配置规范

- 配置的路径不要写死绝对路径，必须使用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。**必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染**；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。
2. **禁止使用 head 标签**，优先使用 metadata，详见文档：https://nextjs.org/docs/app/api-reference/functions/generate-metadata
   1. 三方 CSS、字体等资源可在 `globals.css` 中顶部通过 `@import` 引入或使用 next/font
   2. preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入
   3. json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**
