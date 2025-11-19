import {
  CodeGenerationRequirement,
  FileTypeCategory,
  DeepDirectoryAnalysis,
} from "../types.js";
import { logger } from "../utils/logger.js";

/**
 * 代码生成需求解析器
 * 从用户需求中提取代码类型、文件类型、模块信息等
 * 注意：与 code-generation-requirements.ts 中的 CodeGenerationRequirement 不同
 * 这个解析器专注于从需求文本中提取结构化信息
 */
export class CodeGenerationRequirementParser {
  /**
   * 从需求描述中解析代码生成需求
   */
  parseRequirement(
    requirementText: string,
    context: {
      deepAnalysis?: DeepDirectoryAnalysis[];
      modules?: Array<{ name: string; path: string }>;
    }
  ): CodeGenerationRequirement {
    const text = requirementText.toLowerCase();

    // 1. 识别代码类型
    const codeType = this.identifyCodeType(text);

    // 2. 识别文件类型
    const fileType = this.identifyFileType(text, codeType);

    // 3. 识别所属模块
    const module = this.identifyModule(text, context.modules);

    // 4. 识别版本标识
    const version = this.identifyVersion(text, context.deepAnalysis);

    // 5. 判断是否需要拆分
    const shouldSplit = this.shouldSplitCode(text, codeType);

    // 6. 识别拆分策略
    const splitStrategy = shouldSplit
      ? this.identifySplitStrategy(text, codeType, context.deepAnalysis)
      : undefined;

    // 7. 评估复杂度
    const complexity = this.assessComplexity(text, codeType);

    return {
      codeType,
      fileType,
      module,
      version,
      shouldSplit,
      splitStrategy,
      complexity,
    };
  }

  /**
   * 识别代码类型
   */
  private identifyCodeType(text: string): FileTypeCategory {
    // 页面相关
    if (
      text.includes("页面") ||
      text.includes("page") ||
      text.includes("路由页面") ||
      text.includes("route page")
    ) {
      return "page";
    }

    // 组件相关
    if (
      text.includes("组件") ||
      text.includes("component") ||
      text.includes("ui 组件") ||
      text.includes("ui component")
    ) {
      return "component";
    }

    // Hook 相关
    if (
      text.includes("hook") ||
      text.includes("自定义 hook") ||
      text.includes("custom hook")
    ) {
      return "hook";
    }

    // 工具函数相关
    if (
      text.includes("工具") ||
      text.includes("utility") ||
      text.includes("helper") ||
      text.includes("工具函数")
    ) {
      return "utility";
    }

    // 服务/API 相关
    if (
      text.includes("服务") ||
      text.includes("service") ||
      text.includes("api") ||
      text.includes("接口")
    ) {
      return "service";
    }

    // 类型定义相关
    if (
      text.includes("类型") ||
      text.includes("type") ||
      text.includes("interface") ||
      text.includes("类型定义")
    ) {
      return "type";
    }

    // 枚举相关
    if (text.includes("枚举") || text.includes("enum")) {
      return "enum";
    }

    // 常量相关
    if (text.includes("常量") || text.includes("constant")) {
      return "constant";
    }

    // 布局相关
    if (text.includes("布局") || text.includes("layout")) {
      return "layout";
    }

    // 中间件相关
    if (text.includes("中间件") || text.includes("middleware")) {
      return "middleware";
    }

    // 模型相关
    if (text.includes("模型") || text.includes("model") || text.includes("实体")) {
      return "model";
    }

    // 仓库相关
    if (
      text.includes("仓库") ||
      text.includes("repository") ||
      text.includes("repo")
    ) {
      return "repository";
    }

    // 控制器相关
    if (text.includes("控制器") || text.includes("controller")) {
      return "controller";
    }

    // 路由相关
    if (text.includes("路由") || text.includes("route")) {
      return "route";
    }

    // 默认
    return "other";
  }

  /**
   * 识别文件类型（扩展名）
   */
  private identifyFileType(
    text: string,
    codeType: FileTypeCategory
  ): string {
    // 根据代码类型推断文件扩展名
    if (codeType === "component" || codeType === "page" || codeType === "layout") {
      // 检查是否明确指定
      if (text.includes(".tsx") || text.includes("tsx")) {
        return ".tsx";
      }
      if (text.includes(".jsx") || text.includes("jsx")) {
        return ".jsx";
      }
      if (text.includes(".vue") || text.includes("vue")) {
        return ".vue";
      }
      if (text.includes(".svelte") || text.includes("svelte")) {
        return ".svelte";
      }
      // 默认
      return ".tsx";
    }

    if (codeType === "hook" || codeType === "utility" || codeType === "service") {
      if (text.includes(".ts") || text.includes("typescript")) {
        return ".ts";
      }
      return ".ts"; // 默认 TypeScript
    }

    if (codeType === "type" || codeType === "enum" || codeType === "constant") {
      return ".ts";
    }

    return ".ts"; // 默认
  }

