import {
  CursorRule,
  RuleGenerationContext,
  BestPractice,
  Module,
  CodeFeature,
} from "../types.js";

/**
 * 规则生成引擎
 * 结合项目特征和最佳实践，生成 Cursor Rules
 */
export class RulesGenerator {
  async generate(context: RuleGenerationContext): Promise<CursorRule[]> {
    const rules: CursorRule[] = [];

    // 生成全局规则
    const globalRule = this.generateGlobalRule(context);
    rules.push(globalRule);

    // 如果启用模块规则且项目有多个模块，生成模块特定规则
    if (context.includeModuleRules && context.modules.length > 1) {
      for (const module of context.modules) {
        const moduleRule = this.generateModuleRule(context, module);
        rules.push(moduleRule);
      }
    }

    return rules;
  }

  /**
   * 生成全局规则
   */
  private generateGlobalRule(context: RuleGenerationContext): CursorRule {
    const metadata = this.generateRuleMetadata(
      `${this.getProjectName(context.projectPath)} - 全局开发规则`,
      "基于项目实际情况和最佳实践自动生成的 Cursor Rules",
      100,
      context.techStack.primary,
      ["global", "best-practices"]
    );
    
    let content = metadata + `
# 项目概述

这是一个基于 ${context.techStack.primary.join(", ")} 的项目。

## 技术栈

**主要技术栈：**
${context.techStack.primary.map((tech) => `- ${tech}`).join("\n")}

**语言：** ${context.techStack.languages.join(", ")}

**包管理器：** ${context.techStack.packageManagers.join(", ")}

${context.techStack.frameworks.length > 0 ? `**框架：** ${context.techStack.frameworks.join(", ")}` : ""}

## 项目结构

${this.generateProjectStructureDescription(context)}

## 核心功能特征

${this.generateFeaturesDescription(context.codeFeatures)}

---

# 开发规范

${this.generateDevelopmentGuidelines(context)}

---

# 代码风格

${context.projectConfig ? this.generateConfigBasedStyleRules(context) : this.generateCodeStyleGuidelines(context)}

---

${context.customPatterns ? this.generateCustomToolsRules(context) : ""}

${context.customPatterns && context.customPatterns.customHooks.length > 0 ? "---\n\n" : ""}

# 最佳实践

${this.generateBestPracticesSection(context.bestPractices)}

---

# 文件组织

${context.fileOrganization ? this.generateStructureBasedFileOrgRules(context) : this.generateFileOrganizationGuidelines(context)}

---

# 注意事项

${this.generateCautions(context)}
`;

    return {
      scope: "global",
      modulePath: context.projectPath, // 全局规则放在项目根目录
      content,
      fileName: "00-global-rules.mdc",
      priority: 100,
    };
  }

  /**
   * 生成模块特定规则
   */
  private generateModuleRule(
    context: RuleGenerationContext,
    module: Module
  ): CursorRule {
    const tags = [module.type, "module"];
    const metadata = this.generateRuleMetadata(
      `${module.name} 模块规则`,
      module.description || module.name + " 模块的开发规则",
      50,
      context.techStack.primary,
      tags
    );
    
    const content = metadata + `
# ${module.name} 模块

**类型：** ${this.getModuleTypeName(module.type)}

**路径：** \`${module.path}\`

${module.description ? `**描述：** ${module.description}` : ""}

## 模块职责

${this.generateModuleResponsibilities(module)}

## 开发指南

${this.generateModuleGuidelines(context, module)}

## 依赖关系

${module.dependencies.length > 0 ? `此模块依赖以下包：
${module.dependencies.slice(0, 10).map((d) => `- ${d}`).join("\n")}
${module.dependencies.length > 10 ? `\n...以及其他 ${module.dependencies.length - 10} 个依赖` : ""}` : "此模块没有外部依赖。"}

## 注意事项

${this.generateModuleCautions(module)}
`;

    return {
      scope: "module",
      moduleName: module.name,
      modulePath: module.path, // 模块规则放在模块自己的目录
      content,
      fileName: `${this.sanitizeFileName(module.name)}-rules.mdc`,
      priority: 50,
    };
  }

  /**
   * 生成项目结构描述
   */
  private generateProjectStructureDescription(
    context: RuleGenerationContext
  ): string {
    if (context.modules.length <= 1) {
      return "这是一个单体应用项目。";
    }

    const modulesByType = new Map<string, Module[]>();
    for (const module of context.modules) {
      if (!modulesByType.has(module.type)) {
        modulesByType.set(module.type, []);
      }
      modulesByType.get(module.type)!.push(module);
    }

    let desc = `这是一个${context.modules.length > 5 ? "大型" : ""}多模块项目，包含以下模块：\n\n`;

    for (const [type, modules] of modulesByType) {
      desc += `**${this.getModuleTypeName(type)}模块：**\n`;
      desc += modules.map((m) => `- ${m.name}`).join("\n") + "\n\n";
    }

    return desc;
  }

  /**
   * 生成功能特征描述
   */
  private generateFeaturesDescription(
    features: Record<string, CodeFeature>
  ): string {
    const entries = Object.values(features);
    if (entries.length === 0) {
      return "项目功能特征分析中...";
    }

    return entries
      .map(
        (f) => `### ${f.description}

- **类型：** ${f.type}
- **使用频率：** ${f.frequency} 处
${f.examples.length > 0 ? `- **示例：** ${f.examples.slice(0, 3).join(", ")}` : ""}
`
      )
      .join("\n");
  }

