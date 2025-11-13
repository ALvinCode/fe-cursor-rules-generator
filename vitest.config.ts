import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // 性能优化：减少测试超时时间，加快失败反馈
    testTimeout: 5000,
    // 使用单线程模式，避免测试环境问题（在新版本 vitest 中使用 pool: 'forks' 或 poolOptions）
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // 禁用隔离，加快执行速度（对于简单的单元测试足够）
    isolate: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },
});

