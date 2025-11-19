import * as path from "path";
import { FileDependency, DependencyGraph, FileTypeCategory } from "../types.js";
import { FileUtils } from "../utils/file-utils.js";
import { logger } from "../utils/logger.js";
import { FileTypeIdentifier } from "./file-type-identifier.js";

/**
 * 文件依赖关系分析器
 * 分析文件间的导入/导出关系，构建依赖图
 */
export class FileDependencyAnalyzer {
  private fileTypeIdentifier: FileTypeIdentifier;

  constructor() {
    this.fileTypeIdentifier = new FileTypeIdentifier();
  }

  /**
   * 分析文件依赖关系并构建依赖图
   */
  async analyzeDependencies(
    projectPath: string,
    files: string[],
    modules: Array<{ name: string; path: string }>
  ): Promise<DependencyGraph> {
    const dependencies: FileDependency[] = [];
    const nodes: DependencyGraph["nodes"] = [];
    const moduleMap = new Map<string, string>(); // 文件路径 -> 模块名

    // 识别所有文件类型
    const fileTypeMap = await this.fileTypeIdentifier.identifyFileTypes(
      files,
      projectPath
    );

    // 建立模块映射
    for (const module of modules) {
      for (const file of files) {
        const relativePath = FileUtils.getRelativePath(projectPath, file);
        if (relativePath.startsWith(module.path) || module.path.includes(relativePath)) {
          moduleMap.set(file, module.name);
        }
      }
    }

    // 分析每个文件的依赖
    for (const file of files) {
      const typeInfo = fileTypeMap.get(file);
      const fileType = typeInfo?.category || "other";
      const module = moduleMap.get(file);

      nodes.push({
        path: FileUtils.getRelativePath(projectPath, file),
        type: fileType,
        module,
      });

      try {
        const fileDeps = await this.analyzeFileDependencies(
          file,
          projectPath,
          files
        );
        dependencies.push(...fileDeps);
      } catch (error) {
        logger.debug(`分析文件依赖失败: ${file}`, error);
      }
    }

    // 标记循环依赖
    const circularDependencies = this.detectCircularDependencies(
      dependencies,
      nodes
    );

    // 标记循环依赖
    for (const cycle of circularDependencies) {
      for (const dep of dependencies) {
        if (cycle.includes(dep.from) && cycle.includes(dep.to)) {
          dep.isCircular = true;
        }
      }
    }

    // 构建模块映射
    const moduleFileMap = new Map<string, string[]>();
    for (const node of nodes) {
      if (node.module) {
        if (!moduleFileMap.has(node.module)) {
          moduleFileMap.set(node.module, []);
        }
        moduleFileMap.get(node.module)!.push(node.path);
      }
    }

    return {
      nodes,
      edges: dependencies,
      modules: moduleFileMap,
      circularDependencies,
    };
  }

  /**
   * 分析单个文件的依赖关系
   */
  private async analyzeFileDependencies(
    filePath: string,
    projectPath: string,
    allFiles: string[]
  ): Promise<FileDependency[]> {
    const dependencies: FileDependency[] = [];
    const extension = path.extname(filePath);

    // 只分析代码文件
    if (![".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte"].includes(extension)) {
      return dependencies;
    }

    try {
      const content = await FileUtils.readFile(filePath);
      const relativePath = FileUtils.getRelativePath(projectPath, filePath);

      // 分析 import 语句
      const importDeps = this.extractImports(content, relativePath, allFiles, projectPath);
      dependencies.push(...importDeps);

      // 分析 require 语句
      const requireDeps = this.extractRequires(content, relativePath, allFiles, projectPath);
      dependencies.push(...requireDeps);

      // 分析动态导入
      const dynamicDeps = this.extractDynamicImports(content, relativePath, allFiles, projectPath);
      dependencies.push(...dynamicDeps);
    } catch (error) {
      logger.debug(`读取文件失败: ${filePath}`, error);
    }

    return dependencies;
  }

