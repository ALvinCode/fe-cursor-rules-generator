# v1.3.0 规则文件重构设计

## 🎯 设计目标

基于 Cursor 官方最佳实践：
1. ✅ 规则文件专注、可组合
2. ✅ 每个文件 < 500 行
3. ✅ 复用规则块，避免重复
4. ✅ 具体的名称和描述
5. ✅ 使用 @filename.ts 引用
6. ✅ 生成 instructions.md

---

## 📁 新的规则文件结构

### 始终生成的核心文件

```
.cursor/
  ├── instructions.md (150-200 行)
  │   - 工作流程指导
  │   - 开始任务前的检查清单
  │   - 常见任务步骤
  │   - 参考文件索引
  │
  └── rules/
      ├── global-rules.mdc (250-300 行)
      │   - 项目概述和技术栈
      │   - 核心开发原则
      │   - 规则文件索引
      │   - 基本要求
      │
      ├── code-style.mdc (180-220 行)
      │   - 基于 .prettierrc 的配置
      │   - 命名约定（简洁版）
      │   - 路径别名规则
      │   - 导入导出规范
      │
      └── architecture.mdc (200-250 行)
          - 项目目录结构
          - 文件组织规则
          - 模块职责划分
          - 新建文件指南
```

### 按需生成的专题文件

```
.cursor/rules/
  ├── custom-tools.mdc (100-150 行)
  │   - 自定义 Hooks 列表和使用
  │   - 自定义工具函数
  │   - API 客户端使用规范
  │   [仅当检测到自定义工具时生成]
  │
  ├── error-handling.mdc (150-180 行)
  │   - 项目当前错误处理实践
  │   - 短期/长期改进建议
  │   - 实际代码示例引用
  │   [仅当检测到错误处理模式时生成]
  │
  ├── ui-ux.mdc (200-250 行)
  │   - 视觉设计规范
  │   - 无障碍访问（WCAG）
  │   - 响应式设计
  │   - UI 组件最佳实践
  │   [仅当是前端项目时生成]
  │
  ├── state-management.mdc (150-200 行)
  │   - Redux/MobX/Zustand 等使用规范
  │   - Store 组织方式
  │   - 实际代码引用
  │   [仅当检测到状态管理时生成]
  │
  └── testing.mdc (180-220 行)
      - 测试组织和命名
      - AAA 模式和 Mock 使用
      - 实际测试文件引用
      [仅当检测到测试时生成]
```

### 模块特定规则（多模块项目）

```
frontend/
  └── .cursor/rules/
      ├── frontend-overview.mdc (150-200 行)
      │   - 前端模块职责
      │   - 技术栈
      │   - 引用全局规则
      │
      └── frontend-components.mdc (200-250 行)
          - 组件开发规范
          - 实际组件示例引用
```

---

## 🎨 单个规则文件示例

### global-rules.mdc (约 280 行)

```markdown
---
title: 全局开发规则
description: 项目级通用规范和开发原则
priority: 100
version: 1.3.0
scope: global
type: overview
---

# 项目概述

**项目名称**: aaclub_mboss  
**技术栈**: React, TypeScript, MobX, Ant Design  
**类型**: 单页应用

## 技术栈详情

**主要技术**:
- React 18
- TypeScript 5.0
- MobX（状态管理）
- Ant Design（UI 库）

**构建工具**: Vite

## 开发规范文件

本项目的开发规范分布在以下文件中，请根据工作内容参考：

- **@code-style.mdc** - 代码风格和格式化规范
- **@architecture.mdc** - 项目架构和文件组织
- **@custom-tools.mdc** - 项目自定义工具（必须使用）
- **@error-handling.mdc** - 错误处理规范
- **@state-management.mdc** - MobX 状态管理规范
- **@ui-ux.mdc** - UI/UX 设计规范

**工作流程**: 详见 @../instructions.md

## 核心开发原则

1. **保持一致性** - 遵循项目现有代码风格和架构
2. **优先使用项目工具** - 不要重新实现已有的工具函数和 Hooks
3. **遵循路径别名** - 使用 @/ 等别名，不使用相对路径
4. **渐进式改进** - 在现有基础上小步优化，不破坏架构
5. **类型安全** - 充分利用 TypeScript 的类型系统

## 开始新任务前

**必须**检查的文件：
1. @../instructions.md - 了解工作流程
2. @custom-tools.mdc - 确认可用的自定义工具
3. @architecture.mdc - 确定文件应该放在哪里
4. @code-style.mdc - 了解代码风格要求

## 项目特定注意事项

- ⚠️ 使用 MobX 进行状态管理，参见 @state-management.mdc
- ⚠️ 使用 Ant Design 组件库，参见 @ui-ux.mdc
- ⚠️ 所有 API 调用使用统一的客户端，参见 @custom-tools.mdc

## 参考文件

**示例组件**: @src/components/[查找最佳示例]  
**示例 Store**: @src/stores/[查找最佳示例]  
**工具函数**: @src/utils/[列出主要工具]

---

*本规则文件是项目规范的入口，详细内容请参考上述专题规则文件。*
```

