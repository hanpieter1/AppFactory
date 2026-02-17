// REQ-001: Health check endpoint
import { Router, Request, Response } from 'express';

const router = Router();

interface HealthCheckResponse {
  status: 'healthy';
  timestamp: string;
  uptime: number;
}

/**
 * GET /health
 * REQ-001: Simple health check endpoint for App Runner
 */
router.get('/', (_req: Request, res: Response): void => {
  const response: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  res.status(200).json(response);
});

export default router;
