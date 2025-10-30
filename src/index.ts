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
import { RouterDetector } from "./modules/router-detector.js";

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
  private routerDetector: RouterDetector;

  constructor() {
    this.server = new Server(
      {
        name: "cursor-rules-generator",
        version: "1.3.5",
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
    this.routerDetector = new RouterDetector();

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
          {
            name: "preview_rules_generation",
            description:
              "预览规则生成过程，列出所有任务、分析结果和需要确认的决策点，不实际生成文件。用于首次使用或需要了解生成过程时。",
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
          case "preview_rules_generation":
            return await this.handlePreviewGeneration(args);
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
   * 处理预览规则生成的请求
   */
  private async handlePreviewGeneration(args: any) {
    const projectPath = args.projectPath as string;
    
    let output = `📋 Cursor Rules 生成预览\n\n`;
    output += `项目路径: ${projectPath}\n\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // 执行所有分析任务，收集信息
    const analysisResults: any = {};
    const uncertainties: any[] = [];
    
    output += `## 📊 分析任务清单\n\n`;
    
    // 任务 1
    output += `🔄 [1/11] 收集项目文件...\n`;
    const files = await this.projectAnalyzer.collectFiles(projectPath);
    output += `✅ [1/11] 完成 - 发现 ${files.length} 个有用文件\n\n`;
    
    // 任务 2
    output += `🔄 [2/11] 检测技术栈...\n`;
    const techStack = await this.techStackDetector.detect(projectPath, files);
    output += `✅ [2/11] 完成 - ${techStack.primary.join(", ")}\n\n`;
    
    // 任务 3
    output += `🔄 [3/11] 解析配置文件...\n`;
    const projectConfig = await this.configParser.parseProjectConfig(projectPath);
    let configSummary = "";
    if (projectConfig.prettier) configSummary += "Prettier, ";
    if (projectConfig.eslint) configSummary += "ESLint, ";
    if (projectConfig.typescript) configSummary += "TypeScript, ";
    if (projectConfig.commands?.format) configSummary += "格式化命令";
    output += `✅ [3/11] 完成 - ${configSummary || "无配置"}\n\n`;
    
    // 任务 4
    output += `🔄 [4/11] 分析项目实践...\n`;
    const errorHandling = await this.practiceAnalyzer.analyzeErrorHandling(projectPath, files);
    output += `✅ [4/11] 完成 - 错误处理: ${errorHandling.type}, ${errorHandling.frequency} 处\n\n`;
    
    // 任务 5
    output += `🔄 [5/11] 检测自定义工具...\n`;
    const customHooks = await this.customPatternDetector.detectCustomHooks(projectPath, files);
    const customUtils = await this.customPatternDetector.detectCustomUtils(projectPath, files);
    output += `✅ [5/11] 完成 - Hooks: ${customHooks.length} 个, 工具函数: ${customUtils.length} 个\n\n`;
    
    // 任务 6
    output += `🔄 [6/11] 学习文件组织...\n`;
    const fileOrganization = await this.fileStructureLearner.learnStructure(projectPath, files);
    output += `✅ [6/11] 完成 - 识别 ${fileOrganization.structure.length} 个目录\n\n`;
    
    // 任务 7
    output += `🔄 [7/11] 检测路由系统...\n`;
    const frontendRouterInfo = await this.routerDetector.detectFrontendRouter(projectPath, files);
    const backendRouterInfo = await this.routerDetector.detectBackendRouter(projectPath, files);
    const routerSummary = [
      frontendRouterInfo ? `前端: ${frontendRouterInfo.framework}` : null,
      backendRouterInfo ? `后端: ${backendRouterInfo.framework}` : null,
    ].filter(Boolean).join(", ") || "未检测到路由";
    output += `✅ [7/11] 完成 - ${routerSummary}\n\n`;
    
    // 任务 8 - 可能需要确认
    output += `🔄 [8/11] 分析路由生成方式...\n`;
    if (frontendRouterInfo) {
      const dynamicAnalysis = await this.routerDetector.analyzeDynamicRouting(projectPath, files, frontendRouterInfo);
      
      if (dynamicAnalysis.needsConfirmation) {
        output += `⚠️ [8/11] 需要确认 - 检测到多个可能的路由生成方式\n\n`;
        uncertainties.push({
          taskNumber: 8,
          topic: "路由生成方式",
          analysis: dynamicAnalysis,
        });
      } else {
        output += `✅ [8/11] 完成 - ${dynamicAnalysis.recommendation.certainty === 'certain' ? '确定' : '可能'}: ${dynamicAnalysis.recommendation.method}\n\n`;
      }
    } else {
      output += `✅ [8/11] 跳过 - 未检测到路由系统\n\n`;
    }
    
    // 任务 9-11
    output += `✅ [9/11] 准备生成 - 将生成 ${this.estimateRuleFileCount(techStack, customHooks.length, frontendRouterInfo, backendRouterInfo)} 个规则文件\n`;
    output += `✅ [10/11] 准备写入 - 将写入 .cursor/ 目录\n`;
    output += `✅ [11/11] 准备完成 - 将生成 instructions.md\n\n`;
    
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // 显示需要确认的问题
    if (uncertainties.length > 0) {
      output += `## ⚠️ 需要您确认的决策点 (${uncertainties.length} 个)\n\n`;
      
      for (let i = 0; i < uncertainties.length; i++) {
        const item = uncertainties[i];
        output += `### 决策点 ${i + 1}: ${item.topic}\n\n`;
        output += `**当前方案**: ${item.analysis.recommendation.method}\n`;
        output += `**确定性**: ${item.analysis.recommendation.certainty === 'certain' ? '✅ 确定' : item.analysis.recommendation.certainty === 'likely' ? '⚠️ 可能' : 'ℹ️ 不确定'}\n`;
        output += `**理由**: ${item.analysis.recommendation.explanation}\n\n`;
        
        if (item.analysis.scripts.commands.length > 0 || item.analysis.scripts.files.length > 0) {
          output += `**检测到的所有选项**:\n`;
          
          if (item.analysis.scripts.commands.length > 0) {
            output += `\n命令选项:\n`;
            item.analysis.scripts.commands.forEach((cmd: string, idx: number) => {
              const mark = idx === 0 ? "💡 推荐" : "";
              output += `  ${String.fromCharCode(65 + idx)}. ${cmd} ${mark}\n`;
            });
          }
          
          if (item.analysis.scripts.files.length > 0) {
            output += `\n脚本文件:\n`;
            const offset = item.analysis.scripts.commands.length;
            item.analysis.scripts.files.forEach((file: string, idx: number) => {
              output += `  ${String.fromCharCode(65 + offset + idx)}. @${file}\n`;
            });
          }
          
          output += `\n其他:\n`;
          const lastOption = String.fromCharCode(65 + item.analysis.scripts.commands.length + item.analysis.scripts.files.length);
          output += `  ${lastOption}. 不使用脚本，手动创建\n`;
        }
        
        output += `\n❓ **您的决策**:\n`;
        output += `- 如果当前方案正确 → 无需操作\n`;
        output += `- 如果需要更改 → 请告诉我选择哪个选项（如 "选择 B"）\n`;
        output += `- 如果有其他方式 → 请具体说明\n\n`;
        
        output += `💡 **影响**: ${item.analysis.confirmationQuestions[0]?.impact || '这将决定规则中的相关指南'}\n\n`;
        output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      }
    } else {
      output += `## ✅ 无需确认\n\n`;
      output += `所有分析结果都是确定的，可以直接生成规则。\n\n`;
    }
    
    // 显示将生成的文件
    output += `## 📁 将要生成的文件\n\n`;
    output += `.cursor/\n`;
    output += `├── instructions.md (~200 行)\n`;
    output += `└── rules/\n`;
    output += `    ├── global-rules.mdc (~280 行)\n`;
    output += `    ├── code-style.mdc (~200 行)\n`;
    output += `    ├── architecture.mdc (~250 行)\n`;
    if (customHooks.length > 0 || customUtils.length > 0) {
      output += `    ├── custom-tools.mdc (~150 行)\n`;
    }
    if (techStack.frameworks.some(f => ["React", "Vue", "Angular"].includes(f))) {
      output += `    ├── ui-ux.mdc (~250 行)\n`;
    }
    if (frontendRouterInfo) {
      output += `    ├── frontend-routing.mdc (~300 行)\n`;
    }
    output += `    └── ...\n\n`;
    output += `预计总文件: ${this.estimateRuleFileCount(techStack, customHooks.length, frontendRouterInfo, backendRouterInfo)} 个\n`;
    output += `预计总行数: ~${this.estimateTotalLines(techStack, customHooks.length, frontendRouterInfo, backendRouterInfo)} 行\n\n`;
    
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    output += `## 🚀 下一步\n\n`;
    
    if (uncertainties.length > 0) {
      output += `**如有需要确认的决策**:\n`;
      output += `1. 查看上述决策点\n`;
      output += `2. 确认或修改方案\n`;
      output += `3. 运行: \`generate_cursor_rules\`\n`;
      output += `4. 生成时会使用您确认的方案\n\n`;
    } else {
      output += `**直接生成**:\n`;
      output += `运行: \`generate_cursor_rules\`\n\n`;
    }
    
    output += `💡 **提示**: preview 工具只是预览，不会生成任何文件。\n`;
    
    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * 估算规则文件数量
   */
  private estimateRuleFileCount(
    techStack: any,
    customToolsCount: number,
    frontendRouter: any,
    backendRouter: any
  ): number {
    let count = 4; // global, code-style, architecture, instructions
    if (customToolsCount > 0) count++;
    if (techStack.frameworks.some((f: string) => ["React", "Vue", "Angular"].includes(f))) count++;
    if (frontendRouter) count++;
    if (backendRouter) count++;
    return count;
  }

  /**
   * 估算总行数
   */
  private estimateTotalLines(
    techStack: any,
    customToolsCount: number,
    frontendRouter: any,
    backendRouter: any
  ): number {
    let lines = 900; // 基础文件
    if (customToolsCount > 0) lines += 150;
    if (techStack.frameworks.some((f: string) => ["React", "Vue"].includes(f))) lines += 250;
    if (frontendRouter) lines += 300;
    if (backendRouter) lines += 300;
    return lines;
  }

  /**
   * 处理生成 Cursor Rules 的请求（增强版，显示进度）
   */
  private async handleGenerateRules(args: any) {
    const projectPath = args.projectPath as string;
    const updateDescription = (args.updateDescription as boolean) ?? false;
    const includeModuleRules = (args.includeModuleRules as boolean) ?? true;

    // 构建进度日志（MCP 不支持流式，所以收集后一起输出）
    const progressLog: string[] = [];
    
    progressLog.push(`📋 开始生成 Cursor Rules\n`);
    progressLog.push(`项目: ${projectPath}\n`);
    progressLog.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 1. 收集项目文件
    progressLog.push(`\n🔄 [1/11] 收集项目文件...`);
    const files = await this.projectAnalyzer.collectFiles(projectPath);
    progressLog.push(`\n✅ [1/11] 完成 - 发现 ${files.length} 个文件`);

    // 2. 检测技术栈
    progressLog.push(`\n\n🔄 [2/11] 检测技术栈...`);
    const techStack = await this.techStackDetector.detect(projectPath, files);
    progressLog.push(`\n✅ [2/11] 完成 - ${techStack.primary.join(", ")}`);

    // 3. 检测模块结构
    progressLog.push(`\n\n🔄 [3/11] 检测模块结构...`);
    const modules = await this.moduleDetector.detectModules(projectPath, files);
    progressLog.push(`\n✅ [3/11] 完成 - ${modules.length} 个模块`);

    // 4. 分析代码特征
    progressLog.push(`\n\n🔄 [4/11] 分析代码特征...`);
    const codeFeatures = await this.codeAnalyzer.analyzeFeatures(
      projectPath,
      files,
      techStack
    );
    progressLog.push(`\n✅ [4/11] 完成 - ${Object.keys(codeFeatures).length} 项特征`);

    // 5. 解析项目配置（v1.2 新增）
    progressLog.push(`\n\n🔄 [5/11] 解析项目配置...`);
    const projectConfig = await this.configParser.parseProjectConfig(projectPath);
    let configInfo = "";
    if (projectConfig.prettier) configInfo += "Prettier, ";
    if (projectConfig.eslint) configInfo += "ESLint, ";
    if (projectConfig.commands?.format) configInfo += "格式化命令";
    progressLog.push(`\n✅ [5/11] 完成 - ${configInfo || "无配置"}`);

    // 6. 分析项目实践（v1.2 新增）
    progressLog.push(`\n\n🔄 [6/11] 分析项目实践...`);
    const errorHandling = await this.practiceAnalyzer.analyzeErrorHandling(projectPath, files);
    const codeStyle = await this.practiceAnalyzer.analyzeCodeStyle(projectPath, files);
    const componentPattern = await this.practiceAnalyzer.analyzeComponentPatterns(projectPath, files);
    
    const projectPractice = {
      errorHandling,
      codeStyle,
      componentPattern,
    };
    progressLog.push(`\n✅ [6/11] 完成 - 错误处理: ${errorHandling.type}, 代码风格: ${codeStyle.variableDeclaration}`);

    // 7. 检测自定义模式（v1.2 新增）
    progressLog.push(`\n\n🔄 [7/11] 检测自定义工具...`);
    const customHooks = await this.customPatternDetector.detectCustomHooks(projectPath, files);
    const customUtils = await this.customPatternDetector.detectCustomUtils(projectPath, files);
    const apiClient = await this.customPatternDetector.detectAPIClient(projectPath, files);
    
    const customPatterns = {
      customHooks,
      customUtils,
      apiClient,
    };
    progressLog.push(`\n✅ [7/11] 完成 - Hooks: ${customHooks.length} 个, 工具函数: ${customUtils.length} 个`);

    // 8. 学习文件组织结构（v1.2 新增）
    progressLog.push(`\n\n🔄 [8/11] 学习文件组织结构...`);
    const fileOrganization = await this.fileStructureLearner.learnStructure(projectPath, files);
    progressLog.push(`\n✅ [8/11] 完成 - 识别 ${fileOrganization.structure.length} 个目录`);

    // 9. 检测路由系统（v1.3.x 新增，完整的 6 步分析）
    progressLog.push(`\n\n🔄 [9/11] 检测路由系统...`);
    const frontendRouterInfo = await this.routerDetector.detectFrontendRouter(projectPath, files);
    const backendRouterInfo = await this.routerDetector.detectBackendRouter(projectPath, files);
    
    const uncertainties: any[] = [];  // 收集需要确认的问题
    
    let frontendRouter;
    if (frontendRouterInfo) {
      const pattern = await this.routerDetector.analyzeRoutingPattern(projectPath, files, frontendRouterInfo);
      const examples = await this.routerDetector.extractRouteExamples(projectPath, files, frontendRouterInfo, pattern);
      
      // 完整的动态路由分析（6 步流程）
      const dynamicAnalysis = await this.routerDetector.analyzeDynamicRouting(projectPath, files, frontendRouterInfo);
      
      // 应用分析结果
      if (dynamicAnalysis.isDynamic) {
        pattern.isDynamicGenerated = true;
        pattern.generationScript = dynamicAnalysis.recommendation.method;
      }
      
      frontendRouter = { 
        info: frontendRouterInfo, 
        pattern, 
        examples,
        dynamicAnalysis,  // 包含完整分析结果
      };
      
      // 收集需要确认的问题
      if (dynamicAnalysis.needsConfirmation) {
        progressLog.push(`\n⚠️ [9/11] 发现决策点 - 路由生成方式需要确认，使用推荐值继续`);
        uncertainties.push({
          topic: '前端路由生成方式',
          ...dynamicAnalysis.recommendation,
          questions: dynamicAnalysis.confirmationQuestions,
          scripts: dynamicAnalysis.scripts,
        });
      } else {
        progressLog.push(`\n✅ [9/11] 完成 - 前端路由: ${frontendRouter.info.framework}`);
      }
    } else {
      progressLog.push(`\n✅ [9/11] 完成 - 未检测到前端路由`);
    }

    let backendRouter;
    if (backendRouterInfo) {
      const pattern = await this.routerDetector.analyzeRoutingPattern(projectPath, files, backendRouterInfo);
      const examples = await this.routerDetector.extractRouteExamples(projectPath, files, backendRouterInfo, pattern);
      
      // 后端路由通常不需要动态生成检测（一般是手写的）
      backendRouter = { info: backendRouterInfo, pattern, examples };
      
      if (!frontendRouter) {
        progressLog.push(`\n✅ [9/11] 完成 - 后端路由: ${backendRouter.info.framework}`);
      }
    }

    // 10. 生成规则文件
    progressLog.push(`\n\n🔄 [10/11] 生成规则文件...`);
    
    const bestPractices = await this.context7Integration.getBestPractices(
      techStack.dependencies
    );

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

    // 生成规则（v1.2 增强, v1.3.x 路由支持）
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
      // v1.3.x 新增字段
      frontendRouter,
      backendRouter,
    });

    progressLog.push(`\n✅ [10/11] 完成 - 生成 ${rules.length} 个规则文件`);

    // 11. 写入文件
    progressLog.push(`\n\n🔄 [11/11] 写入规则文件...`);
    const writtenFiles = await this.fileWriter.writeRules(projectPath, rules);

    // 生成并写入 instructions.md（v1.3 新增）
    const instructions = await this.rulesGenerator.generateInstructions({
      projectPath,
      techStack,
      modules,
      codeFeatures,
      bestPractices,
      includeModuleRules,
      projectPractice,
      projectConfig,
      customPatterns,
      fileOrganization,
    });
    await this.fileWriter.writeInstructions(instructions);
    writtenFiles.push(".cursor/instructions.md");
    progressLog.push(`\n✅ [11/11] 完成 - 所有文件已写入\n\n`);
    progressLog.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`);

    // 生成摘要
    const summary = this.rulesGenerator.generateSummary(rules, projectPath);

    // 构建输出消息（包含进度日志）
    let outputMessage = progressLog.join('');
    
    outputMessage += `✅ Cursor Rules 生成成功！

📁 生成的文件：
${writtenFiles.map((f) => `  - ${f}`).join("\n")}

📊 项目分析结果：
  - 主要技术栈: ${techStack.primary.join(", ")}
  - 检测到的模块: ${modules.length} 个
  - 代码特征: ${Object.keys(codeFeatures).length} 项
${frontendRouter ? `  - 前端路由: ${frontendRouter.info.framework}` : ""}
${backendRouter ? `  - 后端路由: ${backendRouter.info.framework}` : ""}

${consistencyReport.hasInconsistencies ? `⚠️  一致性检查：
  - 发现 ${consistencyReport.inconsistencies.length} 处不一致
  ${descriptionUpdated ? "  - ✅ 描述文件已更新" : "  - ℹ️  描述文件未更新（请手动确认）"}
` : ""}
📝 规则摘要：
${summary}
`;

    // 添加不确定性报告（详细版本）
    if (uncertainties.length > 0) {
      outputMessage += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      outputMessage += `## ⚠️ 需要您确认的决策 (${uncertainties.length} 个)\n\n`;
      outputMessage += `以下问题使用了推荐值，请确认是否正确：\n\n`;
      
      for (let i = 0; i < uncertainties.length; i++) {
        const uncertainty = uncertainties[i];
        outputMessage += `### 决策 ${i + 1}: ${uncertainty.topic}\n\n`;
        
        outputMessage += `**📌 当前使用的方案**:\n`;
        outputMessage += `\`\`\`\n${uncertainty.method}\n\`\`\`\n\n`;
        
        outputMessage += `**🔍 检测过程**:\n`;
        outputMessage += `- 确定性: ${uncertainty.certainty === 'certain' ? '✅ 确定' : uncertainty.certainty === 'likely' ? '⚠️ 可能（有一定把握）' : 'ℹ️ 不确定（需要您确认）'}\n`;
        outputMessage += `- 选择理由: ${uncertainty.explanation}\n`;
        
        if (uncertainty.scripts) {
          if (uncertainty.scripts.commands.length > 0 || uncertainty.scripts.files.length > 0) {
            outputMessage += `\n**🎯 检测到的所有选项**:\n\n`;
            
            if (uncertainty.scripts.commands.length > 0) {
              outputMessage += `命令:\n`;
              uncertainty.scripts.commands.forEach((cmd: string, idx: number) => {
                const isCurrent = cmd === uncertainty.method;
                const mark = isCurrent ? "← 当前使用" : "";
                outputMessage += `  ${String.fromCharCode(65 + idx)}. \`${cmd}\` ${mark}\n`;
              });
              outputMessage += `\n`;
            }
            
            if (uncertainty.scripts.files.length > 0) {
              outputMessage += `脚本文件:\n`;
              const offset = uncertainty.scripts.commands.length;
              uncertainty.scripts.files.forEach((file: string, idx: number) => {
                outputMessage += `  ${String.fromCharCode(65 + offset + idx)}. @${file}\n`;
              });
              outputMessage += `\n`;
            }
            
            const totalOptions = uncertainty.scripts.commands.length + uncertainty.scripts.files.length;
            outputMessage += `其他:\n`;
            outputMessage += `  ${String.fromCharCode(65 + totalOptions)}. 不使用脚本，手动创建\n\n`;
          }
        }
        
        outputMessage += `**❓ 您的决策**:\n\n`;
        
        if (uncertainty.certainty === 'certain') {
          outputMessage += `✅ 此方案已确定，无需更改。\n\n`;
        } else if (uncertainty.certainty === 'likely') {
          outputMessage += `⚠️ 此方案可能正确，如需更改：\n`;
          outputMessage += `- 请回复: "更改为选项 B" 或 "使用 [具体命令]"\n`;
          outputMessage += `- 我将更新规则文件\n\n`;
        } else {
          outputMessage += `ℹ️ 此方案不确定，**强烈建议确认**：\n`;
          outputMessage += `- 如果正确: 回复 "正确" 或 "使用当前方案"\n`;
          outputMessage += `- 如果需要更改: 回复 "选择 [选项]" 或 "使用 [具体方式]"\n`;
          outputMessage += `- 我将根据您的确认更新规则\n\n`;
        }
        
        outputMessage += `**📄 相关文件**: 生成的规则文件中会标注此决策\n`;
        outputMessage += `- 查看: .cursor/rules/frontend-routing.mdc\n`;
        outputMessage += `- 标注: ${uncertainty.certainty === 'certain' ? '✅ [确定]' : uncertainty.certainty === 'likely' ? '⚠️ [可能]' : 'ℹ️ [不确定]'}\n\n`;
        
        outputMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      }
      
      outputMessage += `💡 **总结**: ${uncertainties.length} 个决策点已使用推荐值生成规则。\n`;
      outputMessage += `如需修改，请告诉我，我将更新对应的规则文件。\n\n`;
    }

    outputMessage += `
💡 提示：
  - 全局规则会在项目任何位置生效
  - 模块规则只在对应模块目录中生效
  - Cursor 会根据当前打开的文件位置自动加载相应规则
  - 阅读 .cursor/instructions.md 了解开发工作流程
`;

    // v1.3.4: 添加格式化命令提示
    if (projectConfig.commands && (projectConfig.commands.format || projectConfig.commands.lintFix)) {
      outputMessage += `\n📝 代码生成规范：\n\n`;
      outputMessage += `当 Cursor 为您生成代码后，请确保运行：\n\n`;
      
      const formatCmds: string[] = [];
      if (projectConfig.commands.format) {
        formatCmds.push(`${projectConfig.commands.format}  # 格式化代码`);
      }
      if (projectConfig.commands.lintFix) {
        formatCmds.push(`${projectConfig.commands.lintFix}  # 修复 lint 问题`);
      } else if (projectConfig.commands.lint) {
        formatCmds.push(`${projectConfig.commands.lint}  # 检查 lint`);
      }
      
      outputMessage += formatCmds.map(cmd => `  ${cmd}`).join('\n') + '\n\n';
      
      outputMessage += `💡 **建议**: 让 Cursor 在生成代码后主动询问是否运行这些命令。\n`;
      outputMessage += `详见: .cursor/rules/code-style.mdc\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: outputMessage,
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

