// JWT authentication middleware
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';
import config from '../config';
import { JwtPayload } from '../models/auth.model';

export interface AuthenticatedRequest extends Request {
  userId: string;
  sessionId: string;
  roles: string[];
  moduleRoles: string[];
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication required');
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwt.secret as jwt.Secret) as JwtPayload;

    (req as AuthenticatedRequest).userId = decoded.userId;
    (req as AuthenticatedRequest).sessionId = decoded.sessionId;
    (req as AuthenticatedRequest).roles = decoded.roles;
    (req as AuthenticatedRequest).moduleRoles = decoded.moduleRoles;

    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
