# 🎯 Cursor Rules Generator v1.2 改进 TODO List

基于"尊重项目实践 + 渐进式改进"的核心理念

生成日期：2025-10-29

---

## 🎨 核心理念重新定位

### 从"强加最佳实践" → "基于现状的智能优化"

**旧理念**：

- ❌ 无论项目如何，都生成标准最佳实践
- ❌ 强制要求遵循某种规范
- ❌ 不考虑项目现有代码习惯

**新理念**：

- ✅ **分析现状** → 识别项目实际使用的模式
- ✅ **结合最佳实践** → 在现状基础上提供渐进式改进建议
- ✅ **按需生成** → 只为项目实际使用的功能生成规则
- ✅ **尊重架构** → 遵循项目的文件组织和设计思路

---

## 🔴 高优先级改进项（v1.2 核心）

### 1. 创建项目实际情况分析器 ⭐⭐⭐⭐⭐

**问题**：当前只识别"用了什么"，不识别"怎么用的"

**需要新建模块**：`src/modules/practice-analyzer.ts`

**分析内容**：

#### 1.1 错误处理模式分析

- [ ] **扫描所有 try-catch 代码块**
  - 识别项目实际使用的错误处理模式
  - 统计最常见的处理方式
  - 记录自定义错误类型

- [ ] **分析错误日志方式**
  - 识别使用 console.log/error 还是专业日志库
  - 记录日志格式和级别
  - 统计使用频率

**输出示例**：

```typescript
interface ErrorHandlingPattern {
  type: 'try-catch' | 'promise-catch' | 'error-boundary';
  frequency: number;
  examples: string[];
  customErrorTypes: string[];  // 如 ValidationError, NetworkError
  loggingMethod: 'console' | 'winston' | 'pino' | string;
}
```

**规则生成策略**：

```markdown
## 错误处理规范

### 项目当前实践
- 项目主要使用 try-catch 处理错误（发现 45 处）
- 使用 console.error 记录错误日志
- 自定义错误类型：ValidationError, ApiError

### 建议
- ✅ 继续使用现有的错误处理模式保持一致性
- 💡 短期：为 console.error 添加上下文信息（用户ID、请求ID等）
- 💡 长期：考虑引入结构化日志系统（如 winston）以便生产环境调试
```

#### 1.2 代码格式化配置分析

- [ ] **读取并解析配置文件**
  - .prettierrc / prettier.config.js
  - .eslintrc / eslint.config.js
  - .editorconfig
  - tsconfig.json（编译选项）

- [ ] **提取实际配置**
  - 缩进：tabs vs spaces，几个空格
  - 引号：单引号 vs 双引号
  - 分号：使用 vs 不使用
  - 行长度限制
  - 尾随逗号

**规则生成策略**：

```markdown
## 代码风格

### 项目配置（来自 .prettierrc）
- **缩进**：2 个空格
- **引号**：单引号
- **分号**：使用分号
- **行长度**：100 字符
- **尾随逗号**：es5

⚠️ 请严格遵循以上配置，保持项目代码风格一致。
生成代码时自动应用这些规则。
```

#### 1.3 组件库和样式方案分析

- [ ] **检测使用的 UI 库**
  - Material-UI (@mui)
  - Ant Design
  - Chakra UI
  - shadcn/ui
  - 其他

- [ ] **检测样式方案**
  - CSS Modules
  - styled-components
  - Emotion
  - Tailwind CSS
  - 内联样式
  - 传统 CSS/SCSS

- [ ] **分析组件文件结构**
  - 组件和样式是否分离
  - 样式文件命名规范
  - 组件导出方式

**规则生成策略**：

```markdown
## 组件和样式规范

### 项目当前使用
- UI 库：Material-UI (@mui/material)
- 样式方案：styled-components
- 组件结构：组件文件和样式代码在同一文件

### 开发规范
- ✅ 继续使用 Material-UI 组件，保持 UI 一致性
- ✅ 使用 styled-components 定义样式，遵循现有模式
- ⚠️ 避免混用其他 UI 库或样式方案
- 💡 遵循 Material-UI 的主题系统和设计令牌

### WCAG 无障碍要求
- 在使用 Material-UI 组件时，默认已包含基础无障碍支持
- 自定义组件需要添加适当的 ARIA 属性
- 确保颜色对比度符合要求（使用主题配色）
```

