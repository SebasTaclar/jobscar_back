import { Logger } from '../../shared/Logger';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/exceptions';
import { IClientDataSource } from '../../domain/interfaces/IClientDataSource';
import { Client } from '../../domain/entities/Client';

export interface CreateClientRequest {
  name: string;
  phone: string;
  email: string;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateClientRequest {
  name?: string;
  phone?: string;
  email?: string;
  notes?: string | null;
  isActive?: boolean;
}

export class ClientService {
  private logger: Logger;
  private clientDataSource: IClientDataSource;

  constructor(logger: Logger, clientDataSource: IClientDataSource) {
    this.logger = logger;
    this.clientDataSource = clientDataSource;
  }

  async getAllClients(query?: unknown): Promise<Client[]> {
    this.logger.logInfo('Getting all clients');

    try {
      const clients = await this.clientDataSource.getAll(query);
      this.logger.logInfo(`Retrieved ${clients.length} clients`);
      return clients;
    } catch (error) {
      this.logger.logError('Error getting clients', error);
      throw error;
    }
  }

  async getClientById(id: string): Promise<Client> {
    this.logger.logInfo(`Getting client by id: ${id}`);

    if (!id) {
      throw new ValidationError('Client ID is required');
    }

    const clientId = parseInt(id, 10);
    if (Number.isNaN(clientId)) {
      throw new ValidationError('Client ID must be a valid number');
    }

    try {
      const client = await this.clientDataSource.getById(clientId);

      if (!client) {
        this.logger.logWarning(`Client not found with id: ${id}`);
        throw new NotFoundError('Client not found');
      }

      this.logger.logInfo(`Retrieved client: ${client.name}`);
      return client;
    } catch (error) {
      this.logger.logError(`Error getting client by id: ${id}`, error);
      throw error;
    }
  }

  async createClient(createRequest: CreateClientRequest): Promise<Client> {
    this.logger.logInfo(`Creating client: ${createRequest?.name || 'unknown'}`);

    const normalizedClient = this.normalizeCreateRequest(createRequest);

    if (!normalizedClient.name || !normalizedClient.phone || !normalizedClient.email) {
      throw new ValidationError('Name, phone, and email are required');
    }

    if (!this.isValidEmail(normalizedClient.email)) {
      throw new ValidationError('Email must be a valid email address');
    }

    try {
      const existingClient = await this.clientDataSource.getByEmail(normalizedClient.email);
      if (existingClient) {
        this.logger.logWarning(
          `Client creation failed: email '${normalizedClient.email}' already exists`
        );
        throw new ConflictError('Client with this email already exists');
      }

      const clientData: Client = {
        id: 0,
        name: normalizedClient.name,
        phone: normalizedClient.phone,
        email: normalizedClient.email,
        notes: normalizedClient.notes,
        isActive: normalizedClient.isActive ?? true,
      };

      const newClient = await this.clientDataSource.create(clientData);
      this.logger.logInfo(`Client created successfully: ${newClient.name} (ID: ${newClient.id})`);

      return newClient;
    } catch (error) {
      this.logger.logError(`Error creating client: ${normalizedClient.email}`, error);
      throw error;
    }
  }

  async updateClient(id: string, updateRequest: UpdateClientRequest): Promise<Client> {
    this.logger.logInfo(`Updating client with id: ${id}`);

    if (!id) {
      throw new ValidationError('Client ID is required');
    }

    const clientId = parseInt(id, 10);
    if (Number.isNaN(clientId)) {
      throw new ValidationError('Client ID must be a valid number');
    }

    const normalizedUpdateRequest = this.normalizeUpdateRequest(updateRequest);

    if (Object.keys(normalizedUpdateRequest).length === 0) {
      throw new ValidationError('At least one field must be provided for update');
    }

    if (
      normalizedUpdateRequest.email !== undefined &&
      !this.isValidEmail(normalizedUpdateRequest.email)
    ) {
      throw new ValidationError('Email must be a valid email address');
    }

    try {
      const existingClient = await this.clientDataSource.getById(clientId);
      if (!existingClient) {
        this.logger.logWarning(`Client update failed: client not found with id ${id}`);
        throw new NotFoundError('Client not found');
      }

      if (normalizedUpdateRequest.email && normalizedUpdateRequest.email !== existingClient.email) {
        const clientWithSameEmail = await this.clientDataSource.getByEmail(
          normalizedUpdateRequest.email
        );
        if (clientWithSameEmail && clientWithSameEmail.id !== clientId) {
          this.logger.logWarning(
            `Client update failed: email '${normalizedUpdateRequest.email}' already exists`
          );
          throw new ConflictError('Client with this email already exists');
        }
      }

      const updatedClient = await this.clientDataSource.update(clientId, normalizedUpdateRequest);

      if (!updatedClient) {
        this.logger.logError(`Client update failed: client not found with id ${id}`);
        throw new NotFoundError('Client not found');
      }

      this.logger.logInfo(`Client updated successfully: ${updatedClient.name} (ID: ${id})`);
      return updatedClient;
    } catch (error) {
      this.logger.logError(`Error updating client with id: ${id}`, error);
      throw error;
    }
  }

  async deleteClient(id: string): Promise<boolean> {
    this.logger.logInfo(`Deleting client with id: ${id}`);

    if (!id) {
      throw new ValidationError('Client ID is required');
    }

    const clientId = parseInt(id, 10);
    if (Number.isNaN(clientId)) {
      throw new ValidationError('Client ID must be a valid number');
    }

    try {
      const deleted = await this.clientDataSource.delete(clientId);

      if (!deleted) {
        this.logger.logWarning(`Client deletion failed: client not found with id ${id}`);
        throw new NotFoundError('Client not found');
      }

      this.logger.logInfo(`Client deleted successfully with id: ${id}`);
      return true;
    } catch (error) {
      this.logger.logError(`Error deleting client with id: ${id}`, error);
      throw error;
    }
  }

  private normalizeCreateRequest(createRequest: CreateClientRequest): CreateClientRequest {
    return {
      name: typeof createRequest?.name === 'string' ? createRequest.name.trim() : '',
      phone: typeof createRequest?.phone === 'string' ? createRequest.phone.trim() : '',
      email:
        typeof createRequest?.email === 'string' ? createRequest.email.trim().toLowerCase() : '',
      notes:
        typeof createRequest?.notes === 'string'
          ? createRequest.notes.trim() || undefined
          : createRequest?.notes,
      isActive: createRequest?.isActive,
    };
  }

  private normalizeUpdateRequest(updateRequest: UpdateClientRequest): UpdateClientRequest {
    const normalizedRequest: UpdateClientRequest = {};

    if (typeof updateRequest?.name === 'string') {
      normalizedRequest.name = updateRequest.name.trim();
    }

    if (typeof updateRequest?.phone === 'string') {
      normalizedRequest.phone = updateRequest.phone.trim();
    }

    if (typeof updateRequest?.email === 'string') {
      normalizedRequest.email = updateRequest.email.trim().toLowerCase();
    }

    if (updateRequest?.notes !== undefined) {
      normalizedRequest.notes =
        typeof updateRequest.notes === 'string'
          ? updateRequest.notes.trim() || null
          : updateRequest.notes;
    }

    if (updateRequest?.isActive !== undefined) {
      normalizedRequest.isActive = updateRequest.isActive;
    }

    return normalizedRequest;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
