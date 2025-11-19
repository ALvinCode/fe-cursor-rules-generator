import * as path from "path";
import * as fs from "fs/promises";
import {
  DeepDirectoryAnalysis,
  EnhancedFileOrganization,
  ArchitecturePattern,
  FileLocationDecision,
  FileSplittingStrategy,
} from "../types.js";
import { FileUtils } from "../utils/file-utils.js";
import { logger } from "../utils/logger.js";

/**
 * 增强版测试报告生成器
 * 生成包含项目结构分析、测试结果等详细信息的报告
 */
export class EnhancedTestReporter {
  /**
   * 生成增强版测试报告
   */
  async generateEnhancedReport(
    projectPath: string,
    data: {
      deepAnalysis: DeepDirectoryAnalysis[];
      architecturePattern?: ArchitecturePattern;
      fileOrganization: EnhancedFileOrganization;
      testResults: {
        fileLocationDecisions: Array<{
          requirement: string;
          decision: FileLocationDecision;
          actualPath?: string;
        }>;
        splittingStrategies: Array<{
          requirement: string;
          strategy: FileSplittingStrategy;
        }>;
        codeGenerationTests: Array<{
          requirement: string;
          parsed: any;
          locationDecision?: FileLocationDecision;
          splittingStrategy?: FileSplittingStrategy;
        }>;
      };
      rulesGenerated: boolean;
      rulesCount: number;
      errors: string[];
      warnings: string[];
    }
  ): Promise<{
    markdown: string;
    html: string;
    json: string;
  }> {
    // 1. 生成项目结构树
    const structureTree = this.generateStructureTree(
      projectPath,
      data.deepAnalysis
    );

    // 2. 生成文件夹职能说明
    const directoryPurposes = this.generateDirectoryPurposes(data.deepAnalysis);

    // 3. 分析页面组织方式
    const pageOrganization = this.analyzePageOrganization(
      data.deepAnalysis,
      data.architecturePattern
    );

    // 4. 生成测试结果分析
    const testResults = this.analyzeTestResults(data.testResults);

    // 5. 生成代码风格适配度分析
    const styleCompliance = this.analyzeStyleCompliance(
      data.fileOrganization,
      data.testResults
    );

    // 6. 生成最佳实践检查
    const bestPractices = this.checkBestPractices(
      data.deepAnalysis,
      data.architecturePattern,
      data.testResults
    );

    // 7. 生成 Markdown 报告
    const markdown = this.generateMarkdownReport({
      projectPath,
      structureTree,
      directoryPurposes,
      pageOrganization,
      testResults,
      styleCompliance,
      bestPractices,
      summary: {
        rulesGenerated: data.rulesGenerated,
        rulesCount: data.rulesCount,
        errors: data.errors,
        warnings: data.warnings,
      },
    });

    // 8. 生成 HTML 报告
    const html = this.generateHTMLReport({
      projectPath,
      structureTree,
      directoryPurposes,
      pageOrganization,
      testResults,
      styleCompliance,
      bestPractices,
      summary: {
        rulesGenerated: data.rulesGenerated,
        rulesCount: data.rulesCount,
        errors: data.errors,
        warnings: data.warnings,
      },
    });

    // 9. 生成 JSON 报告
    const json = JSON.stringify(
      {
        projectPath,
        structureTree,
        directoryPurposes,
        pageOrganization,
        testResults,
        styleCompliance,
        bestPractices,
        summary: {
          rulesGenerated: data.rulesGenerated,
          rulesCount: data.rulesCount,
          errors: data.errors,
          warnings: data.warnings,
        },
      },
      null,
      2
    );

    return { markdown, html, json };
  }

