// Service layer for Client business logic
import { ClientRepository } from '../repositories/client.repository';
import { Client, CreateClientDto, UpdateClientDto, ClientFilters } from '../models/client.model';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';

export class ClientService {
  constructor(private readonly repository: ClientRepository) {}

  async createClient(dto: CreateClientDto): Promise<Client> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Client name is required');
    }
    if (dto.name.length > 255) {
      throw new ValidationError('Client name must be at most 255 characters');
    }
    if (!dto.code || dto.code.trim().length === 0) {
      throw new ValidationError('Client code is required');
    }
    if (dto.code.length > 50) {
      throw new ValidationError('Client code must be at most 50 characters');
    }

    const existing = await this.repository.findByCode(dto.code);
    if (existing) {
      throw new ConflictError(`Client with code '${dto.code}' already exists`);
    }

    return this.repository.create(dto);
  }

  async getAllClients(filters?: ClientFilters): Promise<Client[]> {
    return this.repository.findAll(filters);
  }

  async getClientById(id: string): Promise<Client> {
    const client = await this.repository.findById(id);
    if (!client) {
      throw new NotFoundError(`Client with id '${id}' not found`);
    }
    return client;
  }

  async updateClient(id: string, dto: UpdateClientDto): Promise<Client> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Client with id '${id}' not found`);
    }

    if (dto.name !== undefined) {
      if (dto.name.trim().length === 0) {
        throw new ValidationError('Client name cannot be empty');
      }
      if (dto.name.length > 255) {
        throw new ValidationError('Client name must be at most 255 characters');
      }
    }

    if (dto.code !== undefined) {
      if (dto.code.trim().length === 0) {
        throw new ValidationError('Client code cannot be empty');
      }
      if (dto.code.length > 50) {
        throw new ValidationError('Client code must be at most 50 characters');
      }
      // Check for code conflict if changing code
      if (dto.code.toLowerCase() !== existing.code.toLowerCase()) {
        const codeExists = await this.repository.findByCode(dto.code);
        if (codeExists) {
          throw new ConflictError(`Client with code '${dto.code}' already exists`);
        }
      }
    }

    const updated = await this.repository.update(id, dto);
    return updated!;
  }

  async deleteClient(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Client with id '${id}' not found`);
    }

    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new Error('Failed to delete client');
    }
  }
}
