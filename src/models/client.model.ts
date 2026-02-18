// Client model and DTOs
// US-076: Clients database model & API

export interface Client {
  id: string;
  name: string;
  code: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientDto {
  name: string;
  code: string;
  active?: boolean;
}

export interface UpdateClientDto {
  name?: string;
  code?: string;
  active?: boolean;
}

export interface ClientFilters {
  active?: boolean;
  search?: string;
}