**行数**: 约 280 行 ✅

---

### code-style.mdc (约 200 行)

```markdown
---
title: 代码风格规范
description: 基于项目配置的代码格式化和命名约定
priority: 90
scope: style
depends: global-rules
---

# 代码风格规范

参考: @global-rules.mdc - 核心原则

## 项目配置 (Prettier)

项目使用 Prettier 自动格式化，配置如下：

- **缩进**: 4 个空格
- **引号**: 单引号
- **分号**: 不使用
- **行长度**: 120 字符
- **尾随逗号**: all

⚠️ **重要**: 编辑器应配置 Prettier 自动格式化，无需手动调整。

配置文件: @.prettierrc

## 路径别名（必须使用）

项目配置的路径别名（来自 @tsconfig.json）：

- `@/` → `src/`
- `@components/` → `src/components/`
- `@utils/` → `src/utils/`

**正确示例**: 参见 @src/App.tsx#L1-L5
```typescript
import { Button } from '@components/Button'
import { formatDate } from '@utils/format'
```

**错误示例**:
```typescript
import { Button } from '../../../components/Button'  // ❌
```

## 命名约定

### 组件
- **格式**: PascalCase
- **示例**: @src/components/UserProfile.tsx

### 工具函数
- **格式**: camelCase
- **示例**: @src/utils/format.ts

### 常量
- **格式**: UPPER_CASE
- **示例**: @src/config/constants.ts

## TypeScript 规范

- 启用严格模式（@tsconfig.json）
- 避免使用 `any`
- 为函数参数和返回值添加类型

**参考示例**: @src/services/[查找类型定义良好的文件]

---

*详细的最佳实践参见各专题规则文件。*
```

**行数**: 约 200 行 ✅

---

### custom-tools.mdc (约 150 行)

```markdown
---
title: 项目自定义工具
description: 必须优先使用的自定义 Hooks 和工具函数
priority: 95
scope: custom-tools
---

# 项目自定义工具（优先使用）

## 自定义 Hooks

### useAuth
**用途**: 用户认证状态管理  
**定义**: @src/hooks/useAuth.ts  
**使用示例**: @src/components/UserProfile.tsx#L10

```typescript
const { user, isAuthenticated, login, logout } = useAuth()
```

**使用频率**: 高 (15 处)

### useApiClient
**定义**: @src/hooks/useApiClient.ts  
**使用示例**: @src/services/user-service.ts#L8

## 自定义工具函数

### 格式化工具

**formatDate**
- **定义**: @src/utils/format.ts#L5-L10
- **示例**: @src/components/DateDisplay.tsx#L12

**formatCurrency**  
- **定义**: @src/utils/format.ts#L12-L17

### 验证工具

**validateEmail**
- **定义**: @src/utils/validation.ts#L3-L6
- **示例**: @src/components/LoginForm.tsx#L20

## API 客户端

**apiClient**
- **定义**: @src/services/api-client.ts
- **特性**: 
  - ✅ 已内置错误处理
  - ✅ 已内置认证
  - ✅ 已内置请求拦截
- **使用示例**: @src/services/user-service.ts#L15-L20

```typescript
import { apiClient } from '@services/api-client'

const data = await apiClient.get('/users')
```

## ⚠️ 重要规则

1. **必须**优先使用上述工具，不要重新实现
2. **禁止**引入第三方库做已有工具能做的事
3. **新增**工具时，遵循现有工具的命名和组织

---

*这些工具的详细实现请直接查看引用的源文件。*
```

**行数**: 约 150 行 ✅

---

### instructions.md (约 200 行)

```markdown
# 开发工作流程指导

> 本文档说明在本项目中使用 Cursor AI 进行开发的推荐流程

## 📋 开始任务前的检查清单

在开始任何开发任务前，请确认：

- [ ] 已阅读 @.cursor/rules/global-rules.mdc 了解项目概述
- [ ] 已查看 @.cursor/rules/custom-tools.mdc 了解可用工具
- [ ] 已确认文件应该放在哪里（@.cursor/rules/architecture.mdc）
- [ ] **已让 Cursor 确认理解了任务** ⚠️ 重要

## 🚀 新建功能的步骤

### 1. 理解需求

**询问 Cursor**:
```
请确认你理解了以下任务：[描述任务]

