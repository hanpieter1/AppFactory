// Integration tests for /api/access-rules/routes and /api/navigation endpoints
import request from 'supertest';
import { createApp } from '../../src/app';
import { RouteAccessRule } from '../../src/models/route-access.model';

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

// Mock route access repository
const mockRARFindAll = jest.fn();
const mockRARFindById = jest.fn();
const mockRARFindByModuleRoleId = jest.fn();
const mockRARFindByModuleRoleIds = jest.fn();
const mockRARFindByModuleRoleAndRoute = jest.fn();
const mockRARCreate = jest.fn();
const mockRARUpdate = jest.fn();
const mockRARDelete = jest.fn();

jest.mock('../../src/repositories/route-access.repository', () => ({
  RouteAccessRepository: jest.fn(),
  routeAccessRepository: {
    findAll: (...args: unknown[]) => mockRARFindAll(...args),
    findById: (...args: unknown[]) => mockRARFindById(...args),
    findByModuleRoleId: (...args: unknown[]) => mockRARFindByModuleRoleId(...args),
    findByModuleRoleIds: (...args: unknown[]) => mockRARFindByModuleRoleIds(...args),
    findByModuleRoleAndRoute: (...args: unknown[]) => mockRARFindByModuleRoleAndRoute(...args),
    create: (...args: unknown[]) => mockRARCreate(...args),
    update: (...args: unknown[]) => mockRARUpdate(...args),
    delete: (...args: unknown[]) => mockRARDelete(...args),
  },
}));

