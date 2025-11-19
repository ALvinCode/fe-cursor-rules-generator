#!/usr/bin/env node
/**
 * 自动化测试脚本
 * 用于测试 cursor-rules-generator 在真实项目中的表现
 */

import * as path from "path";
import * as fs from "fs/promises";
import { FileUtils } from "../src/utils/file-utils.js";
import { logger } from "../src/utils/logger.js";
import { ProjectAnalyzer } from "../src/modules/project-analyzer.js";
import { TechStackDetector } from "../src/modules/tech-stack-detector.js";
import { ModuleDetector } from "../src/modules/module-detector.js";
import { CodeAnalyzer } from "../src/modules/code-analyzer.js";
import { FileStructureLearner } from "../src/modules/file-structure-learner.js";
import { RulesGenerator } from "../src/modules/rules-generator.js";
import { FileWriter } from "../src/modules/file-writer.js";
import { DeepDirectoryAnalyzer } from "../src/modules/deep-directory-analyzer.js";
import { FileTypeIdentifier } from "../src/modules/file-type-identifier.js";
import { FileDependencyAnalyzer } from "../src/modules/file-dependency-analyzer.js";
import { CodeGenerationRequirementParser } from "../src/modules/code-generation-requirement-parser.js";
import { FileLocationDecisionEngine } from "../src/modules/file-location-decision-engine.js";
import { FileSplittingStrategyAnalyzer } from "../src/modules/file-splitting-strategy-analyzer.js";
import { ASTAnalyzer } from "../src/modules/ast-analyzer.js";
import { EnhancedTestReporter } from "../src/modules/enhanced-test-reporter.js";
import type {
  RuleGenerationContext,
  EnhancedFileOrganization,
} from "../src/types.js";

interface TestConfig {
  testProjectPath: string;
  clearRulesBeforeTest: boolean;
  cleanUncommittedFiles: boolean; // 清理未提交的文件
  generateRules: boolean;
  testAnalyzers: boolean;
  testCodeGeneration: boolean;
  outputReport: boolean;
}

interface TestReport {
  timestamp: string;
  testProjectPath: string;
  rulesGenerated: boolean;
  rulesCount: number;
  analyzerResults: {
    deepDirectoryAnalysis?: {
      success: boolean;
      directoryCount: number;
      error?: string;
    };
    fileDependencyAnalysis?: {
      success: boolean;
      dependencyCount: number;
      circularDependencies: number;
      error?: string;
    };
    fileTypeIdentification?: {
      success: boolean;
      fileCount: number;
      error?: string;
    };
  };
  codeGenerationTests?: Array<{
    requirement: string;
    parsed: any;
    locationDecision?: any;
    splittingStrategy?: any;
  }>;
  errors: string[];
  warnings: string[];
}

class ProjectTester {
  private config: TestConfig;
  private report: TestReport;
  private deepAnalysis: any[] = [];
  private architecturePattern: any;
  private fileOrganization: EnhancedFileOrganization | null = null;
  private testResults: any = {
    fileLocationDecisions: [],
    splittingStrategies: [],
    codeGenerationTests: [],
  };

  constructor(config: TestConfig) {
    this.config = config;
    this.report = {
      timestamp: new Date().toISOString(),
      testProjectPath: config.testProjectPath,
      rulesGenerated: false,
      rulesCount: 0,
      analyzerResults: {},
      errors: [],
      warnings: [],
    };
  }

  /**
   * 运行完整测试流程
   */
  async run(): Promise<TestReport> {
    console.log("🚀 开始自动化测试流程...\n");

    try {
      // 1. 验证测试项目路径
      await this.validateTestProject();

      // 2. 清除现有规则和未提交文件（如果需要）
      if (this.config.clearRulesBeforeTest) {
        await this.clearExistingRules();
      }

      if (this.config.cleanUncommittedFiles) {
        await this.cleanUncommittedFiles();
      }

      // 3. 生成规则（如果需要）
      if (this.config.generateRules) {
        await this.generateRules();
      }

      // 4. 测试分析器（如果需要）
      if (this.config.testAnalyzers) {
        await this.testAnalyzers();
      }

      // 5. 测试代码生成（如果需要）
      if (this.config.testCodeGeneration) {
        await this.testCodeGeneration();
      }

      // 6. 生成报告（如果需要）
      if (this.config.outputReport) {
        await this.generateEnhancedReport();
      }

      console.log("\n✅ 测试完成！");
      return this.report;
    } catch (error: any) {
      this.report.errors.push(`测试流程失败: ${error.message}`);
      console.error("❌ 测试失败:", error);
      throw error;
    }
  }

