import * as path from 'path';

import { FileOrganizationInfo, RuleGenerationContext } from '../types.js';
import { FileUtils } from '../utils/file-utils.js';
import { logger } from '../utils/logger.js';

/**
 * 代码生成所需的信息类型
 */
export interface CodeGenerationRequirement {
  category: string;
  item: string;
  description: string;
  required: boolean;
  source:
    | "rules"
    | "project-analysis"
    | "user-input"
    | "api-spec"
    | "database-schema";
  status: "available" | "missing" | "partial" | "needs-confirmation";
  details?: string;
  examples?: string[];
}

/**
 * 代码生成信息需求检查结果
 */
export interface CodeGenerationRequirementsCheck {
  taskType: string;
  requirements: CodeGenerationRequirement[];
  missingCritical: CodeGenerationRequirement[];
  missingOptional: CodeGenerationRequirement[];
  completeness: number; // 0-100
  recommendations: string[];
}

/**
 * 代码生成信息需求检查器
 * 分析生成可直接使用代码所需的信息
 */
export class CodeGenerationRequirementsChecker {
  /**
   * 检查代码生成所需的信息
   */
  async checkRequirements(
    context: RuleGenerationContext,
    taskDescription?: string
  ): Promise<CodeGenerationRequirementsCheck> {
    const requirements: CodeGenerationRequirement[] = [];

    // 1. 基础项目信息（从 rules 中获取）
    this.addBasicProjectInfo(requirements, context);

    // 2. 技术栈和依赖信息
    this.addTechStackInfo(requirements, context);

    // 3. 项目结构和组织信息
    this.addProjectStructureInfo(requirements, context);

    // 4. 代码风格和规范信息
    this.addCodeStyleInfo(requirements, context);

    // 5. 业务逻辑相关信息（通常需要用户输入）
    this.addBusinessLogicInfo(requirements, context, taskDescription);

    // 6. API 和接口信息
    this.addAPIInfo(requirements, context);

    // 7. 数据模型和类型信息
    this.addDataModelInfo(requirements, context);

    // 8. 环境配置信息
    this.addEnvironmentInfo(requirements, context);

    // 9. 认证和权限信息
    this.addAuthInfo(requirements, context);

    // 10. 测试和验证信息
    this.addTestingInfo(requirements, context);

    // 分类需求
    const missingCritical = requirements.filter(
      (r) => r.required && r.status === "missing"
    );
    const missingOptional = requirements.filter(
      (r) => !r.required && r.status === "missing"
    );

    // 计算完整性
    const totalRequired = requirements.filter((r) => r.required).length;
    const availableRequired = requirements.filter(
      (r) => r.required && r.status === "available"
    ).length;
    const completeness =
      totalRequired > 0 ? (availableRequired / totalRequired) * 100 : 100;

    // 生成建议
    const recommendations = this.generateRecommendations(
      requirements,
      missingCritical,
      missingOptional
    );

    return {
      taskType: taskDescription || "通用代码生成",
      requirements,
      missingCritical,
      missingOptional,
      completeness: Math.round(completeness),
      recommendations,
    };
  }

  /**
   * 添加基础项目信息
   */
  private addBasicProjectInfo(
    requirements: CodeGenerationRequirement[],
    context: RuleGenerationContext
  ): void {
    requirements.push({
      category: "项目基础",
      item: "项目路径",
      description: "项目根目录路径",
      required: true,
      source: "rules",
      status: context.projectPath ? "available" : "missing",
      details: context.projectPath,
    });

    requirements.push({
      category: "项目基础",
      item: "项目名称",
      description: "项目名称（用于导入路径、命名等）",
      required: true,
      source: "rules",
      status: context.projectPath ? "available" : "missing",
      details: path.basename(context.projectPath),
    });

    requirements.push({
      category: "项目基础",
      item: "模块结构",
      description: "项目的模块组织方式（单体/多模块/monorepo）",
      required: true,
      source: "rules",
      status:
        context.modules && context.modules.length > 0 ? "available" : "missing",
      details:
        context.modules.length > 1
          ? `多模块项目，共 ${context.modules.length} 个模块`
          : "单体项目",
    });
  }

