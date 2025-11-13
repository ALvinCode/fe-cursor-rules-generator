#!/usr/bin/env node
/**
 * 从 awesome-cursorrules 仓库提取所有类别的规则
 * 包括：Frontend、Backend、Mobile、CSS、State Management、Database、Testing、Hosting、Build Tools、Language-Specific、Other
 */

import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { categorizeRuleByName, RULE_CATEGORY_MAPPING } from './rule-category-mapping.js';

const GITHUB_API_BASE = 'https://api.github.com';
const REPO = 'PatrickJS/awesome-cursorrules';
const RULES_DIR = 'rules';

// 所有技术栈关键词（按类别分类）
const TECH_KEYWORDS = {
  // Frontend Frameworks and Libraries
  frontend: [
    'react', 'vue', 'angular', 'svelte', 'nextjs', 'next.js', 'nuxt', 
    'remix', 'gatsby', 'astro', 'solid', 'qwik', 'preact', 'lit'
  ],
  // Backend and Full-Stack
  backend: [
    'nodejs', 'node.js', 'express', 'fastify', 'koa', 'nestjs', 'hapi',
    'django', 'flask', 'fastapi', 'rails', 'laravel', 'spring', 'asp.net',
    'go', 'rust', 'php', 'java', 'csharp', 'dotnet', 'python'
  ],
  // Mobile Development
  mobile: [
    'react-native', 'expo', 'flutter', 'ionic', 'capacitor', 'cordova',
    'swift', 'kotlin', 'android', 'ios', 'xamarin', 'titanium'
  ],
  // CSS and Styling
  styling: [
    'tailwind', 'css', 'sass', 'scss', 'less', 'stylus', 'styled-components',
    'emotion', 'mui', 'material-ui', 'chakra', 'antd', 'bootstrap'
  ],
  // State Management
  state: [
    'redux', 'mobx', 'zustand', 'jotai', 'recoil', 'pinia', 'vuex',
    'ngrx', 'akita', 'effector', 'valtio'
  ],
  // Database and API
  database: [
    'mongodb', 'postgresql', 'mysql', 'sqlite', 'redis', 'prisma',
    'sequelize', 'typeorm', 'mongoose', 'drizzle', 'supabase', 'firebase',
    'graphql', 'rest', 'grpc', 'tRPC'
  ],
  // Testing
  testing: [
    'jest', 'vitest', 'mocha', 'cypress', 'playwright', 'puppeteer',
    'testing-library', 'enzyme', 'karma', 'jasmine', 'ava', 'tape'
  ],
  // Hosting and Deployments
  hosting: [
    'vercel', 'netlify', 'aws', 'azure', 'gcp', 'cloudflare', 'heroku',
    'docker', 'kubernetes', 'terraform', 'ansible', 'ci/cd', 'github-actions'
  ],
  // Build Tools and Development
  build: [
    'webpack', 'vite', 'rollup', 'esbuild', 'swc', 'turbo', 'nx',
    'turborepo', 'pnpm', 'yarn', 'npm', 'bun', 'deno'
  ],
  // Language-Specific
  language: [
    'typescript', 'javascript', 'python', 'java', 'go', 'rust', 'c++',
    'csharp', 'php', 'ruby', 'swift', 'kotlin', 'dart', 'scala', 'clojure'
  ],
  // Other
  other: [
    'blockchain', 'solidity', 'web3', 'ai', 'ml', 'tensorflow', 'pytorch',
    'unity', 'unreal', 'game', 'cli', 'electron', 'tauri', 'pwa'
  ]
};

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
async function getDirectoryContents(dirPath) {
  const url = `${GITHUB_API_BASE}/repos/${REPO}/contents/${dirPath}`;
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
 * 识别规则类别（使用精确映射）
 */
function categorizeRule(name) {
  // 使用精确映射
  const category = categorizeRuleByName(name);
  return category;
}

/**
 * 提取所有规则
 */
async function extractAllRules() {
  console.log('📦 开始提取 awesome-cursorrules 所有规则...\n');

  try {
    // 1. 获取 rules 目录内容
    console.log('📂 获取 rules 目录...');
    const rulesDir = await getDirectoryContents(RULES_DIR);
    
    if (!Array.isArray(rulesDir)) {
      console.error('API 返回格式:', typeof rulesDir, rulesDir);
      throw new Error('rules 目录内容格式异常，返回的不是数组');
    }
    
    // 2. 筛选所有规则目录（不再限制为前端框架）
    const allRules = rulesDir.filter(item => item.type === 'dir');
    
    console.log(`✅ 找到 ${allRules.length} 个规则目录\n`);

    // 3. 提取每个规则的 .cursorrules 文件
    const extractedRules = [];
    const categoryStats = {};
    
    for (const rule of allRules) {
      const category = await categorizeRule(rule.name);
      if (!categoryStats[category]) {
        categoryStats[category] = 0;
      }
      
      console.log(`📄 处理 [${category}]: ${rule.name}`);
      
      try {
        // 获取规则目录内容
        const ruleDir = await getDirectoryContents(rule.path);
        
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
            category: category,
            path: cursorrulesFile.path,
            content: content,
            size: cursorrulesFile.size
          });
          
          categoryStats[category]++;
          console.log(`  ✅ 提取成功 [${category}] (${cursorrulesFile.size} bytes)`);
        } else {
          console.log(`  ⚠️  未找到 .cursorrules 文件`);
        }
      } catch (error) {
        console.log(`  ❌ 错误: ${error.message}`);
      }
    }

    // 4. 按类别保存提取的规则
    const outputDir = path.join(process.cwd(), 'docs', 'story', 'awesome-cursorrules-samples');
    await fs.mkdir(outputDir, { recursive: true });

    // 按类别组织文件
    const categoryDirs = {};
    for (const category of Object.keys(TECH_KEYWORDS)) {
      const categoryDir = path.join(outputDir, category);
      await fs.mkdir(categoryDir, { recursive: true });
      categoryDirs[category] = categoryDir;
    }
    const otherDir = path.join(outputDir, 'other');
    await fs.mkdir(otherDir, { recursive: true });
    categoryDirs['other'] = otherDir;

    for (const rule of extractedRules) {
      const fileName = `${rule.name.replace(/\//g, '-')}.cursorrules`;
      const categoryDir = categoryDirs[rule.category] || otherDir;
      const filePath = path.join(categoryDir, fileName);
      await fs.writeFile(filePath, rule.content, 'utf-8');
      console.log(`💾 已保存 [${rule.category}]: ${filePath}`);
    }

    // 5. 生成索引文件
    const index = {
      extractedAt: new Date().toISOString(),
      totalRules: extractedRules.length,
      categoryStats: categoryStats,
      rules: extractedRules.map(r => ({
        name: r.name,
        category: r.category,
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
    console.log(`📊 类别统计:`);
    for (const [category, count] of Object.entries(categoryStats)) {
      console.log(`  - ${category}: ${count} 个规则`);
    }
    console.log(`📁 输出目录: ${outputDir}`);

    return extractedRules;

  } catch (error) {
    console.error('❌ 提取失败:', error.message);
    throw error;
  }
}

// 执行提取
extractAllRules().catch(console.error);

