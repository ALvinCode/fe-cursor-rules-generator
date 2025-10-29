# 层级规则生成示例

本文档通过实际示例展示 Cursor Rules Generator 如何根据不同项目结构生成层级化的规则。

## 示例 1: React + Express 全栈应用

### 项目结构

```
my-fullstack-app/
├── package.json                # 根 package.json（workspace）
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.tsx
│   └── tsconfig.json
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   └── server.ts
│   └── tsconfig.json
└── shared/
    ├── package.json
    ├── src/
    │   └── types.ts
    └── tsconfig.json
```

### 生成命令

```
请为 /path/to/my-fullstack-app 生成 Cursor Rules
```

### 生成结果

```
my-fullstack-app/
├── .cursor/
│   └── rules/
│       └── 00-global-rules.mdc           # ✅ 全局规则
├── frontend/
│   ├── .cursor/
│   │   └── rules/
│   │       └── frontend-rules.mdc        # ✅ 前端规则
│   └── src/
├── backend/
│   ├── .cursor/
│   │   └── rules/
│   │       └── backend-rules.mdc         # ✅ 后端规则
│   └── src/
└── shared/
    ├── .cursor/
    │   └── rules/
    │       └── shared-rules.mdc          # ✅ 共享规则
    └── src/
```

### 规则内容概览

#### 全局规则 (`00-global-rules.mdc`)

```markdown
---
title: my-fullstack-app - 全局开发规则
description: 基于项目实际情况和最佳实践自动生成的 Cursor Rules
priority: 100
---

# 项目概述
这是一个基于 React, TypeScript, Express 的项目。

# 技术栈
- React
- TypeScript
- Express
- Node.js

# 通用开发规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 编写单元测试
...
```

#### 前端规则 (`frontend/rules/frontend-rules.mdc`)

```markdown
---
title: frontend 模块规则
description: 前端模块的开发规则
priority: 50
---

# frontend 模块

## 模块职责
负责用户界面展示和交互逻辑

## 开发指南
- 使用函数组件和 Hooks
- 保持组件单一职责
- 使用 React.memo 优化性能
...
```

### 规则加载演示

**场景 1: 在 `frontend/src/components/Button.tsx` 工作**

加载的规则：
1. ✅ `00-global-rules.mdc` (全局 TypeScript、Git 等规范)
2. ✅ `frontend-rules.mdc` (React 组件规范)
3. ❌ 不加载 `backend-rules.mdc`

Cursor 提示示例：
```
建议使用函数组件和 Hooks（来自 frontend-rules）
使用 TypeScript 严格模式（来自 global-rules）
```

**场景 2: 在 `backend/src/routes/users.ts` 工作**

加载的规则：
1. ✅ `00-global-rules.mdc`
2. ✅ `backend-rules.mdc` (Express API 规范)
3. ❌ 不加载 `frontend-rules.mdc`

Cursor 提示示例：
```
实施适当的错误处理机制（来自 backend-rules）
使用 TypeScript 严格模式（来自 global-rules）
```

---

## 示例 2: Monorepo 项目（pnpm workspace）

### 项目结构

```
my-monorepo/
├── package.json
├── pnpm-workspace.yaml
└── packages/
    ├── ui-components/
    │   ├── package.json
    │   └── src/
    ├── utils/
    │   ├── package.json
    │   └── src/
    ├── web-app/
    │   ├── package.json
    │   └── src/
    └── mobile-app/
        ├── package.json
        └── src/
```

### 生成结果

```
my-monorepo/
├── .cursor/
│   └── rules/
│       └── 00-global-rules.mdc                # Monorepo 通用规则
└── packages/
    ├── ui-components/
    │   ├── .cursor/
    │   │   └── rules/
    │   │       └── ui-components-rules.mdc    # 组件库规则
    │   └── src/
    ├── utils/
    │   ├── .cursor/
    │   │   └── rules/
    │   │       └── utils-rules.mdc            # 工具库规则
    │   └── src/
    ├── web-app/
    │   ├── .cursor/
    │   │   └── rules/
    │   │       └── web-app-rules.mdc          # Web 应用规则
    │   └── src/
    └── mobile-app/
        ├── .cursor/
        │   └── rules/
        │       └── mobile-app-rules.mdc       # 移动应用规则
        └── src/
```

### 输出摘要

```
✅ Cursor Rules 生成成功！

📁 生成的文件：
  - .cursor/rules/00-global-rules.mdc
  - packages/ui-components/.cursor/rules/ui-components-rules.mdc
  - packages/utils/.cursor/rules/utils-rules.mdc
  - packages/web-app/.cursor/rules/web-app-rules.mdc
  - packages/mobile-app/.cursor/rules/mobile-app-rules.mdc

📊 项目分析结果：
  - 主要技术栈: React, TypeScript
  - 检测到的模块: 5 个
  - 代码特征: 8 项

📝 规则摘要：
生成了 5 个规则文件：

**全局规则（项目根目录）：**
  - .cursor/rules/00-global-rules.mdc

**模块规则（按模块目录）：**
  - packages/ui-components/.cursor/rules/ui-components-rules.mdc (ui-components)
  - packages/utils/.cursor/rules/utils-rules.mdc (utils)
  - packages/web-app/.cursor/rules/web-app-rules.mdc (web-app)
  - packages/mobile-app/.cursor/rules/mobile-app-rules.mdc (mobile-app)

💡 提示：
  - 全局规则会在项目任何位置生效
  - 模块规则只在对应模块目录中生效
  - Cursor 会根据当前打开的文件位置自动加载相应规则
```

