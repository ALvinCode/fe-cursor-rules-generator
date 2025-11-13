#!/usr/bin/env node
/**
 * 从 Markdown 文档解析所有规则
 * 提取分类、规则名称和目录路径
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * 解析 Markdown 文档
 */
function parseMarkdown(markdownContent) {
  const rules = [];
  let currentCategory = null;
  
  const lines = markdownContent.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 检测分类标题（### 开头）
    if (line.startsWith('### ')) {
      currentCategory = line.replace('### ', '').trim();
      continue;
    }
    
    // 检测规则链接（- [ 开头）
    if (line.startsWith('- [') && line.includes('](./rules/')) {
      // 提取规则名称和路径
      const match = line.match(/- \[([^\]]+)\]\(\.\/rules\/([^\)]+)\.cursorrules\)/);
      if (match) {
        const ruleName = match[1].trim();
        const rulePath = match[2].trim();
        const dirName = rulePath.split('/')[0]; // 提取目录名称
        
        rules.push({
          category: currentCategory,
          ruleName: ruleName,
          dirName: dirName,
          fullPath: rulePath
        });
      }
    }
  }
  
  return rules;
}

/**
 * 分类映射（Markdown 中的分类名称 -> 我们的分类代码）
 */
const CATEGORY_MAP = {
  'Frontend Frameworks and Libraries': 'frontend',
  'Backend and Full-Stack': 'backend',
  'Mobile Development': 'mobile',
  'CSS and Styling': 'styling',
  'State Management': 'state',
  'Database and API': 'database',
  'Testing': 'testing',
  'Hosting and Deployments': 'hosting',
  'Build Tools and Development': 'build',
  'Language-Specific': 'language',
  'Other': 'other',
  'Documentation': 'other', // 文档归类到 other
  'Utilities': 'other' // 工具归类到 other
};

/**
 * 主函数
 */
async function main() {
  // 读取 Markdown 文件（从标准输入或文件）
  let markdownContent;
  
  if (process.argv[2]) {
    // 从文件读取
    markdownContent = await fs.readFile(process.argv[2], 'utf-8');
  } else {
    // 从标准输入读取
    markdownContent = await new Promise((resolve) => {
      let data = '';
      process.stdin.on('data', chunk => { data += chunk; });
      process.stdin.on('end', () => resolve(data));
    });
  }
  
  // 解析
  const rules = parseMarkdown(markdownContent);
  
  // 按分类组织
  const rulesByCategory = {};
  for (const rule of rules) {
    const categoryCode = CATEGORY_MAP[rule.category] || 'other';
    if (!rulesByCategory[categoryCode]) {
      rulesByCategory[categoryCode] = [];
    }
    rulesByCategory[categoryCode].push(rule);
  }
  
  // 输出结果
  console.log(JSON.stringify({
    totalRules: rules.length,
    categories: Object.keys(rulesByCategory),
    rulesByCategory: rulesByCategory,
    allRules: rules
  }, null, 2));
}

main().catch(console.error);

