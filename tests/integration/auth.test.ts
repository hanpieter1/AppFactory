// Integration tests for /api/auth endpoints
import request from 'supertest';
import { createApp } from '../../src/app';
import { User, UserType } from '../../src/models/user.model';
import { UserRole } from '../../src/models/role.model';

// Mock the database pool
jest.mock('../../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcrypt') as { hash: jest.Mock; compare: jest.Mock };

// Mock user repository singleton
const mockUserFindByName = jest.fn();
const mockUserFindById = jest.fn();
const mockUserFindPasswordHashById = jest.fn();
const mockUserUpdateStatus = jest.fn();
const mockUserUpdateLastLogin = jest.fn();
const mockUserGetUserRoles = jest.fn();

jest.mock('../../src/repositories/user.repository', () => ({
  UserRepository: jest.fn(),
  userRepository: {
    findAll: jest.fn(),
    findById: (...args: unknown[]) => mockUserFindById(...args),
    findByIdWithRoles: jest.fn(),
    findByName: (...args: unknown[]) => mockUserFindByName(...args),
    findPasswordHashById: (...args: unknown[]) => mockUserFindPasswordHashById(...args),
    create: jest.fn(),
    update: jest.fn(),
    updatePassword: jest.fn(),
    updateStatus: (...args: unknown[]) => mockUserUpdateStatus(...args),
    updateLastLogin: (...args: unknown[]) => mockUserUpdateLastLogin(...args),
    delete: jest.fn(),
    getUserRoles: (...args: unknown[]) => mockUserGetUserRoles(...args),
    setUserRoles: jest.fn(),
    isRoleAssignedToAnyUser: jest.fn(),
    updateTeamAssignment: jest.fn(),
  },
}));

// Mock role repository singleton
jest.mock('../../src/repositories/role.repository', () => ({
  RoleRepository: jest.fn(),
  roleRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdWithGrantable: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    isRoleAssignedToUsers: jest.fn(),
    isRoleReferencedAsGrantable: jest.fn(),
    getGrantableRoles: jest.fn(),
    setGrantableRoles: jest.fn(),
  },
}));

// Mock session repository singleton
const mockSessionCreate = jest.fn();
const mockSessionDelete = jest.fn();

jest.mock('../../src/repositories/session.repository', () => ({
  SessionRepository: jest.fn(),
  sessionRepository: {
    create: (...args: unknown[]) => mockSessionCreate(...args),
    findById: jest.fn(),
    updateLastActive: jest.fn(),
    delete: (...args: unknown[]) => mockSessionDelete(...args),
    deleteByUserId: jest.fn(),
  },
}));

// Mock token repository singleton
const mockTokenCreate = jest.fn();
const mockTokenFindByTokenHash = jest.fn();
const mockTokenDeleteByTokenHash = jest.fn();
const mockTokenDeleteBySessionId = jest.fn();

jest.mock('../../src/repositories/token.repository', () => ({
  TokenRepository: jest.fn(),
  tokenRepository: {
    create: (...args: unknown[]) => mockTokenCreate(...args),
    findByTokenHash: (...args: unknown[]) => mockTokenFindByTokenHash(...args),
    deleteByTokenHash: (...args: unknown[]) => mockTokenDeleteByTokenHash(...args),
    deleteBySessionId: (...args: unknown[]) => mockTokenDeleteBySessionId(...args),
    deleteByUserId: jest.fn(),
    deleteExpired: jest.fn(),
  },
}));

jest.mock('../../src/repositories/department.repository', () => ({
  DepartmentRepository: jest.fn(),
  departmentRepository: {
    findAll: jest.fn(), findById: jest.fn(), findByName: jest.fn(),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(),
    hasTeams: jest.fn(), hasMembers: jest.fn(),
  },
}));

jest.mock('../../src/repositories/team.repository', () => ({
  TeamRepository: jest.fn(),
  teamRepository: {
    findAll: jest.fn(), findById: jest.fn(), findByNameInDepartment: jest.fn(),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(),
    hasMembers: jest.fn(), getTeamMembers: jest.fn(),
  },
}));

jest.mock('../../src/repositories/project-role.repository', () => ({
  ProjectRoleRepository: jest.fn(),
  projectRoleRepository: {
    findAll: jest.fn(), findById: jest.fn(), findByName: jest.fn(),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(),
  },
}));

jest.mock('../../src/repositories/module.repository', () => ({
  ModuleRepository: jest.fn(),
  moduleRepository: {
    findAll: jest.fn(), findById: jest.fn(), findByName: jest.fn(),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(), hasModuleRoles: jest.fn(),
  },
}));

