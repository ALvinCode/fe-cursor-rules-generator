import * as path from "path";
import { FileTypeCategory, FileTypeInfo } from "../types.js";
import { FileUtils } from "../utils/file-utils.js";
import { logger } from "../utils/logger.js";

/**
 * 文件类型识别器
 * 基于文件名、路径、扩展名等基本信息识别文件类型
 * 仅在基本信息无法判断时才使用 AST 分析
 */
export class FileTypeIdentifier {
  /**
   * 识别文件类型
   */
  async identifyFileType(
    filePath: string,
    projectPath: string
  ): Promise<FileTypeInfo> {
    const fileName = path.basename(filePath);
    const relativePath = FileUtils.getRelativePath(projectPath, filePath);
    const dirPath = path.dirname(relativePath);
    const extension = path.extname(fileName);
    const nameWithoutExt = path.basename(fileName, extension);

    const indicators: string[] = [];
    let category: FileTypeCategory = "other";
    let confidence: "high" | "medium" | "low" = "low";
    let requiresAST = false;

    // 1. 基于扩展名和路径的快速识别
    const quickResult = this.quickIdentify(
      fileName,
      relativePath,
      dirPath,
      extension,
      nameWithoutExt
    );

    if (quickResult.confidence === "high") {
      return quickResult;
    }

    // 2. 基于命名模式的识别
    const namingResult = this.identifyByNamingPattern(
      fileName,
      nameWithoutExt,
      dirPath,
      extension
    );

    if (namingResult.confidence === "high") {
      return namingResult;
    }

    // 3. 基于目录结构的识别
    const structureResult = this.identifyByDirectoryStructure(
      dirPath,
      fileName,
      extension
    );

    if (structureResult.confidence === "high") {
      return structureResult;
    }

    // 4. 如果仍然无法确定，标记需要 AST 分析
    if (quickResult.confidence === "low" && namingResult.confidence === "low") {
      requiresAST = true;
      indicators.push("基本信息无法确定，需要 AST 分析");
    }

    // 返回最佳匹配结果
    const bestMatch =
      quickResult.confidence === "medium"
        ? quickResult
        : namingResult.confidence === "medium"
        ? namingResult
        : structureResult;

    return {
      ...bestMatch,
      requiresAST,
    };
  }

