/**
 * 规则效果评估器
 * 评估生成的规则与项目的契合度、对项目的理解程度，以及规则生成代码的潜在效果
 */

import * as path from "path";
import { FileUtils } from "../utils/file-utils.js";
import { logger } from "../utils/logger.js";
import { RuleGenerationContext, CursorRule } from "../types.js";

export interface EffectivenessMetrics {
  projectFit: {
    score: number; // 0-100 规则与项目契合度
    indicators: {
      techStackMatch: number; // 技术栈匹配度
      structureMatch: number; // 项目结构匹配度
      featureCoverage: number; // 代码特征覆盖度
      configAlignment: number; // 配置对齐度
    };
  };
  understanding: {
    score: number; // 0-100 对项目的理解程度
    indicators: {
      moduleUnderstanding: number; // 模块理解度
      codePatternRecognition: number; // 代码模式识别度
      architectureGrasp: number; // 架构把握度
      practiceAlignment: number; // 实践对齐度
    };
  };
  codeGenerationPotential: {
    score: number; // 0-100 规则生成代码的潜在效果
    indicators: {
      ruleCompleteness: number; // 规则完整性
      exampleQuality: number; // 示例代码质量
      guidelineClarity: number; // 指导清晰度
      actionableGuidance: number; // 可操作性指导
    };
  };
  overall: number; // 综合评分
}

export interface EffectivenessTracking {
  projectPath: string;
  ruleVersion: string;
  trackedAt: string;
  metrics: EffectivenessMetrics;
  trends: {
    projectFit: number[]; // 项目契合度历史趋势
    understanding: number[]; // 理解程度历史趋势
    codeGenerationPotential: number[]; // 生成代码潜力历史趋势
  };
  recommendations: string[];
}

/**
 * 规则效果评估器
 */
export class RuleEffectivenessTracker {
  private trackingFile = ".cursor/rules/.effectiveness.json";

  /**
   * 评估规则效果（规则与项目的契合度、理解程度、生成代码的潜在效果）
   */
  async assessEffectiveness(
    projectPath: string,
    rules: CursorRule[],
    context: RuleGenerationContext
  ): Promise<EffectivenessMetrics> {
    // 1. 评估规则与项目的契合度
    const projectFit = await this.assessProjectFit(rules, context);

    // 2. 评估对项目的理解程度
    const understanding = await this.assessUnderstanding(rules, context);

    // 3. 评估规则生成代码的潜在效果
    const codeGenerationPotential = await this.assessCodeGenerationPotential(rules, context);

    // 计算综合评分
    const overall =
      projectFit.score * 0.4 + understanding.score * 0.35 + codeGenerationPotential.score * 0.25;

    return {
      projectFit,
      understanding,
      codeGenerationPotential,
      overall: Math.round(overall),
    };
  }

  /**
   * 评估规则与项目的契合度
   */
  private async assessProjectFit(
    rules: CursorRule[],
    context: RuleGenerationContext
  ): Promise<EffectivenessMetrics["projectFit"]> {
    // 1. 技术栈匹配度
    const techStackMatch = this.assessTechStackMatch(rules, context);

    // 2. 项目结构匹配度
    const structureMatch = this.assessStructureMatch(rules, context);

    // 3. 代码特征覆盖度
    const featureCoverage = this.assessFeatureCoverage(rules, context);

    // 4. 配置对齐度
    const configAlignment = this.assessConfigAlignment(rules, context);

    const score = (techStackMatch + structureMatch + featureCoverage + configAlignment) / 4;

    return {
      score: Math.round(score),
      indicators: {
        techStackMatch,
        structureMatch,
        featureCoverage,
        configAlignment,
      },
    };
  }

  /**
   * 评估技术栈匹配度
   */
  private assessTechStackMatch(
    rules: CursorRule[],
    context: RuleGenerationContext
  ): number {
    let totalMatch = 0;
    let totalTechs = 0;

    const allRulesContent = rules.map((r) => r.content).join("\n");

    // 检查主要技术栈是否在规则中提到
    for (const tech of context.techStack.primary) {
      totalTechs++;
      if (allRulesContent.includes(tech)) {
        totalMatch++;
      }
    }

    // 检查关键依赖是否提到
    const keyDependencies = context.techStack.dependencies
      .filter((d) => d.type === "dependency")
      .slice(0, 10);
    for (const dep of keyDependencies) {
      totalTechs++;
      if (allRulesContent.includes(dep.name)) {
        totalMatch++;
      }
    }

    return totalTechs > 0 ? (totalMatch / totalTechs) * 100 : 50;
  }

