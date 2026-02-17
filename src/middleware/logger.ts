// REQ-004: Request logging middleware
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { RequestWithId } from './request-id';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = (req as RequestWithId).id;

  // Log request start
  logger.info('Request started', {
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
}
