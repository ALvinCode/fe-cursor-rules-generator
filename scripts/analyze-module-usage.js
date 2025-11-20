#!/usr/bin/env node
/**
 * 分析项目中模块的使用情况
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const srcDir = join(process.cwd(), 'src');
const modulesDir = join(srcDir, 'modules');

// 获取所有模块文件
const moduleFiles = readdirSync(modulesDir)
  .filter(f => f.endsWith('.ts'))
  .map(f => f.replace('.ts', ''));

console.log(`📊 找到 ${moduleFiles.length} 个模块文件\n`);

// 分析每个模块的使用情况
const usageMap = new Map();

for (const moduleName of moduleFiles) {
  const usage = {
    name: moduleName,
    importedBy: [],
    lines: 0
  };

  // 检查 index.ts
  try {
    const indexContent = readFileSync(join(srcDir, 'index.ts'), 'utf-8');
    if (indexContent.includes(`from './modules/${moduleName}`)) {
      usage.importedBy.push('index.ts');
    }
  } catch (e) {}

  // 检查其他模块
  for (const otherModule of moduleFiles) {
    if (otherModule === moduleName) continue;
    try {
      const content = readFileSync(join(modulesDir, `${otherModule}.ts`), 'utf-8');
      if (content.includes(`from './${moduleName}`) || content.includes(`from "./${moduleName}`)) {
        usage.importedBy.push(`modules/${otherModule}.ts`);
      }
    } catch (e) {}
  }

  // 获取文件行数
  try {
    const content = readFileSync(join(modulesDir, `${moduleName}.ts`), 'utf-8');
    usage.lines = content.split('\n').length;
  } catch (e) {}

  usageMap.set(moduleName, usage);
}

// 分类输出
const unused = [];
const coreModules = [];
const utilModules = [];

for (const [name, usage] of usageMap.entries()) {
  if (usage.importedBy.length === 0) {
    unused.push(usage);
  } else if (usage.importedBy.includes('index.ts')) {
    coreModules.push(usage);
  } else {
    utilModules.push(usage);
  }
}

// 输出未使用的模块
if (unused.length > 0) {
  console.log('🚫 未使用的模块 (可以删除):');
  unused.sort((a, b) => b.lines - a.lines).forEach(m => {
    console.log(`  - ${m.name} (${m.lines} 行)`);
  });
  console.log('');
}

// 输出核心模块
console.log('✅ 核心模块 (被 index.ts 直接使用):');
coreModules.sort((a, b) => b.lines - a.lines).forEach(m => {
  console.log(`  - ${m.name} (${m.lines} 行, 被 ${m.importedBy.length} 个文件引用)`);
});
console.log('');

// 输出工具模块
console.log('🔧 工具模块 (仅被其他模块使用):');
utilModules.sort((a, b) => b.lines - a.lines).forEach(m => {
  console.log(`  - ${m.name} (${m.lines} 行, 被 ${m.importedBy.length} 个文件引用)`);
  m.importedBy.forEach(ref => console.log(`    ← ${ref}`));
});
console.log('');

// 统计信息
console.log('📈 统计信息:');
console.log(`  总模块数: ${moduleFiles.length}`);
console.log(`  核心模块: ${coreModules.length}`);
console.log(`  工具模块: ${utilModules.length}`);
console.log(`  未使用模块: ${unused.length}`);
console.log(`  总代码行数: ${Array.from(usageMap.values()).reduce((sum, m) => sum + m.lines, 0)}`);

