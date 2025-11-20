#!/usr/bin/env node
/**
 * 批量更新模块内部的 import 路径
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const modulesDir = join(process.cwd(), 'src', 'modules');

// 模块位置映射
const moduleLocations = {
  // Core
  'project-analyzer': 'core',
  'rules-generator': 'core',
  'generation-coordinator': 'core',
  'config-parser': 'core',
  'file-writer': 'core',
  'markdown-formatter': 'core',
  'code-generation-requirements': 'core',
  
  // Analyzers
  'code-analyzer': 'analyzers',
  'deep-directory-analyzer': 'analyzers',
  'dependency-analyzer': 'analyzers',
  'file-content-analyzer': 'analyzers',
  'file-type-identifier': 'analyzers',
  'module-detector': 'analyzers',
  'practice-analyzer': 'analyzers',
  'router-detector': 'analyzers',
  'tech-stack-detector': 'analyzers',
  'custom-pattern-detector': 'analyzers',
  'file-structure-learner': 'analyzers',
  
  // Generators
  'best-practice-comparator': 'generators',
  'best-practice-extractor': 'generators',
  'framework-matcher': 'generators',
  'rule-requirements-analyzer': 'generators',
  'suggestion-collector': 'generators',
  'tech-stack-matcher': 'generators',
  
  // Validators
  'consistency-checker': 'validators',
  'rule-validator': 'validators',
  'markdownlint-validator': 'validators',
  
  // Integrations
  'best-practice-web-searcher': 'integrations',
  'context7-integration': 'integrations',
};

function getAllTsFiles(dir) {
  const files = [];
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function updateImportsInFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  let updated = false;
  
  // 更新每个模块的 import 路径
  for (const [moduleName, location] of Object.entries(moduleLocations)) {
    // 匹配 from './module-name' 或 from "./module-name"
    const oldPattern1 = new RegExp(`from ['"]\\.\/${moduleName}(\\.js)?['"]`, 'g');
    const oldPattern2 = new RegExp(`from ['"]\\.\\.\\/${moduleName}(\\.js)?['"]`, 'g');
    
    // 根据当前文件位置计算相对路径
    const fileDir = filePath.split('/modules/')[1].split('/')[0];
    let newPath;
    
    if (fileDir === location) {
      // 同一目录
      newPath = `./${moduleName}.js`;
    } else if (fileDir === 'modules') {
      // 在 modules 根目录（不应该有，但以防万一）
      newPath = `./${location}/${moduleName}.js`;
    } else {
      // 不同子目录
      newPath = `../${location}/${moduleName}.js`;
    }
    
    const newImport = `from '${newPath}'`;
    
    if (oldPattern1.test(content)) {
      content = content.replace(oldPattern1, newImport);
      updated = true;
    }
    if (oldPattern2.test(content)) {
      content = content.replace(oldPattern2, newImport);
      updated = true;
    }
  }
  
  if (updated) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ 更新: ${filePath.split('/modules/')[1]}`);
    return true;
  }
  
  return false;
}

// 获取所有 TypeScript 文件
const allFiles = getAllTsFiles(modulesDir);
console.log(`📁 找到 ${allFiles.length} 个 TypeScript 文件\n`);

// 更新每个文件
let updatedCount = 0;
for (const file of allFiles) {
  if (updateImportsInFile(file)) {
    updatedCount++;
  }
}

console.log(`\n✨ 完成！更新了 ${updatedCount} 个文件的 import 路径`);

