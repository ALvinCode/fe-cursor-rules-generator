import * as path from "path";
import { FileUtils } from "../../utils/file-utils.js";
import { logger } from "../../utils/logger.js";
import { Dependency } from '../../types.js';

/**
 * 依赖关联分析器
 * 分析目录是否与已安装的依赖相关
 */
export class DependencyAnalyzer {
  private dependencies: Dependency[] = [];
  private dependencyNames: Set<string> = new Set();
  private dependencyKeywords: Map<string, string[]> = new Map();

  /**
   * 初始化依赖信息
   */
  async initialize(projectPath: string, dependencies: Dependency[]): Promise<void> {
    this.dependencies = dependencies;
    this.dependencyNames = new Set(
      dependencies.map((d) => d.name.toLowerCase())
    );

    // 构建依赖关键词映射（依赖名 -> 相关目录关键词）
    this.buildDependencyKeywords();
  }

  /**
   * 检查目录是否与依赖相关（简化版，不需要 projectPath）
   * v1.9: 提高匹配精度，只检查当前目录名，避免误匹配父级目录
   */
  async checkDependencyRelationSimple(
    dirPath: string,
    files: string[]
  ): Promise<{
    isRelated: boolean;
    dependencyName?: string;
    purpose?: string;
  }> {
    const dirName = path.basename(dirPath).toLowerCase();

    // 检查目录名是否匹配依赖关键词（只检查当前目录名，不检查整个路径）
    for (const [depName, keywords] of this.dependencyKeywords) {
      for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase();
        
        // 精确匹配或连字符模式匹配
        // 例如：dirName = "react-hook-form" 匹配 keyword = "react-hook-form"
        //      dirName = "hookform-utils" 匹配 keyword = "hookform"
        //      dirName = "kyc-form" 不匹配 keyword = "hookform"
        if (
          dirName === keywordLower ||                           // 完全匹配
          dirName === `${keywordLower}s` ||                     // 复数形式
          dirName.startsWith(`${keywordLower}-`) ||             // 前缀模式：hookform-utils
          dirName.endsWith(`-${keywordLower}`) ||               // 后缀模式：utils-hookform
          dirName.includes(`-${keywordLower}-`)                 // 中间模式：react-hookform-utils
        ) {
          return {
            isRelated: true,
            dependencyName: depName,
            purpose: this.generateDependencyPurpose(depName, dirName),
          };
        }
      }
    }

    // 检查目录名是否直接匹配依赖名
    for (const dep of this.dependencies) {
      const depNameLower = dep.name.toLowerCase();
      
      // 处理 scoped packages（如 @mui/material）
      const depBaseName = depNameLower.includes('/') 
        ? depNameLower.split('/').pop()! 
        : depNameLower;
      
      if (
        dirName === depNameLower || 
        dirName === depBaseName ||
        dirName.includes(depNameLower.replace(/[@\/]/g, '-'))  // @mui/material -> mui-material
      ) {
        return {
          isRelated: true,
          dependencyName: dep.name,
          purpose: this.generateDependencyPurpose(dep.name, dirName),
        };
      }
    }

