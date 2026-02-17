// Integration tests for /api/access-rules endpoints
import request from 'supertest';
import { createApp } from '../../src/app';
import { EntityAccessRule } from '../../src/models/entity-access.model';

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

// Mock entity access repository
const mockEARFindAll = jest.fn();
const mockEARFindById = jest.fn();
const mockEARFindByModuleRoleId = jest.fn();
const mockEARFindByModuleRoleIds = jest.fn();
const mockEARFindByModuleRoleAndEntity = jest.fn();
const mockEARCreate = jest.fn();
const mockEARUpdate = jest.fn();
const mockEARDelete = jest.fn();

jest.mock('../../src/repositories/entity-access.repository', () => ({
  EntityAccessRepository: jest.fn(),
  entityAccessRepository: {
    findAll: (...args: unknown[]) => mockEARFindAll(...args),
    findById: (...args: unknown[]) => mockEARFindById(...args),
    findByModuleRoleId: (...args: unknown[]) => mockEARFindByModuleRoleId(...args),
    findByModuleRoleIds: (...args: unknown[]) => mockEARFindByModuleRoleIds(...args),
    findByModuleRoleAndEntity: (...args: unknown[]) => mockEARFindByModuleRoleAndEntity(...args),
    create: (...args: unknown[]) => mockEARCreate(...args),
    update: (...args: unknown[]) => mockEARUpdate(...args),
    delete: (...args: unknown[]) => mockEARDelete(...args),
  },
}));

// Mock module role repository
const mockMRFindById = jest.fn();
const mockMRGetModuleRolesForUserRole = jest.fn();

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
    addModuleRoleToUserRole: jest.fn(),
    removeModuleRoleFromUserRole: jest.fn(),
    isMappingExists: jest.fn(),
  },
}));

// Mock module repository (needed by modules routes mounted in app)
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

// Mock role repository
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

// Mock user repository
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

