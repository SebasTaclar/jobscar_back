import { Logger } from '../../shared/Logger';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/exceptions';
import { IVehicleDataSource } from '../../domain/interfaces/IVehicleDataSource';
import { IClientDataSource } from '../../domain/interfaces/IClientDataSource';
import { Vehicle } from '../../domain/entities/Vehicle';

export interface CreateVehicleRequest {
  clientId?: number;
  plate: string;
  brand?: string;
  model?: string;
  year?: number;
  km?: number;
  vehicleType?: string;
  registrationDate?: string;
  lastServiceDate?: string;
  nextServiceKm?: number;
  observations?: string;
}

export interface UpdateVehicleRequest {
  clientId?: number | null;
  plate?: string;
  brand?: string;
  model?: string;
  year?: number | null;
  km?: number | null;
  vehicleType?: string;
  registrationDate?: string;
  lastServiceDate?: string | null;
  nextServiceKm?: number | null;
  observations?: string | null;
}

export class VehicleService {
  private logger: Logger;
  private vehicleDataSource: IVehicleDataSource;
  private clientDataSource: IClientDataSource;

  constructor(
    logger: Logger,
    vehicleDataSource: IVehicleDataSource,
    clientDataSource: IClientDataSource
  ) {
    this.logger = logger;
    this.vehicleDataSource = vehicleDataSource;
    this.clientDataSource = clientDataSource;
  }

  async getAllVehicles(query?: unknown): Promise<Vehicle[]> {
    this.logger.logInfo('Getting all vehicles');

    try {
      const vehicles = await this.vehicleDataSource.getAll(query);
      this.logger.logInfo(`Retrieved ${vehicles.length} vehicles`);
      return vehicles;
    } catch (error) {
      this.logger.logError('Error getting vehicles', error);
      throw error;
    }
  }

  async getVehicleById(id: string): Promise<Vehicle> {
    this.logger.logInfo(`Getting vehicle by id: ${id}`);

    if (!id) {
      throw new ValidationError('Vehicle ID is required');
    }

    const vehicleId = parseInt(id, 10);
    if (Number.isNaN(vehicleId)) {
      throw new ValidationError('Vehicle ID must be a valid number');
    }

    try {
      const vehicle = await this.vehicleDataSource.getById(vehicleId);

      if (!vehicle) {
        this.logger.logWarning(`Vehicle not found with id: ${id}`);
        throw new NotFoundError('Vehicle not found');
      }

      this.logger.logInfo(`Retrieved vehicle: ${vehicle.plate}`);
      return vehicle;
    } catch (error) {
      this.logger.logError(`Error getting vehicle by id: ${id}`, error);
      throw error;
    }
  }

  async createVehicle(createRequest: CreateVehicleRequest): Promise<Vehicle> {
    this.logger.logInfo(`Creating vehicle: ${createRequest?.plate || 'unknown'}`);

    const normalizedVehicle = this.normalizeCreateRequest(createRequest);

    if (!normalizedVehicle.plate) {
      throw new ValidationError('Plate is required');
    }

    // Validate that client exists if clientId is provided
    let clientName = 'Unknown Client';
    if (normalizedVehicle.clientId) {
      try {
        const client = await this.clientDataSource.getById(normalizedVehicle.clientId);
        if (!client) {
          throw new NotFoundError(
            `Client with ID ${normalizedVehicle.clientId} does not exist. Please verify the client ID`
          );
        }
        clientName = client.name || `Client #${normalizedVehicle.clientId}`;
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw error;
        }
        this.logger.logError(
          `Error validating client with id: ${normalizedVehicle.clientId}`,
          error
        );
        throw error;
      }
    }

