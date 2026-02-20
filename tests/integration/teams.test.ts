// Integration tests for /api/teams endpoints
import request from 'supertest';
import { createApp } from '../../src/app';
import { Team } from '../../src/models/team.model';

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

const mockTeamFindAll = jest.fn();
const mockTeamFindById = jest.fn();
const mockTeamFindByNameInDepartment = jest.fn();
const mockTeamCreate = jest.fn();
const mockTeamUpdate = jest.fn();
const mockTeamDelete = jest.fn();
const mockTeamHasMembers = jest.fn();
const mockTeamGetTeamMembers = jest.fn();

jest.mock('../../src/repositories/team.repository', () => ({
  TeamRepository: jest.fn(),
  teamRepository: {
    findAll: (...args: unknown[]) => mockTeamFindAll(...args),
    findById: (...args: unknown[]) => mockTeamFindById(...args),
    findByNameInDepartment: (...args: unknown[]) => mockTeamFindByNameInDepartment(...args),
    create: (...args: unknown[]) => mockTeamCreate(...args),
    update: (...args: unknown[]) => mockTeamUpdate(...args),
    delete: (...args: unknown[]) => mockTeamDelete(...args),
    hasMembers: (...args: unknown[]) => mockTeamHasMembers(...args),
    getTeamMembers: (...args: unknown[]) => mockTeamGetTeamMembers(...args),
  },
}));

const mockDeptFindById = jest.fn();

jest.mock('../../src/repositories/department.repository', () => ({
  DepartmentRepository: jest.fn(),
  departmentRepository: {
    findAll: jest.fn(), findById: (...args: unknown[]) => mockDeptFindById(...args),
    findByName: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
    hasTeams: jest.fn(), hasMembers: jest.fn(),
  },
}));

jest.mock('../../src/repositories/project-role.repository', () => ({
  ProjectRoleRepository: jest.fn(),
  projectRoleRepository: {
    findAll: jest.fn(), findById: jest.fn(), findByName: jest.fn(),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(),
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

describe('/api/teams', () => {
  const app = createApp();
  const now = new Date('2026-01-01T00:00:00Z');
  const AUTH_HEADER = ['Authorization', 'Bearer mock.jwt.token'] as const;

  const dept = { id: 'dept-1', name: 'Engineering', description: null, active: true, createdAt: now, updatedAt: now };

  const team: Team = {
    id: 'team-1',
    name: 'Backend',
    departmentId: 'dept-1',
    description: 'Backend team',
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserRoles.mockResolvedValue([{ id: 'role-1', name: 'Administrator' }]);
  });

  describe('POST /api/teams', () => {
    it('should create a team and return 201', async () => {
      mockDeptFindById.mockResolvedValue(dept);
      mockTeamFindByNameInDepartment.mockResolvedValue(null);
      mockTeamCreate.mockResolvedValue(team);

      const response = await request(app)
        .post('/api/teams')
        .set(...AUTH_HEADER)
        .send({ name: 'Backend', departmentId: 'dept-1', description: 'Backend team' });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Backend');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/teams')
        .set(...AUTH_HEADER)
        .send({ departmentId: 'dept-1' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when departmentId is missing', async () => {
      const response = await request(app)
        .post('/api/teams')
        .set(...AUTH_HEADER)
        .send({ name: 'Backend' });

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/teams').send({ name: 'Backend', departmentId: 'dept-1' });
      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not admin', async () => {
      mockGetUserRoles.mockResolvedValue([{ id: 'role-2', name: 'User' }]);

      const response = await request(app)
        .post('/api/teams')
        .set(...AUTH_HEADER)
        .send({ name: 'Backend', departmentId: 'dept-1' });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/teams', () => {
    it('should return all teams', async () => {
      mockTeamFindAll.mockResolvedValue([{ ...team, departmentName: 'Engineering', memberCount: 3 }]);

      const response = await request(app)
        .get('/api/teams')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });

  describe('GET /api/teams/:id', () => {
    it('should return team by id', async () => {
      mockTeamFindById.mockResolvedValue(team);

      const response = await request(app)
        .get('/api/teams/team-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Backend');
    });

    it('should return 404 when not found', async () => {
      mockTeamFindById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/teams/nonexistent')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/teams/:id/members', () => {
    it('should return team members', async () => {
      mockTeamFindById.mockResolvedValue(team);
      mockTeamGetTeamMembers.mockResolvedValue([{ id: 'user-1', name: 'john', fullName: 'John Doe' }]);

      const response = await request(app)
        .get('/api/teams/team-1/members')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });

  describe('DELETE /api/teams/:id', () => {
    it('should delete team and return 204', async () => {
      mockTeamFindById.mockResolvedValue(team);
      mockTeamHasMembers.mockResolvedValue(false);
      mockTeamDelete.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/teams/team-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(204);
    });

    it('should return 409 when team has members', async () => {
      mockTeamFindById.mockResolvedValue(team);
      mockTeamHasMembers.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/teams/team-1')
        .set(...AUTH_HEADER);

      expect(response.status).toBe(409);
    });
  });
});
