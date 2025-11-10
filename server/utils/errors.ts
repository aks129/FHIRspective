/**
 * Standardized error handling utilities
 */

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export enum ErrorCode {
  // General errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',

  // FHIR-specific errors
  FHIR_CONNECTION_ERROR = 'FHIR_CONNECTION_ERROR',
  FHIR_TIMEOUT = 'FHIR_TIMEOUT',
  FHIR_AUTH_ERROR = 'FHIR_AUTH_ERROR',
  FHIR_INVALID_RESPONSE = 'FHIR_INVALID_RESPONSE',
  FHIR_VERSION_INCOMPATIBLE = 'FHIR_VERSION_INCOMPATIBLE',

  // Assessment errors
  ASSESSMENT_NOT_FOUND = 'ASSESSMENT_NOT_FOUND',
  ASSESSMENT_FAILED = 'ASSESSMENT_FAILED',
  ASSESSMENT_TIMEOUT = 'ASSESSMENT_TIMEOUT',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  VALIDATOR_ERROR = 'VALIDATOR_ERROR',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = this.constructor.name;
  }

  toJSON(): ErrorResponse {
    return {
      success: false,
      error: this.message,
      code: this.code,
      details: this.details,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * FHIR-specific error
 */
export class FhirError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.FHIR_CONNECTION_ERROR,
    details?: any
  ) {
    super(message, code, 500, details);
  }
}

/**
 * Assessment-specific error
 */
export class AssessmentError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.ASSESSMENT_FAILED,
    details?: any
  ) {
    super(message, code, 500, details);
  }
}

/**
 * Validation-specific error
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    details?: any
  ) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: Error | AppError,
  requestId?: string
): ErrorResponse {
  if (error instanceof AppError) {
    const response = error.toJSON();
    if (requestId) {
      response.requestId = requestId;
    }
    return response;
  }

  return {
    success: false,
    error: error.message || 'An unexpected error occurred',
    code: ErrorCode.INTERNAL_ERROR,
    timestamp: new Date().toISOString(),
    requestId
  };
}

/**
 * Determine if an error is operational (expected) or programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}
