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

### 为什么需要安装？

本项目依赖多个 npm 包（`@modelcontextprotocol/sdk`、`glob`、`pino` 等）。如果直接配置指向 `dist/index.js` 而不安装依赖，Node.js 无法解析这些模块，会报错 `Cannot find module`。

### 方式一：使用 npx（最简单，推荐）

**无需手动安装**，`npx` 会自动下载并运行：

在 Cursor 的 MCP 配置文件中添加：

**macOS/Linux:** `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

**Windows:** `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "cursor-rules-generator": {
      "command": "npx",
      "args": ["-y", "cursor-rules-generators"],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

### 方式二：通过 npm 安装

```bash
# 全局安装
npm install -g cursor-rules-generators

# 或本地安装到项目
npm install cursor-rules-generators
```

**如果全局安装**，配置：

```json
{
  "mcpServers": {
    "cursor-rules-generator": {
      "command": "cursor-rules-generator",
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

**如果本地安装**，配置：

```json
{
  "mcpServers": {
    "cursor-rules-generator": {
      "command": "node",
      "args": ["/项目路径/node_modules/cursor-rules-generators/dist/index.js"],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

### 方式三：从源码安装（不推荐，除非需要开发）

```bash
git clone https://github.com/ALvinCode/fe-cursor-rules-generator.git
cd cursor-rules-generator
npm install  # 必须安装依赖！
npm run build
```

配置：

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

**重要**：必须确保已运行 `npm install`，否则会因缺少依赖而无法运行。

### 重启 Cursor

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

### 5. `validate_rules`

验证 Cursor Rules 文件的格式和内容是否正确。

**参数：**
- `projectPath` (必需): 项目根目录的绝对路径
- `validateModules` (可选): 是否验证模块目录中的规则文件，默认 `true`

### 6. `preview_rules_generation`

预览规则生成过程，列出所有任务、分析结果和需要确认的决策点，不实际生成文件。

**参数：**
- `projectPath` (必需): 项目根目录的绝对路径

### 7. `info`

显示 MCP 工具信息，包括版本号、日志配置状态、环境变量配置和任何检测到的配置问题。

**参数：** 无

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

## ⚙️ 环境变量配置

支持通过环境变量控制日志级别、调试模式和输出保护：

### 日志级别

```bash
# 设置日志级别（DEBUG, INFO, WARN, ERROR, NONE）
export CURSOR_RULES_GENERATOR_LOG_LEVEL=DEBUG

# 或在 Cursor 配置中设置
{
  "mcpServers": {
    "cursor-rules-generator": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "CURSOR_RULES_GENERATOR_LOG_LEVEL": "INFO"
      }
    }
  }
}
```

### 输出保护（防止 AI 修改输出）

**默认启用**，输出会被保护以防止 AI 修改或重新格式化。

禁用输出保护：

```json
{
  "mcpServers": {
    "cursor-rules-generator": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "MCP_PROTECT_OUTPUT": "false"
      }
    }
  }
}
```

详细说明请查看 [防止 AI 修改输出的指南](./docs/guides/PREVENT_AI_MODIFICATION.md)。

### 调试模式

```bash
# 启用调试模式（自动将日志级别设为 DEBUG）
export CURSOR_RULES_GENERATOR_DEBUG=true
```

**日志级别说明**：
- `DEBUG`: 输出所有日志，包括详细的调试信息
- `INFO`: 输出信息性日志（默认）
- `WARN`: 仅输出警告和错误
- `ERROR`: 仅输出错误
- `NONE`: 不输出任何日志

## ⚠️ 注意事项

1. **首次生成**：首次生成可能需要几秒钟，取决于项目大小
2. **大型项目**：超大型项目（10000+ 文件）可能需要更长时间
3. **覆盖规则**：再次生成会覆盖现有的规则文件
4. **手动编辑**：建议将自定义规则放在独立文件中，避免被覆盖
5. **Context7**：Context7 集成是可选的，未配置不影响基本功能
6. **日志输出**：日志会写入文件，不会干扰 MCP 协议通信（stdio 用于 JSON-RPC）

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南

1. **Fork 本仓库**
2. **创建功能分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **开启 Pull Request**

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/ALvinCode/fe-cursor-rules-generator.git
cd cursor-rules-generator

# 安装依赖
pnpm install

# 开发模式（自动编译）
pnpm run watch

# 编译
pnpm run build

# 测试
pnpm test
```

### 代码规范

- 使用 TypeScript 编写，遵循严格类型检查
- 使用统一的日志系统（`src/utils/logger.ts`）
- 使用统一的错误处理（`src/utils/errors.ts`）
- 遵循现有的代码风格和模块化结构

## 📁 项目结构

### 目录结构

```
cursor-rules-generator/
├── src/                          # 源代码
│   ├── index.ts                  # MCP Server 主入口
│   ├── types.ts                  # TypeScript 类型定义
│   ├── modules/                  # 核心功能模块（20 个）
│   │   ├── project-analyzer.ts   # 项目文件收集
│   │   ├── tech-stack-detector.ts # 技术栈检测
│   │   ├── tech-stack-matcher.ts # 技术栈匹配
│   │   ├── module-detector.ts    # 模块结构识别
│   │   ├── code-analyzer.ts      # 代码特征分析
│   │   ├── practice-analyzer.ts  # 项目实践分析
│   │   ├── config-parser.ts      # 配置文件解析
│   │   ├── custom-pattern-detector.ts # 自定义模式检测
│   │   ├── file-structure-learner.ts  # 文件结构学习
│   │   ├── router-detector.ts    # 路由系统检测
│   │   ├── consistency-checker.ts # 一致性检查
│   │   ├── rules-generator.ts    # 规则生成引擎
│   │   ├── file-writer.ts        # 文件写入器
│   │   ├── rule-validator.ts    # 规则验证器
│   │   ├── context7-integration.ts # Context7 集成
│   │   ├── best-practice-extractor.ts # 最佳实践提取
│   │   ├── best-practice-comparator.ts # 最佳实践比较
│   │   ├── best-practice-web-searcher.ts # 最佳实践网络搜索
│   │   ├── framework-matcher.ts  # 框架匹配
│   │   └── suggestion-collector.ts # 建议收集器
│   └── utils/                    # 工具类
│       ├── logger.ts             # 日志工具
│       ├── errors.ts             # 错误处理
│       └── file-utils.ts         # 文件操作工具
├── docs/                         # 文档目录
│   ├── architecture/            # 架构设计文档
│   └── guides/                  # 使用指南
├── scripts/                      # 脚本文件
│   └── quick-test.sh            # 快速测试脚本
├── dist/                         # 编译输出（自动生成）
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 配置
├── README.md                     # 项目说明（本文档）
├── README.zh-CN.md               # 中文详细文档
├── CHANGELOG.md                  # 版本更新日志
└── LICENSE                       # MIT 许可证
```

### 核心模块说明

**分析模块**（10 个）：
- `project-analyzer.ts` - 收集项目文件
- `tech-stack-detector.ts` - 检测技术栈和依赖
- `tech-stack-matcher.ts` - 技术栈匹配
- `module-detector.ts` - 识别多模块结构
- `code-analyzer.ts` - 分析代码特征
- `practice-analyzer.ts` - 分析项目实践规范
- `config-parser.ts` - 解析配置文件（Prettier、ESLint 等）
- `custom-pattern-detector.ts` - 检测自定义工具和模式
- `file-structure-learner.ts` - 学习文件组织结构
- `router-detector.ts` - 检测路由系统

**规则相关**（3 个）：
- `rules-generator.ts` - 规则生成引擎（核心模块）
- `file-writer.ts` - 写入规则文件
- `rule-validator.ts` - 验证规则文件

**最佳实践模块**（4 个）：
- `best-practice-extractor.ts` - 提取最佳实践
- `best-practice-comparator.ts` - 比较最佳实践
- `best-practice-web-searcher.ts` - 网络搜索最佳实践
- `framework-matcher.ts` - 框架匹配

**其他模块**（3 个）：
- `consistency-checker.ts` - 检查文档一致性
- `context7-integration.ts` - Context7 MCP 集成
- `suggestion-collector.ts` - 建议收集器

### 工具类

- `logger.ts` - 统一的日志系统，支持日志级别控制
- `errors.ts` - 统一的错误处理体系
- `file-utils.ts` - 文件操作工具（递归扫描、读写文件等）

## 📮 反馈与支持

如有问题或建议，请创建 [Issue](https://github.com/ALvinCode/fe-cursor-rules-generator/issues)。

- **GitHub 仓库**: [fe-cursor-rules-generator](https://github.com/ALvinCode/fe-cursor-rules-generator)
- **作者**: [Zheng Kuo](https://github.com/ALvinCode)

