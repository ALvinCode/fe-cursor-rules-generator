#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { ProjectAnalyzer } from "./modules/project-analyzer.js";
import { TechStackDetector } from "./modules/tech-stack-detector.js";
import { ModuleDetector } from "./modules/module-detector.js";
import { Context7Integration } from "./modules/context7-integration.js";
import { CodeAnalyzer } from "./modules/code-analyzer.js";
import { ConsistencyChecker } from "./modules/consistency-checker.js";
import { RulesGenerator } from "./modules/rules-generator.js";
import { FileWriter } from "./modules/file-writer.js";
import { RuleValidator } from "./modules/rule-validator.js";
import { PracticeAnalyzer } from "./modules/practice-analyzer.js";
import { ConfigParser } from "./modules/config-parser.js";
import { CustomPatternDetector } from "./modules/custom-pattern-detector.js";
import { FileStructureLearner } from "./modules/file-structure-learner.js";

/**
 * Cursor Rules Generator MCP Server
 * 智能分析项目并生成符合项目特点的 Cursor Rules
 */
class CursorRulesGeneratorServer {
  private server: Server;
  private projectAnalyzer: ProjectAnalyzer;
  private techStackDetector: TechStackDetector;
  private moduleDetector: ModuleDetector;
  private context7Integration: Context7Integration;
  private codeAnalyzer: CodeAnalyzer;
  private consistencyChecker: ConsistencyChecker;
  private rulesGenerator: RulesGenerator;
  private fileWriter: FileWriter;
  private ruleValidator: RuleValidator;
  private practiceAnalyzer: PracticeAnalyzer;
  private configParser: ConfigParser;
  private customPatternDetector: CustomPatternDetector;
  private fileStructureLearner: FileStructureLearner;

