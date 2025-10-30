# 架构设计文档

## 层级规则生成机制

### 设计理念

Cursor Rules Generator 采用**智能层级规则生成**机制，根据项目的实际结构自动决定规则文件的放置位置：

- **单体项目**：所有规则放在项目根目录 `.cursor/rules/`
- **多模块项目**：全局规则 + 模块特定规则分层放置

### 规则层级结构

#### 1. 全局规则（Global Rules）

**位置**：`项目根目录/.cursor/rules/`

**作用范围**：整个项目

**适用场景**：
- 单体应用项目
- 多模块项目的通用规范
- 跨模块的共享约定

**示例文件**：
```
my-project/
  .cursor/
    rules/
      00-global-rules.mdc    # 全局开发规则
```

#### 2. 模块规则（Module Rules）

**位置**：`各模块目录/.cursor/rules/`

**作用范围**：该模块及其子目录

**适用场景**：
- Monorepo 项目中的各个包
- 前后端分离项目中的 frontend/backend
- 微服务架构中的各个服务

**示例文件**：
```
my-monorepo/
  .cursor/
    rules/
      00-global-rules.mdc    # 全局规则
  
  packages/
    web/
      .cursor/
        rules/
          web-rules.mdc      # web 包的规则
    
    api/
      .cursor/
        rules/
          api-rules.mdc      # api 包的规则
    
    shared/
      .cursor/
        rules/
          shared-rules.mdc   # shared 包的规则
```

### 自动识别机制

#### 单体项目识别

当检测到以下情况时，判定为单体项目：

```typescript
// 只有一个模块（main）
modules.length === 1

// 或者用户选择不生成模块规则
includeModuleRules === false
```

**生成结果**：
```
my-app/
  .cursor/
    rules/
      00-global-rules.mdc    # 仅生成全局规则
```

#### Monorepo 项目识别

检测标志：
- 存在 `lerna.json`
- 存在 `pnpm-workspace.yaml`
- 存在 `packages/` 或 `apps/` 目录且包含多个子包

**生成结果**：
```
my-monorepo/
  .cursor/
    rules/
      00-global-rules.mdc     # Monorepo 通用规范
  
  packages/
    package-a/
      .cursor/
        rules/
          package-a-rules.mdc  # package-a 的特定规则
    
    package-b/
      .cursor/
        rules/
          package-b-rules.mdc  # package-b 的特定规则
```

#### 前后端分离项目识别

检测标志：
- 存在 `frontend/`, `client/`, `web/` 目录
- 存在 `backend/`, `server/`, `api/` 目录

**生成结果**：
```
my-fullstack-app/
  .cursor/
    rules/
      00-global-rules.mdc    # 全栈项目通用规范
  
  frontend/
    .cursor/
      rules/
        frontend-rules.mdc   # 前端开发规范
  
  backend/
    .cursor/
      rules/
        backend-rules.mdc    # 后端开发规范
  
  shared/
    .cursor/
      rules/
        shared-rules.mdc     # 共享代码规范
```

#### 微服务项目识别

检测标志：
- 存在 `docker-compose.yml`
- 多个目录包含 `Dockerfile`

**生成结果**：
```
my-microservices/
  .cursor/
    rules/
      00-global-rules.mdc      # 微服务通用规范
  
  services/
    user-service/
      .cursor/
        rules/
          user-service-rules.mdc
    
    order-service/
      .cursor/
        rules/
          order-service-rules.mdc
```

### Cursor 规则加载机制

Cursor 按照以下优先级加载规则：

1. **最近的规则**：从当前文件所在目录向上查找最近的 `.cursor/rules/`
2. **继承关系**：子目录的规则会继承父目录的规则
3. **优先级覆盖**：相同配置项，子目录规则优先级更高

**示例**：

当你在 `my-monorepo/packages/web/src/components/Button.tsx` 工作时：

```
加载顺序：
1. packages/web/.cursor/rules/web-rules.mdc       (最近，优先级最高)
2. .cursor/rules/00-global-rules.mdc              (全局，优先级较低)
```

生效的规则 = 全局规则 + web 模块规则（web 规则可覆盖全局规则）

### 规则内容差异

#### 全局规则内容

```markdown
---
title: my-project - 全局开发规则
description: 项目级通用规范
priority: 100
---

# 项目概述
- 技术栈总览
- 项目结构说明
- 通用开发规范

# 代码风格
- 命名规范
- 格式化规则
- 注释标准

# 最佳实践
- 框架级最佳实践
- 通用设计模式
- 质量标准
```

#### 模块规则内容

```markdown
---
title: frontend 模块规则
description: 前端模块特定规范
priority: 50
---

# frontend 模块

**类型：** 前端
**路径：** `frontend/`
**描述：** 前端模块

## 模块职责
- 负责用户界面展示和交互逻辑

## 开发指南
- React 组件开发规范
- 状态管理使用指南
- API 调用约定

## 注意事项
- 注意浏览器兼容性
- 优化打包体积
```

### 技术实现

#### 数据结构

```typescript
export interface CursorRule {
  scope: "global" | "module";
  moduleName?: string;
  modulePath?: string;  // 关键：决定规则文件写入位置
  content: string;
  fileName: string;
  priority: number;
}
```

#### 生成流程

```typescript
// 1. 生成全局规则
const globalRule: CursorRule = {
  scope: "global",
  modulePath: projectPath,  // 写入项目根目录
  content: "...",
  fileName: "00-global-rules.mdc",
  priority: 100,
};

// 2. 生成模块规则
for (const module of modules) {
  const moduleRule: CursorRule = {
    scope: "module",
    moduleName: module.name,
    modulePath: module.path,  // 写入模块目录
    content: "...",
    fileName: `${module.name}-rules.mdc`,
    priority: 50,
  };
}
```

