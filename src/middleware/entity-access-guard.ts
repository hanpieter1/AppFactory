// Middleware factory for entity-level access control (AC-051-03)
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { EntityAccessService } from '../services/entity-access.service';
import { entityAccessRepository } from '../repositories/entity-access.repository';
import { moduleRoleRepository } from '../repositories/module-role.repository';
import { userRepository } from '../repositories/user.repository';
import { ForbiddenError } from '../utils/errors';

type CrudOperation = 'create' | 'read' | 'update' | 'delete';

const entityAccessService = new EntityAccessService(
  entityAccessRepository,
  moduleRoleRepository,
  userRepository
);

export function entityAccessGuard(entity: string, operation: CrudOperation) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const { userId } = req as AuthenticatedRequest;
    const resolved = await entityAccessService.resolveForUser(userId, entity);

    const entityAccess = resolved.find((r) => r.entity === entity);
    if (!entityAccess) {
      throw new ForbiddenError(`Access denied: no permissions for entity '${entity}'`);
    }

    const flagMap: Record<CrudOperation, boolean> = {
      create: entityAccess.canCreate,
      read: entityAccess.canRead,
      update: entityAccess.canUpdate,
      delete: entityAccess.canDelete,
    };

    if (!flagMap[operation]) {
      throw new ForbiddenError(`Access denied: '${operation}' not permitted on entity '${entity}'`);
    }

    next();
  };
}
