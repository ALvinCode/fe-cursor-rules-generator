import * as path from "path";
import {
  FileSplittingStrategy,
  DeepDirectoryAnalysis,
  FileTypeCategory,
} from "../types.js";
import { FileUtils } from "../utils/file-utils.js";
import { logger } from "../utils/logger.js";

/**
 * 文件拆分策略分析器
 * 分析项目的文件拆分模式，指导代码如何拆分
 */
export class FileSplittingStrategyAnalyzer {
  /**
   * 分析项目的文件拆分策略
   */
  analyzeSplittingStrategy(
    deepAnalysis: DeepDirectoryAnalysis[],
    codeType: FileTypeCategory
  ): FileSplittingStrategy {
    // 1. 检测项目的拆分模式
    const projectPattern = this.detectProjectPattern(deepAnalysis, codeType);

    // 2. 根据代码类型和项目模式决定是否拆分
    const shouldSplit = this.shouldSplit(deepAnalysis, codeType, projectPattern);

    // 3. 确定拆分模式
    const splitPattern = this.determineSplitPattern(
      deepAnalysis,
      codeType,
      projectPattern
    );

    // 4. 生成文件结构建议
    const fileStructure = this.generateFileStructure(
      codeType,
      splitPattern,
      deepAnalysis
    );

    // 5. 生成拆分理由
    const reasoning = this.generateReasoning(
      shouldSplit,
      splitPattern,
      projectPattern
    );

    return {
      shouldSplit,
      splitPattern,
      fileStructure,
      reasoning,
    };
  }

  /**
   * 检测项目的拆分模式
   */
  private detectProjectPattern(
    deepAnalysis: DeepDirectoryAnalysis[],
    codeType: FileTypeCategory
  ): "single-file" | "multi-file" | "co-location" | "feature-split" {
    // 检查 co-location 模式
    const hasCoLocation = deepAnalysis.some(
      (a) =>
        a.coLocationPattern?.styles ||
        a.coLocationPattern?.tests ||
        a.coLocationPattern?.types
    );

    if (hasCoLocation) {
      return "co-location";
    }

    // 检查 feature-split 模式
    const hasFeatureSplit = deepAnalysis.some(
      (a) => a.architecturePattern === "feature-based"
    );

    if (hasFeatureSplit) {
      return "feature-split";
    }

    // 检查 multi-file 模式（目录中有多个相关文件）
    const multiFileDirs = deepAnalysis.filter(
      (a) =>
        a.fileCount > 3 &&
        (a.primaryFileTypes.includes(codeType) ||
          a.category === codeType ||
          a.purpose.includes("组件") ||
          a.purpose.includes("功能"))
    );

    if (multiFileDirs.length > 0) {
      return "multi-file";
    }

    // 默认单文件模式
    return "single-file";
  }