  /**
   * 提取 import 语句
   */
  private extractImports(
    content: string,
    fromPath: string,
    allFiles: string[],
    projectPath: string
  ): FileDependency[] {
    const dependencies: FileDependency[] = [];

    // ES6 import 语句
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
    // import type 语句
    const importTypeRegex = /import\s+type\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    // import() 动态导入
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    const patterns = [importRegex, importTypeRegex, dynamicImportRegex];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        const resolvedPath = this.resolveImportPath(
          importPath,
          fromPath,
          allFiles,
          projectPath
        );

        if (resolvedPath) {
          dependencies.push({
            from: fromPath,
            to: resolvedPath,
            type: pattern === dynamicImportRegex ? "dynamic" : "import",
            isExternal: this.isExternalDependency(importPath),
          });
        }
      }
    }

    return dependencies;
  }

  /**
   * 提取 require 语句
   */
  private extractRequires(
    content: string,
    fromPath: string,
    allFiles: string[],
    projectPath: string
  ): FileDependency[] {
    const dependencies: FileDependency[] = [];

    // require() 语句
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    let match;
    while ((match = requireRegex.exec(content)) !== null) {
      const requirePath = match[1];
      const resolvedPath = this.resolveImportPath(
        requirePath,
        fromPath,
        allFiles,
        projectPath
      );

      if (resolvedPath) {
        dependencies.push({
          from: fromPath,
          to: resolvedPath,
          type: "require",
          isExternal: this.isExternalDependency(requirePath),
        });
      }
    }

    return dependencies;
  }

  /**
   * 提取动态导入
   */
  private extractDynamicImports(
    content: string,
    fromPath: string,
    allFiles: string[],
    projectPath: string
  ): FileDependency[] {
    const dependencies: FileDependency[] = [];

    // import() 动态导入
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    let match;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      const importPath = match[1];
      const resolvedPath = this.resolveImportPath(
        importPath,
        fromPath,
        allFiles,
        projectPath
      );

      if (resolvedPath) {
        dependencies.push({
          from: fromPath,
          to: resolvedPath,
          type: "dynamic",
          isExternal: this.isExternalDependency(importPath),
        });
      }
    }

    return dependencies;
  }

  /**
   * 解析导入路径为实际文件路径
   */
  private resolveImportPath(
    importPath: string,
    fromPath: string,
    allFiles: string[],
    projectPath: string
  ): string | null {
    // 跳过外部依赖
    if (this.isExternalDependency(importPath)) {
      return null;
    }

    const fromDir = path.dirname(fromPath);
    let resolved: string | null = null;

    // 相对路径
    if (importPath.startsWith(".")) {
      const absolutePath = path.resolve(projectPath, fromDir, importPath);
      resolved = this.findMatchingFile(absolutePath, allFiles, projectPath);
    }
    // 绝对路径（路径别名，如 @/、~ 等）
    else if (importPath.startsWith("@") || importPath.startsWith("~")) {
      // 需要从项目配置中获取路径别名映射
      // 这里简化处理，尝试常见模式
      const aliasPath = importPath.replace(/^[@~]/, "");
      resolved = this.findMatchingFile(
        path.join(projectPath, aliasPath),
        allFiles,
        projectPath
      );
    }
    // 可能是 node_modules 中的包（已通过 isExternalDependency 过滤）

    return resolved;
  }

  /**
   * 查找匹配的文件
   */
  private findMatchingFile(
    targetPath: string,
    allFiles: string[],
    projectPath: string
  ): string | null {
    // 尝试直接匹配
    const relativeTarget = FileUtils.getRelativePath(projectPath, targetPath);
    if (allFiles.some((f) => FileUtils.getRelativePath(projectPath, f) === relativeTarget)) {
      return relativeTarget;
    }

    // 尝试添加扩展名
    const extensions = [".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte"];
    for (const ext of extensions) {
      const withExt = targetPath + ext;
      const relativeWithExt = FileUtils.getRelativePath(projectPath, withExt);
      if (allFiles.some((f) => FileUtils.getRelativePath(projectPath, f) === relativeWithExt)) {
        return relativeWithExt;
      }
    }

    // 尝试 index 文件
    for (const ext of extensions) {
      const indexPath = path.join(targetPath, `index${ext}`);
      const relativeIndex = FileUtils.getRelativePath(projectPath, indexPath);
      if (allFiles.some((f) => FileUtils.getRelativePath(projectPath, f) === relativeIndex)) {
        return relativeIndex;
      }
    }

    return null;
  }

  /**
   * 判断是否为外部依赖
   */
  private isExternalDependency(importPath: string): boolean {
    // 不以 . 或 / 开头，且不是路径别名
    return (
      !importPath.startsWith(".") &&
      !importPath.startsWith("/") &&
      !importPath.startsWith("@") &&
      !importPath.startsWith("~")
    );
  }

  /**
   * 检测循环依赖
   */
  private detectCircularDependencies(
    dependencies: FileDependency[],
    nodes: DependencyGraph["nodes"]
  ): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const graph = new Map<string, string[]>();

    // 构建邻接表（只考虑内部依赖）
    for (const dep of dependencies) {
      if (!dep.isExternal) {
        if (!graph.has(dep.from)) {
          graph.set(dep.from, []);
        }
        graph.get(dep.from)!.push(dep.to);
      }
    }

    // DFS 检测循环
    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recStack.has(neighbor)) {
          // 找到循环
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            const cycle = path.slice(cycleStart).concat(neighbor);
            cycles.push(cycle);
          }
        }
      }

      recStack.delete(node);
    };

    // 对每个节点进行 DFS
    for (const node of nodes) {
      if (!visited.has(node.path)) {
        dfs(node.path, []);
      }
    }

    return cycles;
  }
}

