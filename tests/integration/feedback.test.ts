// Integration tests for /api/feedback endpoints
import request from 'supertest';
import { createApp } from '../../src/app';
import { Feedback, FeedbackWithUser } from '../../src/models/feedback.model';

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

const mockFbCreate = jest.fn();
const mockFbFindAll = jest.fn();
const mockFbFindById = jest.fn();
const mockFbDelete = jest.fn();

jest.mock('../../src/repositories/feedback.repository', () => ({
  FeedbackRepository: jest.fn(),
  feedbackRepository: {
    create: (...args: unknown[]) => mockFbCreate(...args),
    findAll: (...args: unknown[]) => mockFbFindAll(...args),
    findById: (...args: unknown[]) => mockFbFindById(...args),
    delete: (...args: unknown[]) => mockFbDelete(...args),
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

jest.mock('../../src/repositories/role.repository', () => ({
  RoleRepository: jest.fn(),
  roleRepository: {
    findAll: jest.fn(), findById: jest.fn(), findByIdWithGrantable: jest.fn(),
    findByName: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
    isRoleAssignedToUsers: jest.fn(), isRoleReferencedAsGrantable: jest.fn(),
    getGrantableRoles: jest.fn(), getGrantableRoleIdsForRoles: jest.fn(), setGrantableRoles: jest.fn(),
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

jest.mock('../../src/repositories/client.repository', () => ({
  ClientRepository: jest.fn(),
  clientRepository: {
    findAll: jest.fn(), findById: jest.fn(), findByCode: jest.fn(),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(),
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
    findById: jest.fn(), findByName: jest.fn(),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(),
    hasChildProjects: jest.fn(),
  },
}));

describe('/api/feedback', () => {
  const app = createApp();
  const now = new Date('2026-01-15T00:00:00Z');

  const sampleFeedback: Feedback = {
    id: 'fb-1',
    userId: 'user-1',
    subject: 'Bug Report',
    message: 'Found a bug in the login page',
    createdAt: now,
  };

  const sampleFeedbackWithUser: FeedbackWithUser = {
    ...sampleFeedback,
    userName: 'PR_Admin',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserRoles.mockResolvedValue([{ id: 'r-1', name: 'Administrator' }]);
  });

  describe('POST /api/feedback', () => {
    it('should create feedback and return 201', async () => {
      mockFbCreate.mockResolvedValue(sampleFeedback);

      const response = await request(app)
        .post('/api/feedback')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({ subject: 'Bug Report', message: 'Found a bug in the login page' });

      expect(response.status).toBe(201);
      expect(response.body.subject).toBe('Bug Report');
      expect(response.body.message).toBe('Found a bug in the login page');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/feedback')
        .send({ subject: 'Test', message: 'Test message' });

      expect(response.status).toBe(401);
    });

    it('should return 400 when subject is missing', async () => {
      const response = await request(app)
        .post('/api/feedback')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({ message: 'Some message' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when message is missing', async () => {
      const response = await request(app)
        .post('/api/feedback')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({ subject: 'Bug Report' });

      expect(response.status).toBe(400);
    });

    it('should allow non-admin users to submit feedback', async () => {
      mockGetUserRoles.mockResolvedValue([{ id: 'r-2', name: 'User' }]);
      mockFbCreate.mockResolvedValue(sampleFeedback);

      const response = await request(app)
        .post('/api/feedback')
        .set('Authorization', 'Bearer mock.jwt.token')
        .send({ subject: 'Feature Request', message: 'Please add dark mode' });

      expect(response.status).toBe(201);
    });
  });

  describe('GET /api/feedback', () => {
    it('should return all feedback for admin', async () => {
      mockFbFindAll.mockResolvedValue([sampleFeedbackWithUser]);

      const response = await request(app)
        .get('/api/feedback')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].userName).toBe('PR_Admin');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/feedback');

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      mockGetUserRoles.mockResolvedValue([{ id: 'r-2', name: 'User' }]);

      const response = await request(app)
        .get('/api/feedback')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/feedback/:id', () => {
    it('should delete feedback and return 204', async () => {
      mockFbFindById.mockResolvedValue(sampleFeedback);
      mockFbDelete.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/feedback/fb-1')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(204);
    });

    it('should return 404 when feedback not found', async () => {
      mockFbFindById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/feedback/nonexistent')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(404);
    });

    it('should return 403 for non-admin users', async () => {
      mockGetUserRoles.mockResolvedValue([{ id: 'r-2', name: 'User' }]);

      const response = await request(app)
        .delete('/api/feedback/fb-1')
        .set('Authorization', 'Bearer mock.jwt.token');

      expect(response.status).toBe(403);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/feedback/fb-1');

      expect(response.status).toBe(401);
    });
  });
});
