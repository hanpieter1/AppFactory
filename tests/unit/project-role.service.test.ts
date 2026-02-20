// Unit tests for ProjectRoleService
import { ProjectRoleService } from '../../src/services/project-role.service';
import { ProjectRoleRepository } from '../../src/repositories/project-role.repository';
import { NotFoundError, ConflictError, ValidationError } from '../../src/utils/errors';
import { ProjectRole } from '../../src/models/project-role.model';

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

describe('ProjectRoleService', () => {
  let service: ProjectRoleService;
  let mockRepo: jest.Mocked<ProjectRoleRepository>;

  const now = new Date('2026-01-01T00:00:00Z');

  const poRole: ProjectRole = {
    id: 'prole-1',
    name: 'Product Owner',
    description: 'Owns the product backlog',
    createdAt: now,
    updatedAt: now,
  };

  const smRole: ProjectRole = {
    id: 'prole-2',
    name: 'Scrum Master',
    description: null,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    mockRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<ProjectRoleRepository>;

    service = new ProjectRoleService(mockRepo);
  });

  describe('createProjectRole', () => {
    it('should create a project role when name is unique', async () => {
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(poRole);

      const result = await service.createProjectRole({ name: 'Product Owner', description: 'Owns the product backlog' });
      expect(result).toEqual(poRole);
    });

    it('should throw ConflictError when name already exists', async () => {
      mockRepo.findByName.mockResolvedValue(poRole);
      await expect(service.createProjectRole({ name: 'Product Owner' })).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError when name is empty', async () => {
      await expect(service.createProjectRole({ name: '' })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when name exceeds 255 characters', async () => {
      await expect(service.createProjectRole({ name: 'A'.repeat(256) })).rejects.toThrow(ValidationError);
    });
  });

  describe('getAllProjectRoles', () => {
    it('should return all project roles', async () => {
      mockRepo.findAll.mockResolvedValue([poRole, smRole]);
      const result = await service.getAllProjectRoles();
      expect(result).toHaveLength(2);
    });
  });

  describe('getProjectRoleById', () => {
    it('should return project role when found', async () => {
      mockRepo.findById.mockResolvedValue(poRole);
      const result = await service.getProjectRoleById('prole-1');
      expect(result).toEqual(poRole);
    });

    it('should throw NotFoundError when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.getProjectRoleById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateProjectRole', () => {
    it('should update project role name', async () => {
      mockRepo.findById.mockResolvedValue(poRole);
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.update.mockResolvedValue({ ...poRole, name: 'PO' });

      const result = await service.updateProjectRole('prole-1', { name: 'PO' });
      expect(result.name).toBe('PO');
    });

    it('should throw ConflictError when name conflicts', async () => {
      mockRepo.findById.mockResolvedValue(poRole);
      mockRepo.findByName.mockResolvedValue(smRole);

      await expect(service.updateProjectRole('prole-1', { name: 'Scrum Master' })).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteProjectRole', () => {
    it('should delete a project role', async () => {
      mockRepo.findById.mockResolvedValue(poRole);
      mockRepo.delete.mockResolvedValue(true);

      await service.deleteProjectRole('prole-1');
      expect(mockRepo.delete).toHaveBeenCalledWith('prole-1');
    });

    it('should throw NotFoundError when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.deleteProjectRole('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});
