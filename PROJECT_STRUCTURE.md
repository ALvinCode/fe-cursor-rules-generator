# 📁 项目结构说明

> Cursor Rules Generator v1.3.5 最终项目结构

---

## 🗂️ 目录结构

```
cursor-rules-generator/
│
├── 📄 核心文档（根目录）
│   ├── README.md                      # 英文主文档
│   ├── README.zh-CN.md                # 中文详细文档
│   ├── CHANGELOG.md                   # 版本更新日志
│   ├── PROJECT_STORY.md               # 项目开发故事（分享用）
│   └── LICENSE                        # MIT 许可证
│
├── ⚙️ 配置文件
│   ├── package.json                   # 项目配置和依赖
│   ├── package-lock.json              # 依赖锁定
│   ├── tsconfig.json                  # TypeScript 配置
│   ├── .gitignore                     # Git 忽略规则
│   └── mcp-config-example.json        # MCP Server 配置示例
│
├── 📚 docs/ - 文档目录
│   │
│   ├── architecture/                  # 架构设计文档
│   │   ├── ARCHITECTURE.md            # 系统架构说明
│   │   ├── DESIGN_v1.3.md             # v1.3 重构设计
│   │   └── HIERARCHY_EXAMPLE.md       # 层级规则示例
│   │
│   └── guides/                        # 使用指南
│       ├── GETTING_STARTED.md         # 快速开始指南
│       ├── TESTING_GUIDE.md           # 完整测试指南
│       └── HOW_TO_TEST.md             # 测试方法说明
│
├── 📜 scripts/ - 脚本目录
│   └── quick-test.sh                  # 快速测试脚本
│
└── 💻 src/ - 源代码
    │
    ├── index.ts                       # MCP Server 主入口
    ├── types.ts                       # TypeScript 类型定义
    │
    ├── modules/                       # 核心功能模块
    │   ├── project-analyzer.ts        # 项目文件收集
    │   ├── tech-stack-detector.ts     # 技术栈检测
    │   ├── module-detector.ts         # 模块结构识别
    │   ├── code-analyzer.ts           # 代码特征分析
    │   ├── practice-analyzer.ts       # 项目实践分析
    │   ├── config-parser.ts           # 配置文件解析
    │   ├── custom-pattern-detector.ts # 自定义模式检测
    │   ├── file-structure-learner.ts  # 文件结构学习
    │   ├── router-detector.ts         # 路由系统检测
    │   ├── consistency-checker.ts     # 一致性检查
    │   ├── rules-generator.ts         # 规则生成引擎
    │   ├── file-writer.ts             # 文件写入器
    │   ├── rule-validator.ts          # 规则验证器
    │   └── context7-integration.ts    # Context7 集成
    │
    └── utils/                         # 工具类
        └── file-utils.ts              # 文件操作工具
```

---

## 📊 文件统计

### 总览

| 类别 | 数量 | 说明 |
|------|------|------|
| **核心文档** | 5 个 | 根目录的主要文档 |
| **配置文件** | 5 个 | 项目配置 |
| **架构文档** | 3 个 | docs/architecture/ |
| **使用指南** | 3 个 | docs/guides/ |
| **脚本文件** | 1 个 | scripts/ |
| **源代码** | 17 个 | src/ |
| **总计** | **34 个** | - |

### 对比清理前后

| 项目 | 清理前 | 清理后 | 减少 |
|------|--------|--------|------|
| 根目录文档 | 27 个 | 5 个 | -22 个 |
| 总文件数 | 50+ 个 | 34 个 | -16+ 个 |
| 目录结构 | 扁平 | 分层 | 更清晰 |

---

## 📖 文档说明

### 根目录文档（5 个）

**README.md**：
- 英文主文档
- 项目介绍和快速开始
- 适合 GitHub 展示

**README.zh-CN.md**：
- 中文详细文档
- 完整的功能说明和使用指南
- 包含示例和 FAQ

**CHANGELOG.md**：
- 版本更新日志
- 记录所有版本的变更
- v1.0.0 到 v1.3.5 的完整历史

**PROJECT_STORY.md**：
- 项目开发故事
- 技术亮点和经验分享
- 适合技术博客和分享

**LICENSE**：
- MIT 许可证

### docs/architecture/（架构文档）

**ARCHITECTURE.md**：
- 系统架构设计
- 层级规则生成机制
- 技术实现细节

**DESIGN_v1.3.md**：
- v1.3 版本的重构设计
- 文件拆分方案
- 符合官方规范的设计思路

**HIERARCHY_EXAMPLE.md**：
- 多模块项目示例
- 层级规则实际效果
- 各种项目类型的对比

### docs/guides/（使用指南）

**GETTING_STARTED.md**：
- 3 分钟快速开始
- 安装配置步骤
- 基本使用方法

