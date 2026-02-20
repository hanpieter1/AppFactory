// Integration tests for /api/roles endpoints
import request from 'supertest';
import { createApp } from '../../src/app';
import { UserRole, UserRoleWithGrantable } from '../../src/models/role.model';

// Mock the database pool so repository doesn't try to connect
jest.mock('../../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

// Mock bcrypt (needed by auth service mounted in app)
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
    roles: ['Administrator'],
    moduleRoles: [],
  }),
}));

// Mock the repository module — service uses constructor injection,
// but routes.ts creates service with the singleton, so we mock the singleton
const mockFindAll = jest.fn();
const mockFindById = jest.fn();
const mockFindByIdWithGrantable = jest.fn();
const mockFindByName = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockIsRoleAssignedToUsers = jest.fn();
const mockIsRoleReferencedAsGrantable = jest.fn();
const mockGetGrantableRoles = jest.fn();
const mockSetGrantableRoles = jest.fn();

jest.mock('../../src/repositories/role.repository', () => ({
  RoleRepository: jest.fn(),
  roleRepository: {
    findAll: (...args: unknown[]) => mockFindAll(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    findByIdWithGrantable: (...args: unknown[]) => mockFindByIdWithGrantable(...args),
    findByName: (...args: unknown[]) => mockFindByName(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    isRoleAssignedToUsers: (...args: unknown[]) => mockIsRoleAssignedToUsers(...args),
    isRoleReferencedAsGrantable: (...args: unknown[]) => mockIsRoleReferencedAsGrantable(...args),
    getGrantableRoles: (...args: unknown[]) => mockGetGrantableRoles(...args),
    getGrantableRoleIdsForRoles: jest.fn(),
    setGrantableRoles: (...args: unknown[]) => mockSetGrantableRoles(...args),
  },
}));

// Mock user repository singleton (needed by roles route for admin check + app auth routes)
const mockUserGetUserRoles = jest.fn();

jest.mock('../../src/repositories/user.repository', () => ({
  UserRepository: jest.fn(),
  userRepository: {
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
    getUserRoles: (...args: unknown[]) => mockUserGetUserRoles(...args),
    setUserRoles: jest.fn(),
    isRoleAssignedToAnyUser: jest.fn(),
    updateTeamAssignment: jest.fn(),
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

// Mock module repository (needed by roles route for module role mapping)
jest.mock('../../src/repositories/module.repository', () => ({
  ModuleRepository: jest.fn(),
  moduleRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    hasModuleRoles: jest.fn(),
  },
}));

// Mock module role repository
const mockMRFindById = jest.fn();
const mockMRGetModuleRolesForUserRole = jest.fn();
const mockMRAddModuleRoleToUserRole = jest.fn();
const mockMRRemoveModuleRoleFromUserRole = jest.fn();
const mockMRIsMappingExists = jest.fn();

jest.mock('../../src/repositories/module-role.repository', () => ({
  ModuleRoleRepository: jest.fn(),
  moduleRoleRepository: {
    findById: (...args: unknown[]) => mockMRFindById(...args),
    findByModuleId: jest.fn(),
    findByNameInModule: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    isModuleRoleMapped: jest.fn(),
    getModuleRolesForUserRole: (...args: unknown[]) => mockMRGetModuleRolesForUserRole(...args),
    addModuleRoleToUserRole: (...args: unknown[]) => mockMRAddModuleRoleToUserRole(...args),
    removeModuleRoleFromUserRole: (...args: unknown[]) =>
      mockMRRemoveModuleRoleFromUserRole(...args),
    isMappingExists: (...args: unknown[]) => mockMRIsMappingExists(...args),
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

import { ModuleRole } from '../../src/models/module.model';

describe('/api/roles', () => {
  const app = createApp();

  const now = new Date('2026-01-01T00:00:00Z');

  const adminRole: UserRole = {
    id: 'role-1',
    name: 'Administrator',
    description: 'Full access',
    createdAt: now,
    updatedAt: now,
  };

  const userRole: UserRole = {
    id: 'role-2',
    name: 'User',
    description: 'Basic access',
    createdAt: now,
    updatedAt: now,
  };

  const adminWithGrantable: UserRoleWithGrantable = {
    ...adminRole,
    grantableRoles: [userRole],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/roles', () => {
    it('should create a role and return 201', async () => {
      mockFindByName.mockResolvedValue(null);
      mockCreate.mockResolvedValue(adminRole);

      const response = await request(app)
        .post('/api/roles')
        .send({ name: 'Administrator', description: 'Full access' });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Administrator');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app).post('/api/roles').send({ description: 'No name' });

      expect(response.status).toBe(400);
    });

    it('should return 409 when name already exists', async () => {
      mockFindByName.mockResolvedValue(adminRole);

      const response = await request(app).post('/api/roles').send({ name: 'Administrator' });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/roles', () => {
    it('should return all roles', async () => {
      mockFindAll.mockResolvedValue([adminRole, userRole]);

      const response = await request(app).get('/api/roles');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should return empty array when no roles exist', async () => {
      mockFindAll.mockResolvedValue([]);

      const response = await request(app).get('/api/roles');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/roles/:id', () => {
    it('should return role with grantable roles', async () => {
      mockFindByIdWithGrantable.mockResolvedValue(adminWithGrantable);

      const response = await request(app).get('/api/roles/role-1');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Administrator');
      expect(response.body.grantableRoles).toHaveLength(1);
    });

    it('should return 404 when role not found', async () => {
      mockFindByIdWithGrantable.mockResolvedValue(null);

      const response = await request(app).get('/api/roles/nonexistent');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/roles/:id', () => {
    it('should update role and return 200', async () => {
      mockFindById.mockResolvedValue(adminRole);
      mockFindByName.mockResolvedValue(null);
      mockUpdate.mockResolvedValue({ ...adminRole, name: 'SuperAdmin' });

      const response = await request(app).put('/api/roles/role-1').send({ name: 'SuperAdmin' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('SuperAdmin');
    });

    it('should return 404 when role not found', async () => {
      mockFindById.mockResolvedValue(null);

      const response = await request(app).put('/api/roles/nonexistent').send({ name: 'New' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/roles/:id', () => {
    it('should delete role and return 204', async () => {
      mockFindById.mockResolvedValue(adminRole);
      mockIsRoleAssignedToUsers.mockResolvedValue(false);
      mockIsRoleReferencedAsGrantable.mockResolvedValue(false);
      mockDelete.mockResolvedValue(true);

      const response = await request(app).delete('/api/roles/role-1');

      expect(response.status).toBe(204);
    });

    it('should return 404 when role not found', async () => {
      mockFindById.mockResolvedValue(null);

      const response = await request(app).delete('/api/roles/nonexistent');

      expect(response.status).toBe(404);
    });

    it('should return 409 when role is in use', async () => {
      mockFindById.mockResolvedValue(adminRole);
      mockIsRoleAssignedToUsers.mockResolvedValue(false);
      mockIsRoleReferencedAsGrantable.mockResolvedValue(true);

      const response = await request(app).delete('/api/roles/role-1');

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/roles/:id/grantable-roles', () => {
    it('should return grantable roles', async () => {
      mockFindById.mockResolvedValue(adminRole);
      mockGetGrantableRoles.mockResolvedValue([userRole]);

      const response = await request(app).get('/api/roles/role-1/grantable-roles');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('should return 404 when role not found', async () => {
      mockFindById.mockResolvedValue(null);

      const response = await request(app).get('/api/roles/nonexistent/grantable-roles');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/roles/:id/grantable-roles', () => {
    const AUTH_HEADER = ['Authorization', 'Bearer mock.jwt.token'] as const;

    it('should set grantable roles and return 200 for admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([adminRole]);
      mockFindById
        .mockResolvedValueOnce(adminRole) // check role exists
        .mockResolvedValueOnce(userRole); // validate target role
      mockSetGrantableRoles.mockResolvedValue(undefined);
      mockGetGrantableRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .put('/api/roles/role-1/grantable-roles')
        .set(...AUTH_HEADER)
        .send({ grantableRoleIds: ['role-2'] });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app)
        .put('/api/roles/role-1/grantable-roles')
        .send({ grantableRoleIds: ['role-2'] });

      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not an administrator', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .put('/api/roles/role-1/grantable-roles')
        .set(...AUTH_HEADER)
        .send({ grantableRoleIds: ['role-2'] });

      expect(response.status).toBe(403);
    });

    it('should return 400 when grantableRoleIds is missing', async () => {
      mockUserGetUserRoles.mockResolvedValue([adminRole]);

      const response = await request(app)
        .put('/api/roles/role-1/grantable-roles')
        .set(...AUTH_HEADER)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 when grantableRoleIds is not an array', async () => {
      mockUserGetUserRoles.mockResolvedValue([adminRole]);

      const response = await request(app)
        .put('/api/roles/role-1/grantable-roles')
        .set(...AUTH_HEADER)
        .send({ grantableRoleIds: 'not-an-array' });

      expect(response.status).toBe(400);
    });

    it('should return 404 when role not found', async () => {
      mockUserGetUserRoles.mockResolvedValue([adminRole]);
      mockFindById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/roles/nonexistent/grantable-roles')
        .set(...AUTH_HEADER)
        .send({ grantableRoleIds: ['role-2'] });

      expect(response.status).toBe(404);
    });
  });

  // === Module Role Mapping ===

  describe('POST /api/roles/:roleId/module-roles', () => {
    const AUTH_HEADER = ['Authorization', 'Bearer mock.jwt.token'] as const;

    const sampleModuleRole: ModuleRole = {
      id: 'mr-1',
      moduleId: 'mod-1',
      name: 'OrderEditor',
      description: 'Can edit orders',
      createdAt: now,
      updatedAt: now,
    };

    it('should map module role to user role and return 201 (AC-050-03)', async () => {
      mockUserGetUserRoles.mockResolvedValue([adminRole]);
      mockFindById.mockResolvedValue(adminRole);
      mockMRFindById.mockResolvedValue(sampleModuleRole);
      mockMRIsMappingExists.mockResolvedValue(false);
      mockMRAddModuleRoleToUserRole.mockResolvedValue(undefined);
      mockMRGetModuleRolesForUserRole.mockResolvedValue([sampleModuleRole]);

      const response = await request(app)
        .post('/api/roles/role-1/module-roles')
        .set(...AUTH_HEADER)
        .send({ moduleRoleId: 'mr-1' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveLength(1);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/roles/role-1/module-roles')
        .send({ moduleRoleId: 'mr-1' });

      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .post('/api/roles/role-1/module-roles')
        .set(...AUTH_HEADER)
        .send({ moduleRoleId: 'mr-1' });

      expect(response.status).toBe(403);
    });

    it('should return 400 when moduleRoleId is missing', async () => {
      mockUserGetUserRoles.mockResolvedValue([adminRole]);

      const response = await request(app)
        .post('/api/roles/role-1/module-roles')
        .set(...AUTH_HEADER)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 when user role not found', async () => {
      mockUserGetUserRoles.mockResolvedValue([adminRole]);
      mockFindById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/roles/nonexistent/module-roles')
        .set(...AUTH_HEADER)
        .send({ moduleRoleId: 'mr-1' });

      expect(response.status).toBe(404);
    });

    it('should return 409 when mapping already exists', async () => {
      mockUserGetUserRoles.mockResolvedValue([adminRole]);
      mockFindById.mockResolvedValue(adminRole);
      mockMRFindById.mockResolvedValue(sampleModuleRole);
      mockMRIsMappingExists.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/roles/role-1/module-roles')
        .set(...AUTH_HEADER)
        .send({ moduleRoleId: 'mr-1' });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/roles/:roleId/module-roles', () => {
    const AUTH_HEADER = ['Authorization', 'Bearer mock.jwt.token'] as const;

    const sampleModuleRole: ModuleRole = {
      id: 'mr-1',
      moduleId: 'mod-1',
      name: 'OrderEditor',
      description: 'Can edit orders',
      createdAt: now,
      updatedAt: now,
    };

    it('should return mapped module roles (AC-050-04)', async () => {
      mockFindById.mockResolvedValue(adminRole);
      mockMRGetModuleRolesForUserRole.mockResolvedValue([sampleModuleRole]);

      const response = await request(app)
        .get('/api/roles/role-1/module-roles')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/roles/role-1/module-roles');

      expect(response.status).toBe(401);
    });

    it('should return 404 when user role not found', async () => {
      mockFindById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/roles/nonexistent/module-roles')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/roles/:roleId/module-roles/:moduleRoleId', () => {
    const AUTH_HEADER = ['Authorization', 'Bearer mock.jwt.token'] as const;

    it('should unmap module role and return 204 (AC-050-05)', async () => {
      mockUserGetUserRoles.mockResolvedValue([adminRole]);
      mockFindById.mockResolvedValue(adminRole);
      mockMRRemoveModuleRoleFromUserRole.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/roles/role-1/module-roles/mr-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(204);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).delete('/api/roles/role-1/module-roles/mr-1');

      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .delete('/api/roles/role-1/module-roles/mr-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(403);
    });

    it('should return 404 when mapping not found', async () => {
      mockUserGetUserRoles.mockResolvedValue([adminRole]);
      mockFindById.mockResolvedValue(adminRole);
      mockMRRemoveModuleRoleFromUserRole.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/roles/role-1/module-roles/mr-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(404);
    });
  });
});