#### 1.4 自定义代码模式识别

- [ ] **识别自定义 Hooks（React 项目）**
  - 扫描 `use*.ts/tsx` 文件
  - 记录自定义 hooks 的名称和用途
  - 分析使用频率

- [ ] **识别自定义工具函数**
  - 扫描 utils/、helpers/、lib/ 目录
  - 记录常用工具函数
  - 分析使用频率和模式

- [ ] **识别自定义组合（Vue Composables）**
  - 扫描 composables/ 目录
  - 记录可复用的组合函数

**规则生成策略**：

```markdown
## 项目自定义工具

### 自定义 Hooks（优先使用）
项目定义了以下自定义 hooks，生成代码时应优先使用：

- `useAuth()` - 用户认证状态管理（使用频率：高）
  ```typescript
  const { user, login, logout } = useAuth();
  ```

- `useApiClient()` - API 调用封装（使用频率：高）

  ```typescript
  const api = useApiClient();
  const data = await api.get('/users');
  ```

- `useLocalStorage(key)` - 本地存储管理
  
### 自定义工具函数（优先使用）

- `formatDate(date, format)` - 日期格式化（位置：utils/date.ts）
- `validateEmail(email)` - 邮箱验证（位置：utils/validation.ts）
- `debounce(fn, delay)` - 防抖函数（位置：utils/timing.ts）

### 使用要求

⚠️ 生成新代码时，必须使用上述自定义工具，而非重新实现或使用第三方替代。
这保持了项目代码的一致性和可维护性。

示例：

```typescript
// ✅ 正确 - 使用项目自定义工具
import { formatDate } from '@/utils/date';
const displayDate = formatDate(new Date(), 'YYYY-MM-DD');

// ❌ 错误 - 不要重新实现
const displayDate = new Date().toISOString().split('T')[0];
```

```

#### 1.5 文件组织结构学习

- [ ] **分析项目目录结构**
  - 组件放在哪里（src/components、app/components 等）
  - 工具函数放在哪里
  - 类型定义放在哪里
  - API 相关代码放在哪里
  - 样式文件放在哪里

- [ ] **识别路径别名配置**
  - 读取 tsconfig.json 的 paths 配置
  - 读取 vite.config.ts / next.config.js 的 alias
  - 记录项目使用的导入路径模式

- [ ] **分析文件命名模式**
  - 组件文件命名（PascalCase.tsx vs index.tsx）
  - 是否使用 index 文件
  - 目录命名规范

**规则生成策略**：
```markdown
## 文件组织规范

### 项目结构
项目采用以下目录结构，生成代码时必须遵循：

```

src/
  ├── components/          # UI 组件
  │   ├── common/          # 通用组件
  │   └── features/        # 功能组件
  ├── hooks/               # 自定义 Hooks
  ├── utils/               # 工具函数
  ├── services/            # API 服务
  ├── types/               # 类型定义
  └── styles/              # 全局样式

```

### 路径别名（必须使用）
项目配置了以下路径别名：
- `@/` → `src/`
- `@components/` → `src/components/`
- `@hooks/` → `src/hooks/`
- `@utils/` → `src/utils/`

### 文件创建规则
**新建组件时**：
```

src/components/[category]/[ComponentName]/
  ├── index.tsx              # 组件实现
  ├── styles.ts              # 样式定义（styled-components）
  └── types.ts               # 组件类型（如需要）

```

**新建工具函数时**：
```

src/utils/[category].ts
或
src/utils/[category]/[functionName].ts

```

**导入示例**：
```typescript
// ✅ 正确 - 使用路径别名
import { Button } from '@components/common/Button';
import { formatDate } from '@utils/date';

// ❌ 错误 - 不要使用相对路径（除非同目录）
import { Button } from '../../../components/common/Button';
```

```

#### 1.6 API 调用模式分析