需要创建哪些文件？
需要使用哪些项目自定义工具？
```

### 2. 检查可复用工具

**查看**:
- @.cursor/rules/custom-tools.mdc - 项目自定义工具列表

**询问 Cursor**:
```
对于 [功能]，项目中是否已有可用的工具或 Hooks？
```

### 3. 确定文件位置

**查看**:
- @.cursor/rules/architecture.mdc - 文件组织规范

**询问 Cursor**:
```
新建 [类型] 文件应该放在哪个目录？
使用什么路径别名导入？
```

### 4. 开始实现

**提示 Cursor**:
```
请使用项目的自定义工具实现 [功能]：
- 使用 @utils/format.ts 的 formatDate
- 使用 @hooks/useAuth.ts 的 useAuth
- 遵循 @.cursor/rules/code-style.mdc 的规范
```

### 5. 代码审查

**检查清单**:
- [ ] 使用了项目自定义工具？（而非重新实现）
- [ ] 使用了路径别名？（而非相对路径）
- [ ] 遵循了命名约定？
- [ ] 添加了类型定义？
- [ ] 添加了错误处理？
- [ ] 文件放在了正确位置？

## 🔧 常见任务

### 新建 React 组件

```
任务: 创建一个用户列表组件

步骤:
1. 让 Cursor 确认: "请确认理解任务，需要创建哪些文件？"
2. 指定位置: "放在 src/components/ 目录"
3. 指定工具: "使用 useAuth Hook 获取用户，使用 apiClient 获取数据"
4. 指定引用: "参考 @src/components/UserProfile.tsx 的结构"
```

### 新建工具函数

```
任务: 创建一个电话号码格式化函数

步骤:
1. 检查: @.cursor/rules/custom-tools.mdc - 是否已存在？
2. 位置: src/utils/format.ts（与现有格式化工具放在一起）
3. 实现: 遵循现有工具的代码风格
```

### 修复 Bug

```
步骤:
1. 让 Cursor 分析: "分析这个 bug 的原因"
2. 确认方案: "请确认修复方案是否会影响其他功能"
3. 遵循规范: "修复时遵循项目的错误处理规范"
```

## 🎯 最佳实践

### 与 Cursor 的对话

**✅ 好的提示**:
```
请确认理解任务
使用项目的 useAuth Hook
参考 @src/components/Button.tsx 的样式
遵循 @.cursor/rules/code-style.mdc
```

**❌ 不好的提示**:
```
帮我写代码（太模糊）
创建一个组件（没有说明位置和引用）
```

### 利用规则文件

**模式**:
```
[描述任务] + [指定规则] + [指定参考]

示例:
"创建登录表单组件，
 遵循 @.cursor/rules/ui-ux.mdc 的无障碍规范，
 参考 @src/components/RegisterForm.tsx 的结构"
```

## 📚 参考文件索引

**核心组件**: 
- @src/components/[列出关键组件]

**工具函数**:
- @src/utils/format.ts - 格式化工具
- @src/utils/validation.ts - 验证工具

**状态管理**:
- @src/stores/[列出主要 Store]

**API 服务**:
- @src/services/api-client.ts - API 客户端

---

*提示: 使用 @filename.ts 可以让 Cursor 快速定位和参考相关代码。*
```

**行数**: 约 200 行 ✅

---

## 🔄 依赖关系设计

### 通过元数据表达依赖

```yaml
# global-rules.mdc
---
title: 全局规则
priority: 100
type: base
---

# code-style.mdc
---
title: 代码风格
priority: 90
depends: global-rules  # 依赖全局规则
type: guideline
---

# custom-tools.mdc
---
title: 自定义工具
priority: 95
depends: global-rules
type: reference
---

# error-handling.mdc
---
title: 错误处理
priority: 80
depends: [global-rules, custom-tools]  # 多重依赖
type: practice
---
```

### 依赖关系图

```
global-rules (100)
    ├── code-style (90)
    ├── custom-tools (95)
    ├── architecture (90)
    └── error-handling (80)
        └── depends: custom-tools
```

---

## 📊 行数控制策略

### 每个文件的内容分配

| 文件 | 目标行数 | 内容重点 |
|------|---------|---------|
| global-rules.mdc | 250-300 | 概述、原则、索引 |
| code-style.mdc | 180-220 | 配置、命名、路径 |
| architecture.mdc | 200-250 | 结构、组织、位置 |
| custom-tools.mdc | 100-150 | 工具列表、引用 |
| error-handling.mdc | 150-180 | 实践、建议、示例 |
| ui-ux.mdc | 200-250 | 设计、无障碍、组件 |
| state-management.mdc | 150-200 | Store、Action、示例 |
| testing.mdc | 180-220 | AAA、Mock、覆盖率 |
| instructions.md | 150-200 | 工作流、清单、技巧 |

**总计**: 约 1600-2100 行（分散在 6-9 个文件）

---

## 🎯 实施优先级

### Phase 1: 核心重构（4 小时）
1. 重构规则生成器 - 生成多个小文件
2. 实现文件引用系统（简化版）
3. 调整文件命名（语义化）

### Phase 2: 增强功能（2 小时）
4. 生成 instructions.md
5. 实现依赖关系元数据
6. 实现规则复用机制

### Phase 3: 测试发布（2 小时）
7. 测试验证
8. 文档更新
9. 发布 v1.3.0

---

**请确认此设计方案，我立即开始实施！** 🚀

