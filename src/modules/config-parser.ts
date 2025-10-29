import * as path from "path";
import { FileUtils } from "../utils/file-utils.js";

/**
 * 配置文件解析器
 * 解析项目的各种配置文件，提取代码风格和规范
 */

export interface PrettierConfig {
  tabWidth?: number;
  useTabs?: boolean;
  semi?: boolean;
  singleQuote?: boolean;
  printWidth?: number;
  trailingComma?: "none" | "es5" | "all";
  bracketSpacing?: boolean;
  arrowParens?: "always" | "avoid";
}

export interface ESLintConfig {
  rules?: Record<string, any>;
  extends?: string[];
  parser?: string;
  parserOptions?: Record<string, any>;
}

export interface TSConfig {
  compilerOptions?: {
    strict?: boolean;
    target?: string;
    module?: string;
    paths?: Record<string, string[]>;
    baseUrl?: string;
    [key: string]: any;
  };
}

export interface ProjectConfig {
  prettier?: PrettierConfig;
  eslint?: ESLintConfig;
  typescript?: TSConfig;
  pathAliases: Record<string, string>;
  hasConfig: {
    prettier: boolean;
    eslint: boolean;
    typescript: boolean;
  };
}

export class ConfigParser {
  /**
   * 解析项目配置
   */
  async parseProjectConfig(projectPath: string): Promise<ProjectConfig> {
    const config: ProjectConfig = {
      pathAliases: {},
      hasConfig: {
        prettier: false,
        eslint: false,
        typescript: false,
      },
    };

    // 解析 Prettier 配置
    config.prettier = await this.parsePrettierConfig(projectPath);
    config.hasConfig.prettier = config.prettier !== undefined;

    // 解析 ESLint 配置
    config.eslint = await this.parseESLintConfig(projectPath);
    config.hasConfig.eslint = config.eslint !== undefined;

    // 解析 TypeScript 配置
    config.typescript = await this.parseTSConfig(projectPath);
    config.hasConfig.typescript = config.typescript !== undefined;

    // 提取路径别名
    config.pathAliases = await this.extractPathAliases(projectPath);

    return config;
  }

  /**
   * 解析 Prettier 配置
   */
  private async parsePrettierConfig(
    projectPath: string
  ): Promise<PrettierConfig | undefined> {
    // 尝试读取 .prettierrc
    const prettierrcPath = path.join(projectPath, ".prettierrc");
    if (await FileUtils.fileExists(prettierrcPath)) {
      const content = await FileUtils.readFile(prettierrcPath);
      try {
        return JSON.parse(content);
      } catch {
        // YAML 格式，暂不支持
      }
    }

    // 尝试读取 .prettierrc.json
    const prettierrcJsonPath = path.join(projectPath, ".prettierrc.json");
    if (await FileUtils.fileExists(prettierrcJsonPath)) {
      const content = await FileUtils.readFile(prettierrcJsonPath);
      try {
        return JSON.parse(content);
      } catch {}
    }

    // 尝试从 package.json 读取
    const packageJsonPath = path.join(projectPath, "package.json");
    if (await FileUtils.fileExists(packageJsonPath)) {
      const content = await FileUtils.readFile(packageJsonPath);
      try {
        const pkg = JSON.parse(content);
        if (pkg.prettier) {
          return pkg.prettier;
        }
      } catch {}
    }

    return undefined;
  }