**TESTING_GUIDE.md**：
- 完整的测试流程
- 多种测试场景
- 测试检查清单

**HOW_TO_TEST.md**：
- 具体的测试方法
- 在其他项目中使用
- 故障排查

---

## 💻 源代码结构

### src/index.ts

**MCP Server 主入口**：
- 注册 6 个 MCP 工具
- 协调各模块执行
- 处理工具调用请求

### src/types.ts

**TypeScript 类型定义**：
- 所有接口和类型
- 保证类型安全

### src/modules/（14 个核心模块）

**分析模块**（9 个）：
- project-analyzer.ts - 文件收集
- tech-stack-detector.ts - 技术栈检测
- module-detector.ts - 模块识别
- code-analyzer.ts - 代码特征
- practice-analyzer.ts - 项目实践
- config-parser.ts - 配置解析
- custom-pattern-detector.ts - 自定义检测
- file-structure-learner.ts - 文件结构
- router-detector.ts - 路由检测

**规则相关**（3 个）：
- rules-generator.ts - 规则生成（最大，2700+ 行）
- file-writer.ts - 文件写入
- rule-validator.ts - 规则验证

**其他**（2 个）：
- consistency-checker.ts - 一致性检查
- context7-integration.ts - Context7 集成

### src/utils/

**file-utils.ts**：
- 文件操作工具类
- 递归扫描、读写文件等

---

## 🎯 文件职责清晰化

### 根目录（10 个文件）

**用途**：
- 项目基本信息
- 配置文件
- 核心文档

**原则**：
- 只保留必需文档
- 配置文件集中
- 易于浏览

### docs/（分类文档）

**用途**：
- 详细的技术文档
- 使用指南和示例

**原则**：
- 按类型分目录
- architecture/ - 设计相关
- guides/ - 使用相关

### scripts/（脚本文件）

**用途**：
- 测试脚本
- 工具脚本

**原则**：
- 独立目录
- 易于维护

### src/（源代码）

**用途**：
- 所有 TypeScript 源代码

**原则**：
- 模块化设计
- 职责单一
- 易于扩展

---

## ✨ 清理成果

### 删除的文件（16 个）

**版本发布文档**（5 个）：
- BUGFIX_v1.2.1.md
- RELEASE_v1.1.0.md
- RELEASE_v1.2.0.md
- RELEASE_v1.3.0.md
- RELEASE_v1.3.3_FINAL.md

**版本总结**（5 个）：
- PROJECT_SUMMARY.md
- V1.1_SUMMARY.md
- V1.2_FINAL_SUMMARY.md
- V1.3_COMPLETE.md
- COMPLETE_GUIDE_v1.3.5.md

**临时文档**（6 个）：
- FINAL_README.md
- IMPROVEMENT_TODO_v1.2.md
- OPTIMIZATION_TODO.md
- QUICK_START_v1.1.md
- UPDATE_NOTES.md
- ROUTING_FEATURE.md
- TESTING.md

### 移动的文件（7 个）

**到 docs/architecture/**：
- ARCHITECTURE.md
- DESIGN_v1.3.md
- HIERARCHY_EXAMPLE.md

**到 docs/guides/**：
- TESTING_GUIDE.md
- HOW_TO_TEST.md
- GETTING_STARTED.md（新建）

**到 scripts/**：
- quick-test.sh

### 保留的核心文件（34 个）

**根目录**：10 个  
**docs/**：6 个  
**scripts/**：1 个  
**src/**：17 个  

---

## 🎯 优化效果

### 结构清晰

**之前**：
```
根目录 27 个文档，混乱
```

**现在**：
```
根目录 5 个核心文档，清晰
docs/ 分类文档，易找
```

### 易于维护

**之前**：
- 临时文件和正式文档混在一起
- 不知道哪个是最新的
- 难以快速找到需要的文档

**现在**：
- 正式文档在根目录
- 详细文档在 docs/
- 一目了然

### 便于导航

**文档索引清晰**：
- 想快速开始 → docs/guides/GETTING_STARTED.md
- 想了解架构 → docs/architecture/ARCHITECTURE.md
- 想看故事 → PROJECT_STORY.md
- 想看更新 → CHANGELOG.md

---

## 📝 后续维护建议

### 添加新文档时

**使用指南类**：
```
→ 放在 docs/guides/
```

**架构设计类**：
```
→ 放在 docs/architecture/
```

**临时笔记**：
```
→ 不要提交到仓库
→ 或放在 docs/drafts/（加入 .gitignore）
```

### 版本发布时

**更新**：
- CHANGELOG.md（记录变更）
- README.zh-CN.md（如有功能变化）

**不要**：
- 创建 RELEASE_vX.X.X.md（已有 CHANGELOG）
- 创建版本总结文档（临时文档）

---

**项目结构优化完成！从 50+ 个文件精简到 34 个，结构清晰、易于维护！** ✅

