// Service layer for Team business logic
import { TeamRepository } from '../repositories/team.repository';
import { DepartmentRepository } from '../repositories/department.repository';
import { Team, TeamWithDetails, CreateTeamDto, UpdateTeamDto, TeamFilters } from '../models/team.model';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';

export class TeamService {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly departmentRepository: DepartmentRepository
  ) {}

  async createTeam(dto: CreateTeamDto): Promise<Team> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Team name is required');
    }
    if (dto.name.length > 255) {
      throw new ValidationError('Team name must be at most 255 characters');
    }
    if (!dto.departmentId) {
      throw new ValidationError('Department ID is required');
    }

    const department = await this.departmentRepository.findById(dto.departmentId);
    if (!department) {
      throw new NotFoundError(`Department with id '${dto.departmentId}' not found`);
    }

    const existing = await this.teamRepository.findByNameInDepartment(dto.name, dto.departmentId);
    if (existing) {
      throw new ConflictError(`Team with name '${dto.name}' already exists in this department`);
    }

    return this.teamRepository.create(dto);
  }

  async getAllTeams(filters?: TeamFilters): Promise<TeamWithDetails[]> {
    return this.teamRepository.findAll(filters);
  }

  async getTeamById(id: string): Promise<Team> {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      throw new NotFoundError(`Team with id '${id}' not found`);
    }
    return team;
  }

  async updateTeam(id: string, dto: UpdateTeamDto): Promise<Team> {
    const existing = await this.teamRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Team with id '${id}' not found`);
    }

    if (dto.name !== undefined) {
      if (dto.name.trim().length === 0) {
        throw new ValidationError('Team name cannot be empty');
      }
      if (dto.name.length > 255) {
        throw new ValidationError('Team name must be at most 255 characters');
      }
    }

    if (dto.departmentId !== undefined) {
      const department = await this.departmentRepository.findById(dto.departmentId);
      if (!department) {
        throw new NotFoundError(`Department with id '${dto.departmentId}' not found`);
      }
    }

    // Check name uniqueness within department
    const targetDeptId = dto.departmentId ?? existing.departmentId;
    const targetName = dto.name ?? existing.name;
    if (
      (dto.name !== undefined && dto.name.toLowerCase() !== existing.name.toLowerCase()) ||
      (dto.departmentId !== undefined && dto.departmentId !== existing.departmentId)
    ) {
      const nameExists = await this.teamRepository.findByNameInDepartment(targetName, targetDeptId);
      if (nameExists && nameExists.id !== id) {
        throw new ConflictError(`Team with name '${targetName}' already exists in this department`);
      }
    }

    const updated = await this.teamRepository.update(id, dto);
    return updated!;
  }

  async deleteTeam(id: string): Promise<void> {
    const existing = await this.teamRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Team with id '${id}' not found`);
    }

    const hasMembers = await this.teamRepository.hasMembers(id);
    if (hasMembers) {
      throw new ConflictError('Cannot delete team that has assigned members');
    }

    const deleted = await this.teamRepository.delete(id);
    if (!deleted) {
      throw new Error('Failed to delete team');
    }
  }

  async getTeamMembers(id: string): Promise<{ id: string; name: string; fullName: string | null }[]> {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      throw new NotFoundError(`Team with id '${id}' not found`);
    }
    return this.teamRepository.getTeamMembers(id);
  }
}
