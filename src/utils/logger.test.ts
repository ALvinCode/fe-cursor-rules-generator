import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { logger, LogLevel, Logger } from './logger.js';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import * as os from 'os';

describe('Logger', () => {
  const testLogFile = join(os.tmpdir(), 'test-cursor-rules-generator.log');

  beforeEach(() => {
    // 清理测试日志文件
    if (existsSync(testLogFile)) {
      unlinkSync(testLogFile);
    }
    // 设置测试日志文件
    process.env.CURSOR_RULES_GENERATOR_LOG_FILE = testLogFile;
    // 重置 Logger 实例以使用新的环境变量
    Logger.reset();
  });

  afterEach(() => {
    // 清理环境变量
    delete process.env.CURSOR_RULES_GENERATOR_LOG_FILE;
    delete process.env.CURSOR_RULES_GENERATOR_LOG_LEVEL;
    delete process.env.CURSOR_RULES_GENERATOR_DEBUG;
  });

  it('应该创建日志文件', () => {
    logger.info('测试日志');
    logger.flush();
    
    expect(existsSync(testLogFile)).toBe(true);
  });

  it('应该写入日志到文件', () => {
    const testMessage = '测试消息';
    logger.info(testMessage);
    logger.flush();
    
    const logContent = readFileSync(testLogFile, 'utf-8');
    expect(logContent).toContain(testMessage);
  });

  it('应该支持不同的日志级别', () => {
    logger.debug('调试消息');
    logger.info('信息消息');
    logger.warn('警告消息');
    logger.error('错误消息');
    logger.flush();
    
    const logContent = readFileSync(testLogFile, 'utf-8');
    expect(logContent).toContain('调试消息');
    expect(logContent).toContain('信息消息');
    expect(logContent).toContain('警告消息');
    expect(logContent).toContain('错误消息');
  });

  it('应该根据日志级别过滤消息', () => {
    logger.setLogLevel(LogLevel.ERROR);
    logger.debug('不应该出现');
    logger.info('不应该出现');
    logger.warn('不应该出现');
    logger.error('应该出现');
    logger.flush();
    
    const logContent = readFileSync(testLogFile, 'utf-8');
    expect(logContent).not.toContain('不应该出现');
    expect(logContent).toContain('应该出现');
  });
});

