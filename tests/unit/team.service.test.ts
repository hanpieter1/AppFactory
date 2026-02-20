// Unit tests for TeamService
import { TeamService } from '../../src/services/team.service';
import { TeamRepository } from '../../src/repositories/team.repository';
import { DepartmentRepository } from '../../src/repositories/department.repository';
import { NotFoundError, ConflictError, ValidationError } from '../../src/utils/errors';
import { Team } from '../../src/models/team.model';
import { Department } from '../../src/models/department.model';

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

describe('TeamService', () => {
  let service: TeamService;
  let mockTeamRepo: jest.Mocked<TeamRepository>;
  let mockDeptRepo: jest.Mocked<DepartmentRepository>;

  const now = new Date('2026-01-01T00:00:00Z');

  const dept: Department = {
    id: 'dept-1',
    name: 'Engineering',
    description: null,
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  const team: Team = {
    id: 'team-1',
    name: 'Backend',
    departmentId: 'dept-1',
    description: 'Backend team',
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
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

    service = new TeamService(mockTeamRepo, mockDeptRepo);
  });

  describe('createTeam', () => {
    it('should create a team when name is unique in department', async () => {
      mockDeptRepo.findById.mockResolvedValue(dept);
      mockTeamRepo.findByNameInDepartment.mockResolvedValue(null);
      mockTeamRepo.create.mockResolvedValue(team);

      const result = await service.createTeam({ name: 'Backend', departmentId: 'dept-1' });
      expect(result).toEqual(team);
    });

    it('should throw ValidationError when name is empty', async () => {
      await expect(service.createTeam({ name: '', departmentId: 'dept-1' })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when departmentId is missing', async () => {
      await expect(service.createTeam({ name: 'Backend', departmentId: '' })).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when department does not exist', async () => {
      mockDeptRepo.findById.mockResolvedValue(null);
      await expect(service.createTeam({ name: 'Backend', departmentId: 'nonexistent' })).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when name exists in department', async () => {
      mockDeptRepo.findById.mockResolvedValue(dept);
      mockTeamRepo.findByNameInDepartment.mockResolvedValue(team);

      await expect(service.createTeam({ name: 'Backend', departmentId: 'dept-1' })).rejects.toThrow(ConflictError);
    });
  });

  describe('getTeamById', () => {
    it('should return team when found', async () => {
      mockTeamRepo.findById.mockResolvedValue(team);
      const result = await service.getTeamById('team-1');
      expect(result).toEqual(team);
    });

    it('should throw NotFoundError when not found', async () => {
      mockTeamRepo.findById.mockResolvedValue(null);
      await expect(service.getTeamById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteTeam', () => {
    it('should delete a team with no members', async () => {
      mockTeamRepo.findById.mockResolvedValue(team);
      mockTeamRepo.hasMembers.mockResolvedValue(false);
      mockTeamRepo.delete.mockResolvedValue(true);

      await service.deleteTeam('team-1');
      expect(mockTeamRepo.delete).toHaveBeenCalledWith('team-1');
    });

    it('should throw ConflictError when team has members', async () => {
      mockTeamRepo.findById.mockResolvedValue(team);
      mockTeamRepo.hasMembers.mockResolvedValue(true);

      await expect(service.deleteTeam('team-1')).rejects.toThrow(ConflictError);
    });
  });

  describe('getTeamMembers', () => {
    it('should return team members', async () => {
      mockTeamRepo.findById.mockResolvedValue(team);
      mockTeamRepo.getTeamMembers.mockResolvedValue([
        { id: 'user-1', name: 'john', fullName: 'John Doe' },
      ]);

      const result = await service.getTeamMembers('team-1');
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundError when team not found', async () => {
      mockTeamRepo.findById.mockResolvedValue(null);
      await expect(service.getTeamMembers('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});