  /**
   * 验证测试项目
   */
  private async validateTestProject(): Promise<void> {
    console.log("📋 验证测试项目...");
    const exists = await FileUtils.fileExists(this.config.testProjectPath);
    if (!exists) {
      throw new Error(`测试项目路径不存在: ${this.config.testProjectPath}`);
    }

    const stats = await fs.stat(this.config.testProjectPath);
    if (!stats.isDirectory()) {
      throw new Error(`测试项目路径不是目录: ${this.config.testProjectPath}`);
    }

    console.log(`✅ 测试项目路径有效: ${this.config.testProjectPath}\n`);
  }

  /**
   * 清除现有规则
   */
  private async clearExistingRules(): Promise<void> {
    console.log("🧹 清除现有规则...");
    const rulesDir = path.join(this.config.testProjectPath, ".cursor", "rules");

    try {
      const exists = await FileUtils.fileExists(rulesDir);
      if (exists) {
        await fs.rm(rulesDir, { recursive: true, force: true });
        console.log("✅ 已清除现有规则文件\n");
      } else {
        console.log("ℹ️  未找到现有规则文件，跳过清除\n");
      }
    } catch (error: any) {
      this.report.warnings.push(`清除规则失败: ${error.message}`);
      console.warn(`⚠️  清除规则时出现警告: ${error.message}\n`);
    }
  }

  /**
   * 清理未提交的文件
   */
  private async cleanUncommittedFiles(): Promise<void> {
    console.log("🧹 清理未提交的文件...");

    try {
      // 检查是否是 git 仓库
      const gitDir = path.join(this.config.testProjectPath, ".git");
      const isGitRepo = await FileUtils.fileExists(gitDir);

      if (!isGitRepo) {
        console.log("ℹ️  不是 git 仓库，跳过清理未提交文件\n");
        return;
      }

      // 使用 git clean 清理未跟踪的文件
      // -f: force, -d: directories, -x: 包括 .gitignore 中的文件
      // 但排除一些重要目录
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      // 先检查 git 状态
      const { stdout: statusOutput } = await execAsync(
        "git status --porcelain",
        { cwd: this.config.testProjectPath }
      );

      if (!statusOutput.trim()) {
        console.log("ℹ️  没有未提交的文件，跳过清理\n");
        return;
      }

      // 清理未跟踪的文件和目录
      // 使用 -n 先预览，然后实际执行
      console.log("  - 检查未跟踪的文件...");
      const { stdout: cleanPreview } = await execAsync(
        "git clean -fdnx",
        { cwd: this.config.testProjectPath }
      );

      if (cleanPreview.trim()) {
        console.log("  - 将清理以下文件/目录:");
        const filesToClean = cleanPreview
          .split("\n")
          .filter((line) => line.startsWith("Would remove"))
          .map((line) => line.replace("Would remove ", ""))
          .slice(0, 10); // 只显示前10个

        filesToClean.forEach((file) => {
          console.log(`    - ${file}`);
        });

        if (filesToClean.length > 10) {
          console.log(`    ... 还有更多文件`);
        }

        // 实际执行清理
        console.log("  - 执行清理...");
        await execAsync("git clean -fdx", {
          cwd: this.config.testProjectPath,
        });

        console.log("✅ 已清理未跟踪的文件\n");
      } else {
        console.log("ℹ️  没有未跟踪的文件需要清理\n");
      }

      // 重置已修改但未提交的文件（可选，更激进）
      // 注意：这会丢失所有未提交的更改
      const { stdout: modifiedFiles } = await execAsync(
        "git diff --name-only",
        { cwd: this.config.testProjectPath }
      );

      if (modifiedFiles.trim()) {
        console.log("  - 检测到已修改的文件，将重置...");
        await execAsync("git reset --hard HEAD", {
          cwd: this.config.testProjectPath,
        });
        console.log("✅ 已重置所有已修改的文件\n");
      }
    } catch (error: any) {
      // 如果 git 命令失败，可能是没有 git 或不在 git 仓库中
      if (error.message.includes("not a git repository")) {
        console.log("ℹ️  不是 git 仓库，跳过清理未提交文件\n");
      } else {
        this.report.warnings.push(`清理未提交文件失败: ${error.message}`);
        console.warn(`⚠️  清理未提交文件时出现警告: ${error.message}\n`);
      }
    }
  }

