// Integration tests for /api/project-roles endpoints
import request from 'supertest';
import { createApp } from '../../src/app';
import { ProjectRole } from '../../src/models/project-role.model';

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn().mockReturnValue({
    userId: 'user-1',
    sessionId: 'session-1',
    roles: ['Administrator'],
    moduleRoles: [],
  }),
}));

const mockPRFindAll = jest.fn();
const mockPRFindById = jest.fn();
const mockPRFindByName = jest.fn();
const mockPRCreate = jest.fn();
const mockPRUpdate = jest.fn();
const mockPRDelete = jest.fn();

jest.mock('../../src/repositories/project-role.repository', () => ({
  ProjectRoleRepository: jest.fn(),
  projectRoleRepository: {
    findAll: (...args: unknown[]) => mockPRFindAll(...args),
    findById: (...args: unknown[]) => mockPRFindById(...args),
    findByName: (...args: unknown[]) => mockPRFindByName(...args),
    create: (...args: unknown[]) => mockPRCreate(...args),
    update: (...args: unknown[]) => mockPRUpdate(...args),
    delete: (...args: unknown[]) => mockPRDelete(...args),
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

jest.mock('../../src/repositories/client.repository', () => ({
  ClientRepository: jest.fn(),
  clientRepository: {
    findAll: jest.fn(), findById: jest.fn(), findByCode: jest.fn(),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(),
  },
}));

jest.mock('../../src/repositories/role.repository', () => ({
  RoleRepository: jest.fn(),
  roleRepository: {
    findAll: jest.fn(), findById: jest.fn(), findByIdWithGrantable: jest.fn(),
    findByName: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
    isRoleAssignedToUsers: jest.fn(), isRoleReferencedAsGrantable: jest.fn(),
    getGrantableRoles: jest.fn(), getGrantableRoleIdsForRoles: jest.fn(), setGrantableRoles: jest.fn(),
  },
}));

const mockGetUserRoles = jest.fn();

jest.mock('../../src/repositories/user.repository', () => ({
  UserRepository: jest.fn(),
  userRepository: {
    findAll: jest.fn(), findById: jest.fn(), findByIdWithRoles: jest.fn(),
    findByName: jest.fn(), findPasswordHashById: jest.fn(),
    create: jest.fn(), update: jest.fn(), updatePassword: jest.fn(),
    updateStatus: jest.fn(), updateLastLogin: jest.fn(), delete: jest.fn(),
    getUserRoles: (...args: unknown[]) => mockGetUserRoles(...args),
    setUserRoles: jest.fn(), isRoleAssignedToAnyUser: jest.fn(),
    updateTeamAssignment: jest.fn(),
  },
}));

jest.mock('../../src/repositories/session.repository', () => ({
  SessionRepository: jest.fn(),
  sessionRepository: {
    create: jest.fn(), findById: jest.fn(), updateLastActive: jest.fn(),
    delete: jest.fn(), deleteByUserId: jest.fn(),
  },
}));

jest.mock('../../src/repositories/token.repository', () => ({
  TokenRepository: jest.fn(),
  tokenRepository: {
    create: jest.fn(), findByTokenHash: jest.fn(), deleteByTokenHash: jest.fn(),
    deleteBySessionId: jest.fn(), deleteByUserId: jest.fn(), deleteExpired: jest.fn(),
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

describe('/api/project-roles', () => {
  const app = createApp();
  const now = new Date('2026-01-01T00:00:00Z');
  const AUTH_HEADER = ['Authorization', 'Bearer mock.jwt.token'] as const;

  const role: ProjectRole = {
    id: 'pr-1',
    name: 'Developer',
    description: 'Software developer',
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserRoles.mockResolvedValue([{ id: 'role-1', name: 'Administrator' }]);
  });

  describe('POST /api/project-roles', () => {
    it('should create a project role and return 201', async () => {
      mockPRFindByName.mockResolvedValue(null);
      mockPRCreate.mockResolvedValue(role);

      const response = await request(app)
        .post('/api/project-roles')
        .set(...AUTH_HEADER)
        .send({ name: 'Developer', description: 'Software developer' });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Developer');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/project-roles')
        .set(...AUTH_HEADER)
        .send({ description: 'No name' });

      expect(response.status).toBe(400);
    });

    it('should return 409 when name already exists', async () => {
      mockPRFindByName.mockResolvedValue(role);

      const response = await request(app)
        .post('/api/project-roles')
        .set(...AUTH_HEADER)
        .send({ name: 'Developer' });

      expect(response.status).toBe(409);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/project-roles').send({ name: 'Developer' });
      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not admin', async () => {
      mockGetUserRoles.mockResolvedValue([{ id: 'role-2', name: 'User' }]);

      const response = await request(app)
        .post('/api/project-roles')
        .set(...AUTH_HEADER)
        .send({ name: 'Developer' });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/project-roles', () => {
    it('should return all project roles', async () => {
      mockPRFindAll.mockResolvedValue([role]);

      const response = await request(app)
        .get('/api/project-roles')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });

  describe('GET /api/project-roles/:id', () => {
    it('should return project role by id', async () => {
      mockPRFindById.mockResolvedValue(role);

      const response = await request(app)
        .get('/api/project-roles/pr-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Developer');
    });

    it('should return 404 when not found', async () => {
      mockPRFindById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/project-roles/nonexistent')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/project-roles/:id', () => {
    it('should update project role and return 200', async () => {
      mockPRFindById.mockResolvedValue(role);
      mockPRFindByName.mockResolvedValue(null);
      mockPRUpdate.mockResolvedValue({ ...role, name: 'Senior Developer' });

      const response = await request(app)
        .put('/api/project-roles/pr-1')
        .set(...AUTH_HEADER)
        .send({ name: 'Senior Developer' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Senior Developer');
    });
  });

  describe('DELETE /api/project-roles/:id', () => {
    it('should delete project role and return 204', async () => {
      mockPRFindById.mockResolvedValue(role);
      mockPRDelete.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/project-roles/pr-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(204);
    });

    it('should return 404 when not found', async () => {
      mockPRFindById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/project-roles/nonexistent')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(404);
    });
  });
});
