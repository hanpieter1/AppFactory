// REST API routes for Department management
// Epic 1: Organization & People (#6)
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { DepartmentService } from '../../services/department.service';
import { departmentRepository } from '../../repositories/department.repository';
import { ValidationError, ForbiddenError } from '../../utils/errors';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { userRepository } from '../../repositories/user.repository';

const router = Router();
const departmentService = new DepartmentService(departmentRepository);

async function assertAdmin(req: Request): Promise<void> {
  const { userId } = req as AuthenticatedRequest;
  const actorRoles = await userRepository.getUserRoles(userId);
  if (!actorRoles.some((r) => r.name === 'Administrator')) {
    throw new ForbiddenError('Only administrators can perform this action');
  }
}

// POST /api/departments — Create a new department (admin only)
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const { name, description, active } = req.body as {
      name?: string;
      description?: string;
      active?: boolean;
    };

    if (!name) {
      throw new ValidationError('Department name is required');
    }

    const department = await departmentService.createDepartment({ name, description, active });
    res.status(201).json(department);
  })
);

// GET /api/departments — List all departments
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { active, search } = req.query as { active?: string; search?: string };

    const filters: { active?: boolean; search?: string } = {};
    if (active === 'true') filters.active = true;
    if (active === 'false') filters.active = false;
    if (search) filters.search = search;

    const departments = await departmentService.getAllDepartments(filters);
    res.status(200).json(departments);
  })
);

// GET /api/departments/:id — Get department by ID
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const department = await departmentService.getDepartmentById(req.params.id);
    res.status(200).json(department);
  })
);

// PUT /api/departments/:id — Update a department (admin only)
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const { name, description, active } = req.body as {
      name?: string;
      description?: string;
      active?: boolean;
    };
    const department = await departmentService.updateDepartment(req.params.id, {
      name,
      description,
      active,
    });
    res.status(200).json(department);
  })
);

// DELETE /api/departments/:id — Delete a department (admin only)
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    await departmentService.deleteDepartment(req.params.id);
    res.status(204).send();
  })
);

export default router;