// Mock entity access repository (needed by access-rules routes)
jest.mock('../../src/repositories/entity-access.repository', () => ({
  EntityAccessRepository: jest.fn(),
  entityAccessRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByModuleRoleId: jest.fn(),
    findByModuleRoleIds: jest.fn(),
    findByModuleRoleAndEntity: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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

describe('/api/access-rules/routes & /api/navigation', () => {
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

  const sampleRule: RouteAccessRule = {
    id: 'rar-1',
    moduleRoleId: 'mr-1',
    route: '/api/orders',
    methods: ['GET', 'POST'],
    isWildcard: false,
    createdAt: now,
    updatedAt: now,
  };

  const AUTH_HEADER = ['Authorization', 'Bearer mock.jwt.token'] as const;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserGetUserRoles.mockResolvedValue([adminRole]);
  });

  // === Route Access Rule CRUD ===

  describe('POST /api/access-rules/routes', () => {
    it('should create a route access rule and return 201 (AC-052-01)', async () => {
      mockMRFindById.mockResolvedValue({
        id: 'mr-1',
        moduleId: 'mod-1',
        name: 'OrderEditor',
        description: null,
        createdAt: now,
        updatedAt: now,
      });
      mockRARFindByModuleRoleAndRoute.mockResolvedValue(null);
      mockRARCreate.mockResolvedValue(sampleRule);

      const response = await request(app)
        .post('/api/access-rules/routes')
        .set(...AUTH_HEADER)
        .send({
          moduleRoleId: 'mr-1',
          route: '/api/orders',
          methods: ['GET', 'POST'],
        });

      expect(response.status).toBe(201);
      expect(response.body.route).toBe('/api/orders');
      expect(response.body.methods).toEqual(['GET', 'POST']);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/access-rules/routes')
        .send({ moduleRoleId: 'mr-1', route: '/api/orders', methods: ['GET'] });

      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .post('/api/access-rules/routes')
        .set(...AUTH_HEADER)
        .send({ moduleRoleId: 'mr-1', route: '/api/orders', methods: ['GET'] });

      expect(response.status).toBe(403);
    });

    it('should return 400 when moduleRoleId or route is missing', async () => {
      const response = await request(app)
        .post('/api/access-rules/routes')
        .set(...AUTH_HEADER)
        .send({ moduleRoleId: 'mr-1' });

      expect(response.status).toBe(400);
    });

    it('should return 404 when module role not found', async () => {
      mockMRFindById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/access-rules/routes')
        .set(...AUTH_HEADER)
        .send({ moduleRoleId: 'nonexistent', route: '/api/orders', methods: ['GET'] });

      expect(response.status).toBe(404);
    });

    it('should return 409 when rule already exists', async () => {
      mockMRFindById.mockResolvedValue({
        id: 'mr-1',
        moduleId: 'mod-1',
        name: 'OrderEditor',
        description: null,
        createdAt: now,
        updatedAt: now,
      });
      mockRARFindByModuleRoleAndRoute.mockResolvedValue(sampleRule);

      const response = await request(app)
        .post('/api/access-rules/routes')
        .set(...AUTH_HEADER)
        .send({ moduleRoleId: 'mr-1', route: '/api/orders', methods: ['GET'] });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/access-rules/routes', () => {
    it('should return all route rules (AC-052-03)', async () => {
      mockRARFindAll.mockResolvedValue([sampleRule]);

      const response = await request(app)
        .get('/api/access-rules/routes')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('should filter by moduleRoleId', async () => {
      mockRARFindByModuleRoleId.mockResolvedValue([sampleRule]);

      const response = await request(app)
        .get('/api/access-rules/routes?moduleRoleId=mr-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(mockRARFindByModuleRoleId).toHaveBeenCalledWith('mr-1');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/access-rules/routes');

      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .get('/api/access-rules/routes')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/access-rules/routes/:id', () => {
    it('should return rule by ID', async () => {
      mockRARFindById.mockResolvedValue(sampleRule);

      const response = await request(app)
        .get('/api/access-rules/routes/rar-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body.route).toBe('/api/orders');
    });

    it('should return 404 when rule not found', async () => {
      mockRARFindById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/access-rules/routes/nonexistent')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(404);
    });

    it('should return 403 when user is not admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .get('/api/access-rules/routes/rar-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/access-rules/routes/:id', () => {
    it('should update rule and return 200', async () => {
      mockRARFindById.mockResolvedValue(sampleRule);
      mockRARUpdate.mockResolvedValue({ ...sampleRule, methods: ['GET', 'POST', 'DELETE'] });

      const response = await request(app)
        .put('/api/access-rules/routes/rar-1')
        .set(...AUTH_HEADER)
        .send({ methods: ['GET', 'POST', 'DELETE'] });

      expect(response.status).toBe(200);
      expect(response.body.methods).toContain('DELETE');
    });

    it('should return 404 when rule not found', async () => {
      mockRARFindById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/access-rules/routes/nonexistent')
        .set(...AUTH_HEADER)
        .send({ methods: ['GET'] });

      expect(response.status).toBe(404);
    });

    it('should return 403 when user is not admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .put('/api/access-rules/routes/rar-1')
        .set(...AUTH_HEADER)
        .send({ methods: ['GET'] });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/access-rules/routes/:id', () => {
    it('should delete rule and return 204', async () => {
      mockRARFindById.mockResolvedValue(sampleRule);
      mockRARDelete.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/access-rules/routes/rar-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(204);
    });

    it('should return 404 when rule not found', async () => {
      mockRARFindById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/access-rules/routes/nonexistent')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(404);
    });

    it('should return 403 when user is not admin', async () => {
      mockUserGetUserRoles.mockResolvedValue([userRole]);

      const response = await request(app)
        .delete('/api/access-rules/routes/rar-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(403);
    });
  });

  // === Navigation ===

  describe('GET /api/navigation', () => {
    it('should return accessible routes for current user (AC-052-05)', async () => {
      mockUserGetUserRoles.mockResolvedValue([adminRole]);
      mockMRGetModuleRolesForUserRole.mockResolvedValue([
        { id: 'mr-1', moduleId: 'mod-1', name: 'OrderEditor', createdAt: now, updatedAt: now },
      ]);
      mockRARFindByModuleRoleIds.mockResolvedValue([sampleRule]);

      const response = await request(app)
        .get('/api/navigation')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].route).toBe('/api/orders');
      expect(response.body[0].methods).toEqual(['GET', 'POST']);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/navigation');

      expect(response.status).toBe(401);
    });

    it('should return empty array when user has no roles', async () => {
      mockUserGetUserRoles.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/navigation')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return empty when no route rules exist', async () => {
      mockUserGetUserRoles.mockResolvedValue([adminRole]);
      mockMRGetModuleRolesForUserRole.mockResolvedValue([
        { id: 'mr-1', moduleId: 'mod-1', name: 'OrderEditor', createdAt: now, updatedAt: now },
      ]);
      mockRARFindByModuleRoleIds.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/navigation')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });
});
