# MCP Server 开发完全指南

> 从 0 到 1：以 cursor-rules-generator 为例，手把手教你开发 MCP Server

---

## 📚 目录

- [第一章：认识 MCP Server](#第一章认识-mcp-server)
- [第二章：开发环境搭建](#第二章开发环境搭建)
- [第三章：项目初始化](#第三章项目初始化)
- [第四章：核心架构设计](#第四章核心架构设计)
- [第五章：工具注册与处理](#第五章工具注册与处理)
- [第六章：错误处理与日志](#第六章错误处理与日志)
- [第七章：模块化开发](#第七章模块化开发)
- [第八章：打包与发布](#第八章打包与发布)
- [第九章：配置与使用](#第九章配置与使用)
- [第十章：最佳实践](#第十章最佳实践)

---

## 第一章：认识 MCP Server

### 1.1 什么是 MCP Server？

**MCP（Model Context Protocol）** 是一个开放的协议，用于在 AI 应用（如 Cursor、Claude Desktop）和外部服务之间建立标准化的通信桥梁。

**MCP Server** 就是实现了 MCP 协议的服务端程序，它：
- 🎯 提供工具（Tools）供 AI 调用
- 📊 提供资源（Resources）供 AI 访问
- 🔌 提供提示词（Prompts）模板
- 📝 通过标准输入输出（stdio）与客户端通信

### 1.2 为什么需要 MCP Server？

在 Cursor 中，AI 助手可以：
- ✅ 调用你开发的工具（如分析项目、生成代码）
- ✅ 访问外部数据（如数据库、API）
- ✅ 执行复杂的操作（如文件操作、网络请求）

**就像给 AI 装上了"插件系统"！**

### 1.3 MCP Server 的工作原理

```
┌─────────────┐      stdio       ┌──────────────┐
│   Cursor    │ ◄──────────────► │  MCP Server  │
│   (Client)  │    JSON-RPC      │  (你的程序)   │
└─────────────┘                  └──────────────┘
        │                                │
        │  "调用工具 X"                   │
        ├───────────────────────────────►│
        │                                │ 执行逻辑
        │                                │ 返回结果
        │◄───────────────────────────────┤
        │  结果                          │
```

**通信协议**：JSON-RPC over stdio（标准输入输出）

---

## 第二章：开发环境搭建

### 2.1 前置要求

确保你的开发环境满足以下要求：

- ✅ **Node.js** >= 18.0.0
- ✅ **npm** >= 9.0.0
- ✅ **TypeScript** >= 5.0.0（推荐）
- ✅ **Cursor** 编辑器（用于测试）

### 2.2 安装核心依赖

```bash
# 创建项目目录
mkdir my-mcp-server
cd my-mcp-server

# 初始化 npm 项目
npm init -y

# 安装 MCP SDK（核心依赖）
npm install @modelcontextprotocol/sdk

# 安装 TypeScript 开发依赖
npm install -D typescript @types/node

# 初始化 TypeScript 配置
npx tsc --init
```

### 2.3 TypeScript 配置

编辑 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",           // 编译目标
    "module": "Node16",           // 模块系统
    "moduleResolution": "Node16", // 模块解析
    "lib": ["ES2022"],            // 使用的库
    "outDir": "./dist",           // 输出目录
    "rootDir": "./src",           // 源码目录
    "strict": true,               // 严格模式
    "esModuleInterop": true,      // ES 模块互操作
    "skipLibCheck": true,         // 跳过库检查
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,    // 解析 JSON 模块
    "declaration": true,          // 生成声明文件
    "declarationMap": true,       // 声明文件映射
    "sourceMap": true             // 生成源码映射
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**关键配置说明**：
- `module: "Node16"`：使用 Node.js 16+ 的 ES 模块系统
- `outDir`：编译后的文件输出位置
- `strict: true`：启用严格类型检查

---

## 第三章：项目初始化

### 3.1 项目结构

一个典型的 MCP Server 项目结构如下：

```
my-mcp-server/
├── src/
│   ├── index.ts           # 主入口文件
│   ├── types.ts           # TypeScript 类型定义
│   ├── modules/           # 功能模块
│   │   ├── analyzer.ts
│   │   └── generator.ts
│   └── utils/             # 工具函数
│       ├── logger.ts
│       └── errors.ts
├── dist/                  # 编译输出（自动生成）
├── package.json
├── tsconfig.json
└── README.md
```

### 3.2 基础入口文件

创建 `src/index.ts`：

```typescript
#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * 我的第一个 MCP Server
 */
class MyMCPServer {
  private server: Server;

  constructor() {
    // 1. 创建 Server 实例
    this.server = new Server(
      {
        name: "my-mcp-server",      // Server 名称
        version: "1.0.0",            // 版本号
      },
      {
        capabilities: {
          tools: {},                 // 声明提供工具能力
        },
      }
    );

    // 2. 注册工具处理器
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // 3. 注册工具列表处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "hello_world",
            description: "一个简单的 Hello World 工具",
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "要问候的名字",
                },
              },
              required: ["name"],
            },
          },
        ],
      };
    });

    // 4. 注册工具调用处理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === "hello_world") {
        const userName = args?.name as string || "World";
        return {
          content: [
            {
              type: "text",
              text: `Hello, ${userName}! 👋`,
            },
          ],
        };
      }

      throw new Error(`未知的工具: ${name}`);
    });
  }

  async run() {
    // 5. 创建传输层（使用标准输入输出）
    const transport = new StdioServerTransport();

    // 6. 连接并启动 Server
    await this.server.connect(transport);
    console.error("My MCP Server 已启动"); // 使用 stderr 输出日志
  }
}

// 7. 启动 Server
const server = new MyMCPServer();
server.run().catch((error) => {
  console.error("服务器启动失败:", error);
  process.exit(1);
});
```

**代码解析**：

1. **`#!/usr/bin/env node`**：shebang，让文件可直接执行
2. **`Server`**：MCP SDK 的核心类，管理工具、资源等
3. **`StdioServerTransport`**：标准输入输出传输层
4. **`ListToolsRequestSchema`**：列出可用工具的请求
5. **`CallToolRequestSchema`**：调用工具的请求
6. **工具定义**：每个工具需要 `name`、`description`、`inputSchema`
7. **返回值**：工具调用返回 `content` 数组，支持文本、图片等

### 3.3 package.json 配置

```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "my-mcp-server": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "dev": "npm run build && node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.2"
  }
}
```

**关键字段**：
- `"type": "module"`：使用 ES 模块
- `"bin"`：定义可执行文件
- `"main"`：指定入口文件（编译后的）

---

## 第四章：核心架构设计

### 4.1 类结构设计

参考 `cursor-rules-generator` 的架构：

```typescript
class CursorRulesGeneratorServer {
  private server: Server;
  
  // 功能模块（单一职责）
  private projectAnalyzer: ProjectAnalyzer;
  private techStackDetector: TechStackDetector;
  private rulesGenerator: RulesGenerator;
  // ... 更多模块

  constructor() {
    // 1. 初始化 Server
    this.server = new Server(/* ... */);
    
    // 2. 初始化各功能模块
    this.projectAnalyzer = new ProjectAnalyzer();
    this.techStackDetector = new TechStackDetector();
    // ...
    
    // 3. 注册工具处理器
    this.setupToolHandlers();
  }
}
```

**设计原则**：
- ✅ **单一职责**：每个模块只负责一个功能
- ✅ **依赖注入**：模块通过构造函数注入
- ✅ **易于测试**：模块可独立测试

### 4.2 模块化目录结构

```
src/
├── index.ts                    # Server 主入口
├── types.ts                    # 全局类型定义
├── modules/                    # 功能模块
│   ├── project-analyzer.ts    # 项目分析
│   ├── rules-generator.ts     # 规则生成
│   └── ...
└── utils/                      # 工具类
    ├── logger.ts              # 日志系统
    ├── errors.ts              # 错误处理
    └── file-utils.ts          # 文件工具
```

**模块示例**：`src/modules/project-analyzer.ts`

```typescript
import { FileUtils } from "../utils/file-utils.js";

/**
 * 项目分析器
 * 职责：收集项目文件
 */
export class ProjectAnalyzer {
  async collectFiles(projectPath: string): Promise<string[]> {
    // 实现文件收集逻辑
    const files = await FileUtils.scanDirectory(projectPath);
    return files;
  }
}
```

### 4.3 类型定义

创建 `src/types.ts` 统一管理类型：

```typescript
/**
 * 项目分析结果
 */
export interface ProjectAnalysis {
  files: string[];
  techStack: TechStack;
  modules: Module[];
}

/**
 * 技术栈信息
 */
export interface TechStack {
  frameworks: string[];
  languages: string[];
  packageManager: string;
}

/**
 * 模块信息
 */
export interface Module {
  name: string;
  path: string;
  type: "frontend" | "backend" | "shared";
}
```

**好处**：
- ✅ 类型安全
- ✅ 代码提示
- ✅ 文档化

---

## 第五章：工具注册与处理

### 5.1 注册工具列表

```typescript
this.server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_cursor_rules",
        description: "分析项目并生成 Cursor Rules",
        inputSchema: {
          type: "object",
          properties: {
            projectPath: {
              type: "string",
              description: "项目根目录的绝对路径",
            },
            updateDescription: {
              type: "boolean",
              description: "是否自动更新描述文件",
              default: false,
            },
          },
          required: ["projectPath"],
        },
      },
      // ... 更多工具
    ],
  };
});
```

**inputSchema 说明**：
- `type`：参数类型（object, string, number, boolean 等）
- `properties`：定义每个参数
- `required`：必填参数列表
- `default`：默认值（可选）

### 5.2 处理工具调用

```typescript
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "generate_cursor_rules":
        return await this.handleGenerateRules(args);
      
      case "analyze_project":
        return await this.handleAnalyzeProject(args);
      
      default:
        throw new Error(`未知的工具: ${name}`);
    }
  } catch (error) {
    // 错误处理
    return createErrorResponse(error);
  }
});
```

### 5.3 工具处理函数示例

```typescript
private async handleGenerateRules(args: any) {
  const projectPath = args?.projectPath as string;
  const updateDescription = args?.updateDescription ?? false;

  // 1. 验证参数
  if (!projectPath) {
    throw new Error("projectPath 参数必需");
  }

  // 2. 执行业务逻辑
  const files = await this.projectAnalyzer.collectFiles(projectPath);
  const techStack = await this.techStackDetector.detect(files);
  const rules = await this.rulesGenerator.generate(techStack);

  // 3. 返回结果
  return {
    content: [
      {
        type: "text",
        text: `✅ 成功生成 ${rules.length} 个规则文件\n\n` +
              `项目: ${projectPath}\n` +
              `技术栈: ${techStack.frameworks.join(", ")}`,
      },
    ],
  };
}
```

**返回值格式**：
- `content`：内容数组
- `type: "text"`：文本类型
- `text`：实际内容（Markdown 格式）

---

## 第六章：错误处理与日志

### 6.1 统一错误处理

创建 `src/utils/errors.ts`：

```typescript
/**
 * 应用错误基类
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 文件操作错误
 */
export class FileOperationError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, "FILE_OPERATION_ERROR", 500);
    if (originalError) {
      this.cause = originalError;
    }
  }
}

/**
 * 将错误转换为 MCP 响应格式
 */
export function createErrorResponse(error: unknown): {
  content: Array<{ type: string; text: string }>;
} {
  let message: string;

  if (error instanceof AppError) {
    message = error.message;
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }

  return {
    content: [
      {
        type: "text",
        text: `❌ 错误: ${message}`,
      },
    ],
  };
}
```

**使用示例**：

```typescript
try {
  await someOperation();
} catch (error) {
  throw new FileOperationError("文件读取失败", error as Error);
}
```

### 6.2 日志系统

创建 `src/utils/logger.ts`：

```typescript
type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "NONE";

class Logger {
  private logLevel: LogLevel;

  constructor() {
    // 从环境变量读取日志级别
    const envLevel = process.env.MCP_SERVER_LOG_LEVEL?.toUpperCase();
    this.logLevel = this.parseLogLevel(envLevel) ?? "INFO";
  }

  private parseLogLevel(level?: string): LogLevel | null {
    const levels: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR", "NONE"];
    return levels.includes(level as LogLevel) ? (level as LogLevel) : null;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog("DEBUG")) {
      console.error(this.formatMessage("DEBUG", message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog("INFO")) {
      console.error(this.formatMessage("INFO", message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog("WARN")) {
      console.error(this.formatMessage("WARN", message), ...args);
    }
  }

  error(message: string, error?: Error | unknown, ...args: any[]): void {
    if (this.shouldLog("ERROR")) {
      let errorDetails = "";
      if (error instanceof Error) {
        errorDetails = `\n${error.stack}`;
      }
      console.error(this.formatMessage("ERROR", message), ...args, errorDetails);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR", "NONE"];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }
}

export const logger = new Logger();
```

**关键点**：
- ✅ **使用 `console.error`**：MCP Server 应使用 stderr 输出日志，避免干扰协议通信
- ✅ **日志级别**：支持 DEBUG、INFO、WARN、ERROR、NONE
- ✅ **环境变量**：通过 `MCP_SERVER_LOG_LEVEL` 控制日志级别

**使用示例**：

```typescript
import { logger } from "./utils/logger.js";

logger.info("开始分析项目", { projectPath });
logger.debug("收集到文件", { fileCount: files.length });
logger.error("处理失败", error);
```

---

## 第七章：模块化开发

### 7.1 单一职责原则

每个模块只负责一个功能：

```typescript
// ✅ 好的设计：职责单一
export class TechStackDetector {
  async detect(files: string[]): Promise<TechStack> {
    // 只负责技术栈检测
  }
}

export class RulesGenerator {
  async generate(techStack: TechStack): Promise<Rule[]> {
    // 只负责规则生成
  }
}

// ❌ 不好的设计：职责混乱
export class ProjectProcessor {
  async process(projectPath: string) {
    // 同时做检测、生成、写入等多个事情
  }
}
```

### 7.2 依赖注入

```typescript
class CursorRulesGeneratorServer {
  private techStackDetector: TechStackDetector;
  private rulesGenerator: RulesGenerator;

  constructor() {
    // 在构造函数中初始化依赖
    this.techStackDetector = new TechStackDetector();
    this.rulesGenerator = new RulesGenerator(this.techStackDetector);
  }
}
```

### 7.3 异步操作处理

```typescript
// 使用 async/await
async handleGenerateRules(args: any) {
  try {
    // 1. 并行执行多个异步操作
    const [files, config] = await Promise.all([
      this.projectAnalyzer.collectFiles(projectPath),
      this.configParser.parse(projectPath),
    ]);

    // 2. 串行执行依赖操作
    const techStack = await this.techStackDetector.detect(files);
    const rules = await this.rulesGenerator.generate(techStack);

    return { /* ... */ };
  } catch (error) {
    logger.error("生成规则失败", error);
    throw error;
  }
}
```

### 7.4 错误边界

```typescript
async handleGenerateRules(args: any) {
  try {
    // 业务逻辑
  } catch (error) {
    // 统一错误处理
    if (error instanceof ValidationError) {
      // 参数验证错误
      return createErrorResponse(error);
    } else if (error instanceof FileOperationError) {
      // 文件操作错误
      logger.error("文件操作失败", error);
      return createErrorResponse(error);
    } else {
      // 未知错误
      logger.error("未知错误", error);
      return createErrorResponse(new Error("操作失败，请稍后重试"));
    }
  }
}
```

---

## 第八章：打包与发布

### 8.1 编译 TypeScript

```bash
# 编译项目
npm run build

# 检查编译结果
ls -la dist/
# 应该看到 index.js 和相关文件
```

**编译输出结构**：
```
dist/
├── index.js              # 编译后的入口文件
├── index.d.ts            # TypeScript 声明文件
├── index.js.map          # 源码映射
└── modules/
    ├── analyzer.js
    └── ...
```

### 8.2 添加可执行权限

```bash
# Linux/macOS
chmod +x dist/index.js

# 或在 package.json 中配置
{
  "files": ["dist"]
}
```

### 8.3 测试编译后的代码

```bash
# 直接运行编译后的文件
node dist/index.js

# 应该看到启动信息（通过 stderr 输出）
```

### 8.4 发布到 npm（可选）

```bash
# 1. 登录 npm
npm login

# 2. 发布（首次发布）
npm publish

# 3. 更新版本并发布
npm version patch  # 或 minor, major
npm publish
```

**package.json 发布配置**：

```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "description": "我的 MCP Server",
  "main": "dist/index.js",
  "bin": {
    "my-mcp-server": "dist/index.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "keywords": [
    "mcp",
    "model-context-protocol",
    "cursor"
  ]
}
```

---

## 第九章：配置与使用

### 9.1 Cursor 配置

MCP Server 需要在 Cursor 的配置文件中注册。

**配置文件位置**：
- **macOS/Linux**: `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Windows**: `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

**配置内容**：

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "node",
      "args": [
        "/绝对路径/my-mcp-server/dist/index.js"
      ],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

**配置说明**：
- `command`：可执行命令（通常是 `node`）
- `args`：命令行参数（通常是编译后的 JS 文件路径）
- `disabled`：是否禁用
- `alwaysAllow`：总是允许的工具列表（可选）

### 9.2 环境变量配置

如果需要环境变量，可以在配置中添加：

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "MCP_SERVER_LOG_LEVEL": "DEBUG",
        "MY_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 9.3 测试配置

1. **完全重启 Cursor**（重要！）
   - macOS: `Cmd + Q` 退出，重新打开
   - Windows: `Alt + F4` 退出，重新打开

2. **检查 MCP Server 是否启动**
   - 在 Cursor 的 AI 聊天中询问："列出所有可用的工具"
   - 应该看到你的工具列表

3. **测试工具调用**
   ```
   请使用 hello_world 工具，参数：name: "开发者"
   ```

### 9.4 常见问题排查

**问题 1：MCP Server 未启动**

- ✅ 检查配置文件路径是否正确（使用绝对路径）
- ✅ 检查 `dist/index.js` 是否存在
- ✅ 手动运行测试：`node dist/index.js`
- ✅ 检查 Cursor 是否完全重启

**问题 2：工具调用失败**

- ✅ 查看 stderr 日志（错误信息）
- ✅ 检查参数格式是否正确
- ✅ 验证工具名称是否匹配

**问题 3：找不到工具**

- ✅ 检查 `ListToolsRequestSchema` 是否正确返回工具列表
- ✅ 确认工具名称拼写正确
- ✅ 重启 Cursor 后重试

---

## 第十章：最佳实践

### 10.1 代码组织

✅ **推荐**：
- 模块化设计，单一职责
- 统一错误处理
- 结构化日志
- TypeScript 类型定义

❌ **避免**：
- 将所有逻辑放在一个文件
- 使用 `console.log` 输出日志
- 忽略错误处理
- 使用 `any` 类型

### 10.2 性能优化

```typescript
// ✅ 使用并行处理
const [result1, result2] = await Promise.all([
  asyncOperation1(),
  asyncOperation2(),
]);

// ✅ 避免阻塞操作
async function processLargeData(data: string[]) {
  for (const item of data) {
    await processItem(item); // 可以优化为批量处理
  }
}
```

### 10.3 用户体验

```typescript
// ✅ 提供清晰的错误信息
return {
  content: [{
    type: "text",
    text: "❌ 错误：项目路径不存在\n\n" +
          "请检查路径是否正确：\n" +
          `- ${projectPath}\n\n` +
          "提示：路径必须是绝对路径"
  }]
};

// ✅ 提供进度反馈（如果操作耗时）
// 使用日志系统输出进度信息
logger.info("开始处理...", { step: 1, total: 5 });
logger.info("收集文件完成", { fileCount: 100 });
```

### 10.4 安全性

```typescript
// ✅ 验证用户输入
if (!projectPath || !path.isAbsolute(projectPath)) {
  throw new ValidationError("projectPath 必须是绝对路径");
}

// ✅ 限制文件访问范围
if (!projectPath.startsWith(allowedBasePath)) {
  throw new Error("不允许访问此路径");
}

// ✅ 处理敏感信息
logger.debug("处理项目", { path: sanitizePath(projectPath) });
```

### 10.5 可维护性

```typescript
// ✅ 添加清晰的注释
/**
 * 分析项目并生成规则
 * 
 * @param projectPath - 项目根目录的绝对路径
 * @param updateDescription - 是否自动更新描述文件
 * @returns 生成的规则文件列表
 */
async handleGenerateRules(
  projectPath: string,
  updateDescription: boolean = false
): Promise<string[]> {
  // ...
}

// ✅ 使用常量代替魔法数字/字符串
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const EXCLUDED_DIRS = ["node_modules", ".git", "dist"];
```

---

## 🎓 完整示例：Hello World MCP Server

让我们创建一个完整的示例项目：

### 项目结构

```
hello-mcp/
├── src/
│   ├── index.ts
│   └── utils/
│       ├── logger.ts
│       └── errors.ts
├── dist/
├── package.json
├── tsconfig.json
└── README.md
```

### src/index.ts

```typescript
#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./utils/logger.js";
import { createErrorResponse } from "./utils/errors.js";

class HelloMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "hello-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // 注册工具列表
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "greet",
            description: "向用户打招呼",
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "用户名称",
                },
                language: {
                  type: "string",
                  description: "语言（zh/en）",
                  enum: ["zh", "en"],
                  default: "zh",
                },
              },
              required: ["name"],
            },
          },
          {
            name: "calculate",
            description: "执行简单计算",
            inputSchema: {
              type: "object",
              properties: {
                expression: {
                  type: "string",
                  description: "数学表达式（如：2+3*4）",
                },
              },
              required: ["expression"],
            },
          },
        ],
      };
    });

    // 注册工具调用处理
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "greet":
            return await this.handleGreet(args);
          case "calculate":
            return await this.handleCalculate(args);
          default:
            throw new Error(`未知工具: ${name}`);
        }
      } catch (error) {
        logger.error("工具调用失败", error);
        return createErrorResponse(error);
      }
    });
  }

  private async handleGreet(args: any) {
    const name = args?.name as string;
    const language = (args?.language as string) || "zh";

    if (!name) {
      throw new Error("name 参数必需");
    }

    const greetings: Record<string, string> = {
      zh: `你好，${name}！👋`,
      en: `Hello, ${name}! 👋`,
    };

    return {
      content: [
        {
          type: "text",
          text: greetings[language] || greetings.zh,
        },
      ],
    };
  }

  private async handleCalculate(args: any) {
    const expression = args?.expression as string;

    if (!expression) {
      throw new Error("expression 参数必需");
    }

    try {
      // 注意：实际项目中应该使用更安全的表达式计算库
      const result = Function(`"use strict"; return (${expression})`)();
      
      return {
        content: [
          {
            type: "text",
            text: `计算结果：${expression} = ${result}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`表达式计算失败: ${expression}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info("Hello MCP Server 已启动");
  }
}

const server = new HelloMCPServer();
server.run().catch((error) => {
  logger.error("服务器启动失败", error);
  process.exit(1);
});
```

### 编译与运行

```bash
# 编译
npm run build

# 配置到 Cursor（使用绝对路径）
# 在 cline_mcp_settings.json 中添加：
{
  "mcpServers": {
    "hello-mcp": {
      "command": "node",
      "args": ["/path/to/hello-mcp/dist/index.js"],
      "disabled": false
    }
  }
}

# 重启 Cursor
# 测试：在 Cursor 中调用工具
```

---

## 📚 进阶主题

### 11.1 资源（Resources）

除了工具，MCP Server 还可以提供资源：

```typescript
this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "file:///path/to/file",
        name: "项目配置文件",
        description: "项目的配置文件",
        mimeType: "text/plain",
      },
    ],
  };
});
```

### 11.2 提示词（Prompts）

提供可重用的提示词模板：

```typescript
this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "code_review",
        description: "代码审查提示词",
        arguments: [
          {
            name: "code",
            description: "要审查的代码",
            required: true,
          },
        ],
      },
    ],
  };
});
```

### 11.3 流式响应

对于耗时操作，可以使用流式响应：

```typescript
// MCP SDK 支持流式响应
return {
  content: [
    {
      type: "text",
      text: "开始处理...\n",
    },
    {
      type: "text",
      text: "步骤 1/5 完成\n",
    },
    // ...
  ],
};
```

---

## 🎯 总结

通过本教程，你应该已经掌握了：

1. ✅ **MCP Server 基础概念**：什么是 MCP，如何工作
2. ✅ **开发环境搭建**：安装依赖，配置 TypeScript
3. ✅ **项目结构设计**：模块化组织代码
4. ✅ **工具注册与处理**：定义和实现工具
5. ✅ **错误处理与日志**：统一的错误处理和日志系统
6. ✅ **打包与发布**：编译、测试、发布
7. ✅ **配置与使用**：在 Cursor 中配置和使用
8. ✅ **最佳实践**：代码组织、性能、安全性

**下一步**：
- 🔍 深入研究 `cursor-rules-generator` 项目的具体实现
- 📚 阅读 [MCP 官方文档](https://modelcontextprotocol.io/)
- 🛠️ 开始开发你自己的 MCP Server

**祝开发愉快！** 🚀

---

## 📖 参考资料

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [MCP SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [Cursor Rules Generator 项目](https://github.com/ALvinCode/fe-cursor-rules-generator)

---

*本文档基于 `cursor-rules-generator` v1.3.6 编写*

