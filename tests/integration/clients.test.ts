// Integration tests for /api/clients endpoints
import request from 'supertest';
import { createApp } from '../../src/app';
import { Client } from '../../src/models/client.model';

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

// Mock client repository
const mockFindAll = jest.fn();
const mockFindById = jest.fn();
const mockFindByCode = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('../../src/repositories/client.repository', () => ({
  ClientRepository: jest.fn(),
  clientRepository: {
    findAll: (...args: unknown[]) => mockFindAll(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    findByCode: (...args: unknown[]) => mockFindByCode(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

// Mock other repositories (needed by app routes)
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
    getUserRoles: jest.fn(),
    setUserRoles: jest.fn(),
    isRoleAssignedToAnyUser: jest.fn(),
    updateTeamAssignment: jest.fn(),
  },
}));

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

jest.mock('../../src/repositories/module-role.repository', () => ({
  ModuleRoleRepository: jest.fn(),
  moduleRoleRepository: {
    findById: jest.fn(),
    findByModuleId: jest.fn(),
    findByNameInModule: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    isModuleRoleMapped: jest.fn(),
    getModuleRolesForUserRole: jest.fn(),
    addModuleRoleToUserRole: jest.fn(),
    removeModuleRoleFromUserRole: jest.fn(),
    isMappingExists: jest.fn(),
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

describe('/api/clients', () => {
  const app = createApp();

  const now = new Date('2026-01-01T00:00:00Z');

  const acmeClient: Client = {
    id: 'client-1',
    name: 'Acme Corporation',
    code: 'ACME',
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  const techClient: Client = {
    id: 'client-2',
    name: 'Tech Solutions',
    code: 'TECH',
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  const inactiveClient: Client = {
    id: 'client-3',
    name: 'Old Client',
    code: 'OLD',
    active: false,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/clients', () => {
    it('should create a client and return 201', async () => {
      mockFindByCode.mockResolvedValue(null);
      mockCreate.mockResolvedValue(acmeClient);

      const response = await request(app).post('/api/clients').send({
        name: 'Acme Corporation',
        code: 'ACME',
        active: true,
      });

      expect(response.status).toBe(201);
      expect(response.body.code).toBe('ACME');
      expect(response.body.name).toBe('Acme Corporation');
      expect(response.body.active).toBe(true);
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app).post('/api/clients').send({ code: 'TEST' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when code is missing', async () => {
      const response = await request(app).post('/api/clients').send({ name: 'Test Client' });

      expect(response.status).toBe(400);
    });

    it('should return 409 when code already exists', async () => {
      mockFindByCode.mockResolvedValue(acmeClient);

      const response = await request(app)
        .post('/api/clients')
        .send({ name: 'Duplicate', code: 'ACME' });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/clients', () => {
    it('should return all clients', async () => {
      mockFindAll.mockResolvedValue([acmeClient, techClient, inactiveClient]);

      const response = await request(app).get('/api/clients');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });

    it('should return empty array when no clients exist', async () => {
      mockFindAll.mockResolvedValue([]);

      const response = await request(app).get('/api/clients');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });

    it('should filter by active status', async () => {
      mockFindAll.mockResolvedValue([acmeClient, techClient]);

      const response = await request(app).get('/api/clients?active=true');

      expect(response.status).toBe(200);
      expect(mockFindAll).toHaveBeenCalledWith({ active: true, search: undefined });
    });

    it('should filter by search term', async () => {
      mockFindAll.mockResolvedValue([acmeClient]);

      const response = await request(app).get('/api/clients?search=acme');

      expect(response.status).toBe(200);
      expect(mockFindAll).toHaveBeenCalledWith({ search: 'acme' });
    });
  });

  describe('GET /api/clients/:id', () => {
    it('should return client by id', async () => {
      mockFindById.mockResolvedValue(acmeClient);

      const response = await request(app).get('/api/clients/client-1');

      expect(response.status).toBe(200);
      expect(response.body.code).toBe('ACME');
    });

    it('should return 404 when client not found', async () => {
      mockFindById.mockResolvedValue(null);

      const response = await request(app).get('/api/clients/nonexistent');

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/clients/:id', () => {
    it('should update client and return 200', async () => {
      mockFindById.mockResolvedValue(acmeClient);
      mockUpdate.mockResolvedValue({ ...acmeClient, name: 'Acme Inc' });

      const response = await request(app).patch('/api/clients/client-1').send({ name: 'Acme Inc' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Acme Inc');
    });

    it('should update client active status', async () => {
      mockFindById.mockResolvedValue(acmeClient);
      mockUpdate.mockResolvedValue({ ...acmeClient, active: false });

      const response = await request(app).patch('/api/clients/client-1').send({ active: false });

      expect(response.status).toBe(200);
      expect(response.body.active).toBe(false);
    });

    it('should return 404 when client not found', async () => {
      mockFindById.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/clients/nonexistent')
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
    });

    it('should return 400 when name is empty string', async () => {
      mockFindById.mockResolvedValue(acmeClient);

      const response = await request(app).patch('/api/clients/client-1').send({ name: '' });

      expect(response.status).toBe(400);
    });

    it('should return 409 when updating to existing code', async () => {
      mockFindById.mockResolvedValue(acmeClient);
      mockFindByCode.mockResolvedValue(techClient);

      const response = await request(app).patch('/api/clients/client-1').send({ code: 'TECH' });

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /api/clients/:id', () => {
    it('should delete client and return 204', async () => {
      mockFindById.mockResolvedValue(acmeClient);
      mockDelete.mockResolvedValue(true);

      const response = await request(app).delete('/api/clients/client-1');

      expect(response.status).toBe(204);
    });

    it('should return 404 when client not found', async () => {
      mockFindById.mockResolvedValue(null);

      const response = await request(app).delete('/api/clients/nonexistent');

      expect(response.status).toBe(404);
    });
  });
});
