// Centralized error handling middleware
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { RequestWithId } from './request-id';
import config from '../config';

interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    timestamp: string;
    requestId?: string;
    stack?: string;
  };
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as RequestWithId).id;

  // Determine status code
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  // Log the error
  logger.error('Request error', {
    requestId,
    error: err.message,
    stack: err.stack,
    statusCode,
  });

  // Build error response
  const errorResponse: ErrorResponse = {
    error: {
      message: err.message || 'Internal server error',
      code: err.name,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  // Include stack trace in development
  if (config.env === 'development') {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

// Handle 404 errors
export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  const requestId = (req as RequestWithId).id;

  logger.warn('Route not found', {
    requestId,
    method: req.method,
    path: req.path,
  });

  res.status(404).json({
    error: {
      message: `Cannot ${req.method} ${req.path}`,
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}
