import * as path from "path";
import {
  FileLocationDecision,
  FileTypeCategory,
  DeepDirectoryAnalysis,
  EnhancedFileOrganization,
} from "../types.js";
import { FileUtils } from "../utils/file-utils.js";
import { logger } from "../utils/logger.js";

/**
 * 文件位置决策引擎
 * 根据代码类型和项目结构决定文件应该存放的位置
 */
export class FileLocationDecisionEngine {
  /**
   * 决定文件应该存放的位置
   */
  decideFileLocation(
    codeType: FileTypeCategory,
    requirement: {
      module?: string;
      version?: string;
      complexity?: "simple" | "medium" | "complex";
    },
    organization: EnhancedFileOrganization
  ): FileLocationDecision {
    const reasoning: string[] = [];
    const alternatives: Array<{
      path: string;
      reason: string;
      confidence: "high" | "medium" | "low";
    }> = [];
    const constraints: FileLocationDecision["constraints"] = {};

    // 1. 根据代码类型确定基础位置
    let baseLocation = this.getBaseLocationByType(codeType, organization);
    reasoning.push(`根据代码类型 "${codeType}" 确定基础位置: ${baseLocation}`);

    // 2. 考虑模块约束
    if (requirement.module) {
      const modulePath = this.findModulePath(requirement.module, organization);
      if (modulePath) {
        baseLocation = path.join(modulePath, baseLocation);
        constraints.mustBeInModule = requirement.module;
        reasoning.push(`模块约束: 必须在模块 "${requirement.module}" 中`);
      }
    }

    // 3. 考虑版本约束
    if (requirement.version) {
      const versionPath = this.findVersionPath(requirement.version, organization);
      if (versionPath) {
        baseLocation = path.join(versionPath, baseLocation);
        constraints.mustBeInVersion = requirement.version;
        reasoning.push(`版本约束: 必须在版本 "${requirement.version}" 中`);
      }
    }

    // 4. 考虑架构模式
    const architecturePath = this.getPathByArchitecture(
      codeType,
      organization
    );
    if (architecturePath && architecturePath !== baseLocation) {
      alternatives.push({
        path: architecturePath,
        reason: "根据架构模式推荐的位置",
        confidence: "medium",
      });
    }

    // 5. 考虑深度分析结果
    const deepAnalysisPath = this.getPathByDeepAnalysis(
      codeType,
      organization.deepAnalysis
    );
    if (deepAnalysisPath && deepAnalysisPath !== baseLocation) {
      alternatives.push({
        path: deepAnalysisPath,
        reason: "根据项目实际结构推荐的位置",
        confidence: "high",
      });
      // 如果深度分析有高置信度，使用它
      baseLocation = deepAnalysisPath;
    }

    // 6. 确定最终推荐路径
    const recommendedPath = baseLocation;
    let confidence: "high" | "medium" | "low" = "high";

    // 如果有多重约束，降低置信度
    if (Object.keys(constraints).length > 2) {
      confidence = "medium";
    }

    // 如果没有找到明确位置
    if (!baseLocation || baseLocation === "") {
      confidence = "low";
      reasoning.push("警告: 无法确定明确的文件位置，需要用户确认");
    }

    return {
      recommendedPath,
      confidence,
      alternatives,
      reasoning,
      constraints,
    };
  }

  /**
   * 根据代码类型获取基础位置
   */
  private getBaseLocationByType(
    codeType: FileTypeCategory,
    organization: EnhancedFileOrganization
  ): string {
    switch (codeType) {
      case "component":
        if (organization.componentLocation.length > 0) {
          return organization.componentLocation[0];
        }
        return "src/components";

      case "page":
        // 页面位置可能在不同框架中不同
        if (organization.deepAnalysis) {
          const pageDirs = organization.deepAnalysis.filter(
            (a) => a.purpose.includes("页面") || a.category === "page"
          );
          if (pageDirs.length > 0) {
            return pageDirs[0].path;
          }
        }
        return "src/pages";

      case "hook":
        if (organization.hooksLocation && organization.hooksLocation.length > 0) {
          return organization.hooksLocation[0];
        }
        return "src/hooks";

      case "utility":
        if (organization.utilsLocation.length > 0) {
          return organization.utilsLocation[0];
        }
        return "src/utils";

      case "service":
        if (organization.apiLocation && organization.apiLocation.length > 0) {
          return organization.apiLocation[0];
        }
        return "src/services";

      case "type":
        if (organization.typesLocation && organization.typesLocation.length > 0) {
          return organization.typesLocation[0];
        }
        return "src/types";

      case "enum":
      case "constant":
        if (organization.typesLocation && organization.typesLocation.length > 0) {
          return organization.typesLocation[0];
        }
        return "src/constants";

      case "layout":
        return "src/layouts";

      case "middleware":
        return "src/middleware";

      case "model":
        return "src/models";

      case "repository":
        return "src/repositories";

      case "controller":
        return "src/controllers";

      case "route":
        return "src/routes";

      default:
        return "src";
    }
  }

