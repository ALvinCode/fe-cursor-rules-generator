/**
 * 规则内容验证器
 * 验证规则内容的正确性、一致性和质量
 */

import { CursorRule, RuleGenerationContext } from "../types.js";
import { logger } from "../utils/logger.js";

export interface ContentValidationIssue {
  type:
    | "contradiction" // 矛盾
    | "inconsistency" // 不一致
    | "missing-info" // 缺失信息
    | "incorrect-info" // 错误信息
    | "outdated-info" // 过时信息
    | "code-error" // 代码错误
    | "format-issue"; // 格式问题
  severity: "error" | "warning" | "info";
  location: string; // 问题位置（章节或行号）
  message: string;
  suggestion?: string;
}

export interface ContentValidationResult {
  isValid: boolean;
  issues: ContentValidationIssue[];
  score: number; // 0-100 内容质量分数
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * 规则内容验证器
 */
export class RuleContentValidator {
  /**
   * 验证规则内容
   */
  validateContent(
    rule: CursorRule,
    context: RuleGenerationContext
  ): ContentValidationResult {
    const issues: ContentValidationIssue[] = [];

    // 1. 检查技术栈一致性
    issues.push(...this.checkTechStackConsistency(rule, context));

    // 2. 检查依赖一致性
    issues.push(...this.checkDependencyConsistency(rule, context));

    // 3. 检查代码特征一致性
    issues.push(...this.checkCodeFeatureConsistency(rule, context));

    // 4. 检查内容矛盾
    issues.push(...this.checkContradictions(rule));

    // 5. 检查代码示例正确性
    issues.push(...this.checkCodeExamples(rule, context));

    // 6. 检查关键信息完整性
    issues.push(...this.checkKeyInfoCompleteness(rule, context));

    // 7. 检查格式问题
    issues.push(...this.checkFormatIssues(rule));

    const summary = {
      errors: issues.filter((i) => i.severity === "error").length,
      warnings: issues.filter((i) => i.severity === "warning").length,
      info: issues.filter((i) => i.severity === "info").length,
    };

    // 计算质量分数
    const score = this.calculateScore(issues);

    return {
      isValid: summary.errors === 0,
      issues,
      score,
      summary,
    };
  }

  /**
   * 检查技术栈一致性
   */
  private checkTechStackConsistency(
    rule: CursorRule,
    context: RuleGenerationContext
  ): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = [];
    const content = rule.content;

    // 检查主要技术栈是否都提到了
    for (const tech of context.techStack.primary) {
      if (!content.includes(tech)) {
        // 对于全局规则，主要技术栈必须提到
        if (rule.scope === "global") {
          issues.push({
            type: "missing-info",
            severity: "warning",
            location: "技术栈部分",
            message: `主要技术栈 "${tech}" 未在规则中提及`,
            suggestion: `在规则中添加关于 ${tech} 的说明`,
          });
        }
      }
    }

    // 检查是否提到了不存在的技术栈
    const mentionedTechs = this.extractMentionedTechnologies(content);
    for (const mentionedTech of mentionedTechs) {
      const exists =
        context.techStack.primary.includes(mentionedTech) ||
        context.techStack.frameworks.includes(mentionedTech) ||
        context.techStack.dependencies.some((d) =>
          d.name.includes(mentionedTech)
        );

      if (!exists) {
        issues.push({
          type: "incorrect-info",
          severity: "warning",
          location: "技术栈部分",
          message: `规则中提到了 "${mentionedTech}"，但项目中未检测到`,
          suggestion: `确认是否应该提及 ${mentionedTech}，或从规则中移除`,
        });
      }
    }

    return issues;
  }

  /**
   * 检查依赖一致性
   */
  private checkDependencyConsistency(
    rule: CursorRule,
    context: RuleGenerationContext
  ): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = [];
    const content = rule.content.toLowerCase();

    // 检查路由相关规则是否提到了路由库
    if (rule.fileName.includes("routing")) {
      const routingDeps = context.techStack.dependencies.filter((d) =>
        ["react-router", "next", "vue-router", "express", "koa"].some((lib) =>
          d.name.includes(lib)
        )
      );

      if (routingDeps.length > 0) {
        const mentioned = routingDeps.some((dep) =>
          content.includes(dep.name.toLowerCase())
        );
        if (!mentioned) {
          issues.push({
            type: "missing-info",
            severity: "warning",
            location: "路由规则",
            message: `检测到路由依赖但规则中未提及`,
            suggestion: `在规则中添加关于 ${routingDeps.map((d) => d.name).join(", ")} 的说明`,
          });
        }
      }
    }

