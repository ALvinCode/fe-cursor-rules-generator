# 🚀 快速开始指南

## 3 分钟上手 Cursor Rules Generator

---

## 📋 前置要求

- Node.js 18+ 
- Cursor AI 编辑器
- 基本的命令行使用经验

---

## 🎯 安装步骤

### 步骤 1：获取代码

```bash
# 克隆仓库
git clone https://github.com/yourusername/cursor-rules-generator.git
cd cursor-rules-generator

# 安装依赖
npm install

# 编译项目
npm run build
```

### 步骤 2：配置到 Cursor

找到 Cursor 的 MCP 配置文件：

**macOS/Linux**:
```
~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

**Windows**:
```
%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
```

添加配置：

```json
{
  "mcpServers": {
    "cursor-rules-generator": {
      "command": "node",
      "args": ["/绝对路径/cursor-rules-generator/dist/index.js"],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

**重要**：将路径替换为实际的绝对路径。

### 步骤 3：重启 Cursor

完全退出并重新打开 Cursor：

**macOS**: `Cmd + Q` → 重新打开  
**Windows**: `Alt + F4` → 重新打开

---

## 🎮 使用方式

### 首次使用（推荐）

**1. 预览生成过程**

在 Cursor AI 聊天窗口中：

```
请预览规则生成
```

**输出示例**：
```
📋 Cursor Rules 生成预览

## 📊 分析任务清单
✅ [1/11] 收集文件 - 234 个
✅ [2/11] 检测技术栈 - React, TypeScript
...

## ⚠️ 需要确认的决策（如有）
[列出所有需要确认的问题]

## 📁 将要生成的文件
[文件列表和预估行数]
```

**2. 确认决策**（如果有需要确认的）

根据预览输出，确认决策：
```
路由使用选项 A
```

**3. 正式生成规则**

```
请生成规则
```

查看生成的文件：
```bash
ls .cursor/
cat .cursor/instructions.md
ls .cursor/rules/
```

### 快速使用

直接生成，使用默认值：

```
请生成规则
```

如果有不确定的决策，会在输出中提示确认。

---

## 📁 生成的文件

### 文件结构

```
your-project/
└── .cursor/
    ├── instructions.md          # 工作流指导（必读）
    └── rules/
        ├── global-rules.mdc     # 项目概述
        ├── code-style.mdc       # 代码风格
        ├── architecture.mdc     # 文件组织
        ├── custom-tools.mdc     # 自定义工具（按需）
        ├── frontend-routing.mdc # 前端路由（按需）
        └── ...
```

### 文件说明

**instructions.md**：
- 开始任务前的检查清单
- 标准开发流程
- 常见任务模板
- Cursor 对话最佳实践

**规则文件**：
- 每个文件 < 500 行
- 专注单一主题
- 包含实际代码引用
- 基于项目实际情况

---

## 🎯 使用生成的规则

### 1. 阅读工作流指导

```bash
cat .cursor/instructions.md
```

了解：
- 开始任务前要做什么
- 如何与 Cursor 对话
- 常见任务的标准流程

### 2. 开发新功能

**标准流程**：

```
步骤 1: 让 Cursor 确认理解
"请确认你理解了以下任务：[描述]
 需要创建哪些文件？
 需要使用哪些项目工具？"

步骤 2: Cursor 参考规则
→ global-rules.mdc（了解项目）
→ custom-tools.mdc（查看可用工具）
→ architecture.mdc（确定文件位置）

步骤 3: 生成代码
→ 使用项目工具
→ 遵循项目规范
→ 放在正确位置

步骤 4: 格式化
Cursor: "需要我运行格式化命令吗？"
→ npm run format && npm run lint:fix
```

### 3. 验证规则质量

```
请验证规则文件
```

确保所有规则文件格式正确。

---

## ⚡ 常见问题

### Q: 生成的规则文件在哪里？

A: `.cursor/rules/` 目录，Cursor 会自动加载。

### Q: 如何更新规则？

A: 重新运行 `generate_cursor_rules`，会覆盖旧规则。

### Q: 规则太多了，如何管理？

A: 每个规则文件专注一个主题，按需查看：
- 代码风格 → code-style.mdc
- 自定义工具 → custom-tools.mdc
- 路由规范 → frontend-routing.mdc

### Q: Cursor 不遵循规则怎么办？

A: 
1. 确保已重启 Cursor
2. 检查规则文件是否存在
3. 在提示中明确引用规则：
   ```
   请遵循 @.cursor/rules/code-style.mdc
   ```

---

## 📚 更多文档

- **测试指南**：`docs/guides/TESTING_GUIDE.md`
- **架构设计**：`docs/architecture/ARCHITECTURE.md`
- **项目故事**：`PROJECT_STORY.md`
- **更新日志**：`CHANGELOG.md`

---

## 🆘 获取帮助

- 查看文档：`docs/guides/`
- 查看示例：`docs/architecture/HIERARCHY_EXAMPLE.md`
- 提交 Issue：GitHub Issues

---

**祝使用愉快！** 🎉

