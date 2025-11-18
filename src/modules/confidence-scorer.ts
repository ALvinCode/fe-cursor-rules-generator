/**
 * 精细置信度评估系统
 * 提供 0-100 的数值置信度评分，并详细说明置信度来源
 */

import { RuleGenerationContext } from "../types.js";
import { logger } from "../utils/logger.js";

export interface ConfidenceScore {
  value: number; // 0-100 置信度数值
  level: "very-high" | "high" | "medium" | "low" | "very-low"; // 置信度等级
  sources: ConfidenceSource[]; // 置信度来源
  factors: ConfidenceFactor[]; // 影响因子
  explanation: string; // 置信度说明
  recommendations: string[]; // 提高置信度的建议
}

export interface ConfidenceSource {
  type:
    | "dependency-detection" // 依赖检测
    | "file-structure" // 文件结构
    | "code-analysis" // 代码分析
    | "config-file" // 配置文件
    | "naming-pattern" // 命名模式
    | "documentation" // 文档
    | "user-confirmation"; // 用户确认
  weight: number; // 权重 0-1
  score: number; // 0-100 该来源的分数
  evidence: string[]; // 证据列表
  reliability: "high" | "medium" | "low"; // 可靠性
}

export interface ConfidenceFactor {
  name: string; // 因子名称
  impact: "positive" | "negative" | "neutral"; // 影响方向
  magnitude: number; // 影响幅度 0-1
  description: string; // 描述
}

/**
 * 精细置信度评估器
 */
export class ConfidenceScorer {
  /**
   * 评估技术栈检测的置信度
   */
  assessTechStackConfidence(
    context: RuleGenerationContext
  ): ConfidenceScore {
    const sources: ConfidenceSource[] = [];
    const factors: ConfidenceFactor[] = [];

    // 1. 依赖检测置信度
    const dependencySource = this.assessDependencyDetection(context);
    sources.push(dependencySource);

    // 2. 文件结构置信度
    const fileStructureSource = this.assessFileStructure(context);
    sources.push(fileStructureSource);

    // 3. 代码分析置信度
    const codeAnalysisSource = this.assessCodeAnalysis(context);
    sources.push(codeAnalysisSource);

    // 4. 配置文件置信度
    const configSource = this.assessConfigFiles(context);
    sources.push(configSource);

    // 计算综合置信度
    const totalWeight = sources.reduce((sum, s) => sum + s.weight, 0);
    const weightedScore =
      sources.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight;

    // 评估影响因子
    factors.push(...this.assessConfidenceFactors(context, sources));

    // 调整最终分数（考虑因子影响）
    let finalScore = weightedScore;
    for (const factor of factors) {
      if (factor.impact === "positive") {
        finalScore += factor.magnitude * 5;
      } else if (factor.impact === "negative") {
        finalScore -= factor.magnitude * 5;
      }
    }

    finalScore = Math.max(0, Math.min(100, finalScore));

    // 确定置信度等级
    const level = this.determineConfidenceLevel(finalScore);

    // 生成说明
    const explanation = this.generateExplanation(sources, factors, finalScore);

    // 生成建议
    const recommendations = this.generateRecommendations(
      sources,
      factors,
      finalScore
    );

    return {
      value: Math.round(finalScore),
      level,
      sources,
      factors,
      explanation,
      recommendations,
    };
  }

