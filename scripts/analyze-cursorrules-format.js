#!/usr/bin/env node
/**
 * 分析 awesome-cursorrules 规则文件的格式模式
 */

import fs from 'fs/promises';
import path from 'path';

const SAMPLES_DIR = 'docs/story/awesome-cursorrules-samples';

/**
 * 分析单个规则文件
 */
async function analyzeRuleFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  
  const analysis = {
    fileName,
    size: content.length,
    lines: content.split('\n').length,
    hasFrontmatter: content.startsWith('---'),
    hasTitle: /^#\s+/.test(content) || /^#\s+/.test(content.trim()),
    structure: {
      sections: [],
      codeBlocks: 0,
      lists: 0,
      examples: 0
    },
    patterns: {
      startsWithPersona: /^You are|^ASSISTANT/i.test(content),
      hasKeyPrinciples: /Key Principles|Key Requirements|Principles/i.test(content),
      hasGuidelines: /Guidelines|Best Practices|Conventions/i.test(content),
      hasCodeExamples: /```[\s\S]*?```/g.test(content),
      hasStructure: /Structure|Organization|Architecture/i.test(content),
      hasNaming: /Naming|Conventions|Convention/i.test(content)
    },
    techStack: extractTechStack(content),
    format: detectFormat(content)
  };

  // 提取章节
  const sectionMatches = content.matchAll(/^#{1,4}\s+(.+)$/gm);
  for (const match of sectionMatches) {
    analysis.structure.sections.push({
      level: match[0].match(/^#+/)[0].length,
      title: match[1].trim()
    });
  }

  // 统计代码块
  analysis.structure.codeBlocks = (content.match(/```/g) || []).length / 2;

  // 统计列表
  analysis.structure.lists = (content.match(/^[-*+]\s+/gm) || []).length;

  return analysis;
}

/**
 * 提取技术栈
 */
function extractTechStack(content) {
  const techKeywords = [
    'React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nextjs', 'Nuxt',
    'TypeScript', 'JavaScript', 'Node.js', 'Nodejs',
    'Tailwind', 'Shadcn', 'Chakra', 'Material-UI',
    'Supabase', 'Vercel', 'Express', 'MongoDB'
  ];
  
  const found = [];
  for (const tech of techKeywords) {
    const regex = new RegExp(tech, 'gi');
    if (regex.test(content)) {
      found.push(tech);
    }
  }
  return found;
}

/**
 * 检测格式类型
 */
function detectFormat(content) {
  if (content.startsWith('---')) {
    return 'frontmatter';
  }
  if (/^You are|^ASSISTANT/i.test(content)) {
    return 'persona-first';
  }
  if (/^#\s+/.test(content.trim())) {
    return 'title-first';
  }
  if (/^\/\/|^const |^function /m.test(content)) {
    return 'code-comment';
  }
  return 'mixed';
}

/**
 * 主分析函数
 */
async function analyzeAllRules() {
  const files = await fs.readdir(SAMPLES_DIR);
  const cursorrulesFiles = files.filter(f => f.endsWith('.cursorrules'));
  
  console.log(`📊 分析 ${cursorrulesFiles.length} 个规则文件...\n`);
  
  const analyses = [];
  for (const file of cursorrulesFiles) {
    const filePath = path.join(SAMPLES_DIR, file);
    try {
      const analysis = await analyzeRuleFile(filePath);
      analyses.push(analysis);
    } catch (error) {
      console.error(`❌ 分析失败: ${file}`, error.message);
    }
  }

  // 生成统计报告
  const report = {
    total: analyses.length,
    formats: {},
    commonSections: {},
    techStacks: {},
    avgLines: 0,
    avgSize: 0
  };

  analyses.forEach(a => {
    // 格式统计
    report.formats[a.format] = (report.formats[a.format] || 0) + 1;
    
    // 章节统计
    a.structure.sections.forEach(s => {
      const key = s.title.toLowerCase();
      report.commonSections[key] = (report.commonSections[key] || 0) + 1;
    });
    
    // 技术栈统计
    a.techStack.forEach(tech => {
      report.techStacks[tech] = (report.techStacks[tech] || 0) + 1;
    });
    
    report.avgLines += a.lines;
    report.avgSize += a.size;
  });

  report.avgLines = Math.round(report.avgLines / analyses.length);
  report.avgSize = Math.round(report.avgSize / analyses.length);

  // 保存分析结果
  const outputPath = path.join(SAMPLES_DIR, 'format-analysis.json');
  await fs.writeFile(
    outputPath,
    JSON.stringify({ analyses, report }, null, 2),
    'utf-8'
  );

  console.log('✅ 分析完成！');
  console.log(`📁 结果保存到: ${outputPath}\n`);
  
  console.log('📊 格式统计:');
  Object.entries(report.formats).forEach(([format, count]) => {
    console.log(`  ${format}: ${count}`);
  });
  
  console.log('\n📊 平均统计:');
  console.log(`  平均行数: ${report.avgLines}`);
  console.log(`  平均大小: ${report.avgSize} bytes`);
  
  console.log('\n📊 常见技术栈:');
  Object.entries(report.techStacks)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([tech, count]) => {
      console.log(`  ${tech}: ${count}`);
    });

  return { analyses, report };
}

// 执行分析
analyzeAllRules().catch(console.error);