  constructor() {
    this.server = new Server(
      {
        name: "cursor-rules-generator",
        version: "1.2.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // 初始化各个模块
    this.projectAnalyzer = new ProjectAnalyzer();
    this.techStackDetector = new TechStackDetector();
    this.moduleDetector = new ModuleDetector();
    this.context7Integration = new Context7Integration();
    this.codeAnalyzer = new CodeAnalyzer();
    this.consistencyChecker = new ConsistencyChecker();
    this.rulesGenerator = new RulesGenerator();
    this.fileWriter = new FileWriter();
    this.ruleValidator = new RuleValidator();
    this.practiceAnalyzer = new PracticeAnalyzer();
    this.configParser = new ConfigParser();
    this.customPatternDetector = new CustomPatternDetector();
    this.fileStructureLearner = new FileStructureLearner();

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // 注册工具列表
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "generate_cursor_rules",
            description:
              "分析项目并生成适合的 Cursor Rules。支持自动检测技术栈、分析代码特征、集成最佳实践，并生成全局和模块特定的规则文件。",
            inputSchema: {
              type: "object",
              properties: {
                projectPath: {
                  type: "string",
                  description: "项目根目录的绝对路径",
                },
                updateDescription: {
                  type: "boolean",
                  description:
                    "当发现项目描述与实际实现不一致时，是否自动更新描述文件（默认为 false，会先询问用户）",
                  default: false,
                },
                includeModuleRules: {
                  type: "boolean",
                  description:
                    "是否为多模块项目生成模块特定的规则（默认为 true）",
                  default: true,
                },
              },
              required: ["projectPath"],
            },
          },
          {
            name: "analyze_project",
            description:
              "仅分析项目结构和特征，不生成规则。返回项目的技术栈、模块结构、代码特征等详细信息。",
            inputSchema: {
              type: "object",
              properties: {
                projectPath: {
                  type: "string",
                  description: "项目根目录的绝对路径",
                },
              },
              required: ["projectPath"],
            },
          },
          {
            name: "check_consistency",
            description:
              "检查项目描述文档（如 README）与实际代码实现的一致性，识别可能的差异。",
            inputSchema: {
              type: "object",
              properties: {
                projectPath: {
                  type: "string",
                  description: "项目根目录的绝对路径",
                },
              },
              required: ["projectPath"],
            },
          },
          {
            name: "update_project_description",
            description:
              "根据实际代码实现更新项目描述文档，确保文档与代码保持一致。",
            inputSchema: {
              type: "object",
              properties: {
                projectPath: {
                  type: "string",
                  description: "项目根目录的绝对路径",
                },
                descriptionFile: {
                  type: "string",
                  description: "要更新的描述文件路径（相对于项目根目录）",
                  default: "README.md",
                },
              },
              required: ["projectPath"],
            },
          },
          {
            name: "validate_rules",
            description:
              "验证 Cursor Rules 文件的格式和内容是否正确，检查元数据完整性、Markdown 格式等。",
            inputSchema: {
              type: "object",
              properties: {
                projectPath: {
                  type: "string",
                  description: "项目根目录的绝对路径",
                },
                validateModules: {
                  type: "boolean",
                  description: "是否验证模块目录中的规则文件（默认为 true）",
                  default: true,
                },
              },
              required: ["projectPath"],
            },
          },
        ] as Tool[],
      };
    });

    // 注册工具调用处理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "generate_cursor_rules":
            return await this.handleGenerateRules(args);
          case "analyze_project":
            return await this.handleAnalyzeProject(args);
          case "check_consistency":
            return await this.handleCheckConsistency(args);
          case "update_project_description":
            return await this.handleUpdateDescription(args);
          case "validate_rules":
            return await this.handleValidateRules(args);
          default:
            throw new Error(`未知的工具: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  /**
   * 处理生成 Cursor Rules 的请求
   */
  private async handleGenerateRules(args: any) {
    const projectPath = args.projectPath as string;
    const updateDescription = (args.updateDescription as boolean) ?? false;
    const includeModuleRules = (args.includeModuleRules as boolean) ?? true;

    // 1. 收集项目文件
    const files = await this.projectAnalyzer.collectFiles(projectPath);

    // 2. 检测技术栈
    const techStack = await this.techStackDetector.detect(projectPath, files);

    // 3. 检测模块结构
    const modules = await this.moduleDetector.detectModules(projectPath, files);

    // 4. 分析代码特征
    const codeFeatures = await this.codeAnalyzer.analyzeFeatures(
      projectPath,
      files,
      techStack
    );

    // 4.5 解析项目配置（v1.2 新增）
    console.error("解析项目配置...");
    const projectConfig = await this.configParser.parseProjectConfig(projectPath);

    // 4.6 分析项目实践（v1.2 新增）
    console.error("分析项目实践...");
    const errorHandling = await this.practiceAnalyzer.analyzeErrorHandling(projectPath, files);
    const codeStyle = await this.practiceAnalyzer.analyzeCodeStyle(projectPath, files);
    const componentPattern = await this.practiceAnalyzer.analyzeComponentPatterns(projectPath, files);
    
    const projectPractice = {
      errorHandling,
      codeStyle,
      componentPattern,
    };

    // 4.7 检测自定义模式（v1.2 新增）
    console.error("检测自定义模式...");
    const customHooks = await this.customPatternDetector.detectCustomHooks(projectPath, files);
    const customUtils = await this.customPatternDetector.detectCustomUtils(projectPath, files);
    const apiClient = await this.customPatternDetector.detectAPIClient(projectPath, files);
    
    const customPatterns = {
      customHooks,
      customUtils,
      apiClient,
    };

    // 4.8 学习文件组织结构（v1.2 新增）
    console.error("学习文件组织结构...");
    const fileOrganization = await this.fileStructureLearner.learnStructure(projectPath, files);

    // 5. 获取最佳实践（通过 Context7）
    const bestPractices = await this.context7Integration.getBestPractices(
      techStack.dependencies
    );

    // 6. 检查一致性
    const consistencyReport = await this.consistencyChecker.check(
      projectPath,
      files,
      techStack,
      codeFeatures
    );

    // 7. 如果有差异，处理更新逻辑
    let descriptionUpdated = false;
    if (consistencyReport.hasInconsistencies) {
      if (updateDescription) {
        await this.consistencyChecker.updateDescriptions(
          projectPath,
          consistencyReport
        );
        descriptionUpdated = true;
      }
    }

    // 8. 生成规则（v1.2 增强）
    const rules = await this.rulesGenerator.generate({
      projectPath,
      techStack,
      modules,
      codeFeatures,
      bestPractices,
      includeModuleRules,
      // v1.2 新增字段
      projectPractice,
      projectConfig,
      customPatterns,
      fileOrganization,
    });

    // 9. 写入规则文件
    const writtenFiles = await this.fileWriter.writeRules(projectPath, rules);

    // 10. 生成摘要
    const summary = this.rulesGenerator.generateSummary(rules, projectPath);

    return {
      content: [
        {
          type: "text",
          text: `✅ Cursor Rules 生成成功！

📁 生成的文件：
${writtenFiles.map((f) => `  - ${f}`).join("\n")}

📊 项目分析结果：
  - 主要技术栈: ${techStack.primary.join(", ")}
  - 检测到的模块: ${modules.length} 个
  - 代码特征: ${Object.keys(codeFeatures).length} 项

${consistencyReport.hasInconsistencies ? `⚠️  一致性检查：
  - 发现 ${consistencyReport.inconsistencies.length} 处不一致
  ${descriptionUpdated ? "  - ✅ 描述文件已更新" : "  - ℹ️  描述文件未更新（请手动确认）"}
` : ""}
📝 规则摘要：
${summary}

💡 提示：
  - 全局规则会在项目任何位置生效
  - 模块规则只在对应模块目录中生效
  - Cursor 会根据当前打开的文件位置自动加载相应规则
`,
        },
      ],
    };
  }

  /**
   * 处理分析项目的请求
   */
  private async handleAnalyzeProject(args: any) {
    const projectPath = args.projectPath as string;

    const files = await this.projectAnalyzer.collectFiles(projectPath);
    const techStack = await this.techStackDetector.detect(projectPath, files);
    const modules = await this.moduleDetector.detectModules(projectPath, files);
    const codeFeatures = await this.codeAnalyzer.analyzeFeatures(
      projectPath,
      files,
      techStack
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              files: {
                total: files.length,
                byType: this.groupFilesByType(files),
              },
              techStack,
              modules: modules.map((m) => ({
                name: m.name,
                path: m.path,
                type: m.type,
              })),
              codeFeatures,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * 处理一致性检查请求
   */
  private async handleCheckConsistency(args: any) {
    const projectPath = args.projectPath as string;

    const files = await this.projectAnalyzer.collectFiles(projectPath);
    const techStack = await this.techStackDetector.detect(projectPath, files);
    const codeFeatures = await this.codeAnalyzer.analyzeFeatures(
      projectPath,
      files,
      techStack
    );
    const report = await this.consistencyChecker.check(
      projectPath,
      files,
      techStack,
      codeFeatures
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(report, null, 2),
        },
      ],
    };
  }

  /**
   * 处理更新描述文件的请求
   */
  private async handleUpdateDescription(args: any) {
    const projectPath = args.projectPath as string;
    const descriptionFile = (args.descriptionFile as string) ?? "README.md";

    const files = await this.projectAnalyzer.collectFiles(projectPath);
    const techStack = await this.techStackDetector.detect(projectPath, files);
    const codeFeatures = await this.codeAnalyzer.analyzeFeatures(
      projectPath,
      files,
      techStack
    );
    const report = await this.consistencyChecker.check(
      projectPath,
      files,
      techStack,
      codeFeatures
    );

    if (!report.hasInconsistencies) {
      return {
        content: [
          {
            type: "text",
            text: "✅ 项目描述与实际实现一致，无需更新。",
          },
        ],
      };
    }

    await this.consistencyChecker.updateDescriptions(projectPath, report);

    return {
      content: [
        {
          type: "text",
          text: `✅ 描述文件已更新！\n\n更新的内容：\n${report.inconsistencies.map((inc) => `  - ${inc.description}`).join("\n")}`,
        },
      ],
    };
  }

  /**
   * 处理验证规则的请求
   */
  private async handleValidateRules(args: any) {
    const projectPath = args.projectPath as string;
    const validateModules = (args.validateModules as boolean) ?? true;
    const path = await import("path");

    const allResults = [];

    // 验证全局规则
    const globalRulesDir = path.join(projectPath, ".cursor", "rules");
    const globalResults = await this.ruleValidator.validateRulesDirectory(
      globalRulesDir
    );
    allResults.push(...globalResults);

    // 如果启用模块验证，验证模块规则
    if (validateModules) {
      const files = await this.projectAnalyzer.collectFiles(projectPath);
      const modules = await this.moduleDetector.detectModules(
        projectPath,
        files
      );

      for (const module of modules) {
        if (module.path !== projectPath) {
          const moduleRulesDir = path.join(module.path, ".cursor", "rules");
          const moduleResults = await this.ruleValidator.validateRulesDirectory(
            moduleRulesDir
          );
          allResults.push(...moduleResults);
        }
      }
    }

    // 生成报告
    const report = this.ruleValidator.generateReport(allResults);

    return {
      content: [
        {
          type: "text",
          text: report,
        },
      ],
    };
  }

  private groupFilesByType(files: string[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const file of files) {
      const ext = file.split(".").pop() || "unknown";
      groups[ext] = (groups[ext] || 0) + 1;
    }
    return groups;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Cursor Rules Generator MCP Server 已启动");
  }
}

// 启动服务器
const server = new CursorRulesGeneratorServer();
server.run().catch((error) => {
  console.error("服务器启动失败:", error);
  process.exit(1);
});