- [ ] **识别 HTTP 客户端**
  - fetch
  - axios
  - ky
  - 自定义封装

- [ ] **分析 API 调用模式**
  - 是否有统一的 API 客户端
  - 错误处理模式
  - 请求/响应拦截器
  - 认证处理方式

**规则生成策略**：
```markdown
## API 调用规范

### 项目实践
- 使用自定义的 `apiClient` 进行所有 API 调用（位置：services/api-client.ts）
- 已内置认证、错误处理、请求重试

### 使用方式
```typescript
// ✅ 正确 - 使用项目的 apiClient
import { apiClient } from '@/services/api-client';

const fetchUsers = async () => {
  const data = await apiClient.get('/users');
  return data;
};

// ❌ 错误 - 不要直接使用 fetch 或 axios
const fetchUsers = async () => {
  const response = await fetch('/api/users');
  return response.json();
};
```

### 错误处理

apiClient 已内置错误处理，无需手动 try-catch。
特殊情况需要自定义处理时：

```typescript
const data = await apiClient.get('/users').catch(error => {
  // 自定义处理
});
```

```

#### 1.7 Git Commit 规范分析

- [ ] **分析历史 commit 消息**
  - 使用 Git log 分析最近 100 条 commit
  - 识别是否使用 Conventional Commits
  - 识别实际的 commit 格式

**规则生成策略**：
```markdown
## Git Commit 规范

### 项目当前实践
分析最近的 commit 消息，项目使用以下格式：

- `feat: 添加用户登录功能`
- `fix: 修复分页bug`
- `docs: 更新README`

### 要求
继续遵循 Conventional Commits 规范：
- `feat:` - 新功能
- `fix:` - Bug 修复
- `docs:` - 文档更新
- `style:` - 代码格式化
- `refactor:` - 重构
- `test:` - 测试相关
- `chore:` - 构建/工具变更
```

---

## 🟡 中优先级改进项

### 2. 渐进式规则生成策略

**问题**：当前规则是"应该怎样"，而非"当前怎样 + 如何改进"

**改进**：

- [ ] **2.1 实现三段式规则结构**
  
  **新的规则模板**：

  ```markdown
  ## [功能名称]
  
  ### 项目当前实践
  - 描述项目实际使用的方式
  - 列出发现的模式和频率
  
  ### 短期建议（保持兼容）
  - 在现有基础上的小改进
  - 不影响现有架构
  
  ### 长期建议（可选）
  - 更好的实践方向
  - 需要重构才能实现
  ```

- [ ] **2.2 按功能使用情况生成规则**
  
  **逻辑**：

  ```typescript
  if (项目使用了该功能) {
    生成：当前实践 + 改进建议
  } else if (功能符合项目架构) {
    生成：简短介绍 + 如何添加
  } else {
    不生成该部分
  }
  ```

**实现位置**：`src/modules/rules-generator.ts` - 重构生成逻辑

### 3. 配置文件解析器

**问题**：当前忽略了项目的配置文件

**需要新建模块**：`src/modules/config-parser.ts`

- [ ] **3.1 解析 Prettier 配置**
  - .prettierrc
  - .prettierrc.json
  - prettier.config.js
  - package.json 中的 prettier 字段

- [ ] **3.2 解析 ESLint 配置**
  - .eslintrc
  - .eslintrc.json
  - eslint.config.js
  - package.json 中的 eslintConfig

- [ ] **3.3 解析 TypeScript 配置**
  - tsconfig.json
  - 提取重要的编译选项
  - 路径别名配置

- [ ] **3.4 解析构建工具配置**
  - vite.config.ts
  - next.config.js
  - webpack.config.js
  - 提取路径别名和环境变量

**输出**：

```typescript
interface ProjectConfig {
  prettier?: {
    tabWidth: number;
    useTabs: boolean;
    semi: boolean;
    singleQuote: boolean;
    printWidth: number;
    trailingComma: string;
  };
  eslint?: {
    rules: Record<string, any>;
    extends: string[];
  };
  typescript?: {
    strict: boolean;
    paths: Record<string, string[]>;
  };
  aliases: Record<string, string>;
}
```

