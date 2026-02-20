// REST API routes for Project management
// Epic 3: Portfolio module
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ProjectService } from '../../services/project.service';
import { projectRepository } from '../../repositories/project.repository';
import { departmentRepository } from '../../repositories/department.repository';
import { teamRepository } from '../../repositories/team.repository';
import { ValidationError, ForbiddenError } from '../../utils/errors';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { userRepository } from '../../repositories/user.repository';
import { ProjectFilters } from '../../models/project.model';

const router = Router();
const projectService = new ProjectService(projectRepository, departmentRepository, teamRepository);

async function assertAdmin(req: Request): Promise<void> {
  const { userId } = req as AuthenticatedRequest;
  const actorRoles = await userRepository.getUserRoles(userId);
  if (!actorRoles.some((r) => r.name === 'Administrator')) {
    throw new ForbiddenError('Only administrators can perform this action');
  }
}

// GET /api/projects/enums — Get enum values for dropdown population
router.get(
  '/enums',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    const enums = projectService.getProjectEnums();
    res.status(200).json(enums);
  })
);

// POST /api/projects — Create a new project (admin only)
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const {
      name, departmentId, teamId, masterProjectId, status, domain, process,
      appSize, complexity, alertLevel, governanceStatus, governanceTemplate,
      infrastructureTemplate, operationsTemplate, startDate, goLiveDate,
      referenceNumber, description,
    } = req.body;

    if (!name) {
      throw new ValidationError('Project name is required');
    }

    const project = await projectService.createProject({
      name, departmentId, teamId, masterProjectId, status, domain, process,
      appSize, complexity, alertLevel, governanceStatus, governanceTemplate,
      infrastructureTemplate, operationsTemplate, startDate, goLiveDate,
      referenceNumber, description,
    });
    res.status(201).json(project);
  })
);

// GET /api/projects — List all projects (with optional filters)
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { search, status, departmentId, teamId, domain, alertLevel, governanceStatus } =
      req.query as Record<string, string | undefined>;

    const filters: ProjectFilters = {};
    if (search) filters.search = search;
    if (status) filters.status = status as ProjectFilters['status'];
    if (departmentId) filters.departmentId = departmentId;
    if (teamId) filters.teamId = teamId;
    if (domain) filters.domain = domain as ProjectFilters['domain'];
    if (alertLevel) filters.alertLevel = alertLevel as ProjectFilters['alertLevel'];
    if (governanceStatus) filters.governanceStatus = governanceStatus as ProjectFilters['governanceStatus'];

    const projects = await projectService.getAllProjects(filters);
    res.status(200).json(projects);
  })
);

// GET /api/projects/:id — Get project by ID
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const project = await projectService.getProjectById(req.params.id);
    res.status(200).json(project);
  })
);

// PUT /api/projects/:id — Update a project (admin only)
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const project = await projectService.updateProject(req.params.id, req.body);
    res.status(200).json(project);
  })
);

// DELETE /api/projects/:id — Delete a project (admin only)
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    await projectService.deleteProject(req.params.id);
    res.status(204).send();
  })
);

export default router;
