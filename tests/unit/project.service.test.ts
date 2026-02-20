// Unit tests for ProjectService
import { ProjectService } from '../../src/services/project.service';
import { ProjectRepository } from '../../src/repositories/project.repository';
import { DepartmentRepository } from '../../src/repositories/department.repository';
import { TeamRepository } from '../../src/repositories/team.repository';
import { NotFoundError, ConflictError, ValidationError } from '../../src/utils/errors';
import { Project } from '../../src/models/project.model';

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

describe('ProjectService', () => {
  let service: ProjectService;
  let mockProjectRepo: jest.Mocked<ProjectRepository>;
  let mockDeptRepo: jest.Mocked<DepartmentRepository>;
  let mockTeamRepo: jest.Mocked<TeamRepository>;

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

  beforeEach(() => {
    mockProjectRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      hasChildProjects: jest.fn(),
    } as jest.Mocked<ProjectRepository>;

    mockDeptRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      hasTeams: jest.fn(),
      hasMembers: jest.fn(),
    } as jest.Mocked<DepartmentRepository>;

    mockTeamRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByNameInDepartment: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      hasMembers: jest.fn(),
      getTeamMembers: jest.fn(),
    } as jest.Mocked<TeamRepository>;

    service = new ProjectService(mockProjectRepo, mockDeptRepo, mockTeamRepo);
  });

  describe('createProject', () => {
    it('should create a project with minimal fields', async () => {
      mockProjectRepo.findByName.mockResolvedValue(null);
      mockProjectRepo.create.mockResolvedValue(sampleProject);

      const result = await service.createProject({ name: 'My App' });

      expect(result).toEqual(sampleProject);
      expect(mockProjectRepo.findByName).toHaveBeenCalledWith('My App');
      expect(mockProjectRepo.create).toHaveBeenCalled();
    });

    it('should throw ValidationError when name is empty', async () => {
      await expect(service.createProject({ name: '' })).rejects.toThrow(ValidationError);
      await expect(service.createProject({ name: '   ' })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when name exceeds 255 characters', async () => {
      await expect(service.createProject({ name: 'A'.repeat(256) })).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError when name already exists', async () => {
      mockProjectRepo.findByName.mockResolvedValue(sampleProject);

      await expect(service.createProject({ name: 'My App' })).rejects.toThrow(ConflictError);
    });

    it('should validate department exists when departmentId provided', async () => {
      mockProjectRepo.findByName.mockResolvedValue(null);
      mockDeptRepo.findById.mockResolvedValue(null);

      await expect(
        service.createProject({ name: 'New', departmentId: 'bad-dept' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should validate team exists when teamId provided', async () => {
      mockProjectRepo.findByName.mockResolvedValue(null);
      mockTeamRepo.findById.mockResolvedValue(null);

      await expect(
        service.createProject({ name: 'New', teamId: 'bad-team' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should validate master project exists when masterProjectId provided', async () => {
      mockProjectRepo.findByName.mockResolvedValue(null);
      mockProjectRepo.findById.mockResolvedValue(null);

      await expect(
        service.createProject({ name: 'New', masterProjectId: 'bad-proj' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for invalid enum values', async () => {
      mockProjectRepo.findByName.mockResolvedValue(null);

      await expect(
        service.createProject({ name: 'New', status: 'InvalidStatus' as never })
      ).rejects.toThrow(ValidationError);

      await expect(
        service.createProject({ name: 'New', domain: 'InvalidDomain' as never })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when start date is after go-live date', async () => {
      mockProjectRepo.findByName.mockResolvedValue(null);

      await expect(
        service.createProject({ name: 'New', startDate: '2026-06-01', goLiveDate: '2026-01-01' })
      ).rejects.toThrow(ValidationError);
    });

    it('should allow valid dates', async () => {
      mockProjectRepo.findByName.mockResolvedValue(null);
      mockProjectRepo.create.mockResolvedValue(sampleProject);

      await service.createProject({ name: 'New', startDate: '2026-01-01', goLiveDate: '2026-06-01' });

      expect(mockProjectRepo.create).toHaveBeenCalled();
    });
  });

  describe('getProjectById', () => {
    it('should return project when found', async () => {
      mockProjectRepo.findById.mockResolvedValue(sampleProject);
      const result = await service.getProjectById('proj-1');
      expect(result).toEqual(sampleProject);
    });

    it('should throw NotFoundError when not found', async () => {
      mockProjectRepo.findById.mockResolvedValue(null);
      await expect(service.getProjectById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAllProjects', () => {
    it('should return all projects', async () => {
      mockProjectRepo.findAll.mockResolvedValue([]);
      const result = await service.getAllProjects();
      expect(result).toEqual([]);
      expect(mockProjectRepo.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should pass filters through', async () => {
      mockProjectRepo.findAll.mockResolvedValue([]);
      await service.getAllProjects({ search: 'test', status: 'Live' });
      expect(mockProjectRepo.findAll).toHaveBeenCalledWith({ search: 'test', status: 'Live' });
    });
  });

  describe('updateProject', () => {
    it('should update project name', async () => {
      mockProjectRepo.findById.mockResolvedValue(sampleProject);
      mockProjectRepo.findByName.mockResolvedValue(null);
      mockProjectRepo.update.mockResolvedValue({ ...sampleProject, name: 'Updated' });

      const result = await service.updateProject('proj-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundError when project not found', async () => {
      mockProjectRepo.findById.mockResolvedValue(null);
      await expect(service.updateProject('nonexistent', { name: 'X' })).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when name conflicts with another project', async () => {
      const otherProject = { ...sampleProject, id: 'proj-2', name: 'Other' };
      mockProjectRepo.findById.mockResolvedValue(sampleProject);
      mockProjectRepo.findByName.mockResolvedValue(otherProject);

      await expect(service.updateProject('proj-1', { name: 'Other' })).rejects.toThrow(ConflictError);
    });

    it('should allow keeping the same name (case-insensitive)', async () => {
      mockProjectRepo.findById.mockResolvedValue(sampleProject);
      mockProjectRepo.update.mockResolvedValue(sampleProject);

      await service.updateProject('proj-1', { name: 'my app' });
      expect(mockProjectRepo.update).toHaveBeenCalled();
    });

    it('should throw ValidationError when project is set as its own master', async () => {
      mockProjectRepo.findById.mockResolvedValue(sampleProject);

      await expect(
        service.updateProject('proj-1', { masterProjectId: 'proj-1' })
      ).rejects.toThrow(ValidationError);
    });

    it('should validate dates against existing values on partial update', async () => {
      const projectWithStart = { ...sampleProject, startDate: '2026-01-01' };
      mockProjectRepo.findById.mockResolvedValue(projectWithStart);

      await expect(
        service.updateProject('proj-1', { goLiveDate: '2025-01-01' })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid enum on update', async () => {
      mockProjectRepo.findById.mockResolvedValue(sampleProject);

      await expect(
        service.updateProject('proj-1', { complexity: 'SuperHard' as never })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteProject', () => {
    it('should delete a project with no children', async () => {
      mockProjectRepo.findById.mockResolvedValue(sampleProject);
      mockProjectRepo.hasChildProjects.mockResolvedValue(false);
      mockProjectRepo.delete.mockResolvedValue(true);

      await service.deleteProject('proj-1');
      expect(mockProjectRepo.delete).toHaveBeenCalledWith('proj-1');
    });

    it('should throw NotFoundError when not found', async () => {
      mockProjectRepo.findById.mockResolvedValue(null);
      await expect(service.deleteProject('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when project has child projects', async () => {
      mockProjectRepo.findById.mockResolvedValue(sampleProject);
      mockProjectRepo.hasChildProjects.mockResolvedValue(true);

      await expect(service.deleteProject('proj-1')).rejects.toThrow(ConflictError);
    });
  });

  describe('getProjectEnums', () => {
    it('should return all enum arrays', () => {
      const enums = service.getProjectEnums();
      expect(enums.statuses).toContain('Intake');
      expect(enums.statuses).toContain('Live');
      expect(enums.domains).toBeDefined();
      expect(enums.processes).toBeDefined();
      expect(enums.appSizes).toBeDefined();
      expect(enums.complexities).toBeDefined();
      expect(enums.alertLevels).toBeDefined();
      expect(enums.governanceStatuses).toBeDefined();
    });
  });
});
