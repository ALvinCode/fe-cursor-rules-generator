# Cursor Rules Generator

一个智能 MCP Server，能够自动分析项目并生成符合项目特点的 Cursor Rules。

## 🌟 特性

- ✅ **智能项目分析**：自动扫描项目文件，识别技术栈和依赖
- ✅ **技术栈检测**：支持 Node.js、Python、Go、Rust、Java 等主流技术栈
- ✅ **多模块支持**：自动检测 monorepo、微服务等多模块架构
- ✅ **代码特征分析**：识别组件结构、API 路由、状态管理等开发模式
- ✅ **一致性检查**：比对项目描述文档与实际实现，发现不一致
- ✅ **最佳实践集成**：基于主流框架的最佳实践生成规则
- ✅ **自动生成规则**：在 `.cursor/rules/` 目录生成 `.mdc` 格式的规则文件
- ✅ **模块化规则**：支持全局规则 + 模块特定规则

## 📦 安装

### 1. 克隆仓库并构建

```bash
git clone <your-repo-url>
cd cursor-rules-generator
npm install
npm run build
```

### 2. 配置 Cursor

在 Cursor 的 MCP 配置文件中添加此 Server：

**macOS/Linux:** `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

**Windows:** `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

添加以下配置：

```json
{
  "mcpServers": {
    "cursor-rules-generator": {
      "command": "node",
      "args": ["/path/to/cursor-rules-generator/dist/index.js"],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

将 `/path/to/cursor-rules-generator` 替换为实际的项目路径。

### 3. 重启 Cursor

重启 Cursor 使配置生效。

## 🚀 使用方法

### 生成 Cursor Rules

在 Cursor 中，通过 AI 助手调用工具：

```
请使用 generate_cursor_rules 为当前项目生成规则
```

或者指定项目路径：

```
请为 /Users/myname/projects/my-app 生成 Cursor Rules
```

### 分析项目（不生成规则）

```
请分析项目结构和技术栈
```

### 检查一致性

```
请检查项目描述与实际代码的一致性
```

### 更新项目描述

```
请根据实际代码更新 README 文件
```

## 🛠️ 可用工具

### 1. `generate_cursor_rules`

分析项目并生成完整的 Cursor Rules。

**参数：**
- `projectPath` (必需): 项目根目录的绝对路径
- `updateDescription` (可选): 是否自动更新描述文件，默认 `false`
- `includeModuleRules` (可选): 是否生成模块特定规则，默认 `true`

**示例：**
```typescript
{
  "projectPath": "/Users/myname/projects/my-app",
  "updateDescription": false,
  "includeModuleRules": true
}
```

### 2. `analyze_project`

仅分析项目，不生成规则，返回详细的项目信息。

**参数：**
- `projectPath` (必需): 项目根目录的绝对路径

### 3. `check_consistency`

检查项目描述文档与实际代码的一致性。

**参数：**
- `projectPath` (必需): 项目根目录的绝对路径

### 4. `update_project_description`

根据实际代码更新项目描述文档。

**参数：**
- `projectPath` (必需): 项目根目录的绝对路径
- `descriptionFile` (可选): 要更新的文件，默认 `README.md`

## 📋 工作流程

```
1. 收集项目文件（最多10层深度）
   ↓
2. 检测技术栈和依赖
   ↓
3. 识别多模块结构
   ↓
4. 分析代码特征
   ↓
5. 获取最佳实践（通过 Context7，如已配置）
   ↓
6. 检查描述与实现的一致性
   ↓
7. （可选）提示用户更新描述文件
   ↓
8. 生成全局 + 模块规则
   ↓
9. 写入 .cursor/rules/*.mdc 文件
   ↓
10. 返回摘要
```

## 🔧 支持的技术栈

### 前端框架
- React
- Vue
- Angular
- Svelte
- Next.js
- Nuxt
- SvelteKit

### 后端框架
- Express
- Fastify
- NestJS
- Koa
- Hapi
- Django
- Flask
- FastAPI

### 语言
- JavaScript
- TypeScript
- Python
- Go
- Rust
- Java
- PHP
- Ruby

### 工具链
- npm / yarn / pnpm
- pip / pipenv
- cargo
- go modules
- maven / gradle

## 📁 生成的文件结构

### Single Module Project

```
your-single-project/
├── .cursor/
│   └── rules/
│       └── 00-global-rules.mdc      # Global rules
├── src/
├── package.json
└── README.md
```

### Multi-Module Project (Smart Hierarchical Generation)

```
your-multi-module-project/
├── .cursor/
│   └── rules/
│       └── 00-global-rules.mdc      # Global rules
├── frontend/
│   ├── .cursor/
│   │   └── rules/
│   │       └── frontend-rules.mdc   # Frontend module rules
│   └── src/
├── backend/
│   ├── .cursor/
│   │   └── rules/
│   │       └── backend-rules.mdc    # Backend module rules
│   └── src/
└── shared/
    ├── .cursor/
    │   └── rules/
    │       └── shared-rules.mdc     # Shared module rules
    └── src/
```

**Smart Features**:
- ✅ Global rules in project root affect the entire project
- ✅ Module rules in their respective directories affect only that module
- ✅ Cursor automatically loads relevant rules based on current file location
- ✅ Module rules can override global rule configurations

## 🎯 规则内容

生成的规则包含：

- **项目概述**：技术栈、语言、框架
- **项目结构**：模块组织和职责
- **核心功能特征**：组件、API、状态管理等
- **开发规范**：针对具体技术栈的开发指南
- **代码风格**：命名、格式、最佳实践
- **文件组织**：目录结构和文件命名约定
- **注意事项**：常见陷阱和重要提醒

## 📝 示例输出

```markdown
---
title: my-app - 全局开发规则
description: 基于项目实际情况和最佳实践自动生成的 Cursor Rules
priority: 100
---

# 项目概述

这是一个基于 React, TypeScript, Next.js 的项目。

## 技术栈

**主要技术栈：**
- React
- TypeScript
- Next.js

**语言：** TypeScript, JavaScript

**包管理器：** npm

## 项目结构

这是一个单体应用项目。

## 核心功能特征

### 项目使用自定义组件结构

- **类型：** custom-components
- **使用频率：** 25 处
- **示例：** Button.tsx, Card.tsx, Modal.tsx

...
```

## 🤝 集成 Context7

如果您的环境中配置了 Context7 MCP Server，本工具会自动获取依赖库的官方文档和最佳实践。

如果未配置 Context7，工具会使用内置的最佳实践模板。

**配置 Context7（可选）：**

请参考 [Context7 MCP Server 文档](https://context7.ai/) 进行配置。

## 🔍 排除的目录

以下目录会被自动排除：

- `node_modules`
- `.git`
- `dist`, `build`, `out`
- `.next`, `.nuxt`
- `coverage`, `.cache`
- `.vscode`, `.idea`
- `__pycache__`, `.pytest_cache`
- `venv`, `env`
- `target`, `bin`, `obj`

## ⚠️ 注意事项

1. **首次生成**：首次生成可能需要几秒钟，取决于项目大小
2. **大型项目**：超大型项目（10000+ 文件）可能需要更长时间
3. **覆盖规则**：再次生成会覆盖现有的规则文件
4. **手动编辑**：建议将自定义规则放在独立文件中，避免被覆盖
5. **Context7**：Context7 集成是可选的，未配置不影响基本功能

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 反馈

如有问题或建议，请创建 Issue。

