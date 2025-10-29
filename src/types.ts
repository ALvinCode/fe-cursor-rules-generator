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
  scope: "global" | "module";
  moduleName?: string;
  modulePath?: string; // 模块的路径，用于确定规则文件的写入位置（global 为项目根目录，module 为模块目录）
  content: string;
  fileName: string;
  priority: number;
}

export interface RuleGenerationContext {
  projectPath: string;
  techStack: TechStack;
  modules: Module[];
  codeFeatures: Record<string, CodeFeature>;
  bestPractices: BestPractice[];
  includeModuleRules: boolean;
}

