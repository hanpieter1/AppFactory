// Unit tests for FeedbackService
import { FeedbackService } from '../../src/services/feedback.service';
import { FeedbackRepository } from '../../src/repositories/feedback.repository';
import { Feedback } from '../../src/models/feedback.model';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let repo: jest.Mocked<FeedbackRepository>;

  const mockFeedback: Feedback = {
    id: 'fb-1',
    userId: 'user-1',
    subject: 'Bug Report',
    message: 'Found a bug in the login page',
    createdAt: new Date('2026-01-15'),
  };

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<FeedbackRepository>;
    service = new FeedbackService(repo);
  });

  describe('createFeedback', () => {
    it('should create feedback successfully', async () => {
      repo.create.mockResolvedValue(mockFeedback);

      const result = await service.createFeedback('user-1', {
        subject: 'Bug Report',
        message: 'Found a bug in the login page',
      });

      expect(result).toEqual(mockFeedback);
      expect(repo.create).toHaveBeenCalledWith('user-1', {
        subject: 'Bug Report',
        message: 'Found a bug in the login page',
      });
    });

    it('should trim subject and message', async () => {
      repo.create.mockResolvedValue(mockFeedback);

      await service.createFeedback('user-1', {
        subject: '  Bug Report  ',
        message: '  Found a bug  ',
      });

      expect(repo.create).toHaveBeenCalledWith('user-1', {
        subject: 'Bug Report',
        message: 'Found a bug',
      });
    });

    it('should throw ValidationError when subject is empty', async () => {
      await expect(
        service.createFeedback('user-1', { subject: '', message: 'Some message' })
      ).rejects.toThrow('Subject is required');
    });

    it('should throw ValidationError when subject is whitespace only', async () => {
      await expect(
        service.createFeedback('user-1', { subject: '   ', message: 'Some message' })
      ).rejects.toThrow('Subject is required');
    });

    it('should throw ValidationError when subject exceeds 255 characters', async () => {
      const longSubject = 'a'.repeat(256);
      await expect(
        service.createFeedback('user-1', { subject: longSubject, message: 'Some message' })
      ).rejects.toThrow('Subject must be at most 255 characters');
    });

    it('should throw ValidationError when message is empty', async () => {
      await expect(
        service.createFeedback('user-1', { subject: 'Bug', message: '' })
      ).rejects.toThrow('Message is required');
    });

    it('should throw ValidationError when message is whitespace only', async () => {
      await expect(
        service.createFeedback('user-1', { subject: 'Bug', message: '   ' })
      ).rejects.toThrow('Message is required');
    });

    it('should throw ValidationError when message exceeds 5000 characters', async () => {
      const longMessage = 'a'.repeat(5001);
      await expect(
        service.createFeedback('user-1', { subject: 'Bug', message: longMessage })
      ).rejects.toThrow('Message must be at most 5000 characters');
    });
  });

  describe('getAllFeedback', () => {
    it('should return all feedback', async () => {
      const feedbackList = [
        { ...mockFeedback, userName: 'PR_Admin' },
      ];
      repo.findAll.mockResolvedValue(feedbackList);

      const result = await service.getAllFeedback();
      expect(result).toEqual(feedbackList);
      expect(repo.findAll).toHaveBeenCalled();
    });
  });

  describe('deleteFeedback', () => {
    it('should delete feedback successfully', async () => {
      repo.findById.mockResolvedValue(mockFeedback);
      repo.delete.mockResolvedValue(true);

      await service.deleteFeedback('fb-1');

      expect(repo.findById).toHaveBeenCalledWith('fb-1');
      expect(repo.delete).toHaveBeenCalledWith('fb-1');
    });

    it('should throw NotFoundError when feedback does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.deleteFeedback('nonexistent')).rejects.toThrow(
        "Feedback with id 'nonexistent' not found"
      );
    });

    it('should throw error when delete fails unexpectedly', async () => {
      repo.findById.mockResolvedValue(mockFeedback);
      repo.delete.mockResolvedValue(false);

      await expect(service.deleteFeedback('fb-1')).rejects.toThrow('Failed to delete feedback');
    });
  });
});
