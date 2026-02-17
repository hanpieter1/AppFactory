// REST API routes for Authentication
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { AuthService } from '../../services/auth.service';
import { userRepository } from '../../repositories/user.repository';
import { sessionRepository } from '../../repositories/session.repository';
import { tokenRepository } from '../../repositories/token.repository';
import { ValidationError } from '../../utils/errors';

const router = Router();
const authService = new AuthService(userRepository, sessionRepository, tokenRepository);

// POST /api/auth/login — Authenticate with username and password
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, password } = req.body as { name?: string; password?: string };

    if (!name || !password) {
      throw new ValidationError('name and password are required');
    }

    const userAgent = req.headers['user-agent'] || null;
    const result = await authService.login({ name, password }, userAgent);
    res.status(200).json(result);
  })
);

// POST /api/auth/refresh — Exchange refresh token for new tokens
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as { refreshToken?: string };

    if (!refreshToken) {
      throw new ValidationError('refreshToken is required');
    }

    const userAgent = req.headers['user-agent'] || null;
    const result = await authService.refresh({ refreshToken }, userAgent);
    res.status(200).json(result);
  })
);

// POST /api/auth/logout — Invalidate refresh token and end session
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as { refreshToken?: string };

    if (!refreshToken) {
      throw new ValidationError('refreshToken is required');
    }

    await authService.logout({ refreshToken });
    res.status(204).send();
  })
);

export default router;