  /**
   * 生成规则
   */
  private async generateRules(): Promise<void> {
    console.log("📝 生成规则文件...");

    try {
      // 初始化分析器
      const projectAnalyzer = new ProjectAnalyzer();
      const techStackDetector = new TechStackDetector();
      const moduleDetector = new ModuleDetector();
      const codeAnalyzer = new CodeAnalyzer();
      const fileStructureLearner = new FileStructureLearner();
      const rulesGenerator = new RulesGenerator();
      const fileWriter = new FileWriter();

      // 1. 收集文件
      console.log("  - 收集项目文件...");
      const files = await projectAnalyzer.collectFiles(this.config.testProjectPath);

      // 2. 检测技术栈
      console.log("  - 检测技术栈...");
      const techStack = await techStackDetector.detect(
        this.config.testProjectPath,
        files
      );

      // 3. 检测模块
      console.log("  - 检测模块结构...");
      const modules = await moduleDetector.detectModules(
        this.config.testProjectPath,
        files
      );

      // 4. 分析代码特征
      console.log("  - 分析代码特征...");
      const codeFeatures = await codeAnalyzer.analyzeFeatures(
        this.config.testProjectPath,
        files,
        techStack
      );

      // 5. 学习文件结构
      console.log("  - 学习文件结构...");
      const fileOrganization = await fileStructureLearner.learnStructure(
        this.config.testProjectPath,
        files
      );

      // 5.1 深度目录分析
      console.log("  - 深度目录分析...");
      const deepAnalyzer = new DeepDirectoryAnalyzer();
      const deepAnalysis = await deepAnalyzer.analyzeProjectStructure(
        this.config.testProjectPath,
        files,
        modules
      );
      this.deepAnalysis = deepAnalysis;

      // 识别架构模式
      const architecturePattern = await deepAnalyzer.identifyArchitecturePattern(
        deepAnalysis,
        this.config.testProjectPath,
        files
      );
      this.architecturePattern = architecturePattern;

      // 构建增强的文件组织信息
      const enhancedFileOrg: EnhancedFileOrganization = {
        ...fileOrganization,
        deepAnalysis,
        architecturePattern,
      };
      this.fileOrganization = enhancedFileOrg;

      // 6. 生成规则
      console.log("  - 生成规则内容...");
      const context: RuleGenerationContext = {
        projectPath: this.config.testProjectPath,
        techStack,
        modules,
        codeFeatures,
        bestPractices: [],
        includeModuleRules: modules.length > 1,
        fileOrganization: enhancedFileOrg,
      };

      const rules = await rulesGenerator.generate(context);

      // 7. 写入规则
      console.log("  - 写入规则文件...");
      const writeResult = await fileWriter.writeRules(
        this.config.testProjectPath,
        rules,
        enhancedFileOrg
      );

      // 8. 生成 instructions
      const instructions = await rulesGenerator.generateInstructions(context);
      await fileWriter.writeInstructions(instructions);

      this.report.rulesGenerated = true;
      this.report.rulesCount = rules.length;

      console.log(`✅ 已生成 ${rules.length} 个规则文件`);
      console.log(`✅ 已写入 ${writeResult.writtenFiles.length} 个文件\n`);
    } catch (error: any) {
      this.report.errors.push(`生成规则失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 测试分析器
   */
  private async testAnalyzers(): Promise<void> {
    console.log("🔍 测试新分析器...");

    try {
      // 收集文件
      const projectAnalyzer = new ProjectAnalyzer();
      const files = await projectAnalyzer.collectFiles(this.config.testProjectPath);
      const moduleDetector = new ModuleDetector();
      const modules = await moduleDetector.detectModules(
        this.config.testProjectPath,
        files
      );

      // 1. 测试文件类型识别器
      console.log("  - 测试文件类型识别器...");
      try {
        const fileTypeIdentifier = new FileTypeIdentifier();
        const fileTypeMap = await fileTypeIdentifier.identifyFileTypes(
          files.slice(0, 100), // 限制测试文件数量以提高速度
          this.config.testProjectPath
        );

        this.report.analyzerResults.fileTypeIdentification = {
          success: true,
          fileCount: fileTypeMap.size,
        };
        console.log(`    ✅ 识别了 ${fileTypeMap.size} 个文件的类型`);
      } catch (error: any) {
        this.report.analyzerResults.fileTypeIdentification = {
          success: false,
          fileCount: 0,
          error: error.message,
        };
        this.report.errors.push(`文件类型识别失败: ${error.message}`);
        console.error(`    ❌ 文件类型识别失败: ${error.message}`);
      }

      // 2. 测试深度目录分析器
      console.log("  - 测试深度目录分析器...");
      try {
        const deepAnalyzer = new DeepDirectoryAnalyzer();
        const deepAnalysis = await deepAnalyzer.analyzeProjectStructure(
          this.config.testProjectPath,
          files,
          modules
        );

        // 识别架构模式
        const architecturePattern = await deepAnalyzer.identifyArchitecturePattern(
          deepAnalysis,
          this.config.testProjectPath,
          files
        );

        // 检测版本隔离
        const versionIsolation = deepAnalyzer.detectVersionIsolation(deepAnalysis);

        // 检测模块层级
        const moduleHierarchy = deepAnalyzer.detectModuleHierarchy(deepAnalysis, modules);

        this.report.analyzerResults.deepDirectoryAnalysis = {
          success: true,
          directoryCount: deepAnalysis.length,
        };
        console.log(`    ✅ 分析了 ${deepAnalysis.length} 个目录`);
        console.log(`    ✅ 架构模式: ${architecturePattern.type} (${architecturePattern.confidence})`);
        console.log(`    ✅ 版本隔离: ${versionIsolation.hasVersioning ? "是" : "否"}`);
        console.log(`    ✅ 模块层级: ${moduleHierarchy.levels.length} 层`);
      } catch (error: any) {
        this.report.analyzerResults.deepDirectoryAnalysis = {
          success: false,
          directoryCount: 0,
          error: error.message,
        };
        this.report.errors.push(`深度目录分析失败: ${error.message}`);
        console.error(`    ❌ 深度目录分析失败: ${error.message}`);
      }

      // 3. 测试文件依赖关系分析器
      console.log("  - 测试文件依赖关系分析器...");
      try {
        const dependencyAnalyzer = new FileDependencyAnalyzer();
        const dependencyGraph = await dependencyAnalyzer.analyzeDependencies(
          this.config.testProjectPath,
          files.slice(0, 50), // 限制文件数量以提高速度
          modules
        );

        this.report.analyzerResults.fileDependencyAnalysis = {
          success: true,
          dependencyCount: dependencyGraph.edges.length,
          circularDependencies: dependencyGraph.circularDependencies.length,
        };
        console.log(`    ✅ 分析了 ${dependencyGraph.edges.length} 个依赖关系`);
        console.log(`    ✅ 发现 ${dependencyGraph.circularDependencies.length} 个循环依赖`);
      } catch (error: any) {
        this.report.analyzerResults.fileDependencyAnalysis = {
          success: false,
          dependencyCount: 0,
          circularDependencies: 0,
          error: error.message,
        };
        this.report.errors.push(`文件依赖分析失败: ${error.message}`);
        console.error(`    ❌ 文件依赖分析失败: ${error.message}`);
      }

      console.log("");
    } catch (error: any) {
      this.report.errors.push(`分析器测试失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 测试代码生成
   */
  private async testCodeGeneration(): Promise<void> {
    console.log("💻 测试代码生成功能...");

    try {
      const requirementParser = new CodeGenerationRequirementParser();
      const locationEngine = new FileLocationDecisionEngine();
      const splittingAnalyzer = new FileSplittingStrategyAnalyzer();

      // 测试用例
      const testCases = [
        "创建一个用户列表页面组件",
        "创建一个自定义 Hook 用于数据获取",
        "创建一个工具函数用于格式化日期",
        "创建一个 API 服务用于用户管理",
        "创建一个类型定义文件",
      ];

      this.report.codeGenerationTests = [];

      for (const requirement of testCases) {
        console.log(`  - 测试需求: "${requirement}"`);

        try {
          // 解析需求
          const parsed = requirementParser.parseRequirement(requirement, {
            modules: [],
          });

          // 使用实际的文件组织信息
          const fileOrg = this.fileOrganization || {
            structure: [],
            componentLocation: ["src/components"],
            utilsLocation: ["src/utils"],
            hooksLocation: ["src/hooks"],
            namingConvention: {
              components: "PascalCase",
              files: "camelCase",
              useIndexFiles: false,
            },
            deepAnalysis: [],
          };

          // 决策文件位置
          const locationDecision = locationEngine.decideFileLocation(
            parsed.codeType,
            {
              module: parsed.module,
              version: parsed.version,
              complexity: parsed.complexity,
            },
            fileOrg
          );

          // 分析拆分策略
          const splittingStrategy = splittingAnalyzer.analyzeSplittingStrategy(
            fileOrg.deepAnalysis || [],
            parsed.codeType
          );

          // 保存测试结果
          this.testResults.fileLocationDecisions.push({
            requirement,
            decision: locationDecision,
          });

          this.testResults.splittingStrategies.push({
            requirement,
            strategy: splittingStrategy,
          });

          this.report.codeGenerationTests.push({
            requirement,
            parsed,
            locationDecision,
            splittingStrategy,
          });

          console.log(`    ✅ 代码类型: ${parsed.codeType}`);
          console.log(`    ✅ 推荐位置: ${locationDecision.recommendedPath}`);
          console.log(`    ✅ 拆分策略: ${splittingStrategy.splitPattern}`);
        } catch (error: any) {
          this.report.errors.push(`代码生成测试失败 (${requirement}): ${error.message}`);
          console.error(`    ❌ 测试失败: ${error.message}`);
        }
      }

      console.log("");
    } catch (error: any) {
      this.report.errors.push(`代码生成测试失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成增强版测试报告
   */
  private async generateEnhancedReport(): Promise<void> {
    console.log("📊 生成增强版测试报告...");

    if (!this.fileOrganization || this.deepAnalysis.length === 0) {
      console.warn("⚠️  缺少必要数据，生成简化版报告");
      await this.generateReport();
      return;
    }

    try {
      const reporter = new EnhancedTestReporter();
      const reports = await reporter.generateEnhancedReport(
        this.config.testProjectPath,
        {
          deepAnalysis: this.deepAnalysis,
          architecturePattern: this.architecturePattern,
          fileOrganization: this.fileOrganization,
          testResults: this.testResults,
          rulesGenerated: this.report.rulesGenerated,
          rulesCount: this.report.rulesCount,
          errors: this.report.errors,
          warnings: this.report.warnings,
        }
      );

      // 保存 Markdown 报告
      const markdownPath = path.join(
        this.config.testProjectPath,
        ".cursor",
        "test-report.md"
      );
      await FileUtils.writeFile(markdownPath, reports.markdown);
      console.log(`✅ Markdown 报告已保存: ${markdownPath}`);

      // 保存 HTML 报告
      const htmlPath = path.join(
        this.config.testProjectPath,
        ".cursor",
        "test-report.html"
      );
      await FileUtils.writeFile(htmlPath, reports.html);
      console.log(`✅ HTML 报告已保存: ${htmlPath}`);

      // 保存 JSON 报告
      const jsonPath = path.join(
        this.config.testProjectPath,
        ".cursor",
        "test-report.json"
      );
      await FileUtils.writeFile(jsonPath, reports.json);
      console.log(`✅ JSON 报告已保存: ${jsonPath}\n`);
    } catch (error: any) {
      this.report.warnings.push(`生成增强报告失败: ${error.message}`);
      console.warn(`⚠️  生成增强报告失败: ${error.message}`);
      // 回退到简单报告
      await this.generateReport();
    }
  }

  /**
   * 生成简单测试报告（备用）
   */
  private async generateReport(): Promise<void> {
    const reportPath = path.join(
      this.config.testProjectPath,
      ".cursor",
      "test-report.json"
    );

    try {
      await FileUtils.writeFile(reportPath, JSON.stringify(this.report, null, 2));
      console.log(`✅ 测试报告已保存: ${reportPath}\n`);
    } catch (error: any) {
      this.report.warnings.push(`生成报告失败: ${error.message}`);
      console.warn(`⚠️  生成报告失败: ${error.message}\n`);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  // 从命令行参数或环境变量获取测试项目路径
  const testProjectPath =
    process.argv[2] || process.env.TEST_PROJECT_PATH || "";

  if (!testProjectPath) {
    console.error("❌ 请提供测试项目路径");
    console.error("用法: npm run test:project <项目路径>");
    console.error("或设置环境变量: TEST_PROJECT_PATH=<项目路径>");
    process.exit(1);
  }

  const config: TestConfig = {
    testProjectPath: path.resolve(testProjectPath),
    clearRulesBeforeTest: true,
    cleanUncommittedFiles: true, // 默认清理未提交的文件
    generateRules: true,
    testAnalyzers: true,
    testCodeGeneration: true,
    outputReport: true,
  };

  const tester = new ProjectTester(config);
  const report = await tester.run();

  // 输出摘要
  console.log("\n📋 测试摘要:");
  console.log(`  - 规则生成: ${report.rulesGenerated ? "✅" : "❌"} (${report.rulesCount} 个)`);
  console.log(`  - 分析器测试: ${Object.keys(report.analyzerResults).length} 个`);
  console.log(`  - 代码生成测试: ${report.codeGenerationTests?.length || 0} 个`);
  console.log(`  - 错误: ${report.errors.length} 个`);
  console.log(`  - 警告: ${report.warnings.length} 个`);

  if (report.errors.length > 0) {
    console.log("\n❌ 错误列表:");
    report.errors.forEach((error) => console.log(`  - ${error}`));
    process.exit(1);
  }

  process.exit(0);
}

// 运行主函数
main().catch((error) => {
  console.error("❌ 测试脚本执行失败:", error);
  process.exit(1);
});

