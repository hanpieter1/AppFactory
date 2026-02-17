// Unit tests for entityAccessGuard middleware
import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../../src/utils/errors';

// Mock repos before importing the guard
const mockGetUserRoles = jest.fn();
const mockGetModuleRolesForUserRole = jest.fn();
const mockFindByModuleRoleIds = jest.fn();

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('../../src/repositories/entity-access.repository', () => ({
  EntityAccessRepository: jest.fn(),
  entityAccessRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByModuleRoleId: jest.fn(),
    findByModuleRoleIds: (...args: unknown[]) => mockFindByModuleRoleIds(...args),
    findByModuleRoleAndEntity: jest.fn(),
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
import { entityAccessGuard } from '../../src/middleware/entity-access-guard';

describe('entityAccessGuard', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const now = new Date('2026-01-01T00:00:00Z');

  beforeEach(() => {
    mockReq = { userId: 'user-1' } as unknown as Partial<Request>;
    mockRes = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should call next() when user has permission', async () => {
    mockGetUserRoles.mockResolvedValue([{ id: 'role-1', name: 'Manager' }]);
    mockGetModuleRolesForUserRole.mockResolvedValue([
      { id: 'mr-1', moduleId: 'mod-1', name: 'OrderEditor', createdAt: now, updatedAt: now },
    ]);
    mockFindByModuleRoleIds.mockResolvedValue([
      {
        id: 'ear-1',
        moduleRoleId: 'mr-1',
        entity: 'Order',
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        rowFilter: null,
        fieldAccess: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const guard = entityAccessGuard('Order', 'update');
    await guard(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should throw ForbiddenError when user has no permissions for entity', async () => {
    mockGetUserRoles.mockResolvedValue([{ id: 'role-1', name: 'Manager' }]);
    mockGetModuleRolesForUserRole.mockResolvedValue([
      { id: 'mr-1', moduleId: 'mod-1', name: 'OrderEditor', createdAt: now, updatedAt: now },
    ]);
    mockFindByModuleRoleIds.mockResolvedValue([]); // No rules

    const guard = entityAccessGuard('Order', 'read');

    await expect(guard(mockReq as Request, mockRes as Response, mockNext)).rejects.toThrow(
      ForbiddenError
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenError when operation is not permitted', async () => {
    mockGetUserRoles.mockResolvedValue([{ id: 'role-1', name: 'Manager' }]);
    mockGetModuleRolesForUserRole.mockResolvedValue([
      { id: 'mr-1', moduleId: 'mod-1', name: 'OrderViewer', createdAt: now, updatedAt: now },
    ]);
    mockFindByModuleRoleIds.mockResolvedValue([
      {
        id: 'ear-1',
        moduleRoleId: 'mr-1',
        entity: 'Order',
        canCreate: false,
        canRead: true,
        canUpdate: false,
        canDelete: false,
        rowFilter: null,
        fieldAccess: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const guard = entityAccessGuard('Order', 'delete');

    await expect(guard(mockReq as Request, mockRes as Response, mockNext)).rejects.toThrow(
      ForbiddenError
    );
  });

  it('should throw ForbiddenError when user has no roles', async () => {
    mockGetUserRoles.mockResolvedValue([]);

    const guard = entityAccessGuard('Order', 'read');

    await expect(guard(mockReq as Request, mockRes as Response, mockNext)).rejects.toThrow(
      ForbiddenError
    );
  });

  it('should check correct operation flag', async () => {
    mockGetUserRoles.mockResolvedValue([{ id: 'role-1', name: 'Manager' }]);
    mockGetModuleRolesForUserRole.mockResolvedValue([
      { id: 'mr-1', moduleId: 'mod-1', name: 'OrderEditor', createdAt: now, updatedAt: now },
    ]);
    mockFindByModuleRoleIds.mockResolvedValue([
      {
        id: 'ear-1',
        moduleRoleId: 'mr-1',
        entity: 'Order',
        canCreate: false,
        canRead: true,
        canUpdate: false,
        canDelete: false,
        rowFilter: null,
        fieldAccess: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    // read should pass
    const readGuard = entityAccessGuard('Order', 'read');
    await readGuard(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();

    // create should fail
    const createGuard = entityAccessGuard('Order', 'create');
    await expect(createGuard(mockReq as Request, mockRes as Response, mockNext)).rejects.toThrow(
      ForbiddenError
    );
  });
});
