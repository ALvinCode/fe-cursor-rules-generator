/**
 * 最佳实践网络搜索器
 * 对于项目使用但框架规则中没有的技术栈，通过网络搜索查询最佳实践
 */

import { logger } from "../../utils/logger.js";
import { TechStack } from '../../types.js';
import { ExtractedBestPractice } from '../generators/best-practice-extractor.js';

export interface WebSearchResult {
  success: boolean;
  practices: ExtractedBestPractice[];
  error?: string;
}

/**
 * 最佳实践网络搜索器
 */
export class BestPracticeWebSearcher {
  /**
   * 搜索技术栈的最佳实践
   */
  async searchBestPractices(
    techStack: string[],
    category?: string
  ): Promise<WebSearchResult> {
    if (techStack.length === 0) {
      return {
        success: false,
        practices: [],
        error: '技术栈列表为空'
      };
    }

    try {
      logger.info('开始网络搜索最佳实践', { techStack, category });
      
      // 使用 web_search 工具搜索
      const searchQuery = this.buildSearchQuery(techStack, category);
      const practices = await this.performWebSearch(searchQuery, techStack, category);
      
      logger.info('网络搜索完成', { 
        query: searchQuery,
        found: practices.length 
      });

      return {
        success: true,
        practices
      };
    } catch (error) {
      logger.debug('网络搜索失败', { error });
      return {
        success: false,
        practices: [],
        error: error instanceof Error ? error.message : '网络搜索失败'
      };
    }
  }

  /**
   * 构建搜索查询
   */
  private buildSearchQuery(techStack: string[], category?: string): string {
    const techNames = techStack.join(' ');
    const categoryKeywords: Record<string, string> = {
      'code-style': '代码风格 最佳实践',
      'architecture': '架构设计 最佳实践',
      'error-handling': '错误处理 最佳实践',
      'performance': '性能优化 最佳实践',
      'security': '安全性 最佳实践',
      'testing': '测试 最佳实践',
      'component': '组件开发 最佳实践',
      'routing': '路由 最佳实践',
      'state-management': '状态管理 最佳实践'
    };

    const categoryKeyword = category ? categoryKeywords[category] || '' : '';
    return `${techNames} ${categoryKeyword} best practices cursor rules`.trim();
  }

  /**
   * 执行网络搜索
   */
  private async performWebSearch(
    query: string,
    techStack: string[],
    category?: string
  ): Promise<ExtractedBestPractice[]> {
    // 注意：这里需要使用 web_search 工具，但在这个模块中无法直接调用
    // 需要在调用方（rules-generator）中调用 web_search，然后传递结果到这里
    // 或者返回搜索查询，让调用方执行搜索
    
    // 由于无法直接调用 web_search，这里返回空数组
    // 实际搜索将在 rules-generator 中通过 web_search 工具执行
    return [];
  }

  /**
   * 从网络搜索结果中提取最佳实践
   */
  parseWebSearchResults(
    searchResults: string,
    techStack: string[],
    category?: string
  ): ExtractedBestPractice[] {
    const practices: ExtractedBestPractice[] = [];
    
    // 简单的文本解析逻辑
    // 实际实现中可能需要更复杂的解析
    
    // 提取标题和内容
    const sections = this.extractSections(searchResults);
    
    for (const section of sections) {
      if (this.isRelevant(section, techStack, category)) {
        practices.push({
          category: category || 'general',
          title: section.title || '最佳实践',
          content: section.content,
          techStack,
          priority: this.determinePriority(section.content)
        });
      }
    }

    return practices;
  }

  /**
   * 从文本中提取章节
   */
  private extractSections(content: string): Array<{ title?: string; content: string }> {
    const sections: Array<{ title?: string; content: string }> = [];
    
    // 匹配标题（Markdown 格式或 HTML 格式）
    const headingRegex = /^(#{1,3}|<h[1-3]>)\s*(.+?)(\s*#*|<\/h[1-3]>)$/gm;
    let lastIndex = 0;
    let lastTitle: string | undefined;

    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const title = match[2].trim();
      const startIndex = match.index;

      if (lastIndex < startIndex) {
        const sectionContent = content.substring(lastIndex, startIndex).trim();
        if (sectionContent.length > 20) {
          sections.push({
            title: lastTitle,
            content: sectionContent
          });
        }
      }

      lastIndex = startIndex + match[0].length;
      lastTitle = title;
    }

    // 添加最后一个章节
    if (lastIndex < content.length) {
      const sectionContent = content.substring(lastIndex).trim();
      if (sectionContent.length > 20) {
        sections.push({
          title: lastTitle,
          content: sectionContent
        });
      }
    }

    return sections;
  }

  /**
   * 判断内容是否相关
   */
  private isRelevant(
    section: { title?: string; content: string },
    techStack: string[],
    category?: string
  ): boolean {
    const text = `${section.title || ''} ${section.content}`.toLowerCase();
    
    // 检查是否包含技术栈关键词
    const hasTechStack = techStack.some(tech => 
      text.includes(tech.toLowerCase())
    );

    if (!hasTechStack) {
      return false;
    }

    // 检查类别关键词
    if (category) {
      const categoryKeywords: Record<string, string[]> = {
        'code-style': ['代码风格', 'code style', 'formatting', 'convention'],
        'architecture': ['架构', 'architecture', 'structure', 'organization'],
        'error-handling': ['错误处理', 'error handling', 'exception', 'try catch'],
        'performance': ['性能', 'performance', 'optimization', 'speed'],
        'security': ['安全', 'security', 'auth', 'authentication'],
        'testing': ['测试', 'testing', 'test', 'spec'],
        'component': ['组件', 'component', 'ui', 'interface'],
        'routing': ['路由', 'routing', 'route', 'navigation'],
        'state-management': ['状态管理', 'state management', 'store', 'state']
      };

      const keywords = categoryKeywords[category] || [];
      const hasCategoryKeyword = keywords.some(keyword => 
        text.includes(keyword.toLowerCase())
      );

      return hasCategoryKeyword;
    }

    return true;
  }

  /**
   * 确定优先级
   */
  private determinePriority(content: string): 'high' | 'medium' | 'low' {
    const contentLower = content.toLowerCase();
    
    if (
      contentLower.includes('must') ||
      contentLower.includes('required') ||
      contentLower.includes('always') ||
      contentLower.includes('never') ||
      contentLower.includes('critical')
    ) {
      return 'high';
    }

    if (
      contentLower.includes('optional') ||
      contentLower.includes('consider') ||
      contentLower.includes('suggest')
    ) {
      return 'low';
    }

    return 'medium';
  }
}

