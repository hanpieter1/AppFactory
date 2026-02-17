// REST API routes for User/Account management
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { UserService } from '../../services/user.service';
import { userRepository } from '../../repositories/user.repository';
import { roleRepository } from '../../repositories/role.repository';
import { ValidationError } from '../../utils/errors';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { UserListQuery, UserSortField, SortOrder } from '../../models/user.model';

const router = Router();
const userService = new UserService(userRepository, roleRepository);

// === /me routes MUST come before /:id routes to prevent "me" matching as :id ===

// PUT /api/users/me — Self-service profile edit (JWT-protected)
router.put(
  '/me',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const { fullName, email } = req.body as { fullName?: string; email?: string };
    const user = await userService.updateMyProfile(userId, { fullName, email });
    res.status(200).json(user);
  })
);

// PUT /api/users/me/password — Self-service password change (JWT-protected)
router.put(
  '/me/password',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const { oldPassword, newPassword, confirmPassword } = req.body as {
      oldPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    if (!oldPassword || !newPassword || !confirmPassword) {
      throw new ValidationError('oldPassword, newPassword, and confirmPassword are required');
    }

    await userService.changeMyPassword(userId, { oldPassword, newPassword, confirmPassword });
    res.status(200).json({ message: 'Password changed successfully' });
  })
);

// === Standard CRUD routes ===

// POST /api/users — Create a local user (JWT-protected)
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const { name, password, fullName, email, roleIds } = req.body as {
      name?: string;
      password?: string;
      fullName?: string;
      email?: string;
      roleIds?: string[];
    };

    if (!name || !password) {
      throw new ValidationError('name and password are required');
    }

    const user = await userService.createUser({ name, password, fullName, email, roleIds }, userId);
    res.status(201).json(user);
  })
);

// POST /api/users/webservice — Create a web service (API-only) user (JWT-protected)
router.post(
  '/webservice',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const { name, password, fullName, roleIds } = req.body as {
      name?: string;
      password?: string;
      fullName?: string;
      roleIds?: string[];
    };

    if (!name || !password) {
      throw new ValidationError('name and password are required');
    }

    const user = await userService.createWebServiceUser(
      { name, password, fullName, roleIds },
      userId
    );
    res.status(201).json(user);
  })
);

// GET /api/users — List users with pagination, search, filtering, sorting (JWT-protected, AC-056-01..08)
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const query: UserListQuery = {};

    // Boolean filters
    if (req.query.active !== undefined) {
      query.active = req.query.active === 'true';
    }
    if (req.query.webServiceUser !== undefined) {
      query.webServiceUser = req.query.webServiceUser === 'true';
    }
    if (req.query.isLocalUser !== undefined) {
      query.isLocalUser = req.query.isLocalUser === 'true';
    }

    // Text search
    if (typeof req.query.search === 'string' && req.query.search.trim().length > 0) {
      query.search = req.query.search.trim();
    }

    // Role filter
    if (typeof req.query.role === 'string' && req.query.role.trim().length > 0) {
      query.role = req.query.role.trim();
    }

    // Sorting
    const validSortFields = ['fullName', 'name', 'lastLogin', 'active'];
    if (typeof req.query.sortBy === 'string' && validSortFields.includes(req.query.sortBy)) {
      query.sortBy = req.query.sortBy as UserSortField;
    }
    if (req.query.order === 'asc' || req.query.order === 'desc') {
      query.order = req.query.order as SortOrder;
    }

    // Pagination
    if (req.query.page !== undefined) {
      const page = parseInt(req.query.page as string, 10);
      if (!isNaN(page) && page >= 1) {
        query.page = page;
      }
    }
    if (req.query.limit !== undefined) {
      const limit = parseInt(req.query.limit as string, 10);
      if (!isNaN(limit) && limit >= 1) {
        query.limit = Math.min(limit, 100);
      }
    }

    const result = await userService.getAllUsers(Object.keys(query).length > 0 ? query : undefined);
    res.status(200).json(result);
  })
);

// GET /api/users/:id — Get user by ID (includes roles) (JWT-protected)
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json(user);
  })
);

// PUT /api/users/:id — Admin updates user profile (JWT-protected)
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const { fullName, email } = req.body as { fullName?: string; email?: string };
    const user = await userService.updateUser(req.params.id, { fullName, email }, userId);
    res.status(200).json(user);
  })
);

// PUT /api/users/:id/roles — Admin updates user roles (JWT-protected)
router.put(
  '/:id/roles',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const { roleIds } = req.body as { roleIds?: string[] };

    if (!roleIds || !Array.isArray(roleIds)) {
      throw new ValidationError('roleIds must be an array');
    }

    const user = await userService.updateUserRoles(req.params.id, { roleIds }, userId);
    res.status(200).json(user);
  })
);

// PATCH /api/users/:id/status — Activate/deactivate/unblock user (JWT-protected)
router.patch(
  '/:id/status',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const { active, blocked } = req.body as { active?: boolean; blocked?: boolean };
    const user = await userService.updateUserStatus(req.params.id, { active, blocked }, userId);
    res.status(200).json(user);
  })
);

// PUT /api/users/:id/password — Admin changes user password (JWT-protected)
router.put(
  '/:id/password',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const { newPassword, confirmPassword } = req.body as {
      newPassword?: string;
      confirmPassword?: string;
    };

    if (!newPassword || !confirmPassword) {
      throw new ValidationError('newPassword and confirmPassword are required');
    }

    await userService.adminChangePassword(req.params.id, { newPassword, confirmPassword }, userId);
    res.status(200).json({ message: 'Password changed successfully' });
  })
);

// POST /api/users/:id/reset-password — Generate temporary password (JWT-protected)
router.post(
  '/:id/reset-password',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const result = await userService.resetPassword(req.params.id, userId);
    res.status(200).json(result);
  })
);

export default router;
