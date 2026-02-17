// REQ-002: Status API endpoint
import { Router, Request, Response } from 'express';
import config from '../../config';

const router = Router();

interface StatusResponse {
  application: {
    name: string;
    version: string;
    environment: string;
  };
  uptime: number;
  timestamp: string;
}

/**
 * GET /api/status
 * REQ-002: Status endpoint with application info
 */
router.get('/', (_req: Request, res: Response): void => {
  const response: StatusResponse = {
    application: {
      name: config.name,
      version: config.version,
      environment: config.env,
    },
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(response);
});

export default router;
