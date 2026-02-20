// Service layer for ProjectRole business logic
import { ProjectRoleRepository } from '../repositories/project-role.repository';
import { ProjectRole, CreateProjectRoleDto, UpdateProjectRoleDto } from '../models/project-role.model';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';

export class ProjectRoleService {
  constructor(private readonly repository: ProjectRoleRepository) {}

  async createProjectRole(dto: CreateProjectRoleDto): Promise<ProjectRole> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Project role name is required');
    }
    if (dto.name.length > 255) {
      throw new ValidationError('Project role name must be at most 255 characters');
    }

    const existing = await this.repository.findByName(dto.name);
    if (existing) {
      throw new ConflictError(`Project role with name '${dto.name}' already exists`);
    }

    return this.repository.create(dto);
  }

  async getAllProjectRoles(): Promise<ProjectRole[]> {
    return this.repository.findAll();
  }

  async getProjectRoleById(id: string): Promise<ProjectRole> {
    const role = await this.repository.findById(id);
    if (!role) {
      throw new NotFoundError(`Project role with id '${id}' not found`);
    }
    return role;
  }

  async updateProjectRole(id: string, dto: UpdateProjectRoleDto): Promise<ProjectRole> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Project role with id '${id}' not found`);
    }

    if (dto.name !== undefined) {
      if (dto.name.trim().length === 0) {
        throw new ValidationError('Project role name cannot be empty');
      }
      if (dto.name.length > 255) {
        throw new ValidationError('Project role name must be at most 255 characters');
      }
      if (dto.name.toLowerCase() !== existing.name.toLowerCase()) {
        const nameExists = await this.repository.findByName(dto.name);
        if (nameExists) {
          throw new ConflictError(`Project role with name '${dto.name}' already exists`);
        }
      }
    }

    const updated = await this.repository.update(id, dto);
    return updated!;
  }

  async deleteProjectRole(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Project role with id '${id}' not found`);
    }

    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new Error('Failed to delete project role');
    }
  }
}