  /**
   * 生成开发指南
   */
  private generateDevelopmentGuidelines(context: RuleGenerationContext): string {
    let guidelines = "";

    // 根据技术栈生成指南
    const { primary, languages } = context.techStack;

    if (languages.includes("TypeScript")) {
      guidelines += `## TypeScript 使用

- 优先使用 TypeScript 编写新代码
- 为所有公共 API 提供完整的类型定义
- 启用严格模式 (\`strict: true\`)
- 避免使用 \`any\`，使用 \`unknown\` 或具体类型

`;
    }

    if (primary.some((p) => p.toLowerCase().includes("react"))) {
      guidelines += `## React 开发

- 使用函数组件和 Hooks，避免类组件
- 遵循组件单一职责原则
- 使用 PropTypes 或 TypeScript 进行类型检查
- 合理使用 \`useMemo\` 和 \`useCallback\` 优化性能

`;
    }

    if (primary.some((p) => p.toLowerCase().includes("next"))) {
      guidelines += `## Next.js 规范

- 优先使用 App Router（如果项目使用）
- Server Components 中进行数据获取
- 使用 \`next/image\` 优化图片
- 配置适当的元数据以改善 SEO

`;
    }

    if (primary.some((p) => p.toLowerCase().includes("vue"))) {
      guidelines += `## Vue 开发

- 使用 Composition API（Vue 3）
- 保持组件模板简洁
- 复杂逻辑抽取到 composables
- 使用 TypeScript 增强类型安全

`;
    }

    if (languages.includes("Python")) {
      guidelines += `## Python 开发

- 遵循 PEP 8 代码风格
- 使用类型注解（Type Hints）
- 编写 docstrings 文档
- 使用虚拟环境管理依赖

`;
    }

    // 添加错误处理指南（使用基于项目实践的版本）
    guidelines += context.projectPractice 
      ? this.generatePracticeBasedErrorHandling(context)
      : this.generateErrorHandlingGuidelines(context);

    // 添加测试相关指南（按需生成）
    guidelines += this.generateConditionalTestingRules(context);

    // 添加 UI/UX 规范（前端项目）
    if (this.isFrontendProject(context)) {
      guidelines += this.generateUIUXGuidelines(context);
    }

    // 添加 API 相关指南
    if (context.codeFeatures["api-routes"]) {
      guidelines += `## API 开发

- 使用 RESTful 设计原则
- 提供适当的错误处理和状态码
- 为 API 编写文档（OpenAPI/Swagger）
- 实施适当的认证和授权

`;
    }

    return guidelines || "遵循项目现有代码风格和约定。";
  }

  /**
   * 判断是否为前端项目
   */
  private isFrontendProject(context: RuleGenerationContext): boolean {
    const frontendFrameworks = ["React", "Vue", "Angular", "Svelte", "Next.js", "Nuxt"];
    return context.techStack.frameworks.some(f => frontendFrameworks.includes(f));
  }

  /**
   * 生成 UI/UX 规范
   */
  private generateUIUXGuidelines(context: RuleGenerationContext): string {
    return `## UI/UX 设计规范

### 视觉层次

**建立清晰的视觉层次以引导用户注意力**：

- **大小和比例**：重要元素使用更大的尺寸
- **颜色对比**：使用颜色突出关键信息和行动号召
- **间距**：使用空白空间分隔不同的内容区域
- **字体层次**：标题、副标题、正文使用不同的字体大小和粗细

示例：
\`\`\`tsx
// ✅ 清晰的视觉层次
<div className="card">
  <h1 className="text-3xl font-bold">主标题</h1>
  <h2 className="text-xl text-gray-600 mt-2">副标题</h2>
  <p className="text-base mt-4">正文内容...</p>
  <button className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg">
    主要操作
  </button>
</div>
\`\`\`

### 设计一致性

**在整个应用中保持一致的设计风格**：

- **颜色系统**：定义主色、辅助色、中性色调色板
- **间距系统**：使用统一的间距尺度（4px、8px、16px、24px、32px）
- **字体系统**：限制字体大小的数量（通常 5-7 个级别）
- **组件样式**：按钮、输入框、卡片等保持一致的外观

\`\`\`typescript
// ✅ 使用设计令牌（Design Tokens）
const theme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#10B981',
    danger: '#EF4444',
    neutral: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      // ...
    }
  },
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  }
};
\`\`\`

### 导航模式

**创建直观的导航，减少用户认知负担**：

- **清晰的主导航**：主要功能易于发现
- **面包屑导航**：帮助用户了解当前位置
- **搜索功能**：对于内容丰富的应用提供搜索
- **一致的位置**：导航元素放在用户预期的位置

\`\`\`tsx
// ✅ 清晰的导航结构
<nav>
  <div className="logo">应用名称</div>
  <ul className="nav-items">
    <li><Link to="/">首页</Link></li>
    <li><Link to="/products">产品</Link></li>
    <li><Link to="/about">关于</Link></li>
  </ul>
  <div className="user-menu">
    <button>用户菜单</button>
  </div>
</nav>

{/* 面包屑 */}
<div className="breadcrumb">
  首页 / 产品 / 详情
</div>
\`\`\`

### 响应式设计

**确保应用在不同设备上都能良好展示**：

- **移动优先**：从小屏幕开始设计，逐步增强
- **断点**：使用标准断点（sm: 640px, md: 768px, lg: 1024px, xl: 1280px）
- **弹性布局**：使用 Flexbox 和 Grid 创建灵活的布局
- **触摸友好**：移动端按钮至少 44x44px

\`\`\`tsx
// ✅ 响应式组件
<div className="
  grid 
  grid-cols-1 
  md:grid-cols-2 
  lg:grid-cols-3 
  gap-4 
  md:gap-6
">
  {items.map(item => (
    <Card key={item.id} {...item} />
  ))}
</div>
\`\`\`

### 无障碍访问（WCAG）

**遵循 WCAG 2.1 AA 级标准，确保所有用户都能访问**：

**1. 可感知性（Perceivable）**：
- **文本替代**：为图片提供 alt 文本
- **颜色对比**：文本与背景的对比度至少 4.5:1（大文本 3:1）
- **可调整文本**：支持文本缩放至 200%

\`\`\`tsx
// ✅ 提供 alt 文本
<img src="profile.jpg" alt="用户头像：张三" />

// ✅ 足够的颜色对比
<button className="bg-blue-600 text-white"> {/* 对比度 > 4.5:1 */}
  提交
</button>

// ❌ 仅依赖颜色传达信息
<span className="text-red-500">错误</span>  {/* 缺少图标或文字说明 */}

// ✅ 同时使用颜色和图标
<span className="text-red-500">
  <AlertIcon /> 错误：请填写必填字段
</span>
\`\`\`

**2. 可操作性（Operable）**：
- **键盘导航**：所有功能都可以通过键盘访问
- **焦点可见**：清晰的焦点指示器
- **足够的时间**：不要使用自动消失的内容（或提供控制）

\`\`\`tsx
// ✅ 键盘可访问的下拉菜单
<button 
  onClick={toggleMenu}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      toggleMenu();
    }
  }}
  aria-expanded={isOpen}
  aria-haspopup="true"
>
  菜单
</button>

// ✅ 清晰的焦点样式
<style>
  button:focus-visible {
    outline: 2px solid #3B82F6;
    outline-offset: 2px;
  }
</style>
\`\`\`

**3. 可理解性（Understandable）**：
- **语义化 HTML**：使用正确的 HTML 元素
- **标签和说明**：为表单控件提供标签
- **错误建议**：提供具体的错误修复建议

\`\`\`tsx
// ✅ 语义化和可访问的表单
<form>
  <label htmlFor="email">
    电子邮箱
    <span aria-label="必填">*</span>
  </label>
  <input
    id="email"
    type="email"
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby={hasError ? "email-error" : undefined}
  />
  {hasError && (
    <div id="email-error" role="alert">
      请输入有效的电子邮箱地址，例如：user@example.com
    </div>
  )}
</form>
\`\`\`

**4. 鲁棒性（Robust）**：
- **ARIA 属性**：适当使用 ARIA 增强可访问性
- **兼容辅助技术**：确保与屏幕阅读器等工具兼容

\`\`\`tsx
// ✅ 使用 ARIA 增强自定义组件
<div
  role="tablist"
  aria-label="设置选项卡"
>
  <button
    role="tab"
    aria-selected={activeTab === 'general'}
    aria-controls="general-panel"
    id="general-tab"
  >
    常规
  </button>
  <button
    role="tab"
    aria-selected={activeTab === 'privacy'}
    aria-controls="privacy-panel"
    id="privacy-tab"
  >
    隐私
  </button>
</div>

<div
  role="tabpanel"
  id="general-panel"
  aria-labelledby="general-tab"
  hidden={activeTab !== 'general'}
>
  {/* 内容 */}
</div>
\`\`\`

### 性能和用户体验

- **加载反馈**：提供加载指示器
- **骨架屏**：在内容加载时显示内容结构
- **优化图片**：使用适当的格式和尺寸
- **渐进增强**：基础功能在所有环境下可用

\`\`\`tsx
// ✅ 提供加载状态
{isLoading ? (
  <div className="skeleton">
    <div className="skeleton-line" />
    <div className="skeleton-line" />
  </div>
) : (
  <div className="content">{data}</div>
)}

// ✅ 图片优化（Next.js 示例）
<Image
  src="/hero.jpg"
  alt="英雄图片"
  width={1200}
  height={600}
  priority
  sizes="(max-width: 768px) 100vw, 1200px"
/>
\`\`\`

### UI 组件最佳实践

**按钮**：
- 主要操作使用明显的样式
- 次要操作使用较弱的视觉权重
- 危险操作使用红色/警告色
- 最小触摸目标 44x44px

**表单**：
- 清晰的标签和占位符
- 实时验证反馈
- 明确的错误消息
- 自动聚焦第一个字段

**模态框/对话框**：
- 提供关闭方式
- ESC 键可关闭
- 焦点陷阱（不能 Tab 到外部）
- 返回后恢复焦点

`;
  }