  /**
   * 评估项目结构匹配度
   */
  private assessStructureMatch(
    rules: CursorRule[],
    context: RuleGenerationContext
  ): number {
    if (!context.fileOrganization) {
      return 50;
    }

    const allRulesContent = rules.map((r) => r.content).join("\n").toLowerCase();
    let matchCount = 0;
    let totalChecks = 0;

    // 检查是否提到组件位置
    if (context.fileOrganization.componentLocation.length > 0) {
      totalChecks++;
      const componentLoc = context.fileOrganization.componentLocation[0].toLowerCase();
      if (allRulesContent.includes(componentLoc) || allRulesContent.includes("组件")) {
        matchCount++;
      }
    }

    // 检查是否提到工具函数位置
    if (context.fileOrganization.utilsLocation.length > 0) {
      totalChecks++;
      const utilsLoc = context.fileOrganization.utilsLocation[0].toLowerCase();
      if (allRulesContent.includes(utilsLoc) || allRulesContent.includes("工具")) {
        matchCount++;
      }
    }

    // 检查是否提到模块结构
    if (context.modules.length > 0) {
      totalChecks++;
      if (allRulesContent.includes("模块") || allRulesContent.includes("module")) {
        matchCount++;
      }
    }

    return totalChecks > 0 ? (matchCount / totalChecks) * 100 : 50;
  }

  /**
   * 评估代码特征覆盖度
   */
  private assessFeatureCoverage(
    rules: CursorRule[],
    context: RuleGenerationContext
  ): number {
    const allRulesContent = rules.map((r) => r.content).join("\n").toLowerCase();
    let coveredFeatures = 0;
    const totalFeatures = Object.keys(context.codeFeatures).length;

    if (totalFeatures === 0) {
      return 50;
    }

    // 检查每个代码特征是否在规则中提及
    for (const [feature, data] of Object.entries(context.codeFeatures)) {
      const featureKeywords: Record<string, string[]> = {
        "custom-components": ["组件", "component"],
        "api-routes": ["路由", "route", "api"],
        "state-management": ["状态", "state", "store"],
        "styling": ["样式", "style", "css"],
        "testing": ["测试", "test"],
        "database": ["数据库", "database", "db"],
      };

      const keywords = featureKeywords[feature] || [feature];
      const isMentioned = keywords.some((keyword) =>
        allRulesContent.includes(keyword.toLowerCase())
      );

      if (isMentioned) {
        coveredFeatures++;
      }
    }

    return (coveredFeatures / totalFeatures) * 100;
  }

  /**
   * 评估配置对齐度
   */
  private assessConfigAlignment(
    rules: CursorRule[],
    context: RuleGenerationContext
  ): number {
    if (!context.projectConfig) {
      return 50;
    }

    const allRulesContent = rules.map((r) => r.content).join("\n").toLowerCase();
    let alignmentCount = 0;
    let totalChecks = 0;

    // 检查 Prettier 配置
    if (context.projectConfig.prettier) {
      totalChecks++;
      if (allRulesContent.includes("prettier") || allRulesContent.includes("格式化")) {
        alignmentCount++;
      }
    }

    // 检查 ESLint 配置
    if (context.projectConfig.eslint) {
      totalChecks++;
      if (allRulesContent.includes("eslint") || allRulesContent.includes("lint")) {
        alignmentCount++;
      }
    }

    // 检查 TypeScript 配置
    if (context.projectConfig.typescript) {
      totalChecks++;
      if (allRulesContent.includes("typescript") || allRulesContent.includes("类型")) {
        alignmentCount++;
      }
    }

    return totalChecks > 0 ? (alignmentCount / totalChecks) * 100 : 50;
  }

