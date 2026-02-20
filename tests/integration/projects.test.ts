// Integration tests for /api/projects endpoints
import request from 'supertest';
import { createApp } from '../../src/app';
import { Project, ProjectWithDetails } from '../../src/models/project.model';

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

const mockProjFindAll = jest.fn();
const mockProjFindById = jest.fn();
const mockProjFindByName = jest.fn();
const mockProjCreate = jest.fn();
const mockProjUpdate = jest.fn();
const mockProjDelete = jest.fn();
const mockProjHasChildProjects = jest.fn();

jest.mock('../../src/repositories/project.repository', () => ({
  ProjectRepository: jest.fn(),
  projectRepository: {
    findAll: (...args: unknown[]) => mockProjFindAll(...args),
    findById: (...args: unknown[]) => mockProjFindById(...args),
    findByName: (...args: unknown[]) => mockProjFindByName(...args),
    create: (...args: unknown[]) => mockProjCreate(...args),
    update: (...args: unknown[]) => mockProjUpdate(...args),
    delete: (...args: unknown[]) => mockProjDelete(...args),
    hasChildProjects: (...args: unknown[]) => mockProjHasChildProjects(...args),
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

const mockTeamFindById = jest.fn();

jest.mock('../../src/repositories/team.repository', () => ({
  TeamRepository: jest.fn(),
  teamRepository: {
    findAll: jest.fn(), findById: (...args: unknown[]) => mockTeamFindById(...args),
    findByNameInDepartment: jest.fn(),
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

jest.mock('../../src/repositories/project-role.repository', () => ({
  ProjectRoleRepository: jest.fn(),
  projectRoleRepository: {
    findAll: jest.fn(), findById: jest.fn(), findByName: jest.fn(),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(),
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

describe('/api/projects', () => {
  const app = createApp();
  const now = new Date('2026-01-01T00:00:00Z');

  const sampleProject: Project = {
    id: 'proj-1',
    name: 'My App',
    departmentId: 'dept-1',
    teamId: 'team-1',
    masterProjectId: null,
    status: 'Intake',
    domain: null,
    process: null,
    appSize: null,
    complexity: null,
    alertLevel: null,
    governanceStatus: null,
    governanceTemplate: null,
    infrastructureTemplate: null,
    operationsTemplate: null,
    startDate: null,
    goLiveDate: null,
    referenceNumber: null,
    description: null,
    createdAt: now,
    updatedAt: now,
  };

  const projectWithDetails: ProjectWithDetails = {
    ...sampleProject,
    departmentName: 'Engineering',
    teamName: 'Alpha',
    masterProjectName: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserRoles.mockResolvedValue([{ id: 'role-1', name: 'Administrator' }]);
  });

  describe('GET /api/projects/enums', () => {
    it('should return enum values', async () => {
      const response = await request(app)
        .get('/api/projects/enums')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(200);
      expect(response.body.statuses).toContain('Intake');
      expect(response.body.statuses).toContain('Live');
      expect(response.body.domains).toBeDefined();
      expect(response.body.processes).toBeDefined();
    });

    it('should return 401 without auth', async () => {
      const response = await request(app).get('/api/projects/enums');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/projects', () => {
    it('should create a project and return 201', async () => {
      mockProjFindByName.mockResolvedValue(null);
      mockProjCreate.mockResolvedValue(sampleProject);

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({ name: 'My App' });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('My App');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 409 when name already exists', async () => {
      mockProjFindByName.mockResolvedValue(sampleProject);

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({ name: 'My App' });

      expect(response.status).toBe(409);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/projects').send({ name: 'My App' });
      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not admin', async () => {
      mockGetUserRoles.mockResolvedValue([{ id: 'role-2', name: 'Developer' }]);

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({ name: 'My App' });

      expect(response.status).toBe(403);
    });

    it('should create project with all fields', async () => {
      mockProjFindByName.mockResolvedValue(null);
      mockDeptFindById.mockResolvedValue({ id: 'dept-1', name: 'Engineering' });
      mockTeamFindById.mockResolvedValue({ id: 'team-1', name: 'Alpha' });
      const fullProject = {
        ...sampleProject,
        status: 'Discovery',
        domain: 'Sales',
        startDate: '2026-01-01',
        goLiveDate: '2026-06-01',
      };
      mockProjCreate.mockResolvedValue(fullProject);

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({
          name: 'My App',
          departmentId: 'dept-1',
          teamId: 'team-1',
          status: 'Discovery',
          domain: 'Sales',
          startDate: '2026-01-01',
          goLiveDate: '2026-06-01',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('Discovery');
    });
  });

  describe('GET /api/projects', () => {
    it('should return all projects', async () => {
      mockProjFindAll.mockResolvedValue([projectWithDetails]);

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('My App');
      expect(response.body[0].departmentName).toBe('Engineering');
    });

    it('should pass filter parameters', async () => {
      mockProjFindAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/projects?search=test&status=Live&domain=Sales')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(200);
      expect(mockProjFindAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test', status: 'Live', domain: 'Sales' })
      );
    });

    it('should return empty array when no projects', async () => {
      mockProjFindAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project by id', async () => {
      mockProjFindById.mockResolvedValue(sampleProject);

      const response = await request(app)
        .get('/api/projects/proj-1')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('My App');
    });

    it('should return 404 when not found', async () => {
      mockProjFindById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/projects/nonexistent')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project and return 200', async () => {
      mockProjFindById.mockResolvedValue(sampleProject);
      mockProjFindByName.mockResolvedValue(null);
      mockProjUpdate.mockResolvedValue({ ...sampleProject, name: 'Updated App' });

      const response = await request(app)
        .put('/api/projects/proj-1')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({ name: 'Updated App' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated App');
    });

    it('should return 404 when project not found', async () => {
      mockProjFindById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/projects/nonexistent')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({ name: 'X' });

      expect(response.status).toBe(404);
    });

    it('should return 403 when user is not admin', async () => {
      mockGetUserRoles.mockResolvedValue([{ id: 'role-2', name: 'Developer' }]);

      const response = await request(app)
        .put('/api/projects/proj-1')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({ name: 'Updated' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project and return 204', async () => {
      mockProjFindById.mockResolvedValue(sampleProject);
      mockProjHasChildProjects.mockResolvedValue(false);
      mockProjDelete.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/projects/proj-1')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(204);
    });

    it('should return 404 when not found', async () => {
      mockProjFindById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/projects/nonexistent')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(404);
    });

    it('should return 409 when project has children', async () => {
      mockProjFindById.mockResolvedValue(sampleProject);
      mockProjHasChildProjects.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/projects/proj-1')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(409);
    });

    it('should return 403 when user is not admin', async () => {
      mockGetUserRoles.mockResolvedValue([{ id: 'role-2', name: 'Developer' }]);

      const response = await request(app)
        .delete('/api/projects/proj-1')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(403);
    });
  });
});
