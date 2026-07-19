# 项目上下文

## 项目概览

**员工心声助手** - 茂佳科技员工反馈分析平台，对员工反馈进行分类、归纳并生成响应建议。

核心功能：
- **互动端**：提交员工反馈，AI 生成处理建议与回复话术
- **数据看板**：反馈分类统计、高频问题摘要、紧急程度判断、责任部门建议

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
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── api/
│   │   │   ├── ai-reply/   # AI 单条反馈分析（SSE）
│   │   │   ├── analysis/   # AI 深度分析（SSE）
│   │   │   ├── stats/      # 统计数据
│   │   │   └── voices/     # 反馈 CRUD
│   │   ├── dashboard/      # 数据看板页面
│   │   └── page.tsx        # 互动端首页
│   ├── components/ui/      # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   └── lib/
│       ├── store.ts        # 数据存储（238条真实反馈）
│       ├── types.ts        # 类型定义
│       └── utils.ts        # 工具函数
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 反馈分类体系

| 类别 Key | 标签 | 说明 |
|----------|------|------|
| performance | 绩效问题 | 绩效考核、KPI、评级相关 |
| accommodation | 住宿问题 | 宿舍管理、设施、安全 |
| attendance | 考勤问题 | 打卡、请假、加班 |
| management | 管理问题 | 管理方式、沟通、公平性 |
| salary | 工资问题 | 薪资、福利、补贴 |
| dining | 用餐问题 | 食堂、餐饮、卫生 |
| rough_manage | 粗暴管理 | 言语/肢体冲突 |
| other | 其他 | 未分类反馈 |

## API 接口

| 路径 | 方法 | 功能 |
|------|------|------|
| /api/voices | GET | 获取反馈列表，支持 ?category= 筛选 |
| /api/voices | POST | 创建反馈 |
| /api/stats | GET | 获取统计数据（分类、厂区、高频问题） |
| /api/ai-reply | POST | AI 单条反馈分析（SSE） |
| /api/analysis | POST | AI 深度分析全部反馈（SSE） |

## 核心组件

| 组件 | 路径 | 说明 |
|------|------|------|
| Header | src/components/header.tsx | 顶部导航 |
| VoiceCard | src/components/voice-card.tsx | 反馈卡片（含AI分析） |
| VoiceForm | src/components/voice-form.tsx | 提交反馈表单 |
| CategoryFilter | src/components/category-filter.tsx | 分类筛选 |

## 数据存储

使用内存存储（src/lib/store.ts），内置238条真实员工反馈数据（已脱敏）。

## 包管理规范

**仅允许使用 pnpm** 作为包管理器。

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码
- 禁止隐式 `any` 和 `as any`
- 函数参数必须有明确类型标注

### Hydration 问题防范

- 严禁在 JSX 中直接使用 typeof window、Date.now()、Math.random()
- 必须使用 'use client' + useEffect + useState
- 禁止使用 head 标签，优先使用 metadata

### UI 规范

- 采用 shadcn/ui 组件风格
- 圆润设计语言，暖色调配色
- 参考 DESIGN.md 中的设计规范