  /**
   * 评估对项目的理解程度
   */
  private async assessUnderstanding(
    rules: CursorRule[],
    context: RuleGenerationContext
  ): Promise<EffectivenessMetrics["understanding"]> {
    // 1. 模块理解度
    const moduleUnderstanding = this.assessModuleUnderstanding(rules, context);

    // 2. 代码模式识别度
    const codePatternRecognition = this.assessCodePatternRecognition(rules, context);

    // 3. 架构把握度
    const architectureGrasp = this.assessArchitectureGrasp(rules, context);

    // 4. 实践对齐度
    const practiceAlignment = this.assessPracticeAlignment(rules, context);

    const score = (moduleUnderstanding + codePatternRecognition + architectureGrasp + practiceAlignment) / 4;

    return {
      score: Math.round(score),
      indicators: {
        moduleUnderstanding,
        codePatternRecognition,
        architectureGrasp,
        practiceAlignment,
      },
    };
  }

  /**
   * 评估模块理解度
   */
  private assessModuleUnderstanding(
    rules: CursorRule[],
    context: RuleGenerationContext
  ): number {
    if (context.modules.length === 0) {
      return 50;
    }

    const allRulesContent = rules.map((r) => r.content).join("\n").toLowerCase();
    let understoodModules = 0;

    for (const module of context.modules) {
      if (allRulesContent.includes(module.name.toLowerCase()) || 
          allRulesContent.includes(module.type.toLowerCase())) {
        understoodModules++;
      }
    }

    return (understoodModules / context.modules.length) * 100;
  }

  /**
   * 评估代码模式识别度
   */
  private assessCodePatternRecognition(
    rules: CursorRule[],
    context: RuleGenerationContext
  ): number {
    if (!context.customPatterns) {
      return 50;
    }

    const allRulesContent = rules.map((r) => r.content).join("\n").toLowerCase();
    let recognizedPatterns = 0;
    let totalPatterns = 0;

    // 检查自定义 Hooks
    if (context.customPatterns.customHooks && context.customPatterns.customHooks.length > 0) {
      totalPatterns++;
      if (allRulesContent.includes("hook") || allRulesContent.includes("hooks")) {
        recognizedPatterns++;
      }
    }

    // 检查自定义工具函数
    if (context.customPatterns.customUtils && context.customPatterns.customUtils.length > 0) {
      totalPatterns++;
      if (allRulesContent.includes("工具") || allRulesContent.includes("util")) {
        recognizedPatterns++;
      }
    }

    // 检查 API 客户端
    if (context.customPatterns.apiClient) {
      totalPatterns++;
      if (allRulesContent.includes("api") || allRulesContent.includes("client")) {
        recognizedPatterns++;
      }
    }

    return totalPatterns > 0 ? (recognizedPatterns / totalPatterns) * 100 : 50;
  }

  /**
   * 评估架构把握度
   */
  private assessArchitectureGrasp(
    rules: CursorRule[],
    context: RuleGenerationContext
  ): number {
    const allRulesContent = rules.map((r) => r.content).join("\n").toLowerCase();
    let graspScore = 0;
    let totalChecks = 0;

    // 检查是否理解项目架构类型
    if (context.modules.length > 1) {
      totalChecks++;
      if (allRulesContent.includes("模块") || allRulesContent.includes("monorepo") || 
          allRulesContent.includes("多模块")) {
        graspScore++;
      }
    }

    // 检查是否理解路由架构
    if (context.frontendRouter || context.backendRouter) {
      totalChecks++;
      if (allRulesContent.includes("路由") || allRulesContent.includes("route")) {
        graspScore++;
      }
    }

    // 检查是否理解文件组织方式
    if (context.fileOrganization) {
      totalChecks++;
      if (allRulesContent.includes("结构") || allRulesContent.includes("组织") ||
          allRulesContent.includes("architecture")) {
        graspScore++;
      }
    }

    return totalChecks > 0 ? (graspScore / totalChecks) * 100 : 50;
  }

