import * as path from "path";
import {
  DeepDirectoryAnalysis,
  FileTypeCategory,
  FileTypeInfo,
  ArchitecturePattern,
} from "../types.js";
import { FileUtils } from "../utils/file-utils.js";
import { logger } from "../utils/logger.js";
import { FileTypeIdentifier } from "./file-type-identifier.js";

/**
 * 深度目录分析器
 * 系统且完整地分析目标项目结构，了解每个文件夹的职能和作用
 */
export class DeepDirectoryAnalyzer {
  private fileTypeIdentifier: FileTypeIdentifier;

  constructor() {
    this.fileTypeIdentifier = new FileTypeIdentifier();
  }

  /**
   * 深度分析项目目录结构
   */
  async analyzeProjectStructure(
    projectPath: string,
    files: string[],
    modules: Array<{ name: string; path: string }>
  ): Promise<DeepDirectoryAnalysis[]> {
    // 1. 识别所有文件类型
    const fileTypeMap = await this.fileTypeIdentifier.identifyFileTypes(
      files,
      projectPath
    );

    // 2. 提取所有目录
    const directories = this.extractAllDirectories(projectPath, files);

    // 3. 分析每个目录
    const analyses: DeepDirectoryAnalysis[] = [];

    for (const dir of directories) {
      try {
        const analysis = await this.analyzeDirectory(
          dir,
          projectPath,
          files,
          fileTypeMap,
          modules
        );
        if (analysis) {
          analyses.push(analysis);
        }
      } catch (error) {
        logger.debug(`分析目录失败: ${dir}`, error);
      }
    }

    // 4. 建立目录层级关系
    this.buildDirectoryHierarchy(analyses);

    return analyses;
  }

  /**
   * 分析单个目录
   */
  private async analyzeDirectory(
    dirPath: string,
    projectPath: string,
    allFiles: string[],
    fileTypeMap: Map<string, FileTypeInfo>,
    modules: Array<{ name: string; path: string }>
  ): Promise<DeepDirectoryAnalysis | null> {
    const fullPath = path.join(projectPath, dirPath);
    const filesInDir = allFiles.filter((f) => {
      const fileDir = path.dirname(FileUtils.getRelativePath(projectPath, f));
      return fileDir === dirPath || fileDir.startsWith(dirPath + path.sep);
    });

    const directFiles = filesInDir.filter((f) => {
      const fileDir = path.dirname(FileUtils.getRelativePath(projectPath, f));
      return fileDir === dirPath;
    });

    if (directFiles.length === 0 && filesInDir.length === 0) {
      return null; // 空目录或只有子目录
    }

    // 分析文件类型分布
    const fileTypeDistribution = this.analyzeFileTypeDistribution(
      directFiles,
      fileTypeMap
    );

    // 识别主要文件类型
    const primaryFileTypes = this.getPrimaryFileTypes(fileTypeDistribution);

    // 识别目录用途
    const purpose = this.inferDirectoryPurpose(
      dirPath,
      directFiles,
      fileTypeDistribution,
      primaryFileTypes
    );

    // 识别目录分类
    const category = this.inferDirectoryCategory(dirPath, purpose, primaryFileTypes);

    // 检测命名模式
    const namingPattern = this.detectNamingPattern(directFiles);

    // 检测架构模式
    const architecturePattern = this.detectArchitecturePattern(
      dirPath,
      directFiles,
      fileTypeDistribution
    );

    // 检测 co-location 模式
    const coLocationPattern = this.detectCoLocationPattern(directFiles, fileTypeMap);

    // 检测 index 文件
    const hasIndexFiles = directFiles.some((f) => {
      const name = path.basename(f);
      return name.startsWith("index.") || name === "index";
    });

    // 计算目录深度
    const depth = dirPath.split(path.sep).filter(Boolean).length;

    // 识别所属模块
    const module = this.identifyModule(dirPath, modules);

    // 识别版本标识
    const version = this.identifyVersion(dirPath, directFiles);

    // 识别子目录
    const childDirectories = this.getChildDirectories(dirPath, allFiles, projectPath);

    return {
      path: dirPath,
      purpose,
      category,
      fileTypeDistribution,
      primaryFileTypes,
      namingPattern,
      architecturePattern,
      hasIndexFiles,
      coLocationPattern,
      fileCount: directFiles.length,
      depth,
      module,
      version,
      childDirectories,
    };
  }

