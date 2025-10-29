# 测试指南

本文档说明如何测试 Cursor Rules Generator MCP Server 的完整流程。

## 前置条件

1. **编译项目**
   ```bash
   npm run build
   ```

2. **配置到 Cursor**
   
   编辑 Cursor 的 MCP 配置文件：
   - macOS: `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   - Windows: `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

   添加配置：
   ```json
   {
     "mcpServers": {
       "cursor-rules-generator": {
         "command": "node",
         "args": ["/Users/advance/Documents/cursor-rules-generator/dist/index.js"],
         "disabled": false,
         "alwaysAllow": []
       }
     }
   }
   ```

3. **重启 Cursor**

## 测试流程

### 测试 1: 分析项目

**目标**：验证项目分析功能是否正常工作

**步骤**：
1. 在 Cursor 中打开任意项目
2. 在 AI 聊天中输入：
   ```
   请使用 analyze_project 分析当前项目
   ```
3. 检查返回的 JSON 数据是否包含：
   - `files`: 文件统计信息
   - `techStack`: 技术栈信息
   - `modules`: 模块列表
   - `codeFeatures`: 代码特征

**预期结果**：
```json
{
  "files": {
    "total": 123,
    "byType": {
      "ts": 45,
      "tsx": 30,
      "json": 5,
      ...
    }
  },
  "techStack": {
    "primary": ["React", "TypeScript", "Next.js"],
    "languages": ["TypeScript", "JavaScript"],
    "packageManagers": ["npm"],
    "frameworks": ["Next.js"]
  },
  "modules": [...],
  "codeFeatures": {...}
}
```

### 测试 2: 一致性检查

**目标**：验证一致性检查功能

**步骤**：
1. 在 Cursor 中打开一个有 README 的项目
2. 输入：
   ```
   请检查项目描述与代码的一致性
   ```
3. 查看返回的报告

**预期结果**：
```json
{
  "hasInconsistencies": true/false,
  "inconsistencies": [
    {
      "type": "missing-doc",
      "description": "README 中未提及主要技术栈: TypeScript",
      "actualValue": "TypeScript",
      "severity": "medium",
      "suggestedFix": "在 README 的技术栈部分添加 TypeScript"
    }
  ],
  "checkedFiles": ["README.md", "package.json"]
}
```

### 测试 3: 生成 Cursor Rules

**目标**：验证完整的规则生成流程

**步骤**：
1. 准备一个测试项目（或使用现有项目）
2. 在 Cursor 中输入：
   ```
   请为当前项目生成 Cursor Rules
   ```
3. 等待处理完成
4. 检查生成的文件

**预期结果**：
- 控制台输出包含成功信息
- 项目中生成了 `.cursor/rules/` 目录
- 目录中包含至少一个 `.mdc` 文件（如 `00-global-rules.mdc`）
- 文件内容格式正确，包含前置元数据和 Markdown 内容

**验证生成的文件**：
```bash
# 检查文件是否存在
ls -la .cursor/rules/

# 查看文件内容
cat .cursor/rules/00-global-rules.mdc
```

文件应该包含：
```markdown
---
title: 项目名 - 全局开发规则
description: ...
priority: 100
---

# 项目概述
...
```

### 测试 4: 更新项目描述

**目标**：验证描述文件更新功能

**步骤**：
1. 先运行一致性检查，确保有不一致项
2. 输入：
   ```
   请根据实际代码更新项目描述
   ```
3. 检查 README.md 是否被更新

**预期结果**：
- README.md 文件被修改
- 文件中添加了更新说明部分
- 更新内容反映了实际的项目情况

### 测试 5: 多模块项目

**目标**：验证多模块项目的规则生成

**前提**：使用一个 monorepo 或包含多个模块的项目

**步骤**：
1. 打开多模块项目
2. 生成规则
3. 检查生成的模块特定规则文件

