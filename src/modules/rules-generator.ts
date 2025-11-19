import * as path from 'path';

import {
    BestPractice, CodeFeature, CursorRule, InstructionsFile, Module, RuleGenerationContext,
    TechStack
} from '../types.js';
import { FileUtils } from '../utils/file-utils.js';
import { logger } from '../utils/logger.js';
import { BestPracticeComparator } from './best-practice-comparator.js';
import { BestPracticeExtractor } from './best-practice-extractor.js';
import { BestPracticeWebSearcher } from './best-practice-web-searcher.js';
import {
    findBestFrameworkMatch, FrameworkMatch, getFrameworkFormatTemplate
} from './framework-matcher.js';
import { RuleRequirementsAnalyzer } from './rule-requirements-analyzer.js';
import { SuggestionCollector } from './suggestion-collector.js';
import {
    findBestTechStackMatches, MultiCategoryMatch, TechStackMatch
} from './tech-stack-matcher.js';

/**
 * 规则生成引擎
 * 结合项目特征和最佳实践，生成 Cursor Rules
 */
export class RulesGenerator {
  private frameworkMatch: FrameworkMatch | null = null;
  private multiCategoryMatch: MultiCategoryMatch | null = null;
  private suggestionCollector: SuggestionCollector;
  private bestPracticeExtractor: BestPracticeExtractor;
  private bestPracticeComparator: BestPracticeComparator;
  private webSearcher: BestPracticeWebSearcher;
  private requirementsAnalyzer: RuleRequirementsAnalyzer;

  constructor() {
    this.suggestionCollector = new SuggestionCollector();
    this.bestPracticeExtractor = new BestPracticeExtractor();
    this.bestPracticeComparator = new BestPracticeComparator();
    this.webSearcher = new BestPracticeWebSearcher();
    this.requirementsAnalyzer = new RuleRequirementsAnalyzer();
  }

  /**
   * 获取框架匹配信息（用于输出显示）
   */
  getFrameworkMatch(): FrameworkMatch | null {
    return this.frameworkMatch;
  }

  /**
   * 获取多类别技术栈匹配信息（用于输出显示）
   */
  getMultiCategoryMatch(): MultiCategoryMatch | null {
    return this.multiCategoryMatch;
  }

  /**
   * 获取建议收集器（用于输出显示）
   */
  getSuggestionCollector(): SuggestionCollector {
    return this.suggestionCollector;
  }

  /**
   * 获取规则需求分析器（用于输出显示）
   */
  getRequirementsAnalyzer(): RuleRequirementsAnalyzer {
    return this.requirementsAnalyzer;
  }