  /**
   * 添加技术栈信息
   */
  private addTechStackInfo(
    requirements: CodeGenerationRequirement[],
    context: RuleGenerationContext
  ): void {
    requirements.push({
      category: "技术栈",
      item: "主要框架",
      description: "项目使用的主要框架（React/Vue/Next.js 等）",
      required: true,
      source: "rules",
      status: context.techStack.frameworks.length > 0 ? "available" : "missing",
      details: context.techStack.frameworks.join(", "),
      examples: context.techStack.frameworks,
    });

    requirements.push({
      category: "技术栈",
      item: "编程语言",
      description: "项目使用的编程语言",
      required: true,
      source: "rules",
      status: context.techStack.languages.length > 0 ? "available" : "missing",
      details: context.techStack.languages.join(", "),
    });

    requirements.push({
      category: "技术栈",
      item: "依赖包列表",
      description: "项目的依赖包及其版本",
      required: true,
      source: "rules",
      status:
        context.techStack.dependencies.length > 0 ? "available" : "missing",
      details: `${context.techStack.dependencies.length} 个依赖`,
    });

    requirements.push({
      category: "技术栈",
      item: "包管理器",
      description: "项目使用的包管理器（npm/yarn/pnpm）",
      required: true,
      source: "rules",
      status:
        context.techStack.packageManagers.length > 0 ? "available" : "missing",
      details: context.techStack.packageManagers.join(", "),
    });
  }

  /**
   * 添加项目结构信息
   */
  private addProjectStructureInfo(
    requirements: CodeGenerationRequirement[],
    context: RuleGenerationContext
  ): void {
    if (context.fileOrganization) {
      requirements.push({
        category: "项目结构",
        item: "组件目录位置",
        description: "组件文件应该放置的目录",
        required: true,
        source: "rules",
        status:
          context.fileOrganization.componentLocation.length > 0
            ? "available"
            : "needs-confirmation",
        details:
          context.fileOrganization.componentLocation[0] ||
          "需要确认组件目录位置",
      });

      requirements.push({
        category: "项目结构",
        item: "工具函数目录位置",
        description: "工具函数文件应该放置的目录",
        required: true,
        source: "rules",
        status:
          context.fileOrganization.utilsLocation.length > 0
            ? "available"
            : "needs-confirmation",
        details:
          context.fileOrganization.utilsLocation[0] ||
          "需要确认工具函数目录位置",
      });

      requirements.push({
        category: "项目结构",
        item: "类型定义目录位置",
        description: "TypeScript 类型定义文件应该放置的目录",
        required: false,
        source: "rules",
        status:
          context.fileOrganization.typesLocation &&
          context.fileOrganization.typesLocation.length > 0
            ? "available"
            : "partial",
        details:
          context.fileOrganization.typesLocation?.[0] ||
          "可能使用 src/types 或与组件同目录",
      });
    } else {
      requirements.push({
        category: "项目结构",
        item: "文件组织结构",
        description: "项目的目录结构和文件组织方式",
        required: true,
        source: "rules",
        status: "missing",
        details: "未检测到文件组织结构，需要分析或用户确认",
      });
    }
  }

  /**
   * 添加代码风格信息
   */
  private addCodeStyleInfo(
    requirements: CodeGenerationRequirement[],
    context: RuleGenerationContext
  ): void {
    if (context.projectConfig) {
      requirements.push({
        category: "代码风格",
        item: "Prettier 配置",
        description: "代码格式化配置（缩进、引号、分号等）",
        required: false,
        source: "rules",
        status: context.projectConfig.prettier ? "available" : "missing",
        details: context.projectConfig.prettier
          ? "已检测到 Prettier 配置"
          : "未检测到，可能需要用户确认",
      });

      requirements.push({
        category: "代码风格",
        item: "ESLint 配置",
        description: "代码质量检查配置",
        required: false,
        source: "rules",
        status: context.projectConfig.eslint ? "available" : "missing",
      });

      requirements.push({
        category: "代码风格",
        item: "路径别名配置",
        description: "TypeScript/JavaScript 路径别名（@/、~ 等）",
        required: false,
        source: "rules",
        status:
          context.projectConfig.pathAliases &&
          Object.keys(context.projectConfig.pathAliases).length > 0
            ? "available"
            : "missing",
        details: context.projectConfig.pathAliases
          ? Object.keys(context.projectConfig.pathAliases).join(", ")
          : "未配置路径别名",
      });
    }

    if (context.projectPractice?.codeStyle) {
      requirements.push({
        category: "代码风格",
        item: "命名约定",
        description: "变量、函数、组件的命名规范",
        required: false,
        source: "rules",
        status: "available",
        details: `变量: ${context.projectPractice.codeStyle.variableDeclaration}, 函数: ${context.projectPractice.codeStyle.functionStyle}`,
      });
    }
  }

