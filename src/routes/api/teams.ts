// REST API routes for Team management
// Epic 1: Organization & People (#7, #8)
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { TeamService } from '../../services/team.service';
import { teamRepository } from '../../repositories/team.repository';
import { departmentRepository } from '../../repositories/department.repository';
import { ValidationError, ForbiddenError } from '../../utils/errors';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { userRepository } from '../../repositories/user.repository';

const router = Router();
const teamService = new TeamService(teamRepository, departmentRepository);

async function assertAdmin(req: Request): Promise<void> {
  const { userId } = req as AuthenticatedRequest;
  const actorRoles = await userRepository.getUserRoles(userId);
  if (!actorRoles.some((r) => r.name === 'Administrator')) {
    throw new ForbiddenError('Only administrators can perform this action');
  }
}

// POST /api/teams — Create a new team (admin only)
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const { name, departmentId, description, active } = req.body as {
      name?: string;
      departmentId?: string;
      description?: string;
      active?: boolean;
    };

    if (!name) {
      throw new ValidationError('Team name is required');
    }
    if (!departmentId) {
      throw new ValidationError('Department ID is required');
    }

    const team = await teamService.createTeam({ name, departmentId, description, active });
    res.status(201).json(team);
  })
);

// GET /api/teams — List all teams
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { departmentId, active, search } = req.query as {
      departmentId?: string;
      active?: string;
      search?: string;
    };

    const filters: { departmentId?: string; active?: boolean; search?: string } = {};
    if (departmentId) filters.departmentId = departmentId;
    if (active === 'true') filters.active = true;
    if (active === 'false') filters.active = false;
    if (search) filters.search = search;

    const teams = await teamService.getAllTeams(filters);
    res.status(200).json(teams);
  })
);

// GET /api/teams/:id — Get team by ID
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const team = await teamService.getTeamById(req.params.id);
    res.status(200).json(team);
  })
);

// GET /api/teams/:id/members — Get team members (#8)
router.get(
  '/:id/members',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const members = await teamService.getTeamMembers(req.params.id);
    res.status(200).json(members);
  })
);

// PUT /api/teams/:id — Update a team (admin only)
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const { name, departmentId, description, active } = req.body as {
      name?: string;
      departmentId?: string;
      description?: string;
      active?: boolean;
    };
    const team = await teamService.updateTeam(req.params.id, { name, departmentId, description, active });
    res.status(200).json(team);
  })
);

// DELETE /api/teams/:id — Delete a team (admin only)
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    await teamService.deleteTeam(req.params.id);
    res.status(204).send();
  })
);

export default router;
