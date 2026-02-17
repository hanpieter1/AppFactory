// REST API route for navigation — returns accessible routes for current user (AC-052-05)
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { RouteAccessService } from '../../services/route-access.service';
import { routeAccessRepository } from '../../repositories/route-access.repository';
import { moduleRoleRepository } from '../../repositories/module-role.repository';
import { userRepository } from '../../repositories/user.repository';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();
const routeAccessService = new RouteAccessService(
  routeAccessRepository,
  moduleRoleRepository,
  userRepository
);

// GET /api/navigation — Returns authorized navigation items for current user (AC-052-05)
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const routes = await routeAccessService.resolveForUser(userId);
    res.status(200).json(routes);
  })
);

export default router;
