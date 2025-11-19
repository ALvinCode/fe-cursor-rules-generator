import * as path from "path";
import { FileTypeCategory, FileTypeInfo } from "../types.js";
import { FileUtils } from "../utils/file-utils.js";
import { logger } from "../utils/logger.js";

/**
 * 按需 AST 分析工具
 * 仅在基本信息无法判断文件类型时使用
 * AST 分析结果仅作为分析过程的工具，不保留
 */
export class ASTAnalyzer {
  /**
   * 使用 AST 分析文件类型（按需调用）
   */
  async analyzeFileTypeWithAST(
    filePath: string,
    projectPath: string
  ): Promise<FileTypeInfo | null> {
    const extension = path.extname(filePath);
    const content = await FileUtils.readFile(filePath);

    // 只对 TypeScript/JavaScript 文件进行 AST 分析
    if (![".ts", ".tsx", ".js", ".jsx"].includes(extension)) {
      return null;
    }

    try {
      // 使用简单的正则和模式匹配（避免引入完整的 AST 解析器）
      // 如果需要更精确的分析，可以引入 @typescript-eslint/parser 等工具

      const indicators: string[] = [];
      let category: FileTypeCategory = "other";
      let confidence: "high" | "medium" | "low" = "medium";

      // 检查是否包含 React 组件特征
      if (this.isReactComponent(content)) {
        category = "component";
        confidence = "high";
        indicators.push("AST: 检测到 React 组件特征（JSX、函数组件、类组件）");
        return { category, confidence, indicators };
      }

      // 检查是否包含 Hook 特征
      if (this.isHook(content)) {
        category = "hook";
        confidence = "high";
        indicators.push("AST: 检测到 Hook 特征（useXxx 函数、Hook 规则）");
        return { category, confidence, indicators };
      }

      // 检查是否包含类型定义特征
      if (this.isTypeDefinition(content)) {
        category = "type";
        confidence = "high";
        indicators.push("AST: 检测到类型定义特征（interface、type、enum）");
        return { category, confidence, indicators };
      }

      // 检查是否包含服务/API 特征
      if (this.isService(content)) {
        category = "service";
        confidence = "high";
        indicators.push("AST: 检测到服务特征（API 调用、HTTP 请求）");
        return { category, confidence, indicators };
      }

      // 检查是否包含工具函数特征
      if (this.isUtility(content)) {
        category = "utility";
        confidence = "medium";
        indicators.push("AST: 检测到工具函数特征（纯函数、无副作用）");
        return { category, confidence, indicators };
      }

      // 检查是否包含页面特征
      if (this.isPage(content)) {
        category = "page";
        confidence = "high";
        indicators.push("AST: 检测到页面特征（路由导出、页面组件）");
        return { category, confidence, indicators };
      }

      return null;
    } catch (error) {
      logger.debug(`AST 分析失败: ${filePath}`, error);
      return null;
    }
  }

  /**
   * 检查是否为 React 组件
   */
  private isReactComponent(content: string): boolean {
    // 检查 JSX 语法
    if (content.includes("return (") && content.includes("<")) {
      return true;
    }

    // 检查函数组件模式
    if (
      content.match(/export\s+(?:default\s+)?(?:const|function)\s+\w+\s*=\s*\(/s) &&
      content.includes("return")
    ) {
      return true;
    }

    // 检查类组件模式
    if (
      content.includes("extends React.Component") ||
      content.includes("extends Component")
    ) {
      return true;
    }

    // 检查 React 导入
    if (content.includes("import") && content.includes("react")) {
      return true;
    }

    return false;
  }

  /**
   * 检查是否为 Hook
   */
  private isHook(content: string): boolean {
    // 检查 Hook 命名模式
    if (content.match(/export\s+(?:const|function)\s+use[A-Z]\w+\s*=/)) {
      return true;
    }

    // 检查是否使用其他 Hooks
    const hookPatterns = [
      /useState\s*\(/,
      /useEffect\s*\(/,
      /useCallback\s*\(/,
      /useMemo\s*\(/,
      /useRef\s*\(/,
      /useContext\s*\(/,
    ];

    let hookCount = 0;
    for (const pattern of hookPatterns) {
      if (pattern.test(content)) {
        hookCount++;
      }
    }

    // 如果使用了多个 Hooks，很可能是自定义 Hook
    return hookCount >= 2;
  }

  /**
   * 检查是否为类型定义
   */
  private isTypeDefinition(content: string): boolean {
    // 检查 interface
    if (content.match(/export\s+(?:interface|type)\s+\w+/)) {
      return true;
    }

    // 检查 type 别名
    if (content.match(/export\s+type\s+\w+\s*=/)) {
      return true;
    }

    // 检查 enum
    if (content.match(/export\s+enum\s+\w+/)) {
      return true;
    }

    // 检查是否主要是类型定义（interface/type 数量 > 函数数量）
    const interfaceCount = (content.match(/interface\s+\w+/g) || []).length;
    const typeCount = (content.match(/type\s+\w+\s*=/g) || []).length;
    const functionCount = (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length;

    return interfaceCount + typeCount > functionCount;
  }

  /**
   * 检查是否为服务/API
   */
  private isService(content: string): boolean {
    // 检查 API 调用模式
    const apiPatterns = [
      /fetch\s*\(/,
      /axios\.(get|post|put|delete)/,
      /\.get\s*\(/,
      /\.post\s*\(/,
      /api\./,
      /http\./,
    ];

    for (const pattern of apiPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }

    // 检查是否包含 API 端点
    if (content.match(/['"]\/api\//) || content.match(/['"]https?:\/\//)) {
      return true;
    }

    return false;
  }

  /**
   * 检查是否为工具函数
   */
  private isUtility(content: string): boolean {
    // 检查是否主要是纯函数（无副作用）
    // 简单启发式：没有 import、没有副作用操作

    // 如果包含很多函数导出，且没有 React、API 调用等
    const functionExports = (content.match(/export\s+(?:const|function)\s+\w+/g) || []).length;

    if (functionExports >= 3) {
      const hasReact = content.includes("react");
      const hasAPI = content.includes("fetch") || content.includes("axios");
      const hasState = content.includes("useState") || content.includes("useEffect");

      if (!hasReact && !hasAPI && !hasState) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查是否为页面
   */
  private isPage(content: string): boolean {
    // 检查 Next.js 页面特征
    if (
      content.includes("getServerSideProps") ||
      content.includes("getStaticProps") ||
      content.includes("getStaticPaths")
    ) {
      return true;
    }

    // 检查路由导出
    if (content.match(/export\s+(?:default\s+)?(?:const|function)\s+\w+\s*=\s*\(/)) {
      // 可能是页面组件
      if (content.includes("return") && content.includes("<")) {
        return true;
      }
    }

    return false;
  }
}

