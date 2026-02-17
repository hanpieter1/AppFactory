// Integration tests for /api/modules endpoints
import request from 'supertest';
import { createApp } from '../../src/app';
import { Module, ModuleRole } from '../../src/models/module.model';

// Mock the database pool
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

// Mock module repository
const mockModuleFindAll = jest.fn();
const mockModuleFindById = jest.fn();
const mockModuleFindByName = jest.fn();
const mockModuleCreate = jest.fn();
const mockModuleUpdate = jest.fn();
const mockModuleDelete = jest.fn();
const mockModuleHasModuleRoles = jest.fn();

jest.mock('../../src/repositories/module.repository', () => ({
  ModuleRepository: jest.fn(),
  moduleRepository: {
    findAll: (...args: unknown[]) => mockModuleFindAll(...args),
    findById: (...args: unknown[]) => mockModuleFindById(...args),
    findByName: (...args: unknown[]) => mockModuleFindByName(...args),
    create: (...args: unknown[]) => mockModuleCreate(...args),
    update: (...args: unknown[]) => mockModuleUpdate(...args),
    delete: (...args: unknown[]) => mockModuleDelete(...args),
    hasModuleRoles: (...args: unknown[]) => mockModuleHasModuleRoles(...args),
  },
}));

// Mock module role repository
const mockMRFindById = jest.fn();
const mockMRFindByModuleId = jest.fn();
const mockMRFindByNameInModule = jest.fn();
const mockMRCreate = jest.fn();
const mockMRUpdate = jest.fn();
const mockMRDelete = jest.fn();
const mockMRIsModuleRoleMapped = jest.fn();
const mockMRGetModuleRolesForUserRole = jest.fn();
const mockMRAddModuleRoleToUserRole = jest.fn();
const mockMRRemoveModuleRoleFromUserRole = jest.fn();
const mockMRIsMappingExists = jest.fn();

jest.mock('../../src/repositories/module-role.repository', () => ({
  ModuleRoleRepository: jest.fn(),
  moduleRoleRepository: {
    findById: (...args: unknown[]) => mockMRFindById(...args),
    findByModuleId: (...args: unknown[]) => mockMRFindByModuleId(...args),
    findByNameInModule: (...args: unknown[]) => mockMRFindByNameInModule(...args),
    create: (...args: unknown[]) => mockMRCreate(...args),
    update: (...args: unknown[]) => mockMRUpdate(...args),
    delete: (...args: unknown[]) => mockMRDelete(...args),
    isModuleRoleMapped: (...args: unknown[]) => mockMRIsModuleRoleMapped(...args),
    getModuleRolesForUserRole: (...args: unknown[]) => mockMRGetModuleRolesForUserRole(...args),
    addModuleRoleToUserRole: (...args: unknown[]) => mockMRAddModuleRoleToUserRole(...args),
    removeModuleRoleFromUserRole: (...args: unknown[]) =>
      mockMRRemoveModuleRoleFromUserRole(...args),
    isMappingExists: (...args: unknown[]) => mockMRIsMappingExists(...args),
  },
}));

// Mock role repository (needed by ModuleService for mapping + roles routes)
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
    getGrantableRoleIdsForRoles: jest.fn(),
    setGrantableRoles: jest.fn(),
  },
}));

// Mock user repository (needed by admin guard + auth routes)
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
  },
}));

// Mock session repository
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

// Mock token repository
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

import { UserRole } from '../../src/models/role.model';