  /**
   * 快速识别（基于扩展名和路径）
   */
  private quickIdentify(
    fileName: string,
    relativePath: string,
    dirPath: string,
    extension: string,
    nameWithoutExt: string
  ): FileTypeInfo {
    const indicators: string[] = [];
    let category: FileTypeCategory = "other";
    let confidence: "high" | "medium" | "low" = "low";

    // 测试文件
    if (
      fileName.includes(".test.") ||
      fileName.includes(".spec.") ||
      relativePath.includes("/__tests__/") ||
      relativePath.includes("/tests/")
    ) {
      category = "test";
      confidence = "high";
      indicators.push("测试文件命名模式");
      return { category, confidence, indicators };
    }

    // 样式文件
    if ([".css", ".scss", ".sass", ".less", ".styl"].includes(extension)) {
      category = "style";
      confidence = "high";
      indicators.push(`样式文件扩展名: ${extension}`);
      return { category, confidence, indicators };
    }

    // 配置文件
    if (
      fileName.startsWith(".") ||
      fileName === "config.ts" ||
      fileName === "config.js" ||
      fileName.includes("config.") ||
      dirPath.includes("/config")
    ) {
      category = "config";
      confidence = "high";
      indicators.push("配置文件命名或位置");
      return { category, confidence, indicators };
    }

    // 类型定义文件（TypeScript）
    if (
      extension === ".ts" &&
      (fileName.includes("types") ||
        fileName.includes("interface") ||
        fileName.includes("type") ||
        dirPath.includes("/types") ||
        dirPath.includes("/@types"))
    ) {
      category = "type";
      confidence = "high";
      indicators.push("类型定义文件命名或位置");
      return { category, confidence, indicators };
    }

    // 枚举文件
    if (
      extension === ".ts" &&
      (fileName.toLowerCase().includes("enum") ||
        nameWithoutExt.match(/^[A-Z][a-zA-Z]*Enum$/))
    ) {
      category = "enum";
      confidence = "high";
      indicators.push("枚举文件命名模式");
      return { category, confidence, indicators };
    }

    // 常量文件
    if (
      extension === ".ts" &&
      (fileName.toLowerCase().includes("constant") ||
        fileName.toLowerCase().includes("const") ||
        nameWithoutExt.toUpperCase() === nameWithoutExt)
    ) {
      category = "constant";
      confidence = "high";
      indicators.push("常量文件命名模式");
      return { category, confidence, indicators };
    }

    // React/Vue 组件文件
    if ([".tsx", ".jsx", ".vue", ".svelte"].includes(extension)) {
      // 页面文件（通常在 pages/、app/、views/ 目录）
      if (
        dirPath.includes("/pages/") ||
        dirPath.includes("/app/") ||
        dirPath.includes("/views/") ||
        fileName === "page.tsx" ||
        fileName === "page.jsx" ||
        fileName.includes("Page")
      ) {
        category = "page";
        confidence = "high";
        indicators.push("页面文件位置或命名");
        return { category, confidence, indicators };
      }

      // 布局文件
      if (
        fileName === "layout.tsx" ||
        fileName === "layout.jsx" ||
        fileName.includes("Layout") ||
        dirPath.includes("/layouts/")
      ) {
        category = "layout";
        confidence = "high";
        indicators.push("布局文件命名或位置");
        return { category, confidence, indicators };
      }

      // 组件文件（默认）
      category = "component";
      confidence = "high";
      indicators.push(`组件文件扩展名: ${extension}`);
      return { category, confidence, indicators };
    }

    // Hook 文件（React）
    if (
      extension === ".ts" &&
      (fileName.startsWith("use") ||
        dirPath.includes("/hooks/") ||
        dirPath.includes("/Hooks/"))
    ) {
      category = "hook";
      confidence = "high";
      indicators.push("Hook 文件命名模式或位置");
      return { category, confidence, indicators };
    }

    // 路由文件
    if (
      fileName.includes("route") ||
      fileName.includes("router") ||
      dirPath.includes("/routes/") ||
      dirPath.includes("/routers/")
    ) {
      category = "route";
      confidence = "high";
      indicators.push("路由文件命名或位置");
      return { category, confidence, indicators };
    }

    // 中间件文件
    if (
      fileName.includes("middleware") ||
      dirPath.includes("/middleware/") ||
      dirPath.includes("/middlewares/")
    ) {
      category = "middleware";
      confidence = "high";
      indicators.push("中间件文件命名或位置");
      return { category, confidence, indicators };
    }

    // 控制器文件
    if (
      fileName.includes("controller") ||
      dirPath.includes("/controllers/") ||
      dirPath.includes("/controller/")
    ) {
      category = "controller";
      confidence = "high";
      indicators.push("控制器文件命名或位置");
      return { category, confidence, indicators };
    }

    // 模型文件
    if (
      fileName.includes("model") ||
      dirPath.includes("/models/") ||
      dirPath.includes("/model/") ||
      dirPath.includes("/entities/")
    ) {
      category = "model";
      confidence = "high";
      indicators.push("模型文件命名或位置");
      return { category, confidence, indicators };
    }

    // 仓库文件
    if (
      fileName.includes("repository") ||
      fileName.includes("repo") ||
      dirPath.includes("/repositories/") ||
      dirPath.includes("/repository/")
    ) {
      category = "repository";
      confidence = "high";
      indicators.push("仓库文件命名或位置");
      return { category, confidence, indicators };
    }

    // 服务/API 文件
    if (
      fileName.includes("service") ||
      fileName.includes("api") ||
      dirPath.includes("/services/") ||
      dirPath.includes("/api/") ||
      dirPath.includes("/apis/")
    ) {
      category = "service";
      confidence = "high";
      indicators.push("服务/API 文件命名或位置");
      return { category, confidence, indicators };
    }

    // 工具函数文件
    if (
      dirPath.includes("/utils/") ||
      dirPath.includes("/utilities/") ||
      dirPath.includes("/helpers/") ||
      dirPath.includes("/lib/")
    ) {
      category = "utility";
      confidence = "medium";
      indicators.push("工具函数目录位置");
      return { category, confidence, indicators };
    }

    return { category, confidence, indicators };
  }