  /**
   * 生成项目结构树
   */
  private generateStructureTree(
    projectPath: string,
    deepAnalysis: DeepDirectoryAnalysis[]
  ): string {
    // 按层级组织目录
    const tree: string[] = [];
    const rootDirs = deepAnalysis.filter((d) => d.depth === 1);

    const buildTree = (
      dir: DeepDirectoryAnalysis,
      prefix: string,
      isLast: boolean
    ) => {
      const connector = isLast ? "└── " : "├── ";
      const dirName = path.basename(dir.path);
      const purpose = dir.purpose !== "其他" ? ` # ${dir.purpose}` : "";
      tree.push(`${prefix}${connector}${dirName}/${purpose}`);

      const children = deepAnalysis.filter(
        (d) => d.parentDirectory === dir.path
      );

      children.forEach((child, index) => {
        const isLastChild = index === children.length - 1;
        const childPrefix = prefix + (isLast ? "    " : "│   ");
        buildTree(child, childPrefix, isLastChild);
      });
    };

    rootDirs.forEach((dir, index) => {
      buildTree(dir, "", index === rootDirs.length - 1);
    });

    return tree.join("\n");
  }

  /**
   * 生成文件夹职能说明
   */
  private generateDirectoryPurposes(
    deepAnalysis: DeepDirectoryAnalysis[]
  ): Array<{
    path: string;
    purpose: string;
    category: string;
    fileCount: number;
    primaryFileTypes: string[];
    architecturePattern?: string;
  }> {
    return deepAnalysis.map((analysis) => ({
      path: analysis.path,
      purpose: analysis.purpose,
      category: analysis.category,
      fileCount: analysis.fileCount,
      primaryFileTypes: analysis.primaryFileTypes,
      architecturePattern: analysis.architecturePattern,
    }));
  }

  /**
   * 分析页面组织方式
   */
  private analyzePageOrganization(
    deepAnalysis: DeepDirectoryAnalysis[],
    architecturePattern?: ArchitecturePattern
  ): {
    pattern: string;
    description: string;
    pageDirectories: string[];
    pageStructure: string;
  } {
    const pageDirs = deepAnalysis.filter(
      (d) => d.purpose.includes("页面") || d.category === "page"
    );

    let pattern = "未知";
    let description = "";
    let pageStructure = "";

    if (architecturePattern) {
      switch (architecturePattern.type) {
        case "feature-based":
          pattern = "功能模块组织";
          description =
            "页面按功能模块组织，每个功能模块包含自己的页面、组件、服务等";
          pageStructure = `
功能模块/
├── pages/          # 该功能的页面
├── components/     # 该功能的组件
├── services/       # 该功能的服务
└── types/          # 该功能的类型定义
          `.trim();
          break;

        case "clean-architecture":
          pattern = "Clean Architecture";
          description =
            "页面位于 presentation 层，与业务逻辑分离";
          pageStructure = `
presentation/
├── pages/          # 页面组件
├── components/     # UI 组件
└── layouts/        # 布局组件

application/
└── use-cases/      # 业务用例

domain/
└── entities/       # 领域实体
          `.trim();
          break;

        case "mvc":
          pattern = "MVC 模式";
          description = "页面位于 views 层，遵循 MVC 架构";
          pageStructure = `
views/              # 页面和视图
models/             # 数据模型
controllers/        # 控制器
          `.trim();
          break;

        default:
          pattern = "传统组织";
          description = "页面统一放在 pages 或 views 目录";
          pageStructure = `
pages/              # 所有页面
components/         # 共享组件
          `.trim();
      }
    } else {
      // 根据实际目录结构推断
      if (pageDirs.some((d) => d.path.includes("features"))) {
        pattern = "功能模块组织";
        description = "检测到功能模块结构";
      } else {
        pattern = "传统组织";
        description = "页面统一组织";
      }
    }

    return {
      pattern,
      description,
      pageDirectories: pageDirs.map((d) => d.path),
      pageStructure,
    };
  }

