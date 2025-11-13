import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  FileOperationError,
  ProjectAnalysisError,
  ConfigParseError,
  createErrorResponse,
  formatErrorForUser,
} from './errors.js';

describe('Error Handling', () => {
  describe('AppError', () => {
    it('应该创建带有所有属性的错误', () => {
      const error = new AppError('测试错误', 'TEST_ERROR', 400, true);
      
      expect(error.message).toBe('测试错误');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('应该支持 cause 属性', () => {
      const cause = new Error('原始错误');
      const error = new AppError('包装错误', 'WRAPPED_ERROR', 500, true, cause);
      
      expect(error.cause).toBe(cause);
    });
  });

  describe('ValidationError', () => {
    it('应该创建验证错误', () => {
      const error = new ValidationError('参数无效');
      
      expect(error.message).toBe('参数无效');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('FileOperationError', () => {
    it('应该创建文件操作错误', () => {
      const originalError = new Error('文件不存在');
      const error = new FileOperationError('无法读取文件', originalError);
      
      expect(error.message).toBe('无法读取文件');
      expect(error.code).toBe('FILE_OPERATION_ERROR');
      expect(error.cause).toBe(originalError);
    });
  });

  describe('formatErrorForUser', () => {
    it('应该格式化 AppError', () => {
      const error = new ValidationError('参数无效');
      const message = formatErrorForUser(error);
      
      expect(message).toBe('参数无效');
    });

    it('应该格式化普通 Error', () => {
      const error = new Error('普通错误');
      const message = formatErrorForUser(error);
      
      expect(message).toBe('普通错误');
    });

    it('应该处理未知错误', () => {
      const message = formatErrorForUser('字符串错误');
      
      expect(message).toBe('发生未知错误');
    });
  });

  describe('createErrorResponse', () => {
    it('应该创建错误响应', () => {
      const error = new ValidationError('参数无效');
      const response = createErrorResponse(error);
      
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('参数无效');
      expect(response.content[0].text).toContain('建议');
    });

    it('应该在调试模式下包含堆栈跟踪', () => {
      process.env.CURSOR_RULES_GENERATOR_DEBUG = 'true';
      const error = new Error('测试错误');
      error.stack = 'Error: 测试错误\n    at test.js:1:1';
      const response = createErrorResponse(error);
      
      expect(response.content[0].text).toContain('调试信息');
      expect(response.content[0].text).toContain('测试错误');
      
      delete process.env.CURSOR_RULES_GENERATOR_DEBUG;
    });
  });
});

