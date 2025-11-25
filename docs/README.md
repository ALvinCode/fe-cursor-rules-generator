# 文档与项目结构索引

> 本目录用于统一维护架构说明、使用手册和运维记录，方便团队快速定位需要的信息。

## 1. 文档分组

| 分组 | 说明 | 文件 |
|------|------|------|
| **Architecture** | 系统架构、规则生成策略、历史重构记录 | `RULES_GENERATION_LOGIC.md`, `PROJECT_REFACTORING.md` |
| **Guides** | 对外分享、团队协作指南、风险防范 | `TECH_SHARING.md`, `CUSTOM_RULES_TEMPLATE.md`, `guides/PREVENT_AI_MODIFICATION.md` |
| **Reports** | 问题排查、技术债记录（根目录下的 `PROBLEM_ANALYSIS.md`） | `../PROBLEM_ANALYSIS.md` |

> 💡 **建议**：新增文档时先判断属于哪一类，保持结构清晰，便于知识沉淀。

## 2. 源码目录速览

```text
src/
├── core/            # ProjectAnalyzer / RulesGenerator / FileWriter 等核心管线
├── analyzers/       # TechStackDetector / ModuleDetector / PracticeAnalyzer 等
├── generators/      # 框架匹配、需求分析、建议收集器
├── validators/      # ConsistencyChecker、RuleValidator、MarkdownlintValidator
├── integrations/    # Context7、最佳实践搜索
└── utils/           # FileUtils、Logger 等基础能力
```

## 3. 推荐维护流程

1. **新增功能** → 在 Architecture 区域补充设计或规则说明。
2. **对外分享** → 更新 Guides 文档，保持对外口径一致。
3. **排查问题** → 在 `PROBLEM_ANALYSIS.md` 记录风险、决定是否转为 Issue。
4. **移除/替换文档** → 先更新此索引，确保文档引用链不断。

---

如需更细粒度的索引，可在各分组下创建子目录（例如 `docs/architecture/`、`docs/guides/`，当前版本保持扁平结构以减少迁移成本）。EOF