  /**
   * 识别所属模块
   */
  private identifyModule(
    text: string,
    modules?: Array<{ name: string; path: string }>
  ): string | undefined {
    if (!modules || modules.length === 0) {
      return undefined;
    }

    // 检查需求中是否提到模块名
    for (const module of modules) {
      const moduleNameLower = module.name.toLowerCase();
      if (text.includes(moduleNameLower) || text.includes(module.path.toLowerCase())) {
        return module.name;
      }
    }

    // 检查常见模块关键词
    if (text.includes("前端") || text.includes("frontend")) {
      const frontendModule = modules.find((m) =>
        m.name.toLowerCase().includes("frontend") ||
        m.name.toLowerCase().includes("client") ||
        m.name.toLowerCase().includes("web")
      );
      if (frontendModule) return frontendModule.name;
    }

    if (text.includes("后端") || text.includes("backend")) {
      const backendModule = modules.find((m) =>
        m.name.toLowerCase().includes("backend") ||
        m.name.toLowerCase().includes("server") ||
        m.name.toLowerCase().includes("api")
      );
      if (backendModule) return backendModule.name;
    }

    return undefined;
  }

  /**
   * 识别版本标识
   */
  private identifyVersion(
    text: string,
    deepAnalysis?: DeepDirectoryAnalysis[]
  ): string | undefined {
    // 检查需求中是否提到版本
    const versionMatch = text.match(/\b(v\d+|legacy|old|new|current)\b/);
    if (versionMatch) {
      return versionMatch[1];
    }

    // 检查是否有版本相关的目录
    if (deepAnalysis) {
      for (const analysis of deepAnalysis) {
        if (analysis.version && text.includes(analysis.path.toLowerCase())) {
          return analysis.version;
        }
      }
    }

    return undefined;
  }

  /**
   * 判断是否需要拆分
   */
  private shouldSplitCode(text: string, codeType: FileTypeCategory): boolean {
    // 明确提到拆分
    if (text.includes("拆分") || text.includes("split") || text.includes("分离")) {
      return true;
    }

    // 复杂组件通常需要拆分
    if (codeType === "component" || codeType === "page") {
      if (
        text.includes("复杂") ||
        text.includes("complex") ||
        text.includes("大型") ||
        text.includes("large") ||
        text.includes("多个") ||
        text.includes("multiple")
      ) {
        return true;
      }
    }

    // 包含多个功能
    if (
      text.includes("和") ||
      text.includes("and") ||
      text.includes("以及") ||
      (text.match(/\d+/g) && parseInt(text.match(/\d+/g)![0]) > 3)
    ) {
      return true;
    }

    return false;
  }

  /**
   * 识别拆分策略
   */
  private identifySplitStrategy(
    text: string,
    codeType: FileTypeCategory,
    deepAnalysis?: DeepDirectoryAnalysis[]
  ): {
    byFeature: boolean;
    byType: boolean;
    coLocation: boolean;
  } {
    const strategy = {
      byFeature: false,
      byType: false,
      coLocation: false,
    };

    // 检查项目是否使用 co-location
    if (deepAnalysis) {
      const hasCoLocation = deepAnalysis.some(
        (a) => a.coLocationPattern?.styles || a.coLocationPattern?.tests
      );
      if (hasCoLocation) {
        strategy.coLocation = true;
      }
    }

    // 按功能拆分
    if (
      text.includes("按功能") ||
      text.includes("by feature") ||
      text.includes("功能模块")
    ) {
      strategy.byFeature = true;
    }

    // 按类型拆分
    if (
      text.includes("按类型") ||
      text.includes("by type") ||
      text.includes("分离样式") ||
      text.includes("分离类型")
    ) {
      strategy.byType = true;
    }

    // 如果都没有明确指定，根据代码类型推断
    if (!strategy.byFeature && !strategy.byType) {
      if (codeType === "component" || codeType === "page") {
        strategy.coLocation = true; // 组件通常使用 co-location
      } else {
        strategy.byFeature = true; // 其他按功能拆分
      }
    }

    return strategy;
  }

  /**
   * 评估复杂度
   */
  private assessComplexity(
    text: string,
    codeType: FileTypeCategory
  ): "simple" | "medium" | "complex" {
    // 简单：单一功能、少量代码
    if (
      text.includes("简单") ||
      text.includes("simple") ||
      text.includes("基础") ||
      text.includes("basic")
    ) {
      return "simple";
    }

    // 复杂：多个功能、大量代码、复杂逻辑
    if (
      text.includes("复杂") ||
      text.includes("complex") ||
      text.includes("大型") ||
      text.includes("large") ||
      text.includes("多个") ||
      text.includes("multiple") ||
      text.includes("复杂逻辑")
    ) {
      return "complex";
    }

    // 根据代码类型推断
    if (codeType === "page" || codeType === "component") {
      // 页面和组件通常是中等复杂度
      return "medium";
    }

    if (codeType === "utility" || codeType === "constant") {
      // 工具函数和常量通常是简单
      return "simple";
    }

    // 默认中等复杂度
    return "medium";
  }
}

