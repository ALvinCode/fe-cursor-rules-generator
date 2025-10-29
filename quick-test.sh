#!/bin/bash

# Cursor Rules Generator - 快速测试脚本
# 用于创建测试项目并验证 MCP Server 功能

set -e

echo "🚀 Cursor Rules Generator - 快速测试"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试项目根目录
TEST_ROOT="$HOME/cursor-rules-test-projects"

echo -e "${BLUE}📁 创建测试项目目录: $TEST_ROOT${NC}"
mkdir -p "$TEST_ROOT"

# ==========================================
# 测试 1: 简单的 React 项目
# ==========================================
echo ""
echo -e "${BLUE}📦 测试 1: 创建简单的 React 项目${NC}"
TEST1="$TEST_ROOT/simple-react-app"

if [ -d "$TEST1" ]; then
  echo "  删除已存在的测试项目..."
  rm -rf "$TEST1"
fi

mkdir -p "$TEST1/src/components"
cd "$TEST1"

# 创建 package.json
cat > package.json << 'EOF'
{
  "name": "simple-react-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
EOF

# 创建源文件
cat > src/App.tsx << 'EOF'
import React from 'react';

function App() {
  return <div>Hello World</div>;
}

export default App;
EOF

cat > src/components/Button.tsx << 'EOF'
import React from 'react';

export const Button: React.FC = () => {
  return <button>Click me</button>;
};
EOF

# 创建 tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "jsx": "react",
    "strict": true
  }
}
EOF

echo -e "${GREEN}  ✅ 测试项目 1 创建完成: $TEST1${NC}"

# ==========================================
# 测试 2: 前后端分离项目
# ==========================================
echo ""
echo -e "${BLUE}📦 测试 2: 创建前后端分离项目${NC}"
TEST2="$TEST_ROOT/fullstack-app"

if [ -d "$TEST2" ]; then
  echo "  删除已存在的测试项目..."
  rm -rf "$TEST2"
fi

mkdir -p "$TEST2"
cd "$TEST2"

# 创建根 package.json (workspace)
cat > package.json << 'EOF'
{
  "name": "fullstack-app",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "frontend",
    "backend",
    "shared"
  ]
}
EOF

# 创建前端模块
mkdir -p frontend/src/components
cd frontend

cat > package.json << 'EOF'
{
  "name": "frontend",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "next": "^14.0.0",
    "typescript": "^5.0.0"
  }
}
EOF

cat > src/App.tsx << 'EOF'
import React from 'react';

export default function App() {
  return <div>Frontend App</div>;
}
EOF

mkdir -p src/components
cat > src/components/Header.tsx << 'EOF'
import React from 'react';

export const Header = () => <header>My App</header>;
EOF

# 创建后端模块
cd ..
mkdir -p backend/src/routes
cd backend

cat > package.json << 'EOF'
{
  "name": "backend",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0",
    "typescript": "^5.0.0",
    "@types/express": "^4.17.0"
  }
}
EOF

cat > src/server.ts << 'EOF'
import express from 'express';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Hello from backend' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
EOF

mkdir -p src/routes
cat > src/routes/users.ts << 'EOF'
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ users: [] });
});

export default router;
EOF

# 创建共享模块
cd ..
mkdir -p shared/src
cd shared

cat > package.json << 'EOF'
{
  "name": "shared",
  "version": "1.0.0",
  "dependencies": {
    "typescript": "^5.0.0"
  }
}
EOF

cat > src/types.ts << 'EOF'
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}
EOF

cd ..

echo -e "${GREEN}  ✅ 测试项目 2 创建完成: $TEST2${NC}"

# ==========================================
# 测试 3: Python Django 项目
# ==========================================
echo ""
echo -e "${BLUE}📦 测试 3: 创建 Python Django 项目${NC}"
TEST3="$TEST_ROOT/django-app"

if [ -d "$TEST3" ]; then
  echo "  删除已存在的测试项目..."
  rm -rf "$TEST3"
fi

mkdir -p "$TEST3/app/views"
cd "$TEST3"

cat > requirements.txt << 'EOF'
Django==4.2.0
djangorestframework==3.14.0
psycopg2-binary==2.9.6
EOF

cat > app/views.py << 'EOF'
from django.http import HttpResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response

def index(request):
    return HttpResponse("Hello from Django")

@api_view(['GET'])
def api_hello(request):
    return Response({'message': 'Hello from API'})
EOF

cat > README.md << 'EOF'
# Django App

A Django application.
EOF

echo -e "${GREEN}  ✅ 测试项目 3 创建完成: $TEST3${NC}"

# ==========================================
# 显示测试说明
# ==========================================
echo ""
echo -e "${YELLOW}======================================"
echo "✅ 测试项目创建完成！"
echo "======================================${NC}"
echo ""
echo "📁 测试项目位置："
echo "  1. 简单 React 项目:"
echo "     $TEST1"
echo ""
echo "  2. 前后端分离项目:"
echo "     $TEST2"
echo ""
echo "  3. Python Django 项目:"
echo "     $TEST3"
echo ""
echo -e "${BLUE}📝 下一步操作：${NC}"
echo ""
echo "1. 在 Cursor 中打开任一测试项目："
echo "   cursor $TEST1"
echo ""
echo "2. 在 Cursor 的 AI 聊天窗口中输入："
echo "   ${GREEN}请为当前项目生成 Cursor Rules${NC}"
echo ""
echo "3. 检查生成的规则文件："
echo "   ${BLUE}单体项目:${NC}"
echo "   ls -la $TEST1/.cursor/rules/"
echo ""
echo "   ${BLUE}多模块项目:${NC}"
echo "   ls -la $TEST2/.cursor/rules/"
echo "   ls -la $TEST2/frontend/.cursor/rules/"
echo "   ls -la $TEST2/backend/.cursor/rules/"
echo ""
echo "4. 查看规则文件内容："
echo "   cat $TEST1/.cursor/rules/00-global-rules.mdc"
echo ""
echo -e "${YELLOW}📚 详细测试步骤请查看: TESTING_GUIDE.md${NC}"
echo ""
echo "🎉 祝测试顺利！"