**预期结果**：
- 生成了全局规则文件
- 为每个模块生成了独立的规则文件
- 模块规则文件命名正确（如 `frontend-rules.mdc`, `backend-rules.mdc`）

### 测试 6: 不同技术栈

**目标**：验证对不同技术栈的支持

**测试项目类型**：
- [ ] React + TypeScript 项目
- [ ] Vue 3 项目
- [ ] Next.js 项目
- [ ] Python Django 项目
- [ ] Python Flask 项目
- [ ] Node.js Express 项目
- [ ] Go 项目

**验证点**：
- 正确识别技术栈
- 生成针对该技术栈的最佳实践
- 规则内容准确且有帮助

## 错误场景测试

### 测试 7: 无效路径

**步骤**：
```
请为 /invalid/path/that/does/not/exist 生成规则
```

**预期结果**：
- 返回友好的错误信息
- 不会崩溃

### 测试 8: 空项目

**步骤**：
1. 创建一个空目录
2. 尝试为该目录生成规则

**预期结果**：
- 能够处理空项目
- 生成基础的规则文件
- 提示项目中没有检测到特定技术栈

### 测试 9: 无权限目录

**步骤**：
1. 尝试为系统目录生成规则（如 `/usr`）

**预期结果**：
- 返回权限错误信息
- 不会崩溃

## 性能测试

### 测试 10: 大型项目

**目标**：验证处理大型项目的性能

**步骤**：
1. 使用一个大型开源项目（如 1000+ 文件）
2. 测量生成规则的时间

**预期结果**：
- 在合理时间内完成（< 30 秒）
- 内存使用合理
- 不会崩溃

## 集成测试

### 测试 11: Context7 集成（可选）

**前提**：已配置 Context7 MCP Server

**步骤**：
1. 确保 Context7 正常运行
2. 生成规则
3. 检查是否使用了 Context7 的文档

**预期结果**：
- 如果 Context7 可用，使用其提供的文档
- 如果不可用，回退到默认最佳实践
- 不会因 Context7 不可用而失败

## 验证清单

使用以下清单确保所有功能正常：

- [ ] ✅ 项目文件扫描正常
- [ ] ✅ 技术栈检测准确
- [ ] ✅ 多模块识别正确
- [ ] ✅ 代码特征分析有效
- [ ] ✅ 一致性检查工作正常
- [ ] ✅ 规则文件生成成功
- [ ] ✅ .mdc 文件格式正确
- [ ] ✅ 规则内容有意义
- [ ] ✅ 错误处理优雅
- [ ] ✅ 性能可接受

## 已知问题

记录测试中发现的问题：

1. **问题**: ...
   - **影响**: ...
   - **解决方案**: ...

2. **问题**: ...
   - **影响**: ...
   - **解决方案**: ...

## 测试报告模板

```markdown
## 测试日期：2025-10-29

### 环境
- Cursor 版本: ...
- Node.js 版本: ...
- 操作系统: ...

### 测试结果
- [ ] 测试 1: 分析项目 - ✅ 通过 / ❌ 失败
- [ ] 测试 2: 一致性检查 - ✅ 通过 / ❌ 失败
- [ ] 测试 3: 生成规则 - ✅ 通过 / ❌ 失败
- [ ] 测试 4: 更新描述 - ✅ 通过 / ❌ 失败
- [ ] 测试 5: 多模块项目 - ✅ 通过 / ❌ 失败
- [ ] 测试 6: 不同技术栈 - ✅ 通过 / ❌ 失败
- [ ] 测试 7-9: 错误场景 - ✅ 通过 / ❌ 失败
- [ ] 测试 10: 性能测试 - ✅ 通过 / ❌ 失败

### 发现的问题
1. ...
2. ...

### 建议改进
1. ...
2. ...
```

## 自动化测试（未来）

未来可以考虑添加：

```bash
# 单元测试
npm test

# 集成测试
npm run test:integration

# E2E 测试
npm run test:e2e
```

目前需要手动测试，因为涉及 MCP 协议和 Cursor 集成。

