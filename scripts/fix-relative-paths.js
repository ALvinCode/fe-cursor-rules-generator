#!/usr/bin/env node
/**
 * 修复模块内部的相对路径
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const modulesDir = join(process.cwd(), 'src', 'modules');

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

function fixRelativePathsInFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  let updated = false;
  
  // 检查文件是否在子目录中
  const isInSubdir = filePath.includes('/modules/') && 
                     filePath.split('/modules/')[1].includes('/');
  
  if (isInSubdir) {
    // 修复 ../types.js -> ../../types.js
    if (content.includes("from '../types.js'") || content.includes('from "../types.js"')) {
      content = content.replace(/from ['"]\.\.\/types\.js['"]/g, "from '../../types.js'");
      updated = true;
    }
    
    // 修复 ../utils/ -> ../../utils/
    if (content.includes("from '../utils/")) {
      content = content.replace(/from ['"]\.\.\/utils\//g, "from '../../utils/");
      updated = true;
    }
  } else {
    // 对于 modules 根目录下的文件（现在不应该有，但以防万一）
    // 修复 ./xxx -> ../xxx (如果引用其他子目录)
  }
  
  // 特殊处理：修复跨子目录的引用
  // 例如 validators/markdownlint-validator.ts 引用 ./markdown-formatter.js
  // 应该改为 ../core/markdown-formatter.js
  if (filePath.includes('validators/markdownlint-validator.ts')) {
    if (content.includes("from './markdown-formatter.js'")) {
      content = content.replace(/from ['"]\.\/markdown-formatter\.js['"]/g, "from '../core/markdown-formatter.js'");
      updated = true;
    }
  }
  
  if (updated) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ 修复: ${filePath.split('/modules/')[1]}`);
    return true;
  }
  
  return false;
}

// 获取所有 TypeScript 文件
const allFiles = getAllTsFiles(modulesDir);
console.log(`📁 找到 ${allFiles.length} 个 TypeScript 文件\n`);

// 修复每个文件
let updatedCount = 0;
for (const file of allFiles) {
  if (fixRelativePathsInFile(file)) {
    updatedCount++;
  }
}

console.log(`\n✨ 完成！修复了 ${updatedCount} 个文件的相对路径`);

