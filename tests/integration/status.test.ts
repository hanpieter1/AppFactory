// Integration tests for status endpoint
import request from 'supertest';
import { createApp } from '../../src/app';

jest.mock('../../src/repositories/project.repository', () => ({
  ProjectRepository: jest.fn(),
  projectRepository: {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    hasChildProjects: jest.fn(),
  },
}));

jest.mock('../../src/repositories/feedback.repository', () => ({
  FeedbackRepository: jest.fn(),
  feedbackRepository: {
    create: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('GET /api/status', () => {
  const app = createApp();

  it('should return status information', async () => {
    const response = await request(app).get('/api/status');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('application');
    expect(response.body.application).toHaveProperty('name', 'AppFactory');
    expect(response.body.application).toHaveProperty('version', '1.0.0');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return JSON content type', async () => {
    const response = await request(app).get('/api/status');

    expect(response.headers['content-type']).toMatch(/json/);
  });
});
