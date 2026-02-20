// Unit tests for DepartmentService
import { DepartmentService } from '../../src/services/department.service';
import { DepartmentRepository } from '../../src/repositories/department.repository';
import { NotFoundError, ConflictError, ValidationError } from '../../src/utils/errors';
import { Department } from '../../src/models/department.model';

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

describe('DepartmentService', () => {
  let service: DepartmentService;
  let mockRepo: jest.Mocked<DepartmentRepository>;

  const now = new Date('2026-01-01T00:00:00Z');

  const engineeringDept: Department = {
    id: 'dept-1',
    name: 'Engineering',
    description: 'Engineering department',
    active: true,
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
      hasTeams: jest.fn(),
      hasMembers: jest.fn(),
    } as jest.Mocked<DepartmentRepository>;

    service = new DepartmentService(mockRepo);
  });

  describe('createDepartment', () => {
    it('should create a department when name is unique', async () => {
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(engineeringDept);

      const result = await service.createDepartment({ name: 'Engineering', description: 'Engineering department' });

      expect(result).toEqual(engineeringDept);
      expect(mockRepo.findByName).toHaveBeenCalledWith('Engineering');
    });

    it('should throw ConflictError when name already exists', async () => {
      mockRepo.findByName.mockResolvedValue(engineeringDept);

      await expect(service.createDepartment({ name: 'Engineering' })).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError when name is empty', async () => {
      await expect(service.createDepartment({ name: '' })).rejects.toThrow(ValidationError);
      await expect(service.createDepartment({ name: '   ' })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when name exceeds 255 characters', async () => {
      await expect(service.createDepartment({ name: 'A'.repeat(256) })).rejects.toThrow(ValidationError);
    });
  });

  describe('getDepartmentById', () => {
    it('should return department when found', async () => {
      mockRepo.findById.mockResolvedValue(engineeringDept);
      const result = await service.getDepartmentById('dept-1');
      expect(result).toEqual(engineeringDept);
    });

    it('should throw NotFoundError when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.getDepartmentById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateDepartment', () => {
    it('should update department name', async () => {
      mockRepo.findById.mockResolvedValue(engineeringDept);
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.update.mockResolvedValue({ ...engineeringDept, name: 'Eng' });

      const result = await service.updateDepartment('dept-1', { name: 'Eng' });
      expect(result.name).toBe('Eng');
    });

    it('should throw NotFoundError when department not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.updateDepartment('nonexistent', { name: 'New' })).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when name conflicts', async () => {
      const otherDept = { ...engineeringDept, id: 'dept-2', name: 'Sales' };
      mockRepo.findById.mockResolvedValue(engineeringDept);
      mockRepo.findByName.mockResolvedValue(otherDept);

      await expect(service.updateDepartment('dept-1', { name: 'Sales' })).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteDepartment', () => {
    it('should delete a department with no teams or members', async () => {
      mockRepo.findById.mockResolvedValue(engineeringDept);
      mockRepo.hasTeams.mockResolvedValue(false);
      mockRepo.hasMembers.mockResolvedValue(false);
      mockRepo.delete.mockResolvedValue(true);

      await service.deleteDepartment('dept-1');
      expect(mockRepo.delete).toHaveBeenCalledWith('dept-1');
    });

    it('should throw NotFoundError when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.deleteDepartment('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when department has teams', async () => {
      mockRepo.findById.mockResolvedValue(engineeringDept);
      mockRepo.hasTeams.mockResolvedValue(true);

      await expect(service.deleteDepartment('dept-1')).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError when department has members', async () => {
      mockRepo.findById.mockResolvedValue(engineeringDept);
      mockRepo.hasTeams.mockResolvedValue(false);
      mockRepo.hasMembers.mockResolvedValue(true);

      await expect(service.deleteDepartment('dept-1')).rejects.toThrow(ConflictError);
    });
  });
});