#### 文件写入逻辑

```typescript
async writeRules(projectPath: string, rules: CursorRule[]): Promise<string[]> {
  for (const rule of rules) {
    // 根据 modulePath 确定写入位置
    const baseDir = rule.modulePath || projectPath;
    const rulesDir = path.join(baseDir, ".cursor", "rules");
    
    // 写入规则文件
    const filePath = path.join(rulesDir, rule.fileName);
    await FileUtils.writeFile(filePath, rule.content);
  }
}
```

### 使用场景示例

#### 场景 1: 创建 React + Express 全栈应用

**项目结构**：
```
my-fullstack-app/
  frontend/        # React 应用
  backend/         # Express API
  shared/          # 共享类型定义
```

**生成的规则**：
```
my-fullstack-app/
  .cursor/rules/
    00-global-rules.mdc          # TypeScript、Git、测试等通用规范
  
  frontend/.cursor/rules/
    frontend-rules.mdc           # React、组件、样式等前端规范
  
  backend/.cursor/rules/
    backend-rules.mdc            # Express、API、数据库等后端规范
  
  shared/.cursor/rules/
    shared-rules.mdc             # 类型定义、工具函数等共享代码规范
```

**在 frontend 工作时**：
- ✅ 加载全局规则（TypeScript、Git 等）
- ✅ 加载 frontend 规则（React 最佳实践）
- ❌ 不加载 backend 规则

**在 backend 工作时**：
- ✅ 加载全局规则
- ✅ 加载 backend 规则（Express 最佳实践）
- ❌ 不加载 frontend 规则

#### 场景 2: Monorepo 多包项目

**项目结构**：
```
my-monorepo/
  packages/
    ui-components/    # UI 组件库
    utils/            # 工具库
    app-web/          # Web 应用
    app-mobile/       # 移动应用
```

**生成的规则**：
```
my-monorepo/
  .cursor/rules/
    00-global-rules.mdc                    # Monorepo 管理、版本控制
  
  packages/ui-components/.cursor/rules/
    ui-components-rules.mdc                # 组件开发规范
  
  packages/utils/.cursor/rules/
    utils-rules.mdc                        # 工具函数规范
  
  packages/app-web/.cursor/rules/
    app-web-rules.mdc                      # Web 应用规范
  
  packages/app-mobile/.cursor/rules/
    app-mobile-rules.mdc                   # 移动应用规范
```

**开发 ui-components 时**：
- ✅ Monorepo 通用规范
- ✅ 组件库特定规范（可复用性、文档、测试）
- 🔄 不受应用层规范干扰

#### 场景 3: 微服务架构

**项目结构**：
```
my-microservices/
  services/
    auth-service/       # 认证服务
    user-service/       # 用户服务
    order-service/      # 订单服务
  shared/
    proto/              # gRPC proto 定义
    lib/                # 共享库
```

**生成的规则**：
```
my-microservices/
  .cursor/rules/
    00-global-rules.mdc                   # 微服务通用规范、通信协议
  
  services/auth-service/.cursor/rules/
    auth-service-rules.mdc                # 认证逻辑、安全规范
  
  services/user-service/.cursor/rules/
    user-service-rules.mdc                # 用户数据处理规范
  
  services/order-service/.cursor/rules/
    order-service-rules.mdc               # 订单业务规范
  
  shared/proto/.cursor/rules/
    proto-rules.mdc                       # Protocol Buffers 规范
```

### 优势

1. **精准适用**：规则只在需要的地方生效
2. **减少干扰**：前端开发者不会看到后端规范的提示
3. **独立维护**：各模块可以独立调整规则
4. **继承机制**：子模块自动继承全局规范
5. **性能优化**：Cursor 只加载相关规则，提升响应速度

### 配置选项

用户可以通过参数控制规则生成行为：

```typescript
// 只生成全局规则（即使是多模块项目）
generate_cursor_rules({
  projectPath: "/path/to/project",
  includeModuleRules: false  // 禁用模块规则
})

// 生成全局 + 模块规则（默认）
generate_cursor_rules({
  projectPath: "/path/to/project",
  includeModuleRules: true   // 启用模块规则
})
```

### 最佳实践

#### 1. 全局规则应包含的内容

- ✅ 代码风格约定（Prettier、ESLint 配置）
- ✅ Git commit 规范
- ✅ 通用命名约定
- ✅ 文档要求
- ✅ 测试标准

#### 2. 模块规则应包含的内容

- ✅ 模块特定的框架使用规范
- ✅ 模块内部文件组织
- ✅ 模块间通信约定
- ✅ 模块专属的最佳实践

#### 3. 避免的内容

- ❌ 在模块规则中重复全局规则
- ❌ 在全局规则中包含模块特定细节
- ❌ 规则过于详细导致难以维护

### 故障排查

#### 问题：规则没有生效

**可能原因**：
1. Cursor 没有重新加载规则
2. 规则文件格式错误
3. 规则优先级被覆盖

**解决方案**：
1. 重启 Cursor
2. 检查 `.mdc` 文件的 front matter 格式
3. 检查 priority 值

#### 问题：模块规则没有生成

**可能原因**：
1. `includeModuleRules` 设置为 false
2. 项目未被识别为多模块结构
3. 模块检测失败

**解决方案**：
1. 使用 `analyze_project` 查看模块识别结果
2. 确保模块目录包含 `package.json` 或其他标识文件
3. 手动调整项目结构以符合检测条件

---

## 总结

层级规则生成机制使 Cursor Rules Generator 能够智能适应不同的项目结构，为开发者提供精准、相关的开发指导。无论是简单的单体应用还是复杂的 Monorepo/微服务架构，都能获得恰当的规则配置。