  /**
   * 生成代码风格指南
   */
  private generateCodeStyleGuidelines(context: RuleGenerationContext): string {
    let style = `## 通用规范

- 使用有意义的变量和函数名
- 保持函数简短，单一职责
- 添加必要的注释，解释"为什么"而非"是什么"
- 保持代码格式一致

`;

    // 根据语言添加特定风格
    if (context.techStack.languages.includes("JavaScript") ||
        context.techStack.languages.includes("TypeScript")) {
      style += this.generateJavaScriptStyleGuide(context);
    }

    if (context.techStack.languages.includes("Python")) {
      style += this.generatePythonStyleGuide();
    }

    // 添加格式化和命名约定
    style += this.generateFormattingRules(context);
    style += this.generateNamingConventions(context);

    return style;
  }

  /**
   * 生成 JavaScript/TypeScript 风格指南
   */
  private generateJavaScriptStyleGuide(context: RuleGenerationContext): string {
    const isTypeScript = context.techStack.languages.includes("TypeScript");
    
    return `## JavaScript/TypeScript 代码风格

### 基本规范
- 使用 \`const\` 和 \`let\`，避免 \`var\`
- 优先使用箭头函数
- 使用模板字符串而非字符串拼接
- 使用解构赋值简化代码
- 使用 async/await 处理异步操作

### 格式化规则
- **字符串**：优先使用单引号 \`'string'\`，除非需要插值则使用反引号 \`\\\`template\\\`\`
- **分号**：保持一致（推荐使用分号）
- **行长度**：限制每行最多 100 个字符
- **缩进**：使用 2 个空格（或根据项目配置）
- **尾随逗号**：多行对象/数组最后一项添加逗号

### 代码组织
- **导入顺序**：
  1. 外部库导入
  2. 内部模块导入
  3. 相对路径导入
  ${isTypeScript ? "4. 类型导入（使用 \`import type\`）" : ""}
- **导出**：优先使用命名导出，避免默认导出（提高可维护性）

${isTypeScript ? `### TypeScript 特定规范
- 优先使用 \`interface\` 定义对象类型
- 使用 \`type\` 定义联合类型和工具类型
- 避免使用 \`any\`，使用 \`unknown\` 代替
- 为函数参数和返回值显式添加类型
- 使用严格模式（\`strict: true\`）
- 使用类型守卫而非类型断言
` : ""}
`;
  }

  /**
   * 生成 Python 风格指南
   */
  private generatePythonStyleGuide(): string {
    return `## Python 代码风格

### PEP 8 规范
- **缩进**：使用 4 个空格
- **行长度**：限制每行最多 79 个字符（文档字符串/注释 72 个字符）
- **空行**：
  - 顶级函数和类定义之间空 2 行
  - 类内方法之间空 1 行
- **字符串引号**：保持一致（推荐单引号）

### 命名规范
- **函数/变量**：snake_case (例如：\`get_user_data\`)
- **类名**：PascalCase (例如：\`UserProfile\`)
- **常量**：UPPER_CASE (例如：\`MAX_RETRY_COUNT\`)
- **私有属性**：单下划线前缀 (例如：\`_internal_method\`)
- **特殊方法**：双下划线前后 (例如：\`__init__\`)

### 导入规范
- **导入顺序**：
  1. 标准库导入
  2. 第三方库导入
  3. 本地应用/库导入
- 每组之间空一行
- 避免通配符导入 (\`from module import *\`)

### 类型注解
- 为函数参数添加类型注解
- 为函数返回值添加类型注解
- 使用 \`typing\` 模块的类型（List, Dict, Optional 等）
- 使用 \`mypy\` 进行静态类型检查

`;
  }

