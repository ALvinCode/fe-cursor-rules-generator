/**
 * 生成质量评估器
 * 评估生成的 Cursor Rules 的质量，提供质量评分和改进建议
 */

import { CursorRule, RuleGenerationContext } from "../types.js";
import { logger } from "../utils/logger.js";

export interface QualityScore {
  overall: number; // 0-100 总体质量评分
  categories: {
    completeness: number; // 完整性：是否包含必要信息
    accuracy: number; // 准确性：与项目实际情况的匹配度
    structure: number; // 结构：组织是否清晰
    bestPractices: number; // 最佳实践：是否遵循最佳实践
    clarity: number; // 清晰度：是否易于理解
  };
  details: {
    missingSections: string[]; // 缺失的章节
    inaccurateInfo: Array<{ section: string; issue: string }>; // 不准确的信息
    structureIssues: string[]; // 结构问题
    bestPracticeGaps: string[]; // 最佳实践缺失
    clarityIssues: string[]; // 清晰度问题
  };
  recommendations: string[]; // 改进建议
}

export interface QualityAssessment {
  rules: Array<{
    rule: CursorRule;
    score: QualityScore;
  }>;
  overallScore: number; // 所有规则的平均分
  summary: {
    excellent: number; // 90-100
    good: number; // 70-89
    fair: number; // 50-69
    poor: number; // 0-49
  };
}

/**
 * 质量评估器
 */
export class QualityAssessor {
  /**
   * 评估规则生成质量
   */
  assessQuality(
    rules: CursorRule[],
    context: RuleGenerationContext
  ): QualityAssessment {
    const ruleScores = rules.map((rule) => ({
      rule,
      score: this.assessRuleQuality(rule, context),
    }));

    const overallScore =
      ruleScores.reduce((sum, rs) => sum + rs.score.overall, 0) /
      ruleScores.length;

    const summary = this.calculateSummary(ruleScores);

    return {
      rules: ruleScores,
      overallScore,
      summary,
    };
  }

  /**
   * 评估单个规则的质量
   */
  private assessRuleQuality(
    rule: CursorRule,
    context: RuleGenerationContext
  ): QualityScore {
    const categories = {
      completeness: this.assessCompleteness(rule, context),
      accuracy: this.assessAccuracy(rule, context),
      structure: this.assessStructure(rule),
      bestPractices: this.assessBestPractices(rule, context),
      clarity: this.assessClarity(rule),
    };

    const overall =
      (categories.completeness * 0.25 +
        categories.accuracy * 0.3 +
        categories.structure * 0.15 +
        categories.bestPractices * 0.2 +
        categories.clarity * 0.1) /
      1.0;

    const details = this.collectDetails(rule, context);
    const recommendations = this.generateRecommendations(
      categories,
      details,
      rule
    );

    return {
      overall: Math.round(overall),
      categories,
      details,
      recommendations,
    };
  }