  /**
   * 评估路由检测的置信度
   */
  assessRoutingConfidence(
    context: RuleGenerationContext,
    routingAnalysis?: any
  ): ConfidenceScore {
    const sources: ConfidenceSource[] = [];
    const factors: ConfidenceFactor[] = [];

    // 1. 依赖检测
    const routingDeps = context.techStack.dependencies.filter((d) =>
      ["react-router", "next", "vue-router", "express", "koa", "fastify"].some(
        (lib) => d.name.includes(lib)
      )
    );

    if (routingDeps.length > 0) {
      sources.push({
        type: "dependency-detection",
        weight: 0.4,
        score: 90,
        evidence: routingDeps.map((d) => `检测到依赖: ${d.name}`),
        reliability: "high",
      });
    }

    // 2. 文件结构检测
    const hasRouteFiles = context.codeFeatures["api-routes"]?.frequency > 0;
    if (hasRouteFiles) {
      sources.push({
        type: "file-structure",
        weight: 0.3,
        score: 85,
        evidence: [
          `检测到 ${context.codeFeatures["api-routes"].frequency} 个路由文件`,
        ],
        reliability: "high",
      });
    }

    // 3. 代码分析
    if (routingAnalysis?.confidence === "high") {
      sources.push({
        type: "code-analysis",
        weight: 0.3,
        score: 90,
        evidence: ["代码分析确认路由系统"],
        reliability: "high",
      });
    } else if (routingAnalysis?.confidence === "medium") {
      sources.push({
        type: "code-analysis",
        weight: 0.3,
        score: 60,
        evidence: ["代码分析部分确认路由系统"],
        reliability: "medium",
      });
    }

    // 计算综合分数
    const totalWeight = sources.reduce((sum, s) => sum + s.weight, 0);
    const weightedScore =
      totalWeight > 0
        ? sources.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight
        : 50;

    const level = this.determineConfidenceLevel(weightedScore);
    const explanation = this.generateExplanation(
      sources,
      factors,
      weightedScore
    );
    const recommendations = this.generateRecommendations(
      sources,
      factors,
      weightedScore
    );

    return {
      value: Math.round(weightedScore),
      level,
      sources,
      factors,
      explanation,
      recommendations,
    };
  }

  /**
   * 评估依赖检测置信度
   */
  private assessDependencyDetection(
    context: RuleGenerationContext
  ): ConfidenceSource {
    const dependencies = context.techStack.dependencies;
    const primaryDeps = dependencies.filter((d) => d.type === "dependency");
    const devDeps = dependencies.filter((d) => d.type === "devDependency");

    let score = 70; // 基础分数
    const evidence: string[] = [];

    if (primaryDeps.length > 0) {
      score += 10;
      evidence.push(`检测到 ${primaryDeps.length} 个生产依赖`);
    }

    if (devDeps.length > 0) {
      score += 5;
      evidence.push(`检测到 ${devDeps.length} 个开发依赖`);
    }

    // 检查是否有版本信息
    const hasVersions = dependencies.some((d) => d.version && d.version !== "");
    if (hasVersions) {
      score += 5;
      evidence.push("依赖包含版本信息");
    }

    // 检查主要框架依赖
    const hasFramework = dependencies.some((d) =>
      ["react", "vue", "angular", "next", "nuxt"].some((f) =>
        d.name.includes(f)
      )
    );
    if (hasFramework) {
      score += 10;
      evidence.push("检测到主要框架依赖");
    }

    return {
      type: "dependency-detection",
      weight: 0.35,
      score: Math.min(100, score),
      evidence,
      reliability: "high",
    };
  }

  /**
   * 评估文件结构置信度
   */
  private assessFileStructure(
    context: RuleGenerationContext
  ): ConfidenceSource {
    let score = 50;
    const evidence: string[] = [];

    // 检查代码特征
    const featureCount = Object.keys(context.codeFeatures).length;
    if (featureCount > 0) {
      score += featureCount * 5;
      evidence.push(`检测到 ${featureCount} 种代码特征`);
    }

    // 检查模块结构
    if (context.modules && context.modules.length > 0) {
      score += 15;
      evidence.push(`检测到 ${context.modules.length} 个模块`);
    }

    // 检查文件组织
    if (context.fileOrganization) {
      score += 10;
      evidence.push("检测到文件组织结构");
    }

    return {
      type: "file-structure",
      weight: 0.25,
      score: Math.min(100, score),
      evidence,
      reliability: "medium",
    };
  }

