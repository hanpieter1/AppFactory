// REST API routes for Project Role management
// Epic 1: Organization & People (#9)
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ProjectRoleService } from '../../services/project-role.service';
import { projectRoleRepository } from '../../repositories/project-role.repository';
import { ValidationError, ForbiddenError } from '../../utils/errors';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { userRepository } from '../../repositories/user.repository';

const router = Router();
const projectRoleService = new ProjectRoleService(projectRoleRepository);

async function assertAdmin(req: Request): Promise<void> {
  const { userId } = req as AuthenticatedRequest;
  const actorRoles = await userRepository.getUserRoles(userId);
  if (!actorRoles.some((r) => r.name === 'Administrator')) {
    throw new ForbiddenError('Only administrators can perform this action');
  }
}

// POST /api/project-roles — Create a new project role (admin only)
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const { name, description } = req.body as { name?: string; description?: string };

    if (!name) {
      throw new ValidationError('Project role name is required');
    }

    const role = await projectRoleService.createProjectRole({ name, description });
    res.status(201).json(role);
  })
);

// GET /api/project-roles — List all project roles
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    const roles = await projectRoleService.getAllProjectRoles();
    res.status(200).json(roles);
  })
);

// GET /api/project-roles/:id — Get project role by ID
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const role = await projectRoleService.getProjectRoleById(req.params.id);
    res.status(200).json(role);
  })
);

// PUT /api/project-roles/:id — Update a project role (admin only)
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const { name, description } = req.body as { name?: string; description?: string };
    const role = await projectRoleService.updateProjectRole(req.params.id, { name, description });
    res.status(200).json(role);
  })
);

// DELETE /api/project-roles/:id — Delete a project role (admin only)
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    await projectRoleService.deleteProjectRole(req.params.id);
    res.status(204).send();
  })
);

export default router;