  /**
   * 添加业务逻辑信息（通常需要用户输入）
   */
  private addBusinessLogicInfo(
    requirements: CodeGenerationRequirement[],
    context: RuleGenerationContext,
    taskDescription?: string
  ): void {
    requirements.push({
      category: "业务逻辑",
      item: "功能需求描述",
      description: "要生成的功能的具体需求描述",
      required: true,
      source: "user-input",
      status: taskDescription ? "available" : "missing",
      details: taskDescription || "需要用户提供功能需求描述",
    });

    requirements.push({
      category: "业务逻辑",
      item: "用户交互流程",
      description: "如果是 UI 组件，需要知道用户交互流程",
      required: false,
      source: "user-input",
      status: "missing",
      details: "需要用户描述：用户如何操作、触发什么事件、期望什么结果",
    });

    requirements.push({
      category: "业务逻辑",
      item: "业务规则",
      description: "业务逻辑规则和约束条件",
      required: false,
      source: "user-input",
      status: "missing",
      details: "需要用户提供：验证规则、计算逻辑、状态转换规则等",
    });
  }

  /**
   * 添加 API 信息
   */
  private addAPIInfo(
    requirements: CodeGenerationRequirement[],
    context: RuleGenerationContext
  ): void {
    // 检查是否有 API 客户端
    if (context.customPatterns?.apiClient?.exists) {
      requirements.push({
        category: "API 接口",
        item: "API 客户端",
        description: "项目使用的 API 客户端（axios/fetch/自定义）",
        required: true,
        source: "rules",
        status: "available",
        details: context.customPatterns.apiClient.name,
      });
    } else {
      requirements.push({
        category: "API 接口",
        item: "API 客户端",
        description: "项目使用的 API 客户端",
        required: false,
        source: "rules",
        status: "missing",
        details: "未检测到统一的 API 客户端，可能需要用户确认",
      });
    }

    requirements.push({
      category: "API 接口",
      item: "API 端点地址",
      description: "如果涉及 API 调用，需要知道具体的端点地址",
      required: false,
      source: "user-input",
      status: "missing",
      details: "需要用户提供：API 基础 URL、端点路径、请求方法",
    });

    requirements.push({
      category: "API 接口",
      item: "API 请求参数",
      description: "API 请求需要的参数及其类型",
      required: false,
      source: "user-input",
      status: "missing",
      details: "需要用户提供：参数名称、类型、是否必填、默认值",
    });

    requirements.push({
      category: "API 接口",
      item: "API 响应格式",
      description: "API 返回的数据结构",
      required: false,
      source: "user-input",
      status: "missing",
      details: "需要用户提供：响应数据结构、字段类型、错误格式",
    });
  }

  /**
   * 添加数据模型信息
   */
  private addDataModelInfo(
    requirements: CodeGenerationRequirement[],
    context: RuleGenerationContext
  ): void {
    requirements.push({
      category: "数据模型",
      item: "TypeScript 类型定义",
      description: "如果项目使用 TypeScript，需要知道数据类型定义",
      required: false,
      source: "project-analysis",
      status: context.techStack.languages.includes("TypeScript")
        ? "partial"
        : "missing",
      details: context.techStack.languages.includes("TypeScript")
        ? "需要分析现有类型定义或用户提供"
        : "项目不使用 TypeScript",
    });

    requirements.push({
      category: "数据模型",
      item: "数据实体结构",
      description: "业务实体的数据结构（用户、订单、产品等）",
      required: false,
      source: "user-input",
      status: "missing",
      details: "需要用户提供：实体字段、字段类型、关联关系",
    });

    requirements.push({
      category: "数据模型",
      item: "数据库 Schema",
      description: "如果涉及数据库操作，需要知道数据库表结构",
      required: false,
      source: "database-schema",
      status: "missing",
      details: "需要用户提供：表名、字段、索引、外键关系",
    });
  }

  /**
   * 添加环境配置信息
   */
  private addEnvironmentInfo(
    requirements: CodeGenerationRequirement[],
    context: RuleGenerationContext
  ): void {
    requirements.push({
      category: "环境配置",
      item: "环境变量",
      description: "项目使用的环境变量配置",
      required: false,
      source: "project-analysis",
      status: "partial",
      details: "需要分析 .env 文件或用户提供环境变量列表",
    });

    requirements.push({
      category: "环境配置",
      item: "API 密钥和配置",
      description: "第三方服务的 API 密钥和配置",
      required: false,
      source: "user-input",
      status: "missing",
      details: "需要用户提供：API 密钥、服务端点、配置参数",
    });
  }

  /**
   * 添加认证信息
   */
  private addAuthInfo(
    requirements: CodeGenerationRequirement[],
    context: RuleGenerationContext
  ): void {
    requirements.push({
      category: "认证授权",
      item: "认证方式",
      description: "项目使用的认证方式（JWT/OAuth/Session 等）",
      required: false,
      source: "project-analysis",
      status: "partial",
      details: "需要分析现有认证实现或用户提供",
    });

    requirements.push({
      category: "认证授权",
      item: "权限模型",
      description: "项目的权限控制模型（RBAC/ABAC 等）",
      required: false,
      source: "user-input",
      status: "missing",
      details: "需要用户提供：角色定义、权限规则、权限检查方式",
    });
  }

