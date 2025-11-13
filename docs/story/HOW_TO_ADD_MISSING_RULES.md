# 如何添加缺失的 Mobile Development 规则

## 快速开始

### 方式 1：提供 GitHub 目录名称（推荐）

只需告诉我规则在 GitHub 仓库中的目录名称，例如：

```
规则名称: React Native Expo
目录名称: react-native-expo-cursorrules-prompt-file
```

我会自动从 GitHub 提取内容。

### 方式 2：提供直接链接

提供规则文件的直接链接：

```
规则名称: React Native Expo
链接: https://raw.githubusercontent.com/PatrickJS/awesome-cursorrules/main/rules/react-native-expo-cursorrules-prompt-file/.cursorrules
```

### 方式 3：提供实际内容

直接提供规则文件的内容：

```
规则名称: React Native Expo
内容: [粘贴规则内容]
```

## 需要添加的规则

根据文档，以下规则需要添加：

1. **React Native Expo**
2. **SwiftUI Guidelines**
3. **TypeScript (Expo, Jest, Detox)**
4. **UIKit Guidelines**
5. **NativeScript**

## 使用脚本添加

你也可以使用提供的脚本手动添加：

```bash
# 方式 1: 使用 GitHub 目录名称
node scripts/add-missing-mobile-rules.js \
  --rule "React Native Expo" \
  --github-dir "react-native-expo-cursorrules-prompt-file"

# 方式 2: 使用直接 URL
node scripts/add-missing-mobile-rules.js \
  --rule "React Native Expo" \
  --url "https://raw.githubusercontent.com/..." \
  --file "react-native-expo.cursorrules"
```

## 我会做什么

当你提供规则信息后，我会：

1. ✅ 从 GitHub 或链接提取规则内容
2. ✅ 保存到 `docs/story/awesome-cursorrules-samples/mobile/` 目录
3. ✅ 更新 `index.json` 文件
4. ✅ 更新 `rule-category-mapping.js` 映射文件
5. ✅ 确保规则能被正确分类和匹配

## 提供信息格式

请按以下格式提供（选择一种方式）：

### 格式 1：GitHub 目录名称（最简单）
```
React Native Expo: react-native-expo-cursorrules-prompt-file
SwiftUI Guidelines: swiftui-guidelines-cursorrules-prompt-file
```

### 格式 2：完整链接
```
React Native Expo: https://raw.githubusercontent.com/PatrickJS/awesome-cursorrules/main/rules/react-native-expo-cursorrules-prompt-file/.cursorrules
```

### 格式 3：实际内容
```
React Native Expo:
[粘贴完整的 .cursorrules 文件内容]
```

你可以一次性提供所有缺失的规则，我会批量处理。

