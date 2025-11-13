# Mobile Development 规则分析

## 问题说明

文档中列出了 7 个 Mobile Development 规则，但实际提取到的只有 3 个。

## 文档中列出的规则（7个）

1. **React Native Expo** - Cursor rules for React Native Expo development.
2. **SwiftUI Guidelines** - Cursor rules for SwiftUI development guidelines.
3. **TypeScript (Expo, Jest, Detox)** - Cursor rules for TypeScript development with Expo, Jest, and Detox integration.
4. **Android Native (Jetpack Compose)** - Cursor rules for Android development with Jetpack Compose integration.
5. **Flutter Expert** - Cursor rules for Flutter development with expert integration.
6. **UIKit Guidelines** - Cursor rules for UIKit development guidelines.
7. **NativeScript** - Cursor rules for NativeScript development.

## 实际提取到的规则（3个）

根据 `index.json` 和 `mobile/` 目录，实际提取到的规则：

1. ✅ **android-jetpack-compose-cursorrules-prompt-file** → 对应 "Android Native (Jetpack Compose)"
2. ✅ **flutter-app-expert-cursorrules-prompt-file** → 对应 "Flutter Expert"
3. ✅ **flutter-riverpod-cursorrules-prompt-file** → 对应 "Flutter (Riverpod)"（文档中未列出，但实际存在）

## 缺失的规则（4个）

以下规则在文档中列出，但在仓库中未找到：

1. ❌ **React Native Expo** - 可能名称不同或尚未添加到仓库
2. ❌ **SwiftUI Guidelines** - 可能名称不同或尚未添加到仓库
3. ❌ **TypeScript (Expo, Jest, Detox)** - 可能名称不同或尚未添加到仓库
4. ❌ **UIKit Guidelines** - 可能名称不同或尚未添加到仓库
5. ❌ **NativeScript** - 可能名称不同或尚未添加到仓库

## 可能的原因

1. **规则名称不匹配**：文档中的链接指向的规则目录名称可能与实际仓库中的名称不同
2. **规则尚未添加**：这些规则可能在文档更新时被列出，但尚未实际添加到 awesome-cursorrules 仓库
3. **规则被移除或重命名**：某些规则可能已被移除或重命名
4. **提取脚本限制**：由于 GitHub API 速率限制，可能未完全提取所有规则

## 解决方案

### 方案 1：手动检查仓库

访问 [awesome-cursorrules 仓库](https://github.com/PatrickJS/awesome-cursorrules/tree/main/rules)，手动查找以下可能的目录名称：

- `react-native-expo-*`
- `swiftui-*`
- `expo-jest-detox-*`
- `uikit-*`
- `nativescript-*`

### 方案 2：更新映射文件

根据实际仓库中的目录名称，更新 `scripts/rule-category-mapping.js` 中的映射。

### 方案 3：使用关键词匹配

如果规则名称不匹配，系统会使用关键词匹配作为后备方案，这些规则可能会被分类到 `mobile` 类别。

## 当前映射状态

已更新的映射（基于实际提取结果）：

```javascript
mobile: {
  'android-jetpack-compose-cursorrules-prompt-file': 'Android Native (Jetpack Compose)',
  'flutter-app-expert-cursorrules-prompt-file': 'Flutter Expert',
  'flutter-riverpod-cursorrules-prompt-file': 'Flutter (Riverpod)',
  // 以下规则需要根据实际仓库中的名称更新
  'react-native-expo-cursorrules-prompt-file': 'React Native Expo',
  'swiftui-guidelines-cursorrules-prompt-file': 'SwiftUI Guidelines',
  'typescript-expo-jest-detox-cursorrules-prompt-file': 'TypeScript (Expo, Jest, Detox)',
  'uikit-guidelines-cursorrules-prompt-file': 'UIKit Guidelines',
  'nativescript-cursorrules-prompt-file': 'NativeScript'
}
```

## 建议

1. **检查 awesome-cursorrules 仓库**：确认这些规则是否真的存在，以及它们的实际目录名称
2. **更新映射文件**：根据实际目录名称更新映射
3. **使用关键词匹配**：作为后备方案，系统会根据关键词（如 "expo", "swift", "uikit" 等）自动分类

