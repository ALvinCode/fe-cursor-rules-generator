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
import { CursorRule, InstructionsFile } from "./types.js";
import path from "path";

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
        version: "1.3.6",
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

    type TaskStatus = "pending" | "in_progress" | "completed" | "skipped";
    interface TaskRecord {
      id: number;
      title: string;
      status: TaskStatus;
      details: string[];
    }

    const tasks: TaskRecord[] = [
      { id: 1, title: "收集项目文件", status: "pending", details: [] },
      { id: 2, title: "分析技术栈与模块架构", status: "pending", details: [] },
      { id: 3, title: "检查项目配置", status: "pending", details: [] },
      { id: 4, title: "分析项目实践规范", status: "pending", details: [] },
      { id: 5, title: "检测自定义工具与模式", status: "pending", details: [] },
      { id: 6, title: "学习文件组织结构", status: "pending", details: [] },
      { id: 7, title: "识别路由系统", status: "pending", details: [] },
      { id: 8, title: "评估动态路由生成方式", status: "pending", details: [] },
      { id: 9, title: "生成规则与一致性检查", status: "pending", details: [] },
      { id: 10, title: "写入规则文件与使用说明", status: "pending", details: [] },
    ];

    const plannedTodoList = tasks.map((task) => `- [ ] ${task.id}. ${task.title}`).join("\n");

    const getTask = (id: number): TaskRecord => {
      const task = tasks.find((item) => item.id === id);
      if (!task) {
        throw new Error(`未找到任务 ${id}`);
      }
      return task;
    };

    const markStatus = (id: number, status: TaskStatus) => {
      const task = getTask(id);
      task.status = status;
    };

    const addDetail = (id: number, text: string) => {
      const task = getTask(id);
      task.details.push(text);
    };

    const startTask = (id: number, text?: string) => {
      markStatus(id, "in_progress");
      if (text) {
        addDetail(id, text);
      }
    };

    const completeTask = (id: number, text?: string) => {
      markStatus(id, "completed");
      if (text) {
        addDetail(id, text);
      }
    };

    const skipTask = (id: number, text: string) => {
      markStatus(id, "skipped");
      addDetail(id, text);
    };

    // 任务产出变量
    let files: string[] = [];
    let fileTypeStats: Record<string, number> = {};
    let techStack: any;
    let modules: any[] = [];
    let codeFeatures: Record<string, any> = {};
    let projectConfig: any;
    let projectPractice: any;
    let customPatterns: any;
    let fileOrganization: any;
    let frontendRouter: any;
    let backendRouter: any;
    const uncertainties: any[] = [];
    let bestPractices: any[] = [];
    let consistencyReport: any;
    let descriptionUpdated = false;
    let rules: CursorRule[] = [];
    let writtenFiles: string[] = [];
    let instructions: InstructionsFile | undefined;

    // 任务 1：收集项目文件
    startTask(1, `cursor-rules-generator 正在扫描项目路径：${projectPath}`);
    files = await this.projectAnalyzer.collectFiles(projectPath);
    fileTypeStats = this.groupFilesByType(files);
    const topFileTypes = Object.entries(fileTypeStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([ext, count]) => `${ext} (${count})`);
    addDetail(1, `已收集 ${files.length} 个有效文件。`);
    if (topFileTypes.length > 0) {
      addDetail(1, `主要文件类型：${topFileTypes.join("，")}`);
    }
    completeTask(1);

    // 任务 2：分析技术栈与模块架构
    startTask(2, "cursor-rules-generator 正在识别技术栈与模块结构。");
    techStack = await this.techStackDetector.detect(projectPath, files);
    modules = await this.moduleDetector.detectModules(projectPath, files);
    codeFeatures = await this.codeAnalyzer.analyzeFeatures(projectPath, files, techStack);
    addDetail(2, `主要技术栈：${techStack.primary.length > 0 ? techStack.primary.join("，") : "未检测到主要技术栈"}`);
    addDetail(2, `检测到 ${modules.length} 个模块，并提取 ${Object.keys(codeFeatures).length} 项代码特征。`);
    completeTask(2);

    // 任务 3：检查项目配置
    startTask(3, "cursor-rules-generator 正在检查项目配置文件。");
    projectConfig = await this.configParser.parseProjectConfig(projectPath);
    const configSummary: string[] = [];
    if (projectConfig?.prettier) configSummary.push("Prettier");
    if (projectConfig?.eslint) configSummary.push("ESLint");
    if (projectConfig?.typescript) configSummary.push("TypeScript 配置");
    if (projectConfig?.commands?.format) configSummary.push(`格式化命令：${projectConfig.commands.format}`);
    if (projectConfig?.commands?.lintFix) configSummary.push(`Lint 修复命令：${projectConfig.commands.lintFix}`);
    addDetail(3, `检查到配置项：${configSummary.length > 0 ? configSummary.join("；") : "暂无显式配置"}。`);
    const aliasCount = projectConfig?.pathAliases ? Object.keys(projectConfig.pathAliases).length : 0;
    if (aliasCount > 0) {
      addDetail(3, `识别到 ${aliasCount} 个路径别名。`);
    }
    completeTask(3);

    // 任务 4：分析项目实践规范
    startTask(4, "cursor-rules-generator 正在提取项目实践规范。");
    const errorHandling = await this.practiceAnalyzer.analyzeErrorHandling(projectPath, files);
    const codeStyle = await this.practiceAnalyzer.analyzeCodeStyle(projectPath, files);
    const componentPattern = await this.practiceAnalyzer.analyzeComponentPatterns(projectPath, files);
    projectPractice = { errorHandling, codeStyle, componentPattern };
    addDetail(4, `错误处理模式：${errorHandling.type || "未检测"}。`);
    addDetail(4, `代码风格：变量声明 ${codeStyle.variableDeclaration}，函数风格 ${codeStyle.functionStyle}，字符串引号 ${codeStyle.stringQuote}。`);
    addDetail(4, `组件组织方式：组件类型 ${componentPattern.type}，导出形式 ${componentPattern.exportStyle}，状态管理 ${componentPattern.stateManagement.join("，") || "未检测"}。`);
    completeTask(4);

    // 任务 5：检测自定义工具与模式
    startTask(5, "cursor-rules-generator 正在收集自定义 Hooks 与工具函数。");
    const customHooks = await this.customPatternDetector.detectCustomHooks(projectPath, files);
    const customUtils = await this.customPatternDetector.detectCustomUtils(projectPath, files);
    const apiClient = await this.customPatternDetector.detectAPIClient(projectPath, files);
    customPatterns = { customHooks, customUtils, apiClient };
    addDetail(5, `发现 ${customHooks.length} 个自定义 Hooks、${customUtils.length} 个工具函数。`);
    if (apiClient?.exists) {
      addDetail(5, `检测到 API 客户端：${apiClient.name || "未命名"}。`);
    }
    completeTask(5);

    // 任务 6：学习文件组织结构
    startTask(6, "cursor-rules-generator 正在分析目录结构与命名约定。");
    fileOrganization = await this.fileStructureLearner.learnStructure(projectPath, files);
    addDetail(6, `识别 ${fileOrganization.structure.length} 个目录节点。`);
    if (fileOrganization.componentLocation?.length > 0) {
      addDetail(6, `组件目录定位为 ${fileOrganization.componentLocation[0]}。`);
    }
    if (fileOrganization.utilsLocation?.length > 0) {
      addDetail(6, `工具函数目录定位为 ${fileOrganization.utilsLocation[0]}。`);
    }
    if (fileOrganization.namingConvention) {
      addDetail(6, `命名规范：${JSON.stringify(fileOrganization.namingConvention)}。`);
    }
    completeTask(6);

    // 任务 7：识别路由系统
    startTask(7, "cursor-rules-generator 正在识别路由框架。");
    const frontendRouterInfo = await this.routerDetector.detectFrontendRouter(projectPath, files);
    const backendRouterInfo = await this.routerDetector.detectBackendRouter(projectPath, files);

    if (frontendRouterInfo) {
      const pattern = await this.routerDetector.analyzeRoutingPattern(projectPath, files, frontendRouterInfo);
      const examples = await this.routerDetector.extractRouteExamples(projectPath, files, frontendRouterInfo, pattern);
      frontendRouter = { info: frontendRouterInfo, pattern, examples };
      addDetail(7, `前端路由：${frontendRouterInfo.framework}（${frontendRouterInfo.type}）。`);
    } else {
      addDetail(7, "未检测到前端路由系统。");
    }

    if (backendRouterInfo) {
      const pattern = await this.routerDetector.analyzeRoutingPattern(projectPath, files, backendRouterInfo);
      const examples = await this.routerDetector.extractRouteExamples(projectPath, files, backendRouterInfo, pattern);
      backendRouter = { info: backendRouterInfo, pattern, examples };
      addDetail(7, `后端路由：${backendRouterInfo.framework}（${backendRouterInfo.type}）。`);
    }

    if (!frontendRouterInfo && !backendRouterInfo) {
      addDetail(7, "未检测到任何路由框架。");
    }
    completeTask(7);

    // 任务 8：评估动态路由生成方式
    if (frontendRouter) {
      startTask(8, "cursor-rules-generator 正在评估动态路由生成方式。");
      const dynamicAnalysis = await this.routerDetector.analyzeDynamicRouting(projectPath, files, frontendRouter.info);
      frontendRouter.dynamicAnalysis = dynamicAnalysis;

      if (dynamicAnalysis.isDynamic) {
        frontendRouter.pattern.isDynamicGenerated = true;
        frontendRouter.pattern.generationScript = dynamicAnalysis.recommendation.method;
        addDetail(8, `评估结果：路由由脚本或命令生成（${dynamicAnalysis.recommendation.method}）。`);
      } else {
        addDetail(8, "评估结果：路由为手动维护或静态文件。\n");
      }

      if (dynamicAnalysis.needsConfirmation) {
        uncertainties.push({
          topic: "前端路由生成方式",
          ...dynamicAnalysis.recommendation,
          questions: dynamicAnalysis.confirmationQuestions,
          scripts: dynamicAnalysis.scripts,
        });
        addDetail(8, "发现需要用户确认的路由生成方案，已记录为待确认事项。");
      }

      completeTask(8);
    } else {
      skipTask(8, "未识别前端路由，动态路由评估不适用。");
    }

    // 任务 9：生成规则与一致性检查
    startTask(9, "cursor-rules-generator 正在汇总最佳实践并检查文档一致性。");
    bestPractices = await this.context7Integration.getBestPractices(techStack.dependencies);
    addDetail(9, `获取到 ${bestPractices.length} 条相关最佳实践。`);

    consistencyReport = await this.consistencyChecker.check(projectPath, files, techStack, codeFeatures);
    if (consistencyReport.hasInconsistencies) {
      addDetail(9, `检测到 ${consistencyReport.inconsistencies.length} 处描述与实现不一致。`);
      if (updateDescription) {
        await this.consistencyChecker.updateDescriptions(projectPath, consistencyReport);
        descriptionUpdated = true;
        addDetail(9, "已根据请求自动更新描述文件。");
      }
    } else {
      addDetail(9, "未发现描述与实现不一致的问题。");
    }

    rules = await this.rulesGenerator.generate({
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
      frontendRouter,
      backendRouter,
    });
    addDetail(9, `已生成 ${rules.length} 个规则文件草案。`);
    completeTask(9);

    // 任务 10：写入规则文件与说明
    startTask(10, "cursor-rules-generator 正在写入规则文件与 instructions.md。");
    writtenFiles = await this.fileWriter.writeRules(projectPath, rules);
    instructions = await this.rulesGenerator.generateInstructions({
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
    addDetail(10, `已写入 ${writtenFiles.length} 个文件。`);
    completeTask(10);

    const completedTodoList = tasks
      .map((task) => {
        const mark = task.status === "completed" ? "x" : task.status === "skipped" ? "-" : " ";
        return `- [${mark}] ${task.id}. ${task.title}`;
      })
      .join("\n");

    const ruleSummary = this.rulesGenerator.generateSummary(rules, projectPath);

    const analysisLines: string[] = [];
    analysisLines.push(`- cursor-rules-generator 识别主要技术栈：${techStack.primary.length > 0 ? techStack.primary.join("，") : "未检测"}`);
    analysisLines.push(`- cursor-rules-generator 统计项目文件数量：${files.length} 个，涉及 ${Object.keys(fileTypeStats).length} 种文件类型`);
    analysisLines.push(`- cursor-rules-generator 检测模块数量：${modules.length} 个`);
    analysisLines.push(`- cursor-rules-generator 记录自定义工具：Hooks ${customPatterns.customHooks.length} 个，工具函数 ${customPatterns.customUtils.length} 个${customPatterns.apiClient?.exists ? "，API 客户端 1 个" : ""}`);
    if (frontendRouter) {
      analysisLines.push(`- cursor-rules-generator 识别前端路由：${frontendRouter.info.framework}（${frontendRouter.info.type}）`);
    }
    if (backendRouter) {
      analysisLines.push(`- cursor-rules-generator 识别后端路由：${backendRouter.info.framework}（${backendRouter.info.type}）`);
    }
    analysisLines.push(`- cursor-rules-generator 识别项目特定规范：错误处理 ${projectPractice?.errorHandling?.type ?? "未检测"}，变量声明 ${projectPractice?.codeStyle?.variableDeclaration ?? "未检测"}`);
    if (projectConfig?.commands && (projectConfig.commands.format || projectConfig.commands.lintFix)) {
      analysisLines.push(`- cursor-rules-generator 检测到格式化/校验命令：${[projectConfig.commands.format, projectConfig.commands.lintFix, projectConfig.commands.lint].filter(Boolean).join("，")}`);
    }

    let structureTreeSection = "";
    if (fileOrganization && fileOrganization.structure.length > 0) {
      const structureNotes: string[] = [];
      if (fileOrganization.componentLocation?.length > 0) {
        structureNotes.push(`cursor-rules-generator 将组件目录定位为 \`${fileOrganization.componentLocation[0]}\``);
      }
      if (fileOrganization.utilsLocation?.length > 0) {
        structureNotes.push(`cursor-rules-generator 将工具函数目录定位为 \`${fileOrganization.utilsLocation[0]}\``);
      }
      if (fileOrganization.hooksLocation?.length > 0) {
        structureNotes.push(`cursor-rules-generator 将 Hooks 目录定位为 \`${fileOrganization.hooksLocation[0]}\``);
      }
      if (fileOrganization.apiLocation?.length > 0) {
        structureNotes.push(`cursor-rules-generator 将 API 服务目录定位为 \`${fileOrganization.apiLocation[0]}\``);
      }
      const structureNotesText = structureNotes.length > 0 ? `${structureNotes.join("；")}。` : "cursor-rules-generator 未检测到特定目录角色。";
      structureTreeSection = `${this.generateProjectStructureTree(fileOrganization, projectPath)}\n${structureNotesText}`;
    }

    const instructionsTips: string[] = [];
    instructionsTips.push(`cursor-rules-generator 已写入 \`.cursor/instructions.md\`，请先阅读“执行流程”章节。`);
    instructionsTips.push(`cursor-rules-generator 建议在任务开始前加载对应规则文件，例如在编写路由时参考 \`.cursor/rules/frontend-routing.mdc\`。`);
    if (projectConfig?.commands && (projectConfig.commands.format || projectConfig.commands.lintFix)) {
      const cmdTips: string[] = [];
      if (projectConfig.commands.format) {
        cmdTips.push(projectConfig.commands.format);
      }
      if (projectConfig.commands.lintFix) {
        cmdTips.push(projectConfig.commands.lintFix);
      } else if (projectConfig.commands.lint) {
        cmdTips.push(projectConfig.commands.lint);
      }
      instructionsTips.push(`cursor-rules-generator 建议在生成代码后执行：${cmdTips.join("，")}`);
    }

    const notes: string[] = [];
    if (consistencyReport.hasInconsistencies) {
      const issueLines = consistencyReport.inconsistencies.map((inc: any, index: number) => {
        const severity = inc.severity === "high" ? "高" : inc.severity === "medium" ? "中" : "低";
        let line = `问题 ${index + 1}（严重程度：${severity}） - ${inc.description}`;
        if (inc.actualValue) {
          line += `；实际：${inc.actualValue}`;
        }
        if (inc.documentedValue) {
          line += `；文档：${inc.documentedValue}`;
        }
        if (inc.suggestedFix) {
          line += `；建议处理：${inc.suggestedFix}`;
        }
        return line;
      });
      notes.push(`cursor-rules-generator 检测到 ${consistencyReport.inconsistencies.length} 处描述不一致：\n${issueLines.join("\n")}`);
      if (descriptionUpdated) {
        notes.push("cursor-rules-generator 已根据请求更新描述文件。");
      } else {
        notes.push("cursor-rules-generator 未自动更新描述文件，可执行 `update_project_description` 进行同步。");
      }
    } else {
      notes.push("cursor-rules-generator 未发现文档与实现不一致的问题。");
    }

    if (uncertainties.length > 0) {
      const uncertaintyLines = uncertainties.map((item, idx) => {
        return `决策 ${idx + 1}：${item.topic} → 当前方案 "${item.method}"，确定性：${item.certainty}`;
      });
      notes.push(`cursor-rules-generator 记录了 ${uncertainties.length} 个待确认决策：\n${uncertaintyLines.join("\n")}`);
    }

    let outputMessage = `cursor-rules-generator 已被调用，开始处理项目：${projectPath}\n\n`;
    outputMessage += `## 任务执行列表\n\n`;
    outputMessage += `${plannedTodoList}\n\n`;
    outputMessage += `执行完成后的状态：\n\n${completedTodoList}\n\n`;

    outputMessage += `## 执行记录\n\n`;
    tasks.forEach((task) => {
      const statusLabel =
        task.status === "completed"
          ? "✅ 已完成"
          : task.status === "skipped"
          ? "⏭️ 已跳过"
          : task.status === "in_progress"
          ? "🔄 进行中"
          : "⏳ 待执行";
      outputMessage += `### 任务 ${task.id}: ${task.title}\n`;
      outputMessage += `状态: ${statusLabel}\n`;
      if (task.details.length > 0) {
        task.details.forEach((detail) => {
          outputMessage += `${detail}\n`;
        });
      } else {
        outputMessage += `cursor-rules-generator 已完成该任务，无额外说明。\n`;
      }
      outputMessage += `\n`;
    });

    outputMessage += `## 工作总结\n\n`;
    outputMessage += `### 项目分析结果\n\n`;
    outputMessage += `${analysisLines.join("\n")}\n\n`;
    if (structureTreeSection) {
      outputMessage += `${structureTreeSection}\n\n`;
    }

    outputMessage += `### 生成的规则文件结构和描述\n\n`;
    outputMessage += `${ruleSummary}\n\n`;

    outputMessage += `### 规则文件使用说明\n\n`;
    outputMessage += instructionsTips.join("\n");
    outputMessage += `\n\n`;

    outputMessage += `### 注意事项\n\n`;
    outputMessage += notes.join("\n\n");
    outputMessage += `\n`;

    if (uncertainties.length > 0) {
      outputMessage += `\n## 待确认项\n\n`;
      uncertainties.forEach((uncertainty, index) => {
        outputMessage += `决策 ${index + 1}：${uncertainty.topic}\n`;
        outputMessage += `当前方案：\n\`\`\`\n${uncertainty.method}\n\`\`\`\n`;
        outputMessage += `确定性：${uncertainty.certainty}\n`;
        outputMessage += `说明：${uncertainty.explanation}\n\n`;
      });
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

  /**
   * 生成项目结构树
   */
  private generateProjectStructureTree(fileOrg: any, projectPath: string): string {
    const projectName = path.basename(projectPath);
    let tree = "```\n";
    tree += `${projectName}/\n`;
    
    // 获取顶级目录
    const topDirs = fileOrg.structure
      .filter((d: any) => !d.path.includes("/"))
      .sort((a: any, b: any) => b.fileCount - a.fileCount)
      .slice(0, 12);
    
    for (let i = 0; i < topDirs.length; i++) {
      const dir = topDirs[i];
      const isLast = i === topDirs.length - 1;
      const prefix = isLast ? "└──" : "├──";
      const purpose = dir.purpose !== "其他" ? ` # ${dir.purpose}` : "";
      
      tree += `${prefix} ${dir.path}/ (${dir.fileCount} 个文件)${purpose}\n`;
      
      // 显示重要的子目录（前 5 个）
      if (!isLast && i < 8) {
        const children = fileOrg.structure
          .filter((d: any) => d.path.startsWith(dir.path + "/") && d.path.split("/").length === 2)
          .slice(0, 5);
        
        for (let j = 0; j < children.length; j++) {
          const child = children[j];
          const childName = child.path.split("/").pop();
          const childIsLast = j === children.length - 1;
          const childPrefix = childIsLast ? "    └──" : "    ├──";
          const childPurpose = child.purpose !== "其他" ? ` # ${child.purpose}` : "";
          
          tree += `${childPrefix} ${childName}/  (${child.fileCount})${childPurpose}\n`;
        }
      }
    }
    
    tree += "```\n";
    return tree;
  }

  /**
   * 获取不一致类型的中文标签
   */
  private getInconsistencyTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      "missing-doc": "文档缺失",
      "outdated-doc": "文档过时",
      "wrong-tech-stack": "技术栈描述错误",
      "missing-feature": "功能描述缺失",
    };
    return labels[type] || type;
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

