// Custom error classes for application
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 503, true);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403, true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, 401, true);
  }
}

export class AccountLockedError extends AppError {
  constructor(message: string) {
    super(message, 423, true);
  }
}
