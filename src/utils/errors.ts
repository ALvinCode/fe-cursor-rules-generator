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
  public readonly cause?: Error | unknown;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    cause?: Error | unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.cause = cause;

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
  constructor(message: string, originalError?: Error) {
    super(message, 'FILE_OPERATION_ERROR', 500, true, originalError);
  }
}

/**
 * 项目分析错误
 */
export class ProjectAnalysisError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 'PROJECT_ANALYSIS_ERROR', 500, true, originalError);
  }
}

/**
 * 配置解析错误
 */
export class ConfigParseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 'CONFIG_PARSE_ERROR', 500, true, originalError);
  }
}

/**
 * MCP 工具调用错误
 */
export class ToolCallError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 'TOOL_CALL_ERROR', 500, true, originalError);
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
 * 获取错误恢复建议
 */
function getRecoverySuggestion(error: unknown): string {
  if (error instanceof ValidationError) {
    return "请检查参数是否正确，确保所有必需参数都已提供。";
  }
  
  if (error instanceof FileOperationError) {
    return "请检查文件路径是否正确，确保有足够的文件系统权限。";
  }
  
  if (error instanceof ProjectAnalysisError) {
    return "请确保项目路径有效，且项目结构完整。可以尝试使用 `analyze_project` 工具先检查项目。";
  }
  
  if (error instanceof ConfigParseError) {
    return "请检查项目配置文件（如 package.json、tsconfig.json）的格式是否正确。";
  }
  
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes('enoent') || errorMessage.includes('not found')) {
      return "文件或目录不存在。请检查路径是否正确。";
    }
    if (errorMessage.includes('eacces') || errorMessage.includes('permission')) {
      return "权限不足。请检查文件系统权限，或尝试使用不同的路径。";
    }
    if (errorMessage.includes('缺少必需参数') || errorMessage.includes('missing')) {
      return "请提供所有必需的参数。可以查看工具描述了解参数要求。";
    }
  }
  
  return "如果问题持续存在，请检查日志文件获取更多信息，或使用 `info` 工具检查配置。";
}

/**
 * 将错误转换为 MCP 响应格式
 */
export function createErrorResponse(error: unknown): {
  content: Array<{ type: string; text: string }>;
} {
  const message = formatErrorForUser(error);
  const suggestion = getRecoverySuggestion(error);
  
  // 在调试模式下包含更多信息
  let detailedMessage = `## 错误\n\n${message}\n\n## 建议\n\n${suggestion}`;
  
  if (process.env.CURSOR_RULES_GENERATOR_DEBUG === 'true' && error instanceof Error) {
    detailedMessage += `\n\n## 调试信息\n\n\`\`\`\n${error.stack}\n\`\`\``;
    
    if (error instanceof AppError && error.cause) {
      detailedMessage += `\n\n## 原因\n\n\`\`\`\n${error.cause instanceof Error ? error.cause.stack : String(error.cause)}\n\`\`\``;
    }
  }
  
  return {
    content: [
      {
        type: 'text',
        text: detailedMessage,
      },
    ],
  };
}

