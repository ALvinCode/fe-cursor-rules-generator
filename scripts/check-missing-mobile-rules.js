#!/usr/bin/env node
/**
 * 检查缺失的 Mobile Development 规则
 * 对比文档中列出的规则和实际提取到的规则
 */

import https from 'https';
import fs from 'fs/promises';
import path from 'path';

const GITHUB_API_BASE = 'https://api.github.com';
const REPO = 'PatrickJS/awesome-cursorrules';
const RULES_DIR = 'rules';

// 文档中列出的 Mobile Development 规则
const DOCUMENTED_MOBILE_RULES = [
  'React Native Expo',
  'SwiftUI Guidelines',
  'TypeScript (Expo, Jest, Detox)',
  'Android Native (Jetpack Compose)',
  'Flutter Expert',
  'UIKit Guidelines',
  'NativeScript'
];

// 可能的规则目录名称变体
const POSSIBLE_NAMES = {
  'React Native Expo': [
    'react-native-expo-cursorrules-prompt-file',
    'react-native-expo',
    'expo-react-native',
    'reactnative-expo'
  ],
  'SwiftUI Guidelines': [
    'swiftui-guidelines-cursorrules-prompt-file',
    'swiftui-guidelines',
    'swiftui',
    'swift-ui'
  ],
  'TypeScript (Expo, Jest, Detox)': [
    'typescript-expo-jest-detox-cursorrules-prompt-file',
    'typescript-expo-jest-detox',
    'expo-jest-detox',
    'expo-typescript-detox'
  ],
  'Android Native (Jetpack Compose)': [
    'android-native-jetpack-compose-cursorrules-prompt-file',
    'android-jetpack-compose-cursorrules-prompt-file',
    'android-jetpack-compose',
    'jetpack-compose'
  ],
  'Flutter Expert': [
    'flutter-expert-cursorrules-prompt-file',
    'flutter-app-expert-cursorrules-prompt-file',
    'flutter-expert',
    'flutter'
  ],
  'UIKit Guidelines': [
    'uikit-guidelines-cursorrules-prompt-file',
    'uikit-guidelines',
    'uikit',
    'ui-kit'
  ],
  'NativeScript': [
    'nativescript-cursorrules-prompt-file',
    'nativescript',
    'nativescript-cursorrules'
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
  try {
    const result = await fetchGitHubAPI(url);
    if (Array.isArray(result)) {
      return result;
    } else if (result.message) {
      throw new Error(`GitHub API 错误: ${result.message}`);
    }
    return [];
  } catch (error) {
    console.error(`获取目录 ${dirPath} 失败:`, error.message);
    return [];
  }
}

/**
 * 检查缺失的规则
 */
async function checkMissingRules() {
  console.log('🔍 检查 Mobile Development 规则...\n');

  try {
    // 1. 获取 rules 目录内容
    console.log('📂 获取 rules 目录...');
    const rulesDir = await getDirectoryContents(RULES_DIR);
    
    if (!Array.isArray(rulesDir)) {
      console.error('无法获取 rules 目录');
      return;
    }

    // 2. 提取所有目录名称
    const allRuleNames = rulesDir
      .filter(item => item.type === 'dir')
      .map(item => item.name.toLowerCase());

    console.log(`✅ 找到 ${allRuleNames.length} 个规则目录\n`);

    // 3. 检查每个文档中列出的规则
    console.log('📋 检查文档中列出的规则：\n');
    
    const foundRules = [];
    const missingRules = [];

    for (const ruleName of DOCUMENTED_MOBILE_RULES) {
      const possibleNames = POSSIBLE_NAMES[ruleName] || [];
      let found = false;
      let actualName = null;

      for (const possibleName of possibleNames) {
        const lowerPossible = possibleName.toLowerCase();
        const match = allRuleNames.find(name => 
          name === lowerPossible || 
          name.includes(lowerPossible) || 
          lowerPossible.includes(name)
        );
        
        if (match) {
          found = true;
          actualName = match;
          break;
        }
      }

      if (found) {
        foundRules.push({ documented: ruleName, actual: actualName });
        console.log(`✅ ${ruleName}`);
        console.log(`   实际名称: ${actualName}`);
      } else {
        missingRules.push(ruleName);
        console.log(`❌ ${ruleName} - 未找到`);
        console.log(`   尝试的名称: ${possibleNames.join(', ')}`);
      }
      console.log('');
    }

    // 4. 查找可能相关的其他规则
    console.log('\n🔍 查找其他可能的 Mobile 相关规则：\n');
    const mobileKeywords = ['mobile', 'expo', 'react-native', 'flutter', 'swift', 'android', 'ios', 'uikit', 'nativescript', 'detox'];
    const relatedRules = allRuleNames.filter(name => {
      return mobileKeywords.some(keyword => name.includes(keyword));
    });

    for (const rule of relatedRules) {
      const alreadyFound = foundRules.some(f => f.actual === rule);
      if (!alreadyFound) {
        console.log(`📱 ${rule} (可能相关)`);
      }
    }

    // 5. 总结
    console.log('\n📊 总结：\n');
    console.log(`文档中列出的规则: ${DOCUMENTED_MOBILE_RULES.length}`);
    console.log(`已找到的规则: ${foundRules.length}`);
    console.log(`缺失的规则: ${missingRules.length}`);
    
    if (missingRules.length > 0) {
      console.log('\n缺失的规则列表:');
      missingRules.forEach(rule => console.log(`  - ${rule}`));
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

// 执行检查
checkMissingRules().catch(console.error);

