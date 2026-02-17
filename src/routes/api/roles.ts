// REST API routes for User Role management
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { RoleService } from '../../services/role.service';
import { ModuleService } from '../../services/module.service';
import { roleRepository } from '../../repositories/role.repository';
import { moduleRepository } from '../../repositories/module.repository';
import { moduleRoleRepository } from '../../repositories/module-role.repository';
import { userRepository } from '../../repositories/user.repository';
import { ValidationError, ForbiddenError } from '../../utils/errors';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();
const roleService = new RoleService(roleRepository);
const moduleService = new ModuleService(moduleRepository, moduleRoleRepository, roleRepository);

// POST /api/roles — Create a new role
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, description } = req.body as { name?: string; description?: string };

    if (!name) {
      throw new ValidationError('Role name is required');
    }

    const role = await roleService.createRole({ name, description });
    res.status(201).json(role);
  })
);

// GET /api/roles — List all roles
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const roles = await roleService.getAllRoles();
    res.status(200).json(roles);
  })
);

// GET /api/roles/:id — Get role by ID (includes grantable roles)
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const role = await roleService.getRoleById(req.params.id);
    res.status(200).json(role);
  })
);

// PUT /api/roles/:id — Update a role
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, description } = req.body as { name?: string; description?: string };
    const role = await roleService.updateRole(req.params.id, { name, description });
    res.status(200).json(role);
  })
);

// DELETE /api/roles/:id — Delete a role
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await roleService.deleteRole(req.params.id);
    res.status(204).send();
  })
);

// GET /api/roles/:id/grantable-roles — Get grantable roles for a role
router.get(
  '/:id/grantable-roles',
  asyncHandler(async (req: Request, res: Response) => {
    const roles = await roleService.getGrantableRoles(req.params.id);
    res.status(200).json(roles);
  })
);

// PUT /api/roles/:id/grantable-roles — Set grantable roles for a role (Admin-only, JWT-protected)
router.put(
  '/:id/grantable-roles',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;

    // Admin-only: only Administrators can modify grantable roles
    const actorRoles = await userRepository.getUserRoles(userId);
    if (!actorRoles.some((r) => r.name === 'Administrator')) {
      throw new ForbiddenError('Only administrators can modify grantable roles');
    }

    const { grantableRoleIds } = req.body as { grantableRoleIds?: string[] };

    if (!grantableRoleIds || !Array.isArray(grantableRoleIds)) {
      throw new ValidationError('grantableRoleIds must be an array');
    }

    const roles = await roleService.setGrantableRoles(req.params.id, { grantableRoleIds });
    res.status(200).json(roles);
  })
);

// === Module Role Mapping ===

// POST /api/roles/:roleId/module-roles — Map a module role to a user role (Admin-only, AC-050-03)
router.post(
  '/:roleId/module-roles',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;

    const actorRoles = await userRepository.getUserRoles(userId);
    if (!actorRoles.some((r) => r.name === 'Administrator')) {
      throw new ForbiddenError('Only administrators can modify module role mappings');
    }

    const { moduleRoleId } = req.body as { moduleRoleId?: string };

    if (!moduleRoleId) {
      throw new ValidationError('moduleRoleId is required');
    }

    const roles = await moduleService.mapModuleRoleToUserRole(req.params.roleId, moduleRoleId);
    res.status(201).json(roles);
  })
);

// GET /api/roles/:roleId/module-roles — Get module roles mapped to a user role (JWT-protected, AC-050-04)
router.get(
  '/:roleId/module-roles',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const roles = await moduleService.getModuleRolesForUserRole(req.params.roleId);
    res.status(200).json(roles);
  })
);

// DELETE /api/roles/:roleId/module-roles/:moduleRoleId — Unmap a module role (Admin-only, AC-050-05)
router.delete(
  '/:roleId/module-roles/:moduleRoleId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;

    const actorRoles = await userRepository.getUserRoles(userId);
    if (!actorRoles.some((r) => r.name === 'Administrator')) {
      throw new ForbiddenError('Only administrators can modify module role mappings');
    }

    await moduleService.unmapModuleRoleFromUserRole(req.params.roleId, req.params.moduleRoleId);
    res.status(204).send();
  })
);

export default router;
