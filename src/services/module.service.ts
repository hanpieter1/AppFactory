// Service layer for Module and ModuleRole business logic
import { ModuleRepository } from '../repositories/module.repository';
import { ModuleRoleRepository } from '../repositories/module-role.repository';
import { RoleRepository } from '../repositories/role.repository';
import {
  Module,
  ModuleRole,
  CreateModuleDto,
  UpdateModuleDto,
  CreateModuleRoleDto,
  UpdateModuleRoleDto,
} from '../models/module.model';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';

export class ModuleService {
  constructor(
    private readonly moduleRepository: ModuleRepository,
    private readonly moduleRoleRepository: ModuleRoleRepository,
    private readonly roleRepository: RoleRepository
  ) {}

  // === Module CRUD ===

  async createModule(dto: CreateModuleDto): Promise<Module> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Module name is required');
    }

    const existing = await this.moduleRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictError(`Module with name '${dto.name}' already exists`);
    }

    return this.moduleRepository.create(dto);
  }

  async getAllModules(): Promise<Module[]> {
    return this.moduleRepository.findAll();
  }

  async getModuleById(id: string): Promise<Module> {
    const module = await this.moduleRepository.findById(id);
    if (!module) {
      throw new NotFoundError(`Module with id '${id}' not found`);
    }
    return module;
  }

  async updateModule(id: string, dto: UpdateModuleDto): Promise<Module> {
    const existing = await this.moduleRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Module with id '${id}' not found`);
    }

    if (dto.name !== undefined) {
      if (dto.name.trim().length === 0) {
        throw new ValidationError('Module name cannot be empty');
      }

      const nameConflict = await this.moduleRepository.findByName(dto.name);
      if (nameConflict && nameConflict.id !== id) {
        throw new ConflictError(`Module with name '${dto.name}' already exists`);
      }
    }

    const updated = await this.moduleRepository.update(id, dto);
    return updated!;
  }

  async deleteModule(id: string): Promise<void> {
    const existing = await this.moduleRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Module with id '${id}' not found`);
    }

    const hasRoles = await this.moduleRepository.hasModuleRoles(id);
    if (hasRoles) {
      throw new ConflictError(`Module '${existing.name}' has module roles and cannot be deleted`);
    }

    await this.moduleRepository.delete(id);
  }

  // === ModuleRole CRUD ===

  async createModuleRole(moduleId: string, dto: CreateModuleRoleDto): Promise<ModuleRole> {
    const module = await this.moduleRepository.findById(moduleId);
    if (!module) {
      throw new NotFoundError(`Module with id '${moduleId}' not found`);
    }

    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Module role name is required');
    }

    const existing = await this.moduleRoleRepository.findByNameInModule(moduleId, dto.name);
    if (existing) {
      throw new ConflictError(
        `Module role with name '${dto.name}' already exists in module '${module.name}'`
      );
    }

    return this.moduleRoleRepository.create(moduleId, dto);
  }

  async getModuleRolesByModule(moduleId: string): Promise<ModuleRole[]> {
    const module = await this.moduleRepository.findById(moduleId);
    if (!module) {
      throw new NotFoundError(`Module with id '${moduleId}' not found`);
    }

    return this.moduleRoleRepository.findByModuleId(moduleId);
  }

  async getModuleRoleById(moduleId: string, id: string): Promise<ModuleRole> {
    const module = await this.moduleRepository.findById(moduleId);
    if (!module) {
      throw new NotFoundError(`Module with id '${moduleId}' not found`);
    }

    const role = await this.moduleRoleRepository.findById(id);
    if (!role || role.moduleId !== moduleId) {
      throw new NotFoundError(`Module role with id '${id}' not found in module '${moduleId}'`);
    }

    return role;
  }

  async updateModuleRole(
    moduleId: string,
    id: string,
    dto: UpdateModuleRoleDto
  ): Promise<ModuleRole> {
    const module = await this.moduleRepository.findById(moduleId);
    if (!module) {
      throw new NotFoundError(`Module with id '${moduleId}' not found`);
    }

    const existing = await this.moduleRoleRepository.findById(id);
    if (!existing || existing.moduleId !== moduleId) {
      throw new NotFoundError(`Module role with id '${id}' not found in module '${moduleId}'`);
    }

    if (dto.name !== undefined) {
      if (dto.name.trim().length === 0) {
        throw new ValidationError('Module role name cannot be empty');
      }

      const nameConflict = await this.moduleRoleRepository.findByNameInModule(moduleId, dto.name);
      if (nameConflict && nameConflict.id !== id) {
        throw new ConflictError(
          `Module role with name '${dto.name}' already exists in module '${module.name}'`
        );
      }
    }

    const updated = await this.moduleRoleRepository.update(id, dto);
    return updated!;
  }

  async deleteModuleRole(moduleId: string, id: string): Promise<void> {
    const module = await this.moduleRepository.findById(moduleId);
    if (!module) {
      throw new NotFoundError(`Module with id '${moduleId}' not found`);
    }

    const existing = await this.moduleRoleRepository.findById(id);
    if (!existing || existing.moduleId !== moduleId) {
      throw new NotFoundError(`Module role with id '${id}' not found in module '${moduleId}'`);
    }

    const isMapped = await this.moduleRoleRepository.isModuleRoleMapped(id);
    if (isMapped) {
      throw new ConflictError(
        `Module role '${existing.name}' is mapped to user roles and cannot be deleted`
      );
    }

    await this.moduleRoleRepository.delete(id);
  }

  // === UserRole ↔ ModuleRole mapping ===

  async mapModuleRoleToUserRole(roleId: string, moduleRoleId: string): Promise<ModuleRole[]> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundError(`User role with id '${roleId}' not found`);
    }

    const moduleRole = await this.moduleRoleRepository.findById(moduleRoleId);
    if (!moduleRole) {
      throw new NotFoundError(`Module role with id '${moduleRoleId}' not found`);
    }

    const exists = await this.moduleRoleRepository.isMappingExists(roleId, moduleRoleId);
    if (exists) {
      throw new ConflictError('Module role is already mapped to this user role');
    }

    await this.moduleRoleRepository.addModuleRoleToUserRole(roleId, moduleRoleId);
    return this.moduleRoleRepository.getModuleRolesForUserRole(roleId);
  }

  async getModuleRolesForUserRole(roleId: string): Promise<ModuleRole[]> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundError(`User role with id '${roleId}' not found`);
    }

    return this.moduleRoleRepository.getModuleRolesForUserRole(roleId);
  }

  async unmapModuleRoleFromUserRole(roleId: string, moduleRoleId: string): Promise<void> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundError(`User role with id '${roleId}' not found`);
    }

    const removed = await this.moduleRoleRepository.removeModuleRoleFromUserRole(
      roleId,
      moduleRoleId
    );
    if (!removed) {
      throw new NotFoundError('Module role mapping not found');
    }
  }
}