  /**
   * 评估实践对齐度
   */
  private assessPracticeAlignment(
    rules: CursorRule[],
    context: RuleGenerationContext
  ): number {
    if (!context.projectPractice) {
      return 50;
    }

    const allRulesContent = rules.map((r) => r.content).join("\n").toLowerCase();
    let alignmentCount = 0;
    let totalChecks = 0;

    // 检查错误处理实践
    if (context.projectPractice.errorHandling) {
      totalChecks++;
      if (allRulesContent.includes("错误") || allRulesContent.includes("error") ||
          allRulesContent.includes("异常")) {
        alignmentCount++;
      }
    }

    // 检查代码风格实践
    if (context.projectPractice.codeStyle) {
      totalChecks++;
      if (allRulesContent.includes("风格") || allRulesContent.includes("style") ||
          allRulesContent.includes("规范")) {
        alignmentCount++;
      }
    }

    // 检查组件模式实践
    if (context.projectPractice.componentPattern) {
      totalChecks++;
      if (allRulesContent.includes("组件") || allRulesContent.includes("component")) {
        alignmentCount++;
      }
    }

    return totalChecks > 0 ? (alignmentCount / totalChecks) * 100 : 50;
  }

  /**
   * 评估规则生成代码的潜在效果
   */
  private async assessCodeGenerationPotential(
    rules: CursorRule[],
    context: RuleGenerationContext
  ): Promise<EffectivenessMetrics["codeGenerationPotential"]> {
    // 1. 规则完整性
    const ruleCompleteness = this.assessRuleCompleteness(rules, context);

    // 2. 示例代码质量
    const exampleQuality = this.assessExampleQuality(rules);

    // 3. 指导清晰度
    const guidelineClarity = this.assessGuidelineClarity(rules);

    // 4. 可操作性指导
    const actionableGuidance = this.assessActionableGuidance(rules);

    const score = (ruleCompleteness + exampleQuality + guidelineClarity + actionableGuidance) / 4;

    return {
      score: Math.round(score),
      indicators: {
        ruleCompleteness,
        exampleQuality,
        guidelineClarity,
        actionableGuidance,
      },
    };
  }

  /**
   * 评估规则完整性
   */
  private assessRuleCompleteness(
    rules: CursorRule[],
    context: RuleGenerationContext
  ): number {
    // 检查是否包含必要的规则类型
    const allRuleNames = rules.map((r) => r.fileName.toLowerCase());
    let completeness = 0;
    let totalChecks = 0;

    // 必须有全局规则
    totalChecks++;
    if (allRuleNames.some((name) => name.includes("global"))) {
      completeness++;
    }

    // 应该有代码风格规则
    totalChecks++;
    if (allRuleNames.some((name) => name.includes("code-style") || name.includes("style"))) {
      completeness++;
    }

    // 应该有架构规则
    totalChecks++;
    if (allRuleNames.some((name) => name.includes("architecture") || name.includes("结构"))) {
      completeness++;
    }

    // 根据技术栈检查特定规则
    if (context.techStack.frameworks.some((f) => f.toLowerCase().includes("react"))) {
      totalChecks++;
      if (allRuleNames.some((name) => name.includes("component") || name.includes("react"))) {
        completeness++;
      }
    }

    return totalChecks > 0 ? (completeness / totalChecks) * 100 : 50;
  }

  /**
   * 评估示例代码质量
   */
  private assessExampleQuality(rules: CursorRule[]): number {
    let totalCodeBlocks = 0;
    let qualityCodeBlocks = 0;

    for (const rule of rules) {
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
      let match;

      while ((match = codeBlockRegex.exec(rule.content)) !== null) {
        totalCodeBlocks++;
        const code = match[2];
        
        // 检查代码块质量（简化评估）
        if (code.length > 20 && code.includes("\n")) {
          // 多行代码，质量较好
          qualityCodeBlocks++;
        } else if (code.length > 10) {
          // 单行但有一定长度
          qualityCodeBlocks += 0.5;
        }
      }
    }

    if (totalCodeBlocks === 0) {
      return 30; // 没有代码示例，分数较低
    }

    return Math.round((qualityCodeBlocks / totalCodeBlocks) * 100);
  }

