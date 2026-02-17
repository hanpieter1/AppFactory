// REST API routes for Entity Access Rule and Route Access Rule management
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { EntityAccessService } from '../../services/entity-access.service';
import { entityAccessRepository } from '../../repositories/entity-access.repository';
import { RouteAccessService } from '../../services/route-access.service';
import { routeAccessRepository } from '../../repositories/route-access.repository';
import { moduleRoleRepository } from '../../repositories/module-role.repository';
import { userRepository } from '../../repositories/user.repository';
import { ValidationError, ForbiddenError } from '../../utils/errors';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import {
  CreateEntityAccessRuleDto,
  UpdateEntityAccessRuleDto,
} from '../../models/entity-access.model';
import {
  CreateRouteAccessRuleDto,
  UpdateRouteAccessRuleDto,
} from '../../models/route-access.model';

const router = Router();
const entityAccessService = new EntityAccessService(
  entityAccessRepository,
  moduleRoleRepository,
  userRepository
);
const routeAccessService = new RouteAccessService(
  routeAccessRepository,
  moduleRoleRepository,
  userRepository
);

// Helper: admin-only guard
async function assertAdmin(req: Request): Promise<void> {
  const { userId } = req as AuthenticatedRequest;
  const actorRoles = await userRepository.getUserRoles(userId);
  if (!actorRoles.some((r) => r.name === 'Administrator')) {
    throw new ForbiddenError('Only administrators can perform this action');
  }
}

// === Entity Access Rule CRUD ===

// POST /api/access-rules/entity — Create rule (Admin-only, AC-051-01)
router.post(
  '/entity',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const body = req.body as CreateEntityAccessRuleDto;

    if (!body.moduleRoleId || !body.entity) {
      throw new ValidationError('moduleRoleId and entity are required');
    }

    const rule = await entityAccessService.createRule(body);
    res.status(201).json(rule);
  })
);

// GET /api/access-rules/entity — List rules, filter by ?moduleRoleId= (Admin-only, AC-051-06)
router.get(
  '/entity',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const moduleRoleId = req.query.moduleRoleId as string | undefined;
    const rules = await entityAccessService.getAllRules(moduleRoleId);
    res.status(200).json(rules);
  })
);

// GET /api/access-rules/entity/resolve — Resolve effective permissions for current user (AC-051-05)
router.get(
  '/entity/resolve',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const entity = req.query.entity as string | undefined;
    const resolved = await entityAccessService.resolveForUser(userId, entity);
    res.status(200).json(resolved);
  })
);

// GET /api/access-rules/entity/:id — Get rule by ID (Admin-only)
router.get(
  '/entity/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const rule = await entityAccessService.getRuleById(req.params.id);
    res.status(200).json(rule);
  })
);

// PUT /api/access-rules/entity/:id — Update rule (Admin-only, AC-051-02, AC-051-07)
router.put(
  '/entity/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const body = req.body as UpdateEntityAccessRuleDto;
    const rule = await entityAccessService.updateRule(req.params.id, body);
    res.status(200).json(rule);
  })
);

// DELETE /api/access-rules/entity/:id — Delete rule (Admin-only)
router.delete(
  '/entity/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    await entityAccessService.deleteRule(req.params.id);
    res.status(204).send();
  })
);

// === Route Access Rule CRUD ===

// POST /api/access-rules/routes — Create route access rule (Admin-only, AC-052-01)
router.post(
  '/routes',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const body = req.body as CreateRouteAccessRuleDto;

    if (!body.moduleRoleId || !body.route) {
      throw new ValidationError('moduleRoleId and route are required');
    }

    const rule = await routeAccessService.createRule({
      ...body,
      methods: body.methods || [],
    });
    res.status(201).json(rule);
  })
);

// GET /api/access-rules/routes — List route rules, filter by ?moduleRoleId= (Admin-only, AC-052-03)
router.get(
  '/routes',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const moduleRoleId = req.query.moduleRoleId as string | undefined;
    const rules = await routeAccessService.getAllRules(moduleRoleId);
    res.status(200).json(rules);
  })
);

// GET /api/access-rules/routes/:id — Get route rule by ID (Admin-only)
router.get(
  '/routes/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const rule = await routeAccessService.getRuleById(req.params.id);
    res.status(200).json(rule);
  })
);

// PUT /api/access-rules/routes/:id — Update route rule (Admin-only)
router.put(
  '/routes/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const body = req.body as UpdateRouteAccessRuleDto;
    const rule = await routeAccessService.updateRule(req.params.id, body);
    res.status(200).json(rule);
  })
);

// DELETE /api/access-rules/routes/:id — Delete route rule (Admin-only)
router.delete(
  '/routes/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    await routeAccessService.deleteRule(req.params.id);
    res.status(204).send();
  })
);

export default router;
