// Unit tests for RoleService
import { RoleService } from '../../src/services/role.service';
import { RoleRepository } from '../../src/repositories/role.repository';
import { NotFoundError, ConflictError, ValidationError } from '../../src/utils/errors';
import { UserRole, UserRoleWithGrantable } from '../../src/models/role.model';

// Mock the database module so repository import doesn't fail
jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

describe('RoleService', () => {
  let service: RoleService;
  let mockRepo: jest.Mocked<RoleRepository>;

  const now = new Date('2026-01-01T00:00:00Z');

  const adminRole: UserRole = {
    id: 'role-1',
    name: 'Administrator',
    description: 'Full access',
    createdAt: now,
    updatedAt: now,
  };

  const userRole: UserRole = {
    id: 'role-2',
    name: 'User',
    description: 'Basic access',
    createdAt: now,
    updatedAt: now,
  };

  const adminWithGrantable: UserRoleWithGrantable = {
    ...adminRole,
    grantableRoles: [userRole],
  };

  beforeEach(() => {
    mockRepo = {
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

    service = new RoleService(mockRepo);
  });

  describe('createRole', () => {
    it('should create a role when name is unique', async () => {
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(adminRole);

      const result = await service.createRole({
        name: 'Administrator',
        description: 'Full access',
      });

      expect(result).toEqual(adminRole);
      expect(mockRepo.findByName).toHaveBeenCalledWith('Administrator');
      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'Administrator',
        description: 'Full access',
      });
    });

    it('should throw ConflictError when name already exists', async () => {
      mockRepo.findByName.mockResolvedValue(adminRole);

      await expect(service.createRole({ name: 'Administrator' })).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError when name is empty', async () => {
      await expect(service.createRole({ name: '' })).rejects.toThrow(ValidationError);
      await expect(service.createRole({ name: '   ' })).rejects.toThrow(ValidationError);
    });
  });

  describe('getAllRoles', () => {
    it('should return all roles', async () => {
      mockRepo.findAll.mockResolvedValue([adminRole, userRole]);

      const result = await service.getAllRoles();

      expect(result).toHaveLength(2);
    });
  });

  describe('getRoleById', () => {
    it('should return role with grantable roles', async () => {
      mockRepo.findByIdWithGrantable.mockResolvedValue(adminWithGrantable);

      const result = await service.getRoleById('role-1');

      expect(result.grantableRoles).toHaveLength(1);
    });

    it('should throw NotFoundError when role does not exist', async () => {
      mockRepo.findByIdWithGrantable.mockResolvedValue(null);

      await expect(service.getRoleById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateRole', () => {
    it('should update role name', async () => {
      mockRepo.findById.mockResolvedValue(adminRole);
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.update.mockResolvedValue({ ...adminRole, name: 'SuperAdmin' });

      const result = await service.updateRole('role-1', { name: 'SuperAdmin' });

      expect(result.name).toBe('SuperAdmin');
    });

    it('should throw NotFoundError when role does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.updateRole('nonexistent', { name: 'New' })).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ConflictError when new name conflicts', async () => {
      mockRepo.findById.mockResolvedValue(adminRole);
      mockRepo.findByName.mockResolvedValue(userRole); // different id

      await expect(service.updateRole('role-1', { name: 'User' })).rejects.toThrow(ConflictError);
    });

    it('should allow update when name conflicts with self', async () => {
      mockRepo.findById.mockResolvedValue(adminRole);
      mockRepo.findByName.mockResolvedValue(adminRole); // same id
      mockRepo.update.mockResolvedValue(adminRole);

      const result = await service.updateRole('role-1', { name: 'Administrator' });

      expect(result).toEqual(adminRole);
    });

    it('should throw ValidationError when name is empty', async () => {
      mockRepo.findById.mockResolvedValue(adminRole);

      await expect(service.updateRole('role-1', { name: '' })).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteRole', () => {
    it('should delete role when not in use', async () => {
      mockRepo.findById.mockResolvedValue(adminRole);
      mockRepo.isRoleAssignedToUsers.mockResolvedValue(false);
      mockRepo.isRoleReferencedAsGrantable.mockResolvedValue(false);
      mockRepo.delete.mockResolvedValue(true);

      await service.deleteRole('role-1');

      expect(mockRepo.delete).toHaveBeenCalledWith('role-1');
    });

    it('should throw NotFoundError when role does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.deleteRole('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when role is assigned to users', async () => {
      mockRepo.findById.mockResolvedValue(adminRole);
      mockRepo.isRoleAssignedToUsers.mockResolvedValue(true);

      await expect(service.deleteRole('role-1')).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError when role is referenced as grantable', async () => {
      mockRepo.findById.mockResolvedValue(adminRole);
      mockRepo.isRoleAssignedToUsers.mockResolvedValue(false);
      mockRepo.isRoleReferencedAsGrantable.mockResolvedValue(true);

      await expect(service.deleteRole('role-1')).rejects.toThrow(ConflictError);
    });
  });

  describe('getGrantableRoles', () => {
    it('should return grantable roles', async () => {
      mockRepo.findById.mockResolvedValue(adminRole);
      mockRepo.getGrantableRoles.mockResolvedValue([userRole]);

      const result = await service.getGrantableRoles('role-1');

      expect(result).toEqual([userRole]);
    });

    it('should throw NotFoundError when role does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getGrantableRoles('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('setGrantableRoles', () => {
    it('should set grantable roles and return updated list', async () => {
      mockRepo.findById
        .mockResolvedValueOnce(adminRole) // check role exists
        .mockResolvedValueOnce(userRole); // validate target role
      mockRepo.setGrantableRoles.mockResolvedValue(undefined);
      mockRepo.getGrantableRoles.mockResolvedValue([userRole]);

      const result = await service.setGrantableRoles('role-1', {
        grantableRoleIds: ['role-2'],
      });

      expect(result).toEqual([userRole]);
    });

    it('should filter out self-references', async () => {
      mockRepo.findById
        .mockResolvedValueOnce(adminRole) // check role exists
        .mockResolvedValueOnce(userRole); // validate role-2
      mockRepo.setGrantableRoles.mockResolvedValue(undefined);
      mockRepo.getGrantableRoles.mockResolvedValue([userRole]);

      await service.setGrantableRoles('role-1', {
        grantableRoleIds: ['role-1', 'role-2'], // role-1 is self-reference
      });

      // Should only pass role-2 (self-reference filtered)
      expect(mockRepo.setGrantableRoles).toHaveBeenCalledWith('role-1', ['role-2']);
    });

    it('should throw NotFoundError when role does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.setGrantableRoles('nonexistent', { grantableRoleIds: ['role-2'] })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when target role does not exist', async () => {
      mockRepo.findById
        .mockResolvedValueOnce(adminRole) // role exists
        .mockResolvedValueOnce(null); // target doesn't

      await expect(
        service.setGrantableRoles('role-1', { grantableRoleIds: ['nonexistent'] })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