  /**
   * 提取所有目录
   */
  private extractAllDirectories(
    projectPath: string,
    files: string[]
  ): Set<string> {
    const directories = new Set<string>();

    for (const file of files) {
      const relativePath = FileUtils.getRelativePath(projectPath, file);
      const dir = path.dirname(relativePath);

      if (dir && dir !== ".") {
        // 添加所有父目录
        const parts = dir.split(path.sep).filter(Boolean);
        let current = "";
        for (const part of parts) {
          current = current ? path.join(current, part) : part;
          directories.add(current);
        }
      }
    }

    return directories;
  }

  /**
   * 分析文件类型分布
   */
  private analyzeFileTypeDistribution(
    files: string[],
    fileTypeMap: Map<string, FileTypeInfo>
  ): Record<FileTypeCategory, number> {
    const distribution: Record<FileTypeCategory, number> = {
      page: 0,
      component: 0,
      hook: 0,
      utility: 0,
      service: 0,
      type: 0,
      enum: 0,
      constant: 0,
      config: 0,
      test: 0,
      style: 0,
      layout: 0,
      middleware: 0,
      model: 0,
      repository: 0,
      controller: 0,
      route: 0,
      other: 0,
    };

    for (const file of files) {
      const typeInfo = fileTypeMap.get(file);
      if (typeInfo) {
        distribution[typeInfo.category] =
          (distribution[typeInfo.category] || 0) + 1;
      } else {
        distribution.other += 1;
      }
    }

    return distribution;
  }

  /**
   * 获取主要文件类型（占比 > 20%）
   */
  private getPrimaryFileTypes(
    distribution: Record<FileTypeCategory, number>
  ): FileTypeCategory[] {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    const threshold = total * 0.2; // 20% 阈值

    return Object.entries(distribution)
      .filter(([_, count]) => count >= threshold)
      .sort(([_, a], [__, b]) => b - a)
      .map(([category]) => category as FileTypeCategory);
  }

  /**
   * 推断目录用途（增强版）
   */
  private inferDirectoryPurpose(
    dirPath: string,
    files: string[],
    distribution: Record<FileTypeCategory, number>,
    primaryTypes: FileTypeCategory[]
  ): string {
    const dirName = path.basename(dirPath).toLowerCase();
    const dirParts = dirPath.split(path.sep).filter(Boolean);

    // 基于主要文件类型推断
    if (primaryTypes.length > 0) {
      const primaryType = primaryTypes[0];

      if (primaryType === "component" && distribution.component > 0) {
        if (dirName.includes("page") || dirPath.includes("/pages/")) {
          return "页面组件";
        }
        return "组件";
      }

      if (primaryType === "page") {
        return "页面";
      }

      if (primaryType === "hook") {
        return "Hooks";
      }

      if (primaryType === "utility") {
        return "工具函数";
      }

      if (primaryType === "service") {
        return "API 服务";
      }

      if (primaryType === "type") {
        return "类型定义";
      }

      if (primaryType === "model") {
        return "数据模型";
      }

      if (primaryType === "controller") {
        return "控制器";
      }

      if (primaryType === "repository") {
        return "数据仓库";
      }

      if (primaryType === "route") {
        return "路由";
      }

      if (primaryType === "middleware") {
        return "中间件";
      }

      if (primaryType === "layout") {
        return "布局";
      }
    }

    // 基于目录名推断
    if (dirName.includes("component")) return "组件";
    if (dirName.includes("page") || dirName.includes("view")) return "页面";
    if (dirName.includes("hook")) return "Hooks";
    if (dirName.includes("util") || dirName.includes("helper")) return "工具";
    if (dirName.includes("type") || dirName.includes("interface")) return "类型";
    if (dirName.includes("style") || dirName.includes("css")) return "样式";
    if (dirName.includes("api") || dirName.includes("service")) return "API";
    if (dirName.includes("model") || dirName.includes("entity")) return "模型";
    if (dirName.includes("controller")) return "控制器";
    if (dirName.includes("repository") || dirName.includes("repo"))
      return "仓库";
    if (dirName.includes("route") || dirName.includes("router")) return "路由";
    if (dirName.includes("middleware")) return "中间件";
    if (dirName.includes("layout")) return "布局";
    if (dirName.includes("feature")) return "功能模块";
    if (dirName.includes("shared") || dirName.includes("common")) return "共享";
    if (dirName.includes("config")) return "配置";
    if (dirName.includes("test") || dirName.includes("__tests__")) return "测试";

    // 基于路径层级推断
    if (dirParts.length >= 2) {
      const parentDir = dirParts[dirParts.length - 2]?.toLowerCase();
      if (parentDir === "features" || parentDir === "modules") {
        return "功能模块";
      }
    }

    return "其他";
  }

