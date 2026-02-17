// Middleware factory for route-level access control (AC-052-02)
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { RouteAccessService } from '../services/route-access.service';
import { routeAccessRepository } from '../repositories/route-access.repository';
import { moduleRoleRepository } from '../repositories/module-role.repository';
import { userRepository } from '../repositories/user.repository';
import { ForbiddenError } from '../utils/errors';

const routeAccessService = new RouteAccessService(
  routeAccessRepository,
  moduleRoleRepository,
  userRepository
);

const DEFAULT_SKIP_PATHS = ['/health', '/api/auth', '/api/status'];

export function routeAccessGuard(skipPaths: string[] = DEFAULT_SKIP_PATHS) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Skip public routes
    for (const skipPath of skipPaths) {
      if (req.path === skipPath || req.path.startsWith(skipPath + '/')) {
        next();
        return;
      }
    }

    const { userId } = req as AuthenticatedRequest;
    if (!userId) {
      next();
      return;
    }

    const canAccess = await routeAccessService.canAccessRoute(userId, req.path, req.method);

    if (!canAccess) {
      throw new ForbiddenError(`Access denied: route '${req.path}' with method '${req.method}'`);
    }

    next();
  };
}
