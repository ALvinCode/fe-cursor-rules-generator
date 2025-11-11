# 当前建议分类方式说明

## 📋 分类方式

### 1. 按类型分类（Type Classification）

建议按以下类型进行分类：

- **code-style** - 代码风格
- **architecture** - 架构设计
- **error-handling** - 错误处理
- **performance** - 性能优化
- **security** - 安全性
- **testing** - 测试
- **component** - 组件开发
- **routing** - 路由管理
- **state-management** - 状态管理
- **general** - 通用建议

### 2. 按优先级分类（Priority Classification）

建议按以下优先级进行分类：

- **high** - 🔴 高优先级
- **medium** - 🟡 中优先级
- **low** - 🟢 低优先级

### 3. 按影响范围分类（Impact Classification）

建议按以下影响范围进行分类：

- **global** - 全局影响
- **module** - 模块影响
- **file** - 文件影响

## 🎯 当前实现

在 `SuggestionCollector` 类中：

1. **按类型分组**：`getByType()` 方法返回按类型分组的建议
2. **按优先级分组**：`getByPriority()` 方法返回按优先级分组的建议
3. **格式化输出**：`formatForOutput()` 方法按类型分组显示，每个类型内按优先级排序

## 📊 输出格式

建议输出格式：

```markdown
## 📋 建议列表

> ⚠️ **重要**: 以下建议需要您确认是否采纳。采纳后可以重新生成规则以包含这些建议。

### 代码风格

#### [建议标题]

**优先级**: 🔴 高
**影响范围**: 全局
**原因**: [原因说明]

[建议内容]

---
```

## 🔄 分类流程

1. **收集阶段**：在规则生成过程中，所有建议被收集到 `SuggestionCollector`
2. **分类阶段**：建议自动按类型、优先级、影响范围分类
3. **输出阶段**：在生成完成后，按类型分组显示，每个类型内按优先级排序

## 📝 类型名称映射

在 `formatForOutput()` 方法中，类型名称会被映射为中文：

- `code-style` → `代码风格`
- `architecture` → `架构设计`
- `error-handling` → `错误处理`
- `performance` → `性能优化`
- `security` → `安全性`
- `testing` → `测试`
- `component` → `组件开发`
- `routing` → `路由管理`
- `state-management` → `状态管理`
- `general` → `通用建议`