  /**
   * 生成格式化规则
   */
  private generateFormattingRules(context: RuleGenerationContext): string {
    return `## 代码格式化

### 空格和缩进
- 运算符两侧添加空格：\`a + b\` 而非 \`a+b\`
- 逗号后添加空格：\`[1, 2, 3]\` 而非 \`[1,2,3]\`
- 关键字后添加空格：\`if (condition)\` 而非 \`if(condition)\`
- 不要在括号内侧添加空格：\`func(a, b)\` 而非 \`func( a, b )\`

### 代码块
- 始终使用花括号，即使只有一行代码
- \`else\` 语句与关闭花括号在同一行（JavaScript/TypeScript）
- 花括号的左括号不换行（K&R 风格）

### 注释规范
- 单行注释使用 \`//\`（JavaScript/TypeScript）或 \`#\`（Python）
- 多行注释使用 \`/* */\`（JavaScript/TypeScript）或 \`"""\`（Python）
- 注释应该解释"为什么"而不是"是什么"
- 保持注释与代码同步更新

`;
  }

  /**
   * 生成命名约定
   */
  private generateNamingConventions(context: RuleGenerationContext): string {
    return `## 命名约定

### 通用规则
- **组件/类/接口**：PascalCase
  - 示例：\`UserProfile\`, \`DataService\`, \`IUserRepository\`
- **变量/函数/方法**：camelCase
  - 示例：\`userName\`, \`getUserData()\`, \`handleClick()\`
- **常量**：UPPER_CASE
  - 示例：\`MAX_RETRY_COUNT\`, \`API_BASE_URL\`, \`DEFAULT_TIMEOUT\`
- **私有属性**：前缀 \`_\`（约定）或使用 \`#\`（JavaScript 私有字段）
  - 示例：\`_privateMethod\`, \`#privateField\`

### 文件命名
${this.generateFileNamingRules(context)}

### 特定场景
- **布尔变量**：使用 \`is\`、\`has\`、\`should\` 前缀
  - 示例：\`isActive\`, \`hasPermission\`, \`shouldUpdate\`
- **事件处理器**：使用 \`handle\` 或 \`on\` 前缀
  - 示例：\`handleClick\`, \`onSubmit\`, \`handleUserLogin\`
- **获取器/设置器**：使用 \`get\`/\`set\` 前缀
  - 示例：\`getUser\`, \`setUser\`, \`getUserName\`

### 避免的命名
- ❌ 单字母变量（除了循环计数器 \`i\`, \`j\`, \`k\`）
- ❌ 缩写和简写（除非是广为人知的，如 \`URL\`, \`HTTP\`）
- ❌ 匈牙利命名法（如 \`strName\`, \`intCount\`）
- ❌ 无意义的名称（如 \`data\`, \`temp\`, \`foo\`, \`bar\`）

`;
  }

  /**
   * 生成错误处理指南
   */
  private generateErrorHandlingGuidelines(context: RuleGenerationContext): string {
    const isJavaScript = context.techStack.languages.includes("JavaScript") || 
                        context.techStack.languages.includes("TypeScript");
    const isPython = context.techStack.languages.includes("Python");
    
    let guidelines = `## 错误处理规范

### 基本原则
- 预测可能的错误并主动处理
- 提供有意义的错误信息
- 区分可恢复和不可恢复的错误
- 记录错误以便调试

`;

    if (isJavaScript) {
      guidelines += `### JavaScript/TypeScript 错误处理

**Try-Catch 使用**：
\`\`\`typescript
// ✅ 好的实践
try {
  const data = await fetchUserData(userId);
  return processData(data);
} catch (error) {
  if (error instanceof NetworkError) {
    logger.error('Network error:', error);
    throw new UserFacingError('无法连接到服务器，请稍后重试');
  }
  throw error; // 重新抛出未知错误
}

// ❌ 避免
try {
  // ... 大量代码
} catch (e) {
  console.log(e); // 不够具体
}
\`\`\`

**Promise 错误处理**：
\`\`\`typescript
// ✅ 使用 async/await 和 try-catch
async function getData() {
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    handleError(error);
  }
}

// ✅ 或使用 .catch()
apiCall()
  .then(result => processResult(result))
  .catch(error => handleError(error));
\`\`\`

**自定义错误类型**：
\`\`\`typescript
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(resource: string) {
    super(\\\`\${resource} not found\\\`);
    this.name = 'NotFoundError';
  }
}
\`\`\`

`;
    }

    if (isPython) {
      guidelines += `### Python 错误处理

**异常处理**：
\`\`\`python
# ✅ 好的实践
try:
    user = get_user(user_id)
    process_user(user)
except UserNotFoundError as e:
    logger.error(f"User not found: {user_id}")
    raise HTTPException(status_code=404, detail=str(e))
except DatabaseError as e:
    logger.exception("Database error occurred")
    raise HTTPException(status_code=500, detail="Internal server error")
finally:
    cleanup_resources()

# ❌ 避免
try:
    do_something()
except Exception:  # 过于宽泛
    pass  # 静默失败
\`\`\`

**自定义异常**：
\`\`\`python
class ValidationError(Exception):
    """数据验证错误"""
    pass

class ResourceNotFoundError(Exception):
    """资源未找到错误"""
    def __init__(self, resource_type: str, resource_id: str):
        self.resource_type = resource_type
        self.resource_id = resource_id
        super().__init__(f"{resource_type} {resource_id} not found")
\`\`\`

`;
    }

    guidelines += `### 错误日志记录
- 使用适当的日志级别（ERROR, WARN, INFO, DEBUG）
- 包含上下文信息（用户 ID、请求 ID 等）
- 不要记录敏感信息（密码、令牌等）
- 记录错误堆栈跟踪以便调试

### 用户友好的错误消息
- ✅ "无法保存您的更改，请检查网络连接后重试"
- ❌ "Error: ERR_CONNECTION_REFUSED at line 42"

`;

    return guidelines;
  }