  /**
   * 评估代码分析置信度
   */
  private assessCodeAnalysis(
    context: RuleGenerationContext
  ): ConfidenceSource {
    let score = 60;
    const evidence: string[] = [];

    // 检查代码特征分析
    const totalFrequency = Object.values(context.codeFeatures).reduce(
      (sum, f) => sum + (f.frequency || 0),
      0
    );

    if (totalFrequency > 0) {
      score += Math.min(20, totalFrequency / 10);
      evidence.push(`代码特征总频率: ${totalFrequency}`);
    }

    // 检查项目实践分析
    if (context.projectPractice) {
      score += 10;
      evidence.push("完成项目实践分析");
    }

    return {
      type: "code-analysis",
      weight: 0.25,
      score: Math.min(100, score),
      evidence,
      reliability: "medium",
    };
  }

  /**
   * 评估配置文件置信度
   */
  private assessConfigFiles(
    context: RuleGenerationContext
  ): ConfidenceSource {
    let score = 50;
    const evidence: string[] = [];

    if (context.projectConfig) {
      score += 20;
      evidence.push("检测到项目配置文件");

      if (context.projectConfig.prettier) {
        score += 5;
        evidence.push("检测到 Prettier 配置");
      }

      if (context.projectConfig.eslint) {
        score += 5;
        evidence.push("检测到 ESLint 配置");
      }

      if (context.projectConfig.typescript) {
        score += 5;
        evidence.push("检测到 TypeScript 配置");
      }
    }

    return {
      type: "config-file",
      weight: 0.15,
      score: Math.min(100, score),
      evidence,
      reliability: "high",
    };
  }

  /**
   * 评估置信度因子
   */
  private assessConfidenceFactors(
    context: RuleGenerationContext,
    sources: ConfidenceSource[]
  ): ConfidenceFactor[] {
    const factors: ConfidenceFactor[] = [];

    // 因子1: 多源一致性
    const sourceScores = sources.map((s) => s.score);
    const scoreVariance =
      sourceScores.reduce((sum, s) => sum + Math.pow(s - 70, 2), 0) /
      sourceScores.length;
    if (scoreVariance < 100) {
      factors.push({
        name: "多源一致性",
        impact: "positive",
        magnitude: 0.3,
        description: "多个检测源的结果一致，提高置信度",
      });
    } else {
      factors.push({
        name: "多源不一致",
        impact: "negative",
        magnitude: 0.2,
        description: "多个检测源的结果差异较大，降低置信度",
      });
    }

    // 因子2: 证据数量
    const totalEvidence = sources.reduce(
      (sum, s) => sum + s.evidence.length,
      0
    );
    if (totalEvidence >= 5) {
      factors.push({
        name: "证据充分",
        impact: "positive",
        magnitude: 0.2,
        description: `收集到 ${totalEvidence} 条证据，置信度较高`,
      });
    } else if (totalEvidence < 2) {
      factors.push({
        name: "证据不足",
        impact: "negative",
        magnitude: 0.3,
        description: `仅收集到 ${totalEvidence} 条证据，置信度较低`,
      });
    }

    // 因子3: 可靠性
    const highReliabilityCount = sources.filter(
      (s) => s.reliability === "high"
    ).length;
    if (highReliabilityCount >= sources.length * 0.6) {
      factors.push({
        name: "高可靠性源",
        impact: "positive",
        magnitude: 0.2,
        description: `${highReliabilityCount}/${sources.length} 个检测源可靠性高`,
      });
    }

    return factors;
  }

  /**
   * 确定置信度等级
   */
  private determineConfidenceLevel(score: number): ConfidenceScore["level"] {
    if (score >= 85) return "very-high";
    if (score >= 70) return "high";
    if (score >= 50) return "medium";
    if (score >= 30) return "low";
    return "very-low";
  }

