// REQ-004: Request ID middleware for request tracing
import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

export interface RequestWithId extends Request {
  id: string;
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || randomBytes(16).toString('hex');

  (req as RequestWithId).id = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}