  /**
   * 生成测试指南
   */
  private generateTestingGuidelines(context: RuleGenerationContext): string {
    const testLibs = context.codeFeatures["testing"]?.examples || [];
    
    return `## 测试规范

### 测试原则
- **独立性**：每个测试应该独立运行，不依赖其他测试
- **可重复性**：测试结果应该是确定的，不受运行顺序影响
- **快速执行**：单元测试应该快速完成
- **清晰性**：测试应该清楚地表达意图

### 测试组织
- **文件位置**：测试文件与源文件放在相同目录
- **命名规范**：
  - 测试文件：\`ComponentName.test.ts\` 或 \`ComponentName.spec.ts\`
  - 测试描述：使用清晰的描述性名称

### 测试结构（AAA 模式）

\`\`\`typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      // Arrange - 准备测试数据和环境
      const userData = { name: 'John', email: 'john@example.com' };
      const mockRepository = createMockRepository();
      
      // Act - 执行被测试的操作
      const result = await userService.createUser(userData);
      
      // Assert - 验证结果
      expect(result).toBeDefined();
      expect(result.name).toBe('John');
      expect(mockRepository.save).toHaveBeenCalledWith(userData);
    });
    
    it('should throw ValidationError for invalid email', async () => {
      // Arrange
      const invalidData = { name: 'John', email: 'invalid-email' };
      
      // Act & Assert
      await expect(userService.createUser(invalidData))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
\`\`\`

### 测试覆盖率
- **目标**：核心业务逻辑达到 80%+ 覆盖率
- **优先级**：
  1. 关键业务逻辑
  2. 边界情况和错误处理
  3. 复杂的算法和数据转换
- **不需要测试**：
  - 简单的 getter/setter
  - 第三方库的功能
  - 纯 UI 布局（可以用 E2E 测试）

### Mock 和 Stub
- 使用 Mock 隔离外部依赖
- 不要过度 Mock，保持测试有意义
- 为 API 调用、数据库操作等 I/O 创建 Mock

\`\`\`typescript
// ✅ 好的 Mock 使用
const mockApiClient = {
  fetchUser: jest.fn().mockResolvedValue({ id: 1, name: 'John' })
};

// ❌ 过度 Mock
const mockEverything = jest.fn(() => jest.fn(() => jest.fn()));
\`\`\`

### 测试类型
- **单元测试**：测试单个函数或类的行为
- **集成测试**：测试多个模块的协作
- **E2E 测试**：测试完整的用户流程

### 最佳实践
- 一个测试只验证一个行为
- 使用有意义的断言消息
- 测试失败时应该清楚地指出问题所在
- 定期运行测试，不要让测试过时
- 失败的测试应该立即修复

`;
  }

  /**
   * 生成文件命名规则
   */
  private generateFileNamingRules(context: RuleGenerationContext): string {
    const hasReact = context.techStack.frameworks.includes("React");
    const hasVue = context.techStack.frameworks.includes("Vue");
    
    let rules = "";
    
    if (hasReact) {
      rules += `- **React 组件**：PascalCase.tsx/jsx
  - 示例：\`UserProfile.tsx\`, \`Button.tsx\`
`;
    }
    
    if (hasVue) {
      rules += `- **Vue 组件**：PascalCase.vue 或 kebab-case.vue
  - 示例：\`UserProfile.vue\` 或 \`user-profile.vue\`
`;
    }
    
    rules += `- **工具/辅助文件**：camelCase 或 kebab-case
  - 示例：\`formatDate.ts\`, \`api-client.ts\`
- **类型定义文件**：types.ts 或 interfaces.ts
- **测试文件**：与源文件同名 + \`.test\` 或 \`.spec\`
  - 示例：\`UserProfile.test.tsx\`, \`utils.spec.ts\`
`;
    
    return rules;
  }

  /**
   * 生成最佳实践部分
   */
  private generateBestPracticesSection(practices: BestPractice[]): string {
    if (practices.length === 0) {
      return "请参考官方文档获取最佳实践建议。";
    }

    // 按优先级排序
    const sorted = practices.sort((a, b) => b.priority - a.priority);

    return sorted
      .map(
        (p) => `## ${p.category}

${p.content}

*来源：${p.source}*
`
      )
      .join("\n---\n\n");
  }

  /**
   * 生成文件组织指南
   */
  private generateFileOrganizationGuidelines(
    context: RuleGenerationContext
  ): string {
    let org = `## 基本原则

- 按功能模块组织文件，而非按文件类型
- 相关文件放在一起
- 保持目录结构扁平，避免过深嵌套
- 使用清晰的命名约定

`;

    if (context.codeFeatures["custom-components"]) {
      org += `## 组件组织

- 每个组件一个文件夹
- 组件文件、样式、测试放在同一目录
- 导出通过 index 文件统一管理

\`\`\`
components/
  Button/
    Button.tsx
    Button.module.css
    Button.test.tsx
    index.ts
\`\`\`

`;
    }

    if (context.codeFeatures["api-routes"]) {
      org += `## API 路由组织

- 路由文件按功能模块分组
- 每个路由文件处理相关的 endpoints
- 控制器和服务分离

`;
    }

    return org;
  }

  /**
   * 生成注意事项
   */
  private generateCautions(context: RuleGenerationContext): string {
    const cautions: string[] = [];

    cautions.push("- 提交前运行测试确保代码质量");
    cautions.push("- 遵循项目现有的代码风格和约定");
    cautions.push("- 更新代码时同步更新相关文档");

    if (context.techStack.languages.includes("TypeScript")) {
      cautions.push("- 避免使用类型断言（as），除非绝对必要");
      cautions.push("- 不要禁用 TypeScript 检查（@ts-ignore）");
    }

    if (context.codeFeatures["database"]) {
      cautions.push("- 数据库迁移需要仔细测试");
      cautions.push("- 避免在代码中硬编码数据库凭证");
    }

    if (context.codeFeatures["api-routes"]) {
      cautions.push("- API 变更需要考虑向后兼容性");
      cautions.push("- 敏感数据不要记录到日志");
    }

    return cautions.map((c) => c).join("\n");
  }

