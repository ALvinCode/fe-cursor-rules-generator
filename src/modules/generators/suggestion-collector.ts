/**
 * 建议收集器
 * 从规则生成过程中收集所有建议，而不是直接写入规则文件
 */

import { Suggestion } from './best-practice-comparator.js';

export class SuggestionCollector {
  private suggestions: Suggestion[] = [];

  /**
   * 添加建议
   */
  add(suggestion: Suggestion): void {
    this.suggestions.push(suggestion);
  }

  /**
   * 批量添加建议
   */
  addAll(suggestions: Suggestion[]): void {
    this.suggestions.push(...suggestions);
  }

  /**
   * 获取所有建议
   */
  getAll(): Suggestion[] {
    return [...this.suggestions];
  }

  /**
   * 按类型分组获取建议
   */
  getByType(): Record<string, Suggestion[]> {
    const grouped: Record<string, Suggestion[]> = {};
    
    for (const suggestion of this.suggestions) {
      if (!grouped[suggestion.type]) {
        grouped[suggestion.type] = [];
      }
      grouped[suggestion.type].push(suggestion);
    }

    return grouped;
  }

  /**
   * 按优先级分组获取建议
   */
  getByPriority(): Record<string, Suggestion[]> {
    const grouped: Record<'high' | 'medium' | 'low', Suggestion[]> = {
      high: [],
      medium: [],
      low: []
    };

    for (const suggestion of this.suggestions) {
      grouped[suggestion.priority].push(suggestion);
    }

    return grouped;
  }

  /**
   * 格式化建议为输出文本
   */
  formatForOutput(): string {
    if (this.suggestions.length === 0) {
      return "";
    }

    let output = "\n## 📋 建议列表\n\n";
    output += "> ⚠️ **重要**: 以下建议需要您确认是否采纳。采纳后可以重新生成规则以包含这些建议。\n\n";

    // 按类型分组
    const byType = this.getByType();
    const typeOrder: Suggestion['type'][] = [
      'code-style',
      'architecture',
      'error-handling',
      'performance',
      'security',
      'testing',
      'component',
      'routing',
      'state-management',
      'general'
    ];

    for (const type of typeOrder) {
      if (!byType[type] || byType[type].length === 0) {
        continue;
      }

      const typeName = this.getTypeName(type);
      output += `### ${typeName}\n\n`;

      // 按优先级排序
      const typeSuggestions = byType[type].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      for (const suggestion of typeSuggestions) {
        output += `#### ${suggestion.title}\n\n`;
        output += `**优先级**: ${this.getPriorityLabel(suggestion.priority)}\n`;
        output += `**影响范围**: ${this.getImpactLabel(suggestion.impact)}\n`;
        output += `**原因**: ${suggestion.reason}\n\n`;
        output += `${suggestion.content}\n\n`;
        output += "---\n\n";
      }
    }

    return output;
  }

  /**
   * 获取类型名称
   */
  private getTypeName(type: Suggestion['type']): string {
    const names: Record<Suggestion['type'], string> = {
      'code-style': '代码风格',
      'architecture': '架构设计',
      'error-handling': '错误处理',
      'performance': '性能优化',
      'security': '安全性',
      'testing': '测试',
      'component': '组件开发',
      'routing': '路由管理',
      'state-management': '状态管理',
      'general': '通用建议'
    };
    return names[type] || type;
  }

  /**
   * 获取优先级标签
   */
  private getPriorityLabel(priority: Suggestion['priority']): string {
    const labels: Record<Suggestion['priority'], string> = {
      high: '🔴 高',
      medium: '🟡 中',
      low: '🟢 低'
    };
    return labels[priority];
  }

  /**
   * 获取影响范围标签
   */
  private getImpactLabel(impact: Suggestion['impact']): string {
    const labels: Record<Suggestion['impact'], string> = {
      global: '全局',
      module: '模块',
      file: '文件'
    };
    return labels[impact];
  }

  /**
   * 清空所有建议
   */
  clear(): void {
    this.suggestions = [];
  }

  /**
   * 获取建议数量
   */
  count(): number {
    return this.suggestions.length;
  }
}