  /**
   * 推断目录分类
   */
  private inferDirectoryCategory(
    dirPath: string,
    purpose: string,
    primaryTypes: FileTypeCategory[]
  ): string {
    // 根据用途和文件类型确定分类
    if (purpose.includes("组件") || primaryTypes.includes("component")) {
      return "component";
    }
    if (purpose.includes("页面") || primaryTypes.includes("page")) {
      return "page";
    }
    if (purpose.includes("Hook") || primaryTypes.includes("hook")) {
      return "hook";
    }
    if (purpose.includes("工具") || primaryTypes.includes("utility")) {
      return "utility";
    }
    if (purpose.includes("服务") || primaryTypes.includes("service")) {
      return "service";
    }
    if (purpose.includes("类型") || primaryTypes.includes("type")) {
      return "type";
    }
    if (purpose.includes("模型") || primaryTypes.includes("model")) {
      return "model";
    }
    if (purpose.includes("路由") || primaryTypes.includes("route")) {
      return "route";
    }
    if (purpose.includes("功能")) {
      return "feature";
    }
    if (purpose.includes("共享")) {
      return "shared";
    }

    return "other";
  }

  /**
   * 检测命名模式
   */
  private detectNamingPattern(
    files: string[]
  ): "PascalCase" | "camelCase" | "kebab-case" | "snake_case" | "mixed" {
    let pascalCount = 0;
    let camelCount = 0;
    let kebabCount = 0;
    let snakeCount = 0;

    for (const file of files) {
      const basename = path.basename(file, path.extname(file));

      if (basename.match(/^[A-Z][a-zA-Z0-9]+$/)) pascalCount++;
      else if (basename.match(/^[a-z][a-zA-Z0-9]+$/)) camelCount++;
      else if (basename.match(/^[a-z][a-z0-9-]+$/)) kebabCount++;
      else if (basename.match(/^[a-z][a-z0-9_]+$/)) snakeCount++;
    }

    const total = pascalCount + camelCount + kebabCount + snakeCount;
    if (total === 0) return "mixed";

    const max = Math.max(pascalCount, camelCount, kebabCount, snakeCount);

    if (max / total > 0.6) {
      if (max === pascalCount) return "PascalCase";
      if (max === camelCount) return "camelCase";
      if (max === kebabCount) return "kebab-case";
      if (max === snakeCount) return "snake_case";
    }

    return "mixed";
  }

  /**
   * 检测架构模式
   */
  private detectArchitecturePattern(
    dirPath: string,
    files: string[],
    distribution: Record<FileTypeCategory, number>
  ): string | undefined {
    const dirParts = dirPath.split(path.sep).filter(Boolean);
    const dirName = path.basename(dirPath).toLowerCase();

    // Clean Architecture 模式
    if (
      dirParts.includes("domain") ||
      dirParts.includes("application") ||
      dirParts.includes("infrastructure") ||
      dirParts.includes("presentation")
    ) {
      return "clean-architecture";
    }

    // Feature-based 模式
    if (
      dirParts.includes("features") ||
      dirParts.includes("modules") ||
      dirName.includes("feature")
    ) {
      return "feature-based";
    }

    // MVC 模式
    if (
      (dirParts.includes("models") || dirParts.includes("views") || dirParts.includes("controllers")) &&
      distribution.model > 0 &&
      distribution.controller > 0
    ) {
      return "mvc";
    }

    // Domain-driven 模式
    if (
      dirParts.includes("domain") ||
      dirParts.includes("entities") ||
      dirParts.includes("aggregates")
    ) {
      return "domain-driven";
    }

    // Layered 模式
    if (
      dirParts.includes("layers") ||
      (dirParts.includes("presentation") && dirParts.includes("business"))
    ) {
      return "layered";
    }

    return undefined;
  }

