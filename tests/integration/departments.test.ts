// Integration tests for /api/departments endpoints
import request from 'supertest';
import { createApp } from '../../src/app';
import { Department } from '../../src/models/department.model';

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

const mockDeptFindAll = jest.fn();
const mockDeptFindById = jest.fn();
const mockDeptFindByName = jest.fn();
const mockDeptCreate = jest.fn();
const mockDeptUpdate = jest.fn();
const mockDeptDelete = jest.fn();
const mockDeptHasTeams = jest.fn();
const mockDeptHasMembers = jest.fn();

jest.mock('../../src/repositories/department.repository', () => ({
  DepartmentRepository: jest.fn(),
  departmentRepository: {
    findAll: (...args: unknown[]) => mockDeptFindAll(...args),
    findById: (...args: unknown[]) => mockDeptFindById(...args),
    findByName: (...args: unknown[]) => mockDeptFindByName(...args),
    create: (...args: unknown[]) => mockDeptCreate(...args),
    update: (...args: unknown[]) => mockDeptUpdate(...args),
    delete: (...args: unknown[]) => mockDeptDelete(...args),
    hasTeams: (...args: unknown[]) => mockDeptHasTeams(...args),
    hasMembers: (...args: unknown[]) => mockDeptHasMembers(...args),
  },
}));

jest.mock('../../src/repositories/team.repository', () => ({
  TeamRepository: jest.fn(),
  teamRepository: {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn(),
    findByNameInDepartment: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    hasMembers: jest.fn(),
    getTeamMembers: jest.fn(),
  },
}));

jest.mock('../../src/repositories/project-role.repository', () => ({
  ProjectRoleRepository: jest.fn(),
  projectRoleRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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

describe('/api/departments', () => {
  const app = createApp();
  const now = new Date('2026-01-01T00:00:00Z');

  const dept: Department = {
    id: 'dept-1',
    name: 'Engineering',
    description: 'Engineering department',
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserRoles.mockResolvedValue([{ id: 'role-1', name: 'Administrator' }]);
  });

  describe('POST /api/departments', () => {
    it('should create a department and return 201', async () => {
      mockDeptFindByName.mockResolvedValue(null);
      mockDeptCreate.mockResolvedValue(dept);

      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({ name: 'Engineering', description: 'Engineering department' });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Engineering');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 409 when name already exists', async () => {
      mockDeptFindByName.mockResolvedValue(dept);

      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({ name: 'Engineering' });

      expect(response.status).toBe(409);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/departments').send({ name: 'Engineering' });
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/departments', () => {
    it('should return all departments', async () => {
      mockDeptFindAll.mockResolvedValue([{ ...dept, teamCount: 2, memberCount: 10 }]);

      const response = await request(app)
        .get('/api/departments')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].teamCount).toBe(2);
    });
  });

  describe('GET /api/departments/:id', () => {
    it('should return department by id', async () => {
      mockDeptFindById.mockResolvedValue(dept);

      const response = await request(app)
        .get('/api/departments/dept-1')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Engineering');
    });

    it('should return 404 when not found', async () => {
      mockDeptFindById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/departments/nonexistent')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/departments/:id', () => {
    it('should delete department and return 204', async () => {
      mockDeptFindById.mockResolvedValue(dept);
      mockDeptHasTeams.mockResolvedValue(false);
      mockDeptHasMembers.mockResolvedValue(false);
      mockDeptDelete.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/departments/dept-1')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(204);
    });

    it('should return 409 when department has teams', async () => {
      mockDeptFindById.mockResolvedValue(dept);
      mockDeptHasTeams.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/departments/dept-1')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(409);
    });
  });
});
