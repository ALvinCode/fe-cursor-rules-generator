/**
 * 类型定义文件
 */

export interface ProjectFile {
  path: string;
  relativePath: string;
  extension: string;
  size: number;
}

export interface TechStack {
  primary: string[]; // 主要技术栈，如 ['React', 'TypeScript', 'Node.js']
  dependencies: Dependency[];
  packageManagers: string[]; // npm, yarn, pnpm 等
  frameworks: string[];
  languages: string[];
}

export interface Dependency {
  name: string;
  version: string;
  type: "dependency" | "devDependency" | "peerDependency";
  category?: string; // 'framework', 'library', 'tool' 等
}

export interface Module {
  name: string;
  path: string;
  type: "frontend" | "backend" | "shared" | "service" | "package" | "other";
  dependencies: string[];
  description?: string;
}

export interface CodeFeature {
  type: string; // 'data-processing', 'custom-components', 'api-routes' 等
  description: string;
  examples: string[];
  frequency: number; // 出现频率
}

export interface BestPractice {
  source: string; // 来源，如 'React Official Docs'
  category: string; // 'component-structure', 'state-management' 等
  content: string;
  priority: number; // 优先级 1-10
}

export interface Inconsistency {
  type: "missing-doc" | "outdated-doc" | "wrong-tech-stack" | "missing-feature";
  description: string;
  actualValue: string;
  documentedValue?: string;
  severity: "low" | "medium" | "high";
  suggestedFix?: string;
}

export interface ConsistencyReport {
  hasInconsistencies: boolean;
  inconsistencies: Inconsistency[];
  checkedFiles: string[];
}

export interface CursorRule {
  scope: "global" | "module" | "specialized"; // v1.3: 添加 specialized 专题规则
  moduleName?: string;
  modulePath?: string; // 模块的路径，用于确定规则文件的写入位置（global 为项目根目录，module 为模块目录）
  content: string;
  fileName: string;
  priority: number;
  type?: string; // v1.3: 规则类型（overview, guideline, reference, practice）
  depends?: string[]; // v1.3: 依赖的其他规则文件
}

export interface InstructionsFile {
  content: string;
  fileName: string; // instructions.md
  filePath: string; // .cursor/instructions.md
}

export interface ProjectPractice {
  errorHandling: any; // ErrorHandlingPattern from practice-analyzer
  codeStyle: any; // CodeStylePattern from practice-analyzer
  componentPattern: any; // ComponentPattern from practice-analyzer
}

export interface ProjectConfiguration {
  prettier?: any; // PrettierConfig from config-parser
  eslint?: any; // ESLintConfig from config-parser
  typescript?: any; // TSConfig from config-parser
  pathAliases: Record<string, string>;
  commands?: {
    format?: string;
    lint?: string;
    lintFix?: string;
    typeCheck?: string;
  };
}

export interface CustomPatterns {
  customHooks: any[]; // CustomHook[] from custom-pattern-detector
  customUtils: any[]; // CustomUtil[] from custom-pattern-detector
  apiClient?: any; // APIClientInfo from custom-pattern-detector
}

export interface FileOrganizationInfo {
  structure: any[]; // DirectoryPurpose[] from file-structure-learner
  componentLocation: string[];
  utilsLocation: string[];
  typesLocation?: string[]; // v1.7 新增
  stylesLocation?: string[]; // v1.7 新增
  apiLocation?: string[]; // v1.7 新增
  hooksLocation?: string[]; // v1.7 新增
  namingConvention: any;
}

export interface RouterInfo {
  exists: boolean;
  type: "file-based" | "config-based" | "programmatic" | "mixed";
  framework: string;
  version?: string;
  location: string[];
}

export interface RoutingPattern {
  organization: "centralized" | "distributed" | "feature-based" | "mixed";
  urlNaming: "kebab-case" | "camelCase" | "snake_case" | "mixed";
  fileNaming: string;
  dynamicRoutePattern: string;
  dynamicRouteExamples: string[];
  hasRouteGroups: boolean;
  groupPattern?: string;
  supportsLayouts: boolean;
  layoutPattern?: string;
  hasGuards: boolean;
  guardFiles?: string[];
  usesLazyLoading: boolean;
  hasRouteMeta: boolean;
  navigationMethod?: string;
  isDynamicGenerated: boolean;
  generationScript?: string;
}

export interface RouteExample {
  filePath: string;
  url: string;
  type: "static" | "dynamic" | "nested" | "api";
  method?: string;
  hasGuard?: boolean;
}

export interface RuleGenerationContext {
  projectPath: string;
  techStack: TechStack;
  modules: Module[];
  codeFeatures: Record<string, CodeFeature>;
  bestPractices: BestPractice[];
  includeModuleRules: boolean;
  // v1.2 新增字段
  projectPractice?: ProjectPractice;
  projectConfig?: ProjectConfiguration;
  customPatterns?: CustomPatterns;
  fileOrganization?: FileOrganizationInfo;
  // v1.3.x 新增字段
  frontendRouter?: {
    info: RouterInfo;
    pattern: RoutingPattern;
    examples: RouteExample[];
    dynamicAnalysis?: any;
  };
  backendRouter?: {
    info: RouterInfo;
    pattern: RoutingPattern;
    examples: RouteExample[];
  };
}

/**
 * 生成摘要相关类型（v1.7 新增）
 */
export interface GenerationSummary {
  status: "success" | "needs-confirmation" | "error";
  filesGenerated: Array<{
    path: string;
    type: string;
    sourceRule: string;
    explanation?: {
      filePath: string;
      type: string;
      sourceRule: string;
      triggerCondition: string;
      usageGuidance: string;
    };
  }>;
  contextEvaluation: {
    detectedStructure: string[];
    appliedStructureRule: string;
    mismatches?: Array<{
      type: string;
      detected: string | null;
      expected: string;
      severity: "high" | "medium" | "low";
    }>;
  };
  userGuidance: string[];
  notes: string[];
  confirmationsNeeded?: Array<{
    topic: string;
    currentPath: string;
    reason: string;
    alternatives?: string[];
  }>;
}
