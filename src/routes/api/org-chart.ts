// REST API routes for Organizational Chart
// Epic 1: Organization & People (#10)
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authMiddleware } from '../../middleware/auth';
import { departmentRepository } from '../../repositories/department.repository';
import { teamRepository } from '../../repositories/team.repository';

const router = Router();

// GET /api/org-chart — Get organizational hierarchy (departments → teams → members)
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    const departments = await departmentRepository.findAll({ active: true });
    const teams = await teamRepository.findAll({ active: true });

    const orgChart = departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      description: dept.description,
      memberCount: dept.memberCount,
      teams: teams
        .filter((t) => t.departmentId === dept.id)
        .map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          memberCount: t.memberCount,
        })),
    }));

    res.status(200).json(orgChart);
  })
);

export default router;
