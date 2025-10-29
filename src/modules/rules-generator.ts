import {
  CursorRule,
  RuleGenerationContext,
  BestPractice,
  Module,
  CodeFeature,
} from "../types.js";

/**
 * 规则生成引擎
 * 结合项目特征和最佳实践，生成 Cursor Rules
 */
export class RulesGenerator {
  async generate(context: RuleGenerationContext): Promise<CursorRule[]> {
    const rules: CursorRule[] = [];

    // 生成全局规则
    const globalRule = this.generateGlobalRule(context);
    rules.push(globalRule);

    // 如果启用模块规则且项目有多个模块，生成模块特定规则
    if (context.includeModuleRules && context.modules.length > 1) {
      for (const module of context.modules) {
        const moduleRule = this.generateModuleRule(context, module);
        rules.push(moduleRule);
      }
    }

    return rules;
  }

  /**
   * 生成全局规则
   */
  private generateGlobalRule(context: RuleGenerationContext): CursorRule {
    let content = `---
title: ${this.getProjectName(context.projectPath)} - 全局开发规则
description: 基于项目实际情况和最佳实践自动生成的 Cursor Rules
priority: 100
---

# 项目概述

这是一个基于 ${context.techStack.primary.join(", ")} 的项目。

## 技术栈

**主要技术栈：**
${context.techStack.primary.map((tech) => `- ${tech}`).join("\n")}

**语言：** ${context.techStack.languages.join(", ")}

**包管理器：** ${context.techStack.packageManagers.join(", ")}

${context.techStack.frameworks.length > 0 ? `**框架：** ${context.techStack.frameworks.join(", ")}` : ""}

## 项目结构

${this.generateProjectStructureDescription(context)}

## 核心功能特征

${this.generateFeaturesDescription(context.codeFeatures)}

---

# 开发规范

${this.generateDevelopmentGuidelines(context)}

---

# 代码风格

${this.generateCodeStyleGuidelines(context)}

---

# 最佳实践

${this.generateBestPracticesSection(context.bestPractices)}

---

# 文件组织

${this.generateFileOrganizationGuidelines(context)}

---

# 注意事项

${this.generateCautions(context)}
`;

    return {
      scope: "global",
      modulePath: context.projectPath, // 全局规则放在项目根目录
      content,
      fileName: "00-global-rules.mdc",
      priority: 100,
    };
  }

  /**
   * 生成模块特定规则
   */
  private generateModuleRule(
    context: RuleGenerationContext,
    module: Module
  ): CursorRule {
    const content = `---
title: ${module.name} 模块规则
description: ${module.description || module.name + " 模块的开发规则"}
priority: 50
---

# ${module.name} 模块

**类型：** ${this.getModuleTypeName(module.type)}

**路径：** \`${module.path}\`

${module.description ? `**描述：** ${module.description}` : ""}

## 模块职责

${this.generateModuleResponsibilities(module)}

## 开发指南

${this.generateModuleGuidelines(context, module)}

## 依赖关系

${module.dependencies.length > 0 ? `此模块依赖以下包：
${module.dependencies.slice(0, 10).map((d) => `- ${d}`).join("\n")}
${module.dependencies.length > 10 ? `\n...以及其他 ${module.dependencies.length - 10} 个依赖` : ""}` : "此模块没有外部依赖。"}

## 注意事项

${this.generateModuleCautions(module)}
`;

    return {
      scope: "module",
      moduleName: module.name,
      modulePath: module.path, // 模块规则放在模块自己的目录
      content,
      fileName: `${this.sanitizeFileName(module.name)}-rules.mdc`,
      priority: 50,
    };
  }

  /**
   * 生成项目结构描述
   */
  private generateProjectStructureDescription(
    context: RuleGenerationContext
  ): string {
    if (context.modules.length <= 1) {
      return "这是一个单体应用项目。";
    }

    const modulesByType = new Map<string, Module[]>();
    for (const module of context.modules) {
      if (!modulesByType.has(module.type)) {
        modulesByType.set(module.type, []);
      }
      modulesByType.get(module.type)!.push(module);
    }

    let desc = `这是一个${context.modules.length > 5 ? "大型" : ""}多模块项目，包含以下模块：\n\n`;

    for (const [type, modules] of modulesByType) {
      desc += `**${this.getModuleTypeName(type)}模块：**\n`;
      desc += modules.map((m) => `- ${m.name}`).join("\n") + "\n\n";
    }

    return desc;
  }

  /**
   * 生成功能特征描述
   */
  private generateFeaturesDescription(
    features: Record<string, CodeFeature>
  ): string {
    const entries = Object.values(features);
    if (entries.length === 0) {
      return "项目功能特征分析中...";
    }

    return entries
      .map(
        (f) => `### ${f.description}

- **类型：** ${f.type}
- **使用频率：** ${f.frequency} 处
${f.examples.length > 0 ? `- **示例：** ${f.examples.slice(0, 3).join(", ")}` : ""}
`
      )
      .join("\n");
  }

