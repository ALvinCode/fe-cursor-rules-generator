#!/usr/bin/env node
/**
 * 从 Markdown 文档更新所有规则映射和提取缺失的规则
 */

import https from 'https';
import fs from 'fs/promises';
import path from 'path';

const GITHUB_BASE = 'https://raw.githubusercontent.com/PatrickJS/awesome-cursorrules/main';
const OUTPUT_BASE = path.join(process.cwd(), 'docs', 'story', 'awesome-cursorrules-samples');

/**
 * 分类映射
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
  'Documentation': 'other',
  'Utilities': 'other'
};

/**
 * 从 URL 获取文件内容
 */
async function fetchFromUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

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
        const dirName = rulePath.split('/')[0];
        
        rules.push({
          category: currentCategory,
          categoryCode: CATEGORY_MAP[currentCategory] || 'other',
          ruleName: ruleName,
          dirName: dirName,
          fullPath: rulePath,
          url: `${GITHUB_BASE}/rules/${rulePath}.cursorrules`
        });
      }
    }
  }
  
  return rules;
}

/**
 * 提取规则文件
 */
async function extractRule(rule) {
  const outputDir = path.join(OUTPUT_BASE, rule.categoryCode);
  await fs.mkdir(outputDir, { recursive: true });
  
  const fileName = `${rule.dirName}.cursorrules`;
  const filePath = path.join(outputDir, fileName);
  
  try {
    // 检查文件是否已存在
    try {
      await fs.access(filePath);
      console.log(`  ⏭️  已存在: ${fileName}`);
      return { ...rule, exists: true };
    } catch {
      // 文件不存在，需要下载
    }
    
    // 下载文件
    console.log(`  📥 下载: ${rule.ruleName}`);
    const content = await fetchFromUrl(rule.url);
    
    // 保存文件
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`  ✅ 已保存: ${fileName} (${content.length} bytes)`);
    
    return {
      name: rule.dirName,
      category: rule.categoryCode,
      path: `rules/${rule.fullPath}.cursorrules`,
      size: content.length,
      displayName: rule.ruleName,
      exists: false
    };
    
  } catch (error) {
    console.error(`  ❌ 错误: ${error.message}`);
    return null;
  }
}

/**
 * 更新映射文件
 */
