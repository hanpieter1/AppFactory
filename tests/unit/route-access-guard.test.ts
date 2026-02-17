// Unit tests for routeAccessGuard middleware
import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../../src/utils/errors';

// Mock repos before importing the guard
const mockGetUserRoles = jest.fn();
const mockGetModuleRolesForUserRole = jest.fn();
const mockFindByModuleRoleIds = jest.fn();

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('../../src/repositories/route-access.repository', () => ({
  RouteAccessRepository: jest.fn(),
  routeAccessRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByModuleRoleId: jest.fn(),
    findByModuleRoleIds: (...args: unknown[]) => mockFindByModuleRoleIds(...args),
    findByModuleRoleAndRoute: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
    getModuleRolesForUserRole: (...args: unknown[]) => mockGetModuleRolesForUserRole(...args),
    addModuleRoleToUserRole: jest.fn(),
    removeModuleRoleFromUserRole: jest.fn(),
    isMappingExists: jest.fn(),
  },
}));

jest.mock('../../src/repositories/user.repository', () => ({
  UserRepository: jest.fn(),
  userRepository: {
    getUserRoles: (...args: unknown[]) => mockGetUserRoles(...args),
  },
}));

// Import after mocks
import { routeAccessGuard } from '../../src/middleware/route-access-guard';

describe('routeAccessGuard', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const now = new Date('2026-01-01T00:00:00Z');

  beforeEach(() => {
    mockReq = {
      path: '/api/orders',
      method: 'GET',
      userId: 'user-1',
    } as unknown as Partial<Request>;
    mockRes = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should call next() when user has route access', async () => {
    mockGetUserRoles.mockResolvedValue([{ id: 'role-1', name: 'Manager' }]);
    mockGetModuleRolesForUserRole.mockResolvedValue([
      { id: 'mr-1', moduleId: 'mod-1', name: 'OrderEditor', createdAt: now, updatedAt: now },
    ]);
    mockFindByModuleRoleIds.mockResolvedValue([
      {
        id: 'rar-1',
        moduleRoleId: 'mr-1',
        route: '/api/orders',
        methods: ['GET', 'POST'],
        isWildcard: false,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const guard = routeAccessGuard();
    await guard(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should throw ForbiddenError when user has no access to route', async () => {
    mockGetUserRoles.mockResolvedValue([{ id: 'role-1', name: 'Manager' }]);
    mockGetModuleRolesForUserRole.mockResolvedValue([
      { id: 'mr-1', moduleId: 'mod-1', name: 'OrderEditor', createdAt: now, updatedAt: now },
    ]);
    mockFindByModuleRoleIds.mockResolvedValue([]); // No rules

    const guard = routeAccessGuard();

    await expect(guard(mockReq as Request, mockRes as Response, mockNext)).rejects.toThrow(
      ForbiddenError
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenError when method not allowed (AC-052-06)', async () => {
    mockReq.method = 'DELETE';
    mockGetUserRoles.mockResolvedValue([{ id: 'role-1', name: 'Manager' }]);
    mockGetModuleRolesForUserRole.mockResolvedValue([
      { id: 'mr-1', moduleId: 'mod-1', name: 'OrderEditor', createdAt: now, updatedAt: now },
    ]);
    mockFindByModuleRoleIds.mockResolvedValue([
      {
        id: 'rar-1',
        moduleRoleId: 'mr-1',
        route: '/api/orders',
        methods: ['GET', 'POST'],
        isWildcard: false,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const guard = routeAccessGuard();

    await expect(guard(mockReq as Request, mockRes as Response, mockNext)).rejects.toThrow(
      ForbiddenError
    );
  });

  it('should skip public routes (health)', async () => {
    const req = { path: '/health', method: 'GET', userId: 'user-1' } as unknown as Request;

    const guard = routeAccessGuard();
    await guard(req, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockGetUserRoles).not.toHaveBeenCalled();
  });

  it('should skip auth routes', async () => {
    const req = { path: '/api/auth/login', method: 'POST', userId: 'user-1' } as unknown as Request;

    const guard = routeAccessGuard();
    await guard(req, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockGetUserRoles).not.toHaveBeenCalled();
  });

  it('should skip custom skip paths', async () => {
    const req = { path: '/custom/public', method: 'GET', userId: 'user-1' } as unknown as Request;

    const guard = routeAccessGuard(['/custom/public']);
    await guard(req, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockGetUserRoles).not.toHaveBeenCalled();
  });

  it('should pass through when no userId is set', async () => {
    mockReq = { path: '/api/orders', method: 'GET' } as unknown as Partial<Request>;

    const guard = routeAccessGuard();
    await guard(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});
