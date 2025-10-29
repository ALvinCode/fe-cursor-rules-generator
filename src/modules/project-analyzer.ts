import { FileUtils } from "../utils/file-utils.js";

/**
 * 项目分析器
 * 负责收集项目文件和基础信息
 */
export class ProjectAnalyzer {
  /**
   * 收集项目中所有有用的文件
   */
  async collectFiles(projectPath: string): Promise<string[]> {
    console.error(`开始扫描项目: ${projectPath}`);
    const files = await FileUtils.collectFiles(projectPath, 10);
    console.error(`扫描完成，共发现 ${files.length} 个有用文件`);
    return files;
  }

  /**
   * 获取项目基础信息
   */
  async getProjectInfo(projectPath: string): Promise<{
    name: string;
    hasPackageJson: boolean;
    hasReadme: boolean;
  }> {
    const path = await import("path");
    const name = path.basename(projectPath);

    const packageJsonPath = path.join(projectPath, "package.json");
    const readmePath = path.join(projectPath, "README.md");

    const hasPackageJson = await FileUtils.fileExists(packageJsonPath);
    const hasReadme = await FileUtils.fileExists(readmePath);

    return {
      name,
      hasPackageJson,
      hasReadme,
    };
  }
}

