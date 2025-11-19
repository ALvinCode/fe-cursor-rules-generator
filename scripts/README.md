# 自动化测试脚本

## 使用方法

### 基本用法

```bash
# 使用命令行参数指定测试项目路径
npm run test:project /path/to/test-project

# 或使用环境变量
TEST_PROJECT_PATH=/path/to/test-project npm run test:project
```

### 功能说明

测试脚本会自动执行以下步骤：

1. **验证测试项目** - 检查项目路径是否存在且有效
2. **清除现有规则** - 如果 `.cursor/rules` 目录存在，会先清除
3. **清理未提交文件** - 如果项目是 git 仓库，会清理未跟踪的文件和重置已修改的文件
   - 使用 `git clean -fdx` 清理未跟踪的文件（包括 .gitignore 中的文件）
   - 使用 `git reset --hard HEAD` 重置所有已修改的文件
   - ⚠️ **注意**: 这会丢失所有未提交的更改，请确保在测试分支或副本上运行
4. **生成规则** - 使用当前版本的 cursor-rules-generator 重新生成规则
4. **测试分析器** - 测试所有新创建的分析器：
   - 文件类型识别器
   - 深度目录分析器
   - 文件依赖关系分析器
5. **测试代码生成** - 使用测试用例测试代码生成功能：
   - 需求解析
   - 文件位置决策
   - 文件拆分策略
6. **生成测试报告** - 在 `.cursor/test-report.json` 中保存测试结果

### 测试报告

测试脚本会生成三种格式的报告：

1. **Markdown 报告** (`.cursor/test-report.md`) - 可读性最好的文本格式
2. **HTML 报告** (`.cursor/test-report.html`) - 可视化报告，可在浏览器中打开
3. **JSON 报告** (`.cursor/test-report.json`) - 结构化数据，便于程序处理

#### 报告内容

**1. 项目结构分析**
- 📁 项目目录树 - 以树形结构展示整个项目
- 📋 文件夹职能说明 - 每个文件夹的用途、分类、文件数量、主要文件类型
- 📄 页面组织方式 - 分析页面是如何组织的（功能模块、Clean Architecture、MVC 等）

**2. 测试结果**
- ✅ 文件位置准确性 - 检查文件是否生成到了正确的位置
- 🎨 代码风格适配度 - 分析生成的代码与项目编码风格的适配度
  - 命名约定适配度
  - 文件结构适配度
  - 总体得分
- ✨ 最佳实践检查 - 检查使用了哪些最佳实践
  - Co-location 模式
  - 架构模式一致性
  - 文件拆分策略
  - 依赖管理

**3. 测试摘要**
- 规则生成状态和数量
- 各分析器的测试结果
- 代码生成测试结果
- 错误和警告列表

### 配置

可以通过修改 `scripts/test-config.json` 来配置测试行为：

```json
{
  "testProjectPath": "",
  "clearRulesBeforeTest": true,
  "generateRules": true,
  "testAnalyzers": true,
  "testCodeGeneration": true,
  "outputReport": true,
  "testCases": [
    "创建一个用户列表页面组件",
    "创建一个自定义 Hook 用于数据获取",
    ...
  ]
}
```

### 注意事项

- ⚠️ **重要**: 测试脚本会清理未提交的文件和重置所有更改
  - 会删除未跟踪的文件（`git clean -fdx`）
  - 会重置所有已修改的文件（`git reset --hard HEAD`）
  - **强烈建议在测试分支或项目副本上运行**
- 测试脚本会修改测试项目的 `.cursor/rules` 目录
- 如果不是 git 仓库，只会清理 `.cursor/rules` 目录
- 测试过程可能需要一些时间，取决于项目大小

### 配置选项

可以通过修改 `scripts/test-config.json` 或代码中的配置来控制清理行为：

- `clearRulesBeforeTest`: 是否清除现有规则（默认: true）
- `cleanUncommittedFiles`: 是否清理未提交的文件（默认: true）

