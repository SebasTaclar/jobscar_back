import { Logger } from '../../shared/Logger';
import { NotFoundError, ValidationError } from '../../shared/exceptions';
import { IMoneyMovementDataSource } from '../../domain/interfaces/IMoneyMovementDataSource';
import { MoneyMovement } from '../../domain/entities/MoneyMovement';

export interface CreateMoneyMovementRequest {
  reference?: string;
  name: string;
  concept: string;
  movement: string;
  amount: number;
  account?: string;
  observation?: string;
  date?: string;
}

export interface UpdateMoneyMovementRequest {
  reference?: string;
  name?: string;
  concept?: string;
  movement?: string;
  amount?: number;
  account?: string;
  observation?: string;
  date?: string;
}

export class MoneyMovementService {
  private logger: Logger;
  private moneyMovementDataSource: IMoneyMovementDataSource;

  constructor(
    logger: Logger,
    moneyMovementDataSource: IMoneyMovementDataSource
  ) {
    this.logger = logger;
    this.moneyMovementDataSource = moneyMovementDataSource;
  }

  async getAllMoneyMovements(query?: unknown): Promise<MoneyMovement[]> {
    this.logger.logInfo('Getting all money movements');

    try {
      const movements = await this.moneyMovementDataSource.getAll(query);
      this.logger.logInfo(`Retrieved ${movements.length} money movements`);
      return movements;
    } catch (error) {
      this.logger.logError('Error getting money movements', error);
      throw error;
    }
  }

  async getMoneyMovementById(id: string): Promise<MoneyMovement> {
    this.logger.logInfo(`Getting money movement by id: ${id}`);

    if (!id) {
      throw new ValidationError('MoneyMovement ID is required');
    }

    const movementId = parseInt(id, 10);
    if (Number.isNaN(movementId)) {
      throw new ValidationError('MoneyMovement ID must be a valid number');
    }

    try {
      const movement = await this.moneyMovementDataSource.getById(movementId);
      if (!movement) {
        this.logger.logWarning(`MoneyMovement not found with id: ${id}`);
        throw new NotFoundError('MoneyMovement not found');
      }

      this.logger.logInfo(`Retrieved money movement: ${movement.id}`);
      return movement;
    } catch (error) {
      this.logger.logError(`Error getting money movement by id: ${id}`, error);
      throw error;
    }
  }

  async createMoneyMovement(createRequest: CreateMoneyMovementRequest): Promise<MoneyMovement> {
    this.logger.logInfo('Creating money movement');

    const normalized = this.normalizeCreateRequest(createRequest);

    try {
      const movementData: MoneyMovement = {
        id: 0,
        reference: normalized.reference,
        name: normalized.name,
        concept: normalized.concept,
        movement: normalized.movement,
        amount: normalized.amount,
        account: normalized.account,
        observation: normalized.observation,
        date: normalized.date ? new Date(normalized.date) : undefined,
      };

      const newMovement = await this.moneyMovementDataSource.create(movementData);
      this.logger.logInfo(`MoneyMovement created successfully: ID ${newMovement.id}`);

      return newMovement;
    } catch (error) {
      this.logger.logError('Error creating money movement', error);
      throw error;
    }
  }

  async updateMoneyMovement(id: string, updateRequest: UpdateMoneyMovementRequest): Promise<MoneyMovement> {
    this.logger.logInfo(`Updating money movement with id: ${id}`);

    if (!id) {
      throw new ValidationError('MoneyMovement ID is required');
    }

    const movementId = parseInt(id, 10);
    if (Number.isNaN(movementId)) {
      throw new ValidationError('MoneyMovement ID must be a valid number');
    }

    const normalized = this.normalizeUpdateRequest(updateRequest);

    if (Object.keys(normalized).length === 0) {
      throw new ValidationError('At least one field must be provided for update');
    }

    try {
      const existing = await this.moneyMovementDataSource.getById(movementId);
      if (!existing) {
        this.logger.logWarning(`MoneyMovement update failed: not found with id ${id}`);
        throw new NotFoundError('MoneyMovement not found');
      }

      const updatedMovement = await this.moneyMovementDataSource.update(
        movementId,
        this.buildUpdatePayload(normalized)
      );

      if (!updatedMovement) {
        this.logger.logError(`MoneyMovement update failed: not found with id ${id}`);
        throw new NotFoundError('MoneyMovement not found');
      }

      this.logger.logInfo(`MoneyMovement updated successfully: ID ${id}`);
      return updatedMovement;
    } catch (error) {
      this.logger.logError(`Error updating money movement with id: ${id}`, error);
      throw error;
    }
  }

