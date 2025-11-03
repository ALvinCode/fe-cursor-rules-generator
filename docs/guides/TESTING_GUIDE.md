# 🧪 测试指南：在其他项目中使用 Cursor Rules Generator

## 📋 前置准备

### 1. 确保项目已编译

```bash
cd /path/to/cursor-rules-generator
npm install
npm run build
```

检查是否生成了 `dist/` 目录：
```bash
ls -la dist/
# 应该看到 index.js 等文件
```

### 2. 记录项目路径

```bash
# 获取项目绝对路径
pwd
# 输出: /path/to/cursor-rules-generator
```

---

## ⚙️ 配置 Cursor

### 步骤 1: 找到配置文件

**macOS/Linux**:
```bash
open ~/Library/Application\ Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/
```

**Windows**:
```
打开：%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\
```

### 步骤 2: 编辑 `cline_mcp_settings.json`

如果文件不存在，创建它。添加以下配置：

```json
{
  "mcpServers": {
    "cursor-rules-generator": {
      "command": "node",
      "args": [
        "/Users/advance/Documents/cursor-rules-generator/dist/index.js"
      ],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

**重要**：
- 将路径 `/Users/advance/Documents/cursor-rules-generator` 替换为您的实际项目路径
- 使用绝对路径，不要使用 `~` 或相对路径
- Windows 路径示例：`C:\\Users\\YourName\\Documents\\cursor-rules-generator\\dist\\index.js`

### 步骤 3: 重启 Cursor

**完全退出并重新打开 Cursor**，不要只是关闭窗口。

**macOS**:
```
Cmd + Q → 重新打开 Cursor
```

**Windows**:
```
Alt + F4 → 重新打开 Cursor
```

---

## 🎯 测试场景

### 测试 1: 简单的单体项目

#### 准备测试项目

创建一个简单的 React 项目：

```bash
# 创建测试目录
mkdir -p ~/test-projects/simple-react-app
cd ~/test-projects/simple-react-app

# 初始化项目
npm init -y
npm install react react-dom typescript

# 创建基本文件结构
mkdir -p src/components
echo 'import React from "react";' > src/App.tsx
echo 'export const Button = () => <button>Click</button>;' > src/components/Button.tsx
```

#### 在 Cursor 中打开项目

```bash
cursor ~/test-projects/simple-react-app
```

#### 执行测试

在 Cursor 的 AI 聊天窗口中输入：

```
请为当前项目生成 Cursor Rules
```

或者明确指定路径：

```
请使用 generate_cursor_rules 工具，参数如下：
- projectPath: /Users/advance/test-projects/simple-react-app
```

#### 预期结果

✅ **成功输出**：
```
✅ Cursor Rules 生成成功！

📁 生成的文件：
  - .cursor/rules/00-global-rules.mdc

📊 项目分析结果：
  - 主要技术栈: React, TypeScript
  - 检测到的模块: 1 个
  - 代码特征: X 项

📝 规则摘要：
生成了 1 个规则文件：

**全局规则（项目根目录）：**
  - .cursor/rules/00-global-rules.mdc
```

#### 验证生成的文件

```bash
# 检查文件是否存在
ls -la ~/test-projects/simple-react-app/.cursor/rules/

# 查看文件内容
cat ~/test-projects/simple-react-app/.cursor/rules/00-global-rules.mdc
```

应该看到：
- 包含 `---` 前置元数据
- 包含项目概述
- 包含 React 和 TypeScript 的最佳实践
- 格式为 Markdown

---

### 测试 2: 多模块项目（前后端分离）

#### 准备测试项目

```bash
# 创建多模块项目
mkdir -p ~/test-projects/fullstack-app
cd ~/test-projects/fullstack-app

# 创建根 package.json（workspace）
cat > package.json << 'EOF'
{
  "name": "fullstack-app",
  "private": true,
  "workspaces": [
    "frontend",
    "backend"
  ]
}
EOF

# 创建前端模块
mkdir -p frontend/src/components
cd frontend
npm init -y
npm install react next
echo 'import React from "react";' > src/App.tsx
cd ..

# 创建后端模块
mkdir -p backend/src/routes
cd backend
npm init -y
npm install express
echo 'import express from "express";' > src/server.ts
cd ..

# 回到根目录
cd ~/test-projects/fullstack-app
```

#### 在 Cursor 中测试

```bash
cursor ~/test-projects/fullstack-app
```

在 AI 聊天中输入：

```
请为当前项目生成 Cursor Rules
```

#### 预期结果

✅ **成功输出（层级规则）**：
```
✅ Cursor Rules 生成成功！

