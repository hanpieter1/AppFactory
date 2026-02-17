// REST API routes for Module and ModuleRole management
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ModuleService } from '../../services/module.service';
import { moduleRepository } from '../../repositories/module.repository';
import { moduleRoleRepository } from '../../repositories/module-role.repository';
import { roleRepository } from '../../repositories/role.repository';
import { userRepository } from '../../repositories/user.repository';
import { ValidationError, ForbiddenError } from '../../utils/errors';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();
const moduleService = new ModuleService(moduleRepository, moduleRoleRepository, roleRepository);

// Helper: admin-only guard
async function assertAdmin(req: Request): Promise<void> {
  const { userId } = req as AuthenticatedRequest;
  const actorRoles = await userRepository.getUserRoles(userId);
  if (!actorRoles.some((r) => r.name === 'Administrator')) {
    throw new ForbiddenError('Only administrators can perform this action');
  }
}

// === Module CRUD ===

// POST /api/modules — Create a module (Admin-only)
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const { name, description } = req.body as { name?: string; description?: string };

    if (!name) {
      throw new ValidationError('Module name is required');
    }

    const module = await moduleService.createModule({ name, description });
    res.status(201).json(module);
  })
);

// GET /api/modules — List all modules (JWT-protected)
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    const modules = await moduleService.getAllModules();
    res.status(200).json(modules);
  })
);

// GET /api/modules/:id — Get module by ID (JWT-protected)
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const module = await moduleService.getModuleById(req.params.id);
    res.status(200).json(module);
  })
);

// PUT /api/modules/:id — Update a module (Admin-only)
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const { name, description } = req.body as { name?: string; description?: string };
    const module = await moduleService.updateModule(req.params.id, { name, description });
    res.status(200).json(module);
  })
);

// DELETE /api/modules/:id — Delete a module (Admin-only)
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    await moduleService.deleteModule(req.params.id);
    res.status(204).send();
  })
);

// === ModuleRole CRUD ===

// POST /api/modules/:moduleId/roles — Create a module role (Admin-only, AC-050-01)
router.post(
  '/:moduleId/roles',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const { name, description } = req.body as { name?: string; description?: string };

    if (!name) {
      throw new ValidationError('Module role name is required');
    }

    const role = await moduleService.createModuleRole(req.params.moduleId, { name, description });
    res.status(201).json(role);
  })
);

// GET /api/modules/:moduleId/roles — List module roles (JWT-protected, AC-050-02)
router.get(
  '/:moduleId/roles',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const roles = await moduleService.getModuleRolesByModule(req.params.moduleId);
    res.status(200).json(roles);
  })
);

// GET /api/modules/:moduleId/roles/:id — Get module role by ID (JWT-protected)
router.get(
  '/:moduleId/roles/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const role = await moduleService.getModuleRoleById(req.params.moduleId, req.params.id);
    res.status(200).json(role);
  })
);

// PUT /api/modules/:moduleId/roles/:id — Update a module role (Admin-only)
router.put(
  '/:moduleId/roles/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const { name, description } = req.body as { name?: string; description?: string };
    const role = await moduleService.updateModuleRole(req.params.moduleId, req.params.id, {
      name,
      description,
    });
    res.status(200).json(role);
  })
);

// DELETE /api/modules/:moduleId/roles/:id — Delete a module role (Admin-only)
router.delete(
  '/:moduleId/roles/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    await moduleService.deleteModuleRole(req.params.moduleId, req.params.id);
    res.status(204).send();
  })
);

export default router;