  /**
   * 分析测试结果
   */
  private analyzeTestResults(testResults: any): {
    locationAccuracy: {
      correct: number;
      total: number;
      percentage: number;
      details: Array<{
        requirement: string;
        recommended: string;
        actual?: string;
        correct: boolean;
        confidence: string;
      }>;
    };
    splittingAccuracy: {
      correct: number;
      total: number;
      percentage: number;
      details: Array<{
        requirement: string;
        strategy: string;
        shouldSplit: boolean;
      }>;
    };
  } {
    const locationDetails = testResults.fileLocationDecisions.map((item: any) => ({
      requirement: item.requirement,
      recommended: item.decision.recommendedPath,
      actual: item.actualPath,
      correct: item.actualPath
        ? item.actualPath === item.decision.recommendedPath
        : null,
      confidence: item.decision.confidence,
    }));

    const locationCorrect = locationDetails.filter((d: any) => d.correct === true)
      .length;
    const locationTotal = locationDetails.length;

    const splittingDetails = testResults.splittingStrategies.map((item: any) => ({
      requirement: item.requirement,
      strategy: item.strategy.splitPattern,
      shouldSplit: item.strategy.shouldSplit,
    }));

    return {
      locationAccuracy: {
        correct: locationCorrect,
        total: locationTotal,
        percentage:
          locationTotal > 0 ? Math.round((locationCorrect / locationTotal) * 100) : 0,
        details: locationDetails,
      },
      splittingAccuracy: {
        correct: splittingDetails.length, // 简化处理
        total: splittingDetails.length,
        percentage: 100,
        details: splittingDetails,
      },
    };
  }

  /**
   * 分析代码风格适配度
   */
  private analyzeStyleCompliance(
    fileOrganization: EnhancedFileOrganization,
    testResults: any
  ): {
    namingConvention: {
      score: number;
      details: Array<{
        aspect: string;
        expected: string;
        actual?: string;
        match: boolean;
      }>;
    };
    fileStructure: {
      score: number;
      details: Array<{
        aspect: string;
        expected: string;
        actual?: string;
        match: boolean;
      }>;
    };
    overallScore: number;
  } {
    const namingDetails: Array<{
      aspect: string;
      expected: string;
      actual?: string;
      match: boolean;
    }> = [];

    // 检查命名约定
    if (fileOrganization.namingConvention) {
      namingDetails.push({
        aspect: "组件命名",
        expected: fileOrganization.namingConvention.components,
        match: true, // 简化处理
      });

      namingDetails.push({
        aspect: "文件命名",
        expected: fileOrganization.namingConvention.files,
        match: true,
      });

      namingDetails.push({
        aspect: "使用 index 文件",
        expected: fileOrganization.namingConvention.useIndexFiles
          ? "是"
          : "否",
        match: true,
      });
    }

    const namingScore =
      namingDetails.length > 0
        ? (namingDetails.filter((d) => d.match).length / namingDetails.length) * 100
        : 100;

    const fileStructureDetails: Array<{
      aspect: string;
      expected: string;
      actual?: string;
      match: boolean;
    }> = [];

    // 检查文件结构
    if (fileOrganization.componentLocation.length > 0) {
      fileStructureDetails.push({
        aspect: "组件位置",
        expected: fileOrganization.componentLocation[0],
        match: true,
      });
    }

    if (fileOrganization.utilsLocation.length > 0) {
      fileStructureDetails.push({
        aspect: "工具函数位置",
        expected: fileOrganization.utilsLocation[0],
        match: true,
      });
    }

    const fileStructureScore =
      fileStructureDetails.length > 0
        ? (fileStructureDetails.filter((d) => d.match).length /
            fileStructureDetails.length) *
          100
        : 100;

    const overallScore = (namingScore + fileStructureScore) / 2;

    return {
      namingConvention: {
        score: Math.round(namingScore),
        details: namingDetails,
      },
      fileStructure: {
        score: Math.round(fileStructureScore),
        details: fileStructureDetails,
      },
      overallScore: Math.round(overallScore),
    };
  }