  /**
   * 查找模块路径
   */
  private findModulePath(
    moduleName: string,
    organization: EnhancedFileOrganization
  ): string | null {
    // 从深度分析中查找模块
    if (organization.deepAnalysis) {
      for (const analysis of organization.deepAnalysis) {
        if (analysis.module === moduleName) {
          return analysis.path;
        }
      }
    }

    return null;
  }

  /**
   * 查找版本路径
   */
  private findVersionPath(
    version: string,
    organization: EnhancedFileOrganization
  ): string | null {
    if (organization.versionIsolation?.hasVersioning) {
      if (organization.deepAnalysis) {
        for (const analysis of organization.deepAnalysis) {
          if (analysis.version === version) {
            return analysis.path;
          }
        }
      }
    }

    return null;
  }

  /**
   * 根据架构模式获取路径
   */
  private getPathByArchitecture(
    codeType: FileTypeCategory,
    organization: EnhancedFileOrganization
  ): string | null {
    const pattern = organization.architecturePattern;
    if (!pattern) return null;

    switch (pattern.type) {
      case "clean-architecture":
        return this.getCleanArchitecturePath(codeType, pattern);

      case "feature-based":
        return this.getFeatureBasedPath(codeType, pattern);

      case "mvc":
        return this.getMVCPath(codeType, pattern);

      default:
        return null;
    }
  }

  /**
   * Clean Architecture 路径
   */
  private getCleanArchitecturePath(
    codeType: FileTypeCategory,
    pattern: any
  ): string | null {
    if (!pattern.layerStructure) return null;

    switch (codeType) {
      case "component":
      case "page":
      case "layout":
        return pattern.layerStructure.presentation?.[0] || null;

      case "service":
      case "repository":
        return pattern.layerStructure.application?.[0] || null;

      case "model":
      case "type":
      case "enum":
        return pattern.layerStructure.domain?.[0] || null;

      case "utility":
      case "middleware":
        return pattern.layerStructure.infrastructure?.[0] || null;

      default:
        return null;
    }
  }

  /**
   * Feature-based 路径
   */
  private getFeatureBasedPath(
    codeType: FileTypeCategory,
    pattern: any
  ): string | null {
    if (!pattern.featureStructure) return null;

    // Feature-based 架构中，文件通常放在功能目录下
    // 这里返回第一个功能目录作为示例，实际应该根据需求选择
    if (pattern.featureStructure.features.length > 0) {
      const featurePath = pattern.featureStructure.features[0];
      // 根据代码类型添加子目录
      switch (codeType) {
        case "component":
          return path.join(featurePath, "components");
        case "page":
          return path.join(featurePath, "pages");
        case "hook":
          return path.join(featurePath, "hooks");
        case "service":
          return path.join(featurePath, "services");
        default:
          return featurePath;
      }
    }

    return null;
  }

  /**
   * MVC 路径
   */
  private getMVCPath(codeType: FileTypeCategory, pattern: any): string | null {
    switch (codeType) {
      case "model":
        return "src/models";
      case "controller":
        return "src/controllers";
      case "component":
      case "page":
        return "src/views";
      default:
        return null;
    }
  }

  /**
   * 根据深度分析获取路径
   */
  private getPathByDeepAnalysis(
    codeType: FileTypeCategory,
    deepAnalysis?: DeepDirectoryAnalysis[]
  ): string | null {
    if (!deepAnalysis || deepAnalysis.length === 0) return null;

    // 查找与代码类型匹配的目录
    const matchingDirs = deepAnalysis.filter((analysis) => {
      return (
        analysis.primaryFileTypes.includes(codeType) ||
        analysis.category === codeType ||
        (codeType === "component" && analysis.purpose.includes("组件")) ||
        (codeType === "page" && analysis.purpose.includes("页面")) ||
        (codeType === "hook" && analysis.purpose.includes("Hook")) ||
        (codeType === "utility" && analysis.purpose.includes("工具")) ||
        (codeType === "service" && analysis.purpose.includes("服务"))
      );
    });

    if (matchingDirs.length > 0) {
      // 选择文件数量最多的目录（通常是最常用的位置）
      const bestMatch = matchingDirs.reduce((prev, current) =>
        current.fileCount > prev.fileCount ? current : prev
      );
      return bestMatch.path;
    }

    return null;
  }
}

