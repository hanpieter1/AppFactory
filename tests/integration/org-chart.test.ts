// Integration tests for /api/org-chart endpoint
import request from 'supertest';
import { createApp } from '../../src/app';

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
const mockTeamFindAll = jest.fn();

jest.mock('../../src/repositories/department.repository', () => ({
  DepartmentRepository: jest.fn(),
  departmentRepository: {
    findAll: (...args: unknown[]) => mockDeptFindAll(...args),
    findById: jest.fn(), findByName: jest.fn(),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(),
    hasTeams: jest.fn(), hasMembers: jest.fn(),
  },
}));

jest.mock('../../src/repositories/team.repository', () => ({
  TeamRepository: jest.fn(),
  teamRepository: {
    findAll: (...args: unknown[]) => mockTeamFindAll(...args),
    findById: jest.fn(), findByNameInDepartment: jest.fn(),
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

jest.mock('../../src/repositories/user.repository', () => ({
  UserRepository: jest.fn(),
  userRepository: {
    findAll: jest.fn(), findById: jest.fn(), findByIdWithRoles: jest.fn(),
    findByName: jest.fn(), findPasswordHashById: jest.fn(),
    create: jest.fn(), update: jest.fn(), updatePassword: jest.fn(),
    updateStatus: jest.fn(), updateLastLogin: jest.fn(), delete: jest.fn(),
    getUserRoles: jest.fn(), setUserRoles: jest.fn(), isRoleAssignedToAnyUser: jest.fn(),
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

describe('/api/org-chart', () => {
  const app = createApp();
  const AUTH_HEADER = ['Authorization', 'Bearer mock.jwt.token'] as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return organizational hierarchy', async () => {
    mockDeptFindAll.mockResolvedValue([
      { id: 'dept-1', name: 'Engineering', description: null, memberCount: 5, teamCount: 2 },
    ]);
    mockTeamFindAll.mockResolvedValue([
      { id: 'team-1', name: 'Backend', departmentId: 'dept-1', description: null, memberCount: 3, departmentName: 'Engineering' },
      { id: 'team-2', name: 'Frontend', departmentId: 'dept-1', description: null, memberCount: 2, departmentName: 'Engineering' },
    ]);

    const response = await request(app)
      .get('/api/org-chart')
      .set(...AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Engineering');
    expect(response.body[0].teams).toHaveLength(2);
  });

  it('should return empty array when no departments', async () => {
    mockDeptFindAll.mockResolvedValue([]);
    mockTeamFindAll.mockResolvedValue([]);

    const response = await request(app)
      .get('/api/org-chart')
      .set(...AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(0);
  });

  it('should return 401 without auth token', async () => {
    const response = await request(app).get('/api/org-chart');
    expect(response.status).toBe(401);
  });
});