  /**
   * 检测 co-location 模式
   */
  private detectCoLocationPattern(
    files: string[],
    fileTypeMap: Map<string, FileTypeInfo>
  ): {
    styles: boolean;
    tests: boolean;
    types: boolean;
  } {
    let hasStyles = false;
    let hasTests = false;
    let hasTypes = false;

    for (const file of files) {
      const typeInfo = fileTypeMap.get(file);
      if (typeInfo) {
        if (typeInfo.category === "style") hasStyles = true;
        if (typeInfo.category === "test") hasTests = true;
        if (typeInfo.category === "type") hasTypes = true;
      }
    }

    return {
      styles: hasStyles,
      tests: hasTests,
      types: hasTypes,
    };
  }

  /**
   * 识别所属模块
   */
  private identifyModule(
    dirPath: string,
    modules: Array<{ name: string; path: string }>
  ): string | undefined {
    for (const module of modules) {
      if (dirPath.startsWith(module.path) || module.path.includes(dirPath)) {
        return module.name;
      }
    }
    return undefined;
  }

  /**
   * 识别版本标识
   */
  private identifyVersion(
    dirPath: string,
    files: string[]
  ): string | undefined {
    const dirParts = dirPath.split(path.sep).filter(Boolean);

    // 检查目录名中的版本标识
    for (const part of dirParts) {
      const lower = part.toLowerCase();
      // v1, v2, v3...
      if (lower.match(/^v\d+$/)) {
        return part;
      }
      // legacy, old, new, current
      if (["legacy", "old", "new", "current", "v1", "v2"].includes(lower)) {
        return part;
      }
    }

    // 检查文件名中的版本标识
    for (const file of files) {
      const fileName = path.basename(file).toLowerCase();
      if (fileName.match(/v\d+/)) {
        const match = fileName.match(/v\d+/);
        if (match) return match[0];
      }
    }

    return undefined;
  }

  /**
   * 获取子目录列表
   */
  private getChildDirectories(
    dirPath: string,
    allFiles: string[],
    projectPath: string
  ): string[] {
    const children = new Set<string>();

    for (const file of allFiles) {
      const fileDir = path.dirname(FileUtils.getRelativePath(projectPath, file));
      if (fileDir.startsWith(dirPath + path.sep)) {
        const relative = fileDir.substring(dirPath.length + 1);
        const firstPart = relative.split(path.sep)[0];
        if (firstPart) {
          children.add(path.join(dirPath, firstPart));
        }
      }
    }

    return Array.from(children);
  }

  /**
   * 建立目录层级关系
   */
  private buildDirectoryHierarchy(analyses: DeepDirectoryAnalysis[]): void {
    const pathMap = new Map<string, DeepDirectoryAnalysis>();
    for (const analysis of analyses) {
      pathMap.set(analysis.path, analysis);
    }

    for (const analysis of analyses) {
      const parts = analysis.path.split(path.sep).filter(Boolean);
      if (parts.length > 1) {
        const parentPath = parts.slice(0, -1).join(path.sep);
        const parent = pathMap.get(parentPath);
        if (parent) {
          analysis.parentDirectory = parentPath;
          if (!parent.childDirectories.includes(analysis.path)) {
            parent.childDirectories.push(analysis.path);
          }
        }
      }
    }
  }