async function updateMappingFile(allRules) {
  const mappingPath = path.join(process.cwd(), 'scripts', 'rule-category-mapping.js');
  
  try {
    let content = await fs.readFile(mappingPath, 'utf-8');
    
    // 按类别组织规则
    const rulesByCategory = {};
    for (const rule of allRules) {
      if (!rulesByCategory[rule.categoryCode]) {
        rulesByCategory[rule.categoryCode] = [];
      }
      rulesByCategory[rule.categoryCode].push(rule);
    }
    
    // 为每个类别生成映射
    let newMappingContent = 'export const RULE_CATEGORY_MAPPING = {\n';
    
    for (const [categoryCode, rules] of Object.entries(rulesByCategory)) {
      const categoryName = Object.entries(CATEGORY_MAP).find(([name, code]) => code === categoryCode)?.[0] || categoryCode;
      newMappingContent += `  // ${categoryName}\n`;
      newMappingContent += `  ${categoryCode}: {\n`;
      
      for (const rule of rules) {
        const key = rule.dirName;
        const displayName = rule.ruleName.replace(/'/g, "\\'");
        newMappingContent += `    '${key}': '${displayName}',\n`;
      }
      
      newMappingContent += `  },\n\n`;
    }
    
    newMappingContent += '};\n\n';
    
    // 保留原有的 categorizeRuleByName 函数
    const oldContent = await fs.readFile(mappingPath, 'utf-8');
    const functionStart = oldContent.indexOf('export function categorizeRuleByName');
    if (functionStart !== -1) {
      newMappingContent += oldContent.substring(functionStart);
    } else {
      // 如果没有找到函数，添加默认函数
      newMappingContent += `export function categorizeRuleByName(ruleName) {
  const name = ruleName.replace(/\\.cursorrules$/, '').toLowerCase();
  
  for (const [category, rules] of Object.entries(RULE_CATEGORY_MAPPING)) {
    for (const [key, displayName] of Object.entries(rules)) {
      if (name === key || name.includes(key) || key.includes(name)) {
        return category;
      }
    }
  }
  
  return 'other';
}
`;
    }
    
    await fs.writeFile(mappingPath, newMappingContent, 'utf-8');
    console.log(`\n✅ 已更新 rule-category-mapping.js`);
    
  } catch (error) {
    console.error(`❌ 更新映射文件失败: ${error.message}`);
  }
}

/**
 * 更新 index.json
 */
async function updateIndex(allRules) {
  const indexPath = path.join(OUTPUT_BASE, 'index.json');
  
  try {
    let index = {
      extractedAt: new Date().toISOString(),
      totalRules: 0,
      categoryStats: {},
      rules: []
    };
    
    // 尝试读取现有索引
    try {
      const existing = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(existing);
    } catch {
      // 如果不存在，使用新的索引
    }
    
    // 按类别统计
    const categoryStats = {};
    const rulesMap = new Map();
    
    // 添加现有规则
    if (index.rules) {
      for (const rule of index.rules) {
        rulesMap.set(rule.name, rule);
        categoryStats[rule.category] = (categoryStats[rule.category] || 0) + 1;
      }
    }
    
    // 添加新规则
    for (const rule of allRules) {
      if (rule && !rulesMap.has(rule.name)) {
        rulesMap.set(rule.name, {
          name: rule.name,
          category: rule.category,
          path: rule.path,
          size: rule.size
        });
        categoryStats[rule.category] = (categoryStats[rule.category] || 0) + 1;
      }
    }
    
    // 更新索引
    index.rules = Array.from(rulesMap.values());
    index.categoryStats = categoryStats;
    index.totalRules = index.rules.length;
    index.extractedAt = new Date().toISOString();
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    
    console.log(`\n✅ 已更新 index.json`);
    console.log(`   总规则数: ${index.totalRules}`);
    console.log(`   类别统计:`);
    for (const [category, count] of Object.entries(categoryStats)) {
      console.log(`     - ${category}: ${count}`);
    }
    
  } catch (error) {
    console.error(`❌ 更新 index.json 失败: ${error.message}`);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('📋 从 Markdown 文档更新规则映射和提取缺失规则\n');
  
  // 读取 Markdown 文件
  let markdownContent;
  if (process.argv[2]) {
    markdownContent = await fs.readFile(process.argv[2], 'utf-8');
  } else {
    console.log('请提供 Markdown 文件路径作为参数');
    console.log('用法: node scripts/update-rules-from-markdown.js <markdown-file>');
    return;
  }
  
  // 解析 Markdown
  console.log('📖 解析 Markdown 文档...');
  const allRules = parseMarkdown(markdownContent);
  console.log(`✅ 解析完成，找到 ${allRules.length} 个规则\n`);
  
  // 按类别显示
  const rulesByCategory = {};
  for (const rule of allRules) {
    if (!rulesByCategory[rule.categoryCode]) {
      rulesByCategory[rule.categoryCode] = [];
    }
    rulesByCategory[rule.categoryCode].push(rule);
  }
  
  console.log('📊 规则分类统计:');
  for (const [category, rules] of Object.entries(rulesByCategory)) {
    console.log(`  - ${category}: ${rules.length} 个规则`);
  }
  console.log('');
  
  // 询问用户是否要提取缺失的规则
  console.log('🔍 检查缺失的规则...\n');
  
  const rulesToExtract = [];
  for (const rule of allRules) {
    const outputDir = path.join(OUTPUT_BASE, rule.categoryCode);
    const filePath = path.join(outputDir, `${rule.dirName}.cursorrules`);
    
    try {
      await fs.access(filePath);
      // 文件已存在
    } catch {
      // 文件不存在，需要提取
      rulesToExtract.push(rule);
    }
  }
  
  if (rulesToExtract.length > 0) {
    console.log(`发现 ${rulesToExtract.length} 个缺失的规则，开始提取...\n`);
    
    const extractedRules = [];
    for (const rule of rulesToExtract) {
      const result = await extractRule(rule);
      if (result && !result.exists) {
        extractedRules.push(result);
      }
      // 添加延迟避免 API 限制
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    if (extractedRules.length > 0) {
      await updateIndex(extractedRules);
    }
  } else {
    console.log('✅ 所有规则都已存在\n');
  }
  
  // 更新映射文件
  console.log('📝 更新规则映射文件...');
  await updateMappingFile(allRules);
  
  console.log('\n✅ 完成！');
}

main().catch(console.error);