  /**
   * 生成模块职责说明
   */
  private generateModuleResponsibilities(module: Module): string {
    const typeDescriptions: Record<string, string> = {
      frontend: "负责用户界面展示和交互逻辑",
      backend: "负责业务逻辑处理和数据管理",
      shared: "提供跨模块共享的工具和类型定义",
      service: "提供特定领域的服务功能",
      package: "作为独立包提供特定功能",
      other: "提供项目所需的功能",
    };

    return typeDescriptions[module.type] || "提供项目所需的功能";
  }

  /**
   * 生成模块开发指南
   */
  private generateModuleGuidelines(
    context: RuleGenerationContext,
    module: Module
  ): string {
    let guidelines = "";

    if (module.type === "frontend") {
      guidelines = `- 保持组件可复用性和可测试性
- 使用统一的状态管理方案
- 优化性能，避免不必要的重渲染
- 确保响应式设计适配不同设备`;
    } else if (module.type === "backend") {
      guidelines = `- 实施适当的错误处理机制
- 提供完整的 API 文档
- 确保数据验证和安全性
- 实现日志记录便于调试`;
    } else if (module.type === "shared") {
      guidelines = `- 保持代码通用性，避免特定业务逻辑
- 提供完整的类型定义和文档
- 确保向后兼容性
- 编写充分的单元测试`;
    } else {
      guidelines = `- 遵循单一职责原则
- 提供清晰的接口定义
- 编写必要的文档和示例
- 确保代码质量和测试覆盖`;
    }

    return guidelines;
  }

  /**
   * 生成模块注意事项
   */
  private generateModuleCautions(module: Module): string {
    const cautions: string[] = [];

    if (module.type === "shared") {
      cautions.push("- 修改共享模块时需考虑对其他模块的影响");
      cautions.push("- 避免添加特定业务逻辑");
    }

    if (module.type === "backend") {
      cautions.push("- 注意 API 的向后兼容性");
      cautions.push("- 确保敏感数据安全");
    }

    if (module.type === "frontend") {
      cautions.push("- 注意浏览器兼容性");
      cautions.push("- 优化打包体积");
    }

    cautions.push("- 遵循模块的设计原则和约定");

    return cautions.map((c) => c).join("\n");
  }

  /**
   * 生成规则摘要
   */
  generateSummary(rules: CursorRule[], projectPath: string): string {
    const globalRules = rules.filter((r) => r.scope === "global");
    const moduleRules = rules.filter((r) => r.scope === "module");

    let summary = `生成了 ${rules.length} 个规则文件：\n\n`;

    if (globalRules.length > 0) {
      summary += `**全局规则（项目根目录）：**\n`;
      summary += globalRules.map((r) => `  - .cursor/rules/${r.fileName}`).join("\n");
      summary += "\n\n";
    }

    if (moduleRules.length > 0) {
      summary += `**模块规则（按模块目录）：**\n`;
      summary += moduleRules.map((r) => {
        const path = require("path");
        const relativePath = r.modulePath ? path.relative(projectPath, r.modulePath) : r.moduleName;
        return `  - ${relativePath}/.cursor/rules/${r.fileName} (${r.moduleName})`;
      }).join("\n");
    }

    return summary;
  }

  /**
   * 生成规则元数据
   */
  private generateRuleMetadata(
    title: string,
    description: string,
    priority: number,
    techStack: string[],
    tags: string[]
  ): string {
    const now = new Date();
    const version = "1.2.0"; // 版本号，后续可以从配置读取
    
    return `---
title: ${title}
description: ${description}
priority: ${priority}
version: ${version}
generatedAt: ${now.toISOString().split('T')[0]}
techStack: ${JSON.stringify(techStack)}
generator: cursor-rules-generator
tags: ${JSON.stringify(tags)}
---

`;
  }

  /**
   * 获取项目名称
   */
  private getProjectName(projectPath: string): string {
    const path = require("path");
    return path.basename(projectPath);
  }

  /**
   * 获取模块类型名称
   */
  private getModuleTypeName(type: string): string {
    const names: Record<string, string> = {
      frontend: "前端",
      backend: "后端",
      shared: "共享",
      service: "服务",
      package: "包",
      other: "其他",
    };
    return names[type] || type;
  }

  /**
   * 清理文件名
   */
  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * 生成基于项目配置的代码风格规则（v1.2）
   */
  generateConfigBasedStyleRules(context: RuleGenerationContext): string {
    if (!context.projectConfig) {
      return this.generateCodeStyleGuidelines(context);
    }

    let rules = `## 代码风格（基于项目配置）\n\n`;

    // 使用项目实际配置
    if (context.projectConfig.prettier) {
      const p = context.projectConfig.prettier;
      rules += `### 项目配置 (Prettier)\n\n`;
      rules += `项目使用 Prettier 进行代码格式化，配置如下：\n\n`;
      rules += `- **缩进**: ${p.useTabs ? "Tab" : `${p.tabWidth || 2} 个空格`}\n`;
      rules += `- **引号**: ${p.singleQuote ? "单引号" : "双引号"}\n`;
      rules += `- **分号**: ${p.semi ? "使用分号" : "不使用分号"}\n`;
      rules += `- **行长度**: ${p.printWidth || 80} 字符\n`;
      rules += `- **尾随逗号**: ${p.trailingComma || "none"}\n\n`;
      rules += `⚠️ **重要**: 这些是项目的实际配置，生成代码时会自动应用。\n`;
      rules += `请确保编辑器已配置 Prettier 自动格式化。\n\n`;
    } else if (context.projectPractice?.codeStyle) {
      // 使用分析出的代码风格
      const style = context.projectPractice.codeStyle;
      rules += `### 项目当前实践（分析得出）\n\n`;
      rules += `通过分析项目代码，发现以下风格模式：\n\n`;
      rules += `- **变量声明**: 主要使用 ${style.variableDeclaration === "const-let" ? "const/let" : "var"}\n`;
      rules += `- **函数风格**: ${style.functionStyle === "arrow" ? "箭头函数" : "function 声明"}\n`;
      rules += `- **字符串引号**: ${style.stringQuote === "single" ? "单引号" : style.stringQuote === "double" ? "双引号" : "混合"}\n`;
      rules += `- **分号**: ${style.semicolon === "always" ? "使用" : style.semicolon === "never" ? "不使用" : "混合"}\n\n`;
      rules += `### 建议\n`;
      rules += `✅ **短期**: 保持与现有代码一致的风格\n`;
      if (style.variableDeclaration === "var") {
        rules += `💡 **长期**: 考虑逐步迁移到 const/let 以提高代码质量\n`;
      }
      if (style.stringQuote === "mixed") {
        rules += `💡 **长期**: 建议统一使用单引号或配置 Prettier\n`;
      }
      rules += `\n`;
    }

    // 添加路径别名信息
    if (context.projectConfig?.pathAliases && Object.keys(context.projectConfig.pathAliases).length > 0) {
      rules += `### 路径别名（必须使用）\n\n`;
      rules += `项目配置了以下路径别名，生成代码时必须使用：\n\n`;
      for (const [alias, target] of Object.entries(context.projectConfig.pathAliases)) {
        rules += `- \`${alias}\` → \`${target}\`\n`;
      }
      rules += `\n示例：\n`;
      rules += `\`\`\`typescript\n`;
      const firstAlias = Object.keys(context.projectConfig.pathAliases)[0];
      rules += `// ✅ 正确 - 使用路径别名\n`;
      rules += `import { Component } from '${firstAlias}/Component';\n\n`;
      rules += `// ❌ 错误 - 不要使用相对路径\n`;
      rules += `import { Component } from '../../../Component';\n`;
      rules += `\`\`\`\n\n`;
    }

    return rules;
  }