  /**
   * 添加测试信息
   */
  private addTestingInfo(
    requirements: CodeGenerationRequirement[],
    context: RuleGenerationContext
  ): void {
    const hasTesting = context.codeFeatures["testing"];
    requirements.push({
      category: "测试",
      item: "测试框架",
      description: "项目使用的测试框架（Jest/Vitest/Mocha 等）",
      required: false,
      source: "rules",
      status: hasTesting ? "available" : "missing",
      details: hasTesting
        ? "已检测到测试框架"
        : "未检测到测试框架，生成代码时可能不包含测试",
    });

    requirements.push({
      category: "测试",
      item: "测试数据",
      description: "测试所需的示例数据",
      required: false,
      source: "user-input",
      status: "missing",
      details: "需要用户提供：测试用例、边界情况、错误场景",
    });
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    requirements: CodeGenerationRequirement[],
    missingCritical: CodeGenerationRequirement[],
    missingOptional: CodeGenerationRequirement[]
  ): string[] {
    const recommendations: string[] = [];

    if (missingCritical.length > 0) {
      recommendations.push(
        `⚠️ 缺少 ${missingCritical.length} 个必需信息，无法生成可直接使用的代码`
      );

      // 按类别分组
      const byCategory = new Map<string, CodeGenerationRequirement[]>();
      for (const req of missingCritical) {
        if (!byCategory.has(req.category)) {
          byCategory.set(req.category, []);
        }
        byCategory.get(req.category)!.push(req);
      }

      for (const [category, items] of byCategory) {
        recommendations.push(`\n**${category}** (${items.length} 项):`);
        for (const item of items) {
          recommendations.push(`  - ${item.item}: ${item.description}`);
          if (item.details) {
            recommendations.push(`    ${item.details}`);
          }
        }
      }
    }

    if (missingOptional.length > 0) {
      recommendations.push(
        `\n💡 建议补充 ${missingOptional.length} 个可选信息以提升代码质量`
      );
    }

    // 根据任务类型提供特定建议
    const userInputRequired = requirements.filter(
      (r) => r.source === "user-input" && r.status === "missing"
    );
    if (userInputRequired.length > 0) {
      recommendations.push(
        `\n📝 需要用户提供的信息 (${userInputRequired.length} 项):`
      );
      for (const req of userInputRequired.slice(0, 5)) {
        recommendations.push(`  - ${req.item}: ${req.description}`);
      }
    }

    return recommendations;
  }

  /**
   * 格式化需求检查结果为可读文本
   */
  formatRequirementsCheck(check: CodeGenerationRequirementsCheck): string {
    let output = `## 📋 代码生成信息需求检查\n\n`;
    output += `**任务类型**: ${check.taskType}\n`;
    output += `**完整性**: ${check.completeness}%\n\n`;

    // 按类别分组显示
    const byCategory = new Map<string, CodeGenerationRequirement[]>();
    for (const req of check.requirements) {
      if (!byCategory.has(req.category)) {
        byCategory.set(req.category, []);
      }
      byCategory.get(req.category)!.push(req);
    }

    for (const [category, items] of byCategory) {
      output += `### ${category}\n\n`;
      for (const item of items) {
        const statusEmoji =
          item.status === "available"
            ? "✅"
            : item.status === "missing"
            ? "❌"
            : item.status === "partial"
            ? "⚠️"
            : "❓";
        const requiredMark = item.required ? "**[必需]**" : "[可选]";
        output += `${statusEmoji} ${requiredMark} **${item.item}**\n`;
        output += `  - 描述: ${item.description}\n`;
        output += `  - 来源: ${this.getSourceLabel(item.source)}\n`;
        if (item.details) {
          output += `  - 详情: ${item.details}\n`;
        }
        output += `\n`;
      }
    }

    // 显示建议
    if (check.recommendations.length > 0) {
      output += `### 💡 建议\n\n`;
      for (const rec of check.recommendations) {
        output += `${rec}\n`;
      }
    }

    return output;
  }

  /**
   * 获取来源标签
   */
  private getSourceLabel(source: string): string {
    const labels: Record<string, string> = {
      rules: "规则文件",
      "project-analysis": "项目分析",
      "user-input": "用户输入",
      "api-spec": "API 规范",
      "database-schema": "数据库 Schema",
    };
    return labels[source] || source;
  }
}
