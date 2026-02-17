// Unit tests for auth middleware
import { Request, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../src/middleware/auth';
import { UnauthorizedError } from '../../src/utils/errors';

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require('jsonwebtoken') as { verify: jest.Mock };

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  sign: jest.fn(),
}));

describe('authMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should call next() with valid Bearer token', () => {
    jwt.verify.mockReturnValue({
      userId: 'user-1',
      sessionId: 'session-1',
      roles: ['User'],
      moduleRoles: [],
    });
    mockReq.headers = { authorization: 'Bearer valid.jwt.token' };

    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect((mockReq as AuthenticatedRequest).userId).toBe('user-1');
    expect((mockReq as AuthenticatedRequest).sessionId).toBe('session-1');
    expect((mockReq as AuthenticatedRequest).roles).toEqual(['User']);
    expect((mockReq as AuthenticatedRequest).moduleRoles).toEqual([]);
  });

  it('should throw UnauthorizedError when Authorization header is missing', () => {
    mockReq.headers = {};

    expect(() => {
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    }).toThrow(UnauthorizedError);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError when header does not start with Bearer', () => {
    mockReq.headers = { authorization: 'Basic abc123' };

    expect(() => {
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    }).toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError when token is invalid', () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });
    mockReq.headers = { authorization: 'Bearer invalid.token' };

    expect(() => {
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    }).toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError when token is expired', () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    mockReq.headers = { authorization: 'Bearer expired.token' };

    expect(() => {
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    }).toThrow(UnauthorizedError);
  });
});