  /**
   * 按来源分组规则需求
   */
  private groupRequirementsBySource(
    requirements: Array<{ detectedFrom: string }>
  ): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const req of requirements) {
      grouped[req.detectedFrom] = (grouped[req.detectedFrom] || 0) + 1;
    }
    return grouped;
  }

  async generate(
    context: RuleGenerationContext,
    webSearchResults?: Record<string, string>
  ): Promise<CursorRule[]> {
    const rules: CursorRule[] = [];

    // 清空建议收集器
    this.suggestionCollector.clear();

    // v1.4: 框架匹配 - 找到最相似的框架规则格式
    this.frameworkMatch = findBestFrameworkMatch(context.techStack);
    if (this.frameworkMatch) {
      logger.info("框架匹配成功", {
        framework: this.frameworkMatch.framework,
        similarity: Math.round(this.frameworkMatch.similarity * 100) + "%",
        format: this.frameworkMatch.format,
      });
    }

    // v1.6: 多类别技术栈匹配 - 支持所有类别的规则
    this.multiCategoryMatch = await findBestTechStackMatches(context.techStack);
    if (this.multiCategoryMatch && this.multiCategoryMatch.matches.length > 0) {
      logger.info("多类别技术栈匹配成功", {
        totalMatches: this.multiCategoryMatch.matches.length,
        categories: this.multiCategoryMatch.categories,
        primaryMatch: this.multiCategoryMatch.primaryMatch?.ruleName,
        primarySimilarity: this.multiCategoryMatch.primaryMatch
          ? Math.round(this.multiCategoryMatch.primaryMatch.similarity * 100) +
            "%"
          : "N/A",
      });
    }

    // v1.5: 提取和对比最佳实践
    let missingPractices: any[] = [];
    let ambiguousPractices: any[] = [];

    // 优先使用多类别匹配（如果可用）
    if (this.multiCategoryMatch && this.multiCategoryMatch.matches.length > 0) {
      try {
        const extractedPractices =
          await this.bestPracticeExtractor.extractFromMultiCategoryMatch(
            this.multiCategoryMatch,
            context.techStack
          );

        const comparison = await this.bestPracticeComparator.compare(
          extractedPractices,
          context
        );
        missingPractices = comparison.missingPractices;
        ambiguousPractices = comparison.ambiguousPractices;
        this.suggestionCollector.addAll(comparison.suggestions);

        logger.info("最佳实践对比完成（多类别）", {
          extracted: extractedPractices.length,
          missing: missingPractices.length,
          ambiguous: ambiguousPractices.length,
          suggestions: comparison.suggestions.length,
        });

        // v1.5: 识别项目使用但规则中没有的技术栈
        const missingTechStacks = this.identifyMissingTechStacks(
          context.techStack,
          this.multiCategoryMatch.primaryMatch
        );

        // 对于缺失的技术栈，尝试网络搜索最佳实践
        if (missingTechStacks.length > 0) {
          let webPractices: any[] = [];

          // 如果有网络搜索结果，解析它们
          if (webSearchResults && Object.keys(webSearchResults).length > 0) {
            for (const [tech, searchResult] of Object.entries(
              webSearchResults
            )) {
              if (missingTechStacks.includes(tech)) {
                const parsed = this.webSearcher.parseWebSearchResults(
                  searchResult,
                  [tech]
                );
                webPractices.push(...parsed);
              }
            }
          }

          if (webPractices.length > 0) {
            missingPractices.push(...webPractices);
            logger.info("网络搜索找到最佳实践", {
              techStacks: missingTechStacks,
              practices: webPractices.length,
            });
          } else {
            // 使用备用方案
            logger.debug("网络搜索无结果，使用备用方案");
            const fallbackPractices =
              this.getFallbackPractices(missingTechStacks);
            if (fallbackPractices.length > 0) {
              missingPractices.push(...fallbackPractices);
              logger.info("使用备用方案找到最佳实践", {
                practices: fallbackPractices.length,
              });
            }
          }
        }
      } catch (error) {
        logger.debug("多类别最佳实践提取失败，回退到框架匹配", { error });
        // 回退到旧的框架匹配方式
        if (this.frameworkMatch) {
          try {
            const extractedPractices =
              await this.bestPracticeExtractor.extractFromFrameworkMatch(
                this.frameworkMatch,
                context.techStack
              );

            const comparison = await this.bestPracticeComparator.compare(
              extractedPractices,
              context
            );
            missingPractices = comparison.missingPractices;
            ambiguousPractices = comparison.ambiguousPractices;
            this.suggestionCollector.addAll(comparison.suggestions);

            logger.info("最佳实践对比完成（框架匹配）", {
              extracted: extractedPractices.length,
              missing: missingPractices.length,
              ambiguous: ambiguousPractices.length,
              suggestions: comparison.suggestions.length,
            });
          } catch (error2) {
            logger.debug("框架匹配最佳实践提取失败", { error: error2 });
          }
        }
      }
    } else if (this.frameworkMatch) {
      // 回退到旧的框架匹配方式
      try {
        const extractedPractices =
          await this.bestPracticeExtractor.extractFromFrameworkMatch(
            this.frameworkMatch,
            context.techStack
          );

        const comparison = await this.bestPracticeComparator.compare(
          extractedPractices,
          context
        );
        missingPractices = comparison.missingPractices;
        ambiguousPractices = comparison.ambiguousPractices;
        this.suggestionCollector.addAll(comparison.suggestions);

        logger.info("最佳实践对比完成（框架匹配）", {
          extracted: extractedPractices.length,
          missing: missingPractices.length,
          ambiguous: ambiguousPractices.length,
          suggestions: comparison.suggestions.length,
        });
      } catch (error) {
        logger.debug("最佳实践提取失败", { error });
      }
    }

    // v1.7: 使用规则需求分析器决定生成哪些规则
    const requirements = this.requirementsAnalyzer.analyzeRequirements(context);
    logger.info("规则需求分析完成", {
      totalRequirements: requirements.length,
      bySource: this.groupRequirementsBySource(requirements),
    });

    // v1.3: 生成多个专注的规则文件（每个 < 500 行）

    // 1. 全局概述规则（必需，约 280 行）
    const globalRule = this.generateGlobalOverviewRule(context);
    rules.push(globalRule);

    // 2. 代码风格规则（必需，约 200 行）
    const codeStyleRule = this.generateCodeStyleRule(context, missingPractices);
    rules.push(codeStyleRule);

    // 3. 项目架构规则（必需，约 250 行）
    const architectureRule = this.generateArchitectureRule(
      context,
      missingPractices
    );
    rules.push(architectureRule);

    // 4. 自定义工具规则（按需，约 150 行）
    if (this.hasCustomTools(context)) {
      const customToolsRule = this.generateCustomToolsRule(context);
      rules.push(customToolsRule);
    }

    // 5. 错误处理规则（按需，约 180 行）
    if (this.hasErrorHandling(context)) {
      const errorHandlingRule = this.generateErrorHandlingRule(
        context,
        missingPractices
      );
      rules.push(errorHandlingRule);
    }

    // 6. 状态管理规则（按需，约 200 行）
    // v1.7: 基于需求分析器结果或原有检测逻辑
    const needsStateManagement =
      requirements.some((r) => r.ruleType === "state-management") ||
      this.hasStateManagement(context);
    if (needsStateManagement) {
      const stateManagementRule = this.generateStateManagementRule(context);
      rules.push(stateManagementRule);
    }

    // 7. UI/UX 规则（按需，约 250 行）
    const needsUIUX =
      requirements.some((r) => r.ruleType === "ui-ux") ||
      this.isFrontendProject(context);
    if (needsUIUX) {
      const uiUxRule = this.generateUIUXRule(context);
      rules.push(uiUxRule);
    }

    // 8. 前端路由规则（按需，约 300 行）
    // v1.7: 基于需求分析器结果，即使没有路由文件，只要有依赖就生成
    const needsFrontendRouting = requirements.some(
      (r) => r.ruleType === "frontend-routing"
    );
    if (needsFrontendRouting) {
      // 如果没有检测到路由信息，创建一个基础的路由信息
      if (!context.frontendRouter) {
        // 从需求分析中获取路由框架信息
        const routingReq = requirements.find(
          (r) => r.ruleType === "frontend-routing"
        );
        if (
          routingReq &&
          routingReq.dependencies &&
          routingReq.dependencies.length > 0
        ) {
          // 根据依赖推断路由框架
          const depName = routingReq.dependencies[0].toLowerCase();
          let inferredFramework = "React Router";
          let inferredType: "file-based" | "config-based" = "config-based";
          let inferredLocation = ["src/"];

          if (depName.includes("next")) {
            inferredFramework = "Next.js";
            inferredType = "file-based";
            inferredLocation = ["app/"];
          } else if (depName.includes("nuxt")) {
            inferredFramework = "Nuxt";
            inferredType = "file-based";
            inferredLocation = ["pages/"];
          } else if (depName.includes("remix")) {
            inferredFramework = "Remix";
            inferredType = "file-based";
            inferredLocation = ["app/routes/"];
          } else if (depName.includes("sveltekit")) {
            inferredFramework = "SvelteKit";
            inferredType = "file-based";
            inferredLocation = ["src/routes/"];
          } else if (depName.includes("vue-router")) {
            inferredFramework = "Vue Router";
            inferredType = "config-based";
            inferredLocation = ["src/"];
          }

          // 创建基础的路由信息
          context.frontendRouter = {
            info: {
              exists: true,
              type: inferredType,
              framework: inferredFramework,
              location: inferredLocation,
            },
            pattern: {
              organization: "mixed",
              urlNaming: "kebab-case",
              fileNaming: "page.tsx",
              dynamicRoutePattern: "[id]",
              dynamicRouteExamples: [],
              hasRouteGroups: false,
              supportsLayouts: true,
              hasGuards: false,
              usesLazyLoading: false,
              hasRouteMeta: false,
              isDynamicGenerated: false,
            },
            examples: [],
          };
        }
      }

      if (context.frontendRouter) {
        const frontendRoutingRule = this.generateFrontendRoutingRule(context);
        rules.push(frontendRoutingRule);
      }
    }

    // 9. 后端路由规则（按需，约 300 行）
    // v1.7: 基于需求分析器结果，即使没有路由文件，只要有依赖就生成
    const needsBackendRouting = requirements.some(
      (r) => r.ruleType === "backend-routing"
    );
    if (needsBackendRouting) {
      // 如果没有检测到路由信息，创建一个基础的路由信息
      if (!context.backendRouter) {
        // 从需求分析中获取路由框架信息
        const routingReq = requirements.find(
          (r) => r.ruleType === "backend-routing"
        );
        if (
          routingReq &&
          routingReq.dependencies &&
          routingReq.dependencies.length > 0
        ) {
          // 根据依赖推断路由框架
          const depName = routingReq.dependencies[0].toLowerCase();
          let inferredFramework = "Express";
          let inferredType: "file-based" | "config-based" | "programmatic" =
            "programmatic";
          let inferredLocation = ["src/routes/", "src/api/"];

          if (depName.includes("fastify")) {
            inferredFramework = "Fastify";
          } else if (depName.includes("koa")) {
            inferredFramework = "Koa";
          } else if (depName.includes("nestjs")) {
            inferredFramework = "NestJS";
            inferredLocation = ["src/"];
          } else if (depName.includes("django")) {
            inferredFramework = "Django";
            inferredType = "config-based";
            inferredLocation = [""];
          } else if (depName.includes("flask")) {
            inferredFramework = "Flask";
            inferredLocation = ["app/"];
          }

          // 创建基础的路由信息
          context.backendRouter = {
            info: {
              exists: true,
              type: inferredType,
              framework: inferredFramework,
              location: inferredLocation,
            },
            pattern: {
              organization: "mixed",
              urlNaming: "kebab-case",
              fileNaming: "route.ts",
              dynamicRoutePattern: ":id",
              dynamicRouteExamples: [],
              hasRouteGroups: false,
              supportsLayouts: false,
              hasGuards: false,
              usesLazyLoading: false,
              hasRouteMeta: false,
              isDynamicGenerated: false,
            },
            examples: [],
          };
        }
      }

      if (context.backendRouter) {
        const backendRoutingRule = this.generateBackendRoutingRule(context);
        rules.push(backendRoutingRule);
      }
    }

    // 10. 测试规则（按需，约 220 行或简短提示）
    const needsTesting = requirements.some((r) => r.ruleType === "testing");
    if (needsTesting || this.featureExists(context, "testing")) {
      const testingRule = this.generateTestingRule(context);
      rules.push(testingRule);
    }

    // 11. 模块规则（如果是多模块项目）
    if (context.includeModuleRules && context.modules.length > 1) {
      for (const module of context.modules) {
        const moduleRule = this.generateModuleOverviewRule(context, module);
        rules.push(moduleRule);
      }
    }

    // 12. 自定义规则模板（可选，供用户填写）
    const customRuleTemplate = this.generateCustomRuleTemplate(context);
    rules.push(customRuleTemplate);

    return rules;
  }

  /**
   * 生成 instructions.md 文件
   */
  async generateInstructions(
    context: RuleGenerationContext
  ): Promise<InstructionsFile> {
    const content = this.generateInstructionsContent(context);

    return {
      content,
      fileName: "instructions.md",
      filePath: path.join(context.projectPath, ".cursor", "instructions.md"),
    };
  }

  /**
   * 检查是否有自定义工具
   */
  private hasCustomTools(context: RuleGenerationContext): boolean {
    return (
      context.customPatterns &&
      (context.customPatterns.customHooks.length > 0 ||
        context.customPatterns.customUtils.length > 0 ||
        context.customPatterns.apiClient?.exists)
    );
  }

  /**
   * 检查是否有错误处理
   */
  private hasErrorHandling(context: RuleGenerationContext): boolean {
    return (
      context.projectPractice?.errorHandling &&
      context.projectPractice.errorHandling.frequency > 0
    );
  }

  /**
   * 检查是否有状态管理
   */
  private hasStateManagement(context: RuleGenerationContext): boolean {
    return this.featureExists(context, "state-management");
  }

  /**
   * v1.3: 生成全局概述规则（约 280 行）
   */
  private generateGlobalOverviewRule(
    context: RuleGenerationContext
  ): CursorRule {
    const metadata = this.generateRuleMetadata(
      `${this.getProjectName(context.projectPath)} - 全局规则`,
      "项目级通用规范和开发原则",
      100,
      context.techStack.primary,
      ["global", "overview"],
      "overview"
    );

    // 生成角色定义（基于框架匹配）
    const persona = this.generatePersona(context);
    const frameworkReference = this.frameworkMatch
      ? `\n> 💡 **格式参考**: 本规则参考了 [awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) 中的 **${
          this.frameworkMatch.framework
        }** 格式（相似度: ${Math.round(
          this.frameworkMatch.similarity * 100
        )}%），采用 **${this.frameworkMatch.format}** 格式风格。\n`
      : "";

    const content =
      metadata +
      `
# 项目概述

${persona}

这是一个基于 ${context.techStack.primary.join(
        ", "
      )} 的项目。${frameworkReference}

## 技术栈

**主要技术**: ${context.techStack.primary.join(", ")}  
**语言**: ${context.techStack.languages.join(", ")}  
**包管理器**: ${context.techStack.packageManagers.join(", ")}  
${
  context.techStack.frameworks.length > 0
    ? `**框架**: ${context.techStack.frameworks.join(", ")}`
    : ""
}

## 开发规范文件

本项目的开发规范分布在以下专题文件中，请根据工作内容参考：

- **@code-style.mdc** - 代码风格和格式化规范
- **@architecture.mdc** - 项目架构和文件组织
${
  this.hasCustomTools(context)
    ? "- **@custom-tools.mdc** - 项目自定义工具（必须优先使用）\n"
    : ""
}${
        this.hasErrorHandling(context)
          ? "- **@error-handling.mdc** - 错误处理规范\n"
          : ""
      }${
        this.hasStateManagement(context)
          ? "- **@state-management.mdc** - 状态管理规范\n"
          : ""
      }${
        context.frontendRouter
          ? "- **@frontend-routing.mdc** - 前端路由规范\n"
          : ""
      }${
        context.backendRouter ? "- **@api-routing.mdc** - API 路由规范\n" : ""
      }${
        this.isFrontendProject(context)
          ? "- **@ui-ux.mdc** - UI/UX 设计规范\n"
          : ""
      }${
        this.featureExists(context, "testing")
          ? "- **@testing.mdc** - 测试规范\n"
          : ""
      }- **@custom-rules.mdc** - 自定义规则（可选，用户可自行填写）

**工作流程**: 详见 @../instructions.md

> 💡 **提示**: \`custom-rules.mdc\` 是一个可选文件，用于添加项目特定的自定义规则。如果未填写或已删除，不影响其他规则的执行。

## 核心开发原则

- **保持一致性** - 遵循项目现有代码风格和架构
- **优先使用项目工具** - 不要重新实现已有的工具函数和 Hooks
- **遵循路径别名** - 使用配置的路径别名，不使用相对路径
- **渐进式改进** - 在现有基础上小步优化，不破坏架构
- **类型安全** - 充分利用 TypeScript 的类型系统
- **代码质量** - 编写简洁、可维护、高性能的代码

## ⚠️ 文件生成限制

**严格禁止**：
- ❌ 禁止生成任何 '.md' 文件（除了 '.cursor/instructions.md' 和 '.cursor/rules/*.mdc' 规则文件）
- ❌ 禁止生成过程记录、总结、日志等文档文件
- ❌ 禁止生成与项目无关的文档文件

**允许的文件**：
- ✅ '.cursor/instructions.md' - Cursor 工作流程说明
- ✅ '.cursor/rules/*.mdc' - Cursor 规则文件

**说明**：生成代码时，不要创建任何 Markdown 文档文件。所有文档都应该通过代码注释、类型定义和清晰的命名来表达。

${
  context.techStack.frameworks.length > 0
    ? `
## 框架特定原则

${this.generateFrameworkPrinciples(context)}
`
    : ""
}

## 开始任务前

**始终**让 Cursor 确认理解任务：
\`\`\`
请确认你理解了以下任务：[描述任务]
需要创建哪些文件？需要使用哪些项目工具？
\`\`\`

然后参考相关的专题规则文件。

---

*这是规则文件的入口，详细规范请参考上述专题文件。*
`;

    return {
      scope: "global",
      modulePath: context.projectPath,
      content,
      fileName: "global-rules.mdc",
      priority: 100,
      type: "overview",
    };
  }

  /**
   * v1.3: 生成代码风格规则（约 200 行）
   * v1.5: 补充缺失的最佳实践
   */
  private generateCodeStyleRule(
    context: RuleGenerationContext,
    missingPractices?: any[]
  ): CursorRule {
    const metadata = this.generateRuleMetadata(
      "代码风格规范",
      "基于项目配置的代码格式化和命名约定",
      90,
      context.techStack.primary,
      ["style", "formatting"],
      "guideline",
      ["global-rules"]
    );

    // 补充缺失的最佳实践
    const codeStylePractices =
      missingPractices?.filter((p) => p.category === "code-style") || [];
    const additionalPractices = this.formatMissingPractices(codeStylePractices);

    const content =
      metadata +
      `
# 代码风格规范

参考: @global-rules.mdc

## 核心原则

- 编写简洁、可读、可维护的代码
- 遵循项目现有的代码风格
- 使用描述性的变量名和函数名
- 优先使用函数式编程模式

${
  context.projectConfig
    ? this.generateConfigBasedStyleRules(context)
    : this.generateCodeStyleGuidelines(context)
}

${additionalPractices ? `\n## 补充的最佳实践\n\n${additionalPractices}\n` : ""}

---

*代码风格会被编辑器自动应用，重点是理解和遵循命名约定。*
`;

    return {
      scope: "specialized",
      modulePath: context.projectPath,
      content,
      fileName: "code-style.mdc",
      priority: 90,
      type: "guideline",
      depends: ["global-rules"],
    };
  }

  /**
   * v1.3: 生成项目架构规则（约 250 行）
   * v1.5: 补充缺失的最佳实践
   */
  private generateArchitectureRule(
    context: RuleGenerationContext,
    missingPractices?: any[]
  ): CursorRule {
    const metadata = this.generateRuleMetadata(
      "项目架构",
      "文件组织和模块结构规范",
      90,
      context.techStack.primary,
      ["architecture", "structure"],
      "guideline",
      ["global-rules"]
    );

    // 补充缺失的最佳实践
    const architecturePractices =
      missingPractices?.filter((p) => p.category === "architecture") || [];
    const additionalPractices = this.formatMissingPractices(
      architecturePractices
    );

    const content =
      metadata +
      `
# 项目架构

参考: @global-rules.mdc

${
  context.fileOrganization
    ? this.generateStructureBasedFileOrgRules(context)
    : this.generateFileOrganizationGuidelines(context)
}

${additionalPractices ? `\n## 补充的最佳实践\n\n${additionalPractices}\n` : ""}

---

*新建文件前，请先确认位置和命名规范。*
`;

    return {
      scope: "specialized",
      modulePath: context.projectPath,
      content,
      fileName: "architecture.mdc",
      priority: 90,
      type: "guideline",
      depends: ["global-rules"],
    };
  }

  /**
   * v1.3: 生成自定义工具规则（约 150 行）
   */
  private generateCustomToolsRule(context: RuleGenerationContext): CursorRule {
    const metadata = this.generateRuleMetadata(
      "项目自定义工具",
      "必须优先使用的自定义 Hooks 和工具函数",
      95,
      context.techStack.primary,
      ["custom-tools", "reference"],
      "reference",
      ["global-rules"]
    );

    const content =
      metadata +
      `
# 项目自定义工具

参考: @global-rules.mdc

${this.generateCustomToolsRules(context)}

---

*使用项目工具保持代码一致性，避免重复实现。*
`;

    return {
      scope: "specialized",
      modulePath: context.projectPath,
      content,
      fileName: "custom-tools.mdc",
      priority: 95,
      type: "reference",
      depends: ["global-rules"],
    };
  }

  /**
   * v1.3: 生成错误处理规则（约 180 行）
   */
  private generateErrorHandlingRule(
    context: RuleGenerationContext,
    missingPractices?: any[]
  ): CursorRule {
    const metadata = this.generateRuleMetadata(
      "错误处理规范",
      "基于项目实践的错误处理和日志规范",
      80,
      context.techStack.primary,
      ["error-handling", "practice"],
      "practice",
      ["global-rules", "custom-tools"]
    );

    // 补充缺失的最佳实践
    const errorHandlingPractices =
      missingPractices?.filter((p) => p.category === "error-handling") || [];
    const additionalPractices = this.formatMissingPractices(
      errorHandlingPractices
    );

    const content =
      metadata +
      `
# 错误处理规范

参考: @global-rules.mdc, @custom-tools.mdc

${this.generatePracticeBasedErrorHandling(context)}

${additionalPractices ? `\n## 补充的最佳实践\n\n${additionalPractices}\n` : ""}

---

*遵循项目现有的错误处理模式，保持一致性。*
`;

    return {
      scope: "specialized",
      modulePath: context.projectPath,
      content,
      fileName: "error-handling.mdc",
      priority: 80,
      type: "practice",
      depends: ["global-rules", "custom-tools"],
    };
  }

  /**
   * v1.3: 生成状态管理规则（约 200 行）
   */
  private generateStateManagementRule(
    context: RuleGenerationContext
  ): CursorRule {
    const stateLib = context.techStack.dependencies.find((d) =>
      ["redux", "mobx", "zustand", "pinia", "vuex"].some((lib) =>
        d.name.toLowerCase().includes(lib)
      )
    );

    const metadata = this.generateRuleMetadata(
      "状态管理规范",
      `${stateLib?.name || "状态管理"} 使用规范`,
      85,
      context.techStack.primary,
      ["state-management", "practice"],
      "practice",
      ["global-rules"]
    );

    const content =
      metadata +
      `
# 状态管理规范

参考: @global-rules.mdc

${this.generateStateManagementContent(context, stateLib?.name)}

---

*状态管理是项目的核心，遵循既定模式。*
`;

    return {
      scope: "specialized",
      modulePath: context.projectPath,
      content,
      fileName: "state-management.mdc",
      priority: 85,
      type: "practice",
      depends: ["global-rules"],
    };
  }

  /**
   * v1.3: 生成 UI/UX 规则（约 250 行）
   */
  private generateUIUXRule(context: RuleGenerationContext): CursorRule {
    const metadata = this.generateRuleMetadata(
      "UI/UX 设计规范",
      "用户界面和用户体验设计规范",
      75,
      context.techStack.primary,
      ["ui-ux", "frontend"],
      "guideline",
      ["global-rules", "code-style"]
    );

    const content =
      metadata +
      `
# UI/UX 设计规范

参考: @global-rules.mdc, @code-style.mdc

${this.generateUIUXGuidelines(context)}

---

*UI/UX 规范确保良好的用户体验和无障碍访问。*
`;

    return {
      scope: "specialized",
      modulePath: context.projectPath,
      content,
      fileName: "ui-ux.mdc",
      priority: 75,
      type: "guideline",
      depends: ["global-rules", "code-style"],
    };
  }

  /**
   * v1.3.x: 生成前端路由规则（约 300 行）
   */
  private generateFrontendRoutingRule(
    context: RuleGenerationContext
  ): CursorRule {
    const router = context.frontendRouter!;
    const metadata = this.generateRuleMetadata(
      "前端路由规范",
      `${router.info.framework} 路由组织和使用规范`,
      85,
      context.techStack.primary,
      ["routing", "frontend", "navigation"],
      "practice",
      ["global-rules", "architecture"]
    );

    const content =
      metadata +
      `
# 前端路由规范

参考: @global-rules.mdc, @architecture.mdc

## 项目当前使用

**路由系统**: ${router.info.framework}${
        router.info.version ? ` (${router.info.version})` : ""
      }  
**路由类型**: ${this.getRouterTypeDescription(router.info.type)}  
**路由位置**: ${router.info.location.map((l) => `\`@${l}\``).join(", ")}

${this.generateFrontendRouterContent(router, context)}

---

*路由是应用的骨架，保持清晰的路由结构。*
`;

    return {
      scope: "specialized",
      modulePath: context.projectPath,
      content,
      fileName: "frontend-routing.mdc",
      priority: 85,
      type: "practice",
      depends: ["global-rules", "architecture"],
    };
  }

  /**
   * v1.3.x: 生成后端路由规则（约 300 行）
   */
  private generateBackendRoutingRule(
    context: RuleGenerationContext
  ): CursorRule {
    const router = context.backendRouter!;
    const metadata = this.generateRuleMetadata(
      "API 路由规范",
      `${router.info.framework} API 路由组织和使用规范`,
      85,
      context.techStack.primary,
      ["api", "routing", "backend"],
      "practice",
      ["global-rules", "architecture"]
    );

    const content =
      metadata +
      `
# API 路由规范

参考: @global-rules.mdc, @architecture.mdc

## 项目当前使用

**路由系统**: ${router.info.framework}  
**路由类型**: ${this.getRouterTypeDescription(router.info.type)}  
**路由位置**: ${router.info.location.map((l) => `\`@${l}\``).join(", ")}

${this.generateBackendRouterContent(router, context)}

---

*API 路由要保持 RESTful 设计，清晰的资源组织。*
`;

    return {
      scope: "specialized",
      modulePath: context.projectPath,
      content,
      fileName: "api-routing.mdc",
      priority: 85,
      type: "practice",
      depends: ["global-rules", "architecture"],
    };
  }

  /**
   * 生成前端路由器内容
   */
  private generateFrontendRouterContent(
    router: { info: any; pattern: any; examples: any[] },
    context: RuleGenerationContext
  ): string {
    const { info, pattern, examples } = router;
    let content = "";

    // 路由生成方式（带确定性标注）
    const dynamicAnalysis = (router as any).dynamicAnalysis;
    if (dynamicAnalysis && dynamicAnalysis.isDynamic) {
      content += this.generateDynamicRoutingSection(dynamicAnalysis);
    }

    // 路由组织方式
    content += `## 路由组织方式\n\n`;
    content += `**组织模式**: ${this.getOrganizationDescription(
      pattern.organization
    )}\n`;
    content += `**URL 命名**: ${pattern.urlNaming}\n`;
    content += `**文件命名**: ${pattern.fileNaming}\n\n`;

    // 实际示例
    if (examples.length > 0) {
      content += `## 实际路由示例\n\n`;

      const staticRoutes = examples
        .filter((e) => e.type === "static")
        .slice(0, 3);
      if (staticRoutes.length > 0) {
        content += `### 静态路由\n\n`;
        for (const route of staticRoutes) {
          content += `- **@${route.filePath}** → \`${route.url}\`\n`;
        }
        content += `\n`;
      }

      const dynamicRoutes = examples
        .filter((e) => e.type === "dynamic")
        .slice(0, 3);
      if (dynamicRoutes.length > 0) {
        content += `### 动态路由\n\n`;
        for (const route of dynamicRoutes) {
          content += `- **@${route.filePath}** → \`${route.url}\`\n`;
        }
        content += `\n**参数获取**: 参见实际文件中的代码示例\n\n`;
      }
    }

    // 新建路由规范
    content += `## 新建路由时\n\n`;
    content += this.generateNewRouteGuidelines(info, pattern, examples);

    // 路由特性
    if (pattern.hasRouteGroups) {
      content += `## 路由分组\n\n`;
      content += `项目使用 ${pattern.groupPattern} 语法组织相关路由。\n\n`;
      content += `示例: 参见现有路由分组结构\n\n`;
    }

    if (pattern.hasGuards) {
      content += `## 路由守卫\n\n`;
      content += `项目使用路由守卫/中间件进行权限控制。\n\n`;
      if (pattern.guardFiles && pattern.guardFiles.length > 0) {
        content += `参考: @${pattern.guardFiles[0]}\n\n`;
      }
    }

    if (pattern.usesLazyLoading) {
      content += `## 路由懒加载\n\n`;
      content += `项目使用懒加载优化性能。\n\n`;
      content += `✅ 继续为大型页面使用懒加载\n\n`;
    }

    // 移除建议，改为收集到 SuggestionCollector
    content += `## 当前实践\n\n`;
    content += `✅ 保持现有的路由组织方式\n`;
    content += `✅ 遵循命名规范（${pattern.urlNaming}）\n`;
    content += `\n`;

    return content;
  }

  /**
   * 生成后端路由器内容
   */
  private generateBackendRouterContent(
    router: { info: any; pattern: any; examples: any[] },
    context: RuleGenerationContext
  ): string {
    const { info, pattern, examples } = router;
    let content = "";

    // API 路由组织
    content += `## API 路由组织\n\n`;
    content += `**组织模式**: ${this.getOrganizationDescription(
      pattern.organization
    )}\n`;
    content += `**URL 命名**: ${pattern.urlNaming}\n\n`;

    if (pattern.isDynamicGenerated) {
      content += `⚠️ **注意**: 项目路由通过脚本动态生成\n`;
      content += `生成脚本: \`${pattern.generationScript}\`\n\n`;
    }

    // 实际 API 示例
    if (examples.length > 0) {
      content += `## 实际 API 路由示例\n\n`;

      const grouped = this.groupExamplesByFile(examples);
      for (const [file, routes] of Object.entries(grouped).slice(0, 3)) {
        content += `### @${file}\n\n`;
        for (const route of routes.slice(0, 5)) {
          content += `- \`${route.method || "GET"} ${route.url}\`\n`;
        }
        content += `\n`;
      }
    }

    // RESTful 规范
    if (info.framework === "Express" || info.framework === "Fastify") {
      content += `## RESTful API 设计\n\n`;
      content += `项目 API 遵循 RESTful 设计原则：\n\n`;
      content += `- \`GET /resources\` - 获取列表\n`;
      content += `- \`GET /resources/:id\` - 获取单个\n`;
      content += `- \`POST /resources\` - 创建\n`;
      content += `- \`PUT /resources/:id\` - 更新\n`;
      content += `- \`DELETE /resources/:id\` - 删除\n\n`;
    }

    // 新建 API 规范
    content += `## 新建 API 路由时\n\n`;
    content += this.generateNewAPIRouteGuidelines(info, pattern, examples);

    // 中间件
    if (pattern.hasGuards) {
      content += `## 中间件使用\n\n`;
      content += `项目使用中间件进行认证、验证等处理。\n\n`;
      if (pattern.guardFiles) {
        content += `参考: @${pattern.guardFiles[0]}\n\n`;
      }
    }

    content += `## 短期规范\n\n`;
    content += `✅ 保持 RESTful API 设计原则\n`;
    content += `✅ 遵循现有的路由组织方式\n`;
    if (!pattern.isDynamicGenerated) {
      // 移除建议，改为收集到 SuggestionCollector
    }
    content += `\n`;
    content += `\n`;

    return content;
  }

  /**
   * 生成新建路由指南
   */
  private generateNewRouteGuidelines(
    info: any,
    pattern: any,
    examples: any[]
  ): string {
    let guidelines = "";

    if (info.framework.includes("Next.js")) {
      if (info.version === "App Router") {
        guidelines += `### 步骤\n\n`;
        guidelines += `1. 在 \`app/\` 目录确定路由路径\n`;
        guidelines += `2. 创建文件夹（URL 路径）\n`;
        guidelines += `3. 创建 \`page.tsx\`（页面组件）\n`;
        if (pattern.supportsLayouts) {
          guidelines += `4. 如需布局，创建 \`layout.tsx\`\n`;
        }
        guidelines += `\n`;

        if (examples.length > 0) {
          guidelines += `参考示例: @${examples[0].filePath}\n\n`;
        }
      }
    } else if (info.framework === "React Router") {
      guidelines += `### 步骤\n\n`;
      guidelines += `1. 在路由配置文件添加路由定义\n`;
      guidelines += `2. 创建对应的页面组件\n`;
      if (pattern.usesLazyLoading) {
        guidelines += `3. 大型页面使用懒加载\n`;
      }
      guidelines += `\n`;
    }

    return guidelines;
  }

  /**
   * 生成新建 API 路由指南
   */
  private generateNewAPIRouteGuidelines(
    info: any,
    pattern: any,
    examples: any[]
  ): string {
    let guidelines = "";

    if (info.framework === "Express") {
      guidelines += `### 步骤\n\n`;
      guidelines += `1. 在 \`routes/\` 目录创建或选择模块文件\n`;
      guidelines += `2. 定义路由处理器\n`;
      guidelines += `3. 使用 \`express.Router()\` 导出\n`;
      guidelines += `4. 在主文件注册路由\n\n`;

      if (examples.length > 0) {
        guidelines += `参考示例: @${examples[0].filePath}\n\n`;
      }
    } else if (info.framework === "Django") {
      guidelines += `### 步骤\n\n`;
      guidelines += `1. 在应用的 \`urls.py\` 添加路由\n`;
      guidelines += `2. 创建对应的视图函数\n`;
      guidelines += `3. 在主 \`urls.py\` 包含应用路由\n\n`;
    }

    return guidelines;
  }

  /**
   * 获取路由类型描述
   */
  private getRouterTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      "file-based": "文件系统路由（约定式）",
      "config-based": "配置式路由（声明式）",
      programmatic: "编程式路由（代码定义）",
      mixed: "混合模式",
    };
    return descriptions[type] || type;
  }

  /**
   * 获取组织方式描述
   */
  private getOrganizationDescription(org: string): string {
    const descriptions: Record<string, string> = {
      centralized: "集中管理",
      distributed: "分散定义",
      "feature-based": "按功能模块组织",
      mixed: "混合方式",
    };
    return descriptions[org] || org;
  }

  /**
   * 生成动态路由章节（带确定性标注）
   */
  private generateDynamicRoutingSection(analysis: any): string {
    let section = `## 路由生成方式\n\n`;

    const certaintyLabels: Record<string, string> = {
      certain: "✅ [确定]",
      likely: "⚠️ [可能]",
      uncertain: "ℹ️ [不确定]",
    };

    const label =
      certaintyLabels[analysis.recommendation.certainty] || "ℹ️ [未知]";
    section += `### ${label} ${analysis.recommendation.explanation}\n\n`;

    if (analysis.documentation.found) {
      // 基于文档
      section += `**文档来源**: @${analysis.documentation.file}\n\n`;
      section += `项目文档说明：\n`;
      section += `> ${analysis.documentation.section.slice(0, 200)}...\n\n`;
      section += `**生成方法**: \`${analysis.recommendation.method}\`\n\n`;

      if (analysis.documentation.file) {
        section += `详见: @${analysis.documentation.file} 的路由章节\n\n`;
      }
    } else if (
      analysis.recommendation.certainty === "certain" ||
      analysis.recommendation.certainty === "likely"
    ) {
      // 基于高置信度检测
      section += `**检测到的方法**: \`${analysis.recommendation.method}\`\n\n`;

      if (analysis.scripts.files.length > 0) {
        section += `**脚本文件**: @${analysis.scripts.files[0]}\n`;
      }

      section += `\n**使用方法**:\n`;
      section += `\`\`\`bash\n${analysis.recommendation.method}\n\`\`\`\n\n`;
    } else {
      // 不确定
      section += `检测到项目可能使用脚本动态生成路由，但无法完全确定。\n\n`;

      section += `**可能的选项**:\n`;
      if (analysis.scripts.commands.length > 0) {
        section += `命令：\n`;
        for (const cmd of analysis.scripts.commands) {
          section += `- \`${cmd}\`\n`;
        }
      }
      if (analysis.scripts.files.length > 0) {
        section += `脚本：\n`;
        for (const file of analysis.scripts.files) {
          section += `- @${file}\n`;
        }
      }

      section += `\n**当前假设**: 使用 \`${analysis.recommendation.method}\`\n`;
      section += `（${analysis.recommendation.explanation}）\n\n`;

      section += `❓ **请确认**: 如果不正确，请告诉我正确的方式，我将更新此规则。\n\n`;
    }

    if (analysis.recommendation.certainty === "certain") {
      section += `✅ **新建路由时**: 使用上述方法生成路由，保持一致性。\n\n`;
    } else {
      section += `⚠️ **新建路由时**: 请先确认正确的生成方式，然后使用。\n\n`;
    }

    return section;
  }

  /**
   * 按文件分组示例
   */
  private groupExamplesByFile(examples: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    for (const example of examples) {
      if (!grouped[example.filePath]) {
        grouped[example.filePath] = [];
      }
      grouped[example.filePath].push(example);
    }
    return grouped;
  }

  /**
   * v1.3: 生成测试规则（约 220 行或简短）
   */
  private generateTestingRule(context: RuleGenerationContext): CursorRule {
    const hasTests = this.featureExists(context, "testing");

    const metadata = this.generateRuleMetadata(
      "测试规范",
      hasTests ? "测试组织和最佳实践" : "测试建议",
      70,
      context.techStack.primary,
      ["testing"],
      hasTests ? "practice" : "suggestion",
      ["global-rules"]
    );

    const content =
      metadata +
      `
# 测试规范

参考: @global-rules.mdc

${this.generateConditionalTestingRules(context)}

---

${
  hasTests
    ? "*测试是代码质量的保证，保持良好的测试覆盖率。*"
    : "*当前项目未配置测试，按需添加。*"
}
`;

    return {
      scope: "specialized",
      modulePath: context.projectPath,
      content,
      fileName: "testing.mdc",
      priority: 70,
      type: hasTests ? "practice" : "suggestion",
      depends: ["global-rules"],
    };
  }

  /**
   * v1.3: 旧的 generateGlobalRule 重命名保留（用于向后兼容）
   */
  private generateGlobalRule(context: RuleGenerationContext): CursorRule {
    const metadata = this.generateRuleMetadata(
      `${this.getProjectName(context.projectPath)} - 全局开发规则`,
      "基于项目实际情况和最佳实践自动生成的 Cursor Rules",
      100,
      context.techStack.primary,
      ["global", "best-practices"]
    );

    let content =
      metadata +
      `
# 项目概述

这是一个基于 ${context.techStack.primary.join(", ")} 的项目。

## 技术栈

**主要技术栈：**
${context.techStack.primary.map((tech) => `- ${tech}`).join("\n")}

**语言：** ${context.techStack.languages.join(", ")}

**包管理器：** ${context.techStack.packageManagers.join(", ")}

${
  context.techStack.frameworks.length > 0
    ? `**框架：** ${context.techStack.frameworks.join(", ")}`
    : ""
}

## 项目结构

${this.generateProjectStructureDescription(context)}

## 核心功能特征

${this.generateFeaturesDescription(context.codeFeatures)}

---

# 开发规范

${this.generateDevelopmentGuidelines(context)}

---

# 代码风格

${
  context.projectConfig
    ? this.generateConfigBasedStyleRules(context)
    : this.generateCodeStyleGuidelines(context)
}

---

${context.customPatterns ? this.generateCustomToolsRules(context) : ""}

${
  context.customPatterns && context.customPatterns.customHooks.length > 0
    ? "---\n\n"
    : ""
}

# 最佳实践

${this.generateBestPracticesSection(context.bestPractices)}

---

# 文件组织

${
  context.fileOrganization
    ? this.generateStructureBasedFileOrgRules(context)
    : this.generateFileOrganizationGuidelines(context)
}

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
    const tags = [module.type, "module"];
    const metadata = this.generateRuleMetadata(
      `${module.name} 模块规则`,
      module.description || module.name + " 模块的开发规则",
      50,
      context.techStack.primary,
      tags
    );

    const content =
      metadata +
      `
# ${module.name} 模块

**类型：** ${this.getModuleTypeName(module.type)}

**路径：** \`${module.path}\`

${module.description ? `**描述：** ${module.description}` : ""}

## 模块职责

${this.generateModuleResponsibilities(module)}

## 开发指南

${this.generateModuleGuidelines(context, module)}

## 依赖关系

${
  module.dependencies.length > 0
    ? `此模块依赖以下包：
${module.dependencies
  .slice(0, 10)
  .map((d) => `- ${d}`)
  .join("\n")}
${
  module.dependencies.length > 10
    ? `\n...以及其他 ${module.dependencies.length - 10} 个依赖`
    : ""
}`
    : "此模块没有外部依赖。"
}

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

    let desc = `这是一个${
      context.modules.length > 5 ? "大型" : ""
    }多模块项目，包含以下模块：\n\n`;

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
${
  f.examples.length > 0
    ? `- **示例：** ${f.examples.slice(0, 3).join(", ")}`
    : ""
}
`
      )
      .join("\n");
  }

  /**
   * 生成开发指南
   */
  private generateDevelopmentGuidelines(
    context: RuleGenerationContext
  ): string {
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

    // 添加错误处理指南（使用基于项目实践的版本）
    guidelines += context.projectPractice
      ? this.generatePracticeBasedErrorHandling(context)
      : this.generateErrorHandlingGuidelines(context);

    // 添加测试相关指南（按需生成）
    guidelines += this.generateConditionalTestingRules(context);

    // 添加 UI/UX 规范（前端项目）
    if (this.isFrontendProject(context)) {
      guidelines += this.generateUIUXGuidelines(context);
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
   * 判断是否为前端项目
   */
  private isFrontendProject(context: RuleGenerationContext): boolean {
    const frontendFrameworks = [
      "React",
      "Vue",
      "Angular",
      "Svelte",
      "Next.js",
      "Nuxt",
    ];
    return context.techStack.frameworks.some((f) =>
      frontendFrameworks.includes(f)
    );
  }

  /**
   * 生成 UI/UX 规范
   */
  private generateUIUXGuidelines(context: RuleGenerationContext): string {
    return `## UI/UX 设计规范

### 视觉层次

**建立清晰的视觉层次以引导用户注意力**：

- **大小和比例**：重要元素使用更大的尺寸
- **颜色对比**：使用颜色突出关键信息和行动号召
- **间距**：使用空白空间分隔不同的内容区域
- **字体层次**：标题、副标题、正文使用不同的字体大小和粗细

示例：
\`\`\`tsx
// ✅ 清晰的视觉层次
<div className="card">
  <h1 className="text-3xl font-bold">主标题</h1>
  <h2 className="text-xl text-gray-600 mt-2">副标题</h2>
  <p className="text-base mt-4">正文内容...</p>
  <button className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg">
    主要操作
  </button>
</div>
\`\`\`

### 设计一致性

**在整个应用中保持一致的设计风格**：

- **颜色系统**：定义主色、辅助色、中性色调色板
- **间距系统**：使用统一的间距尺度（4px、8px、16px、24px、32px）
- **字体系统**：限制字体大小的数量（通常 5-7 个级别）
- **组件样式**：按钮、输入框、卡片等保持一致的外观

\`\`\`typescript
// ✅ 使用设计令牌（Design Tokens）
const theme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#10B981',
    danger: '#EF4444',
    neutral: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      // ...
    }
  },
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  }
};
\`\`\`

### 导航模式

**创建直观的导航，减少用户认知负担**：

- **清晰的主导航**：主要功能易于发现
- **面包屑导航**：帮助用户了解当前位置
- **搜索功能**：对于内容丰富的应用提供搜索
- **一致的位置**：导航元素放在用户预期的位置

\`\`\`tsx
// ✅ 清晰的导航结构
<nav>
  <div className="logo">应用名称</div>
  <ul className="nav-items">
    <li><Link to="/">首页</Link></li>
    <li><Link to="/products">产品</Link></li>
    <li><Link to="/about">关于</Link></li>
  </ul>
  <div className="user-menu">
    <button>用户菜单</button>
  </div>
</nav>

{/* 面包屑 */}
<div className="breadcrumb">
  首页 / 产品 / 详情
</div>
\`\`\`

### 响应式设计

**确保应用在不同设备上都能良好展示**：

- **移动优先**：从小屏幕开始设计，逐步增强
- **断点**：使用标准断点（sm: 640px, md: 768px, lg: 1024px, xl: 1280px）
- **弹性布局**：使用 Flexbox 和 Grid 创建灵活的布局
- **触摸友好**：移动端按钮至少 44x44px

\`\`\`tsx
// ✅ 响应式组件
<div className="
  grid 
  grid-cols-1 
  md:grid-cols-2 
  lg:grid-cols-3 
  gap-4 
  md:gap-6
">
  {items.map(item => (
    <Card key={item.id} {...item} />
  ))}
</div>
\`\`\`

### 无障碍访问（WCAG）

**遵循 WCAG 2.1 AA 级标准，确保所有用户都能访问**：

**1. 可感知性（Perceivable）**：
- **文本替代**：为图片提供 alt 文本
- **颜色对比**：文本与背景的对比度至少 4.5:1（大文本 3:1）
- **可调整文本**：支持文本缩放至 200%

\`\`\`tsx
// ✅ 提供 alt 文本
<img src="profile.jpg" alt="用户头像：张三" />

// ✅ 足够的颜色对比
<button className="bg-blue-600 text-white"> {/* 对比度 > 4.5:1 */}
  提交
</button>

// ❌ 仅依赖颜色传达信息
<span className="text-red-500">错误</span>  {/* 缺少图标或文字说明 */}

// ✅ 同时使用颜色和图标
<span className="text-red-500">
  <AlertIcon /> 错误：请填写必填字段
</span>
\`\`\`

**2. 可操作性（Operable）**：
- **键盘导航**：所有功能都可以通过键盘访问
- **焦点可见**：清晰的焦点指示器
- **足够的时间**：不要使用自动消失的内容（或提供控制）

\`\`\`tsx
// ✅ 键盘可访问的下拉菜单
<button 
  onClick={toggleMenu}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      toggleMenu();
    }
  }}
  aria-expanded={isOpen}
  aria-haspopup="true"
>
  菜单
</button>

// ✅ 清晰的焦点样式
<style>
  button:focus-visible {
    outline: 2px solid #3B82F6;
    outline-offset: 2px;
  }
</style>
\`\`\`

**3. 可理解性（Understandable）**：
- **语义化 HTML**：使用正确的 HTML 元素
- **标签和说明**：为表单控件提供标签
- **错误建议**：提供具体的错误修复建议

\`\`\`tsx
// ✅ 语义化和可访问的表单
<form>
  <label htmlFor="email">
    电子邮箱
    <span aria-label="必填">*</span>
  </label>
  <input
    id="email"
    type="email"
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby={hasError ? "email-error" : undefined}
  />
  {hasError && (
    <div id="email-error" role="alert">
      请输入有效的电子邮箱地址，例如：user@example.com
    </div>
  )}
</form>
\`\`\`

**4. 鲁棒性（Robust）**：
- **ARIA 属性**：适当使用 ARIA 增强可访问性
- **兼容辅助技术**：确保与屏幕阅读器等工具兼容

\`\`\`tsx
// ✅ 使用 ARIA 增强自定义组件
<div
  role="tablist"
  aria-label="设置选项卡"
>
  <button
    role="tab"
    aria-selected={activeTab === 'general'}
    aria-controls="general-panel"
    id="general-tab"
  >
    常规
  </button>
  <button
    role="tab"
    aria-selected={activeTab === 'privacy'}
    aria-controls="privacy-panel"
    id="privacy-tab"
  >
    隐私
  </button>
</div>

<div
  role="tabpanel"
  id="general-panel"
  aria-labelledby="general-tab"
  hidden={activeTab !== 'general'}
>
  {/* 内容 */}
</div>
\`\`\`

### 性能和用户体验

- **加载反馈**：提供加载指示器
- **骨架屏**：在内容加载时显示内容结构
- **优化图片**：使用适当的格式和尺寸
- **渐进增强**：基础功能在所有环境下可用

\`\`\`tsx
// ✅ 提供加载状态
{isLoading ? (
  <div className="skeleton">
    <div className="skeleton-line" />
    <div className="skeleton-line" />
  </div>
) : (
  <div className="content">{data}</div>
)}

// ✅ 图片优化（Next.js 示例）
<Image
  src="/hero.jpg"
  alt="英雄图片"
  width={1200}
  height={600}
  priority
  sizes="(max-width: 768px) 100vw, 1200px"
/>
\`\`\`

### UI 组件最佳实践

**按钮**：
- 主要操作使用明显的样式
- 次要操作使用较弱的视觉权重
- 危险操作使用红色/警告色
- 最小触摸目标 44x44px

**表单**：
- 清晰的标签和占位符
- 实时验证反馈
- 明确的错误消息
- 自动聚焦第一个字段

**模态框/对话框**：
- 提供关闭方式
- ESC 键可关闭
- 焦点陷阱（不能 Tab 到外部）
- 返回后恢复焦点

`;
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
    if (
      context.techStack.languages.includes("JavaScript") ||
      context.techStack.languages.includes("TypeScript")
    ) {
      style += this.generateJavaScriptStyleGuide(context);
    }

    if (context.techStack.languages.includes("Python")) {
      style += this.generatePythonStyleGuide();
    }

    // 添加格式化和命名约定
    style += this.generateFormattingRules(context);
    style += this.generateNamingConventions(context);

    return style;
  }

  /**
   * 生成 JavaScript/TypeScript 风格指南
   */
  private generateJavaScriptStyleGuide(context: RuleGenerationContext): string {
    const isTypeScript = context.techStack.languages.includes("TypeScript");

    return `## JavaScript/TypeScript 代码风格

### 基本规范
- 使用 \`const\` 和 \`let\`，避免 \`var\`
- 优先使用箭头函数
- 使用模板字符串而非字符串拼接
- 使用解构赋值简化代码
- 使用 async/await 处理异步操作

### 格式化规则
- **字符串**：优先使用单引号 \`'string'\`，除非需要插值则使用反引号 \`\\\`template\\\`\`
- **分号**：保持一致（推荐使用分号）
- **行长度**：限制每行最多 100 个字符
- **缩进**：使用 2 个空格（或根据项目配置）
- **尾随逗号**：多行对象/数组最后一项添加逗号

### 代码组织
- **导入顺序**：
  1. 外部库导入
  2. 内部模块导入
  3. 相对路径导入
  ${isTypeScript ? "4. 类型导入（使用 `import type`）" : ""}
- **导出**：优先使用命名导出，避免默认导出（提高可维护性）

${
  isTypeScript
    ? `### TypeScript 特定规范
- 优先使用 \`interface\` 定义对象类型
- 使用 \`type\` 定义联合类型和工具类型
- 避免使用 \`any\`，使用 \`unknown\` 代替
- 为函数参数和返回值显式添加类型
- 使用严格模式（\`strict: true\`）
- 使用类型守卫而非类型断言
`
    : ""
}
`;
  }

  /**
   * 生成 Python 风格指南
   */
  private generatePythonStyleGuide(): string {
    return `## Python 代码风格

### PEP 8 规范
- **缩进**：使用 4 个空格
- **行长度**：限制每行最多 79 个字符（文档字符串/注释 72 个字符）
- **空行**：
  - 顶级函数和类定义之间空 2 行
  - 类内方法之间空 1 行
- **字符串引号**：保持一致（推荐单引号）

### 命名规范
- **函数/变量**：snake_case (例如：\`get_user_data\`)
- **类名**：PascalCase (例如：\`UserProfile\`)
- **常量**：UPPER_CASE (例如：\`MAX_RETRY_COUNT\`)
- **私有属性**：单下划线前缀 (例如：\`_internal_method\`)
- **特殊方法**：双下划线前后 (例如：\`__init__\`)

### 导入规范
- **导入顺序**：
  1. 标准库导入
  2. 第三方库导入
  3. 本地应用/库导入
- 每组之间空一行
- 避免通配符导入 (\`from module import *\`)

### 类型注解
- 为函数参数添加类型注解
- 为函数返回值添加类型注解
- 使用 \`typing\` 模块的类型（List, Dict, Optional 等）
- 使用 \`mypy\` 进行静态类型检查

`;
  }

  /**
   * 生成格式化规则
   */
  private generateFormattingRules(context: RuleGenerationContext): string {
    return `## 代码格式化

### 空格和缩进
- 运算符两侧添加空格：\`a + b\` 而非 \`a+b\`
- 逗号后添加空格：\`[1, 2, 3]\` 而非 \`[1,2,3]\`
- 关键字后添加空格：\`if (condition)\` 而非 \`if(condition)\`
- 不要在括号内侧添加空格：\`func(a, b)\` 而非 \`func( a, b )\`

### 代码块
- 始终使用花括号，即使只有一行代码
- \`else\` 语句与关闭花括号在同一行（JavaScript/TypeScript）
- 花括号的左括号不换行（K&R 风格）

### 注释规范
- 单行注释使用 \`//\`（JavaScript/TypeScript）或 \`#\`（Python）
- 多行注释使用 \`/* */\`（JavaScript/TypeScript）或 \`"""\`（Python）
- 注释应该解释"为什么"而不是"是什么"
- 保持注释与代码同步更新

`;
  }

  /**
   * 生成命名约定
   */
  private generateNamingConventions(context: RuleGenerationContext): string {
    return `## 命名约定

### 通用规则
- **组件/类/接口**：PascalCase
  - 示例：\`UserProfile\`, \`DataService\`, \`IUserRepository\`
- **变量/函数/方法**：camelCase
  - 示例：\`userName\`, \`getUserData()\`, \`handleClick()\`
- **常量**：UPPER_CASE
  - 示例：\`MAX_RETRY_COUNT\`, \`API_BASE_URL\`, \`DEFAULT_TIMEOUT\`
- **私有属性**：前缀 \`_\`（约定）或使用 \`#\`（JavaScript 私有字段）
  - 示例：\`_privateMethod\`, \`#privateField\`

### 文件命名
${this.generateFileNamingRules(context)}

### 特定场景
- **布尔变量**：使用 \`is\`、\`has\`、\`should\` 前缀
  - 示例：\`isActive\`, \`hasPermission\`, \`shouldUpdate\`
- **事件处理器**：使用 \`handle\` 或 \`on\` 前缀
  - 示例：\`handleClick\`, \`onSubmit\`, \`handleUserLogin\`
- **获取器/设置器**：使用 \`get\`/\`set\` 前缀
  - 示例：\`getUser\`, \`setUser\`, \`getUserName\`

### 避免的命名
- ❌ 单字母变量（除了循环计数器 \`i\`, \`j\`, \`k\`）
- ❌ 缩写和简写（除非是广为人知的，如 \`URL\`, \`HTTP\`）
- ❌ 匈牙利命名法（如 \`strName\`, \`intCount\`）
- ❌ 无意义的名称（如 \`data\`, \`temp\`, \`foo\`, \`bar\`）

`;
  }

  /**
   * 生成错误处理指南
   */
  private generateErrorHandlingGuidelines(
    context: RuleGenerationContext
  ): string {
    const isJavaScript =
      context.techStack.languages.includes("JavaScript") ||
      context.techStack.languages.includes("TypeScript");
    const isPython = context.techStack.languages.includes("Python");

    let guidelines = `## 错误处理规范

### 基本原则
- 预测可能的错误并主动处理
- 提供有意义的错误信息
- 区分可恢复和不可恢复的错误
- 记录错误以便调试

`;

    if (isJavaScript) {
      guidelines += `### JavaScript/TypeScript 错误处理

**Try-Catch 使用**：
\`\`\`typescript
// ✅ 好的实践
try {
  const data = await fetchUserData(userId);
  return processData(data);
} catch (error) {
  if (error instanceof NetworkError) {
    logger.error('Network error:', error);
    throw new UserFacingError('无法连接到服务器，请稍后重试');
  }
  throw error; // 重新抛出未知错误
}

// ❌ 避免
try {
  // ... 大量代码
} catch (e) {
  console.log(e); // 不够具体
}
\`\`\`

**Promise 错误处理**：
\`\`\`typescript
// ✅ 使用 async/await 和 try-catch
async function getData() {
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    handleError(error);
  }
}

// ✅ 或使用 .catch()
apiCall()
  .then(result => processResult(result))
  .catch(error => handleError(error));
\`\`\`

**自定义错误类型**：
\`\`\`typescript
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(resource: string) {
    super(\\\`\${resource} not found\\\`);
    this.name = 'NotFoundError';
  }
}
\`\`\`

`;
    }

    if (isPython) {
      guidelines += `### Python 错误处理

**异常处理**：
\`\`\`python
# ✅ 好的实践
try:
    user = get_user(user_id)
    process_user(user)
except UserNotFoundError as e:
    logger.error(f"User not found: {user_id}")
    raise HTTPException(status_code=404, detail=str(e))
except DatabaseError as e:
    logger.exception("Database error occurred")
    raise HTTPException(status_code=500, detail="Internal server error")
finally:
    cleanup_resources()

# ❌ 避免
try:
    do_something()
except Exception:  # 过于宽泛
    pass  # 静默失败
\`\`\`

**自定义异常**：
\`\`\`python
class ValidationError(Exception):
    """数据验证错误"""
    pass

class ResourceNotFoundError(Exception):
    """资源未找到错误"""
    def __init__(self, resource_type: str, resource_id: str):
        self.resource_type = resource_type
        self.resource_id = resource_id
        super().__init__(f"{resource_type} {resource_id} not found")
\`\`\`

`;
    }

    guidelines += `### 错误日志记录
- 使用适当的日志级别（ERROR, WARN, INFO, DEBUG）
- 包含上下文信息（用户 ID、请求 ID 等）
- 不要记录敏感信息（密码、令牌等）
- 记录错误堆栈跟踪以便调试

### 用户友好的错误消息
- ✅ "无法保存您的更改，请检查网络连接后重试"
- ❌ "Error: ERR_CONNECTION_REFUSED at line 42"

`;

    return guidelines;
  }

  /**
   * 生成测试指南
   */
  private generateTestingGuidelines(context: RuleGenerationContext): string {
    const testLibs = context.codeFeatures["testing"]?.examples || [];

    return `## 测试规范

### 测试原则
- **独立性**：每个测试应该独立运行，不依赖其他测试
- **可重复性**：测试结果应该是确定的，不受运行顺序影响
- **快速执行**：单元测试应该快速完成
- **清晰性**：测试应该清楚地表达意图

### 测试组织
- **文件位置**：测试文件与源文件放在相同目录
- **命名规范**：
  - 测试文件：\`ComponentName.test.ts\` 或 \`ComponentName.spec.ts\`
  - 测试描述：使用清晰的描述性名称

### 测试结构（AAA 模式）

\`\`\`typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      // Arrange - 准备测试数据和环境
      const userData = { name: 'John', email: 'john@example.com' };
      const mockRepository = createMockRepository();
      
      // Act - 执行被测试的操作
      const result = await userService.createUser(userData);
      
      // Assert - 验证结果
      expect(result).toBeDefined();
      expect(result.name).toBe('John');
      expect(mockRepository.save).toHaveBeenCalledWith(userData);
    });
    
    it('should throw ValidationError for invalid email', async () => {
      // Arrange
      const invalidData = { name: 'John', email: 'invalid-email' };
      
      // Act & Assert
      await expect(userService.createUser(invalidData))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
\`\`\`

### 测试覆盖率
- **目标**：核心业务逻辑达到 80%+ 覆盖率
- **优先级**：
  1. 关键业务逻辑
  2. 边界情况和错误处理
  3. 复杂的算法和数据转换
- **不需要测试**：
  - 简单的 getter/setter
  - 第三方库的功能
  - 纯 UI 布局（可以用 E2E 测试）

### Mock 和 Stub
- 使用 Mock 隔离外部依赖
- 不要过度 Mock，保持测试有意义
- 为 API 调用、数据库操作等 I/O 创建 Mock

\`\`\`typescript
// ✅ 好的 Mock 使用
const mockApiClient = {
  fetchUser: jest.fn().mockResolvedValue({ id: 1, name: 'John' })
};

// ❌ 过度 Mock
const mockEverything = jest.fn(() => jest.fn(() => jest.fn()));
\`\`\`

### 测试类型
- **单元测试**：测试单个函数或类的行为
- **集成测试**：测试多个模块的协作
- **E2E 测试**：测试完整的用户流程

### 最佳实践
- 一个测试只验证一个行为
- 使用有意义的断言消息
- 测试失败时应该清楚地指出问题所在
- 定期运行测试，不要让测试过时
- 失败的测试应该立即修复

`;
  }

  /**
   * 生成文件命名规则
   */
  private generateFileNamingRules(context: RuleGenerationContext): string {
    const hasReact = context.techStack.frameworks.includes("React");
    const hasVue = context.techStack.frameworks.includes("Vue");

    let rules = "";

    if (hasReact) {
      rules += `- **React 组件**：PascalCase.tsx/jsx
  - 示例：\`UserProfile.tsx\`, \`Button.tsx\`
`;
    }

    if (hasVue) {
      rules += `- **Vue 组件**：PascalCase.vue 或 kebab-case.vue
  - 示例：\`UserProfile.vue\` 或 \`user-profile.vue\`
`;
    }

    rules += `- **工具/辅助文件**：camelCase 或 kebab-case
  - 示例：\`formatDate.ts\`, \`api-client.ts\`
- **类型定义文件**：types.ts 或 interfaces.ts
- **测试文件**：与源文件同名 + \`.test\` 或 \`.spec\`
  - 示例：\`UserProfile.test.tsx\`, \`utils.spec.ts\`
`;

    return rules;
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
    const descriptionByFile: Record<string, string> = {
      "global-rules.mdc": "项目全局导航与核心原则",
      "code-style.mdc": "代码格式、命名与风格要求",
      "architecture.mdc": "文件组织与模块架构规范",
      "custom-tools.mdc": "项目自定义 Hooks 与工具函数清单",
      "error-handling.mdc": "错误处理与日志管理实践",
      "state-management.mdc": "状态管理库的使用准则",
      "ui-ux.mdc": "组件交互与 UI/UX 规范",
      "frontend-routing.mdc": "前端路由定义与导航策略",
      "api-routing.mdc": "后端或 API 路由组织规范",
      "testing.mdc": "测试策略与断言准则",
      "custom-rules.mdc": "自定义规则（可选，用户可自行填写）",
      "00-global-rules.mdc": "项目全局导航与核心原则",
    };

    const lines: string[] = [];
    lines.push("cursor-rules-generator 输出以下规则文件：");

    for (const rule of rules) {
      const relativePath =
        rule.scope === "module" && rule.modulePath
          ? path.join(
              path.relative(projectPath, rule.modulePath),
              ".cursor",
              "rules",
              rule.fileName
            )
          : path.join(".cursor", "rules", rule.fileName);

      let description = descriptionByFile[rule.fileName];

      if (!description) {
        switch (rule.type) {
          case "overview":
            description = "模块概述与职责";
            break;
          case "guideline":
            description = "工作流程与实现指引";
            break;
          case "practice":
            description = "基于项目的实践规范";
            break;
          case "reference":
            description = "可复用的参考资料";
            break;
          default:
            description = "项目专用开发规范";
        }
      }

      if (rule.scope === "module") {
        description = `${rule.moduleName || "模块"} 专属规范：${description}`;
      }

      lines.push(`- ${relativePath}：${description}`);
    }

    return lines.join("\n");
  }

  /**
   * 生成规则元数据（v1.3 增强）
   */
  private generateRuleMetadata(
    title: string,
    description: string,
    priority: number,
    techStack: string[],
    tags: string[],
    type?: string,
    depends?: string[]
  ): string {
    const now = new Date();
    const version = "1.3.0";

    let metadata = `---
title: ${title}
description: ${description}
priority: ${priority}
version: ${version}
generatedAt: ${now.toISOString().split("T")[0]}
techStack: ${JSON.stringify(techStack)}
generator: cursor-rules-generator
tags: ${JSON.stringify(tags)}`;

    if (type) {
      metadata += `\ntype: ${type}`;
    }

    if (depends && depends.length > 0) {
      metadata += `\ndepends: ${JSON.stringify(depends)}`;
    }

    metadata += `\n---\n\n`;

    return metadata;
  }

  /**
   * 生成角色定义（Persona）
   */
  private generatePersona(context: RuleGenerationContext): string {
    const techStack = [
      ...context.techStack.primary,
      ...context.techStack.frameworks.filter(
        (f) => !context.techStack.primary.includes(f)
      ),
    ].join(", ");

    if (this.frameworkMatch) {
      const template = getFrameworkFormatTemplate(this.frameworkMatch);
      if (template.persona) {
        return template.persona;
      }
    }

    // 默认 persona
    return `You are an expert in ${techStack}, specializing in modern web development.`;
  }

  /**
   * 生成框架特定原则（增强版，参考 awesome-cursorrules）
   */
  private generateFrameworkPrinciples(context: RuleGenerationContext): string {
    const frameworks = context.techStack.frameworks;
    let principles = "";

    if (frameworks.includes("React")) {
      principles += `- **React**: 
  - 使用函数组件和 Hooks，避免类组件
  - 保持组件单一职责原则
  - 合理使用 \`useMemo\` 和 \`useCallback\` 优化性能
  - 使用 TypeScript 进行类型检查
`;
    }
    if (frameworks.includes("Vue")) {
      principles += `- **Vue**: 
  - 使用 Composition API（Vue 3）
  - 保持组件模板简洁
  - 复杂逻辑抽取到 composables
  - 使用 TypeScript 增强类型安全
`;
    }
    if (frameworks.includes("Next.js")) {
      principles += `- **Next.js**: 
  - 优先使用 App Router（如果项目使用）
  - Server Components 中进行数据获取
  - 使用 \`next/image\` 优化图片
  - 配置适当的元数据以改善 SEO
  - 最小化 'use client' 使用，优先使用 Server Components
`;
    }
    if (frameworks.includes("Angular")) {
      principles += `- **Angular**: 
  - 使用组件和模块化架构
  - 遵循 Angular 风格指南
  - 使用 TypeScript 和依赖注入
`;
    }
    if (frameworks.includes("Svelte")) {
      principles += `- **Svelte**: 
  - 利用 Svelte 的编译时优化
  - 使用响应式声明和语句
  - 保持组件简洁和高效
`;
    }

    return principles || "- 遵循框架的官方最佳实践";
  }

  /**
   * 生成状态管理内容
   */
  private generateStateManagementContent(
    context: RuleGenerationContext,
    libName?: string
  ): string {
    if (!libName) {
      return "项目使用状态管理，请遵循一致的状态更新模式。";
    }

    const lowerLib = libName.toLowerCase();

    if (lowerLib.includes("mobx")) {
      return `## MobX 状态管理

### 项目当前使用
- 状态管理库: MobX
- Store 位置: 查看 @src/stores/ 目录

### 使用规范

**定义 Store**:
\`\`\`typescript
import { makeObservable, observable, action } from 'mobx'

class UserStore {
  @observable user = null
  
  constructor() {
    makeObservable(this)
  }
  
  @action
  setUser(user) {
    this.user = user
  }
}
\`\`\`

**在组件中使用**:
\`\`\`typescript
import { observer } from 'mobx-react-lite'

export const UserProfile = observer(() => {
  const { user } = useStores()  // 获取 Store
  return <div>{user.name}</div>
})
\`\`\`

### 最佳实践

- 使用 @observable 定义响应式状态
- 使用 @action 定义状态修改方法
- 组件用 observer() 包装
- 避免直接修改 observable

参考: 查找项目中的 Store 文件作为示例`;
    }

    if (lowerLib.includes("redux")) {
      return `## Redux 状态管理

### 使用规范

- 使用 Redux Toolkit
- Slice 按功能模块组织
- 使用 createSlice 定义 reducer
- 异步逻辑使用 createAsyncThunk

参考项目中现有的 slice 文件`;
    }

    if (lowerLib.includes("zustand")) {
      return `## Zustand 状态管理

### 使用规范

- 使用 create 创建 store
- 保持 store 扁平化
- 使用 immer 中间件处理复杂状态`;
    }

    return `## ${libName} 状态管理\n\n请遵循 ${libName} 的官方最佳实践。`;
  }

  /**
   * 生成 instructions.md 内容
   */
  private generateInstructionsContent(context: RuleGenerationContext): string {
    return `# 开发工作流程指导

> 在本项目中使用 Cursor AI 进行开发的推荐流程

## 📋 开始任务前的检查清单

在开始任何开发任务前，请确认：

- [ ] 已阅读 @.cursor/rules/global-rules.mdc 了解项目概述
${
  this.hasCustomTools(context)
    ? "- [ ] 已查看 @.cursor/rules/custom-tools.mdc 了解可用工具\n"
    : ""
}- [ ] 已确认文件应该放在哪里（@.cursor/rules/architecture.mdc）
- [ ] **已让 Cursor 确认理解了任务** ⚠️ 重要

## 🚀 开始新任务的标准流程

### 步骤 1：让 Cursor 确认理解

**始终先询问**:
\`\`\`
请确认你理解了以下任务：[具体描述任务]

需要创建哪些文件？
需要使用哪些项目工具？
需要参考哪些现有代码？
\`\`\`

⚠️ **重要**: 不要跳过这一步，确保 Cursor 理解任务可以避免很多问题。

### 步骤 2：检查可复用资源

${
  this.hasCustomTools(context)
    ? `**查看项目工具**: @.cursor/rules/custom-tools.mdc

询问:
\`\`\`
对于 [功能]，项目中是否已有可用的 Hooks 或工具函数？
\`\`\`
`
    : ""
}
**查看参考代码**: 
\`\`\`
有没有类似功能的现有代码可以参考？
\`\`\`

### 步骤 3：确定文件位置

**查看**: @.cursor/rules/architecture.mdc

询问:
\`\`\`
新建 [组件/工具/服务] 应该放在哪个目录？
使用什么路径别名导入？
\`\`\`

### 步骤 4：实施开发

**明确指定**:
\`\`\`
请实现 [功能]：
${
  this.hasCustomTools(context)
    ? "- 使用 @src/hooks/useAuth.ts 的 useAuth\n- 使用 @src/utils/format.ts 的 formatDate\n"
    : ""
}- 遵循 @.cursor/rules/code-style.mdc 的命名规范
- 参考 @src/components/[相似组件].tsx 的结构
\`\`\`

### 步骤 5：代码审查和格式化 ⚠️ 重要

**检查清单**:
- [ ] 使用了项目自定义工具？（而非重新实现）
- [ ] 使用了路径别名？（而非相对路径）
- [ ] 遵循了命名约定？
- [ ] 添加了 TypeScript 类型？
- [ ] 添加了必要的错误处理？
- [ ] 文件放在了正确的位置？
${
  this.featureExists(context, "testing") ? "- [ ] 添加了测试？\n" : ""
}- [ ] **运行了代码格式化？** ⚠️ 必须
- [ ] **运行了 lint 检查和修复？** ⚠️ 必须

### 代码格式化（必需步骤）

**每次生成代码后必须运行**：

${this.generateFormattingCommandsSection(context)}

**提示 Cursor**:
\`\`\`
生成代码后，请询问我：
"需要我运行格式化和 lint 命令吗？"
然后执行相应的命令。
\`\`\`

## 🎯 常见任务模板

### 新建 React 组件

\`\`\`
任务: 创建一个 [组件名] 组件

请确认理解：
1. 组件应该放在哪个目录？
2. 需要使用哪些项目 Hooks？
3. 参考哪个现有组件的结构？

然后实现组件，遵循：
- @.cursor/rules/code-style.mdc - 命名和格式
${
  this.isFrontendProject(context)
    ? "- @.cursor/rules/ui-ux.mdc - UI 规范\n"
    : ""
}- @.cursor/rules/architecture.mdc - 文件位置
\`\`\`

### 新建工具函数

\`\`\`
任务: 创建一个 [功能] 工具函数

步骤:
1. 检查 @.cursor/rules/custom-tools.mdc - 是否已存在类似工具？
2. 确定位置: 应该放在 src/utils/ 的哪个文件？
3. 实现: 遵循现有工具的风格和命名
\`\`\`

### API 调用

\`\`\`
${
  context.customPatterns?.apiClient?.exists
    ? `使用项目的 API 客户端：
- 定义: @src/services/api-client.ts
- 使用示例: @src/services/[查看现有服务].ts

不要直接使用 fetch 或 axios
`
    : "统一的 API 调用方式，保持一致性"
}
\`\`\`

### 修复 Bug

\`\`\`
步骤:
1. 让 Cursor 分析 bug 的原因
2. 确认修复方案不会影响其他功能
3. 遵循项目的错误处理规范
4. 添加测试防止回归（如果项目有测试）
\`\`\`

### 使用自定义规则

\`\`\`
如果项目有自定义规则（@.cursor/rules/custom-rules.mdc）：

1. 查看自定义规则文件，了解项目特定的规范
2. 在生成代码时，明确引用自定义规则：
   "遵循 @.cursor/rules/custom-rules.mdc 中的 [具体规范]"
3. 确保生成的代码符合自定义规则的要求
\`\`\`

> 💡 **提示**: 自定义规则模板文件是可选的。如果文件不存在或未填写，可以忽略此步骤。

## 💡 与 Cursor 对话的最佳实践

### ✅ 好的提示

\`\`\`
请确认理解任务
使用项目的 useAuth Hook（@src/hooks/useAuth.ts）
参考 @src/components/Button.tsx 的样式
遵循 @.cursor/rules/code-style.mdc 的命名约定
\`\`\`

### ❌ 不好的提示

\`\`\`
帮我写代码（太模糊）
创建一个组件（没有说明位置、引用、规范）
实现这个功能（没有明确需求和约束）
\`\`\`

### 📝 提示模板

\`\`\`
[明确的任务描述]
+ [指定要使用的项目工具]
+ [指定要遵循的规则文件]
+ [指定要参考的现有代码]

示例:
"创建用户列表组件，
 使用 @src/hooks/useAuth.ts 的 useAuth Hook，
 遵循 @.cursor/rules/ui-ux.mdc 的无障碍规范，
 参考 @src/components/UserProfile.tsx 的结构"
\`\`\`

## 📚 快速参考

### 规则文件索引

- **@.cursor/rules/global-rules.mdc** - 项目概述和核心原则
- **@.cursor/rules/code-style.mdc** - 代码风格和命名
- **@.cursor/rules/architecture.mdc** - 文件组织
${
  this.hasCustomTools(context)
    ? "- **@.cursor/rules/custom-tools.mdc** - 自定义工具（必读）\n"
    : ""
}${
      this.hasErrorHandling(context)
        ? "- **@.cursor/rules/error-handling.mdc** - 错误处理\n"
        : ""
    }${
      this.hasStateManagement(context)
        ? "- **@.cursor/rules/state-management.mdc** - 状态管理\n"
        : ""
    }- **@.cursor/rules/custom-rules.mdc** - 自定义规则（可选）

> 💡 **关于自定义规则**: \`custom-rules.mdc\` 是一个可选文件，用于添加项目特定的自定义规则。如果文件存在且已填写内容，Cursor 会自动应用这些规则。如果文件未填写或已删除，不影响其他规则的执行。详细使用说明请查看该文件。

### 关键文件引用

${this.generateKeyFileReferences(context)}

---

*提示: 使用 @filename.ts 可以让 Cursor 快速定位和参考代码*
`;
  }

  /**
   * 生成格式化命令章节
   */
  private generateFormattingCommandsSection(
    context: RuleGenerationContext
  ): string {
    let section = "";

    if (context.projectConfig?.commands) {
      const cmds = context.projectConfig.commands;

      if (cmds.format || cmds.lintFix || cmds.lint) {
        section += `\`\`\`bash\n`;

        if (cmds.format) {
          section += `# 1. 格式化代码\n${cmds.format}\n\n`;
        }

        if (cmds.lintFix) {
          section += `# 2. 修复 lint 问题\n${cmds.lintFix}\n\n`;
        } else if (cmds.lint) {
          section += `# 2. 检查 lint\n${cmds.lint}\n\n`;
        }

        if (cmds.typeCheck) {
          section += `# 3. 类型检查\n${cmds.typeCheck}\n`;
        }

        section += `\`\`\`\n\n`;

        section += `**一键运行（推荐）**:\n`;
        section += `\`\`\`bash\n`;
        const oneLineCmd: string[] = [];
        if (cmds.format) oneLineCmd.push(cmds.format);
        if (cmds.lintFix) oneLineCmd.push(cmds.lintFix);
        section += `${oneLineCmd.join(" && ")}\n`;
        section += `\`\`\`\n\n`;
      } else {
        section += `\`\`\`bash\n`;
        section += `# 项目未配置格式化命令，使用以下方式：\n`;
        section += `npx prettier --write [文件路径]\n`;
        section += `npx eslint --fix [文件路径]\n`;
        section += `\`\`\`\n\n`;
      }
    } else {
      section += `项目未检测到格式化命令。\n`;
      section += `建议配置 package.json 中的 scripts。\n\n`;
    }

    return section;
  }

  /**
   * 生成关键文件引用
   */
  private generateKeyFileReferences(context: RuleGenerationContext): string {
    let refs = "";

    if (
      context.customPatterns?.customHooks &&
      context.customPatterns.customHooks.length > 0
    ) {
      refs += "**自定义 Hooks**:\n";
      context.customPatterns.customHooks.slice(0, 5).forEach((hook) => {
        refs += `- @${hook.relativePath} - ${hook.name}\n`;
      });
      refs += "\n";
    }

    if (
      context.customPatterns?.customUtils &&
      context.customPatterns.customUtils.length > 0
    ) {
      refs += "**工具函数**:\n";
      const grouped = this.groupUtilsByCategory(
        context.customPatterns.customUtils
      );
      Object.entries(grouped)
        .slice(0, 3)
        .forEach(([category, utils]) => {
          refs += `- @${utils[0].relativePath} - ${category}\n`;
        });
      refs += "\n";
    }

    if (
      context.fileOrganization?.componentLocation &&
      context.fileOrganization.componentLocation.length > 0
    ) {
      refs += `**组件目录**: @${context.fileOrganization.componentLocation[0]}/\n`;
    }

    return refs || "查看项目实际文件了解组织结构";
  }

  /**
   * v1.3: 生成模块概述规则（简化版，约 200 行）
   */
  private generateModuleOverviewRule(
    context: RuleGenerationContext,
    module: Module
  ): CursorRule {
    const metadata = this.generateRuleMetadata(
      `${module.name} 模块规则`,
      module.description || `${module.name} 模块开发规范`,
      50,
      context.techStack.primary,
      [module.type, "module"],
      "overview",
      ["global-rules"]
    );

    const content =
      metadata +
      `
# ${module.name} 模块

**类型**: ${this.getModuleTypeName(module.type)}  
**路径**: \`${module.path}\`  
${module.description ? `**描述**: ${module.description}` : ""}

## 模块职责

${this.generateModuleResponsibilities(module)}

## 相关规则

本模块遵循全局规则，并有以下特定要求：

- 参考: @../global-rules.mdc
- 参考: @../code-style.mdc
- 参考: @../architecture.mdc

## 开发指南

${this.generateModuleGuidelines(context, module)}

## 注意事项

${this.generateModuleCautions(module)}

---

*详细规范请参考全局规则文件。*
`;

    return {
      scope: "module",
      moduleName: module.name,
      modulePath: module.path,
      content,
      fileName: `${this.sanitizeFileName(module.name)}-overview.mdc`,
      priority: 50,
      type: "overview",
      depends: ["global-rules"],
    };
  }

  /**
   * 获取项目名称
   */
  private getProjectName(projectPath: string): string {
    return path.basename(projectPath);
  }

  /**
   * 格式化缺失的最佳实践（v1.5）
   * 将项目已使用但未声明的实践格式化为规则内容
   */
  private formatMissingPractices(practices: any[]): string {
    if (!practices || practices.length === 0) {
      return "";
    }

    let content = "";
    for (const practice of practices) {
      content += `### ${practice.title}\n\n`;
      content += `${practice.content}\n\n`;

      if (practice.techStack && practice.techStack.length > 0) {
        content += `**相关技术栈**: ${practice.techStack.join(", ")}\n\n`;
      }

      content += "---\n\n";
    }

    return content.trim();
  }

  /**
   * 识别项目使用但规则中没有的技术栈（v1.5）
   */
  private identifyMissingTechStacks(
    projectTechStack: TechStack,
    match: FrameworkMatch | TechStackMatch | null
  ): string[] {
    if (!match) {
      return [];
    }

    const allProjectTech = [
      ...projectTechStack.primary,
      ...projectTechStack.frameworks,
      ...projectTechStack.languages,
    ];

    // 获取匹配规则中的技术栈
    let matchedTech: string[] = [];

    if ("techStack" in match && match.techStack) {
      // 多类别匹配
      matchedTech = match.techStack;
    } else if ("framework" in match) {
      // 框架匹配（向后兼容）
      const frameworkTechStacks: Record<string, string[]> = {
        "react-typescript": ["React", "TypeScript", "Shadcn", "Tailwind"],
        "nextjs-typescript": ["Next.js", "TypeScript", "React", "Tailwind"],
        "nextjs-app-router": ["Next.js", "React", "TypeScript", "Tailwind"],
        "nextjs-15-react-19": [
          "Next.js",
          "React",
          "TypeScript",
          "Tailwind",
          "Vercel",
        ],
        "vue-typescript": ["Vue", "TypeScript"],
        "angular-typescript": ["Angular", "TypeScript"],
        "sveltekit-typescript": ["Svelte", "TypeScript", "Tailwind"],
        "typescript-react": ["TypeScript", "React", "Next.js"],
      };
      matchedTech = frameworkTechStacks[match.framework] || [];
    }

    const frameworkTech = matchedTech;
    const frameworkTechLower = frameworkTech.map((t) => t.toLowerCase());

    // 找出项目使用但框架规则中没有的技术栈
    const missing = allProjectTech.filter((tech) => {
      const techLower = tech.toLowerCase();
      return !frameworkTechLower.some(
        (ft) => techLower.includes(ft) || ft.includes(techLower)
      );
    });

    return missing;
  }

  /**
   * 网络搜索最佳实践（v1.5）
   */
  private async searchWebBestPractices(
    techStacks: string[],
    context: RuleGenerationContext
  ): Promise<any[]> {
    // 注意：这里无法直接调用 web_search 工具
    // 需要在 index.ts 中调用 web_search，然后传递结果
    // 这里返回空数组，实际搜索在 index.ts 中执行
    return [];
  }

  /**
   * 获取备用最佳实践（无网络情况下的备用方案）（v1.5）
   */
  private getFallbackPractices(techStacks: string[]): any[] {
    const practices: any[] = [];

    // 内置的通用最佳实践（作为备用方案）
    const fallbackPractices: Record<string, any[]> = {
      TypeScript: [
        {
          category: "code-style",
          title: "TypeScript 类型安全",
          content:
            "始终使用明确的类型定义，避免使用 `any`。优先使用接口（interface）定义对象类型，使用类型别名（type）定义联合类型和复杂类型。",
          techStack: ["TypeScript"],
          priority: "high" as const,
        },
      ],
      React: [
        {
          category: "component",
          title: "React 组件最佳实践",
          content:
            "使用函数组件和 Hooks。保持组件单一职责，合理拆分大型组件。使用 `useMemo` 和 `useCallback` 优化性能，但避免过度优化。",
          techStack: ["React"],
          priority: "high" as const,
        },
      ],
      Vue: [
        {
          category: "component",
          title: "Vue 组件最佳实践",
          content:
            "使用 Composition API（Vue 3）。保持组件模板简洁，复杂逻辑抽取到 composables。使用 TypeScript 增强类型安全。",
          techStack: ["Vue"],
          priority: "high" as const,
        },
      ],
      "Node.js": [
        {
          category: "architecture",
          title: "Node.js 项目结构",
          content:
            "使用模块化结构，按功能组织代码。使用环境变量管理配置。实现统一的错误处理机制。",
          techStack: ["Node.js"],
          priority: "medium" as const,
        },
      ],
      Express: [
        {
          category: "routing",
          title: "Express 路由最佳实践",
          content:
            "使用路由模块化，按功能组织路由。实现中间件进行认证、日志、错误处理。使用 async/await 处理异步操作。",
          techStack: ["Express"],
          priority: "medium" as const,
        },
      ],
    };

    for (const tech of techStacks) {
      // 查找匹配的备用实践
      for (const [key, value] of Object.entries(fallbackPractices)) {
        if (
          tech.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().includes(tech.toLowerCase())
        ) {
          practices.push(...value);
        }
      }
    }

    return practices;
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

  /**
   * 生成基于项目配置的代码风格规则（v1.2）
   */
  generateConfigBasedStyleRules(context: RuleGenerationContext): string {
    if (!context.projectConfig) {
      return this.generateCodeStyleGuidelines(context);
    }

    let rules = `## 代码风格（基于项目配置）\n\n`;

    // 使用项目实际配置
    if (context.projectConfig.prettier) {
      const p = context.projectConfig.prettier;
      rules += `### 项目配置 (Prettier)\n\n`;
      rules += `项目使用 Prettier 进行代码格式化，配置如下：\n\n`;
      rules += `- **缩进**: ${
        p.useTabs ? "Tab" : `${p.tabWidth || 2} 个空格`
      }\n`;
      rules += `- **引号**: ${p.singleQuote ? "单引号" : "双引号"}\n`;
      rules += `- **分号**: ${p.semi ? "使用分号" : "不使用分号"}\n`;
      rules += `- **行长度**: ${p.printWidth || 80} 字符\n`;
      rules += `- **尾随逗号**: ${p.trailingComma || "none"}\n\n`;
      rules += `**配置文件**: @.prettierrc\n\n`;

      rules += `### ⚠️ 代码格式化要求\n\n`;
      rules += `**生成代码时**，Cursor 必须：\n`;
      rules += `1. 尽量遵循上述 Prettier 配置\n`;
      rules += `2. 使用${p.singleQuote ? "单引号" : "双引号"}包裹字符串\n`;
      rules += `3. 使用 ${
        p.useTabs ? "Tab" : `${p.tabWidth || 2} 个空格`
      }缩进\n`;
      rules += `4. ${p.semi ? "添加" : "不添加"}分号\n\n`;

      rules += `**生成代码后**，必须运行格式化命令：\n\n`;

      if (context.projectConfig.commands?.format) {
        rules += `\`\`\`bash\n`;
        rules += `${context.projectConfig.commands.format}\n`;
        rules += `\`\`\`\n\n`;
        rules += `**提示**: 生成代码后，请主动询问：\n`;
        rules += `\`\`\`\n`;
        rules += `需要我运行格式化命令吗？\n`;
        rules += `${context.projectConfig.commands.format}\n`;
        rules += `\`\`\`\n\n`;
      } else {
        rules += `\`\`\`bash\n`;
        rules += `npx prettier --write [文件路径]\n`;
        rules += `\`\`\`\n\n`;
      }
    } else if (context.projectPractice?.codeStyle) {
      // 使用分析出的代码风格
      const style = context.projectPractice.codeStyle;
      rules += `### 项目当前实践（分析得出）\n\n`;
      rules += `通过分析项目代码，发现以下风格模式：\n\n`;
      rules += `- **变量声明**: 主要使用 ${
        style.variableDeclaration === "const-let" ? "const/let" : "var"
      }\n`;
      rules += `- **函数风格**: ${
        style.functionStyle === "arrow" ? "箭头函数" : "function 声明"
      }\n`;
      rules += `- **字符串引号**: ${
        style.stringQuote === "single"
          ? "单引号"
          : style.stringQuote === "double"
          ? "双引号"
          : "混合"
      }\n`;
      rules += `- **分号**: ${
        style.semicolon === "always"
          ? "使用"
          : style.semicolon === "never"
          ? "不使用"
          : "混合"
      }\n\n`;
      // 移除建议，改为收集到 SuggestionCollector
      rules += `### 当前实践\n\n`;
      rules += `✅ 保持与现有代码一致的风格\n\n`;
    }

    // ESLint 配置和命令
    if (context.projectConfig.eslint || context.projectConfig.commands?.lint) {
      rules += `### ESLint 代码检查\n\n`;

      if (context.projectConfig.eslint) {
        rules += `项目使用 ESLint 进行代码质量检查。\n\n`;
        rules += `**配置文件**: @.eslintrc\n\n`;
      }

      if (
        context.projectConfig.commands?.lint ||
        context.projectConfig.commands?.lintFix
      ) {
        rules += `**生成代码后必须运行**：\n\n`;
        rules += `\`\`\`bash\n`;
        if (context.projectConfig.commands?.lint) {
          rules += `# 1. 检查问题\n`;
          rules += `${context.projectConfig.commands.lint}\n\n`;
        }
        if (context.projectConfig.commands?.lintFix) {
          rules += `# 2. 自动修复\n`;
          rules += `${context.projectConfig.commands.lintFix}\n`;
        }
        rules += `\`\`\`\n\n`;

        rules += `**提示**: 生成代码后，Cursor 应主动询问：\n`;
        rules += `\`\`\`\n`;
        rules += `需要我运行 lint 检查和修复吗？\n`;
        if (context.projectConfig.commands?.lintFix) {
          rules += `${context.projectConfig.commands.lintFix}\n`;
        }
        rules += `\`\`\`\n\n`;
      }
    }

    // 完整的代码生成后流程
    if (context.projectConfig.commands) {
      rules += `### 代码生成后的标准流程\n\n`;
      rules += `**每次生成代码后，Cursor 必须提示运行**：\n\n`;
      rules += `\`\`\`bash\n`;

      const steps: string[] = [];
      if (context.projectConfig.commands.format) {
        steps.push(`# 1. 格式化代码\n${context.projectConfig.commands.format}`);
      }
      if (context.projectConfig.commands.lintFix) {
        steps.push(
          `# 2. 修复 lint 问题\n${context.projectConfig.commands.lintFix}`
        );
      } else if (context.projectConfig.commands.lint) {
        steps.push(`# 2. 检查 lint\n${context.projectConfig.commands.lint}`);
      }
      if (context.projectConfig.commands.typeCheck) {
        steps.push(
          `# 3. 类型检查\n${context.projectConfig.commands.typeCheck}`
        );
      }

      rules += steps.join("\n\n");
      rules += `\n\`\`\`\n\n`;

      rules += `**Cursor 的标准提示**：\n`;
      rules += `\`\`\`\n`;
      rules += `代码已生成。需要我运行以下命令确保代码符合项目规范吗？\n\n`;
      if (context.projectConfig.commands.format) {
        rules += `${context.projectConfig.commands.format}  # 格式化\n`;
      }
      if (context.projectConfig.commands.lintFix) {
        rules += `${context.projectConfig.commands.lintFix}  # 修复问题\n`;
      }
      rules += `\`\`\`\n\n`;
    }

    // 添加路径别名信息
    if (
      context.projectConfig?.pathAliases &&
      Object.keys(context.projectConfig.pathAliases).length > 0
    ) {
      rules += `### 路径别名（必须使用）\n\n`;
      rules += `项目配置了以下路径别名，生成代码时必须使用：\n\n`;
      for (const [alias, target] of Object.entries(
        context.projectConfig.pathAliases
      )) {
        rules += `- \`${alias}\` → \`${target}\`\n`;
      }
      rules += `\n示例：\n`;
      rules += `\`\`\`typescript\n`;
      const firstAlias = Object.keys(context.projectConfig.pathAliases)[0];
      rules += `// ✅ 正确 - 使用路径别名\n`;
      rules += `import { Component } from '${firstAlias}/Component';\n\n`;
      rules += `// ❌ 错误 - 不要使用相对路径\n`;
      rules += `import { Component } from '../../../Component';\n`;
      rules += `\`\`\`\n\n`;
    }

    return rules;
  }

  /**
   * 生成基于项目实践的错误处理规则（v1.2 - 三段式）
   */
  generatePracticeBasedErrorHandling(context: RuleGenerationContext): string {
    if (!context.projectPractice?.errorHandling) {
      return this.generateErrorHandlingGuidelines(context);
    }

    const eh = context.projectPractice.errorHandling;
    let rules = `## 错误处理规范\n\n`;

    // 第一段：项目当前实践
    rules += `### 项目当前实践\n\n`;

    if (eh.type === "none" || eh.frequency === 0) {
      rules += `⚠️ 项目当前未实施系统的错误处理。\n\n`;
    } else {
      rules += `项目主要使用 **${
        eh.type === "try-catch" ? "try-catch" : "Promise.catch()"
      }** 处理错误（发现 ${eh.frequency} 处）\n\n`;

      if (eh.customErrorTypes.length > 0) {
        rules += `**自定义错误类型**：\n`;
        rules +=
          eh.customErrorTypes.map((t: string) => `- \`${t}\``).join("\n") +
          "\n\n";
      }

      rules += `**日志方式**：${
        eh.loggingMethod === "console"
          ? "console.log/error"
          : eh.loggingMethod === "logger-library"
          ? `日志库 (${eh.loggerLibrary})`
          : "未检测到"
      }\n\n`;
    }

    // 移除所有建议，改为收集到 SuggestionCollector
    // 建议将在生成完成后单独输出，供用户确认

    return rules;
  }

  /**
   * 生成自定义工具使用规则（v1.2）
   */
  generateCustomToolsRules(context: RuleGenerationContext): string {
    if (
      !context.customPatterns ||
      (context.customPatterns.customHooks.length === 0 &&
        context.customPatterns.customUtils.length === 0)
    ) {
      return "";
    }

    let rules = `## 项目自定义工具（优先使用）\n\n`;

    // 自定义 Hooks
    if (context.customPatterns.customHooks.length > 0) {
      rules += `### 自定义 Hooks\n\n`;
      rules += `项目定义了以下自定义 hooks，**生成代码时必须优先使用**：\n\n`;

      const topHooks = context.customPatterns.customHooks.slice(0, 10);
      for (const hook of topHooks) {
        rules += `**${hook.name}** ${
          hook.description ? `- ${hook.description}` : ""
        }\n`;
        rules += `- 位置: \`${hook.relativePath}\`\n`;
        rules += `- 使用频率: ${
          hook.frequency > 10 ? "高" : hook.frequency > 3 ? "中" : "低"
        } (${hook.frequency} 处)\n`;
        if (hook.usage) {
          rules += `- 使用方式:\n`;
          rules += `  \`\`\`typescript\n`;
          rules += `  ${hook.usage}\n`;
          rules += `  \`\`\`\n`;
        }
        rules += `\n`;
      }
    }

    // 自定义工具函数
    if (context.customPatterns.customUtils.length > 0) {
      rules += `### 自定义工具函数\n\n`;
      rules += `项目定义了以下工具函数，**生成代码时必须优先使用**：\n\n`;

      // 按类别分组
      const utilsByCategory = this.groupUtilsByCategory(
        context.customPatterns.customUtils
      );

      for (const [category, utils] of Object.entries(utilsByCategory)) {
        rules += `**${category}**:\n`;
        for (const util of utils.slice(0, 5)) {
          rules += `- \`${util.name}\` (${util.relativePath})\n`;
          if (util.signature) {
            rules += `  \`\`\`typescript\n  ${util.signature}\n  \`\`\`\n`;
          }
        }
        rules += `\n`;
      }
    }

    // API 客户端
    if (context.customPatterns.apiClient?.exists) {
      const api = context.customPatterns.apiClient;
      rules += `### API 客户端\n\n`;
      rules += `项目使用自定义的 API 客户端：**\`${api.name}\`**\n`;
      rules += `- 位置: \`${FileUtils.getRelativePath(
        context.projectPath,
        api.filePath
      )}\`\n`;
      if (api.hasErrorHandling) {
        rules += `- ✅ 已内置错误处理\n`;
      }
      if (api.hasAuth) {
        rules += `- ✅ 已内置认证处理\n`;
      }
      rules += `\n**使用要求**:\n`;
      rules += `\`\`\`typescript\n`;
      rules += `// ✅ 正确 - 使用项目的 API 客户端\n`;
      rules += `import { ${api.name} } from '@/services/${api.name}';\n`;
      rules += `const data = await ${api.name}.get('/endpoint');\n\n`;
      rules += `// ❌ 错误 - 不要直接使用 fetch 或 axios\n`;
      rules += `const response = await fetch('/api/endpoint');\n`;
      rules += `\`\`\`\n\n`;
    }

    rules += `### ⚠️ 重要规则\n\n`;
    rules += `1. **优先使用项目自定义工具**，不要重新实现或引入第三方替代\n`;
    rules += `2. **保持一致性**，使用相同的工具确保代码可维护性\n`;
    rules += `3. **新增工具时**，遵循现有工具的命名和组织方式\n\n`;

    return rules;
  }

  /**
   * 按类别分组工具函数
   */
  private groupUtilsByCategory(utils: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    for (const util of utils) {
      if (!grouped[util.category]) {
        grouped[util.category] = [];
      }
      grouped[util.category].push(util);
    }
    return grouped;
  }

  /**
   * 生成基于项目结构的文件组织规则（v1.2）
   */
  generateStructureBasedFileOrgRules(context: RuleGenerationContext): string {
    if (!context.fileOrganization) {
      return this.generateFileOrganizationGuidelines(context);
    }

    const org = context.fileOrganization;
    let rules = `## 文件组织规范（基于项目实际结构）\n\n`;

    // 项目目录结构
    rules += `### 项目目录结构\n\n`;
    rules += `项目采用以下目录组织方式，**生成代码时必须遵循**：\n\n`;
    rules += `\`\`\`\n`;

    // 显示主要目录
    const topDirs = org.structure
      .filter((d) => !d.path.includes("/"))
      .slice(0, 10);
    for (const dir of topDirs) {
      rules += `${dir.path}/  # ${dir.purpose} (${dir.fileCount} 个文件)\n`;

      // 显示子目录
      const children = org.structure
        .filter(
          (d) =>
            d.path.startsWith(dir.path + "/") && d.path.split("/").length === 2
        )
        .slice(0, 5);

      for (const child of children) {
        const childName = child.path.split("/").pop();
        rules += `  ├── ${childName}/  # ${child.purpose}\n`;
      }
    }

    rules += `\`\`\`\n\n`;

    // 文件创建规则
    rules += `### 新建文件规则\n\n`;

    if (org.componentLocation.length > 0) {
      rules += `**新建组件**:\n`;
      rules += `- 位置: \`${org.componentLocation[0]}/\`\n`;
      rules += `- 命名: ${org.namingConvention.components}\n`;
      if (org.namingConvention.useIndexFiles) {
        rules += `- 结构: 每个组件一个目录，使用 index 文件导出\n`;
        rules += `  \`\`\`\n`;
        rules += `  components/Button/\n`;
        rules += `    ├── index.tsx\n`;
        rules += `    ├── Button.tsx\n`;
        rules += `    └── styles.ts\n`;
        rules += `  \`\`\`\n`;
      }
      rules += `\n`;
    }

    if (org.utilsLocation.length > 0) {
      rules += `**新建工具函数**:\n`;
      rules += `- 位置: \`${org.utilsLocation[0]}/\`\n`;
      rules += `- 按功能分类创建文件（如 date.ts, validation.ts）\n\n`;
    }

    // 导入规范
    if (
      context.projectConfig?.pathAliases &&
      Object.keys(context.projectConfig.pathAliases).length > 0
    ) {
      rules += `### 导入规范\n\n`;
      rules += `**必须使用路径别名**，不要使用相对路径：\n`;
      rules += `\`\`\`typescript\n`;
      rules += `// ✅ 正确\n`;
      const aliases = Object.keys(context.projectConfig.pathAliases);
      if (aliases.length > 0) {
        rules += `import { Button } from '${aliases[0]}/components/Button';\n`;
      }
      rules += `\n// ❌ 错误\n`;
      rules += `import { Button } from '../../../components/Button';\n`;
      rules += `\`\`\`\n\n`;
    }

    return rules;
  }

  /**
   * 检查功能是否在项目中存在
   */
  private featureExists(
    context: RuleGenerationContext,
    featureName: string
  ): boolean {
    // 检查代码特征
    if (context.codeFeatures[featureName]) {
      return context.codeFeatures[featureName].frequency > 0;
    }

    // 检查依赖
    const featureDeps: Record<string, string[]> = {
      testing: ["jest", "vitest", "mocha", "@testing-library"],
      "state-management": ["redux", "zustand", "mobx", "pinia", "vuex"],
      styling: ["styled-components", "@emotion", "tailwindcss", "@mui"],
    };

    if (featureDeps[featureName]) {
      return context.techStack.dependencies.some((d) =>
        featureDeps[featureName].some((lib) => d.name.includes(lib))
      );
    }

    return false;
  }

  /**
   * 生成按需的测试规则（v1.2）
   */
  generateConditionalTestingRules(context: RuleGenerationContext): string {
    const hasTests = this.featureExists(context, "testing");

    if (!hasTests) {
      // 项目没有测试 - 简短提示
      return `## 测试\n\n### 当前状态\n⚠️ 项目当前未配置测试框架\n\n如需添加测试，请参考相关技术栈的测试最佳实践。\n\n`;
    }

    // 项目有测试 - 生成详细规则
    return this.generateTestingGuidelines(context);
  }

  /**
   * 生成自定义规则模板（可选文件）
   * 提供完整的模板和编写指导，用户可以根据需要填写
   */
  private generateCustomRuleTemplate(
    context: RuleGenerationContext
  ): CursorRule {
    const metadata = this.generateRuleMetadata(
      "自定义规则",
      "项目特定的自定义规则（可选，用户可自行填写）",
      60, // 较低优先级，确保不影响核心规则
      context.techStack.primary,
      ["custom", "optional"],
      "guideline",
      ["global-rules"] // 依赖全局规则
    );

    const content =
      metadata +
      `
# 自定义规则

> ⚠️ **重要提示**: 这是一个**可选**的文件。如果您不需要自定义规则，可以：
> - 直接删除此文件（不影响其他规则）
> - 保留文件但保持模板状态（Cursor 会忽略空模板）
> - 填写内容后，此规则将自动生效

参考: @global-rules.mdc

## 📝 使用说明

### 何时使用自定义规则？

当您需要添加以下类型的规则时，可以使用此模板：

1. **项目特定的业务规则** - 如特定的数据处理方式、业务逻辑规范
2. **团队约定** - 如代码审查流程、提交规范、命名约定
3. **性能优化规范** - 项目特定的性能优化建议
4. **第三方库使用规范** - 特定库的使用约定
5. **其他项目特定需求** - 任何不在标准规则中的特殊要求

### 如何填写？

1. **保留元数据部分**（文件开头的 \`---\` 之间的内容）
2. **修改标题和描述** - 将 "自定义规则模板" 改为您的规则名称
3. **填写规则内容** - 在下方的内容区域填写您的规则
4. **设置优先级** - 根据需要调整 priority（建议 60-85）
5. **设置依赖关系** - 在 depends 中声明依赖的其他规则文件

### 优先级建议

- **60-69**: 补充性规则（如团队约定）
- **70-79**: 重要实践（如性能优化）
- **80-85**: 核心规范（如业务规则）

---

## 🎯 规则编写模板

### 示例 1: 业务规则

\`\`\`markdown
## 业务数据处理规范

### 数据验证

所有用户输入必须经过验证：

\`\`\`typescript
// ✅ 正确 - 使用项目验证工具
import { validateUserInput } from '@/utils/validation';

const result = validateUserInput(data);
if (!result.isValid) {
  throw new ValidationError(result.errors);
}

// ❌ 错误 - 直接使用未验证的数据
processData(userInput);
\`\`\`

### 数据转换

遵循项目的数据转换规范：

- 使用 @src/utils/data-transform.ts 中的工具函数
- 参考 @src/services/api-client.ts 的数据处理方式
\`\`\`

### 示例 2: 性能优化规范

\`\`\`markdown
## 性能优化规范

参考: @global-rules.mdc, @code-style.mdc

### 组件优化

对于大型列表组件，必须使用虚拟滚动：

\`\`\`typescript
// ✅ 正确 - 使用虚拟滚动
import { VirtualList } from '@/components/VirtualList';

<VirtualList items={largeDataSet} />

// ❌ 错误 - 直接渲染大量数据
{largeDataSet.map(item => <Item key={item.id} {...item} />)}
\`\`\`

### 图片优化

- 使用项目配置的图片 CDN
- 所有图片必须设置 width 和 height
- 参考: @src/components/Image.tsx
\`\`\`

### 示例 3: 团队约定

\`\`\`markdown
## 团队开发约定

### 代码审查流程

1. 提交 PR 前必须运行测试：\`npm run test\`
2. 确保所有 lint 检查通过：\`npm run lint\`
3. 代码审查必须至少一人批准
4. 合并前必须解决所有评论

### Git 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

- \`feat:\` 新功能
- \`fix:\` 修复 bug
- \`docs:\` 文档更新
- \`style:\` 代码格式（不影响功能）
- \`refactor:\` 重构
- \`test:\` 测试相关
- \`chore:\` 构建/工具相关
\`\`\`

---

## 📋 规则编写最佳实践

### 1. 结构清晰

使用清晰的标题层级组织内容：

\`\`\`markdown
# 主标题（规则名称）

## 核心原则

### 具体规范

#### 详细说明
\`\`\`

### 2. 提供代码示例

始终提供 ✅ 正确和 ❌ 错误的对比示例：

\`\`\`typescript
// ✅ 正确 - 说明为什么这样做
const result = useProjectHook();

// ❌ 错误 - 说明为什么不这样做
const result = useThirdPartyHook();
\`\`\`

### 3. 引用项目文件

使用 \`@文件名\` 引用项目中的实际文件：

\`\`\`markdown
参考: @src/utils/validation.ts
使用: @src/hooks/useAuth.ts
示例: @src/components/Button.tsx
\`\`\`

### 4. 引用其他规则

使用 \`@规则文件名.mdc\` 引用其他规则：

\`\`\`markdown
参考: @global-rules.mdc
遵循: @code-style.mdc
补充: @architecture.mdc
\`\`\`

### 5. 明确使用场景

说明规则的适用场景和例外情况：

\`\`\`markdown
### 适用场景

- 适用于所有新代码
- 重构时逐步应用
- 不适用于遗留代码（除非大规模重构）
\`\`\`

---

## 🔧 元数据配置说明

### 当前配置

\`\`\`yaml
title: 自定义规则          # 修改为您的规则名称
description: 项目特定的自定义规则（可选，用户可自行填写）  # 修改为规则描述
priority: 60                    # 根据需要调整（60-85 建议范围）
techStack: ${JSON.stringify(context.techStack.primary)}  # 已自动配置
tags: ["custom", "optional"]  # 可以添加更多标签
type: guideline                 # 可选: overview, guideline, reference, practice
depends: ["global-rules"]      # 声明依赖的规则文件
\`\`\`

### 依赖关系

\`depends\` 字段声明此规则依赖的其他规则。Cursor 会按依赖顺序加载规则。

**当前依赖**: \`global-rules.mdc\`

**可添加的依赖**:
- \`code-style.mdc\` - 如果规则涉及代码风格
- \`architecture.mdc\` - 如果规则涉及文件组织
- \`custom-tools.mdc\` - 如果规则使用项目自定义工具
- 其他规则文件...

**示例**:
\`\`\`yaml
depends: ["global-rules", "code-style", "architecture"]
\`\`\`

---

## ✅ 填写检查清单

在提交自定义规则前，请确认：

- [ ] 已修改标题和描述
- [ ] 已填写实际的规则内容（删除模板说明）
- [ ] 已设置合适的优先级
- [ ] 已正确配置依赖关系
- [ ] 已提供代码示例（✅ 正确 vs ❌ 错误）
- [ ] 已引用相关的项目文件（使用 \`@文件名\`）
- [ ] 已引用相关的规则文件（使用 \`@规则名.mdc\`）
- [ ] 规则内容清晰、可执行
- [ ] 已测试规则是否生效（在 Cursor 中验证）

---

## 🚀 开始编写

删除上方的模板说明，从下方开始编写您的自定义规则：

---

# [在此填写您的规则标题]

[在此填写您的规则内容...]

---

*提示: 编写完成后，可以使用 \`validate_rules\` 工具验证规则格式是否正确。*
`;

    return {
      scope: "specialized",
      modulePath: context.projectPath,
      content,
      fileName: "custom-rules.mdc",
      priority: 60,
      type: "guideline",
      depends: ["global-rules"],
    };
  }
}
