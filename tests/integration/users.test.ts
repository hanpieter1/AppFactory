// Integration tests for /api/users endpoints
import request from 'supertest';
import { createApp } from '../../src/app';
import { User, UserWithRoles, UserType } from '../../src/models/user.model';
import { UserRole } from '../../src/models/role.model';

// Mock the database pool so repository doesn't try to connect
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
  verify: jest.fn().mockReturnValue({
    userId: 'user-1',
    sessionId: 'session-1',
    roles: ['User'],
    moduleRoles: [],
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcrypt') as { hash: jest.Mock; compare: jest.Mock };

// Mock user repository singleton
const mockUserFindAll = jest.fn();
const mockUserFindById = jest.fn();
const mockUserFindByIdWithRoles = jest.fn();
const mockUserFindByName = jest.fn();
const mockUserFindPasswordHashById = jest.fn();
const mockUserCreate = jest.fn();
const mockUserUpdate = jest.fn();
const mockUserUpdatePassword = jest.fn();
const mockUserUpdateStatus = jest.fn();
const mockUserUpdateLastLogin = jest.fn();
const mockUserDelete = jest.fn();
const mockUserGetUserRoles = jest.fn();
const mockUserSetUserRoles = jest.fn();
const mockUserIsRoleAssignedToAnyUser = jest.fn();

jest.mock('../../src/repositories/user.repository', () => ({
  UserRepository: jest.fn(),
  userRepository: {
    findAll: (...args: unknown[]) => mockUserFindAll(...args),
    findById: (...args: unknown[]) => mockUserFindById(...args),
    findByIdWithRoles: (...args: unknown[]) => mockUserFindByIdWithRoles(...args),
    findByName: (...args: unknown[]) => mockUserFindByName(...args),
    findPasswordHashById: (...args: unknown[]) => mockUserFindPasswordHashById(...args),
    create: (...args: unknown[]) => mockUserCreate(...args),
    update: (...args: unknown[]) => mockUserUpdate(...args),
    updatePassword: (...args: unknown[]) => mockUserUpdatePassword(...args),
    updateStatus: (...args: unknown[]) => mockUserUpdateStatus(...args),
    updateLastLogin: (...args: unknown[]) => mockUserUpdateLastLogin(...args),
    delete: (...args: unknown[]) => mockUserDelete(...args),
    getUserRoles: (...args: unknown[]) => mockUserGetUserRoles(...args),
    setUserRoles: (...args: unknown[]) => mockUserSetUserRoles(...args),
    isRoleAssignedToAnyUser: (...args: unknown[]) => mockUserIsRoleAssignedToAnyUser(...args),
    updateTeamAssignment: jest.fn(),
  },
}));

// Mock role repository singleton (needed by UserService constructor and role validation)
const mockRoleFindById = jest.fn();
const mockRoleGetGrantableRoleIdsForRoles = jest.fn();

jest.mock('../../src/repositories/role.repository', () => ({
  RoleRepository: jest.fn(),
  roleRepository: {
    findAll: jest.fn(),
    findById: (...args: unknown[]) => mockRoleFindById(...args),
    findByIdWithGrantable: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    isRoleAssignedToUsers: jest.fn(),
    isRoleReferencedAsGrantable: jest.fn(),
    getGrantableRoles: jest.fn(),
    getGrantableRoleIdsForRoles: (...args: unknown[]) =>
      mockRoleGetGrantableRoleIdsForRoles(...args),
    setGrantableRoles: jest.fn(),
  },
}));

// Mock session repository singleton (needed by auth routes mounted in app)
jest.mock('../../src/repositories/session.repository', () => ({
  SessionRepository: jest.fn(),
  sessionRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    updateLastActive: jest.fn(),
    delete: jest.fn(),
    deleteByUserId: jest.fn(),
  },
}));

// Mock token repository singleton (needed by auth routes mounted in app)
jest.mock('../../src/repositories/token.repository', () => ({
  TokenRepository: jest.fn(),
  tokenRepository: {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    deleteByTokenHash: jest.fn(),
    deleteBySessionId: jest.fn(),
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

describe('/api/users', () => {
  const app = createApp();

  const now = new Date('2026-01-01T00:00:00Z');

  const adminRole: UserRole = {
    id: 'role-admin',
    name: 'Administrator',
    description: 'Full access',
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

  const sampleUserWithRoles: UserWithRoles = {
    ...sampleUser,
    roles: [userRole],
  };

  const AUTH_HEADER = ['Authorization', 'Bearer mock.jwt.token'] as const;

  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue('$2b$10$hashedpassword');
    // Default: acting user (user-1 from JWT) is an Administrator → bypasses delegation
    mockUserGetUserRoles.mockResolvedValue([adminRole]);
  });

  // ---- POST /api/users ----
  describe('POST /api/users', () => {
    it('should create a user and return 201', async () => {
      mockUserFindByName.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue(sampleUser);
      mockUserFindByIdWithRoles.mockResolvedValue(sampleUserWithRoles);

      const response = await request(app)
        .post('/api/users')
        .set(...AUTH_HEADER)
        .send({
          name: 'john.doe',
          password: 'Password1',
          fullName: 'John Doe',
          email: 'john@example.com',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('john.doe');
    });

    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'john.doe', password: 'Password1' });

      expect(response.status).toBe(401);
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/users')
        .set(...AUTH_HEADER)
        .send({ password: 'Password1' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/users')
        .set(...AUTH_HEADER)
        .send({ name: 'john.doe' });

      expect(response.status).toBe(400);
    });

    it('should return 409 when username already exists', async () => {
      mockUserFindByName.mockResolvedValue(sampleUser);

      const response = await request(app)
        .post('/api/users')
        .set(...AUTH_HEADER)
        .send({
          name: 'john.doe',
          password: 'Password1',
        });

      expect(response.status).toBe(409);
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/users')
        .set(...AUTH_HEADER)
        .send({
          name: 'john.doe',
          password: 'weak',
        });

      expect(response.status).toBe(400);
    });
  });

  // ---- POST /api/users/webservice ----
  describe('POST /api/users/webservice', () => {
    it('should create a web service user and return 201', async () => {
      mockUserFindByName.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue({ ...sampleUser, webServiceUser: true });
      mockUserFindByIdWithRoles.mockResolvedValue({
        ...sampleUserWithRoles,
        webServiceUser: true,
      });

      const response = await request(app)
        .post('/api/users/webservice')
        .set(...AUTH_HEADER)
        .send({
          name: 'api-bot',
          password: 'Password1',
          fullName: 'API Bot',
        });

      expect(response.status).toBe(201);
      expect(response.body.webServiceUser).toBe(true);
    });

    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app)
        .post('/api/users/webservice')
        .send({ name: 'api-bot', password: 'Password1' });

      expect(response.status).toBe(401);
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/users/webservice')
        .set(...AUTH_HEADER)
        .send({ password: 'Password1' });

      expect(response.status).toBe(400);
    });
  });

  // ---- GET /api/users ----
  describe('GET /api/users', () => {
    const paginatedResult = {
      data: [sampleUser],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    const emptyResult = {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };

    it('should return paginated users (AC-056-01)', async () => {
      mockUserFindAll.mockResolvedValue(paginatedResult);

      const response = await request(app)
        .get('/api/users')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app).get('/api/users');

      expect(response.status).toBe(401);
    });

    it('should pass active filter (AC-056-04)', async () => {
      mockUserFindAll.mockResolvedValue(emptyResult);

      await request(app)
        .get('/api/users?active=true')
        .set(...AUTH_HEADER);

      expect(mockUserFindAll).toHaveBeenCalledWith(expect.objectContaining({ active: true }));
    });

    it('should pass webServiceUser filter (AC-056-05)', async () => {
      mockUserFindAll.mockResolvedValue(emptyResult);

      await request(app)
        .get('/api/users?webServiceUser=false')
        .set(...AUTH_HEADER);

      expect(mockUserFindAll).toHaveBeenCalledWith(
        expect.objectContaining({ webServiceUser: false })
      );
    });

    it('should pass isLocalUser filter (AC-056-06)', async () => {
      mockUserFindAll.mockResolvedValue(emptyResult);

      await request(app)
        .get('/api/users?isLocalUser=true')
        .set(...AUTH_HEADER);

      expect(mockUserFindAll).toHaveBeenCalledWith(expect.objectContaining({ isLocalUser: true }));
    });

    it('should pass search query (AC-056-02)', async () => {
      mockUserFindAll.mockResolvedValue(emptyResult);

      await request(app)
        .get('/api/users?search=john')
        .set(...AUTH_HEADER);

      expect(mockUserFindAll).toHaveBeenCalledWith(expect.objectContaining({ search: 'john' }));
    });

    it('should pass role filter (AC-056-03)', async () => {
      mockUserFindAll.mockResolvedValue(emptyResult);

      await request(app)
        .get('/api/users?role=Administrator')
        .set(...AUTH_HEADER);

      expect(mockUserFindAll).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'Administrator' })
      );
    });

    it('should pass sorting params (AC-056-07)', async () => {
      mockUserFindAll.mockResolvedValue(emptyResult);

      await request(app)
        .get('/api/users?sortBy=lastLogin&order=desc')
        .set(...AUTH_HEADER);

      expect(mockUserFindAll).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'lastLogin', order: 'desc' })
      );
    });

    it('should pass pagination params (AC-056-08)', async () => {
      mockUserFindAll.mockResolvedValue(emptyResult);

      await request(app)
        .get('/api/users?page=2&limit=10')
        .set(...AUTH_HEADER);

      expect(mockUserFindAll).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 10 }));
    });

    it('should ignore invalid sortBy values', async () => {
      mockUserFindAll.mockResolvedValue(emptyResult);

      await request(app)
        .get('/api/users?sortBy=invalid')
        .set(...AUTH_HEADER);

      const callArg = mockUserFindAll.mock.calls[0][0];
      expect(callArg?.sortBy).toBeUndefined();
    });

    it('should cap limit at 100', async () => {
      mockUserFindAll.mockResolvedValue(emptyResult);

      await request(app)
        .get('/api/users?limit=500')
        .set(...AUTH_HEADER);

      expect(mockUserFindAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }));
    });

    it('should return empty data when no users', async () => {
      mockUserFindAll.mockResolvedValue(emptyResult);

      const response = await request(app)
        .get('/api/users')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });
  });

  // ---- GET /api/users/:id ----
  describe('GET /api/users/:id', () => {
    it('should return user with roles', async () => {
      mockUserFindByIdWithRoles.mockResolvedValue(sampleUserWithRoles);

      const response = await request(app)
        .get('/api/users/user-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('john.doe');
      expect(response.body.roles).toHaveLength(1);
    });

    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app).get('/api/users/user-1');

      expect(response.status).toBe(401);
    });

    it('should return 404 when user not found', async () => {
      mockUserFindByIdWithRoles.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/nonexistent')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(404);
    });
  });

  // ---- PUT /api/users/:id ----
  describe('PUT /api/users/:id', () => {
    it('should update user profile and return 200', async () => {
      mockUserFindById.mockResolvedValue(sampleUser);
      mockUserUpdate.mockResolvedValue(sampleUser);
      mockUserFindByIdWithRoles.mockResolvedValue(sampleUserWithRoles);

      const response = await request(app)
        .put('/api/users/user-1')
        .set(...AUTH_HEADER)
        .send({ fullName: 'Jane Doe' });

      expect(response.status).toBe(200);
    });

    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app).put('/api/users/user-1').send({ fullName: 'Jane Doe' });

      expect(response.status).toBe(401);
    });

    it('should return 404 when user not found', async () => {
      mockUserFindById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/users/nonexistent')
        .set(...AUTH_HEADER)
        .send({ fullName: 'Jane' });

      expect(response.status).toBe(404);
    });
  });

  // ---- PUT /api/users/:id/roles ----
  describe('PUT /api/users/:id/roles', () => {
    it('should update user roles and return 200', async () => {
      mockUserFindById.mockResolvedValue(sampleUser);
      mockRoleFindById.mockResolvedValue(userRole);
      mockUserSetUserRoles.mockResolvedValue(undefined);
      mockUserFindByIdWithRoles.mockResolvedValue(sampleUserWithRoles);

      const response = await request(app)
        .put('/api/users/user-1/roles')
        .set(...AUTH_HEADER)
        .send({ roleIds: ['role-1'] });

      expect(response.status).toBe(200);
      expect(response.body.roles).toHaveLength(1);
    });

    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app)
        .put('/api/users/user-1/roles')
        .send({ roleIds: ['role-1'] });

      expect(response.status).toBe(401);
    });

    it('should return 400 when roleIds is missing', async () => {
      const response = await request(app)
        .put('/api/users/user-1/roles')
        .set(...AUTH_HEADER)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 when roleIds is not an array', async () => {
      const response = await request(app)
        .put('/api/users/user-1/roles')
        .set(...AUTH_HEADER)
        .send({ roleIds: 'not-an-array' });

      expect(response.status).toBe(400);
    });

    it('should return 404 when user not found', async () => {
      mockUserFindById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/users/nonexistent/roles')
        .set(...AUTH_HEADER)
        .send({ roleIds: ['role-1'] });

      expect(response.status).toBe(404);
    });

    it('should return 403 when non-admin assigns non-grantable role', async () => {
      const managerRole: UserRole = {
        id: 'role-manager',
        name: 'Manager',
        description: 'Team management',
        createdAt: now,
        updatedAt: now,
      };
      mockUserGetUserRoles
        .mockResolvedValueOnce([managerRole]) // acting user's roles (context)
        .mockResolvedValueOnce([userRole]); // target user's roles (assertCanManageUser)
      mockRoleGetGrantableRoleIdsForRoles.mockResolvedValue(['role-1']);
      mockUserFindById.mockResolvedValue(sampleUser);

      const response = await request(app)
        .put('/api/users/user-1/roles')
        .set(...AUTH_HEADER)
        .send({ roleIds: ['role-admin'] });

      expect(response.status).toBe(403);
    });
  });

  // ---- PATCH /api/users/:id/status ----
  describe('PATCH /api/users/:id/status', () => {
    it('should deactivate user and return 200', async () => {
      mockUserFindById.mockResolvedValue(sampleUser);
      mockUserUpdateStatus.mockResolvedValue({ ...sampleUser, active: false });
      mockUserFindByIdWithRoles.mockResolvedValue({
        ...sampleUserWithRoles,
        active: false,
      });

      const response = await request(app)
        .patch('/api/users/user-1/status')
        .set(...AUTH_HEADER)
        .send({ active: false });

      expect(response.status).toBe(200);
      expect(response.body.active).toBe(false);
    });

    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app).patch('/api/users/user-1/status').send({ active: false });

      expect(response.status).toBe(401);
    });

    it('should unblock user and return 200', async () => {
      mockUserFindById.mockResolvedValue({ ...sampleUser, blocked: true });
      mockUserUpdateStatus.mockResolvedValue(sampleUser);
      mockUserFindByIdWithRoles.mockResolvedValue(sampleUserWithRoles);

      const response = await request(app)
        .patch('/api/users/user-1/status')
        .set(...AUTH_HEADER)
        .send({ blocked: false });

      expect(response.status).toBe(200);
    });

    it('should return 404 when user not found', async () => {
      mockUserFindById.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/users/nonexistent/status')
        .set(...AUTH_HEADER)
        .send({ active: true });

      expect(response.status).toBe(404);
    });
  });

  // ---- PUT /api/users/:id/password ----
  describe('PUT /api/users/:id/password', () => {
    it('should change password and return 200', async () => {
      mockUserFindById.mockResolvedValue(sampleUser);
      mockUserUpdatePassword.mockResolvedValue(true);

      const response = await request(app)
        .put('/api/users/user-1/password')
        .set(...AUTH_HEADER)
        .send({ newPassword: 'NewPass1!', confirmPassword: 'NewPass1!' });

      expect(response.status).toBe(200);
    });

    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app)
        .put('/api/users/user-1/password')
        .send({ newPassword: 'NewPass1!', confirmPassword: 'NewPass1!' });

      expect(response.status).toBe(401);
    });

    it('should return 400 when newPassword is missing', async () => {
      const response = await request(app)
        .put('/api/users/user-1/password')
        .set(...AUTH_HEADER)
        .send({ confirmPassword: 'NewPass1!' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when passwords do not match', async () => {
      mockUserFindById.mockResolvedValue(sampleUser);

      const response = await request(app)
        .put('/api/users/user-1/password')
        .set(...AUTH_HEADER)
        .send({ newPassword: 'NewPass1!', confirmPassword: 'DifferentPass1!' });

      expect(response.status).toBe(400);
    });

    it('should return 404 when user not found', async () => {
      mockUserFindById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/users/nonexistent/password')
        .set(...AUTH_HEADER)
        .send({ newPassword: 'NewPass1!', confirmPassword: 'NewPass1!' });

      expect(response.status).toBe(404);
    });
  });

  // ---- POST /api/users/:id/reset-password ----
  describe('POST /api/users/:id/reset-password', () => {
    it('should return temporary password', async () => {
      mockUserFindById.mockResolvedValue(sampleUser);
      mockUserUpdatePassword.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/users/user-1/reset-password')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body.temporaryPassword).toBeDefined();
    });

    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app).post('/api/users/user-1/reset-password');

      expect(response.status).toBe(401);
    });

    it('should return 404 when user not found', async () => {
      mockUserFindById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/users/nonexistent/reset-password')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(404);
    });
  });

  // ---- PUT /api/users/me ----
  describe('PUT /api/users/me', () => {
    it('should update own profile and return 200', async () => {
      mockUserFindById.mockResolvedValue(sampleUser);
      mockUserUpdate.mockResolvedValue(sampleUser);
      mockUserFindByIdWithRoles.mockResolvedValue(sampleUserWithRoles);

      const response = await request(app)
        .put('/api/users/me')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({ fullName: 'Updated Name', email: 'new@example.com' });

      expect(response.status).toBe(200);
    });

    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app).put('/api/users/me').send({ fullName: 'Updated Name' });

      expect(response.status).toBe(401);
    });

    it('should return 404 when user not found', async () => {
      mockUserFindById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/users/me')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({ fullName: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  // ---- PUT /api/users/me/password ----
  describe('PUT /api/users/me/password', () => {
    it('should change own password and return 200', async () => {
      mockUserFindById.mockResolvedValue(sampleUser);
      mockUserFindPasswordHashById.mockResolvedValue('$2b$10$oldhash');
      bcrypt.compare.mockResolvedValue(true);
      mockUserUpdatePassword.mockResolvedValue(true);

      const response = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({
          oldPassword: 'OldPass1!',
          newPassword: 'NewPass1!',
          confirmPassword: 'NewPass1!',
        });

      expect(response.status).toBe(200);
    });

    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app).put('/api/users/me/password').send({
        oldPassword: 'OldPass1!',
        newPassword: 'NewPass1!',
        confirmPassword: 'NewPass1!',
      });

      expect(response.status).toBe(401);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({ oldPassword: 'OldPass1!' });

      expect(response.status).toBe(400);
    });

    it('should return 401 when old password is wrong', async () => {
      mockUserFindById.mockResolvedValue(sampleUser);
      mockUserFindPasswordHashById.mockResolvedValue('$2b$10$oldhash');
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({
          oldPassword: 'WrongPass1!',
          newPassword: 'NewPass1!',
          confirmPassword: 'NewPass1!',
        });

      expect(response.status).toBe(401);
    });
  });
});
