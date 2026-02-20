// REST API routes for Feedback
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { FeedbackService } from '../../services/feedback.service';
import { feedbackRepository } from '../../repositories/feedback.repository';
import { ValidationError, ForbiddenError } from '../../utils/errors';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { userRepository } from '../../repositories/user.repository';

const router = Router();
const feedbackService = new FeedbackService(feedbackRepository);

async function assertAdmin(req: Request): Promise<void> {
  const { userId } = req as AuthenticatedRequest;
  const actorRoles = await userRepository.getUserRoles(userId);
  if (!actorRoles.some((r) => r.name === 'Administrator')) {
    throw new ForbiddenError('Only administrators can perform this action');
  }
}

// POST /api/feedback — Submit feedback (any authenticated user)
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const { subject, message } = req.body as { subject?: string; message?: string };

    if (!subject) {
      throw new ValidationError('Subject is required');
    }
    if (!message) {
      throw new ValidationError('Message is required');
    }

    const feedback = await feedbackService.createFeedback(userId, { subject, message });
    res.status(201).json(feedback);
  })
);

// GET /api/feedback — List all feedback (admin only)
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    const feedbackList = await feedbackService.getAllFeedback();
    res.status(200).json(feedbackList);
  })
);

// DELETE /api/feedback/:id — Delete feedback (admin only)
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await assertAdmin(req);
    await feedbackService.deleteFeedback(req.params.id);
    res.status(204).send();
  })
);

export default router;