describe('/api/access-rules', () => {
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

  const sampleRule: EntityAccessRule = {
    id: 'ear-1',
    moduleRoleId: 'mr-1',
    entity: 'Order',
    canCreate: true,
    canRead: true,
    canUpdate: false,
    canDelete: false,
    rowFilter: null,
    fieldAccess: null,
    createdAt: now,
    updatedAt: now,
  };

  const AUTH_HEADER = ['Authorization', 'Bearer mock.jwt.token'] as const;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserGetUserRoles.mockResolvedValue([adminRole]);
  });

  // === Entity Access Rule CRUD ===

  describe('POST /api/access-rules/entity', () => {
    it('should create an entity access rule and return 201 (AC-051-01)', async () => {
      mockMRFindById.mockResolvedValue({
        id: 'mr-1',
        moduleId: 'mod-1',
        name: 'OrderEditor',
        description: null,
        createdAt: now,
        updatedAt: now,
      });
      mockEARFindByModuleRoleAndEntity.mockResolvedValue(null);
      mockEARCreate.mockResolvedValue(sampleRule);

      const response = await request(app)
        .post('/api/access-rules/entity')
        .set(...AUTH_HEADER)
        .send({
          moduleRoleId: 'mr-1',
          entity: 'Order',
          canCreate: true,
          canRead: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.entity).toBe('Order');
      expect(response.body.canCreate).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/access-rules/entity')
        .send({ moduleRoleId: 'mr-1', entity: 'Order' });

      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .post('/api/access-rules/entity')
        .set(...AUTH_HEADER)
        .send({ moduleRoleId: 'mr-1', entity: 'Order' });

      expect(response.status).toBe(403);
    });

    it('should return 400 when moduleRoleId or entity is missing', async () => {
      const response = await request(app)
        .post('/api/access-rules/entity')
        .set(...AUTH_HEADER)
        .send({ moduleRoleId: 'mr-1' });

      expect(response.status).toBe(400);
    });

    it('should return 404 when module role not found', async () => {
      mockMRFindById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/access-rules/entity')
        .set(...AUTH_HEADER)
        .send({ moduleRoleId: 'nonexistent', entity: 'Order' });

      expect(response.status).toBe(404);
    });

    it('should return 409 when rule already exists for module role + entity', async () => {
      mockMRFindById.mockResolvedValue({
        id: 'mr-1',
        moduleId: 'mod-1',
        name: 'OrderEditor',
        description: null,
        createdAt: now,
        updatedAt: now,
      });
      mockEARFindByModuleRoleAndEntity.mockResolvedValue(sampleRule);

      const response = await request(app)
        .post('/api/access-rules/entity')
        .set(...AUTH_HEADER)
        .send({ moduleRoleId: 'mr-1', entity: 'Order' });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/access-rules/entity', () => {
    it('should return all rules (AC-051-06)', async () => {
      mockEARFindAll.mockResolvedValue([sampleRule]);

      const response = await request(app)
        .get('/api/access-rules/entity')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('should filter by moduleRoleId', async () => {
      mockEARFindByModuleRoleId.mockResolvedValue([sampleRule]);

      const response = await request(app)
        .get('/api/access-rules/entity?moduleRoleId=mr-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(mockEARFindByModuleRoleId).toHaveBeenCalledWith('mr-1');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/access-rules/entity');

      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .get('/api/access-rules/entity')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/access-rules/entity/resolve', () => {
    it('should resolve effective permissions for current user (AC-051-05)', async () => {
      mockUserGetUserRoles.mockResolvedValue([adminRole]);
      mockMRGetModuleRolesForUserRole.mockResolvedValue([
        { id: 'mr-1', moduleId: 'mod-1', name: 'OrderEditor', createdAt: now, updatedAt: now },
      ]);
      mockEARFindByModuleRoleIds.mockResolvedValue([sampleRule]);

      const response = await request(app)
        .get('/api/access-rules/entity/resolve')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].entity).toBe('Order');
    });

    it('should filter by entity query param', async () => {
      mockUserGetUserRoles.mockResolvedValue([adminRole]);
      mockMRGetModuleRolesForUserRole.mockResolvedValue([
        { id: 'mr-1', moduleId: 'mod-1', name: 'OrderEditor', createdAt: now, updatedAt: now },
      ]);
      mockEARFindByModuleRoleIds.mockResolvedValue([
        sampleRule,
        { ...sampleRule, id: 'ear-2', entity: 'Product' },
      ]);

      const response = await request(app)
        .get('/api/access-rules/entity/resolve?entity=Order')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].entity).toBe('Order');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/access-rules/entity/resolve');

      expect(response.status).toBe(401);
    });

    it('should return empty array when user has no roles', async () => {
      mockUserGetUserRoles.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/access-rules/entity/resolve')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/access-rules/entity/:id', () => {
    it('should return rule by ID', async () => {
      mockEARFindById.mockResolvedValue(sampleRule);

      const response = await request(app)
        .get('/api/access-rules/entity/ear-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body.entity).toBe('Order');
    });

    it('should return 404 when rule not found', async () => {
      mockEARFindById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/access-rules/entity/nonexistent')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(404);
    });

    it('should return 403 when user is not admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .get('/api/access-rules/entity/ear-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/access-rules/entity/:id', () => {
    it('should update rule and return 200 (AC-051-02)', async () => {
      mockEARFindById.mockResolvedValue(sampleRule);
      mockEARUpdate.mockResolvedValue({ ...sampleRule, canUpdate: true });

      const response = await request(app)
        .put('/api/access-rules/entity/ear-1')
        .set(...AUTH_HEADER)
        .send({ canUpdate: true });

      expect(response.status).toBe(200);
      expect(response.body.canUpdate).toBe(true);
    });

    it('should update rowFilter (AC-051-07)', async () => {
      const filter = { field: 'owner_id', op: 'eq', value: '$currentUser' };
      mockEARFindById.mockResolvedValue(sampleRule);
      mockEARUpdate.mockResolvedValue({ ...sampleRule, rowFilter: filter });

      const response = await request(app)
        .put('/api/access-rules/entity/ear-1')
        .set(...AUTH_HEADER)
        .send({ rowFilter: filter });

      expect(response.status).toBe(200);
      expect(response.body.rowFilter).toEqual(filter);
    });

    it('should return 404 when rule not found', async () => {
      mockEARFindById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/access-rules/entity/nonexistent')
        .set(...AUTH_HEADER)
        .send({ canCreate: true });

      expect(response.status).toBe(404);
    });

    it('should return 403 when user is not admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .put('/api/access-rules/entity/ear-1')
        .set(...AUTH_HEADER)
        .send({ canCreate: true });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/access-rules/entity/:id', () => {
    it('should delete rule and return 204', async () => {
      mockEARFindById.mockResolvedValue(sampleRule);
      mockEARDelete.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/access-rules/entity/ear-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(204);
    });

    it('should return 404 when rule not found', async () => {
      mockEARFindById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/access-rules/entity/nonexistent')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(404);
    });

    it('should return 403 when user is not admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .delete('/api/access-rules/entity/ear-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(403);
    });
  });
});
