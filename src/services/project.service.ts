// Service layer for Project business logic
import { ProjectRepository } from '../repositories/project.repository';
import { DepartmentRepository } from '../repositories/department.repository';
import { TeamRepository } from '../repositories/team.repository';
import {
  Project,
  ProjectWithDetails,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectFilters,
  PROJECT_STATUSES,
  PROJECT_DOMAINS,
  PROJECT_PROCESSES,
  PROJECT_APP_SIZES,
  PROJECT_COMPLEXITIES,
  PROJECT_ALERT_LEVELS,
  PROJECT_GOVERNANCE_STATUSES,
} from '../models/project.model';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';

export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly teamRepository: TeamRepository
  ) {}

  async createProject(dto: CreateProjectDto): Promise<Project> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Project name is required');
    }
    if (dto.name.length > 255) {
      throw new ValidationError('Project name must be at most 255 characters');
    }

    const existing = await this.projectRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictError(`Project with name '${dto.name}' already exists`);
    }

    if (dto.departmentId) {
      const dept = await this.departmentRepository.findById(dto.departmentId);
      if (!dept) {
        throw new NotFoundError(`Department with id '${dto.departmentId}' not found`);
      }
    }

    if (dto.teamId) {
      const team = await this.teamRepository.findById(dto.teamId);
      if (!team) {
        throw new NotFoundError(`Team with id '${dto.teamId}' not found`);
      }
    }

    if (dto.masterProjectId) {
      const master = await this.projectRepository.findById(dto.masterProjectId);
      if (!master) {
        throw new NotFoundError(`Master project with id '${dto.masterProjectId}' not found`);
      }
    }

    this.validateEnums(dto);
    this.validateDates(dto.startDate, dto.goLiveDate);

    return this.projectRepository.create(dto);
  }

  async getAllProjects(filters?: ProjectFilters): Promise<ProjectWithDetails[]> {
    return this.projectRepository.findAll(filters);
  }

  async getProjectById(id: string): Promise<Project> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundError(`Project with id '${id}' not found`);
    }
    return project;
  }

  async updateProject(id: string, dto: UpdateProjectDto): Promise<Project> {
    const existing = await this.projectRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Project with id '${id}' not found`);
    }

    if (dto.name !== undefined) {
      if (dto.name.trim().length === 0) {
        throw new ValidationError('Project name cannot be empty');
      }
      if (dto.name.length > 255) {
        throw new ValidationError('Project name must be at most 255 characters');
      }
      if (dto.name.toLowerCase() !== existing.name.toLowerCase()) {
        const nameExists = await this.projectRepository.findByName(dto.name);
        if (nameExists && nameExists.id !== id) {
          throw new ConflictError(`Project with name '${dto.name}' already exists`);
        }
      }
    }

    if ('departmentId' in dto && dto.departmentId) {
      const dept = await this.departmentRepository.findById(dto.departmentId);
      if (!dept) {
        throw new NotFoundError(`Department with id '${dto.departmentId}' not found`);
      }
    }

    if ('teamId' in dto && dto.teamId) {
      const team = await this.teamRepository.findById(dto.teamId);
      if (!team) {
        throw new NotFoundError(`Team with id '${dto.teamId}' not found`);
      }
    }

    if ('masterProjectId' in dto && dto.masterProjectId) {
      if (dto.masterProjectId === id) {
        throw new ValidationError('Project cannot be its own master project');
      }
      const master = await this.projectRepository.findById(dto.masterProjectId);
      if (!master) {
        throw new NotFoundError(`Master project with id '${dto.masterProjectId}' not found`);
      }
    }

    this.validateEnums(dto);

    const startDate = 'startDate' in dto ? dto.startDate : existing.startDate;
    const goLiveDate = 'goLiveDate' in dto ? dto.goLiveDate : existing.goLiveDate;
    this.validateDates(startDate ?? undefined, goLiveDate ?? undefined);

    const updated = await this.projectRepository.update(id, dto);
    return updated!;
  }

  async deleteProject(id: string): Promise<void> {
    const existing = await this.projectRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Project with id '${id}' not found`);
    }

    const hasChildren = await this.projectRepository.hasChildProjects(id);
    if (hasChildren) {
      throw new ConflictError('Cannot delete project that is referenced as a master project');
    }

    await this.projectRepository.delete(id);
  }

  getProjectEnums(): Record<string, string[]> {
    return {
      statuses: PROJECT_STATUSES,
      domains: PROJECT_DOMAINS,
      processes: PROJECT_PROCESSES,
      appSizes: PROJECT_APP_SIZES,
      complexities: PROJECT_COMPLEXITIES,
      alertLevels: PROJECT_ALERT_LEVELS,
      governanceStatuses: PROJECT_GOVERNANCE_STATUSES,
    };
  }

  private validateEnums(dto: CreateProjectDto | UpdateProjectDto): void {
    if (dto.status && !PROJECT_STATUSES.includes(dto.status)) {
      throw new ValidationError(`Invalid status: ${dto.status}`);
    }
    if (dto.domain && !PROJECT_DOMAINS.includes(dto.domain)) {
      throw new ValidationError(`Invalid domain: ${dto.domain}`);
    }
    if (dto.process && !PROJECT_PROCESSES.includes(dto.process)) {
      throw new ValidationError(`Invalid process: ${dto.process}`);
    }
    if (dto.appSize && !PROJECT_APP_SIZES.includes(dto.appSize)) {
      throw new ValidationError(`Invalid app size: ${dto.appSize}`);
    }
    if (dto.complexity && !PROJECT_COMPLEXITIES.includes(dto.complexity)) {
      throw new ValidationError(`Invalid complexity: ${dto.complexity}`);
    }
    if (dto.alertLevel && !PROJECT_ALERT_LEVELS.includes(dto.alertLevel)) {
      throw new ValidationError(`Invalid alert level: ${dto.alertLevel}`);
    }
    if (dto.governanceStatus && !PROJECT_GOVERNANCE_STATUSES.includes(dto.governanceStatus)) {
      throw new ValidationError(`Invalid governance status: ${dto.governanceStatus}`);
    }
  }

  private validateDates(startDate?: string, goLiveDate?: string): void {
    if (startDate && goLiveDate && startDate > goLiveDate) {
      throw new ValidationError('Start date cannot be after go-live date');
    }
  }
}
