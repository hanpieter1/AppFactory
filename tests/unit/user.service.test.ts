// Unit tests for UserService
import { UserService } from '../../src/services/user.service';
import { UserRepository } from '../../src/repositories/user.repository';
import { RoleRepository } from '../../src/repositories/role.repository';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
} from '../../src/utils/errors';
import { User, UserWithRoles, UserType } from '../../src/models/user.model';
import { UserRole } from '../../src/models/role.model';

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcrypt') as { hash: jest.Mock; compare: jest.Mock };

describe('UserService', () => {
  let service: UserService;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockRoleRepo: jest.Mocked<RoleRepository>;

  const now = new Date('2026-01-01T00:00:00Z');

  const userRole: UserRole = {
    id: 'role-1',
    name: 'User',
    description: 'Basic access',
    createdAt: now,
    updatedAt: now,
  };

  const sampleUser: User = {
    id: 'user-1',
    name: 'john.doe',
    fullName: 'John Doe',
    email: 'john@example.com',
    active: true,
    blocked: false,
    blockedSince: null,
    failedLogins: 0,
    lastLogin: null,
    webServiceUser: false,
    isAnonymous: false,
    isLocalUser: true,
    userType: UserType.Internal,
    createdAt: now,
    updatedAt: now,
  };

  const sampleUserWithRoles: UserWithRoles = {
    ...sampleUser,
    roles: [userRole],
  };

  beforeEach(() => {
    mockUserRepo = {
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
    } as jest.Mocked<UserRepository>;

    mockRoleRepo = {
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
    } as jest.Mocked<RoleRepository>;

    service = new UserService(mockUserRepo, mockRoleRepo);
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue('$2b$10$hashedpassword');
  });

  describe('createUser', () => {
    it('should create a local user', async () => {
      mockUserRepo.findByName.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(sampleUser);
      mockUserRepo.findByIdWithRoles.mockResolvedValue(sampleUserWithRoles);

      const result = await service.createUser({
        name: 'john.doe',
        password: 'Password1',
        fullName: 'John Doe',
        email: 'john@example.com',
      });

      expect(result.name).toBe('john.doe');
      expect(result.roles).toHaveLength(1);
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          webServiceUser: false,
          isLocalUser: true,
          userType: UserType.Internal,
        })
      );
    });

    it('should create user with roles', async () => {
      mockUserRepo.findByName.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(sampleUser);
      mockUserRepo.findByIdWithRoles.mockResolvedValue(sampleUserWithRoles);
      mockRoleRepo.findById.mockResolvedValue(userRole);

      await service.createUser({
        name: 'john.doe',
        password: 'Password1',
        roleIds: ['role-1'],
      });

      expect(mockUserRepo.setUserRoles).toHaveBeenCalledWith('user-1', ['role-1']);
    });

    it('should throw ConflictError when username exists', async () => {
      mockUserRepo.findByName.mockResolvedValue(sampleUser);

      await expect(service.createUser({ name: 'john.doe', password: 'Password1' })).rejects.toThrow(
        ConflictError
      );
    });

    it('should throw ValidationError when name is empty', async () => {
      await expect(service.createUser({ name: '', password: 'Password1' })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError for weak password (too short)', async () => {
      await expect(service.createUser({ name: 'john', password: 'Ab1' })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError for password without uppercase', async () => {
      await expect(service.createUser({ name: 'john', password: 'abcdefg1' })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError for password without digit', async () => {
      await expect(service.createUser({ name: 'john', password: 'Abcdefgh' })).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('createWebServiceUser', () => {
    it('should create a web service user', async () => {
      mockUserRepo.findByName.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue({ ...sampleUser, webServiceUser: true });
      mockUserRepo.findByIdWithRoles.mockResolvedValue({
        ...sampleUserWithRoles,
        webServiceUser: true,
      });

      const result = await service.createWebServiceUser({
        name: 'api-bot',
        password: 'Password1',
        fullName: 'API Bot',
      });

      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ webServiceUser: true })
      );
      expect(result.webServiceUser).toBe(true);
    });
  });

  describe('getAllUsers', () => {
    const paginatedResult = {
      data: [sampleUser],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    it('should return paginated result', async () => {
      mockUserRepo.findAll.mockResolvedValue(paginatedResult);

      const result = await service.getAllUsers();

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should pass query through to repository', async () => {
      mockUserRepo.findAll.mockResolvedValue({
        data: [],
        pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
      });

      await service.getAllUsers({ active: true, search: 'test', page: 2, limit: 10 });

      expect(mockUserRepo.findAll).toHaveBeenCalledWith({
        active: true,
        search: 'test',
        page: 2,
        limit: 10,
      });
    });
  });

  describe('getUserById', () => {
    it('should return user with roles', async () => {
      mockUserRepo.findByIdWithRoles.mockResolvedValue(sampleUserWithRoles);

      const result = await service.getUserById('user-1');

      expect(result.roles).toHaveLength(1);
    });

    it('should throw NotFoundError when not found', async () => {
      mockUserRepo.findByIdWithRoles.mockResolvedValue(null);

      await expect(service.getUserById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateUser', () => {
    it('should update user profile', async () => {
      mockUserRepo.findById.mockResolvedValue(sampleUser);
      mockUserRepo.update.mockResolvedValue(sampleUser);
      mockUserRepo.findByIdWithRoles.mockResolvedValue(sampleUserWithRoles);

      const result = await service.updateUser('user-1', { fullName: 'Jane Doe' });

      expect(result).toEqual(sampleUserWithRoles);
    });

    it('should throw NotFoundError when not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.updateUser('nonexistent', {})).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateUserRoles', () => {
    it('should update user roles', async () => {
      mockUserRepo.findById.mockResolvedValue(sampleUser);
      mockRoleRepo.findById.mockResolvedValue(userRole);
      mockUserRepo.setUserRoles.mockResolvedValue(undefined);
      mockUserRepo.findByIdWithRoles.mockResolvedValue(sampleUserWithRoles);

      const result = await service.updateUserRoles('user-1', { roleIds: ['role-1'] });

      expect(result.roles).toHaveLength(1);
    });

    it('should throw NotFoundError when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.updateUserRoles('nonexistent', { roleIds: ['role-1'] })).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError when role not found', async () => {
      mockUserRepo.findById.mockResolvedValue(sampleUser);
      mockRoleRepo.findById.mockResolvedValue(null);

      await expect(service.updateUserRoles('user-1', { roleIds: ['nonexistent'] })).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('updateUserStatus', () => {
    it('should deactivate user', async () => {
      mockUserRepo.findById.mockResolvedValue(sampleUser);
      mockUserRepo.updateStatus.mockResolvedValue({ ...sampleUser, active: false });
      mockUserRepo.findByIdWithRoles.mockResolvedValue({
        ...sampleUserWithRoles,
        active: false,
      });

      const result = await service.updateUserStatus('user-1', { active: false });

      expect(result.active).toBe(false);
    });

    it('should unblock user and reset failedLogins', async () => {
      mockUserRepo.findById.mockResolvedValue({
        ...sampleUser,
        blocked: true,
        failedLogins: 5,
      });
      mockUserRepo.updateStatus.mockResolvedValue(sampleUser);
      mockUserRepo.findByIdWithRoles.mockResolvedValue(sampleUserWithRoles);

      await service.updateUserStatus('user-1', { blocked: false });

      expect(mockUserRepo.updateStatus).toHaveBeenCalledWith('user-1', {
        blocked: false,
        failedLogins: 0,
        blockedSince: null,
      });
    });

    it('should throw NotFoundError when not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.updateUserStatus('nonexistent', { active: true })).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('adminChangePassword', () => {
    it('should change password', async () => {
      mockUserRepo.findById.mockResolvedValue(sampleUser);
      mockUserRepo.updatePassword.mockResolvedValue(true);

      await service.adminChangePassword('user-1', {
        newPassword: 'NewPass1!',
        confirmPassword: 'NewPass1!',
      });

      expect(mockUserRepo.updatePassword).toHaveBeenCalledWith('user-1', '$2b$10$hashedpassword');
    });

    it('should throw ValidationError when passwords do not match', async () => {
      mockUserRepo.findById.mockResolvedValue(sampleUser);

      await expect(
        service.adminChangePassword('user-1', {
          newPassword: 'NewPass1!',
          confirmPassword: 'DifferentPass1!',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for weak password', async () => {
      mockUserRepo.findById.mockResolvedValue(sampleUser);

      await expect(
        service.adminChangePassword('user-1', {
          newPassword: 'weak',
          confirmPassword: 'weak',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(
        service.adminChangePassword('nonexistent', {
          newPassword: 'NewPass1!',
          confirmPassword: 'NewPass1!',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('resetPassword', () => {
    it('should return temporary password', async () => {
      mockUserRepo.findById.mockResolvedValue(sampleUser);
      mockUserRepo.updatePassword.mockResolvedValue(true);

      const result = await service.resetPassword('user-1');

      expect(result.temporaryPassword).toBeDefined();
      expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(8);
      expect(mockUserRepo.updatePassword).toHaveBeenCalled();
    });

    it('should throw NotFoundError when not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.resetPassword('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateMyProfile', () => {
    it('should update own profile', async () => {
      mockUserRepo.findById.mockResolvedValue(sampleUser);
      mockUserRepo.update.mockResolvedValue(sampleUser);
      mockUserRepo.findByIdWithRoles.mockResolvedValue(sampleUserWithRoles);

      const result = await service.updateMyProfile('user-1', {
        fullName: 'New Name',
        email: 'new@example.com',
      });

      expect(result).toEqual(sampleUserWithRoles);
    });

    it('should throw NotFoundError when not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.updateMyProfile('nonexistent', {})).rejects.toThrow(NotFoundError);
    });
  });

  describe('changeMyPassword', () => {
    it('should change password when old password is correct', async () => {
      mockUserRepo.findById.mockResolvedValue(sampleUser);
      mockUserRepo.findPasswordHashById.mockResolvedValue('$2b$10$oldhash');
      bcrypt.compare.mockResolvedValue(true);
      mockUserRepo.updatePassword.mockResolvedValue(true);

      await service.changeMyPassword('user-1', {
        oldPassword: 'OldPass1!',
        newPassword: 'NewPass1!',
        confirmPassword: 'NewPass1!',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('OldPass1!', '$2b$10$oldhash');
      expect(mockUserRepo.updatePassword).toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when old password is wrong', async () => {
      mockUserRepo.findById.mockResolvedValue(sampleUser);
      mockUserRepo.findPasswordHashById.mockResolvedValue('$2b$10$oldhash');
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        service.changeMyPassword('user-1', {
          oldPassword: 'WrongPass1!',
          newPassword: 'NewPass1!',
          confirmPassword: 'NewPass1!',
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw ValidationError when passwords do not match', async () => {
      mockUserRepo.findById.mockResolvedValue(sampleUser);

      await expect(
        service.changeMyPassword('user-1', {
          oldPassword: 'OldPass1!',
          newPassword: 'NewPass1!',
          confirmPassword: 'DifferentPass1!',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for weak new password', async () => {
      mockUserRepo.findById.mockResolvedValue(sampleUser);

      await expect(
        service.changeMyPassword('user-1', {
          oldPassword: 'OldPass1!',
          newPassword: 'weak',
          confirmPassword: 'weak',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(
        service.changeMyPassword('nonexistent', {
          oldPassword: 'OldPass1!',
          newPassword: 'NewPass1!',
          confirmPassword: 'NewPass1!',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('recordLastLogin', () => {
    it('should update last login', async () => {
      mockUserRepo.updateLastLogin.mockResolvedValue(undefined);

      await service.recordLastLogin('user-1');

      expect(mockUserRepo.updateLastLogin).toHaveBeenCalledWith('user-1');
    });
  });

  describe('delegation authorization', () => {
    const adminRole: UserRole = {
      id: 'role-admin',
      name: 'Administrator',
      description: 'Full access',
      createdAt: now,
      updatedAt: now,
    };

    const managerRole: UserRole = {
      id: 'role-manager',
      name: 'Manager',
      description: 'Team management',
      createdAt: now,
      updatedAt: now,
    };

    describe('getActingUserContext', () => {
      it('should return isAdmin=true when user has Administrator role', async () => {
        mockUserRepo.getUserRoles.mockResolvedValue([adminRole]);

        const context = await service.getActingUserContext('admin-user');

        expect(context.isAdmin).toBe(true);
        expect(mockRoleRepo.getGrantableRoleIdsForRoles).not.toHaveBeenCalled();
      });

      it('should return grantable role IDs for non-admin user', async () => {
        mockUserRepo.getUserRoles.mockResolvedValue([managerRole]);
        mockRoleRepo.getGrantableRoleIdsForRoles.mockResolvedValue(['role-1']);

        const context = await service.getActingUserContext('manager-user');

        expect(context.isAdmin).toBe(false);
        expect(context.grantableRoleIds).toEqual(['role-1']);
        expect(mockRoleRepo.getGrantableRoleIdsForRoles).toHaveBeenCalledWith(['role-manager']);
      });

      it('should return empty grantableRoleIds for user with no roles', async () => {
        mockUserRepo.getUserRoles.mockResolvedValue([]);
        mockRoleRepo.getGrantableRoleIdsForRoles.mockResolvedValue([]);

        const context = await service.getActingUserContext('norole-user');

        expect(context.isAdmin).toBe(false);
        expect(context.grantableRoleIds).toEqual([]);
      });
    });

    describe('createUser with delegation', () => {
      beforeEach(() => {
        mockUserRepo.findByName.mockResolvedValue(null);
        mockUserRepo.create.mockResolvedValue(sampleUser);
        mockUserRepo.findByIdWithRoles.mockResolvedValue(sampleUserWithRoles);
        mockRoleRepo.findById.mockResolvedValue(userRole);
      });

      it('should allow admin to assign any role', async () => {
        mockUserRepo.getUserRoles.mockResolvedValue([adminRole]);

        await service.createUser(
          { name: 'new.user', password: 'Password1', roleIds: ['role-1'] },
          'admin-user'
        );

        expect(mockUserRepo.create).toHaveBeenCalled();
      });

      it('should allow manager to assign grantable roles', async () => {
        mockUserRepo.getUserRoles.mockResolvedValue([managerRole]);
        mockRoleRepo.getGrantableRoleIdsForRoles.mockResolvedValue(['role-1']);

        await service.createUser(
          { name: 'new.user', password: 'Password1', roleIds: ['role-1'] },
          'manager-user'
        );

        expect(mockUserRepo.create).toHaveBeenCalled();
      });

      it('should throw ForbiddenError when assigning non-grantable role', async () => {
        mockUserRepo.getUserRoles.mockResolvedValue([managerRole]);
        mockRoleRepo.getGrantableRoleIdsForRoles.mockResolvedValue(['role-1']);

        await expect(
          service.createUser(
            { name: 'new.user', password: 'Password1', roleIds: ['role-admin'] },
            'manager-user'
          )
        ).rejects.toThrow(ForbiddenError);
      });

      it('should skip delegation check when no actingUserId', async () => {
        await service.createUser({
          name: 'new.user',
          password: 'Password1',
          roleIds: ['role-1'],
        });

        expect(mockUserRepo.getUserRoles).not.toHaveBeenCalled();
      });
    });

    describe('updateUserRoles with delegation', () => {
      beforeEach(() => {
        mockUserRepo.findById.mockResolvedValue(sampleUser);
        mockRoleRepo.findById.mockResolvedValue(userRole);
        mockUserRepo.setUserRoles.mockResolvedValue(undefined);
        mockUserRepo.findByIdWithRoles.mockResolvedValue(sampleUserWithRoles);
      });

      it('should allow admin to update any user roles', async () => {
        mockUserRepo.getUserRoles
          .mockResolvedValueOnce([adminRole]) // acting user's roles
          .mockResolvedValueOnce([userRole]); // target user's roles

        await service.updateUserRoles('user-1', { roleIds: ['role-1'] }, 'admin-user');

        expect(mockUserRepo.setUserRoles).toHaveBeenCalled();
      });

      it('should throw ForbiddenError when target has non-grantable roles', async () => {
        mockUserRepo.getUserRoles
          .mockResolvedValueOnce([managerRole]) // acting user's roles
          .mockResolvedValueOnce([adminRole]); // target user has Admin role
        mockRoleRepo.getGrantableRoleIdsForRoles.mockResolvedValue(['role-1']);

        await expect(
          service.updateUserRoles('user-1', { roleIds: ['role-1'] }, 'manager-user')
        ).rejects.toThrow(ForbiddenError);
      });

      it('should throw ForbiddenError when assigning non-grantable roles', async () => {
        mockUserRepo.getUserRoles
          .mockResolvedValueOnce([managerRole]) // acting user's roles
          .mockResolvedValueOnce([userRole]); // target user has User role
        mockRoleRepo.getGrantableRoleIdsForRoles.mockResolvedValue(['role-1']);

        await expect(
          service.updateUserRoles('user-1', { roleIds: ['role-admin'] }, 'manager-user')
        ).rejects.toThrow(ForbiddenError);
      });

      it('should allow managing user with no roles', async () => {
        mockUserRepo.getUserRoles
          .mockResolvedValueOnce([managerRole]) // acting user's roles
          .mockResolvedValueOnce([]); // target has no roles
        mockRoleRepo.getGrantableRoleIdsForRoles.mockResolvedValue(['role-1']);

        await service.updateUserRoles('user-1', { roleIds: ['role-1'] }, 'manager-user');

        expect(mockUserRepo.setUserRoles).toHaveBeenCalled();
      });
    });

    describe('updateUser with delegation', () => {
      it('should throw ForbiddenError when acting user cannot manage target', async () => {
        mockUserRepo.findById.mockResolvedValue(sampleUser);
        mockUserRepo.getUserRoles
          .mockResolvedValueOnce([managerRole]) // acting user's roles
          .mockResolvedValueOnce([adminRole]); // target has Admin role
        mockRoleRepo.getGrantableRoleIdsForRoles.mockResolvedValue(['role-1']);

        await expect(
          service.updateUser('user-1', { fullName: 'New Name' }, 'manager-user')
        ).rejects.toThrow(ForbiddenError);
      });

      it('should allow admin to update any user', async () => {
        mockUserRepo.findById.mockResolvedValue(sampleUser);
        mockUserRepo.getUserRoles.mockResolvedValue([adminRole]);
        mockUserRepo.update.mockResolvedValue(sampleUser);
        mockUserRepo.findByIdWithRoles.mockResolvedValue(sampleUserWithRoles);

        await service.updateUser('user-1', { fullName: 'New Name' }, 'admin-user');

        expect(mockUserRepo.update).toHaveBeenCalled();
      });
    });

    describe('updateUserStatus with delegation', () => {
      it('should throw ForbiddenError when acting user cannot manage target', async () => {
        mockUserRepo.findById.mockResolvedValue(sampleUser);
        mockUserRepo.getUserRoles
          .mockResolvedValueOnce([managerRole])
          .mockResolvedValueOnce([adminRole]);
        mockRoleRepo.getGrantableRoleIdsForRoles.mockResolvedValue(['role-1']);

        await expect(
          service.updateUserStatus('user-1', { active: false }, 'manager-user')
        ).rejects.toThrow(ForbiddenError);
      });
    });

    describe('adminChangePassword with delegation', () => {
      it('should throw ForbiddenError when acting user cannot manage target', async () => {
        mockUserRepo.findById.mockResolvedValue(sampleUser);
        mockUserRepo.getUserRoles
          .mockResolvedValueOnce([managerRole])
          .mockResolvedValueOnce([adminRole]);
        mockRoleRepo.getGrantableRoleIdsForRoles.mockResolvedValue(['role-1']);

        await expect(
          service.adminChangePassword(
            'user-1',
            { newPassword: 'NewPass1!', confirmPassword: 'NewPass1!' },
            'manager-user'
          )
        ).rejects.toThrow(ForbiddenError);
      });
    });

    describe('resetPassword with delegation', () => {
      it('should throw ForbiddenError when acting user cannot manage target', async () => {
        mockUserRepo.findById.mockResolvedValue(sampleUser);
        mockUserRepo.getUserRoles
          .mockResolvedValueOnce([managerRole])
          .mockResolvedValueOnce([adminRole]);
        mockRoleRepo.getGrantableRoleIdsForRoles.mockResolvedValue(['role-1']);

        await expect(service.resetPassword('user-1', 'manager-user')).rejects.toThrow(
          ForbiddenError
        );
      });

      it('should allow admin to reset any user password', async () => {
        mockUserRepo.findById.mockResolvedValue(sampleUser);
        mockUserRepo.getUserRoles.mockResolvedValue([adminRole]);
        mockUserRepo.updatePassword.mockResolvedValue(true);

        const result = await service.resetPassword('user-1', 'admin-user');

        expect(result.temporaryPassword).toBeDefined();
      });
    });
  });
});
