/**
 * Structured logging utility
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  metadata?: any;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export class Logger {
  private context: string;
  private logLevel: LogLevel;

  constructor(context: string) {
    this.context = context;
    this.logLevel = this.getLogLevel();
  }

  private getLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    switch (envLevel) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatLog(entry: LogEntry): string {
    // In development, use pretty printing
    if (process.env.NODE_ENV === 'development') {
      const emoji = {
        [LogLevel.DEBUG]: '🔍',
        [LogLevel.INFO]: 'ℹ️',
        [LogLevel.WARN]: '⚠️',
        [LogLevel.ERROR]: '❌'
      }[entry.level];

      let message = `${emoji} [${entry.timestamp}] [${entry.context}] ${entry.message}`;
      if (entry.metadata) {
        message += `\n   Metadata: ${JSON.stringify(entry.metadata, null, 2)}`;
      }
      if (entry.error) {
        message += `\n   Error: ${entry.error.message}`;
        if (entry.error.stack) {
          message += `\n   Stack: ${entry.error.stack}`;
        }
      }
      return message;
    }

    // In production, use JSON format for log aggregation
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, metadata?: any, error?: Error) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      metadata,
      error: error ? {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        code: (error as any).code
      } : undefined
    };

    const formattedLog = this.formatLog(entry);

    // Use appropriate console method
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      default:
        console.log(formattedLog);
    }
  }

  debug(message: string, metadata?: any) {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: any) {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: any) {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error, metadata?: any) {
    this.log(LogLevel.ERROR, message, metadata, error);
  }

  /**
   * Create a child logger with additional context
   */
  child(subContext: string): Logger {
    return new Logger(`${this.context}.${subContext}`);
  }
}

/**
 * Create a logger instance for a given context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}