  /**
   * 生成开发指南
   */
  private generateDevelopmentGuidelines(context: RuleGenerationContext): string {
    let guidelines = "";

    // 根据技术栈生成指南
    const { primary, languages } = context.techStack;

    if (languages.includes("TypeScript")) {
      guidelines += `## TypeScript 使用

- 优先使用 TypeScript 编写新代码
- 为所有公共 API 提供完整的类型定义
- 启用严格模式 (\`strict: true\`)
- 避免使用 \`any\`，使用 \`unknown\` 或具体类型

`;
    }

    if (primary.some((p) => p.toLowerCase().includes("react"))) {
      guidelines += `## React 开发

- 使用函数组件和 Hooks，避免类组件
- 遵循组件单一职责原则
- 使用 PropTypes 或 TypeScript 进行类型检查
- 合理使用 \`useMemo\` 和 \`useCallback\` 优化性能

`;
    }

    if (primary.some((p) => p.toLowerCase().includes("next"))) {
      guidelines += `## Next.js 规范

- 优先使用 App Router（如果项目使用）
- Server Components 中进行数据获取
- 使用 \`next/image\` 优化图片
- 配置适当的元数据以改善 SEO

`;
    }

    if (primary.some((p) => p.toLowerCase().includes("vue"))) {
      guidelines += `## Vue 开发

- 使用 Composition API（Vue 3）
- 保持组件模板简洁
- 复杂逻辑抽取到 composables
- 使用 TypeScript 增强类型安全

`;
    }

    if (languages.includes("Python")) {
      guidelines += `## Python 开发

- 遵循 PEP 8 代码风格
- 使用类型注解（Type Hints）
- 编写 docstrings 文档
- 使用虚拟环境管理依赖

`;
    }

    // 添加测试相关指南
    if (context.codeFeatures["testing"]) {
      guidelines += `## 测试规范

- 为新功能编写单元测试
- 测试文件与源文件放在相同目录
- 保持测试独立，避免依赖执行顺序
- 使用描述性的测试名称

`;
    }

    // 添加 API 相关指南
    if (context.codeFeatures["api-routes"]) {
      guidelines += `## API 开发

- 使用 RESTful 设计原则
- 提供适当的错误处理和状态码
- 为 API 编写文档（OpenAPI/Swagger）
- 实施适当的认证和授权

`;
    }

    return guidelines || "遵循项目现有代码风格和约定。";
  }

  /**
   * 生成代码风格指南
   */
  private generateCodeStyleGuidelines(context: RuleGenerationContext): string {
    let style = `## 通用规范

- 使用有意义的变量和函数名
- 保持函数简短，单一职责
- 添加必要的注释，解释"为什么"而非"是什么"
- 保持代码格式一致

`;

    // 根据语言添加特定风格
    if (context.techStack.languages.includes("JavaScript") ||
        context.techStack.languages.includes("TypeScript")) {
      style += `## JavaScript/TypeScript

- 使用 \`const\` 和 \`let\`，避免 \`var\`
- 优先使用箭头函数
- 使用模板字符串而非字符串拼接
- 使用解构赋值简化代码
- 使用 async/await 处理异步操作

`;
    }

    if (context.techStack.languages.includes("Python")) {
      style += `## Python

- 使用 4 个空格缩进
- 函数和类名使用 snake_case
- 类名使用 PascalCase
- 常量使用 UPPER_CASE
- 导入按标准库、第三方库、本地模块分组

`;
    }

    return style;
  }

  /**
   * 生成最佳实践部分
   */
  private generateBestPracticesSection(practices: BestPractice[]): string {
    if (practices.length === 0) {
      return "请参考官方文档获取最佳实践建议。";
    }

    // 按优先级排序
    const sorted = practices.sort((a, b) => b.priority - a.priority);

    return sorted
      .map(
        (p) => `## ${p.category}

${p.content}

*来源：${p.source}*
`
      )
      .join("\n---\n\n");
  }

  /**
   * 生成文件组织指南
   */
  private generateFileOrganizationGuidelines(
    context: RuleGenerationContext
  ): string {
    let org = `## 基本原则

- 按功能模块组织文件，而非按文件类型
- 相关文件放在一起
- 保持目录结构扁平，避免过深嵌套
- 使用清晰的命名约定

`;

    if (context.codeFeatures["custom-components"]) {
      org += `## 组件组织

- 每个组件一个文件夹
- 组件文件、样式、测试放在同一目录
- 导出通过 index 文件统一管理

\`\`\`
components/
  Button/
    Button.tsx
    Button.module.css
    Button.test.tsx
    index.ts
\`\`\`

`;
    }

    if (context.codeFeatures["api-routes"]) {
      org += `## API 路由组织

- 路由文件按功能模块分组
- 每个路由文件处理相关的 endpoints
- 控制器和服务分离

`;
    }

    return org;
  }

