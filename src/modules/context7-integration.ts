import { BestPractice, Dependency } from "../types.js";

/**
 * Context7 集成模块
 * 通过 MCP 协议调用 Context7 获取最佳实践文档
 * 
 * 注意：此模块假设 Context7 MCP Server 已在用户环境中配置
 * 如果未配置，将返回基础的最佳实践建议
 */
export class Context7Integration {
  /**
   * 获取主要依赖的最佳实践
   */
  async getBestPractices(dependencies: Dependency[]): Promise<BestPractice[]> {
    const practices: BestPractice[] = [];

    // 选择最重要的依赖（框架和主要库）
    const importantDeps = dependencies
      .filter((d) => d.category === "framework" || d.type === "dependency")
      .slice(0, 5);

    for (const dep of importantDeps) {
      try {
        const practice = await this.fetchBestPractice(dep);
        if (practice) {
          practices.push(practice);
        }
      } catch (error) {
        console.error(`获取 ${dep.name} 最佳实践失败:`, error);
        // 继续处理其他依赖
      }
    }

    // 如果无法获取 Context7 数据，返回基础最佳实践
    if (practices.length === 0) {
      practices.push(...this.getDefaultBestPractices(dependencies));
    }

    return practices;
  }

  /**
   * 从 Context7 获取单个依赖的最佳实践
   * 
   * 注意：这里的实现依赖于 Cursor 环境中 Context7 MCP Server 的可用性
   * 如果 Context7 未配置，此方法会失败并回退到默认最佳实践
   */
  private async fetchBestPractice(
    dep: Dependency
  ): Promise<BestPractice | null> {
    try {
      // 尝试通过 MCP 调用 Context7
      // 注意：在 MCP Server 中，无法直接调用其他 MCP Server
      // 这需要通过 Cursor 的 MCP 代理机制实现
      // 实际使用时，用户需要在 Cursor 中手动配置 Context7
      
      // 这里我们返回 null，表示需要回退到默认实践
      // 在实际生产环境中，可以考虑：
      // 1. 让用户在调用时提供 Context7 的文档内容
      // 2. 或者使用 HTTP 直接调用 Context7 API（如果可用）
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取默认的最佳实践建议
   */
  private getDefaultBestPractices(dependencies: Dependency[]): BestPractice[] {
    const practices: BestPractice[] = [];

    // React 最佳实践
    if (dependencies.some((d) => d.name === "react")) {
      practices.push({
        source: "React Official Docs",
        category: "component-structure",
        content: `# React 最佳实践

## 组件结构
- 使用函数组件和 Hooks 而非类组件
- 保持组件单一职责，复杂组件应拆分
- 使用 TypeScript 提供类型安全

## 状态管理
- 优先使用 useState 和 useReducer 处理本地状态
- 使用 Context API 或状态管理库处理全局状态
- 避免过度使用 useEffect，考虑使用 useMemo 和 useCallback

## 性能优化
- 使用 React.memo 避免不必要的重渲染
- 合理使用 useMemo 和 useCallback
- 使用 lazy 和 Suspense 实现代码分割

## 代码组织
- 按功能而非类型组织文件结构
- 使用绝对路径导入（配置 paths）
- 保持一致的命名规范`,
        priority: 10,
      });
    }

    // Next.js 最佳实践
    if (dependencies.some((d) => d.name.includes("next"))) {
      practices.push({
        source: "Next.js Official Docs",
        category: "framework",
        content: `# Next.js 最佳实践

## 路由和导航
- 使用 App Router（推荐）或 Pages Router
- 利用动态路由和路由组
- 使用 Link 组件进行客户端导航

## 数据获取
- Server Components 中直接获取数据
- 使用 Server Actions 处理表单和变更
- 考虑使用 SWR 或 React Query 处理客户端数据

## 性能优化
- 使用 Image 组件优化图片加载
- 配置适当的缓存策略
- 使用动态导入减少初始加载

## SEO
- 配置 metadata 和 generateMetadata
- 使用 sitemap.xml 和 robots.txt
- 实现结构化数据（JSON-LD）`,
        priority: 10,
      });
    }

    // TypeScript 最佳实践
    if (dependencies.some((d) => d.name === "typescript")) {
      practices.push({
        source: "TypeScript Handbook",
        category: "type-safety",
        content: `# TypeScript 最佳实践

## 类型定义
- 优先使用 interface 定义对象类型
- 使用 type 定义联合类型和工具类型
- 避免使用 any，使用 unknown 代替

## 类型推断
- 让 TypeScript 自动推断简单类型
- 显式标注函数返回类型
- 使用泛型提高代码复用性

## 严格模式
- 启用 strict 模式
- 处理 null 和 undefined
- 避免类型断言（as），使用类型守卫

## 项目配置
- 配置合理的 paths 别名
- 使用 @types 包获取类型定义
- 定期更新 TypeScript 版本`,
        priority: 9,
      });
    }

    // Vue 最佳实践
    if (dependencies.some((d) => d.name === "vue")) {
      practices.push({
        source: "Vue.js Official Docs",
        category: "component-structure",
        content: `# Vue 最佳实践

## 组件开发
- 使用 Composition API（Vue 3）
- 合理使用 ref 和 reactive
- 利用 computed 和 watch

## 组件通信
- Props down, Events up
- 使用 provide/inject 处理深层传递
- 考虑 Pinia 进行状态管理

## 性能优化
- 使用 v-memo 优化列表渲染
- 合理使用 v-once 和 v-memo
- 实现虚拟滚动处理大列表

## 代码规范
- 使用 <script setup> 语法
- 保持模板简洁，复杂逻辑抽取到 composables
- 使用 TypeScript 增强类型安全`,
        priority: 10,
      });
    }

    // Python 最佳实践
    if (dependencies.some((d) => d.name.includes("django") || d.name.includes("flask") || d.name.includes("fastapi"))) {
      practices.push({
        source: "Python Best Practices",
        category: "code-quality",
        content: `# Python 最佳实践

## 代码风格
- 遵循 PEP 8 规范
- 使用 Black 进行代码格式化
- 使用 pylint 或 flake8 进行代码检查

## 类型注解
- 使用 type hints 提供类型信息
- 使用 mypy 进行静态类型检查
- 为公共 API 提供完整的类型注解

## 项目结构
- 使用虚拟环境隔离依赖
- 保持模块职责单一
- 使用 requirements.txt 或 pyproject.toml 管理依赖

## 错误处理
- 使用具体的异常类型
- 避免捕获过于宽泛的异常
- 提供有意义的错误信息`,
        priority: 9,
      });
    }

    // 通用最佳实践
    practices.push({
      source: "General Best Practices",
      category: "code-quality",
      content: `# 通用开发最佳实践

## 代码质量
- 保持代码简洁和可读
- 遵循 DRY 原则（Don't Repeat Yourself）
- 编写自解释的代码，减少注释依赖

## 版本控制
- 编写清晰的 commit 信息
- 使用 feature branches 进行开发
- 定期进行 code review

## 测试
- 编写单元测试覆盖核心逻辑
- 使用集成测试验证模块交互
- 考虑 E2E 测试验证用户流程

## 文档
- 保持 README 更新
- 为公共 API 提供文档
- 使用注释解释复杂逻辑的"为什么"`,
      priority: 8,
    });

    return practices;
  }
}

