#!/usr/bin/env node
/**
 * 添加缺失的 Mobile Development 规则
 * 支持从链接或内容添加规则
 */

import https from 'https';
import fs from 'fs/promises';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'docs', 'story', 'awesome-cursorrules-samples', 'mobile');

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
 * 从 GitHub 仓库路径获取内容
 */
async function fetchFromGitHubPath(ruleDirName) {
  const url = `https://raw.githubusercontent.com/PatrickJS/awesome-cursorrules/main/rules/${ruleDirName}/.cursorrules`;
  return await fetchFromUrl(url);
}

/**
 * 添加规则
 */
async function addRule(ruleName, source) {
  console.log(`\n📦 添加规则: ${ruleName}`);
  console.log(`   来源: ${source.type === 'url' ? source.url : source.type === 'content' ? '直接内容' : source.dirName}`);

  try {
    let content;
    let fileName;

    if (source.type === 'url') {
      // 从 URL 获取
      content = await fetchFromUrl(source.url);
      fileName = source.fileName || `${ruleName.toLowerCase().replace(/\s+/g, '-')}.cursorrules`;
    } else if (source.type === 'github') {
      // 从 GitHub 路径获取
      content = await fetchFromGitHubPath(source.dirName);
      fileName = `${source.dirName}.cursorrules`;
    } else if (source.type === 'content') {
      // 直接使用提供的内容
      content = source.content;
      fileName = source.fileName || `${ruleName.toLowerCase().replace(/\s+/g, '-')}.cursorrules`;
    } else {
      throw new Error('未知的来源类型');
    }

    // 确保输出目录存在
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // 保存文件
    const filePath = path.join(OUTPUT_DIR, fileName);
    await fs.writeFile(filePath, content, 'utf-8');

    console.log(`   ✅ 已保存: ${filePath}`);
    console.log(`   📏 大小: ${content.length} bytes`);

    return {
      name: fileName.replace('.cursorrules', ''),
      category: 'mobile',
      path: `rules/${source.dirName || fileName.replace('.cursorrules', '')}/.cursorrules`,
      size: content.length,
      displayName: ruleName
    };

  } catch (error) {
    console.error(`   ❌ 错误: ${error.message}`);
    return null;
  }
}

/**
 * 更新 index.json
 */
async function updateIndex(addedRules) {
  const indexPath = path.join(
    process.cwd(),
    'docs',
    'story',
    'awesome-cursorrules-samples',
    'index.json'
  );

  try {
    const indexContent = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexContent);

    // 添加新规则
    for (const rule of addedRules) {
      if (rule) {
        // 检查是否已存在
        const existing = index.rules.find(r => r.name === rule.name);
        if (!existing) {
          index.rules.push({
            name: rule.name,
            category: rule.category,
            path: rule.path,
            size: rule.size
          });
          index.categoryStats.mobile = (index.categoryStats.mobile || 0) + 1;
          index.totalRules += 1;
        }
      }
    }

    // 更新提取时间
    index.extractedAt = new Date().toISOString();

    // 保存
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    console.log(`\n✅ 已更新 index.json`);
    console.log(`   Mobile 规则总数: ${index.categoryStats.mobile}`);
    console.log(`   总规则数: ${index.totalRules}`);

  } catch (error) {
    console.error(`❌ 更新 index.json 失败: ${error.message}`);
  }
}

/**
 * 更新映射文件
 */
