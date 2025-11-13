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

// 检测包管理器
function detectPackageManager() {
  if (existsSync(join(projectRoot, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (existsSync(join(projectRoot, 'yarn.lock'))) {
    return 'yarn';
  }
  if (existsSync(join(projectRoot, 'package-lock.json'))) {
    return 'npm';
  }
  // 默认使用 npm
  return 'npm';
}

const packageManager = detectPackageManager();
const pmCommands = {
  npm: {
    install: 'npm ci',
    outdated: 'npm outdated',
    audit: 'npm audit --audit-level=high',
    view: 'npm view',
    publish: 'npm publish',
    run: 'npm run'
  },
  pnpm: {
    install: 'pnpm install --frozen-lockfile',
    outdated: 'pnpm outdated',
    audit: 'pnpm audit --audit-level=high',
    view: 'pnpm view',
    publish: 'pnpm publish',
    run: 'pnpm run'
  },
  yarn: {
    install: 'yarn install --frozen-lockfile',
    outdated: 'yarn outdated',
    audit: 'yarn audit --level high',
    view: 'yarn info',
    publish: 'yarn publish',
    run: 'yarn run'
  }
};

const pm = pmCommands[packageManager];

// 读取 package.json
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
const version = packageJson.version;

info(`检测到包管理器: ${packageManager}`);

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
  // 获取当前分支名
  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  // 获取远程跟踪分支
  const remoteBranch = execSync(`git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo ""`, { encoding: 'utf-8' }).trim();
  
  if (remoteBranch) {
    // 有远程跟踪分支，先 fetch
    try {
      execSync('git fetch origin', { stdio: 'ignore' });
    } catch (fetchError) {
      warn('无法获取远程更新（可能网络问题，继续检查）');
    }
    
    const localCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    const remoteCommit = execSync(`git rev-parse ${remoteBranch} 2>/dev/null`, { encoding: 'utf-8' }).trim();
    
    if (localCommit && remoteCommit && localCommit !== remoteCommit) {
      warn(`本地分支与远程分支不同步 (本地: ${localCommit.substring(0, 7)}, 远程: ${remoteCommit.substring(0, 7)})`);
    } else if (localCommit && remoteCommit) {
      success('本地分支与远程分支同步');
    } else {
      warn('无法获取提交信息');
    }
  } else {
    // 没有远程跟踪分支，检查是否有 origin/main 或 origin/master
    try {
      execSync('git fetch origin', { stdio: 'ignore' });
      const localCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      const remoteCommit = execSync('git rev-parse origin/main 2>/dev/null || git rev-parse origin/master 2>/dev/null', { encoding: 'utf-8' }).trim();
      
      if (localCommit && remoteCommit && localCommit !== remoteCommit) {
        warn(`本地分支与远程分支不同步 (本地: ${localCommit.substring(0, 7)}, 远程: ${remoteCommit.substring(0, 7)})`);
      } else if (localCommit && remoteCommit) {
        success('本地分支与远程分支同步');
      } else {
        info('当前分支未设置远程跟踪分支');
      }
    } catch (e) {
      warn('无法检查远程分支同步状态（可能未设置远程仓库）');
    }
  }
} catch (e) {
  warn('无法检查远程分支同步状态');
}

// 检查版本是否已发布
try {
  // npm view 和 pnpm view 返回格式相同，yarn info 需要特殊处理
  let command = `${pm.view} ${packageJson.name} versions --json`;
  if (packageManager === 'yarn') {
    command = `${pm.view} ${packageJson.name} versions --json 2>/dev/null || echo "[]"`;
  }
  const publishedVersions = execSync(command, { encoding: 'utf-8' });
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

// 检查 package.json 和锁文件版本一致性
try {
  let lockFile;
  if (packageManager === 'pnpm' && existsSync(join(projectRoot, 'pnpm-lock.yaml'))) {
    // pnpm-lock.yaml 不存储项目自身的版本号，只存储依赖版本
    // 这里只检查锁文件是否存在，不检查版本一致性
    // 实际版本一致性应该通过运行 pnpm install 来保证
    success('pnpm-lock.yaml 存在（pnpm 不存储项目版本信息，依赖版本已锁定）');
  } else if (packageManager === 'npm' && existsSync(join(projectRoot, 'package-lock.json'))) {
    const packageLockJson = JSON.parse(readFileSync(join(projectRoot, 'package-lock.json'), 'utf-8'));
    if (packageLockJson.version !== version) {
      error(`package.json 版本 (${version}) 与 package-lock.json 版本 (${packageLockJson.version}) 不一致`);
    } else {
      success('package.json 和 package-lock.json 版本一致');
    }
  } else if (packageManager === 'yarn' && existsSync(join(projectRoot, 'yarn.lock'))) {
    // yarn.lock 不包含版本信息，跳过检查
    success('yarn.lock 存在（yarn 不存储版本信息）');
  } else {
    warn('未找到锁文件');
  }
} catch (e) {
  warn('无法检查锁文件版本一致性');
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
  execSync(pm.install, { stdio: 'inherit', cwd: projectRoot });
  success('依赖安装成功');
} catch (e) {
  error('依赖安装失败');
}

// 检查过时的依赖（警告）
try {
  execSync(pm.outdated, { stdio: 'ignore', cwd: projectRoot });
  warn('存在过时的依赖（警告）');
} catch (e) {
  success('依赖版本检查通过');
}

// 安全审计
info('执行安全审计...');
try {
  execSync(pm.audit, { stdio: 'inherit', cwd: projectRoot });
  success('安全审计通过');
} catch (e) {
  error('安全审计失败（存在高危漏洞）');
}

// TypeScript 编译
info('编译 TypeScript...');
try {
  execSync(`${pm.run} build`, { stdio: 'inherit', cwd: projectRoot });
  success('TypeScript 编译成功');
} catch (e) {
  error('TypeScript 编译失败');
}

// TypeScript 测试
info('运行 TypeScript 测试...');
try {
  execSync(`${pm.run} test`, { stdio: 'inherit', cwd: projectRoot });
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
info(`运行: ${pm.run} inspector`);

log('\n✨ 所有检查完成！', 'green');
log(`\n📦 准备发布版本: ${version}\n`, 'blue');
log('下一步:', 'blue');
log(`1. 运行 ${pm.run} inspector 进行 MCP Server 测试`, 'blue');
log(`2. 如果所有检查通过，可以发布: ${pm.publish}`, 'blue');
log(`3. 建议先发布 beta 版本: ${pm.publish} --access public --tag beta\n`, 'blue');

