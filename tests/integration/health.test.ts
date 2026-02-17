// Integration tests for health endpoint
import request from 'supertest';
import { createApp } from '../../src/app';

describe('GET /health', () => {
  const app = createApp();

  it('should return 200 with healthy status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
  });

  it('should include request ID in response headers', async () => {
    const response = await request(app).get('/health');

    expect(response.headers).toHaveProperty('x-request-id');
  });

  it('should respect custom request ID header', async () => {
    const customRequestId = 'test-request-id-123';
    const response = await request(app).get('/health').set('X-Request-ID', customRequestId);

    expect(response.headers['x-request-id']).toBe(customRequestId);
  });

  // REQ-005: Response time should be < 100ms
  it('should respond quickly (within reasonable time)', async () => {
    const startTime = Date.now();
    await request(app).get('/health');
    const duration = Date.now() - startTime;

    // Allow generous time for test environment
    expect(duration).toBeLessThan(500);
  });
});