  /**
   * 解析 ESLint 配置
   */
  private async parseESLintConfig(
    projectPath: string
  ): Promise<ESLintConfig | undefined> {
    // 尝试读取 .eslintrc.json
    const eslintrcJsonPath = path.join(projectPath, ".eslintrc.json");
    if (await FileUtils.fileExists(eslintrcJsonPath)) {
      const content = await FileUtils.readFile(eslintrcJsonPath);
      try {
        return JSON.parse(content);
      } catch {}
    }

    // 尝试读取 .eslintrc
    const eslintrcPath = path.join(projectPath, ".eslintrc");
    if (await FileUtils.fileExists(eslintrcPath)) {
      const content = await FileUtils.readFile(eslintrcPath);
      try {
        return JSON.parse(content);
      } catch {}
    }

    // 尝试从 package.json 读取
    const packageJsonPath = path.join(projectPath, "package.json");
    if (await FileUtils.fileExists(packageJsonPath)) {
      const content = await FileUtils.readFile(packageJsonPath);
      try {
        const pkg = JSON.parse(content);
        if (pkg.eslintConfig) {
          return pkg.eslintConfig;
        }
      } catch {}
    }

    return undefined;
  }

  /**
   * 解析 TypeScript 配置
   */
  private async parseTSConfig(
    projectPath: string
  ): Promise<TSConfig | undefined> {
    const tsconfigPath = path.join(projectPath, "tsconfig.json");
    if (await FileUtils.fileExists(tsconfigPath)) {
      const content = await FileUtils.readFile(tsconfigPath);
      try {
        // 移除注释（简单处理）
        const cleanContent = content.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
        return JSON.parse(cleanContent);
      } catch (error) {
        console.error("解析 tsconfig.json 失败:", error);
      }
    }
    return undefined;
  }

  /**
   * 提取路径别名
   */
  private async extractPathAliases(
    projectPath: string
  ): Promise<Record<string, string>> {
    const aliases: Record<string, string> = {};

    // 从 tsconfig.json 提取
    const tsconfig = await this.parseTSConfig(projectPath);
    if (tsconfig?.compilerOptions?.paths) {
      const baseUrl = tsconfig.compilerOptions.baseUrl || ".";
      for (const [alias, paths] of Object.entries(
        tsconfig.compilerOptions.paths
      )) {
        if (paths && paths.length > 0) {
          // 移除通配符
          const cleanAlias = alias.replace("/*", "");
          const cleanPath = paths[0].replace("/*", "");
          aliases[cleanAlias] = path.join(baseUrl, cleanPath);
        }
      }
    }

    // 从 vite.config 提取
    const viteConfigPath = path.join(projectPath, "vite.config.ts");
    if (await FileUtils.fileExists(viteConfigPath)) {
      const content = await FileUtils.readFile(viteConfigPath);
      // 简单的正则提取 alias 配置
      const aliasMatch = content.match(/alias:\s*{([^}]+)}/);
      if (aliasMatch) {
        // 这里需要更复杂的解析，暂时跳过
      }
    }

    // 从 next.config 提取（暂时跳过，较复杂）

    return aliases;
  }

  /**
   * 将配置转换为可读的描述
   */
  describeConfig(config: ProjectConfig): string {
    let description = "";

    if (config.prettier) {
      description += `**代码格式化配置** (Prettier):\n`;
      description += `- 缩进: ${config.prettier.useTabs ? "Tabs" : `${config.prettier.tabWidth || 2} 个空格`}\n`;
      description += `- 引号: ${config.prettier.singleQuote ? "单引号" : "双引号"}\n`;
      description += `- 分号: ${config.prettier.semi ? "使用" : "不使用"}\n`;
      description += `- 行长度: ${config.prettier.printWidth || 80} 字符\n`;
      description += `- 尾随逗号: ${config.prettier.trailingComma || "none"}\n\n`;
    }

    if (config.typescript?.compilerOptions) {
      description += `**TypeScript 配置**:\n`;
      description += `- 严格模式: ${config.typescript.compilerOptions.strict ? "启用" : "禁用"}\n`;
      if (config.typescript.compilerOptions.target) {
        description += `- 编译目标: ${config.typescript.compilerOptions.target}\n`;
      }
    }

    if (Object.keys(config.pathAliases).length > 0) {
      description += `\n**路径别名**:\n`;
      for (const [alias, target] of Object.entries(config.pathAliases)) {
        description += `- \`${alias}\` → \`${target}\`\n`;
      }
    }

    return description;
  }
}