### 实际使用效果

**在 `packages/ui-components/src/Button.tsx` 工作时：**

```
加载的规则：
✅ 全局规则：Monorepo 版本管理、依赖更新策略
✅ ui-components 规则：
   - 组件必须可复用
   - 编写 Storybook 文档
   - 导出 TypeScript 类型
   - 支持主题定制
```

**在 `packages/web-app/src/App.tsx` 工作时：**

```
加载的规则：
✅ 全局规则：Monorepo 版本管理
✅ web-app 规则：
   - 使用 Next.js App Router
   - 实现 SSR/SSG
   - 优化 SEO
   - 配置路由
```

---

## 示例 3: 单体应用（无多模块）

### 项目结构

```
my-simple-app/
├── package.json
├── src/
│   ├── components/
│   ├── pages/
│   └── App.tsx
└── tsconfig.json
```

### 生成结果

```
my-simple-app/
├── .cursor/
│   └── rules/
│       └── 00-global-rules.mdc       # ✅ 仅生成全局规则
├── src/
└── package.json
```

**说明**：单体应用只生成一个全局规则文件，包含所有开发规范。

---

## 示例 4: 微服务架构

### 项目结构

```
my-microservices/
├── docker-compose.yml
├── services/
│   ├── auth-service/
│   │   ├── Dockerfile
│   │   └── src/
│   ├── user-service/
│   │   ├── Dockerfile
│   │   └── src/
│   └── order-service/
│       ├── Dockerfile
│       └── src/
└── shared/
    ├── proto/
    └── lib/
```

### 生成结果

```
my-microservices/
├── .cursor/
│   └── rules/
│       └── 00-global-rules.mdc                # 微服务通用规则
├── services/
│   ├── auth-service/
│   │   ├── .cursor/
│   │   │   └── rules/
│   │   │       └── auth-service-rules.mdc     # 认证服务规则
│   │   └── src/
│   ├── user-service/
│   │   ├── .cursor/
│   │   │   └── rules/
│   │   │       └── user-service-rules.mdc     # 用户服务规则
│   │   └── src/
│   └── order-service/
│       ├── .cursor/
│       │   └── rules/
│       │       └── order-service-rules.mdc    # 订单服务规则
│       └── src/
└── shared/
    ├── proto/
    │   ├── .cursor/
    │   │   └── rules/
    │   │       └── proto-rules.mdc            # Protocol Buffers 规则
    │   └── definitions/
    └── lib/
```

---

## 对比：传统方式 vs 层级规则

### 传统方式（所有规则放在根目录）

```
my-project/
└── .cursor/
    └── rules/
        ├── 00-global-rules.mdc
        ├── frontend-rules.mdc      ❌ 在 backend 工作时也会加载
        ├── backend-rules.mdc       ❌ 在 frontend 工作时也会加载
        └── shared-rules.mdc        ❌ 在应用层工作时也会加载
```

**问题**：
- ❌ 前端开发时看到后端规则提示（干扰）
- ❌ 所有规则混在一起，难以管理
- ❌ 无法针对模块位置提供精准建议

### 层级规则方式（本工具）

```
my-project/
├── .cursor/rules/00-global-rules.mdc          ✅ 全局通用
├── frontend/.cursor/rules/frontend-rules.mdc  ✅ 仅前端加载
├── backend/.cursor/rules/backend-rules.mdc    ✅ 仅后端加载
└── shared/.cursor/rules/shared-rules.mdc      ✅ 仅共享代码加载
```

**优势**：
- ✅ 精准加载，减少干扰
- ✅ 模块独立，易于维护
- ✅ 规则继承，全局+局部
- ✅ 性能更好，只加载需要的规则

---

## 配置选项

### 禁用模块规则（强制只生成全局规则）

如果你希望即使是多模块项目也只生成全局规则，可以这样设置：

```
请使用以下参数生成规则：
- 项目路径：/path/to/project
- 包含模块规则：否
```

或者通过 MCP 工具直接调用：

```json
{
  "projectPath": "/path/to/project",
  "includeModuleRules": false
}
```

**结果**：只在项目根目录生成 `00-global-rules.mdc`

---

## 总结

层级规则生成机制让 Cursor Rules Generator 能够：

1. **智能适应**：自动识别项目结构（单体/Monorepo/微服务）
2. **精准放置**：规则文件放在最合适的位置
3. **按需加载**：Cursor 根据工作位置加载相关规则
4. **减少干扰**：避免无关规则的提示
5. **易于维护**：模块规则独立，便于更新

无论你的项目是简单的单页应用，还是复杂的 Monorepo 多包项目，或是微服务架构，都能获得恰当的规则配置！🎯

