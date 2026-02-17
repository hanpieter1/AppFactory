// Service layer for UserRole business logic
import { RoleRepository } from '../repositories/role.repository';
import {
  UserRole,
  UserRoleWithGrantable,
  CreateRoleDto,
  UpdateRoleDto,
  SetGrantableRolesDto,
} from '../models/role.model';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';

export class RoleService {
  constructor(private readonly repository: RoleRepository) {}

  async createRole(dto: CreateRoleDto): Promise<UserRole> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Role name is required');
    }

    const existing = await this.repository.findByName(dto.name);
    if (existing) {
      throw new ConflictError(`Role with name '${dto.name}' already exists`);
    }

    return this.repository.create(dto);
  }

  async getAllRoles(): Promise<UserRole[]> {
    return this.repository.findAll();
  }

  async getRoleById(id: string): Promise<UserRoleWithGrantable> {
    const role = await this.repository.findByIdWithGrantable(id);
    if (!role) {
      throw new NotFoundError(`Role with id '${id}' not found`);
    }
    return role;
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<UserRole> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Role with id '${id}' not found`);
    }

    if (dto.name !== undefined) {
      if (dto.name.trim().length === 0) {
        throw new ValidationError('Role name cannot be empty');
      }

      const nameConflict = await this.repository.findByName(dto.name);
      if (nameConflict && nameConflict.id !== id) {
        throw new ConflictError(`Role with name '${dto.name}' already exists`);
      }
    }

    const updated = await this.repository.update(id, dto);
    return updated!;
  }

  async deleteRole(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Role with id '${id}' not found`);
    }

    const assigned = await this.repository.isRoleAssignedToUsers(id);
    if (assigned) {
      throw new ConflictError(`Role '${existing.name}' is assigned to users and cannot be deleted`);
    }

    const referenced = await this.repository.isRoleReferencedAsGrantable(id);
    if (referenced) {
      throw new ConflictError(
        `Role '${existing.name}' is referenced as a grantable role and cannot be deleted`
      );
    }

    await this.repository.delete(id);
  }

  async getGrantableRoles(roleId: string): Promise<UserRole[]> {
    const role = await this.repository.findById(roleId);
    if (!role) {
      throw new NotFoundError(`Role with id '${roleId}' not found`);
    }

    return this.repository.getGrantableRoles(roleId);
  }

  async setGrantableRoles(roleId: string, dto: SetGrantableRolesDto): Promise<UserRole[]> {
    const role = await this.repository.findById(roleId);
    if (!role) {
      throw new NotFoundError(`Role with id '${roleId}' not found`);
    }

    // Filter out self-references
    const filteredIds = dto.grantableRoleIds.filter((id) => id !== roleId);

    // Validate all target role IDs exist
    for (const targetId of filteredIds) {
      const targetRole = await this.repository.findById(targetId);
      if (!targetRole) {
        throw new NotFoundError(`Grantable role with id '${targetId}' not found`);
      }
    }

    await this.repository.setGrantableRoles(roleId, filteredIds);
    return this.repository.getGrantableRoles(roleId);
  }
}