    // 检查状态管理相关规则
    if (rule.fileName.includes("state-management")) {
      const stateDeps = context.techStack.dependencies.filter((d) =>
        ["redux", "zustand", "mobx", "pinia", "vuex"].some((lib) =>
          d.name.includes(lib)
        )
      );

      if (stateDeps.length > 0) {
        const mentioned = stateDeps.some((dep) =>
          content.includes(dep.name.toLowerCase())
        );
        if (!mentioned) {
          issues.push({
            type: "missing-info",
            severity: "error",
            location: "状态管理规则",
            message: `检测到状态管理库但规则中未提及`,
            suggestion: `在规则中添加关于 ${stateDeps.map((d) => d.name).join(", ")} 的使用说明`,
          });
        }
      }
    }

    return issues;
  }

  /**
   * 检查代码特征一致性
   */
  private checkCodeFeatureConsistency(
    rule: CursorRule,
    context: RuleGenerationContext
  ): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = [];
    const content = rule.content.toLowerCase();

    // 检查组件相关规则
    if (rule.fileName.includes("component") || rule.scope === "global") {
      const hasComponents = context.codeFeatures["custom-components"];
      if (hasComponents && hasComponents.frequency > 0) {
        if (!content.includes("组件")) {
          issues.push({
            type: "missing-info",
            severity: "warning",
            location: "组件部分",
            message: "检测到自定义组件但规则中未提及",
            suggestion: "添加组件使用规范",
          });
        }
      }
    }

    // 检查 API 路由
    if (rule.fileName.includes("routing") || rule.fileName.includes("api")) {
      const hasApiRoutes = context.codeFeatures["api-routes"];
      if (hasApiRoutes && hasApiRoutes.frequency > 0) {
        if (!content.includes("api") && !content.includes("路由")) {
          issues.push({
            type: "missing-info",
            severity: "warning",
            location: "API 路由部分",
            message: "检测到 API 路由但规则中未提及",
            suggestion: "添加 API 路由规范",
          });
        }
      }
    }

    return issues;
  }

  /**
   * 检查内容矛盾
   */
  private checkContradictions(rule: CursorRule): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = [];
    const content = rule.content;

    // 检查是否同时推荐和禁止同一件事
    const contradictions = [
      { positive: "使用 var", negative: "避免 var" },
      { positive: "使用 any", negative: "避免 any" },
      { positive: "使用 class", negative: "使用函数组件" },
    ];

    for (const contradiction of contradictions) {
      const hasPositive = content.includes(contradiction.positive);
      const hasNegative = content.includes(contradiction.negative);

      if (hasPositive && hasNegative) {
        issues.push({
          type: "contradiction",
          severity: "error",
          location: "规则内容",
          message: `规则中同时推荐和禁止 "${contradiction.positive}"`,
          suggestion: "统一规则，明确是推荐还是禁止",
        });
      }
    }

    return issues;
  }

  /**
   * 检查代码示例正确性
   */
  private checkCodeExamples(
    rule: CursorRule,
    context: RuleGenerationContext
  ): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = [];
    const content = rule.content;

    // 提取代码块
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const codeBlocks: Array<{ lang: string; code: string }> = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      codeBlocks.push({
        lang: match[1] || "",
        code: match[2],
      });
    }

    // 检查代码示例中的技术栈一致性
    for (const block of codeBlocks) {
      // 检查 TypeScript 代码但项目是 JavaScript
      if (block.lang === "typescript" && block.code.includes(": ")) {
        const hasTypeScript = context.techStack.languages.includes("TypeScript");
        if (!hasTypeScript) {
          issues.push({
            type: "incorrect-info",
            severity: "warning",
            location: "代码示例",
            message: "规则中包含 TypeScript 代码示例，但项目使用 JavaScript",
            suggestion: "将示例改为 JavaScript 或添加 TypeScript 支持说明",
          });
        }
      }

      // 检查是否使用了未安装的库
      const imports = block.code.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
      if (imports) {
        for (const imp of imports) {
          const libMatch = imp.match(/from\s+['"]([^'"]+)['"]/);
          if (libMatch) {
            const lib = libMatch[1];
            const exists = context.techStack.dependencies.some((d) =>
              d.name.includes(lib.split("/")[0])
            );
            if (!exists && !lib.startsWith(".") && !lib.startsWith("@/")) {
              issues.push({
                type: "incorrect-info",
                severity: "info",
                location: "代码示例",
                message: `代码示例中使用了 "${lib}"，但项目中未检测到该依赖`,
                suggestion: `确认是否需要安装 ${lib} 或更新示例`,
              });
            }
          }
        }
      }
    }

    return issues;
  }

  /**
   * 检查关键信息完整性
   */
  private checkKeyInfoCompleteness(
    rule: CursorRule,
    context: RuleGenerationContext
  ): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = [];
    const content = rule.content;

    // 全局规则必须包含的信息
    if (rule.scope === "global") {
      if (!content.includes("技术栈") && !content.includes("技术")) {
        issues.push({
          type: "missing-info",
          severity: "error",
          location: "全局规则",
          message: "全局规则缺少技术栈说明",
          suggestion: "添加技术栈概述部分",
        });
      }

      if (!content.includes("项目结构")) {
        issues.push({
          type: "missing-info",
          severity: "warning",
          location: "全局规则",
          message: "全局规则缺少项目结构说明",
          suggestion: "添加项目结构描述",
        });
      }
    }

    // 代码风格规则必须包含的信息
    if (rule.fileName.includes("code-style")) {
      if (!content.includes("命名") && !content.includes("命名规范")) {
        issues.push({
          type: "missing-info",
          severity: "warning",
          location: "代码风格规则",
          message: "代码风格规则缺少命名规范",
          suggestion: "添加命名规范说明",
        });
      }
    }

    return issues;
  }

  /**
   * 检查格式问题
   */
  private checkFormatIssues(rule: CursorRule): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = [];
    const content = rule.content;

    // 检查代码块闭合
    const codeBlockCount = (content.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      issues.push({
        type: "format-issue",
        severity: "error",
        location: "代码块",
        message: "代码块未正确闭合",
        suggestion: "检查并修复所有代码块的闭合",
      });
    }

    // 检查链接格式
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links: string[] = [];
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[2]);
    }

    // 检查是否有空链接
    for (const link of links) {
      if (!link || link.trim() === "") {
        issues.push({
          type: "format-issue",
          severity: "warning",
          location: "链接",
          message: "发现空链接",
          suggestion: "修复或移除空链接",
        });
      }
    }

    return issues;
  }

  /**
   * 提取提到的技术
   */
  private extractMentionedTechnologies(content: string): string[] {
    const commonTechs = [
      "React",
      "Vue",
      "Angular",
      "Next.js",
      "Nuxt",
      "Express",
      "NestJS",
      "TypeScript",
      "JavaScript",
      "Python",
      "Go",
      "Rust",
    ];

    return commonTechs.filter((tech) => content.includes(tech));
  }

  /**
   * 计算质量分数
   */
  private calculateScore(issues: ContentValidationIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case "error":
          score -= 10;
          break;
        case "warning":
          score -= 5;
          break;
        case "info":
          score -= 2;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 生成验证报告
   */
  generateValidationReport(result: ContentValidationResult): string {
    let report = `# 规则内容验证报告\n\n`;

    report += `状态: ${result.isValid ? "通过" : "未通过"} | 质量分数: ${result.score}% | 错误: ${result.summary.errors} 个 | 警告: ${result.summary.warnings} 个 | 提示: ${result.summary.info} 个\n\n`;

    if (result.issues.length > 0) {
      report += `## 详细问题\n\n`;

      const errors = result.issues.filter((i) => i.severity === "error");
      const warnings = result.issues.filter((i) => i.severity === "warning");
      const info = result.issues.filter((i) => i.severity === "info");

      if (errors.length > 0) {
        report += `### 错误 (${errors.length})\n\n`;
        for (const issue of errors) {
          report += `- ${issue.location}: ${issue.message}\n`;
          if (issue.suggestion) {
            report += `  - 建议: ${issue.suggestion}\n`;
          }
        }
        report += `\n`;
      }

      if (warnings.length > 0) {
        report += `### 警告 (${warnings.length})\n\n`;
        for (const issue of warnings) {
          report += `- ${issue.location}: ${issue.message}\n`;
          if (issue.suggestion) {
            report += `  - 建议: ${issue.suggestion}\n`;
          }
        }
        report += `\n`;
      }

      if (info.length > 0) {
        report += `### 提示 (${info.length})\n\n`;
        for (const issue of info) {
          report += `- ${issue.location}: ${issue.message}\n`;
          if (issue.suggestion) {
            report += `  - 建议: ${issue.suggestion}\n`;
          }
        }
        report += `\n`;
      }
    } else {
      report += `## 未发现问题\n\n`;
      report += `规则内容验证通过，所有检查项均正常。\n`;
    }

    return report;
  }
}