📁 生成的文件：
  - .cursor/rules/00-global-rules.mdc
  - frontend/.cursor/rules/frontend-rules.mdc
  - backend/.cursor/rules/backend-rules.mdc

📝 规则摘要：
生成了 3 个规则文件：

**全局规则（项目根目录）：**
  - .cursor/rules/00-global-rules.mdc

**模块规则（按模块目录）：**
  - frontend/.cursor/rules/frontend-rules.mdc (frontend)
  - backend/.cursor/rules/backend-rules.mdc (backend)

💡 提示：
  - 全局规则会在项目任何位置生效
  - 模块规则只在对应模块目录中生效
  - Cursor 会根据当前打开的文件位置自动加载相应规则
```

#### 验证层级结构

```bash
# 检查全局规则
ls -la .cursor/rules/

# 检查前端规则
ls -la frontend/.cursor/rules/

# 检查后端规则
ls -la backend/.cursor/rules/

# 查看前端规则内容
cat frontend/.cursor/rules/frontend-rules.mdc

# 查看后端规则内容
cat backend/.cursor/rules/backend-rules.mdc
```

#### 测试规则加载

1. **在前端文件中工作**：
   ```bash
   # 在 Cursor 中打开
   frontend/src/components/Button.tsx
   ```
   
   然后在 Cursor AI 中询问：
   ```
   请告诉我当前项目的开发规范
   ```
   
   应该看到：
   - ✅ React 组件开发规范
   - ✅ TypeScript 使用规范
   - ❌ 不应提到 Express 或后端相关内容

2. **在后端文件中工作**：
   ```bash
   # 在 Cursor 中打开
   backend/src/server.ts
   ```
   
   然后询问：
   ```
   请告诉我当前项目的开发规范
   ```
   
   应该看到：
   - ✅ Express API 开发规范
   - ✅ TypeScript 使用规范
   - ❌ 不应提到 React 或前端相关内容

---

### 测试 3: 其他工具功能

#### 3.1 分析项目（不生成规则）

```
请使用 analyze_project 分析当前项目
```

预期输出：JSON 格式的项目分析报告，包含：
- 文件统计
- 技术栈信息
- 模块列表
- 代码特征

#### 3.2 一致性检查

确保项目有 README.md：
```bash
echo "# Test Project" > README.md
```

然后测试：
```
请检查项目描述与代码的一致性
```

预期输出：一致性检查报告

#### 3.3 更新项目描述

```
请根据实际代码更新 README
```

预期：README.md 被更新

---

## 🐛 故障排查

### 问题 1: MCP Server 未启动

**症状**：
- Cursor 中看不到 MCP Server 相关提示
- 工具调用失败

**解决方案**：

1. **检查配置文件路径是否正确**：
   ```bash
   cat ~/Library/Application\ Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
   ```

2. **检查 dist/index.js 是否存在**：
   ```bash
   ls -la /Users/advance/Documents/cursor-rules-generator/dist/index.js
   ```
   
   如果不存在，重新编译：
   ```bash
   cd /Users/advance/Documents/cursor-rules-generator
   npm run build
   ```

3. **手动测试 MCP Server**：
   ```bash
   node /Users/advance/Documents/cursor-rules-generator/dist/index.js
   ```
   
   应该看到：
   ```
   Cursor Rules Generator MCP Server 已启动
   ```

4. **查看 Cursor 日志**（如果有的话）

5. **完全重启 Cursor**（不是重新加载窗口）

### 问题 2: 找不到工具

**症状**：
```
工具 generate_cursor_rules 不可用
```

**解决方案**：

1. 在 Cursor AI 中询问：
   ```
   请列出所有可用的 MCP 工具
   ```

2. 如果看不到 `cursor-rules-generator` 相关工具，检查：
   - 配置文件中的 `disabled` 是否为 `false`
   - 路径是否正确
   - 是否重启了 Cursor

### 问题 3: 权限错误

**症状**：
```
Error: EACCES: permission denied
```

**解决方案**：

1. **给予执行权限**：
   ```bash
   chmod +x /Users/advance/Documents/cursor-rules-generator/dist/index.js
   ```

2. **检查目录权限**：
   ```bash
   ls -la /Users/advance/Documents/cursor-rules-generator/
   ```

### 问题 4: 生成的规则文件为空或格式错误

**检查**：

1. 查看文件内容：
   ```bash
   cat .cursor/rules/00-global-rules.mdc
   ```

2. 检查是否有前置元数据：
   ```markdown
   ---
   title: ...
   description: ...
   priority: ...
   ---
   ```

3. 如果格式错误，重新生成：
   ```
   请重新为项目生成 Cursor Rules
   ```

### 问题 5: 模块规则未生成

**可能原因**：
- 项目被识别为单体项目
- `includeModuleRules` 被设置为 false

**解决方案**：

1. 先分析项目：
   ```
   请分析当前项目的模块结构
   ```

2. 如果项目确实是多模块但未识别，检查：
   - 是否有 package.json 在子目录
   - 目录命名是否符合约定（frontend, backend 等）
   - 是否有 monorepo 配置文件

3. 强制生成模块规则：
   ```
   请使用以下参数生成规则：
   - 项目路径：当前项目
   - 包含模块规则：是
   ```

---

## 📊 测试检查清单

使用此清单确保所有功能正常：

- [ ] ✅ MCP Server 成功启动
- [ ] ✅ 在 Cursor 中看到可用工具
- [ ] ✅ 单体项目生成 1 个全局规则
- [ ] ✅ 多模块项目生成全局 + 模块规则
- [ ] ✅ 规则文件格式正确（有前置元数据）
- [ ] ✅ 规则内容包含项目特征
- [ ] ✅ 技术栈识别准确
- [ ] ✅ analyze_project 工具正常
- [ ] ✅ check_consistency 工具正常
- [ ] ✅ update_project_description 工具正常
- [ ] ✅ 在前端目录只加载前端规则
- [ ] ✅ 在后端目录只加载后端规则

---

## 🎓 高级测试

### 测试不同技术栈

1. **Python 项目**：
   ```bash
   mkdir -p ~/test-projects/python-app
   cd ~/test-projects/python-app
   
   cat > requirements.txt << 'EOF'
   django==4.2.0
   djangorestframework==3.14.0
   EOF
   
   mkdir -p app/views
   echo 'from django.http import HttpResponse' > app/views.py
   ```

2. **Vue 项目**：
   ```bash
   mkdir -p ~/test-projects/vue-app
   cd ~/test-projects/vue-app
   npm init -y
   npm install vue@next
   mkdir -p src/components
   echo '<template><div>Hello</div></template>' > src/components/Hello.vue
   ```

3. **Go 项目**：
   ```bash
   mkdir -p ~/test-projects/go-app
   cd ~/test-projects/go-app
   go mod init example.com/app
   echo 'package main' > main.go
   ```

### 测试 Monorepo

```bash
# 创建 pnpm workspace
mkdir -p ~/test-projects/monorepo
cd ~/test-projects/monorepo

cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
EOF

mkdir -p packages/ui-lib
mkdir -p packages/web-app
mkdir -p packages/mobile-app

# 在每个包中创建 package.json
# ...
```

---

## 📝 测试报告模板

```markdown
## 测试日期：2025-10-29

### 测试环境
- Cursor 版本: [填写]
- Node.js 版本: [填写]
- 操作系统: macOS/Windows/Linux

### 测试项目
1. 简单 React 项目：✅ 通过 / ❌ 失败
   - 规则文件生成：
   - 技术栈识别：
   - 规则内容质量：

2. 前后端分离项目：✅ 通过 / ❌ 失败
   - 层级规则生成：
   - 前端规则准确性：
   - 后端规则准确性：
   - 规则加载正确性：

3. 其他工具：✅ 通过 / ❌ 失败
   - analyze_project：
   - check_consistency：
   - update_project_description：

### 发现的问题
1. [问题描述]
   - 复现步骤：
   - 预期结果：
   - 实际结果：
   - 严重程度：

### 建议改进
1. [改进建议]
```

---

## 🎉 成功标志

当您看到以下内容时，说明测试成功：

1. ✅ Cursor 可以调用 MCP 工具
2. ✅ 生成的规则文件格式正确
3. ✅ 技术栈识别准确
4. ✅ 多模块项目规则分层正确
5. ✅ 规则内容包含有用的最佳实践
6. ✅ Cursor 在不同目录加载不同规则

---

## 📞 获取帮助

如果遇到问题：

1. 查看 [GETTING_STARTED.md](./GETTING_STARTED.md) 中的快速开始指南
2. 查看 [../architecture/ARCHITECTURE.md](../architecture/ARCHITECTURE.md) 了解工作原理
3. 查看 [../architecture/HIERARCHY_EXAMPLE.md](../architecture/HIERARCHY_EXAMPLE.md) 查看示例
4. 创建 [GitHub Issue](https://github.com/ALvinCode/fe-cursor-rules-generator/issues) 报告问题

祝测试顺利！🚀