  /**
   * 生成置信度说明
   */
  private generateExplanation(
    sources: ConfidenceSource[],
    factors: ConfidenceFactor[],
    score: number
  ): string {
    const level = this.determineConfidenceLevel(score);
    const levelNames: Record<ConfidenceScore["level"], string> = {
      "very-high": "非常高",
      high: "高",
      medium: "中等",
      low: "低",
      "very-low": "非常低",
    };

    let explanation = `置信度评分: ${score}/100 (${levelNames[level]})\n\n`;

    explanation += `**主要来源**:\n`;
    for (const source of sources.slice(0, 3)) {
      const sourceNames: Record<ConfidenceSource["type"], string> = {
        "dependency-detection": "依赖检测",
        "file-structure": "文件结构",
        "code-analysis": "代码分析",
        "config-file": "配置文件",
        "naming-pattern": "命名模式",
        documentation: "文档",
        "user-confirmation": "用户确认",
      };
      explanation += `- ${sourceNames[source.type]}: ${source.score}/100 (权重: ${(source.weight * 100).toFixed(0)}%)\n`;
    }

    if (factors.length > 0) {
      explanation += `\n**影响因子**:\n`;
      for (const factor of factors) {
        const impactIcon = factor.impact === "positive" ? "✅" : "⚠️";
        explanation += `${impactIcon} ${factor.name}: ${factor.description}\n`;
      }
    }

    return explanation;
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(
    sources: ConfidenceSource[],
    factors: ConfidenceFactor[],
    score: number
  ): string[] {
    const recommendations: string[] = [];

    if (score < 70) {
      recommendations.push("置信度较低，建议进行以下改进：");

      // 检查证据不足的源
      const lowEvidenceSources = sources.filter((s) => s.evidence.length < 2);
      if (lowEvidenceSources.length > 0) {
        recommendations.push(
          `- 增加 ${lowEvidenceSources.map((s) => s.type).join("、")} 的证据收集`
        );
      }

      // 检查低可靠性源
      const lowReliabilitySources = sources.filter(
        (s) => s.reliability === "low"
      );
      if (lowReliabilitySources.length > 0) {
        recommendations.push(
          `- 提高 ${lowReliabilitySources.map((s) => s.type).join("、")} 的可靠性`
        );
      }

      // 检查负面因子
      const negativeFactors = factors.filter((f) => f.impact === "negative");
      if (negativeFactors.length > 0) {
        recommendations.push(
          `- 解决 ${negativeFactors.map((f) => f.name).join("、")} 问题`
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push("置信度良好，当前检测结果可靠");
    }

    return recommendations;
  }

  /**
   * 生成置信度报告
   */
  generateConfidenceReport(score: ConfidenceScore): string {
    let report = `# 技术栈检测置信度评估报告\n\n`;

    const levelNames: Record<ConfidenceScore["level"], string> = {
      "very-high": "非常高",
      high: "高",
      medium: "中等",
      low: "低",
      "very-low": "非常低",
    };

    report += `技术栈检测置信度: ${score.value}% (${levelNames[score.level]})\n\n`;

    // 只显示低置信度时的关键问题和建议
    if (score.value < 70) {
      const lowReliabilitySources = score.sources.filter(
        (s) => s.reliability === "low"
      );
      const lowEvidenceSources = score.sources.filter(
        (s) => s.evidence.length < 2
      );
      const negativeFactors = score.factors.filter(
        (f) => f.impact === "negative"
      );

      if (lowReliabilitySources.length > 0 || lowEvidenceSources.length > 0 || negativeFactors.length > 0) {
        report += `**关键问题**:\n`;
        
        if (lowEvidenceSources.length > 0) {
          const sourceNames: Record<ConfidenceSource["type"], string> = {
            "dependency-detection": "依赖检测",
            "file-structure": "文件结构",
            "code-analysis": "代码分析",
            "config-file": "配置文件",
            "naming-pattern": "命名模式",
            documentation: "文档",
            "user-confirmation": "用户确认",
          };
          report += `- 证据不足: ${lowEvidenceSources.map((s) => sourceNames[s.type]).join("、")}\n`;
        }
        
        if (negativeFactors.length > 0) {
          report += `- ${negativeFactors.map((f) => f.name).join("、")}\n`;
        }
        
        report += `\n`;
      }

      if (score.recommendations.length > 0 && !score.recommendations.some(rec => rec.includes("置信度良好"))) {
        report += `**优化建议**:\n`;
        for (const rec of score.recommendations) {
          if (!rec.includes("置信度良好")) {
            report += `- ${rec.replace(/^置信度较低，建议进行以下改进：\s*/g, "")}\n`;
          }
        }
      }
    }

    return report;
  }
}