  /**
   * 识别项目整体架构模式
   */
  async identifyArchitecturePattern(
    analyses: DeepDirectoryAnalysis[],
    projectPath: string,
    files: string[]
  ): Promise<ArchitecturePattern> {
    const indicators: string[] = [];
    let type: ArchitecturePattern["type"] = "unknown";
    let confidence: "high" | "medium" | "low" = "low";

    // 检查是否有 monorepo 特征
    const hasMonorepo = this.checkMonorepo(projectPath, files);
    if (hasMonorepo) {
      type = "monorepo";
      confidence = "high";
      indicators.push("检测到 monorepo 结构（packages/、apps/ 等目录）");
    }

    // 检查 Clean Architecture
    const cleanArchDirs = analyses.filter(
      (a) => a.architecturePattern === "clean-architecture"
    );
    if (cleanArchDirs.length > 0) {
      type = "clean-architecture";
      confidence = "high";
      indicators.push(`检测到 ${cleanArchDirs.length} 个 Clean Architecture 目录`);
    }

    // 检查 Feature-based
    const featureDirs = analyses.filter(
      (a) => a.architecturePattern === "feature-based"
    );
    if (featureDirs.length > 0 && !hasMonorepo) {
      type = "feature-based";
      confidence = "high";
      indicators.push(`检测到 ${featureDirs.length} 个功能模块目录`);
    }

    // 检查 MVC
    const mvcDirs = analyses.filter((a) => a.architecturePattern === "mvc");
    if (mvcDirs.length > 0 && !hasMonorepo) {
      type = "mvc";
      confidence = "medium";
      indicators.push("检测到 MVC 模式目录结构");
    }

    // 检查 Domain-driven
    const dddDirs = analyses.filter(
      (a) => a.architecturePattern === "domain-driven"
    );
    if (dddDirs.length > 0) {
      type = "domain-driven";
      confidence = "high";
      indicators.push("检测到 Domain-driven 模式");
    }

    // 检查微服务
    const hasMicroservices = this.checkMicroservices(projectPath, files);
    if (hasMicroservices) {
      type = "microservices";
      confidence = "high";
      indicators.push("检测到微服务架构（Dockerfile、docker-compose.yml）");
    }

    // 构建层级结构信息
    const layerStructure = this.buildLayerStructure(analyses);
    const featureStructure = this.buildFeatureStructure(analyses);

    return {
      type,
      confidence,
      indicators,
      layerStructure,
      featureStructure,
    };
  }

  /**
   * 检查是否为 monorepo
   */
  private checkMonorepo(projectPath: string, files: string[]): boolean {
    const monorepoIndicators = [
      "pnpm-workspace.yaml",
      "lerna.json",
      "nx.json",
      "turbo.json",
    ];

    for (const indicator of monorepoIndicators) {
      if (files.some((f) => f.includes(indicator))) {
        return true;
      }
    }

    // 检查是否有 packages/ 或 apps/ 目录
    const hasPackages = files.some((f) => f.includes("/packages/"));
    const hasApps = files.some((f) => f.includes("/apps/"));

    return hasPackages || hasApps;
  }

  /**
   * 检查是否为微服务
   */
  private checkMicroservices(projectPath: string, files: string[]): boolean {
    return (
      files.some((f) => f.includes("docker-compose.yml")) &&
      files.some((f) => f.includes("Dockerfile"))
    );
  }

  /**
   * 构建层级结构（Clean Architecture）
   */
  private buildLayerStructure(analyses: DeepDirectoryAnalysis[]): {
    presentation?: string[];
    application?: string[];
    domain?: string[];
    infrastructure?: string[];
  } | undefined {
    const layers: {
      presentation?: string[];
      application?: string[];
      domain?: string[];
      infrastructure?: string[];
    } = {};

    for (const analysis of analyses) {
      const dirParts = analysis.path.split(path.sep).filter(Boolean);
      if (dirParts.includes("presentation")) {
        if (!layers.presentation) layers.presentation = [];
        layers.presentation.push(analysis.path);
      }
      if (dirParts.includes("application")) {
        if (!layers.application) layers.application = [];
        layers.application.push(analysis.path);
      }
      if (dirParts.includes("domain")) {
        if (!layers.domain) layers.domain = [];
        layers.domain.push(analysis.path);
      }
      if (dirParts.includes("infrastructure")) {
        if (!layers.infrastructure) layers.infrastructure = [];
        layers.infrastructure.push(analysis.path);
      }
    }

    return Object.keys(layers).length > 0 ? layers : undefined;
  }

