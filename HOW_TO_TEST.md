# 🚀 如何在其他项目中测试 v1.2.1

## ⚡ 超快速开始（3 分钟）

---

## 步骤 1：重启 Cursor（10 秒）

**重要**：确保使用最新编译的版本

```
Cmd + Q → 重新打开 Cursor
```

---

## 步骤 2：在实际项目中测试（2 分钟）

### 选项 A：使用您自己的项目（推荐）⭐

```bash
# 打开您的项目
cursor /Users/advance/Documents/aaclub_mboss
```

在 Cursor 的 **AI 聊天窗口**中：

```
请为当前项目生成 Cursor Rules
```

**预期结果**：
- ✅ 不再出现 "require is not defined" 错误
- ✅ 成功生成规则文件
- ✅ 输出详细的生成摘要

### 选项 B：使用测试项目

```bash
# 打开配置完整的测试项目
cursor ~/cursor-test-v1.2-rich
```

在 Cursor AI 中：

```
请为当前项目生成 Cursor Rules
```

---

## 步骤 3：验证结果（1 分钟）

### 3.1 检查文件是否生成

```bash
# 查看规则文件
ls -la /Users/advance/Documents/aaclub_mboss/.cursor/rules/

# 应该看到
00-global-rules.mdc
```

### 3.2 查看文件内容

```bash
cat /Users/advance/Documents/aaclub_mboss/.cursor/rules/00-global-rules.mdc
```

### 3.3 验证 v1.2 新功能

在规则文件中搜索以下关键词，验证新功能是否生效：

**1. 查找 "项目配置"**
```bash
grep -A 10 "项目配置" /Users/advance/Documents/aaclub_mboss/.cursor/rules/00-global-rules.mdc
```

**期望看到**：
- 如果项目有 .prettierrc → 显示配置详情
- 如果项目没有 → 显示分析出的代码风格

**2. 查找 "项目自定义工具"**
```bash
grep -A 20 "项目自定义工具" /Users/advance/Documents/aaclub_mboss/.cursor/rules/00-global-rules.mdc
```

**期望看到**：
- 识别出的自定义 Hooks（如果有）
- 识别出的工具函数（如果有）
- API 客户端（如果有）

**3. 查找 "路径别名"**
```bash
grep -A 10 "路径别名" /Users/advance/Documents/aaclub_mboss/.cursor/rules/00-global-rules.mdc
```

**期望看到**：
- 从 tsconfig.json 提取的路径别名
- 使用示例

**4. 查找 "项目当前实践"**
```bash
grep -A 5 "项目当前实践" /Users/advance/Documents/aaclub_mboss/.cursor/rules/00-global-rules.mdc
```

**期望看到**：
- 错误处理的实际使用情况
- 三段式结构（当前实践 + 短期建议 + 长期建议）

---

## 🔍 验证 MobX 项目的特殊功能

由于您的项目使用 **MobX**，规则应该包含：

### 查找 "MobX" 或 "状态管理"

```bash
grep -A 10 -i "mobx\|状态管理" /Users/advance/Documents/aaclub_mboss/.cursor/rules/00-global-rules.mdc
```

**期望看到**：
- MobX 的使用说明
- Store 的组织方式
- @observable、@action 等装饰器使用

### 查找 "Ant Design"

```bash
grep -A 5 -i "ant" /Users/advance/Documents/aaclub_mboss/.cursor/rules/00-global-rules.mdc
```

**期望看到**：
- Ant Design 组件使用规范
- 主题配置（如果有）

---

## 📊 成功验证清单

使用此清单确保 v1.2.1 工作正常：

### 核心功能
- [ ] ✅ 不再出现 "require is not defined" 错误
- [ ] ✅ 规则文件成功生成
- [ ] ✅ 文件位于 `.cursor/rules/00-global-rules.mdc`
- [ ] ✅ 文件内容完整（不是空文件或错误信息）

### v1.2 新功能
- [ ] ✅ 读取了项目配置（如果有 .prettierrc）
- [ ] ✅ 提取了路径别名（如果有 tsconfig paths）
- [ ] ✅ 识别了自定义工具（如果有 use*.ts 或 utils/）
- [ ] ✅ 展示了文件组织结构
- [ ] ✅ 使用了三段式规则结构
- [ ] ✅ 测试部分按需生成（有测试→详细，无测试→简短）

### 技术栈特定
- [ ] ✅ 识别了 MobX（在技术栈中）
- [ ] ✅ 识别了 Ant Design（在 UI 库中）
- [ ] ✅ 识别了 Vite（如果使用）

---

## 🎯 在 Cursor AI 中测试规则效果

生成规则后，在 AI 聊天中测试：

### 测试 1：配置识别
```
请告诉我项目的代码风格配置
```

**应该回答**：
- 基于 .prettierrc 的配置
- 或基于代码分析的风格

### 测试 2：自定义工具
```
项目有哪些自定义工具？应该如何使用？
```

**应该回答**：
- 列出识别的 Hooks 和工具函数
- 告诉你位置和使用方式

### 测试 3：文件组织
```
如果我要新建一个组件，应该放在哪里？
```

**应该回答**：
- 基于项目实际结构的建议
- 使用路径别名的导入方式

### 测试 4：MobX 使用
```
项目使用 MobX 进行状态管理，有什么规范？
```

**应该回答**：
- MobX Store 的组织方式
- 装饰器或 makeObservable 使用
- 状态更新最佳实践

---

## 🐛 如果还有问题

### 问题排查步骤

1. **确认已重启 Cursor**
   ```
   完全退出（Cmd + Q）→ 重新打开
   ```

2. **确认编译成功**
   ```bash
   cd /Users/advance/Documents/cursor-rules-generator
   npm run build
   # 应该无错误
   ```

3. **查看错误日志**
   - 在 Cursor 中查看 MCP Server 日志
   - 或者在终端手动运行看错误：
     ```bash
     node /Users/advance/Documents/cursor-rules-generator/dist/index.js
     ```

4. **重新配置 MCP**
   - 确认配置文件路径正确
   - 确认 dist/index.js 存在

### 如果还是报错

请提供：
1. 完整的错误信息
2. 项目的 package.json（脱敏）
3. 生成规则时的输出

---

## ✅ 测试成功的标志

当您看到以下内容时，说明 v1.2.1 工作正常：

1. ✅ 成功生成规则，无错误
2. ✅ 规则文件包含 `version: 1.2.1`
3. ✅ 规则内容完整且准确
4. ✅ 包含项目实际配置（如有）
5. ✅ 包含项目自定义工具（如有）
6. ✅ 包含项目文件组织结构
7. ✅ Cursor AI 能基于规则回答问题

---

## 🎉 现在开始测试吧！

```bash
# 1. 重启 Cursor
Cmd + Q → 重新打开

# 2. 打开项目
cursor /Users/advance/Documents/aaclub_mboss

# 3. 生成规则
"请为当前项目生成 Cursor Rules"

# 4. 查看结果
cat .cursor/rules/00-global-rules.mdc
```

**祝测试顺利！v1.2.1 应该可以完美运行了！** 🚀✨