  /**
   * 生成基于项目实践的错误处理规则（v1.2 - 三段式）
   */
  generatePracticeBasedErrorHandling(context: RuleGenerationContext): string {
    if (!context.projectPractice?.errorHandling) {
      return this.generateErrorHandlingGuidelines(context);
    }

    const eh = context.projectPractice.errorHandling;
    let rules = `## 错误处理规范\n\n`;

    // 第一段：项目当前实践
    rules += `### 项目当前实践\n\n`;

    if (eh.type === "none" || eh.frequency === 0) {
      rules += `⚠️ 项目当前未实施系统的错误处理。\n\n`;
    } else {
      rules += `项目主要使用 **${eh.type === "try-catch" ? "try-catch" : "Promise.catch()"}** 处理错误（发现 ${eh.frequency} 处）\n\n`;

      if (eh.customErrorTypes.length > 0) {
        rules += `**自定义错误类型**：\n`;
        rules += eh.customErrorTypes.map((t: string) => `- \`${t}\``).join("\n") + "\n\n";
      }

      rules += `**日志方式**：${eh.loggingMethod === "console" ? "console.log/error" : eh.loggingMethod === "logger-library" ? `日志库 (${eh.loggerLibrary})` : "未检测到"}\n\n`;
    }

    // 第二段：短期建议
    rules += `### 短期建议（保持兼容）\n\n`;

    if (eh.type === "none") {
      rules += `💡 建议为关键操作添加基础错误处理：\n`;
      rules += `\`\`\`typescript\n`;
      rules += `try {\n`;
      rules += `  await criticalOperation();\n`;
      rules += `} catch (error) {\n`;
      rules += `  console.error('操作失败:', error);\n`;
      rules += `  // 提供用户友好的错误提示\n`;
      rules += `}\n`;
      rules += `\`\`\`\n\n`;
    } else {
      rules += `✅ 继续使用现有的 ${eh.type} 模式保持一致性\n\n`;

      if (eh.loggingMethod === "console") {
        rules += `💡 改进建议：为 console.error 添加更多上下文信息\n`;
        rules += `\`\`\`typescript\n`;
        rules += `console.error('[错误类型]', { userId, timestamp, error, context });\n`;
        rules += `\`\`\`\n\n`;
      }
    }

    // 第三段：长期建议
    rules += `### 长期建议（可选改进）\n\n`;

    if (eh.loggingMethod === "console") {
      rules += `💡 考虑引入结构化日志系统（如 winston 或 pino）：\n`;
      rules += `- 便于生产环境调试\n`;
      rules += `- 支持日志级别和过滤\n`;
      rules += `- 可以集成到监控系统\n\n`;
    }

    if (eh.customErrorTypes.length === 0) {
      rules += `💡 考虑定义自定义错误类型以提高错误处理的精确性\n\n`;
    }

    rules += `💡 考虑引入错误监控服务（如 Sentry）跟踪生产环境错误\n\n`;

    return rules;
  }

  /**
   * 生成自定义工具使用规则（v1.2）
   */
  generateCustomToolsRules(context: RuleGenerationContext): string {
    if (!context.customPatterns || (context.customPatterns.customHooks.length === 0 && context.customPatterns.customUtils.length === 0)) {
      return "";
    }

    let rules = `## 项目自定义工具（优先使用）\n\n`;

    // 自定义 Hooks
    if (context.customPatterns.customHooks.length > 0) {
      rules += `### 自定义 Hooks\n\n`;
      rules += `项目定义了以下自定义 hooks，**生成代码时必须优先使用**：\n\n`;

      const topHooks = context.customPatterns.customHooks.slice(0, 10);
      for (const hook of topHooks) {
        rules += `**${hook.name}** ${hook.description ? `- ${hook.description}` : ""}\n`;
        rules += `- 位置: \`${hook.relativePath}\`\n`;
        rules += `- 使用频率: ${hook.frequency > 10 ? "高" : hook.frequency > 3 ? "中" : "低"} (${hook.frequency} 处)\n`;
        if (hook.usage) {
          rules += `- 使用方式:\n`;
          rules += `  \`\`\`typescript\n`;
          rules += `  ${hook.usage}\n`;
          rules += `  \`\`\`\n`;
        }
        rules += `\n`;
      }
    }

    // 自定义工具函数
    if (context.customPatterns.customUtils.length > 0) {
      rules += `### 自定义工具函数\n\n`;
      rules += `项目定义了以下工具函数，**生成代码时必须优先使用**：\n\n`;

      // 按类别分组
      const utilsByCategory = this.groupUtilsByCategory(context.customPatterns.customUtils);

      for (const [category, utils] of Object.entries(utilsByCategory)) {
        rules += `**${category}**:\n`;
        for (const util of utils.slice(0, 5)) {
          rules += `- \`${util.name}\` (${util.relativePath})\n`;
          if (util.signature) {
            rules += `  \`\`\`typescript\n  ${util.signature}\n  \`\`\`\n`;
          }
        }
        rules += `\n`;
      }
    }

    // API 客户端
    if (context.customPatterns.apiClient?.exists) {
      const api = context.customPatterns.apiClient;
      rules += `### API 客户端\n\n`;
      rules += `项目使用自定义的 API 客户端：**\`${api.name}\`**\n`;
      rules += `- 位置: \`${FileUtils.getRelativePath(context.projectPath, api.filePath)}\`\n`;
      if (api.hasErrorHandling) {
        rules += `- ✅ 已内置错误处理\n`;
      }
      if (api.hasAuth) {
        rules += `- ✅ 已内置认证处理\n`;
      }
      rules += `\n**使用要求**:\n`;
      rules += `\`\`\`typescript\n`;
      rules += `// ✅ 正确 - 使用项目的 API 客户端\n`;
      rules += `import { ${api.name} } from '@/services/${api.name}';\n`;
      rules += `const data = await ${api.name}.get('/endpoint');\n\n`;
      rules += `// ❌ 错误 - 不要直接使用 fetch 或 axios\n`;
      rules += `const response = await fetch('/api/endpoint');\n`;
      rules += `\`\`\`\n\n`;
    }

    rules += `### ⚠️ 重要规则\n\n`;
    rules += `1. **优先使用项目自定义工具**，不要重新实现或引入第三方替代\n`;
    rules += `2. **保持一致性**，使用相同的工具确保代码可维护性\n`;
    rules += `3. **新增工具时**，遵循现有工具的命名和组织方式\n\n`;

    return rules;
  }