**规则生成策略**：

```markdown
## 代码风格（基于项目配置）

### 项目配置（.prettierrc）
- 缩进：2 个空格
- 引号：单引号
- 分号：使用
- 行长度：100 字符

⚠️ 这些是项目的实际配置，请严格遵循。
Prettier 会自动格式化代码，无需手动调整。

### 路径别名（tsconfig.json）
```typescript
// 项目配置的路径别名，必须使用
import { Button } from '@/components/Button';  // ✅
import { Button } from '../../../components/Button';  // ❌
```

```

### 4. 自定义代码模式识别器

**需要新建模块**：`src/modules/custom-pattern-detector.ts`

- [ ] **4.1 识别自定义 Hooks（React）**
  
  **扫描逻辑**：
  ```typescript
  // 扫描所有 use*.ts/tsx 文件
  // 排除 node_modules
  // 记录 hook 名称、参数、返回值
  ```

  **输出**：

  ```typescript
  interface CustomHook {
    name: string;
    filePath: string;
    imports: string[];
    usage: string;  // 如何使用的示例
    frequency: number;  // 在项目中使用次数
  }
  ```

- [ ] **4.2 识别自定义工具函数**
  
  **扫描逻辑**：

  ```typescript
  // 扫描 utils/、helpers/、lib/ 目录
  // 分析导出的函数
  // 识别使用频率
  ```

- [ ] **4.3 识别项目特有的设计模式**
  - HOC（Higher-Order Components）
  - Render Props
  - 自定义 Context
  - 工厂函数
  - 单例模式

**规则生成策略**：

```markdown
## 项目自定义工具（必须使用）

### 自定义 Hooks
以下是项目定义的自定义 hooks，生成代码时必须使用：

**useAuth** (使用频率：32 次)
```typescript
import { useAuth } from '@/hooks/useAuth';

const { user, isAuthenticated, login, logout } = useAuth();
```

用途：用户认证状态管理，包含登录/登出逻辑。

**useApiQuery** (使用频率：28 次)

```typescript
import { useApiQuery } from '@/hooks/useApiQuery';

const { data, loading, error } = useApiQuery('/api/users');
```

用途：封装 API 调用、加载状态和错误处理。

### 自定义工具函数

**formatCurrency** (utils/format.ts)

```typescript
import { formatCurrency } from '@/utils/format';
const price = formatCurrency(1234.56); // "¥1,234.56"
```

**validateForm** (utils/validation.ts)

```typescript
import { validateForm } from '@/utils/validation';
const errors = validateForm(formData, schema);
```

### ⚠️ 重要规则

1. 不要重新实现已有的工具函数
2. 不要引入第三方库来做已有工具能做的事
3. 新增工具函数时，遵循现有工具的命名和组织方式

```

#### 1.8 文件组织结构分析

- [ ] **学习项目的目录结构**
  - 统计每个目录的用途
  - 分析文件放置规律
  - 识别模块化组织方式

- [ ] **识别命名模式**
  - 组件命名规律
  - 文件夹命名规律
  - 是否使用 index 文件

**规则生成策略**：
```markdown
## 文件组织规范（基于项目实际结构）

### 目录结构
项目采用功能模块化组织：

```

src/
  ├── features/                    # 功能模块（按业务）
  │   ├── auth/
  │   │   ├── components/
  │   │   ├── hooks/
  │   │   ├── services/
  │   │   └── index.ts
  │   └── dashboard/
  │       ├── components/
  │       └── index.ts
  ├── shared/                      # 共享代码
  │   ├── components/              # 通用组件
  │   ├── hooks/
  │   └── utils/
  └── core/                        # 核心功能
      ├── api/
      ├── auth/
      └── config/

```

### 新建功能模块时
1. 在 features/ 下创建新目录
2. 按照以上结构组织代码
3. 通过 index.ts 导出公共 API

### 新建组件时
- 通用组件 → `src/shared/components/`
- 功能组件 → `src/features/[feature]/components/`

### ⚠️ 禁止的做法
- ❌ 不要在根目录直接创建组件
- ❌ 不要跨功能模块直接导入（使用共享组件）
- ❌ 不要破坏模块的边界
```

