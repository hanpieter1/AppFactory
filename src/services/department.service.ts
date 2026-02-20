// Service layer for Department business logic
import { DepartmentRepository } from '../repositories/department.repository';
import {
  Department,
  DepartmentWithTeamCount,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentFilters,
} from '../models/department.model';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';

export class DepartmentService {
  constructor(private readonly repository: DepartmentRepository) {}

  async createDepartment(dto: CreateDepartmentDto): Promise<Department> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Department name is required');
    }
    if (dto.name.length > 255) {
      throw new ValidationError('Department name must be at most 255 characters');
    }

    const existing = await this.repository.findByName(dto.name);
    if (existing) {
      throw new ConflictError(`Department with name '${dto.name}' already exists`);
    }

    return this.repository.create(dto);
  }

  async getAllDepartments(filters?: DepartmentFilters): Promise<DepartmentWithTeamCount[]> {
    return this.repository.findAll(filters);
  }

  async getDepartmentById(id: string): Promise<Department> {
    const department = await this.repository.findById(id);
    if (!department) {
      throw new NotFoundError(`Department with id '${id}' not found`);
    }
    return department;
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Department with id '${id}' not found`);
    }

    if (dto.name !== undefined) {
      if (dto.name.trim().length === 0) {
        throw new ValidationError('Department name cannot be empty');
      }
      if (dto.name.length > 255) {
        throw new ValidationError('Department name must be at most 255 characters');
      }
      if (dto.name.toLowerCase() !== existing.name.toLowerCase()) {
        const nameExists = await this.repository.findByName(dto.name);
        if (nameExists) {
          throw new ConflictError(`Department with name '${dto.name}' already exists`);
        }
      }
    }

    const updated = await this.repository.update(id, dto);
    return updated!;
  }

  async deleteDepartment(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Department with id '${id}' not found`);
    }

    const hasTeams = await this.repository.hasTeams(id);
    if (hasTeams) {
      throw new ConflictError('Cannot delete department that has teams');
    }

    const hasMembers = await this.repository.hasMembers(id);
    if (hasMembers) {
      throw new ConflictError('Cannot delete department that has assigned members');
    }

    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new Error('Failed to delete department');
    }
  }
}