    return { isRelated: false };
  }

  /**
   * 构建依赖关键词映射
   */
  private buildDependencyKeywords(): void {
    // 国际化相关
    this.addDependencyKeywords(
      ["i18next", "react-i18next", "next-i18next", "@lingui/core"],
      ["i18n", "locale", "locales", "lang", "language", "translation", "translations"]
    );

    // 状态管理相关
    this.addDependencyKeywords(
      ["redux", "@reduxjs/toolkit", "react-redux"],
      ["redux", "store", "stores", "slice", "slices", "state"]
    );
    this.addDependencyKeywords(
      ["zustand"],
      ["store", "stores", "zustand"]
    );
    this.addDependencyKeywords(
      ["mobx", "mobx-react"],
      ["store", "stores", "mobx"]
    );
    this.addDependencyKeywords(
      ["recoil"],
      ["store", "stores", "recoil", "atom", "atoms"]
    );
    this.addDependencyKeywords(
      ["jotai"],
      ["store", "stores", "jotai", "atom", "atoms"]
    );

    // UI 库相关
    this.addDependencyKeywords(
      ["@mui/material", "@mui/core", "material-ui"],
      ["mui", "material", "components"]
    );
    this.addDependencyKeywords(
      ["antd", "@ant-design/icons"],
      ["antd", "ant", "components"]
    );
    this.addDependencyKeywords(
      ["@chakra-ui/react", "chakra-ui"],
      ["chakra", "components"]
    );
    this.addDependencyKeywords(
      ["tailwindcss", "@tailwindcss/forms"],
      ["tailwind", "tailwind.config", "styles"]
    );

    // 认证相关
    this.addDependencyKeywords(
      ["next-auth", "auth0", "@auth0/nextjs-auth0"],
      ["auth", "authentication", "next-auth"]
    );

    // 路由相关
    this.addDependencyKeywords(
      ["react-router", "react-router-dom", "@tanstack/react-router"],
      ["router", "routers", "routes", "route"]
    );

    // 表单相关
    // v1.9: 移除泛化关键词 "form"，避免误匹配业务目录（如 kyc-form）
    this.addDependencyKeywords(
      ["react-hook-form", "@hookform/resolvers"],
      ["react-hook-form", "hookform", "hook-form"]
    );
    this.addDependencyKeywords(
      ["formik"],
      ["formik"]
    );

    // 测试相关
    this.addDependencyKeywords(
      ["jest", "@testing-library/react", "vitest"],
      ["test", "tests", "__tests__", "__test__", "spec", "specs"]
    );

    // 工程工具
    this.addDependencyKeywords(
      ["eslint", "@typescript-eslint/eslint-plugin"],
      ["eslint", ".eslintrc", "lint"]
    );
    this.addDependencyKeywords(
      ["prettier"],
      ["prettier", ".prettierrc"]
    );

    // 数据获取
    this.addDependencyKeywords(
      ["react-query", "@tanstack/react-query"],
      ["query", "queries", "react-query"]
    );
    this.addDependencyKeywords(
      ["swr"],
      ["swr", "hooks"]
    );
    this.addDependencyKeywords(
      ["apollo-client", "@apollo/client"],
      ["apollo", "graphql"]
    );

    // 日期处理
    this.addDependencyKeywords(
      ["date-fns", "dayjs", "moment", "luxon"],
      ["date", "dates", "time", "calendar"]
    );

    // 工具库
    this.addDependencyKeywords(
      ["lodash", "lodash-es"],
      ["lodash", "utils"]
    );
    this.addDependencyKeywords(
      ["ramda"],
      ["ramda", "utils"]
    );
  }

  /**
   * 添加依赖关键词
   */
  private addDependencyKeywords(
    dependencyNames: string[],
    keywords: string[]
  ): void {
    for (const depName of dependencyNames) {
      if (this.dependencyNames.has(depName.toLowerCase())) {
        if (!this.dependencyKeywords.has(depName)) {
          this.dependencyKeywords.set(depName, []);
        }
        this.dependencyKeywords.get(depName)!.push(...keywords);
      }
    }
  }

  /**
   * 检查目录是否与依赖相关（带文件内容确认）
   * v1.9: 提高匹配精度，只检查当前目录名，避免误匹配父级目录
   */
  async checkDependencyRelation(
    dirPath: string,
    files: string[],
    projectPath: string
  ): Promise<{
    isRelated: boolean;
    dependencyName?: string;
    purpose?: string;
  }> {
    const dirName = path.basename(dirPath).toLowerCase();

    // 检查目录名是否匹配依赖关键词（只检查当前目录名）
    for (const [depName, keywords] of this.dependencyKeywords) {
      for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase();
        
        // 精确匹配或连字符模式匹配
        if (
          dirName === keywordLower ||
          dirName === `${keywordLower}s` ||
          dirName.startsWith(`${keywordLower}-`) ||
          dirName.endsWith(`-${keywordLower}`) ||
          dirName.includes(`-${keywordLower}-`)
        ) {
          // 二次确认：检查目录内文件内容
          const confirmed = await this.confirmByFileContent(
            depName,
            files,
            projectPath
          );

          if (confirmed) {
            return {
              isRelated: true,
              dependencyName: depName,
              purpose: this.generateDependencyPurpose(depName, dirName),
            };
          }
        }
      }
    }

    // 检查目录名是否直接匹配依赖名
    for (const dep of this.dependencies) {
      const depNameLower = dep.name.toLowerCase();
      if (dirName === depNameLower || dirName.includes(depNameLower)) {
        // 也进行文件内容确认
        const confirmed = await this.confirmByFileContent(
          dep.name,
          files,
          projectPath
        );

        if (confirmed) {
          return {
            isRelated: true,
            dependencyName: dep.name,
            purpose: this.generateDependencyPurpose(dep.name, dirName),
          };
        }
      }
    }

    return { isRelated: false };
  }

  /**
   * 通过文件内容二次确认
   */
  private async confirmByFileContent(
    dependencyName: string,
    files: string[],
    projectPath: string
  ): Promise<boolean> {
    // 检查文件内容中是否包含依赖相关的导入或使用
    const sampleFiles = files.slice(0, 5); // 只检查前5个文件以提高性能

    for (const file of sampleFiles) {
      try {
        const content = await FileUtils.readFile(file);
        const depNameLower = dependencyName.toLowerCase();

        // 检查导入语句
        if (
          content.includes(`from '${dependencyName}'`) ||
          content.includes(`from "${dependencyName}"`) ||
          content.includes(`require('${dependencyName}')`) ||
          content.includes(`require("${dependencyName}")`) ||
          content.includes(`import.*${depNameLower}`) ||
          content.includes(`from.*${depNameLower}`)
        ) {
          return true;
        }
      } catch (error) {
        // 忽略读取失败的文件
        continue;
      }
    }

    return false;
  }

  /**
   * 生成依赖相关的目录职能名称
   */
  private generateDependencyPurpose(
    dependencyName: string,
    dirName: string
  ): string {
    // 提取依赖的显示名称
    const displayName = this.getDependencyDisplayName(dependencyName);

    // 根据目录名添加子模块信息
    if (dirName !== dependencyName.toLowerCase()) {
      // 目录名包含额外信息，如 "redux/features/user"
      const parts = dirName.split("/");
      if (parts.length > 1) {
        const subModule = parts[parts.length - 1];
        return `${displayName} 子模块（${subModule}）`;
      }
    }

    return displayName;
  }

  /**
   * 获取依赖的显示名称
   */
  private getDependencyDisplayName(dependencyName: string): string {
    const nameMap: Record<string, string> = {
      "i18next": "国际化（i18next）",
      "react-i18next": "国际化（react-i18next）",
      "next-i18next": "国际化（next-i18next）",
      "redux": "Redux 状态管理",
      "@reduxjs/toolkit": "Redux Toolkit",
      "react-redux": "Redux",
      "zustand": "Zustand 状态管理",
      "mobx": "MobX 状态管理",
      "recoil": "Recoil 状态管理",
      "jotai": "Jotai 状态管理",
      "@mui/material": "Material-UI",
      "antd": "Ant Design",
      "@chakra-ui/react": "Chakra UI",
      "tailwindcss": "Tailwind CSS",
      "next-auth": "NextAuth",
      "react-router": "React Router",
      "react-hook-form": "React Hook Form",
      "formik": "Formik",
      "jest": "Jest 测试",
      "eslint": "ESLint",
      "prettier": "Prettier",
      "react-query": "React Query",
      "@tanstack/react-query": "TanStack Query",
      "swr": "SWR",
      "apollo-client": "Apollo Client",
      "date-fns": "date-fns",
      "dayjs": "Day.js",
      "lodash": "Lodash",
    };

    return nameMap[dependencyName] || dependencyName;
  }
}

