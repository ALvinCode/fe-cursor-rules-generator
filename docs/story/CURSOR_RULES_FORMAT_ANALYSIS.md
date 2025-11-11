# Cursor Rules 格式分析与优化计划

> 基于 awesome-cursorrules 项目的最佳实践，优化当前项目的规则生成格式

---

## 📋 任务列表

### ✅ 已完成
1. ✅ 分析当前项目的规则生成格式
2. ✅ 了解 awesome-cursorrules 项目结构
3. ✅ 提取 30 个前端框架规则文件

### 🔄 进行中
1. 🔄 分析 awesome-cursorrules 项目中的前端框架规则格式

### ⏳ 待执行
1. ⏳ 分析这些规则的格式、结构和最佳实践模式
2. ⏳ 对比当前项目的规则生成格式
3. ⏳ 总结统一的规则书写格式规范
4. ⏳ 优化当前项目的规则生成器，应用最佳实践

---

## 🔍 当前项目规则格式分析

### 当前格式特点

#### 1. 元数据格式（Frontmatter）

```yaml
---
title: 项目名称 - 全局规则
description: 项目级通用规范和开发原则
priority: 100
version: 1.3.0
generatedAt: 2025-01-XX
techStack: ["React", "TypeScript"]
generator: cursor-rules-generator
tags: ["global", "overview"]
type: overview
depends: []
---
```

#### 2. 内容结构

- 使用 Markdown 格式
- 使用 `@filename.mdc` 引用其他规则文件
- 使用 `##` 二级标题组织内容
- 使用列表和代码块展示示例

#### 3. 规则文件组织

- 多个专注的规则文件（每个 < 500 行）
- 使用 `depends` 字段声明依赖关系
- 使用 `priority` 控制加载顺序

---

## 📚 awesome-cursorrules 项目分析

### 已提取的规则文件（30 个）

**React 相关**：
- react-components-creation-cursorrules-prompt-file
- react-chakra-ui-cursorrules-prompt-file
- cursor-ai-react-typescript-shadcn-ui-cursorrules-p

**Next.js 相关**：
- nextjs-typescript-cursorrules-prompt-file
- nextjs-react-typescript-cursorrules-prompt-file
- nextjs-react-tailwind-cursorrules-prompt-file
- nextjs-app-router-cursorrules-prompt-file
- nextjs-supabase-shadcn-pwa-cursorrules-prompt-file
- nextjs-vercel-typescript-cursorrules-prompt-file
- nextjs15-react19-vercelai-tailwind-cursorrules-prompt-file
- 等 10+ 个 Next.js 变体

**Vue 相关**：
- vue3-composition-api-cursorrules-prompt-file（待提取）

**Angular 相关**：
- angular-typescript-cursorrules-prompt-file
- angular-novo-elements-cursorrules-prompt-file

**TypeScript 相关**：
- typescript-react-cursorrules-prompt-file（待提取）
- javascript-typescript-code-quality-cursorrules-pro

**其他**：
- astro-typescript-cursorrules-prompt-file
- sveltekit 相关（待提取）

---

## 📊 格式分析（初步）

### 格式模式 1：指令式（最常见）

```
You are an expert in [技术栈]

Key Principles
- [原则1]
- [原则2]

[技术栈] Best Practices
- [实践1]
- [实践2]
```

**示例**：
- `nextjs-react-typescript-cursorrules-prompt-file.cursorrules`
- `nextjs-react-tailwind-cursorrules-prompt-file.cursorrules`

### 格式模式 2：结构化章节

```
# [标题]

## [章节1]
### [子章节1.1]

## [章节2]
```

**示例**：
- `nextjs-supabase-shadcn-pwa-cursorrules-prompt-file.cursorrules`
- `nextjs-vercel-typescript-cursorrules-prompt-file.cursorrules`

### 格式模式 3：代码注释式

```
// [技术栈] .cursorrules

const bestPractices = [
  "[实践1]",
  "[实践2]"
];
```

**示例**：
- `react-chakra-ui-cursorrules-prompt-file.cursorrules`

---

## 🎯 下一步行动

1. **深入分析**：详细分析每个规则文件的结构
2. **提取模式**：总结通用的格式模式
3. **对比优化**：对比当前格式，制定优化方案

---

**分析进行中...**