async function updateMapping(addedRules) {
  const mappingPath = path.join(process.cwd(), 'scripts', 'rule-category-mapping.js');
  
  try {
    let mappingContent = await fs.readFile(mappingPath, 'utf-8');
    
    for (const rule of addedRules) {
      if (rule) {
        // 在 mobile 类别中添加映射
        const ruleKey = rule.name;
        const displayName = rule.displayName;
        
        // 查找 mobile 类别的结束位置
        const mobileStart = mappingContent.indexOf("mobile: {");
        if (mobileStart !== -1) {
          // 查找 mobile 类别的结束位置（下一个类别或 closing brace）
          let mobileEnd = mappingContent.indexOf("  },\n  //", mobileStart);
          if (mobileEnd === -1) {
            mobileEnd = mappingContent.indexOf("  }\n  },", mobileStart);
          }
          
          if (mobileEnd !== -1) {
            // 在结束前添加新映射
            const newMapping = `    '${ruleKey}': '${displayName}',\n`;
            mappingContent = mappingContent.slice(0, mobileEnd) + newMapping + mappingContent.slice(mobileEnd);
            console.log(`   ✅ 已更新映射: ${ruleKey} → ${displayName}`);
          }
        }
      }
    }
    
    await fs.writeFile(mappingPath, mappingContent, 'utf-8');
    console.log(`\n✅ 已更新 rule-category-mapping.js`);

  } catch (error) {
    console.error(`❌ 更新映射文件失败: ${error.message}`);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('📱 添加缺失的 Mobile Development 规则\n');
  console.log('请提供规则信息，格式如下：\n');
  console.log('方式 1 - GitHub 目录名称:');
  console.log('  {');
  console.log('    ruleName: "React Native Expo",');
  console.log('    source: { type: "github", dirName: "react-native-expo-cursorrules-prompt-file" }');
  console.log('  }\n');
  console.log('方式 2 - 直接 URL:');
  console.log('  {');
  console.log('    ruleName: "React Native Expo",');
  console.log('    source: { type: "url", url: "https://raw.githubusercontent.com/..." }');
  console.log('  }\n');
  console.log('方式 3 - 直接内容:');
  console.log('  {');
  console.log('    ruleName: "React Native Expo",');
  console.log('    source: { type: "content", content: "规则内容...", fileName: "react-native-expo.cursorrules" }');
  console.log('  }\n');

  // 示例：添加规则
  // 用户可以通过修改这个数组来添加规则
  const rulesToAdd = [
    // 示例格式（用户需要填写实际信息）
    // {
    //   ruleName: "React Native Expo",
    //   source: {
    //     type: "github", // 或 "url" 或 "content"
    //     dirName: "react-native-expo-cursorrules-prompt-file" // GitHub 目录名称
    //     // 或 url: "https://..." // 直接 URL
    //     // 或 content: "...", fileName: "..." // 直接内容
    //   }
    // }
  ];

  if (rulesToAdd.length === 0) {
    console.log('⚠️  请在脚本中填写 rulesToAdd 数组，或通过命令行参数提供规则信息');
    console.log('\n使用示例:');
    console.log('  node scripts/add-missing-mobile-rules.js --rule "React Native Expo" --github-dir "react-native-expo-cursorrules-prompt-file"');
    return;
  }

  const addedRules = [];
  
  for (const rule of rulesToAdd) {
    const result = await addRule(rule.ruleName, rule.source);
    if (result) {
      addedRules.push(result);
    }
  }

  if (addedRules.length > 0) {
    await updateIndex(addedRules);
    await updateMapping(addedRules);
    console.log(`\n✅ 成功添加 ${addedRules.length} 个规则`);
  } else {
    console.log('\n⚠️  未添加任何规则');
  }
}

// 处理命令行参数
const args = process.argv.slice(2);
if (args.length > 0) {
  // 解析命令行参数
  let currentRule = null;
  const rules = [];
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--rule') {
      if (currentRule) rules.push(currentRule);
      currentRule = { ruleName: args[++i], source: {} };
    } else if (args[i] === '--github-dir') {
      if (currentRule) currentRule.source = { type: 'github', dirName: args[++i] };
    } else if (args[i] === '--url') {
      if (currentRule) currentRule.source = { type: 'url', url: args[++i] };
    } else if (args[i] === '--file') {
      if (currentRule) currentRule.source.fileName = args[++i];
    }
  }
  if (currentRule) rules.push(currentRule);
  
  if (rules.length > 0) {
    (async () => {
      const addedRules = [];
      for (const rule of rules) {
        const result = await addRule(rule.ruleName, rule.source);
        if (result) addedRules.push(result);
      }
      if (addedRules.length > 0) {
        await updateIndex(addedRules);
        await updateMapping(addedRules);
      }
    })();
  } else {
    main();
  }
} else {
  main();
}