  /**
   * 按类别分组工具函数
   */
  private groupUtilsByCategory(utils: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    for (const util of utils) {
      if (!grouped[util.category]) {
        grouped[util.category] = [];
      }
      grouped[util.category].push(util);
    }
    return grouped;
  }

  /**
   * 生成基于项目结构的文件组织规则（v1.2）
   */
  generateStructureBasedFileOrgRules(context: RuleGenerationContext): string {
    if (!context.fileOrganization) {
      return this.generateFileOrganizationGuidelines(context);
    }

    const org = context.fileOrganization;
    let rules = `## 文件组织规范（基于项目实际结构）\n\n`;

    // 项目目录结构
    rules += `### 项目目录结构\n\n`;
    rules += `项目采用以下目录组织方式，**生成代码时必须遵循**：\n\n`;
    rules += `\`\`\`\n`;

    // 显示主要目录
    const topDirs = org.structure.filter((d) => !d.path.includes("/")).slice(0, 10);
    for (const dir of topDirs) {
      rules += `${dir.path}/  # ${dir.purpose} (${dir.fileCount} 个文件)\n`;
      
      // 显示子目录
      const children = org.structure.filter(
        (d) => d.path.startsWith(dir.path + "/") && d.path.split("/").length === 2
      ).slice(0, 5);
      
      for (const child of children) {
        const childName = child.path.split("/").pop();
        rules += `  ├── ${childName}/  # ${child.purpose}\n`;
      }
    }

    rules += `\`\`\`\n\n`;

    // 文件创建规则
    rules += `### 新建文件规则\n\n`;

    if (org.componentLocation.length > 0) {
      rules += `**新建组件**:\n`;
      rules += `- 位置: \`${org.componentLocation[0]}/\`\n`;
      rules += `- 命名: ${org.namingConvention.components}\n`;
      if (org.namingConvention.useIndexFiles) {
        rules += `- 结构: 每个组件一个目录，使用 index 文件导出\n`;
        rules += `  \`\`\`\n`;
        rules += `  components/Button/\n`;
        rules += `    ├── index.tsx\n`;
        rules += `    ├── Button.tsx\n`;
        rules += `    └── styles.ts\n`;
        rules += `  \`\`\`\n`;
      }
      rules += `\n`;
    }

    if (org.utilsLocation.length > 0) {
      rules += `**新建工具函数**:\n`;
      rules += `- 位置: \`${org.utilsLocation[0]}/\`\n`;
      rules += `- 按功能分类创建文件（如 date.ts, validation.ts）\n\n`;
    }

    // 导入规范
    if (context.projectConfig?.pathAliases && Object.keys(context.projectConfig.pathAliases).length > 0) {
      rules += `### 导入规范\n\n`;
      rules += `**必须使用路径别名**，不要使用相对路径：\n`;
      rules += `\`\`\`typescript\n`;
      rules += `// ✅ 正确\n`;
      const aliases = Object.keys(context.projectConfig.pathAliases);
      if (aliases.length > 0) {
        rules += `import { Button } from '${aliases[0]}/components/Button';\n`;
      }
      rules += `\n// ❌ 错误\n`;
      rules += `import { Button } from '../../../components/Button';\n`;
      rules += `\`\`\`\n\n`;
    }

    return rules;
  }

  /**
   * 检查功能是否在项目中存在
   */
  private featureExists(context: RuleGenerationContext, featureName: string): boolean {
    // 检查代码特征
    if (context.codeFeatures[featureName]) {
      return context.codeFeatures[featureName].frequency > 0;
    }

    // 检查依赖
    const featureDeps: Record<string, string[]> = {
      "testing": ["jest", "vitest", "mocha", "@testing-library"],
      "state-management": ["redux", "zustand", "mobx", "pinia", "vuex"],
      "styling": ["styled-components", "@emotion", "tailwindcss", "@mui"],
    };

    if (featureDeps[featureName]) {
      return context.techStack.dependencies.some((d) =>
        featureDeps[featureName].some((lib) => d.name.includes(lib))
      );
    }

    return false;
  }

  /**
   * 生成按需的测试规则（v1.2）
   */
  generateConditionalTestingRules(context: RuleGenerationContext): string {
    const hasTests = this.featureExists(context, "testing");

    if (!hasTests) {
      // 项目没有测试 - 简短提示
      return `## 测试\n\n### 当前状态\n⚠️ 项目当前未配置测试框架\n\n### 建议\n💡 如需添加测试，建议考虑：\n- **Jest** 或 **Vitest**（单元测试）\n- **@testing-library/react**（React 组件测试）\n- **Cypress** 或 **Playwright**（E2E 测试）\n\n`;
    }

    // 项目有测试 - 生成详细规则
    return this.generateTestingGuidelines(context);
  }
}

// 添加 FileUtils 导入（如果需要）
import { FileUtils } from "../utils/file-utils.js";

