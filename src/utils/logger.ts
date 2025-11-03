/**
 * 轻量级日志工具类
 * 支持日志级别和环境变量配置
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * 日志工具类
 * 用于替代 console.log/error，支持结构化日志和日志级别控制
 */
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isDebugMode: boolean;

  private constructor() {
    // 从环境变量读取日志级别
    const envLogLevel = process.env.CURSOR_RULES_GENERATOR_LOG_LEVEL?.toUpperCase();
    this.logLevel = this.parseLogLevel(envLogLevel) ?? LogLevel.INFO;
    
    // 从环境变量读取调试模式
    this.isDebugMode = process.env.CURSOR_RULES_GENERATOR_DEBUG === 'true';
    
    // 如果启用了调试模式，设置日志级别为 DEBUG
    if (this.isDebugMode) {
      this.logLevel = LogLevel.DEBUG;
    }
  }

  /**
   * 获取单例实例
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * 解析日志级别字符串
   */
  private parseLogLevel(level?: string): LogLevel | null {
    switch (level) {
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'INFO':
        return LogLevel.INFO;
      case 'WARN':
        return LogLevel.WARN;
      case 'ERROR':
        return LogLevel.ERROR;
      case 'NONE':
        return LogLevel.NONE;
      default:
        return null;
    }
  }

  /**
   * 检查是否应该记录该级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    
    if (args.length === 0) {
      return `${prefix} ${message}`;
    }
    
    try {
      const formattedArgs = args.map(arg => {
        if (typeof arg === 'object') {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      }).join(' ');
      
      return `${prefix} ${message} ${formattedArgs}`;
    } catch (error) {
      return `${prefix} ${message} [无法序列化参数]`;
    }
  }

  /**
   * Debug 日志（仅在调试模式下输出）
   */
  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      // MCP server 应该使用 stderr 输出日志，避免干扰 MCP 协议
      console.error(this.formatMessage('DEBUG', message, ...args));
    }
  }

  /**
   * Info 日志
   */
  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.error(this.formatMessage('INFO', message, ...args));
    }
  }

  /**
   * Warn 日志
   */
  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.error(this.formatMessage('WARN', message, ...args));
    }
  }

  /**
   * Error 日志
   */
  error(message: string, error?: Error | unknown, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorDetails = `\n${error.message}\n${error.stack}`;
      } else if (error) {
        errorDetails = `\n${String(error)}`;
      }
      
      console.error(this.formatMessage('ERROR', message, ...args) + errorDetails);
    }
  }

  /**
   * 设置日志级别（运行时动态调整）
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * 获取当前日志级别
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }
}

/**
 * 导出便捷的日志函数
 */
export const logger = Logger.getInstance();