jest.mock('../../src/repositories/module-role.repository', () => ({
  ModuleRoleRepository: jest.fn(),
  moduleRoleRepository: {
    findById: jest.fn(), findByModuleId: jest.fn(), findByNameInModule: jest.fn(),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(), isModuleRoleMapped: jest.fn(),
    getModuleRolesForUserRole: jest.fn(), addModuleRoleToUserRole: jest.fn(),
    removeModuleRoleFromUserRole: jest.fn(), isMappingExists: jest.fn(),
  },
}));

jest.mock('../../src/repositories/client.repository', () => ({
  ClientRepository: jest.fn(),
  clientRepository: {
    findAll: jest.fn(), findById: jest.fn(), findByCode: jest.fn(),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(),
  },
}));

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

describe('/api/auth', () => {
  const app = createApp();

  const now = new Date('2026-01-01T00:00:00Z');

  const userRole: UserRole = {
    id: 'role-1',
    name: 'User',
    description: 'Basic access',
    createdAt: now,
    updatedAt: now,
  };

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
    tokenHash: 'hashed-token',
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    userAgent: null,
    createdAt: now,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.compare.mockResolvedValue(true);
  });

  // ---- POST /api/auth/login ----
  describe('POST /api/auth/login', () => {
    beforeEach(() => {
      mockUserFindByName.mockResolvedValue(sampleUser);
      mockUserFindPasswordHashById.mockResolvedValue('$2b$10$oldhash');
      mockUserUpdateStatus.mockResolvedValue(sampleUser);
      mockUserUpdateLastLogin.mockResolvedValue(undefined);
      mockUserGetUserRoles.mockResolvedValue([userRole]);
      mockSessionCreate.mockResolvedValue(sampleSession);
      mockTokenCreate.mockResolvedValue(sampleTokenRecord);
    });

    it('should return 200 with tokens on successful login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ name: 'john.doe', password: 'Password1' });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.csrfToken).toBeDefined();
      expect(response.body.user.id).toBe('user-1');
      expect(response.body.user.name).toBe('john.doe');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app).post('/api/auth/login').send({ password: 'Password1' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app).post('/api/auth/login').send({ name: 'john.doe' });

      expect(response.status).toBe(400);
    });

    it('should return 401 when user not found', async () => {
      mockUserFindByName.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ name: 'nonexistent', password: 'Password1' });

      expect(response.status).toBe(401);
    });

    it('should return 401 when password is wrong', async () => {
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ name: 'john.doe', password: 'WrongPass1' });

      expect(response.status).toBe(401);
    });

    it('should return 423 when account is locked', async () => {
      mockUserFindByName.mockResolvedValue({ ...sampleUser, blocked: true });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ name: 'john.doe', password: 'Password1' });

      expect(response.status).toBe(423);
    });

    it('should return 401 when account is inactive', async () => {
      mockUserFindByName.mockResolvedValue({ ...sampleUser, active: false });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ name: 'john.doe', password: 'Password1' });

      expect(response.status).toBe(401);
    });

    it('should return 403 for web service accounts', async () => {
      mockUserFindByName.mockResolvedValue({ ...sampleUser, webServiceUser: true });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ name: 'john.doe', password: 'Password1' });

      expect(response.status).toBe(403);
    });
  });

  // ---- POST /api/auth/refresh ----
  describe('POST /api/auth/refresh', () => {
    beforeEach(() => {
      mockTokenFindByTokenHash.mockResolvedValue(sampleTokenRecord);
      mockTokenDeleteByTokenHash.mockResolvedValue(true);
      mockTokenCreate.mockResolvedValue(sampleTokenRecord);
      mockUserFindById.mockResolvedValue(sampleUser);
      mockUserGetUserRoles.mockResolvedValue([userRole]);
    });

    it('should return 200 with new tokens', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should return 400 when refreshToken is missing', async () => {
      const response = await request(app).post('/api/auth/refresh').send({});

      expect(response.status).toBe(400);
    });

    it('should return 401 when refresh token is invalid', async () => {
      mockTokenFindByTokenHash.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
    });
  });

  // ---- POST /api/auth/logout ----
  describe('POST /api/auth/logout', () => {
    it('should return 204 on successful logout', async () => {
      mockTokenFindByTokenHash.mockResolvedValue(sampleTokenRecord);
      mockTokenDeleteBySessionId.mockResolvedValue(undefined);
      mockSessionDelete.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(response.status).toBe(204);
    });

    it('should return 400 when refreshToken is missing', async () => {
      const response = await request(app).post('/api/auth/logout').send({});

      expect(response.status).toBe(400);
    });

    it('should return 204 when token is already invalidated (idempotent)', async () => {
      mockTokenFindByTokenHash.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'unknown-token' });

      expect(response.status).toBe(204);
    });
  });
});