  /**
   * 构建功能结构（Feature-based）
   */
  private buildFeatureStructure(analyses: DeepDirectoryAnalysis[]): {
    features: string[];
    shared?: string[];
  } | undefined {
    const features: string[] = [];
    const shared: string[] = [];

    for (const analysis of analyses) {
      const dirParts = analysis.path.split(path.sep).filter(Boolean);
      if (dirParts.includes("features") || dirParts.includes("modules")) {
        if (analysis.purpose.includes("共享") || analysis.category === "shared") {
          shared.push(analysis.path);
        } else {
          features.push(analysis.path);
        }
      }
    }

    return features.length > 0 ? { features, shared: shared.length > 0 ? shared : undefined } : undefined;
  }

  /**
   * 检测版本隔离模式
   */
  detectVersionIsolation(analyses: DeepDirectoryAnalysis[]): {
    hasVersioning: boolean;
    versions: string[];
    pattern: "directory" | "prefix" | "suffix" | "none";
  } {
    const versions = new Set<string>();
    let hasDirectoryVersioning = false;
    let hasPrefixVersioning = false;
    let hasSuffixVersioning = false;

    for (const analysis of analyses) {
      if (analysis.version) {
        versions.add(analysis.version);
        const dirParts = analysis.path.split(path.sep).filter(Boolean);
        if (dirParts.includes(analysis.version)) {
          hasDirectoryVersioning = true;
        } else {
          const dirName = path.basename(analysis.path);
          if (dirName.startsWith(analysis.version)) {
            hasPrefixVersioning = true;
          } else if (dirName.endsWith(analysis.version)) {
            hasSuffixVersioning = true;
          }
        }
      }
    }

    let pattern: "directory" | "prefix" | "suffix" | "none" = "none";
    if (hasDirectoryVersioning) {
      pattern = "directory";
    } else if (hasPrefixVersioning) {
      pattern = "prefix";
    } else if (hasSuffixVersioning) {
      pattern = "suffix";
    }

    return {
      hasVersioning: versions.size > 0,
      versions: Array.from(versions),
      pattern,
    };
  }

  /**
   * 检测模块层级（支持多国家线等）
   */
  detectModuleHierarchy(
    analyses: DeepDirectoryAnalysis[],
    modules: Array<{ name: string; path: string; type?: string }>
  ): {
    levels: Array<{
      level: number;
      name: string;
      type: "country" | "region" | "module" | "feature" | "other";
      directories: string[];
    }>;
  } {
    const levels: Array<{
      level: number;
      name: string;
      type: "country" | "region" | "module" | "feature" | "other";
      directories: string[];
    }> = [];

    // 分析目录层级
    const levelMap = new Map<number, Set<string>>();

    for (const analysis of analyses) {
      const depth = analysis.depth;
      if (!levelMap.has(depth)) {
        levelMap.set(depth, new Set());
      }
      levelMap.get(depth)!.add(analysis.path);
    }

    // 识别每一层的类型
    for (const [depth, dirs] of levelMap) {
      const dirArray = Array.from(dirs);
      const type = this.inferLevelType(dirArray, depth);

      levels.push({
        level: depth,
        name: `Level ${depth}`,
        type,
        directories: dirArray,
      });
    }

    // 按层级排序
    levels.sort((a, b) => a.level - b.level);

    return { levels };
  }

  /**
   * 推断层级类型
   */
  private inferLevelType(
    directories: string[],
    depth: number
  ): "country" | "region" | "module" | "feature" | "other" {
    // 检查国家代码模式（如 ph, th, sg, my, id 等）
    const countryCodes = ["ph", "th", "sg", "my", "id", "vn", "tw", "hk", "cn"];
    for (const dir of directories) {
      const dirName = path.basename(dir).toLowerCase();
      if (countryCodes.includes(dirName) || dirName.match(/^[a-z]{2}$/)) {
        return "country";
      }
    }

    // 检查区域模式
    const regionNames = ["asia", "europe", "america", "region"];
    for (const dir of directories) {
      const dirName = path.basename(dir).toLowerCase();
      if (regionNames.some((r) => dirName.includes(r))) {
        return "region";
      }
    }

    // 检查功能模块
    if (depth <= 2) {
      for (const dir of directories) {
        const dirName = path.basename(dir).toLowerCase();
        if (
          dirName.includes("feature") ||
          dirName.includes("module") ||
          dirName.includes("service")
        ) {
          return "feature";
        }
      }
    }

    // 默认模块类型
    if (depth <= 3) {
      return "module";
    }

    return "other";
  }
}