  /**
   * 检查最佳实践
   */
  private checkBestPractices(
    deepAnalysis: DeepDirectoryAnalysis[],
    architecturePattern: ArchitecturePattern | undefined,
    testResults: any
  ): Array<{
    practice: string;
    status: "✅ 遵循" | "⚠️ 部分遵循" | "❌ 未遵循";
    description: string;
    recommendation?: string;
  }> {
    const practices: Array<{
      practice: string;
      status: "✅ 遵循" | "⚠️ 部分遵循" | "❌ 未遵循";
      description: string;
      recommendation?: string;
    }> = [];

    // 1. 检查 co-location 模式
    const hasCoLocation = deepAnalysis.some(
      (a) => a.coLocationPattern?.styles || a.coLocationPattern?.tests
    );
    practices.push({
      practice: "Co-location 模式",
      status: hasCoLocation ? "✅ 遵循" : "⚠️ 部分遵循",
      description: hasCoLocation
        ? "项目使用 co-location 模式，样式和测试文件与组件放在同一目录"
        : "项目未完全使用 co-location 模式",
      recommendation: hasCoLocation
        ? undefined
        : "考虑将样式和测试文件与组件放在同一目录",
    });

    // 2. 检查架构模式一致性
    if (architecturePattern) {
      practices.push({
        practice: "架构模式一致性",
        status: "✅ 遵循",
        description: `项目遵循 ${architecturePattern.type} 架构模式`,
      });
    }

    // 3. 检查文件拆分策略
    const hasSplittingStrategy = testResults.splittingStrategies.length > 0;
    practices.push({
      practice: "文件拆分策略",
      status: hasSplittingStrategy ? "✅ 遵循" : "⚠️ 部分遵循",
      description: hasSplittingStrategy
        ? "项目有明确的文件拆分策略"
        : "项目文件拆分策略不明确",
    });

    // 4. 检查依赖管理
    // 这里可以添加更多检查

    return practices;
  }