  /**
   * 评估完整性
   */
  private assessCompleteness(
    rule: CursorRule,
    context: RuleGenerationContext
  ): number {
    const content = rule.content.toLowerCase();
    let score = 100;
    const missingSections: string[] = [];

    // 检查必需章节
    const requiredSections: Record<string, string[]> = {
      "global-rules": ["项目概述", "技术栈", "开发规范"],
      "code-style": ["代码风格", "命名规范", "格式化"],
      "architecture": ["项目结构", "文件组织", "模块组织"],
      "error-handling": ["错误处理", "异常处理", "错误类型"],
      "routing": ["路由", "路由配置", "路由规则"],
      "state-management": ["状态管理", "状态", "store"],
      "testing": ["测试", "测试规范", "测试用例"],
    };

    const ruleType = this.detectRuleType(rule.fileName);
    const required = requiredSections[ruleType] || [];

    for (const section of required) {
      if (!content.includes(section.toLowerCase())) {
        score -= 15;
        missingSections.push(section);
      }
    }

    // 检查技术栈信息
    if (rule.scope === "global") {
      const hasTechStack = context.techStack.primary.some((tech) =>
        content.includes(tech.toLowerCase())
      );
      if (!hasTechStack) {
        score -= 20;
        missingSections.push("技术栈描述");
      }
    }

    // 检查示例代码
    const codeBlockCount = (content.match(/```/g) || []).length / 2;
    if (codeBlockCount < 2) {
      score -= 10;
      missingSections.push("代码示例");
    }

    return Math.max(0, score);
  }

  /**
   * 评估准确性
   */
  private assessAccuracy(
    rule: CursorRule,
    context: RuleGenerationContext
  ): number {
    const content = rule.content;
    let score = 100;
    const inaccurateInfo: Array<{ section: string; issue: string }> = [];

    // 检查技术栈准确性
    const mentionedTechs: string[] = [];
    for (const tech of context.techStack.primary) {
      if (content.includes(tech)) {
        mentionedTechs.push(tech);
      }
    }

    // 如果主要技术栈都没有提到，准确性低
    if (mentionedTechs.length === 0 && context.techStack.primary.length > 0) {
      score -= 30;
      inaccurateInfo.push({
        section: "技术栈",
        issue: "未提及项目主要技术栈",
      });
    }

    // 检查依赖准确性
    const hasDependencyMention = context.techStack.dependencies.some((dep) =>
      content.includes(dep.name)
    );
    if (
      context.techStack.dependencies.length > 0 &&
      !hasDependencyMention &&
      rule.fileName.includes("routing")
    ) {
      score -= 15;
      inaccurateInfo.push({
        section: "依赖",
        issue: "路由规则未提及相关依赖",
      });
    }

    // 检查代码特征准确性
    if (rule.fileName.includes("state-management")) {
      const hasStateFeature = context.codeFeatures["state-management"];
      if (hasStateFeature && !content.includes("状态")) {
        score -= 20;
        inaccurateInfo.push({
          section: "状态管理",
          issue: "检测到状态管理但规则中未提及",
        });
      }
    }

    return Math.max(0, score);
  }

  /**
   * 评估结构
   */
  private assessStructure(rule: CursorRule): number {
    const content = rule.content;
    let score = 100;
    const structureIssues: string[] = [];

    // 检查标题层级
    const h1Count = (content.match(/^#\s+/gm) || []).length;
    const h2Count = (content.match(/^##\s+/gm) || []).length;

    if (h1Count === 0) {
      score -= 20;
      structureIssues.push("缺少一级标题");
    }

    if (h2Count < 3) {
      score -= 10;
      structureIssues.push("二级标题过少，结构不够清晰");
    }

    // 检查列表使用
    const listCount = (content.match(/^[-*+]\s+/gm) || []).length;
    if (listCount < 5) {
      score -= 5;
      structureIssues.push("列表使用不足，可读性可能受影响");
    }

    // 检查代码块格式
    const codeBlocks = (content.match(/```/g) || []).length / 2;
    if (codeBlocks > 0) {
      const unclosedBlocks = (content.match(/```/g) || []).length % 2;
      if (unclosedBlocks !== 0) {
        score -= 15;
        structureIssues.push("代码块未正确闭合");
      }
    }

    // 检查长度合理性（太短或太长都不好）
    const lineCount = content.split("\n").length;
    if (lineCount < 50) {
      score -= 10;
      structureIssues.push("内容过短，可能不够详细");
    } else if (lineCount > 1000) {
      score -= 5;
      structureIssues.push("内容过长，建议拆分");
    }

    return Math.max(0, score);
  }

  /**
   * 评估最佳实践
   */
  private assessBestPractices(
    rule: CursorRule,
    context: RuleGenerationContext
  ): number {
    const content = rule.content.toLowerCase();
    let score = 100;
    const bestPracticeGaps: string[] = [];

    // 检查是否包含最佳实践关键词
    const bestPracticeKeywords = [
      "最佳实践",
      "推荐",
      "建议",
      "应该",
      "避免",
      "不要",
      "禁止",
    ];

    const hasBestPracticeMention = bestPracticeKeywords.some((keyword) =>
      content.includes(keyword)
    );

    if (!hasBestPracticeMention) {
      score -= 15;
      bestPracticeGaps.push("缺少最佳实践指导");
    }

    // 检查是否有正反示例对比
    const hasPositiveExample = content.includes("✅") || content.includes("好的");
    const hasNegativeExample = content.includes("❌") || content.includes("避免");

    if (!hasPositiveExample) {
      score -= 10;
      bestPracticeGaps.push("缺少正面示例");
    }

    if (!hasNegativeExample) {
      score -= 10;
      bestPracticeGaps.push("缺少反面示例");
    }

    // 检查是否包含注意事项
    if (!content.includes("注意") && !content.includes("警告")) {
      score -= 5;
      bestPracticeGaps.push("缺少注意事项");
    }

    return Math.max(0, score);
  }

  /**
   * 评估清晰度
   */
  private assessClarity(rule: CursorRule): number {
    const content = rule.content;
    let score = 100;
    const clarityIssues: string[] = [];

    // 检查句子长度（过长的句子不易理解）
    const sentences = content.split(/[。！？\n]/);
    const longSentences = sentences.filter((s) => s.length > 100).length;
    if (longSentences > sentences.length * 0.2) {
      score -= 10;
      clarityIssues.push("过长句子过多，影响可读性");
    }

    // 检查是否有清晰的说明
    const hasExplanation = content.includes("说明") || content.includes("例如");
    if (!hasExplanation) {
      score -= 5;
      clarityIssues.push("缺少说明性文字");
    }

    // 检查术语使用（是否过于技术化）
    const technicalTerms = [
      "抽象",
      "封装",
      "多态",
      "继承",
      "依赖注入",
      "控制反转",
    ];
    const termCount = technicalTerms.filter((term) =>
      content.includes(term)
    ).length;
    if (termCount > 5 && !content.includes("解释")) {
      score -= 5;
      clarityIssues.push("技术术语过多，可能需要更多解释");
    }

    return Math.max(0, score);
  }

  /**
   * 收集详细信息
   */
  private collectDetails(
    rule: CursorRule,
    context: RuleGenerationContext
  ): QualityScore["details"] {
    const content = rule.content.toLowerCase();
    const missingSections: string[] = [];
    const inaccurateInfo: Array<{ section: string; issue: string }> = [];
    const structureIssues: string[] = [];
    const bestPracticeGaps: string[] = [];
    const clarityIssues: string[] = [];

    // 这里可以调用各个评估方法收集详细信息
    // 为了简化，这里只做基础收集

    return {
      missingSections,
      inaccurateInfo,
      structureIssues,
      bestPracticeGaps,
      clarityIssues,
    };
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(
    categories: QualityScore["categories"],
    details: QualityScore["details"],
    rule: CursorRule
  ): string[] {
    const recommendations: string[] = [];

    if (categories.completeness < 70) {
      recommendations.push(
        `完善规则内容，补充缺失的章节：${details.missingSections.join("、")}`
      );
    }

    if (categories.accuracy < 70) {
      recommendations.push(
        `提高准确性，修正不准确的信息：${details.inaccurateInfo.map((i) => i.issue).join("、")}`
      );
    }

    if (categories.structure < 70) {
      recommendations.push(
        `优化结构：${details.structureIssues.join("、")}`
      );
    }

    if (categories.bestPractices < 70) {
      recommendations.push(
        `补充最佳实践：${details.bestPracticeGaps.join("、")}`
      );
    }

    if (categories.clarity < 70) {
      recommendations.push(
        `提高清晰度：${details.clarityIssues.join("、")}`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("规则质量良好，继续保持！");
    }

    return recommendations;
  }

  /**
   * 计算质量分布摘要
   */
  private calculateSummary(
    ruleScores: Array<{ rule: CursorRule; score: QualityScore }>
  ): QualityAssessment["summary"] {
    let excellent = 0;
    let good = 0;
    let fair = 0;
    let poor = 0;

    for (const { score } of ruleScores) {
      if (score.overall >= 90) {
        excellent++;
      } else if (score.overall >= 70) {
        good++;
      } else if (score.overall >= 50) {
        fair++;
      } else {
        poor++;
      }
    }

    return { excellent, good, fair, poor };
  }

  /**
   * 检测规则类型
   */
  private detectRuleType(fileName: string): string {
    if (fileName.includes("global")) return "global-rules";
    if (fileName.includes("code-style")) return "code-style";
    if (fileName.includes("architecture")) return "architecture";
    if (fileName.includes("error-handling")) return "error-handling";
    if (fileName.includes("routing")) return "routing";
    if (fileName.includes("state-management")) return "state-management";
    if (fileName.includes("testing")) return "testing";
    return "other";
  }

  /**
   * 生成质量报告
   */
  generateQualityReport(assessment: QualityAssessment): string {
    let report = `# 规则生成质量评估报告\n\n`;
    report += `综合质量分数: ${assessment.overallScore.toFixed(1)}%\n\n`;

    report += `## 规则质量评估\n\n`;

    for (const { rule, score } of assessment.rules) {
      const scorePercent = `${score.overall}%`;
      const hasRecommendations = score.recommendations.length > 0 && 
        !score.recommendations.some(rec => rec.includes("质量良好"));
      
      report += `- \`${rule.fileName}\` - ${scorePercent}`;
      
      if (hasRecommendations) {
        report += `\n  - 改进建议: ${score.recommendations.join("; ")}`;
      }
      
      report += `\n`;
    }

    return report;
  }
}