---

## 🟢 低优先级改进项

### 5. 代码实例学习

- [ ] **5.1 从实际代码中提取示例**
  - 找到项目中的优秀代码示例
  - 作为规则的参考示例
  - 替代通用的示例

### 6. 规则冲突检测

- [ ] **6.1 检测最佳实践与项目实践的冲突**
  - 标记可能的冲突点
  - 提供迁移建议
  - 评估改动影响

---

## 🔧 实现策略

### 新增模块

1. **practice-analyzer.ts** - 项目实践分析器
   - analyzeErrorHandling()
   - analyzeLoggingMethod()
   - analyzeComponentPatterns()
   - analyzeStyleApproach()

2. **config-parser.ts** - 配置文件解析器
   - parsePrettierConfig()
   - parseESLintConfig()
   - parseTSConfig()
   - extractPathAliases()

3. **custom-pattern-detector.ts** - 自定义模式检测器
   - detectCustomHooks()
   - detectCustomUtils()
   - detectCustomPatterns()

4. **file-structure-learner.ts** - 文件结构学习器
   - analyzeDirectoryStructure()
   - identifyNamingPatterns()
   - extractOrganizationRules()

### 修改现有模块

5. **rules-generator.ts** - 规则生成策略调整
   - 使用三段式结构（当前实践 + 短期 + 长期）
   - 按需生成（检查功能是否存在）
   - 整合配置和实际分析结果

### 数据流

```
1. 收集文件
   ↓
2. 检测技术栈
   ↓
3. 解析配置文件 ✨ 新增
   ↓
4. 分析实际代码实践 ✨ 新增
   ↓
5. 识别自定义模式 ✨ 新增
   ↓
6. 学习文件组织 ✨ 新增
   ↓
7. 生成规则（三段式 + 按需）✨ 调整
```

---

## 📝 具体改进示例

### 改进前（v1.1.0）

```markdown
## 错误处理规范

### JavaScript/TypeScript 错误处理

**Try-Catch 使用**：
```typescript
try {
  const data = await fetchUserData(userId);
  return processData(data);
} catch (error) {
  if (error instanceof NetworkError) {
    logger.error('Network error:', error);
    throw new UserFacingError('无法连接到服务器');
  }
  throw error;
}
```

```

**问题**：
- ❌ 假设项目应该这样做
- ❌ 没有分析项目实际怎么做
- ❌ 可能与项目实践不一致

### 改进后（v1.2 目标）

```markdown
## 错误处理规范

### 项目当前实践
分析发现项目采用以下错误处理模式：

**主要模式**：统一错误处理（45 处使用）
```typescript
// 项目实际代码模式
const fetchData = async () => {
  const response = await apiClient.get('/data');
  return response;  // apiClient 已处理错误
};
```

**自定义错误类型**：

- `ApiError` - API 调用错误（定义在 types/errors.ts）
- `ValidationError` - 数据验证错误

**日志方式**：console.error（15 处使用）

### 短期建议

- ✅ 继续使用 apiClient 进行 API 调用（已内置错误处理）
- 💡 为 console.error 添加上下文信息（用户ID、时间戳）

  ```typescript
  console.error('[API Error]', { userId, timestamp, error });
  ```

### 长期建议

- 💡 考虑引入结构化日志系统（如 winston 或 pino）
- 💡 考虑添加错误监控（如 Sentry）
- 💡 建立统一的错误码系统

### ⚠️ 注意

项目已有成熟的错误处理机制（apiClient），
生成新代码时必须使用，不要重新实现。

```

---

## 🎯 实施计划

### 阶段 1：分析能力增强（预计 8-10 小时）

**Week 1**:
- [ ] 创建 practice-analyzer.ts
- [ ] 创建 config-parser.ts
- [ ] 实现错误处理模式分析
- [ ] 实现配置文件解析

**Week 2**:
- [ ] 创建 custom-pattern-detector.ts
- [ ] 创建 file-structure-learner.ts
- [ ] 实现自定义工具识别
- [ ] 实现文件组织学习

