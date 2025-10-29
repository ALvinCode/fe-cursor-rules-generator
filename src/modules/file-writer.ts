import * as path from "path";
import { FileUtils } from "../utils/file-utils.js";
import { CursorRule } from "../types.js";

/**
 * 文件写入器
 * 负责将生成的规则写入 .cursor/rules/ 目录
 */
export class FileWriter {
  /**
   * 写入规则文件
   */
  async writeRules(
    projectPath: string,
    rules: CursorRule[]
  ): Promise<string[]> {
    const writtenFiles: string[] = [];

    // 写入每个规则文件
    for (const rule of rules) {
      // 根据规则的 scope 和 modulePath 确定写入位置
      const baseDir = rule.modulePath || projectPath;
      const rulesDir = path.join(baseDir, ".cursor", "rules");
      
      // 确保目录存在
      await FileUtils.writeFile(path.join(rulesDir, ".gitkeep"), "");
      
      // 写入规则文件
      const filePath = path.join(rulesDir, rule.fileName);
      await FileUtils.writeFile(filePath, rule.content);
      
      // 计算相对于项目根目录的路径用于显示
      const relativePath = path.relative(projectPath, filePath);
      writtenFiles.push(relativePath);
      
      console.error(`已写入规则文件: ${relativePath}`);
    }

    return writtenFiles;
  }

  /**
   * 清理旧的规则文件
   * 清理项目根目录和所有模块目录的规则
   */
  async cleanOldRules(projectPath: string, modulePaths?: string[]): Promise<void> {
    const pathsToClean = [projectPath];
    
    // 添加所有模块路径
    if (modulePaths && modulePaths.length > 0) {
      pathsToClean.push(...modulePaths);
    }

    for (const basePath of pathsToClean) {
      const rulesDir = path.join(basePath, ".cursor", "rules");

      try {
        const fs = await import("fs/promises");
        const files = await fs.readdir(rulesDir);

        for (const file of files) {
          if (file.endsWith(".mdc") || file.endsWith(".md")) {
            const filePath = path.join(rulesDir, file);
            await fs.unlink(filePath);
            console.error(`已删除旧规则文件: ${path.relative(projectPath, filePath)}`);
          }
        }
      } catch (error) {
        // 目录不存在或其他错误，忽略
      }
    }
  }
}

