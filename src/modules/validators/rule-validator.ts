import * as path from "path";
import { FileUtils } from "../../utils/file-utils.js";

/**
 * 规则验证器
 * 验证生成的 Cursor Rules 文件的正确性
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  filePath: string;
}

export interface ValidationError {
  type: string;
  message: string;
  line?: number;
  severity: "error";
}

export interface ValidationWarning {
  type: string;
  message: string;
  line?: number;
  severity: "warning";
}

export class RuleValidator {
  /**
   * 验证规则文件
   */
  async validateRuleFile(filePath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 检查文件是否存在
    if (!(await FileUtils.fileExists(filePath))) {
      errors.push({
        type: "file-not-found",
        message: `规则文件不存在: ${filePath}`,
        severity: "error",
      });
      return { isValid: false, errors, warnings, filePath };
    }

    // 读取文件内容
    const content = await FileUtils.readFile(filePath);

    // 验证前置元数据
    const metadataValidation = this.validateMetadata(content);
    errors.push(...metadataValidation.errors);
    warnings.push(...metadataValidation.warnings);

    // 验证 Markdown 格式
    const markdownValidation = this.validateMarkdown(content);
    errors.push(...markdownValidation.errors);
    warnings.push(...markdownValidation.warnings);

    // 验证文件名格式
    const filenameValidation = this.validateFileName(filePath);
    errors.push(...filenameValidation.errors);
    warnings.push(...filenameValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      filePath,
    };
  }

  /**
   * 验证目录中的所有规则文件
   */
  async validateRulesDirectory(rulesDir: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    try {
      const fs = await import("fs/promises");
      const files = await fs.readdir(rulesDir);

      for (const file of files) {
        if (file.endsWith(".mdc") || file.endsWith(".md")) {
          const filePath = path.join(rulesDir, file);
          const result = await this.validateRuleFile(filePath);
          results.push(result);
        }
      }
    } catch (error) {
      // 目录不存在
      results.push({
        isValid: false,
        errors: [
          {
            type: "directory-not-found",
            message: `规则目录不存在: ${rulesDir}`,
            severity: "error",
          },
        ],
        warnings: [],
        filePath: rulesDir,
      });
    }

    return results;
  }

  /**
   * 验证前置元数据
   */
  private validateMetadata(content: string): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 检查是否有前置元数据
    if (!content.startsWith("---")) {
      errors.push({
        type: "missing-frontmatter",
        message: "缺少前置元数据（应该以 --- 开始）",
        line: 1,
        severity: "error",
      });
      return { errors, warnings };
    }

    // 提取前置元数据
    const metadataMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!metadataMatch) {
      errors.push({
        type: "invalid-frontmatter",
        message: "前置元数据格式不正确（应该以 --- 结束）",
        severity: "error",
      });
      return { errors, warnings };
    }

    const metadata = metadataMatch[1];
    const lines = metadata.split("\n");

    // 验证必需字段
    const requiredFields = ["title", "description", "priority"];
    const presentFields = new Set<string>();

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*.+/);
      if (match) {
        presentFields.add(match[1]);
      }
    }

    for (const field of requiredFields) {
      if (!presentFields.has(field)) {
        errors.push({
          type: "missing-required-field",
          message: `缺少必需的元数据字段: ${field}`,
          severity: "error",
        });
      }
    }

    // 验证优先级值
    const priorityMatch = metadata.match(/^priority:\s*(\d+)/m);
    if (priorityMatch) {
      const priority = parseInt(priorityMatch[1]);
      if (priority < 0 || priority > 1000) {
        warnings.push({
          type: "invalid-priority",
          message: `优先级值异常: ${priority}（建议范围 0-1000）`,
          severity: "warning",
        });
      }
    }

    // 推荐字段检查
    const recommendedFields = ["version", "generatedAt", "techStack", "tags"];
    for (const field of recommendedFields) {
      if (!presentFields.has(field)) {
        warnings.push({
          type: "missing-recommended-field",
          message: `建议添加元数据字段: ${field}`,
          severity: "warning",
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * 验证 Markdown 格式
   */
  private validateMarkdown(content: string): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 移除前置元数据
    const markdownContent = content.replace(/^---\n[\s\S]*?\n---\n/, "");

    if (markdownContent.trim().length === 0) {
      errors.push({
        type: "empty-content",
        message: "规则文件内容为空",
        severity: "error",
      });
      return { errors, warnings };
    }

    // 检查是否有标题
    if (!markdownContent.match(/^#\s+.+/m)) {
      warnings.push({
        type: "missing-heading",
        message: "规则内容缺少主标题（建议使用 # 开头）",
        severity: "warning",
      });
    }

    // 检查代码块是否正确闭合
    const codeBlockMatches = markdownContent.match(/```/g);
    if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
      errors.push({
        type: "unclosed-code-block",
        message: "代码块未正确闭合（``` 数量不匹配）",
        severity: "error",
      });
    }

    // 检查是否有内容（不只是空标题）
    const contentWithoutHeadings = markdownContent.replace(/^#+\s+.+$/gm, "");
    if (contentWithoutHeadings.trim().length < 50) {
      warnings.push({
        type: "minimal-content",
        message: "规则内容过少，建议添加更多详细说明",
        severity: "warning",
      });
    }

    return { errors, warnings };
  }

  /**
   * 验证文件名格式
   */
  private validateFileName(filePath: string): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const fileName = path.basename(filePath);

    // 检查扩展名
    if (!fileName.endsWith(".mdc") && !fileName.endsWith(".md")) {
      errors.push({
        type: "invalid-extension",
        message: `文件扩展名应该是 .mdc 或 .md，当前为: ${fileName}`,
        severity: "error",
      });
    }

    // 推荐使用 .mdc 扩展名
    if (fileName.endsWith(".md")) {
      warnings.push({
        type: "deprecated-extension",
        message: "建议使用 .mdc 扩展名而非 .md",
        severity: "warning",
      });
    }

    // 检查文件名格式
    if (!fileName.match(/^[a-z0-9-]+\.mdc$/)) {
      warnings.push({
        type: "non-standard-filename",
        message: "建议使用小写字母、数字和连字符的文件名（如 global-rules.mdc）",
        severity: "warning",
      });
    }

    return { errors, warnings };
  }

  /**
   * 生成验证报告
   */
  generateReport(results: ValidationResult[]): string {
    const totalFiles = results.length;
    const validFiles = results.filter((r) => r.isValid).length;
    const invalidFiles = totalFiles - validFiles;

    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

    let report = `# 规则验证报告

## 总体统计

- 📁 总文件数: ${totalFiles}
- ✅ 有效文件: ${validFiles}
- ❌ 无效文件: ${invalidFiles}
- 🚨 错误总数: ${totalErrors}
- ⚠️  警告总数: ${totalWarnings}

`;

    // 详细结果
    if (invalidFiles > 0 || totalWarnings > 0) {
      report += `## 详细结果\n\n`;

      for (const result of results) {
        if (result.errors.length > 0 || result.warnings.length > 0) {
          const fileName = path.basename(result.filePath);
          report += `### ${fileName}\n\n`;

          if (result.errors.length > 0) {
            report += `**错误 (${result.errors.length})：**\n`;
            for (const error of result.errors) {
              report += `- ❌ [${error.type}] ${error.message}${error.line ? ` (行 ${error.line})` : ""}\n`;
            }
            report += "\n";
          }

          if (result.warnings.length > 0) {
            report += `**警告 (${result.warnings.length})：**\n`;
            for (const warning of result.warnings) {
              report += `- ⚠️  [${warning.type}] ${warning.message}${warning.line ? ` (行 ${warning.line})` : ""}\n`;
            }
            report += "\n";
          }
        }
      }
    } else {
      report += `## ✅ 所有规则文件都已通过验证！\n\n`;
    }

    // 总结
    if (totalErrors > 0) {
      report += `## ⚠️  需要修复的问题\n\n`;
      report += `发现 ${totalErrors} 个错误，请修复后重新验证。\n`;
    } else if (totalWarnings > 0) {
      report += `## 💡 建议改进\n\n`;
      report += `发现 ${totalWarnings} 个警告，建议改进以获得更好的规则质量。\n`;
    } else {
      report += `## 🎉 完美！\n\n`;
      report += `所有规则文件格式正确，符合最佳实践！\n`;
    }

    return report;
  }
}

