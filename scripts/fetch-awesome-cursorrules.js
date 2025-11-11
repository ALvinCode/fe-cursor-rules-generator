#!/usr/bin/env node
/**
 * 从 awesome-cursorrules 仓库提取前端框架规则
 * 用于分析和优化当前项目的规则生成格式
 */

import https from 'https';
import fs from 'fs/promises';
import path from 'path';

const GITHUB_API_BASE = 'https://api.github.com';
const REPO = 'PatrickJS/awesome-cursorrules';
const RULES_DIR = 'rules';

// 前端框架关键词（用于识别相关规则）
const FRAMEWORK_KEYWORDS = [
  'react', 'vue', 'angular', 'svelte', 'nextjs', 'next.js', 
  'nuxt', 'typescript', 'javascript', 'nodejs', 'node.js'
];

/**
 * 获取 GitHub API 响应
 */
async function fetchGitHubAPI(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'cursor-rules-generator',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * 获取仓库目录内容
 */
async function getDirectoryContents(path) {
  const url = `${GITHUB_API_BASE}/repos/${REPO}/contents/${path}`;
  return await fetchGitHubAPI(url);
}

/**
 * 获取文件内容（raw）
 */
async function getFileContent(filePath) {
  const url = `https://raw.githubusercontent.com/${REPO}/main/${filePath}`;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * 检查是否包含前端框架关键词
 */
function isFrontendFramework(name) {
  const lower = name.toLowerCase();
  return FRAMEWORK_KEYWORDS.some(keyword => lower.includes(keyword));
}

/**
 * 提取所有前端框架规则
 */
async function extractFrontendRules() {
  console.log('📦 开始提取 awesome-cursorrules 规则...\n');

  try {
    // 1. 获取 rules 目录内容
    console.log('📂 获取 rules 目录...');
    const rulesDir = await getDirectoryContents(RULES_DIR);
    
    // 确保 rulesDir 是数组
    if (!Array.isArray(rulesDir)) {
      throw new Error('rules 目录内容格式异常');
    }
    
    // 2. 筛选前端框架相关规则
    const frontendRules = rulesDir.filter(item => 
      item.type === 'dir' && isFrontendFramework(item.name)
    );

    console.log(`✅ 找到 ${frontendRules.length} 个前端框架规则\n`);

    // 3. 提取每个规则的 .cursorrules 文件
    const extractedRules = [];
    
    for (const rule of frontendRules) {
      console.log(`📄 处理: ${rule.name}`);
      
      try {
        // 获取规则目录内容
        const ruleDir = await getDirectoryContents(rule.path);
        
        // 确保 ruleDir 是数组
        if (!Array.isArray(ruleDir)) {
          console.log(`  ⚠️  目录内容格式异常`);
          continue;
        }
        
        // 查找 .cursorrules 文件
        const cursorrulesFile = ruleDir.find(file => 
          file.name === '.cursorrules' || file.name.endsWith('.cursorrules')
        );

        if (cursorrulesFile) {
          // 获取文件内容
          const content = await getFileContent(cursorrulesFile.path);
          
          extractedRules.push({
            name: rule.name,
            path: cursorrulesFile.path,
            content: content,
            size: cursorrulesFile.size
          });
          
          console.log(`  ✅ 提取成功 (${cursorrulesFile.size} bytes)`);
        } else {
          console.log(`  ⚠️  未找到 .cursorrules 文件`);
        }
      } catch (error) {
        console.log(`  ❌ 错误: ${error.message}`);
      }
    }

    // 4. 保存提取的规则
    const outputDir = path.join(process.cwd(), 'docs', 'story', 'awesome-cursorrules-samples');
    await fs.mkdir(outputDir, { recursive: true });

    for (const rule of extractedRules) {
      const fileName = `${rule.name.replace(/\//g, '-')}.cursorrules`;
      const filePath = path.join(outputDir, fileName);
      await fs.writeFile(filePath, rule.content, 'utf-8');
      console.log(`💾 已保存: ${filePath}`);
    }

    // 5. 生成索引文件
    const index = {
      extractedAt: new Date().toISOString(),
      totalRules: extractedRules.length,
      rules: extractedRules.map(r => ({
        name: r.name,
        path: r.path,
        size: r.size
      }))
    };

    await fs.writeFile(
      path.join(outputDir, 'index.json'),
      JSON.stringify(index, null, 2),
      'utf-8'
    );

    console.log(`\n✅ 提取完成！共 ${extractedRules.length} 个规则`);
    console.log(`📁 输出目录: ${outputDir}`);

    return extractedRules;

  } catch (error) {
    console.error('❌ 提取失败:', error.message);
    throw error;
  }
}

// 执行提取
extractFrontendRules().catch(console.error);

