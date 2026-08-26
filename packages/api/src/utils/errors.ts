export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = "INTERNAL_ERROR"
  ) {
    super(message)
    this.name = "AppError"
    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, "NOT_FOUND")
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR")
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED")
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN")
  }
}

export class ConflictError extends AppError {
  constructor(resource: string) {
    super(`${resource} already exists`, 409, "CONFLICT")
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super("Too many requests", 429, "RATE_LIMITED")
  }
}