  /**
   * 判断是否应该拆分
   */
  private shouldSplit(
    deepAnalysis: DeepDirectoryAnalysis[],
    codeType: FileTypeCategory,
    projectPattern: string
  ): boolean {
    // 如果项目使用 co-location 或 multi-file 模式，通常需要拆分
    if (projectPattern === "co-location" || projectPattern === "multi-file") {
      return true;
    }

    // 复杂组件通常需要拆分
    if (codeType === "component" || codeType === "page") {
      // 检查项目中是否有大型组件目录（文件数量多）
      const largeComponentDirs = deepAnalysis.filter(
        (a) =>
          a.fileCount > 5 &&
          (a.primaryFileTypes.includes("component") ||
            a.category === "component")
      );

      if (largeComponentDirs.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * 确定拆分模式
   */
  private determineSplitPattern(
    deepAnalysis: DeepDirectoryAnalysis[],
    codeType: FileTypeCategory,
    projectPattern: string
  ): "single-file" | "multi-file" | "co-location" | "feature-split" {
    // 如果项目有明确的模式，使用项目模式
    if (projectPattern !== "single-file") {
      return projectPattern as any;
    }

    // 根据代码类型推断
    if (codeType === "component" || codeType === "page") {
      // 检查是否有 co-location 模式
      const hasCoLocation = deepAnalysis.some(
        (a) => a.coLocationPattern?.styles || a.coLocationPattern?.tests
      );

      if (hasCoLocation) {
        return "co-location";
      }

      return "multi-file";
    }

    if (codeType === "service" || codeType === "utility") {
      return "multi-file";
    }

    return "single-file";
  }

  /**
   * 生成文件结构建议
   */
  private generateFileStructure(
    codeType: FileTypeCategory,
    splitPattern: string,
    deepAnalysis: DeepDirectoryAnalysis[]
  ): {
    main: string;
    styles?: string;
    types?: string;
    tests?: string;
    hooks?: string[];
    utils?: string[];
  } {
    const structure: any = {
      main: this.getMainFileName(codeType),
    };

    if (splitPattern === "co-location" || splitPattern === "multi-file") {
      // 检查项目是否使用样式文件
      const hasStyles = deepAnalysis.some(
        (a) => a.coLocationPattern?.styles || a.primaryFileTypes.includes("style")
      );
      if (hasStyles && (codeType === "component" || codeType === "page")) {
        structure.styles = this.getStyleFileName(codeType);
      }

      // 检查项目是否使用类型文件
      const hasTypes = deepAnalysis.some(
        (a) => a.coLocationPattern?.types || a.primaryFileTypes.includes("type")
      );
      if (hasTypes) {
        structure.types = this.getTypeFileName(codeType);
      }

      // 检查项目是否使用测试文件
      const hasTests = deepAnalysis.some(
        (a) => a.coLocationPattern?.tests || a.primaryFileTypes.includes("test")
      );
      if (hasTests) {
        structure.tests = this.getTestFileName(codeType);
      }

      // 对于复杂组件，可能需要独立的 hooks 和 utils
      if (codeType === "component" || codeType === "page") {
        const complexDirs = deepAnalysis.filter(
          (a) =>
            a.fileCount > 5 &&
            (a.primaryFileTypes.includes("component") ||
              a.primaryFileTypes.includes("hook") ||
              a.primaryFileTypes.includes("utility"))
        );

        if (complexDirs.length > 0) {
          structure.hooks = ["hooks.ts", "useXxx.ts"];
          structure.utils = ["utils.ts", "helpers.ts"];
        }
      }
    }

    return structure;
  }

  /**
   * 获取主文件名
   */
  private getMainFileName(codeType: FileTypeCategory): string {
    switch (codeType) {
      case "component":
        return "Component.tsx";
      case "page":
        return "Page.tsx";
      case "hook":
        return "useXxx.ts";
      case "service":
        return "service.ts";
      case "utility":
        return "utils.ts";
      default:
        return "index.ts";
    }
  }

  /**
   * 获取样式文件名
   */
  private getStyleFileName(codeType: FileTypeCategory): string {
    switch (codeType) {
      case "component":
        return "Component.module.css";
      case "page":
        return "Page.module.css";
      default:
        return "styles.css";
    }
  }

  /**
   * 获取类型文件名
   */
  private getTypeFileName(codeType: FileTypeCategory): string {
    switch (codeType) {
      case "component":
        return "Component.types.ts";
      case "page":
        return "Page.types.ts";
      default:
        return "types.ts";
    }
  }

  /**
   * 获取测试文件名
   */
  private getTestFileName(codeType: FileTypeCategory): string {
    switch (codeType) {
      case "component":
        return "Component.test.tsx";
      case "page":
        return "Page.test.tsx";
      default:
        return "index.test.ts";
    }
  }

  /**
   * 生成拆分理由
   */
  private generateReasoning(
    shouldSplit: boolean,
    splitPattern: string,
    projectPattern: string
  ): string {
    if (!shouldSplit) {
      return "项目使用单文件模式，不需要拆分";
    }

    const reasons: string[] = [];

    switch (splitPattern) {
      case "co-location":
        reasons.push("项目采用 co-location 模式，样式、类型、测试文件与主文件放在同一目录");
        break;

      case "multi-file":
        reasons.push("项目采用多文件模式，复杂功能应拆分为多个文件");
        break;

      case "feature-split":
        reasons.push("项目采用功能拆分模式，应按功能模块组织文件");
        break;

      default:
        reasons.push("根据项目结构分析，建议拆分文件以提高可维护性");
    }

    if (projectPattern !== "single-file") {
      reasons.push(`项目整体使用 ${projectPattern} 模式，新代码应遵循此模式`);
    }

    return reasons.join("。");
  }
}