describe('/api/modules', () => {
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
    id: 'role-user',
    name: 'User',
    description: 'Basic access',
    createdAt: now,
    updatedAt: now,
  };

  const sampleModule: Module = {
    id: 'mod-1',
    name: 'Orders',
    description: 'Order management',
    createdAt: now,
    updatedAt: now,
  };

  const sampleModuleRole: ModuleRole = {
    id: 'mr-1',
    moduleId: 'mod-1',
    name: 'OrderEditor',
    description: 'Can edit orders',
    createdAt: now,
    updatedAt: now,
  };

  const AUTH_HEADER = ['Authorization', 'Bearer mock.jwt.token'] as const;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: acting user is an Administrator
    mockUserGetUserRoles.mockResolvedValue([adminRole]);
  });

  // === Module CRUD ===

  describe('POST /api/modules', () => {
    it('should create a module and return 201 (AC-050-07)', async () => {
      mockModuleFindByName.mockResolvedValue(null);
      mockModuleCreate.mockResolvedValue(sampleModule);

      const response = await request(app)
        .post('/api/modules')
        .set(...AUTH_HEADER)
        .send({ name: 'Orders', description: 'Order management' });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Orders');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).post('/api/modules').send({ name: 'Orders' });

      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .post('/api/modules')
        .set(...AUTH_HEADER)
        .send({ name: 'Orders' });

      expect(response.status).toBe(403);
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/modules')
        .set(...AUTH_HEADER)
        .send({ description: 'No name' });

      expect(response.status).toBe(400);
    });

    it('should return 409 when name already exists', async () => {
      mockModuleFindByName.mockResolvedValue(sampleModule);

      const response = await request(app)
        .post('/api/modules')
        .set(...AUTH_HEADER)
        .send({ name: 'Orders' });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/modules', () => {
    it('should return all modules', async () => {
      mockModuleFindAll.mockResolvedValue([sampleModule]);

      const response = await request(app)
        .get('/api/modules')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/modules');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/modules/:id', () => {
    it('should return module by ID', async () => {
      mockModuleFindById.mockResolvedValue(sampleModule);

      const response = await request(app)
        .get('/api/modules/mod-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Orders');
    });

    it('should return 404 when module not found', async () => {
      mockModuleFindById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/modules/nonexistent')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/modules/:id', () => {
    it('should update module and return 200', async () => {
      mockModuleFindById.mockResolvedValue(sampleModule);
      mockModuleFindByName.mockResolvedValue(null);
      mockModuleUpdate.mockResolvedValue({ ...sampleModule, name: 'OrdersV2' });

      const response = await request(app)
        .put('/api/modules/mod-1')
        .set(...AUTH_HEADER)
        .send({ name: 'OrdersV2' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('OrdersV2');
    });

    it('should return 403 when user is not admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .put('/api/modules/mod-1')
        .set(...AUTH_HEADER)
        .send({ name: 'OrdersV2' });

      expect(response.status).toBe(403);
    });

    it('should return 404 when module not found', async () => {
      mockModuleFindById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/modules/nonexistent')
        .set(...AUTH_HEADER)
        .send({ name: 'New' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/modules/:id', () => {
    it('should delete module and return 204', async () => {
      mockModuleFindById.mockResolvedValue(sampleModule);
      mockModuleHasModuleRoles.mockResolvedValue(false);
      mockModuleDelete.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/modules/mod-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(204);
    });

    it('should return 409 when module has roles', async () => {
      mockModuleFindById.mockResolvedValue(sampleModule);
      mockModuleHasModuleRoles.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/modules/mod-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(409);
    });

    it('should return 403 when user is not admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .delete('/api/modules/mod-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(403);
    });
  });

  // === Module Role CRUD ===

  describe('POST /api/modules/:moduleId/roles', () => {
    it('should create a module role and return 201 (AC-050-01)', async () => {
      mockModuleFindById.mockResolvedValue(sampleModule);
      mockMRFindByNameInModule.mockResolvedValue(null);
      mockMRCreate.mockResolvedValue(sampleModuleRole);

      const response = await request(app)
        .post('/api/modules/mod-1/roles')
        .set(...AUTH_HEADER)
        .send({ name: 'OrderEditor', description: 'Can edit orders' });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('OrderEditor');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/modules/mod-1/roles')
        .send({ name: 'OrderEditor' });

      expect(response.status).toBe(401);
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/modules/mod-1/roles')
        .set(...AUTH_HEADER)
        .send({ description: 'No name' });

      expect(response.status).toBe(400);
    });

    it('should return 409 when name already exists in module (AC-050-06)', async () => {
      mockModuleFindById.mockResolvedValue(sampleModule);
      mockMRFindByNameInModule.mockResolvedValue(sampleModuleRole);

      const response = await request(app)
        .post('/api/modules/mod-1/roles')
        .set(...AUTH_HEADER)
        .send({ name: 'OrderEditor' });

      expect(response.status).toBe(409);
    });

    it('should return 404 when module not found', async () => {
      mockModuleFindById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/modules/nonexistent/roles')
        .set(...AUTH_HEADER)
        .send({ name: 'Editor' });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/modules/:moduleId/roles', () => {
    it('should return module roles (AC-050-02)', async () => {
      mockModuleFindById.mockResolvedValue(sampleModule);
      mockMRFindByModuleId.mockResolvedValue([sampleModuleRole]);

      const response = await request(app)
        .get('/api/modules/mod-1/roles')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('should return 404 when module not found', async () => {
      mockModuleFindById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/modules/nonexistent/roles')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/modules/:moduleId/roles/:id', () => {
    it('should return module role by ID', async () => {
      mockModuleFindById.mockResolvedValue(sampleModule);
      mockMRFindById.mockResolvedValue(sampleModuleRole);

      const response = await request(app)
        .get('/api/modules/mod-1/roles/mr-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('OrderEditor');
    });

    it('should return 404 when role not in module', async () => {
      mockModuleFindById.mockResolvedValue(sampleModule);
      mockMRFindById.mockResolvedValue({ ...sampleModuleRole, moduleId: 'other-mod' });

      const response = await request(app)
        .get('/api/modules/mod-1/roles/mr-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/modules/:moduleId/roles/:id', () => {
    it('should update module role and return 200', async () => {
      mockModuleFindById.mockResolvedValue(sampleModule);
      mockMRFindById.mockResolvedValue(sampleModuleRole);
      mockMRFindByNameInModule.mockResolvedValue(null);
      mockMRUpdate.mockResolvedValue({ ...sampleModuleRole, name: 'OrderAdmin' });

      const response = await request(app)
        .put('/api/modules/mod-1/roles/mr-1')
        .set(...AUTH_HEADER)
        .send({ name: 'OrderAdmin' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('OrderAdmin');
    });

    it('should return 403 when user is not admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .put('/api/modules/mod-1/roles/mr-1')
        .set(...AUTH_HEADER)
        .send({ name: 'OrderAdmin' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/modules/:moduleId/roles/:id', () => {
    it('should delete module role and return 204', async () => {
      mockModuleFindById.mockResolvedValue(sampleModule);
      mockMRFindById.mockResolvedValue(sampleModuleRole);
      mockMRIsModuleRoleMapped.mockResolvedValue(false);
      mockMRDelete.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/modules/mod-1/roles/mr-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(204);
    });

    it('should return 409 when module role is mapped to user roles', async () => {
      mockModuleFindById.mockResolvedValue(sampleModule);
      mockMRFindById.mockResolvedValue(sampleModuleRole);
      mockMRIsModuleRoleMapped.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/modules/mod-1/roles/mr-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(409);
    });
  });
});