### 阶段 2：规则生成策略调整（预计 6-8 小时）

**Week 3**:
- [ ] 重构规则生成逻辑（三段式）
- [ ] 实现按需生成（功能存在性检查）
- [ ] 整合配置和实践分析
- [ ] 更新规则模板

### 阶段 3：测试和文档（预计 4-6 小时）

**Week 4**:
- [ ] 编写测试用例
- [ ] 更新文档
- [ ] 实际项目验证
- [ ] 发布 v1.2

---

## 💡 我的补充建议

基于您的项目组织结构，我建议还需要分析：

### 补充分析项

- [ ] **状态管理实际使用模式**
  - 如果使用 Redux，分析 slice 的组织方式
  - 如果使用 Context，分析 Provider 的组织
  - 识别状态更新的实际模式

- [ ] **路由组织方式**
  - Next.js App Router vs Pages Router
  - React Router 的路由定义方式
  - 路由文件的组织规律

- [ ] **环境变量使用**
  - 分析 .env 文件
  - 识别环境变量的命名规范
  - 记录敏感信息处理方式

- [ ] **数据验证方案**
  - 是否使用 Zod、Yup 等
  - 表单验证的实际处理方式
  - API 响应验证模式

- [ ] **国际化（i18n）**
  - 是否使用 i18n
  - 翻译文件组织
  - 文本处理规范

---

## ❓ 需要您确认

### 确认 1：实施范围

以上改进项是否都需要？还是分批次实施？

**建议**：
- ✅ 立即实施：配置解析 + 自定义模式识别 + 三段式规则
- 🔜 近期实施：错误处理分析 + 文件结构学习
- 📅 后续实施：其他补充项

### 确认 2：规则生成示例

我生成一个完整的示例，您看是否符合预期？

**场景**：React + TypeScript + Material-UI 项目

**分析发现**：
- 使用 styled-components
- 有自定义 useAuth hook
- 使用 apiClient 处理 API
- 使用 console.error
- 有 .prettierrc 配置
- 没有测试

**应该生成的规则**：
```markdown
## 样式规范

### 项目当前使用
- UI 库：Material-UI (@mui/material)
- 样式方案：styled-components
- 主题：使用 MUI 的主题系统

### 开发规范
✅ 使用 styled-components 定义组件样式
✅ 使用 MUI 主题系统的设计令牌
⚠️ 不要使用内联样式或传统 CSS
💡 WCAG 要求：使用主题配色确保对比度 ≥ 4.5:1

## API 调用

### 项目当前使用
- HTTP 客户端：自定义 apiClient (services/api-client.ts)
- 已内置：认证、错误处理、请求拦截

### 开发规范
```typescript
// ✅ 正确 - 使用项目的 apiClient
import { apiClient } from '@/services/api-client';
const data = await apiClient.get('/users');

// ❌ 错误 - 不要直接使用 fetch
```

## 认证管理

### 项目当前使用

- 自定义 Hook：useAuth (hooks/useAuth.ts)
- 使用频率：高（15 处）

### 开发规范

```typescript
// ✅ 使用项目的 useAuth
import { useAuth } from '@/hooks/useAuth';
const { user, isAuthenticated } = useAuth();

// ❌ 不要重新实现认证逻辑
```

## 测试

### 当前状态

⚠️ 项目当前未配置测试框架

### 建议

💡 如需添加测试，建议：

- 考虑 Vitest（与 Vite 项目更好集成）
- 考虑 @testing-library/react（React 组件测试）
- 参考配置：[链接]

```

**这样的规则是否符合您的预期？**

### 确认 3：优先级

请为以下改进项排序（1 = 最优先）：

- [ ] 配置文件解析（Prettier、ESLint、tsconfig）
- [ ] 自定义工具识别（hooks、utils）
- [ ] 文件组织结构学习
- [ ] 错误处理模式分析
- [ ] 三段式规则（当前 + 短期 + 长期）
- [ ] 按需生成（不存在的功能不生成完整规则）
- [ ] API 调用模式分析
- [ ] 组件库和样式方案分析

---

请您回答这些确认问题，我会立即开始实施改进！🚀
