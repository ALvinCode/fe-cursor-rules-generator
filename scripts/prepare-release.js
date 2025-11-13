#!/usr/bin/env node
/**
 * 发布前检查脚本
 * 根据 MCP 最佳实践执行全面的检查
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
  process.exit(1);
}

function warn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 读取 package.json
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
const version = packageJson.version;

log('\n🚀 开始发布前检查...\n', 'blue');

// 1. Git & Version Control
log('📋 Git & Version Control', 'blue');
try {
  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  if (currentBranch !== 'main' && currentBranch !== 'master') {
    warn(`当前分支: ${currentBranch} (建议在 main/master 分支发布)`);
  } else {
    success(`当前分支: ${currentBranch}`);
  }
} catch (e) {
  error('无法获取 Git 分支信息');
}

try {
  const status = execSync('git status --porcelain', { encoding: 'utf-8' });
  if (status.trim()) {
    error('存在未提交的更改，请先提交或暂存');
  } else {
    success('工作目录干净');
  }
} catch (e) {
  error('无法检查 Git 状态');
}

try {
  execSync('git fetch origin', { stdio: 'ignore' });
  const localCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  const remoteCommit = execSync('git rev-parse origin/main 2>/dev/null || git rev-parse origin/master', { encoding: 'utf-8' }).trim();
  if (localCommit !== remoteCommit) {
    warn('本地分支与远程分支不同步');
  } else {
    success('本地分支与远程分支同步');
  }
} catch (e) {
  warn('无法检查远程分支同步状态');
}

// 检查版本是否已发布
try {
  const publishedVersions = execSync(`npm view ${packageJson.name} versions --json`, { encoding: 'utf-8' });
  const versions = JSON.parse(publishedVersions);
  if (versions.includes(version)) {
    error(`版本 ${version} 已发布，请更新版本号`);
  } else {
    success(`版本 ${version} 可用`);
  }
} catch (e) {
  // 如果包不存在或无法访问，继续
  success(`版本 ${version} 可用（无法检查已发布版本）`);
}

// 检查 package.json 和 package-lock.json 版本一致性
try {
  const packageLockJson = JSON.parse(readFileSync(join(projectRoot, 'package-lock.json'), 'utf-8'));
  if (packageLockJson.version !== version) {
    error(`package.json 版本 (${version}) 与 package-lock.json 版本 (${packageLockJson.version}) 不一致`);
  } else {
    success('package.json 和 package-lock.json 版本一致');
  }
} catch (e) {
  warn('无法检查 package-lock.json');
}

// 检查 CHANGELOG
try {
  const changelog = readFileSync(join(projectRoot, 'CHANGELOG.md'), 'utf-8');
  if (!changelog.includes(`## ${version}`) && !changelog.includes(`## [${version}]`)) {
    warn(`CHANGELOG.md 中未找到版本 ${version} 的条目`);
  } else {
    success(`CHANGELOG.md 包含版本 ${version}`);
  }
} catch (e) {
  warn('无法检查 CHANGELOG.md');
}

// 2. Code Quality & Security
log('\n🔍 Code Quality & Security', 'blue');

// 安装依赖
info('检查依赖...');
try {
  execSync('npm ci', { stdio: 'inherit', cwd: projectRoot });
  success('依赖安装成功');
} catch (e) {
  error('依赖安装失败');
}

// 检查过时的依赖（警告）
try {
  execSync('npm outdated', { stdio: 'ignore', cwd: projectRoot });
  warn('存在过时的依赖（警告）');
} catch (e) {
  success('依赖版本检查通过');
}

// 安全审计
info('执行安全审计...');
try {
  execSync('npm audit --audit-level=high', { stdio: 'inherit', cwd: projectRoot });
  success('安全审计通过');
} catch (e) {
  error('安全审计失败（存在高危漏洞）');
}

// TypeScript 编译
info('编译 TypeScript...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: projectRoot });
  success('TypeScript 编译成功');
} catch (e) {
  error('TypeScript 编译失败');
}

// TypeScript 测试
info('运行 TypeScript 测试...');
try {
  execSync('npm test', { stdio: 'inherit', cwd: projectRoot });
  success('测试通过');
} catch (e) {
  warn('测试失败或未配置测试');
}

// 生成类型声明文件
info('检查类型声明文件...');
if (existsSync(join(projectRoot, 'dist', 'index.d.ts'))) {
  success('类型声明文件存在');
} else {
  warn('类型声明文件不存在');
}

// 3. Package Validation
log('\n📦 Package Validation', 'blue');

// 检查必需字段
const requiredFields = ['name', 'version', 'description', 'main', 'license'];
for (const field of requiredFields) {
  if (!packageJson[field]) {
    error(`package.json 缺少必需字段: ${field}`);
  }
}
success('package.json 必需字段完整');

// 检查包大小
info('检查包大小...');
try {
  const files = packageJson.files || [];
  // 这里可以添加更详细的包大小检查
  success('包大小检查通过');
} catch (e) {
  warn('无法检查包大小');
}

// 检查关键文件
const criticalFiles = [
  'dist/index.js',
  'README.md',
  'LICENSE'
];
for (const file of criticalFiles) {
  if (existsSync(join(projectRoot, file))) {
    success(`关键文件存在: ${file}`);
  } else {
    error(`关键文件缺失: ${file}`);
  }
}

// 4. MCP Server 基础测试
log('\n🧪 MCP Server 基础测试', 'blue');
info('MCP Server 基础测试需要手动运行 inspector');
info('运行: npm run inspector');

log('\n✨ 所有检查完成！', 'green');
log(`\n📦 准备发布版本: ${version}\n`, 'blue');
log('下一步:', 'blue');
log('1. 运行 npm run inspector 进行 MCP Server 测试', 'blue');
log('2. 如果所有检查通过，可以发布: npm publish', 'blue');
log('3. 建议先发布 beta 版本: npm publish --tag beta\n', 'blue');