  async deleteMoneyMovement(id: string): Promise<boolean> {
    this.logger.logInfo(`Deleting money movement with id: ${id}`);

    if (!id) {
      throw new ValidationError('MoneyMovement ID is required');
    }

    const movementId = parseInt(id, 10);
    if (Number.isNaN(movementId)) {
      throw new ValidationError('MoneyMovement ID must be a valid number');
    }

    try {
      const deleted = await this.moneyMovementDataSource.delete(movementId);
      if (!deleted) {
        this.logger.logWarning(`MoneyMovement deletion failed: not found with id ${id}`);
        throw new NotFoundError('MoneyMovement not found');
      }

      this.logger.logInfo(`MoneyMovement deleted successfully with id: ${id}`);
      return true;
    } catch (error) {
      this.logger.logError(`Error deleting money movement with id: ${id}`, error);
      throw error;
    }
  }

  private normalizeCreateRequest(req: CreateMoneyMovementRequest): CreateMoneyMovementRequest {
    return {
      reference:
        typeof req?.reference === 'string' ? req.reference.trim() : undefined,
      name: typeof req?.name === 'string' ? req.name.trim() : '',
      concept: typeof req?.concept === 'string' ? req.concept.trim() : '',
      movement: typeof req?.movement === 'string' ? req.movement.trim() : '',
      amount:
        typeof req?.amount === 'number' && Number.isFinite(req.amount)
          ? req.amount
          : 0,
      account:
        typeof req?.account === 'string' ? req.account.trim() : undefined,
      observation:
        typeof req?.observation === 'string' ? req.observation.trim() : undefined,
      date:
        typeof req?.date === 'string' && !Number.isNaN(Date.parse(req.date))
          ? req.date
          : undefined,
    };
  }

  private normalizeUpdateRequest(req: UpdateMoneyMovementRequest): UpdateMoneyMovementRequest {
    const normalized: UpdateMoneyMovementRequest = {};

    if (req?.reference !== undefined) {
      normalized.reference = typeof req.reference === 'string' ? req.reference.trim() : undefined;
    }

    if (req?.name !== undefined) {
      normalized.name = typeof req.name === 'string' ? req.name.trim() : undefined;
    }

    if (req?.concept !== undefined) {
      normalized.concept = typeof req.concept === 'string' ? req.concept.trim() : undefined;
    }

    if (req?.movement !== undefined) {
      normalized.movement = typeof req.movement === 'string' ? req.movement.trim() : undefined;
    }

    if (req?.amount !== undefined) {
      normalized.amount = Number.isFinite(req.amount) ? req.amount : undefined;
    }

    if (req?.account !== undefined) {
      normalized.account = typeof req.account === 'string' ? req.account.trim() : undefined;
    }

    if (req?.observation !== undefined) {
      normalized.observation = typeof req.observation === 'string' ? req.observation.trim() : undefined;
    }

    if (req?.date !== undefined) {
      normalized.date = typeof req.date === 'string' && !Number.isNaN(Date.parse(req.date))
        ? req.date
        : undefined;
    }

    return normalized;
  }

  private buildUpdatePayload(req: UpdateMoneyMovementRequest): Partial<MoneyMovement> {
    const payload: Partial<MoneyMovement> = {};

    if (req.reference !== undefined) payload.reference = req.reference;
    if (req.name !== undefined) payload.name = req.name;
    if (req.concept !== undefined) payload.concept = req.concept;
    if (req.movement !== undefined) payload.movement = req.movement;
    if (req.amount !== undefined) payload.amount = req.amount;
    if (req.account !== undefined) payload.account = req.account;
    if (req.observation !== undefined) payload.observation = req.observation;
    if (req.date !== undefined) payload.date = new Date(req.date);

    return payload;
  }
}