  /**
   * 生成注意事项
   */
  private generateCautions(context: RuleGenerationContext): string {
    const cautions: string[] = [];

    cautions.push("- 提交前运行测试确保代码质量");
    cautions.push("- 遵循项目现有的代码风格和约定");
    cautions.push("- 更新代码时同步更新相关文档");

    if (context.techStack.languages.includes("TypeScript")) {
      cautions.push("- 避免使用类型断言（as），除非绝对必要");
      cautions.push("- 不要禁用 TypeScript 检查（@ts-ignore）");
    }

    if (context.codeFeatures["database"]) {
      cautions.push("- 数据库迁移需要仔细测试");
      cautions.push("- 避免在代码中硬编码数据库凭证");
    }

    if (context.codeFeatures["api-routes"]) {
      cautions.push("- API 变更需要考虑向后兼容性");
      cautions.push("- 敏感数据不要记录到日志");
    }

    return cautions.map((c) => c).join("\n");
  }

  /**
   * 生成模块职责说明
   */
  private generateModuleResponsibilities(module: Module): string {
    const typeDescriptions: Record<string, string> = {
      frontend: "负责用户界面展示和交互逻辑",
      backend: "负责业务逻辑处理和数据管理",
      shared: "提供跨模块共享的工具和类型定义",
      service: "提供特定领域的服务功能",
      package: "作为独立包提供特定功能",
      other: "提供项目所需的功能",
    };

    return typeDescriptions[module.type] || "提供项目所需的功能";
  }

  /**
   * 生成模块开发指南
   */
  private generateModuleGuidelines(
    context: RuleGenerationContext,
    module: Module
  ): string {
    let guidelines = "";

    if (module.type === "frontend") {
      guidelines = `- 保持组件可复用性和可测试性
- 使用统一的状态管理方案
- 优化性能，避免不必要的重渲染
- 确保响应式设计适配不同设备`;
    } else if (module.type === "backend") {
      guidelines = `- 实施适当的错误处理机制
- 提供完整的 API 文档
- 确保数据验证和安全性
- 实现日志记录便于调试`;
    } else if (module.type === "shared") {
      guidelines = `- 保持代码通用性，避免特定业务逻辑
- 提供完整的类型定义和文档
- 确保向后兼容性
- 编写充分的单元测试`;
    } else {
      guidelines = `- 遵循单一职责原则
- 提供清晰的接口定义
- 编写必要的文档和示例
- 确保代码质量和测试覆盖`;
    }

    return guidelines;
  }

  /**
   * 生成模块注意事项
   */
  private generateModuleCautions(module: Module): string {
    const cautions: string[] = [];

    if (module.type === "shared") {
      cautions.push("- 修改共享模块时需考虑对其他模块的影响");
      cautions.push("- 避免添加特定业务逻辑");
    }

    if (module.type === "backend") {
      cautions.push("- 注意 API 的向后兼容性");
      cautions.push("- 确保敏感数据安全");
    }

    if (module.type === "frontend") {
      cautions.push("- 注意浏览器兼容性");
      cautions.push("- 优化打包体积");
    }

    cautions.push("- 遵循模块的设计原则和约定");

    return cautions.map((c) => c).join("\n");
  }

  /**
   * 生成规则摘要
   */
  generateSummary(rules: CursorRule[], projectPath: string): string {
    const globalRules = rules.filter((r) => r.scope === "global");
    const moduleRules = rules.filter((r) => r.scope === "module");

    let summary = `生成了 ${rules.length} 个规则文件：\n\n`;

    if (globalRules.length > 0) {
      summary += `**全局规则（项目根目录）：**\n`;
      summary += globalRules.map((r) => `  - .cursor/rules/${r.fileName}`).join("\n");
      summary += "\n\n";
    }

    if (moduleRules.length > 0) {
      summary += `**模块规则（按模块目录）：**\n`;
      summary += moduleRules.map((r) => {
        const path = require("path");
        const relativePath = r.modulePath ? path.relative(projectPath, r.modulePath) : r.moduleName;
        return `  - ${relativePath}/.cursor/rules/${r.fileName} (${r.moduleName})`;
      }).join("\n");
    }

    return summary;
  }

  /**
   * 获取项目名称
   */
  private getProjectName(projectPath: string): string {
    const path = require("path");
    return path.basename(projectPath);
  }

  /**
   * 获取模块类型名称
   */
  private getModuleTypeName(type: string): string {
    const names: Record<string, string> = {
      frontend: "前端",
      backend: "后端",
      shared: "共享",
      service: "服务",
      package: "包",
      other: "其他",
    };
    return names[type] || type;
  }

  /**
   * 清理文件名
   */
  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
}