  /**
   * 评估指导清晰度
   */
  private assessGuidelineClarity(rules: CursorRule[]): number {
    let totalRules = 0;
    let clearRules = 0;

    for (const rule of rules) {
      totalRules++;
      const content = rule.content.toLowerCase();

      // 检查是否有清晰的指导
      const hasGuidelines = 
        content.includes("应该") || content.includes("必须") || 
        content.includes("建议") || content.includes("推荐") ||
        content.includes("避免") || content.includes("不要");

      // 检查是否有结构化的说明
      const hasStructure = 
        (content.match(/^#+\s+/gm) || []).length >= 3; // 至少3个标题

      if (hasGuidelines && hasStructure) {
        clearRules++;
      } else if (hasGuidelines || hasStructure) {
        clearRules += 0.5;
      }
    }

    return totalRules > 0 ? (clearRules / totalRules) * 100 : 50;
  }

  /**
   * 评估可操作性指导
   */
  private assessActionableGuidance(rules: CursorRule[]): number {
    let totalRules = 0;
    let actionableRules = 0;

    for (const rule of rules) {
      totalRules++;
      const content = rule.content.toLowerCase();

      // 检查是否有具体的操作指导
      const hasActionableContent = 
        content.includes("使用") || content.includes("创建") ||
        content.includes("导入") || content.includes("export") ||
        content.includes("import") || content.includes("定义") ||
        content.includes("实现") || content.includes("调用");

      // 检查是否有步骤说明
      const hasSteps = 
        content.includes("步骤") || content.includes("1.") ||
        content.includes("首先") || content.includes("然后");

      if (hasActionableContent && hasSteps) {
        actionableRules++;
      } else if (hasActionableContent) {
        actionableRules += 0.7;
      }
    }

    return totalRules > 0 ? (actionableRules / totalRules) * 100 : 50;
  }

  /**
   * 保存效果跟踪数据
   */
  async saveTracking(
    projectPath: string,
    rules: CursorRule[],
    context: RuleGenerationContext,
    metrics: EffectivenessMetrics
  ): Promise<void> {
    const trackingFilePath = path.join(projectPath, this.trackingFile);
    const trackingDir = path.dirname(trackingFilePath);

    await FileUtils.mkdir(trackingDir);

    // 读取现有数据
    let existingData: any = { history: [] };
    try {
      const content = await FileUtils.readFile(trackingFilePath);
      existingData = JSON.parse(content);
    } catch (error) {
      // 文件不存在，创建新的
    }

    // 添加新的跟踪记录
    const tracking: EffectivenessTracking = {
      projectPath,
      ruleVersion: `v${rules.length}-${Date.now()}`,
      trackedAt: new Date().toISOString(),
      metrics,
      trends: this.calculateTrends(existingData.history || [], metrics),
      recommendations: this.generateRecommendations(metrics),
    };

    existingData.history.push(tracking);
    existingData.lastUpdated = new Date().toISOString();

    // 只保留最近 20 条记录
    if (existingData.history.length > 20) {
      existingData.history = existingData.history.slice(-20);
    }

    await FileUtils.writeFile(
      trackingFilePath,
      JSON.stringify(existingData, null, 2)
    );
  }

  /**
   * 计算趋势
   */
  private calculateTrends(
    history: EffectivenessTracking[],
    currentMetrics: EffectivenessMetrics
  ): EffectivenessTracking["trends"] {
    const trends = {
      projectFit: history.map((h) => h.metrics.projectFit?.score || h.metrics.overall),
      understanding: history.map((h) => h.metrics.understanding?.score || h.metrics.overall),
      codeGenerationPotential: history.map((h) => h.metrics.codeGenerationPotential?.score || h.metrics.overall),
    };

    // 添加当前值
    trends.projectFit.push(currentMetrics.projectFit.score);
    trends.understanding.push(currentMetrics.understanding.score);
    trends.codeGenerationPotential.push(currentMetrics.codeGenerationPotential.score);

    return trends;
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(metrics: EffectivenessMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.projectFit.score < 70) {
      recommendations.push("规则与项目契合度较低，建议：");
      if (metrics.projectFit.indicators.techStackMatch < 70) {
        recommendations.push("- 在规则中补充项目实际使用的技术栈说明");
      }
      if (metrics.projectFit.indicators.structureMatch < 70) {
        recommendations.push("- 完善项目结构描述，确保规则反映实际文件组织方式");
      }
      if (metrics.projectFit.indicators.featureCoverage < 70) {
        recommendations.push("- 增加对项目代码特征的覆盖，补充缺失的特征说明");
      }
    }

    if (metrics.understanding.score < 70) {
      recommendations.push("对项目的理解程度有待提升，建议：");
      if (metrics.understanding.indicators.moduleUnderstanding < 70) {
        recommendations.push("- 深入分析项目模块结构，在规则中体现模块组织方式");
      }
      if (metrics.understanding.indicators.codePatternRecognition < 70) {
        recommendations.push("- 识别并记录项目的代码模式，在规则中提供相应指导");
      }
    }

    if (metrics.codeGenerationPotential.score < 70) {
      recommendations.push("规则生成代码的潜在效果有待提升，建议：");
      if (metrics.codeGenerationPotential.indicators.ruleCompleteness < 70) {
        recommendations.push("- 补充缺失的规则类型，确保规则体系完整");
      }
      if (metrics.codeGenerationPotential.indicators.exampleQuality < 70) {
        recommendations.push("- 增加高质量的代码示例，提供可直接参考的代码模板");
      }
      if (metrics.codeGenerationPotential.indicators.actionableGuidance < 70) {
        recommendations.push("- 提供更具体的操作指导，增加步骤说明");
      }
    }

    if (metrics.overall < 70) {
      recommendations.push("综合效果有待提升，建议重新生成规则或优化现有规则");
    }

    if (recommendations.length === 0) {
      recommendations.push("规则效果良好，继续保持！");
    }

    return recommendations;
  }

  /**
   * 查找文件
   */
  private async findFiles(
    projectPath: string,
    pattern: RegExp
  ): Promise<string[]> {
    // 简化版，实际应该递归搜索
    try {
      const files: string[] = [];
      const srcDir = path.join(projectPath, "src");

      if (await FileUtils.directoryExists(srcDir)) {
        // 使用 collectFiles 方法递归查找
        const allFiles = await FileUtils.collectFiles(srcDir, 10);
        for (const file of allFiles) {
          if (pattern.test(file)) {
            files.push(file);
          }
        }
      }

      return files;
    } catch (error) {
      return [];
    }
  }

  /**
   * 生成效果报告
   */
  generateEffectivenessReport(tracking: EffectivenessTracking): string {
    let report = `# 规则效果评估报告\n\n`;

    report += `综合评分: ${tracking.metrics.overall}% | 项目契合度: ${tracking.metrics.projectFit.score}% | 理解程度: ${tracking.metrics.understanding.score}% | 生成代码潜力: ${tracking.metrics.codeGenerationPotential.score}%\n\n`;

    // 只显示需要改进的关键指标
    const needsImprovement: string[] = [];
    
    if (tracking.metrics.projectFit.indicators.techStackMatch < 70) {
      needsImprovement.push(`技术栈匹配度: ${tracking.metrics.projectFit.indicators.techStackMatch}%`);
    }
    if (tracking.metrics.projectFit.indicators.featureCoverage < 70) {
      needsImprovement.push(`代码特征覆盖度: ${tracking.metrics.projectFit.indicators.featureCoverage}%`);
    }
    if (tracking.metrics.understanding.indicators.moduleUnderstanding < 70) {
      needsImprovement.push(`模块理解度: ${tracking.metrics.understanding.indicators.moduleUnderstanding}%`);
    }
    if (tracking.metrics.codeGenerationPotential.indicators.exampleQuality < 70) {
      needsImprovement.push(`示例代码质量: ${tracking.metrics.codeGenerationPotential.indicators.exampleQuality}%`);
    }

    if (needsImprovement.length > 0) {
      report += `**待优化指标**:\n`;
      for (const item of needsImprovement) {
        report += `- ${item}\n`;
      }
      report += `\n`;
    }

    // 只显示有实际意义的改进建议
    const meaningfulRecommendations = tracking.recommendations.filter(
      (rec) => !rec.includes("规则效果良好")
    );

    if (meaningfulRecommendations.length > 0) {
      report += `**优化建议**:\n`;
      for (const rec of meaningfulRecommendations) {
        report += `- ${rec}\n`;
      }
    }

    return report;
  }
}

