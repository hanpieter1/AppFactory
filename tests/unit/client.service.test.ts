// Unit tests for ClientService
// US-076: Clients database model & API
import { ClientService } from '../../src/services/client.service';
import { ClientRepository } from '../../src/repositories/client.repository';
import { NotFoundError, ConflictError, ValidationError } from '../../src/utils/errors';
import { Client } from '../../src/models/client.model';

// Mock the database module so repository import doesn't fail
jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

describe('ClientService', () => {
  let service: ClientService;
  let mockRepo: jest.Mocked<ClientRepository>;

  const now = new Date('2026-01-01T00:00:00Z');

  const acmeClient: Client = {
    id: 'client-1',
    name: 'Acme Corporation',
    code: 'ACME',
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  const techClient: Client = {
    id: 'client-2',
    name: 'Tech Solutions',
    code: 'TECH',
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    mockRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<ClientRepository>;

    service = new ClientService(mockRepo);
  });

  describe('createClient', () => {
    it('should create a client when code is unique', async () => {
      mockRepo.findByCode.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(acmeClient);

      const result = await service.createClient({
        name: 'Acme Corporation',
        code: 'ACME',
        active: true,
      });

      expect(result).toEqual(acmeClient);
      expect(mockRepo.findByCode).toHaveBeenCalledWith('ACME');
      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'Acme Corporation',
        code: 'ACME',
        active: true,
      });
    });

    it('should throw ConflictError when code already exists', async () => {
      mockRepo.findByCode.mockResolvedValue(acmeClient);

      await expect(service.createClient({ name: 'Duplicate', code: 'ACME' })).rejects.toThrow(
        ConflictError
      );
    });

    it('should throw ValidationError when name is empty', async () => {
      await expect(service.createClient({ name: '', code: 'TEST' })).rejects.toThrow(
        ValidationError
      );

      await expect(service.createClient({ name: '   ', code: 'TEST' })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError when name exceeds 255 characters', async () => {
      await expect(service.createClient({ name: 'A'.repeat(256), code: 'TEST' })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError when code is empty', async () => {
      await expect(service.createClient({ name: 'Test Client', code: '' })).rejects.toThrow(
        ValidationError
      );

      await expect(service.createClient({ name: 'Test Client', code: '   ' })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError when code exceeds 50 characters', async () => {
      await expect(
        service.createClient({ name: 'Test Client', code: 'A'.repeat(51) })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getAllClients', () => {
    it('should return all clients', async () => {
      mockRepo.findAll.mockResolvedValue([acmeClient, techClient]);

      const result = await service.getAllClients();

      expect(result).toHaveLength(2);
      expect(mockRepo.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should pass filters to repository', async () => {
      mockRepo.findAll.mockResolvedValue([acmeClient]);

      await service.getAllClients({ active: true, search: 'acme' });

      expect(mockRepo.findAll).toHaveBeenCalledWith({ active: true, search: 'acme' });
    });

    it('should return empty array when no clients exist', async () => {
      mockRepo.findAll.mockResolvedValue([]);

      const result = await service.getAllClients();

      expect(result).toHaveLength(0);
    });
  });

  describe('getClientById', () => {
    it('should return client when found', async () => {
      mockRepo.findById.mockResolvedValue(acmeClient);

      const result = await service.getClientById('client-1');

      expect(result).toEqual(acmeClient);
    });

    it('should throw NotFoundError when client does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getClientById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateClient', () => {
    it('should update client name', async () => {
      mockRepo.findById.mockResolvedValue(acmeClient);
      mockRepo.update.mockResolvedValue({ ...acmeClient, name: 'Acme Inc' });

      const result = await service.updateClient('client-1', { name: 'Acme Inc' });

      expect(result.name).toBe('Acme Inc');
    });

    it('should update client code when no conflict', async () => {
      mockRepo.findById.mockResolvedValue(acmeClient);
      mockRepo.findByCode.mockResolvedValue(null);
      mockRepo.update.mockResolvedValue({ ...acmeClient, code: 'ACME2' });

      const result = await service.updateClient('client-1', { code: 'ACME2' });

      expect(result.code).toBe('ACME2');
      expect(mockRepo.findByCode).toHaveBeenCalledWith('ACME2');
    });

    it('should update client active status', async () => {
      mockRepo.findById.mockResolvedValue(acmeClient);
      mockRepo.update.mockResolvedValue({ ...acmeClient, active: false });

      const result = await service.updateClient('client-1', { active: false });

      expect(result.active).toBe(false);
    });

    it('should throw NotFoundError when client does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.updateClient('nonexistent', { name: 'New' })).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ValidationError when name is empty', async () => {
      mockRepo.findById.mockResolvedValue(acmeClient);

      await expect(service.updateClient('client-1', { name: '' })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when name exceeds 255 characters', async () => {
      mockRepo.findById.mockResolvedValue(acmeClient);

      await expect(service.updateClient('client-1', { name: 'A'.repeat(256) })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError when code is empty', async () => {
      mockRepo.findById.mockResolvedValue(acmeClient);

      await expect(service.updateClient('client-1', { code: '' })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when code exceeds 50 characters', async () => {
      mockRepo.findById.mockResolvedValue(acmeClient);

      await expect(service.updateClient('client-1', { code: 'A'.repeat(51) })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ConflictError when updating to existing code', async () => {
      mockRepo.findById.mockResolvedValue(acmeClient);
      mockRepo.findByCode.mockResolvedValue(techClient);

      await expect(service.updateClient('client-1', { code: 'TECH' })).rejects.toThrow(
        ConflictError
      );
    });

    it('should allow updating code to same code with different case', async () => {
      mockRepo.findById.mockResolvedValue(acmeClient);
      mockRepo.update.mockResolvedValue({ ...acmeClient, code: 'acme' });

      const result = await service.updateClient('client-1', { code: 'acme' });

      expect(result.code).toBe('acme');
      expect(mockRepo.findByCode).not.toHaveBeenCalled();
    });
  });

  describe('deleteClient', () => {
    it('should delete an existing client', async () => {
      mockRepo.findById.mockResolvedValue(acmeClient);
      mockRepo.delete.mockResolvedValue(true);

      await service.deleteClient('client-1');

      expect(mockRepo.delete).toHaveBeenCalledWith('client-1');
    });

    it('should throw NotFoundError when client does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.deleteClient('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw Error when delete operation fails', async () => {
      mockRepo.findById.mockResolvedValue(acmeClient);
      mockRepo.delete.mockResolvedValue(false);

      await expect(service.deleteClient('client-1')).rejects.toThrow('Failed to delete client');
    });
  });
});
