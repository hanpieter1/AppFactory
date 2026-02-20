// Service layer for Feedback business logic
import { FeedbackRepository } from '../repositories/feedback.repository';
import { Feedback, FeedbackWithUser, CreateFeedbackDto } from '../models/feedback.model';
import { NotFoundError, ValidationError } from '../utils/errors';

export class FeedbackService {
  constructor(private readonly repository: FeedbackRepository) {}

  async createFeedback(userId: string, dto: CreateFeedbackDto): Promise<Feedback> {
    if (!dto.subject || dto.subject.trim().length === 0) {
      throw new ValidationError('Subject is required');
    }
    if (dto.subject.length > 255) {
      throw new ValidationError('Subject must be at most 255 characters');
    }
    if (!dto.message || dto.message.trim().length === 0) {
      throw new ValidationError('Message is required');
    }
    if (dto.message.length > 5000) {
      throw new ValidationError('Message must be at most 5000 characters');
    }

    return this.repository.create(userId, {
      subject: dto.subject.trim(),
      message: dto.message.trim(),
    });
  }

  async getAllFeedback(): Promise<FeedbackWithUser[]> {
    return this.repository.findAll();
  }

  async deleteFeedback(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Feedback with id '${id}' not found`);
    }

    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new Error('Failed to delete feedback');
    }
  }
}
