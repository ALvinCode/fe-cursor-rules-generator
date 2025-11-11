/**
 * 统一错误处理类
 * 提供结构化的错误类型和错误响应格式
 */

/**
 * 应用错误基类
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // 保持正确的堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 参数验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

/**
 * 文件操作错误
 */
export class FileOperationError extends AppError {
  public cause?: Error;
  constructor(message: string, originalError?: Error) {
    super(message, 'FILE_OPERATION_ERROR', 500);
    if (originalError) {
      this.cause = originalError;
    }
  }
}

/**
 * 项目分析错误
 */
export class ProjectAnalysisError extends AppError {
  public cause?: Error;
  constructor(message: string, originalError?: Error) {
    super(message, 'PROJECT_ANALYSIS_ERROR', 500);
    if (originalError) {
      this.cause = originalError;
    }
  }
}

/**
 * 配置解析错误
 */
export class ConfigParseError extends AppError {
  public cause?: Error;
  constructor(message: string, originalError?: Error) {
    super(message, 'CONFIG_PARSE_ERROR', 500);
    if (originalError) {
      this.cause = originalError;
    }
  }
}

/**
 * MCP 工具调用错误
 */
export class ToolCallError extends AppError {
  public cause?: Error;
  constructor(message: string, originalError?: Error) {
    super(message, 'TOOL_CALL_ERROR', 500);
    if (originalError) {
      this.cause = originalError;
    }
  }
}

/**
 * 将错误转换为用户友好的消息
 */
export function formatErrorForUser(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    // 生产环境不暴露详细错误信息
    if (process.env.NODE_ENV === 'production') {
      return '操作失败，请稍后重试。';
    }
    return error.message;
  }
  
  return '发生未知错误';
}

/**
 * 将错误转换为 MCP 响应格式
 */
export function createErrorResponse(error: unknown): {
  content: Array<{ type: string; text: string }>;
} {
  const message = formatErrorForUser(error);
  
  // 在调试模式下包含更多信息
  let detailedMessage = message;
  if (process.env.CURSOR_RULES_GENERATOR_DEBUG === 'true' && error instanceof Error) {
    detailedMessage += `\n\n错误详情: ${error.stack}`;
  }
  
  return {
    content: [
      {
        type: 'text',
        text: `错误: ${detailedMessage}`,
      },
    ],
  };
}