  /**
   * 基于命名模式识别
   */
  private identifyByNamingPattern(
    fileName: string,
    nameWithoutExt: string,
    dirPath: string,
    extension: string
  ): FileTypeInfo {
    const indicators: string[] = [];
    let category: FileTypeCategory = "other";
    let confidence: "high" | "medium" | "low" = "low";

    // PascalCase 命名（通常是组件或类型）
    if (nameWithoutExt.match(/^[A-Z][a-zA-Z0-9]+$/)) {
      if ([".tsx", ".jsx", ".vue"].includes(extension)) {
        category = "component";
        confidence = "high";
        indicators.push("PascalCase 组件命名");
      } else if (extension === ".ts" || extension === ".js") {
        // 可能是类型、枚举或组件相关的工具
        category = "type";
        confidence = "medium";
        indicators.push("PascalCase TypeScript 文件");
      }
    }

    // camelCase 命名（通常是工具函数、Hook）
    if (nameWithoutExt.match(/^[a-z][a-zA-Z0-9]+$/)) {
      if (nameWithoutExt.startsWith("use")) {
        category = "hook";
        confidence = "high";
        indicators.push("Hook 命名模式 (useXxx)");
      } else if (extension === ".ts" || extension === ".js") {
        category = "utility";
        confidence = "medium";
        indicators.push("camelCase 工具函数命名");
      }
    }

    // kebab-case 命名
    if (nameWithoutExt.match(/^[a-z][a-z0-9-]+$/)) {
      if ([".tsx", ".jsx"].includes(extension)) {
        category = "component";
        confidence = "medium";
        indicators.push("kebab-case 组件命名");
      } else {
        category = "utility";
        confidence = "medium";
        indicators.push("kebab-case 工具函数命名");
      }
    }

    return { category, confidence, indicators };
  }

  /**
   * 基于目录结构识别
   */
  private identifyByDirectoryStructure(
    dirPath: string,
    fileName: string,
    extension: string
  ): FileTypeInfo {
    const indicators: string[] = [];
    let category: FileTypeCategory = "other";
    let confidence: "high" | "medium" | "low" = "low";

    const dirParts = dirPath.split(path.sep).filter(Boolean);
    const dirName = dirParts[dirParts.length - 1]?.toLowerCase() || "";

    // 根据目录名判断
    if (dirName.includes("component")) {
      category = "component";
      confidence = "high";
      indicators.push(`组件目录: ${dirName}`);
    } else if (dirName.includes("page") || dirName.includes("view")) {
      category = "page";
      confidence = "high";
      indicators.push(`页面目录: ${dirName}`);
    } else if (dirName.includes("hook")) {
      category = "hook";
      confidence = "high";
      indicators.push(`Hook 目录: ${dirName}`);
    } else if (dirName.includes("util") || dirName.includes("helper")) {
      category = "utility";
      confidence = "high";
      indicators.push(`工具目录: ${dirName}`);
    } else if (dirName.includes("service") || dirName.includes("api")) {
      category = "service";
      confidence = "high";
      indicators.push(`服务目录: ${dirName}`);
    } else if (dirName.includes("type") || dirName.includes("interface")) {
      category = "type";
      confidence = "high";
      indicators.push(`类型目录: ${dirName}`);
    } else if (dirName.includes("model") || dirName.includes("entity")) {
      category = "model";
      confidence = "high";
      indicators.push(`模型目录: ${dirName}`);
    } else if (dirName.includes("controller")) {
      category = "controller";
      confidence = "high";
      indicators.push(`控制器目录: ${dirName}`);
    } else if (dirName.includes("repository") || dirName.includes("repo")) {
      category = "repository";
      confidence = "high";
      indicators.push(`仓库目录: ${dirName}`);
    } else if (dirName.includes("route") || dirName.includes("router")) {
      category = "route";
      confidence = "high";
      indicators.push(`路由目录: ${dirName}`);
    } else if (dirName.includes("middleware")) {
      category = "middleware";
      confidence = "high";
      indicators.push(`中间件目录: ${dirName}`);
    } else if (dirName.includes("layout")) {
      category = "layout";
      confidence = "high";
      indicators.push(`布局目录: ${dirName}`);
    }

    return { category, confidence, indicators };
  }

  /**
   * 批量识别文件类型
   */
  async identifyFileTypes(
    files: string[],
    projectPath: string
  ): Promise<Map<string, FileTypeInfo>> {
    const results = new Map<string, FileTypeInfo>();

    for (const file of files) {
      try {
        const info = await this.identifyFileType(file, projectPath);
        results.set(file, info);
      } catch (error) {
        logger.debug(`识别文件类型失败: ${file}`, error);
        results.set(file, {
          category: "other",
          confidence: "low",
          indicators: ["识别失败"],
        });
      }
    }

    return results;
  }
}

