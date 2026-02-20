// Unit tests for AuthService
import { AuthService } from '../../src/services/auth.service';
import { UserRepository } from '../../src/repositories/user.repository';
import { SessionRepository } from '../../src/repositories/session.repository';
import { TokenRepository } from '../../src/repositories/token.repository';
import {
  UnauthorizedError,
  ForbiddenError,
  AccountLockedError,
  ValidationError,
} from '../../src/utils/errors';
import { User, UserType } from '../../src/models/user.model';
import { UserRole } from '../../src/models/role.model';

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcrypt') as { hash: jest.Mock; compare: jest.Mock };

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockSessionRepo: jest.Mocked<SessionRepository>;
  let mockTokenRepo: jest.Mocked<TokenRepository>;

  const now = new Date('2026-01-01T00:00:00Z');

  const sampleUser: User = {
    id: 'user-1',
    name: 'john.doe',
    fullName: 'John Doe',
    email: 'john@example.com',
    active: true,
    blocked: false,
    blockedSince: null,
    failedLogins: 0,
    lastLogin: null,
    webServiceUser: false,
    isAnonymous: false,
    isLocalUser: true,
    userType: UserType.Internal,
    departmentId: null,
    teamId: null,
    createdAt: now,
    updatedAt: now,
  };

  const userRole: UserRole = {
    id: 'role-1',
    name: 'User',
    description: 'Basic access',
    createdAt: now,
    updatedAt: now,
  };

  const sampleSession = {
    id: 'session-1',
    userId: 'user-1',
    csrfToken: 'csrf-abc',
    lastActive: now,
    createdAt: now,
  };

  const sampleTokenRecord = {
    id: 'token-1',
    userId: 'user-1',
    sessionId: 'session-1',
    tokenHash: 'hashed-refresh',
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    userAgent: 'TestAgent',
    createdAt: now,
  };

  beforeEach(() => {
    mockUserRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIdWithRoles: jest.fn(),
      findByName: jest.fn(),
      findPasswordHashById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updatePassword: jest.fn(),
      updateStatus: jest.fn(),
      updateLastLogin: jest.fn(),
      delete: jest.fn(),
      getUserRoles: jest.fn(),
      setUserRoles: jest.fn(),
      isRoleAssignedToAnyUser: jest.fn(),
      updateTeamAssignment: jest.fn(),
    } as jest.Mocked<UserRepository>;

    mockSessionRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      updateLastActive: jest.fn(),
      delete: jest.fn(),
      deleteByUserId: jest.fn(),
    } as jest.Mocked<SessionRepository>;

    mockTokenRepo = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      deleteByTokenHash: jest.fn(),
      deleteBySessionId: jest.fn(),
      deleteByUserId: jest.fn(),
      deleteExpired: jest.fn(),
    } as jest.Mocked<TokenRepository>;

    service = new AuthService(mockUserRepo, mockSessionRepo, mockTokenRepo);
    jest.clearAllMocks();
    bcrypt.compare.mockResolvedValue(true);
  });

  describe('login', () => {
    beforeEach(() => {
      mockUserRepo.findByName.mockResolvedValue(sampleUser);
      mockUserRepo.findPasswordHashById.mockResolvedValue('$2b$10$oldhash');
      mockUserRepo.updateStatus.mockResolvedValue(sampleUser);
      mockUserRepo.updateLastLogin.mockResolvedValue(undefined);
      mockUserRepo.getUserRoles.mockResolvedValue([userRole]);
      mockSessionRepo.create.mockResolvedValue(sampleSession);
      mockTokenRepo.create.mockResolvedValue(sampleTokenRecord);
    });

    it('should return tokens and user on successful login', async () => {
      const result = await service.login({ name: 'john.doe', password: 'Password1' }, 'TestAgent');

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBeDefined();
      expect(result.csrfToken).toBeDefined();
      expect(result.user.id).toBe('user-1');
      expect(result.user.name).toBe('john.doe');
      expect(result.user.roles).toHaveLength(1);
    });

    it('should reset failedLogins on successful login', async () => {
      await service.login({ name: 'john.doe', password: 'Password1' }, null);

      expect(mockUserRepo.updateStatus).toHaveBeenCalledWith('user-1', { failedLogins: 0 });
    });

    it('should update lastLogin on successful login', async () => {
      await service.login({ name: 'john.doe', password: 'Password1' }, null);

      expect(mockUserRepo.updateLastLogin).toHaveBeenCalledWith('user-1');
    });

    it('should create a session with csrfToken', async () => {
      await service.login({ name: 'john.doe', password: 'Password1' }, null);

      expect(mockSessionRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        csrfToken: expect.any(String),
      });
    });

    it('should store hashed refresh token', async () => {
      await service.login({ name: 'john.doe', password: 'Password1' }, 'TestAgent');

      expect(mockTokenRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        sessionId: 'session-1',
        tokenHash: expect.any(String),
        expiryDate: expect.any(Date),
        userAgent: 'TestAgent',
      });
    });

    it('should throw ValidationError when name is missing', async () => {
      await expect(service.login({ name: '', password: 'Password1' }, null)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw UnauthorizedError when user not found', async () => {
      mockUserRepo.findByName.mockResolvedValue(null);

      await expect(
        service.login({ name: 'nonexistent', password: 'Password1' }, null)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw AccountLockedError when user is blocked', async () => {
      mockUserRepo.findByName.mockResolvedValue({ ...sampleUser, blocked: true });

      await expect(
        service.login({ name: 'john.doe', password: 'Password1' }, null)
      ).rejects.toThrow(AccountLockedError);
    });

    it('should throw UnauthorizedError when user is inactive', async () => {
      mockUserRepo.findByName.mockResolvedValue({ ...sampleUser, active: false });

      await expect(
        service.login({ name: 'john.doe', password: 'Password1' }, null)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw ForbiddenError for web service users', async () => {
      mockUserRepo.findByName.mockResolvedValue({ ...sampleUser, webServiceUser: true });

      await expect(
        service.login({ name: 'john.doe', password: 'Password1' }, null)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should increment failedLogins on wrong password', async () => {
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        service.login({ name: 'john.doe', password: 'WrongPass1' }, null)
      ).rejects.toThrow(UnauthorizedError);

      expect(mockUserRepo.updateStatus).toHaveBeenCalledWith('user-1', {
        failedLogins: 1,
      });
    });

    it('should lock account after 5 failed attempts', async () => {
      bcrypt.compare.mockResolvedValue(false);
      mockUserRepo.findByName.mockResolvedValue({ ...sampleUser, failedLogins: 4 });

      await expect(
        service.login({ name: 'john.doe', password: 'WrongPass1' }, null)
      ).rejects.toThrow(UnauthorizedError);

      expect(mockUserRepo.updateStatus).toHaveBeenCalledWith('user-1', {
        blocked: true,
        blockedSince: expect.any(Date),
        failedLogins: 5,
      });
    });
  });

  describe('refresh', () => {
    beforeEach(() => {
      mockTokenRepo.findByTokenHash.mockResolvedValue(sampleTokenRecord);
      mockTokenRepo.deleteByTokenHash.mockResolvedValue(true);
      mockTokenRepo.create.mockResolvedValue(sampleTokenRecord);
      mockUserRepo.findById.mockResolvedValue(sampleUser);
      mockUserRepo.getUserRoles.mockResolvedValue([userRole]);
      mockSessionRepo.updateLastActive.mockResolvedValue(undefined);
    });

    it('should return new tokens on valid refresh', async () => {
      const result = await service.refresh({ refreshToken: 'valid-token' }, 'TestAgent');

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBeDefined();
    });

    it('should delete old token (rotation)', async () => {
      await service.refresh({ refreshToken: 'valid-token' }, null);

      expect(mockTokenRepo.deleteByTokenHash).toHaveBeenCalled();
    });

    it('should update session lastActive', async () => {
      await service.refresh({ refreshToken: 'valid-token' }, null);

      expect(mockSessionRepo.updateLastActive).toHaveBeenCalledWith('session-1');
    });

    it('should throw UnauthorizedError for unknown refresh token', async () => {
      mockTokenRepo.findByTokenHash.mockResolvedValue(null);

      await expect(service.refresh({ refreshToken: 'unknown-token' }, null)).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('should throw UnauthorizedError for expired refresh token', async () => {
      mockTokenRepo.findByTokenHash.mockResolvedValue({
        ...sampleTokenRecord,
        expiryDate: new Date(Date.now() - 1000),
      });

      await expect(service.refresh({ refreshToken: 'expired-token' }, null)).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('should throw AccountLockedError if user became blocked', async () => {
      mockUserRepo.findById.mockResolvedValue({ ...sampleUser, blocked: true });

      await expect(service.refresh({ refreshToken: 'valid-token' }, null)).rejects.toThrow(
        AccountLockedError
      );
    });

    it('should throw UnauthorizedError if user became inactive', async () => {
      mockUserRepo.findById.mockResolvedValue({ ...sampleUser, active: false });

      await expect(service.refresh({ refreshToken: 'valid-token' }, null)).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('should throw ValidationError when refreshToken is missing', async () => {
      await expect(service.refresh({ refreshToken: '' }, null)).rejects.toThrow(ValidationError);
    });
  });

  describe('logout', () => {
    it('should delete session and tokens', async () => {
      mockTokenRepo.findByTokenHash.mockResolvedValue(sampleTokenRecord);
      mockTokenRepo.deleteBySessionId.mockResolvedValue(undefined);
      mockSessionRepo.delete.mockResolvedValue(true);

      await service.logout({ refreshToken: 'valid-token' });

      expect(mockTokenRepo.deleteBySessionId).toHaveBeenCalledWith('session-1');
      expect(mockSessionRepo.delete).toHaveBeenCalledWith('session-1');
    });

    it('should be idempotent when token not found', async () => {
      mockTokenRepo.findByTokenHash.mockResolvedValue(null);

      await expect(service.logout({ refreshToken: 'unknown-token' })).resolves.toBeUndefined();

      expect(mockTokenRepo.deleteBySessionId).not.toHaveBeenCalled();
      expect(mockSessionRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when refreshToken is missing', async () => {
      await expect(service.logout({ refreshToken: '' })).rejects.toThrow(ValidationError);
    });
  });
});