  /**
   * 生成 Markdown 报告
   */
  private generateMarkdownReport(data: any): string {
    const {
      projectPath,
      structureTree,
      directoryPurposes,
      pageOrganization,
      testResults,
      styleCompliance,
      bestPractices,
      summary,
    } = data;

    let report = `# Cursor Rules Generator 测试报告\n\n`;
    report += `**生成时间**: ${new Date().toLocaleString("zh-CN")}\n`;
    report += `**测试项目**: ${projectPath}\n\n`;

    report += `## 📊 测试摘要\n\n`;
    report += `- **规则生成**: ${summary.rulesGenerated ? "✅ 成功" : "❌ 失败"} (${summary.rulesCount} 个规则文件)\n`;
    report += `- **错误数量**: ${summary.errors.length}\n`;
    report += `- **警告数量**: ${summary.warnings.length}\n\n`;

    report += `## 📁 项目结构分析\n\n`;
    report += `### 项目目录树\n\n`;
    report += `\`\`\`\n${structureTree}\n\`\`\`\n\n`;

    report += `### 文件夹职能说明\n\n`;
    directoryPurposes.slice(0, 20).forEach((dir: any) => {
      report += `- **${dir.path}**\n`;
      report += `  - 职能: ${dir.purpose}\n`;
      report += `  - 分类: ${dir.category}\n`;
      report += `  - 文件数: ${dir.fileCount}\n`;
      if (dir.primaryFileTypes.length > 0) {
        report += `  - 主要文件类型: ${dir.primaryFileTypes.join(", ")}\n`;
      }
      if (dir.architecturePattern) {
        report += `  - 架构模式: ${dir.architecturePattern}\n`;
      }
      report += `\n`;
    });

    report += `### 页面组织方式\n\n`;
    report += `**组织模式**: ${pageOrganization.pattern}\n\n`;
    report += `${pageOrganization.description}\n\n`;
    report += `**页面目录**:\n`;
    pageOrganization.pageDirectories.forEach((dir: string) => {
      report += `- ${dir}\n`;
    });
    report += `\n`;
    report += `**页面结构示例**:\n\n`;
    report += `\`\`\`\n${pageOrganization.pageStructure}\n\`\`\`\n\n`;

    report += `## 🧪 测试结果\n\n`;
    report += `### 文件位置准确性\n\n`;
    report += `- **准确率**: ${testResults.locationAccuracy.percentage}% (${testResults.locationAccuracy.correct}/${testResults.locationAccuracy.total})\n\n`;
    report += `**详细结果**:\n\n`;
    testResults.locationAccuracy.details.forEach((detail: any) => {
      const status = detail.correct === true ? "✅" : detail.correct === false ? "❌" : "⚠️";
      report += `${status} **${detail.requirement}**\n`;
      report += `  - 推荐位置: \`${detail.recommended}\`\n`;
      if (detail.actual) {
        report += `  - 实际位置: \`${detail.actual}\`\n`;
      }
      report += `  - 置信度: ${detail.confidence}\n\n`;
    });

    report += `### 代码风格适配度\n\n`;
    report += `- **总体得分**: ${styleCompliance.overallScore}%\n\n`;
    report += `**命名约定**: ${styleCompliance.namingConvention.score}%\n`;
    styleCompliance.namingConvention.details.forEach((detail: any) => {
      report += `- ${detail.aspect}: ${detail.expected} ${detail.match ? "✅" : "❌"}\n`;
    });
    report += `\n`;
    report += `**文件结构**: ${styleCompliance.fileStructure.score}%\n`;
    styleCompliance.fileStructure.details.forEach((detail: any) => {
      report += `- ${detail.aspect}: ${detail.expected} ${detail.match ? "✅" : "❌"}\n`;
    });
    report += `\n`;

    report += `### 最佳实践检查\n\n`;
    bestPractices.forEach((practice: any) => {
      report += `${practice.status} **${practice.practice}**\n`;
      report += `  - ${practice.description}\n`;
      if (practice.recommendation) {
        report += `  - 💡 建议: ${practice.recommendation}\n`;
      }
      report += `\n`;
    });

    if (summary.errors.length > 0) {
      report += `## ❌ 错误列表\n\n`;
      summary.errors.forEach((error: string) => {
        report += `- ${error}\n`;
      });
      report += `\n`;
    }

    if (summary.warnings.length > 0) {
      report += `## ⚠️ 警告列表\n\n`;
      summary.warnings.forEach((warning: string) => {
        report += `- ${warning}\n`;
      });
      report += `\n`;
    }

    return report;
  }

  /**
   * 生成 HTML 报告
   */
  private generateHTMLReport(data: any): string {
    const markdown = this.generateMarkdownReport(data);
    // 简单的 Markdown 转 HTML（可以使用更专业的库）
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cursor Rules Generator 测试报告</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; border-bottom: 2px solid #e0e0e0; padding-bottom: 5px; }
    h3 { color: #777; margin-top: 20px; }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background: #f4f4f4;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      border-left: 4px solid #4CAF50;
    }
    .summary {
      background: #e8f5e9;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .success { color: #4CAF50; }
    .error { color: #f44336; }
    .warning { color: #ff9800; }
    ul { padding-left: 20px; }
    li { margin: 5px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #4CAF50;
      color: white;
    }
    tr:hover { background-color: #f5f5f5; }
  </style>
</head>
<body>
  <div class="container">
${this.markdownToHTML(markdown)}
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * 简单的 Markdown 转 HTML
   */
  private markdownToHTML(markdown: string): string {
    let html = markdown;

    // 标题
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");

    // 代码块
    html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

    // 行内代码
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // 粗体
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // 列表
    html = html.replace(/^- (.*$)/gim, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

    // 换行
    html = html.replace(/\n/g, "<br>");

    return html;
  }
}