    try {
      const vehicleData: Vehicle = this.buildVehiclePayload(normalizedVehicle, clientName);

      const newVehicle = await this.vehicleDataSource.create(vehicleData);
      this.logger.logInfo(
        `Vehicle created successfully: ${newVehicle.plate} (ID: ${newVehicle.id})`
      );

      return newVehicle;
    } catch (error) {
      this.logger.logError(`Error creating vehicle: ${normalizedVehicle.plate}`, error);
      throw error;
    }
  }

  async updateVehicle(id: string, updateRequest: UpdateVehicleRequest): Promise<Vehicle> {
    this.logger.logInfo(`Updating vehicle with id: ${id}`);

    if (!id) {
      throw new ValidationError('Vehicle ID is required');
    }

    const vehicleId = parseInt(id, 10);
    if (Number.isNaN(vehicleId)) {
      throw new ValidationError('Vehicle ID must be a valid number');
    }

    const normalizedUpdateRequest = this.normalizeUpdateRequest(updateRequest);

    if (Object.keys(normalizedUpdateRequest).length === 0) {
      throw new ValidationError('At least one field must be provided for update');
    }

    try {
      const existingVehicle = await this.vehicleDataSource.getById(vehicleId);
      if (!existingVehicle) {
        this.logger.logWarning(`Vehicle update failed: vehicle not found with id ${id}`);
        throw new NotFoundError('Vehicle not found');
      }

      if (
        normalizedUpdateRequest.plate &&
        normalizedUpdateRequest.plate !== existingVehicle.plate
      ) {
        const vehicles = await this.vehicleDataSource.getAll({
          plate: normalizedUpdateRequest.plate,
        });
        const conflict = vehicles.find((vehicle) => vehicle.id !== vehicleId);
        if (conflict) {
          throw new ConflictError('Vehicle with this plate already exists');
        }
      }

      // Validate that client exists if clientId is being updated
      if (
        normalizedUpdateRequest.clientId !== undefined &&
        normalizedUpdateRequest.clientId !== null
      ) {
        try {
          const client = await this.clientDataSource.getById(normalizedUpdateRequest.clientId);
          if (!client) {
            throw new NotFoundError(
              `Client with ID ${normalizedUpdateRequest.clientId} does not exist. Please verify the client ID`
            );
          }
        } catch (error) {
          if (error instanceof NotFoundError) {
            throw error;
          }
          this.logger.logError(
            `Error validating client with id: ${normalizedUpdateRequest.clientId}`,
            error
          );
          throw error;
        }
      }

      const updatedVehicle = await this.vehicleDataSource.update(
        vehicleId,
        this.buildVehicleUpdatePayload(normalizedUpdateRequest)
      );

      if (!updatedVehicle) {
        this.logger.logError(`Vehicle update failed: vehicle not found with id ${id}`);
        throw new NotFoundError('Vehicle not found');
      }

      this.logger.logInfo(`Vehicle updated successfully: ${updatedVehicle.plate} (ID: ${id})`);
      return updatedVehicle;
    } catch (error) {
      this.logger.logError(`Error updating vehicle with id: ${id}`, error);
      throw error;
    }
  }

  async deleteVehicle(id: string): Promise<boolean> {
    this.logger.logInfo(`Deleting vehicle with id: ${id}`);

    if (!id) {
      throw new ValidationError('Vehicle ID is required');
    }

    const vehicleId = parseInt(id, 10);
    if (Number.isNaN(vehicleId)) {
      throw new ValidationError('Vehicle ID must be a valid number');
    }

    try {
      const deleted = await this.vehicleDataSource.delete(vehicleId);

      if (!deleted) {
        this.logger.logWarning(`Vehicle deletion failed: vehicle not found with id ${id}`);
        throw new NotFoundError('Vehicle not found');
      }

      this.logger.logInfo(`Vehicle deleted successfully with id: ${id}`);
      return true;
    } catch (error) {
      this.logger.logError(`Error deleting vehicle with id: ${id}`, error);
      throw error;
    }
  }

  private normalizeCreateRequest(createRequest: CreateVehicleRequest): CreateVehicleRequest {
    return {
      clientId:
        typeof createRequest?.clientId === 'number' && Number.isFinite(createRequest.clientId)
          ? createRequest.clientId
          : undefined,
      plate:
        typeof createRequest?.plate === 'string' ? createRequest.plate.trim().toUpperCase() : '',
      brand: typeof createRequest?.brand === 'string' ? createRequest.brand.trim() : '',
      model: typeof createRequest?.model === 'string' ? createRequest.model.trim() : '',
      year:
        typeof createRequest?.year === 'number' && Number.isFinite(createRequest.year)
          ? createRequest.year
          : undefined,
      km: this.normalizeRequiredNumber(createRequest?.km),
      vehicleType:
        typeof createRequest?.vehicleType === 'string' ? createRequest.vehicleType.trim() : '',
      registrationDate:
        typeof createRequest?.registrationDate === 'string'
          ? createRequest.registrationDate.trim()
          : undefined,
      lastServiceDate:
        typeof createRequest?.lastServiceDate === 'string'
          ? createRequest.lastServiceDate.trim() || undefined
          : undefined,
      nextServiceKm:
        typeof createRequest?.nextServiceKm === 'number' &&
        Number.isFinite(createRequest.nextServiceKm)
          ? createRequest.nextServiceKm
          : undefined,
      observations:
        typeof createRequest?.observations === 'string'
          ? createRequest.observations.trim() || undefined
          : undefined,
    };
  }

  private normalizeUpdateRequest(updateRequest: UpdateVehicleRequest): UpdateVehicleRequest {
    const normalizedRequest: UpdateVehicleRequest = {};

    if (typeof updateRequest?.clientId === 'number' && Number.isFinite(updateRequest.clientId)) {
      normalizedRequest.clientId = updateRequest.clientId;
    } else if (updateRequest?.clientId === null) {
      normalizedRequest.clientId = null;
    }

    if (typeof updateRequest?.brand === 'string') {
      normalizedRequest.brand = updateRequest.brand.trim();
    }

    if (typeof updateRequest?.model === 'string') {
      normalizedRequest.model = updateRequest.model.trim();
    }

    if (typeof updateRequest?.year === 'number' && Number.isFinite(updateRequest.year)) {
      normalizedRequest.year = updateRequest.year;
    } else if (updateRequest?.year === null) {
      normalizedRequest.year = null;
    }

    if (updateRequest?.km !== undefined) {
      normalizedRequest.km =
        updateRequest.km === null ? null : this.normalizeOptionalNumber(updateRequest.km);
    }

    if (typeof updateRequest?.vehicleType === 'string') {
      normalizedRequest.vehicleType = updateRequest.vehicleType.trim();
    }

    if (updateRequest?.registrationDate !== undefined) {
      normalizedRequest.registrationDate =
        typeof updateRequest.registrationDate === 'string'
          ? updateRequest.registrationDate.trim() || undefined
          : updateRequest.registrationDate;
    }

    if (updateRequest?.lastServiceDate !== undefined) {
      normalizedRequest.lastServiceDate =
        typeof updateRequest.lastServiceDate === 'string'
          ? updateRequest.lastServiceDate.trim() || null
          : updateRequest.lastServiceDate;
    }

    if (updateRequest?.nextServiceKm !== undefined) {
      normalizedRequest.nextServiceKm = this.normalizeNullableNumber(updateRequest.nextServiceKm);
    }

    if (updateRequest?.observations !== undefined) {
      normalizedRequest.observations =
        typeof updateRequest.observations === 'string'
          ? updateRequest.observations.trim() || null
          : updateRequest.observations;
    }

    return normalizedRequest;
  }

  private normalizeRequiredNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const parsedValue = Number(value);
      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }

    return undefined;
  }

  private normalizeOptionalNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const parsedValue = Number(value);
      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }

    return undefined;
  }

  private normalizeNullableNumber(value: unknown): number | null | undefined {
    if (value === null) {
      return null;
    }

    return this.normalizeOptionalNumber(value);
  }

  private buildVehiclePayload(
    normalizedVehicle: CreateVehicleRequest,
    clientName: string
  ): Vehicle {
    return {
      id: 0,
      clientId: normalizedVehicle.clientId,
      client: clientName,
      plate: normalizedVehicle.plate ?? '',
      brand: normalizedVehicle.brand ?? '',
      model: normalizedVehicle.model ?? '',
      year: normalizedVehicle.year,
      km: normalizedVehicle.km ?? 0,
      vehicleType: normalizedVehicle.vehicleType ?? '',
      lastServiceDate: this.parseDate(normalizedVehicle.lastServiceDate),
      nextServiceKm: normalizedVehicle.nextServiceKm,
      observations: normalizedVehicle.observations,
    };
  }

  private buildVehicleUpdatePayload(updateRequest: UpdateVehicleRequest): Partial<Vehicle> {
    const payload: Partial<Vehicle> = {};

    if (updateRequest.clientId !== undefined) {
      payload.clientId = updateRequest.clientId;
      payload.client = updateRequest.clientId
        ? `Client #${updateRequest.clientId}`
        : 'Unknown Client';
    }

    if (updateRequest.plate !== undefined) {
      payload.plate = updateRequest.plate;
    }

    if (updateRequest.brand !== undefined) {
      payload.brand = updateRequest.brand;
    }

    if (updateRequest.model !== undefined) {
      payload.model = updateRequest.model;
    }

    if (updateRequest.year !== undefined) {
      payload.year = updateRequest.year;
    }

    if (updateRequest.km !== undefined && updateRequest.km !== null) {
      payload.km = updateRequest.km;
    }

    if (updateRequest.vehicleType !== undefined) {
      payload.vehicleType = updateRequest.vehicleType;
    }

    if (updateRequest.lastServiceDate !== undefined) {
      payload.lastServiceDate = this.parseDate(updateRequest.lastServiceDate ?? undefined);
    }

    if (updateRequest.nextServiceKm !== undefined) {
      payload.nextServiceKm = updateRequest.nextServiceKm;
    }

    if (updateRequest.observations !== undefined) {
      payload.observations = updateRequest.observations;
    }

    return payload;
  }

  private parseDate(value?: string | null): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new ValidationError('Last service date must be a valid date');
    }

    return parsedDate;
  }
}
