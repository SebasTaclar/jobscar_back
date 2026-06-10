import { PrismaClient } from '@prisma/client';
import { Logger } from '../../shared/Logger';
import { NotFoundError, ValidationError } from '../../shared/exceptions';
import { ISparePartDataSource } from '../../domain/interfaces/ISparePartDataSource';
import { SparePart } from '../../domain/entities/SparePart';

export interface CreateSparePartRequest {
  workOrderId: number;
  invoiceId?: number | null;
  item: string;
  quantity: number;
  unitCost: number;
  unitValue: number;
  totalCost: number;
  totalInvoice: number;
  gananciaNeta: number;
}

export interface UpdateSparePartRequest {
  workOrderId?: number;
  invoiceId?: number | null;
  item?: string;
  quantity?: number;
  unitCost?: number;
  unitValue?: number;
  totalCost?: number;
  totalInvoice?: number;
  gananciaNeta?: number;
}

export class SparePartService {
  private logger: Logger;
  private sparePartDataSource: ISparePartDataSource;
  private prisma: PrismaClient;

  constructor(
    logger: Logger,
    sparePartDataSource: ISparePartDataSource,
    prisma: PrismaClient
  ) {
    this.logger = logger;
    this.sparePartDataSource = sparePartDataSource;
    this.prisma = prisma;
  }

  async getAllSpareParts(query?: unknown): Promise<SparePart[]> {
    this.logger.logInfo('Getting all spare parts');

    try {
      const spareParts = await this.sparePartDataSource.getAll(query);
      this.logger.logInfo(`Retrieved ${spareParts.length} spare parts`);
      return spareParts;
    } catch (error) {
      this.logger.logError('Error getting spare parts', error);
      throw error;
    }
  }

  async getSparePartById(id: string): Promise<SparePart> {
    this.logger.logInfo(`Getting spare part by id: ${id}`);

    if (!id) {
      throw new ValidationError('SparePart ID is required');
    }

    const sparePartId = parseInt(id, 10);
    if (Number.isNaN(sparePartId)) {
      throw new ValidationError('SparePart ID must be a valid number');
    }

    try {
      const sparePart = await this.sparePartDataSource.getById(sparePartId);
      if (!sparePart) {
        this.logger.logWarning(`SparePart not found with id: ${id}`);
        throw new NotFoundError('SparePart not found');
      }

      this.logger.logInfo(`Retrieved spare part: ${sparePart.id}`);
      return sparePart;
    } catch (error) {
      this.logger.logError(`Error getting spare part by id: ${id}`, error);
      throw error;
    }
  }

  async createSparePart(createRequest: CreateSparePartRequest): Promise<SparePart> {
    this.logger.logInfo('Creating spare part');

    const normalized = this.normalizeCreateRequest(createRequest);
    await this.validateReferences(normalized.workOrderId, normalized.invoiceId);

    try {
      const sparePartData: SparePart = {
        id: 0,
        workOrderId: normalized.workOrderId,
        invoiceId: normalized.invoiceId,
        item: normalized.item,
        quantity: normalized.quantity,
        unitCost: normalized.unitCost,
        unitValue: normalized.unitValue,
        totalCost: normalized.totalCost,
        totalInvoice: normalized.totalInvoice,
        gananciaNeta: normalized.gananciaNeta,
      };

      const newSparePart = await this.sparePartDataSource.create(sparePartData);
      this.logger.logInfo(`SparePart created successfully: ID ${newSparePart.id}`);

      return newSparePart;
    } catch (error) {
      this.logger.logError('Error creating spare part', error);
      throw error;
    }
  }

  async updateSparePart(id: string, updateRequest: UpdateSparePartRequest): Promise<SparePart> {
    this.logger.logInfo(`Updating spare part with id: ${id}`);

    if (!id) {
      throw new ValidationError('SparePart ID is required');
    }

    const sparePartId = parseInt(id, 10);
    if (Number.isNaN(sparePartId)) {
      throw new ValidationError('SparePart ID must be a valid number');
    }

    const normalized = this.normalizeUpdateRequest(updateRequest);

    if (Object.keys(normalized).length === 0) {
      throw new ValidationError('At least one field must be provided for update');
    }

    await this.validateReferences(
      normalized.workOrderId ?? undefined,
      normalized.invoiceId !== undefined ? normalized.invoiceId : undefined
    );

    try {
      const existing = await this.sparePartDataSource.getById(sparePartId);
      if (!existing) {
        this.logger.logWarning(`SparePart update failed: not found with id ${id}`);
        throw new NotFoundError('SparePart not found');
      }

      const updatedSparePart = await this.sparePartDataSource.update(
        sparePartId,
        this.buildUpdatePayload(normalized)
      );

      if (!updatedSparePart) {
        this.logger.logError(`SparePart update failed: not found with id ${id}`);
        throw new NotFoundError('SparePart not found');
      }

      this.logger.logInfo(`SparePart updated successfully: ID ${id}`);
      return updatedSparePart;
    } catch (error) {
      this.logger.logError(`Error updating spare part with id: ${id}`, error);
      throw error;
    }
  }

  async deleteSparePart(id: string): Promise<boolean> {
    this.logger.logInfo(`Deleting spare part with id: ${id}`);

    if (!id) {
      throw new ValidationError('SparePart ID is required');
    }

    const sparePartId = parseInt(id, 10);
    if (Number.isNaN(sparePartId)) {
      throw new ValidationError('SparePart ID must be a valid number');
    }

    try {
      const deleted = await this.sparePartDataSource.delete(sparePartId);
      if (!deleted) {
        this.logger.logWarning(`SparePart deletion failed: not found with id ${id}`);
        throw new NotFoundError('SparePart not found');
      }

      this.logger.logInfo(`SparePart deleted successfully with id: ${id}`);
      return true;
    } catch (error) {
      this.logger.logError(`Error deleting spare part with id: ${id}`, error);
      throw error;
    }
  }

  private async validateReferences(workOrderId?: number, invoiceId?: number | null): Promise<void> {
    if (workOrderId !== undefined) {
      const workOrder = await this.prisma.workOrder.findUnique({
        where: { id: workOrderId },
        select: { id: true },
      });
      if (!workOrder) {
        throw new ValidationError(`WorkOrder with id ${workOrderId} not found`);
      }
    }

    if (invoiceId !== undefined && invoiceId !== null) {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { id: true },
      });
      if (!invoice) {
        throw new ValidationError(`Invoice with id ${invoiceId} not found`);
      }
    }
  }

  private normalizeCreateRequest(req: CreateSparePartRequest): CreateSparePartRequest {
    return {
      workOrderId:
        typeof req?.workOrderId === 'number' && Number.isFinite(req.workOrderId)
          ? req.workOrderId
          : 0,
      invoiceId:
        req?.invoiceId === undefined || req?.invoiceId === null
          ? null
          : typeof req.invoiceId === 'number' && Number.isFinite(req.invoiceId)
            ? req.invoiceId
            : null,
      item: typeof req?.item === 'string' ? req.item.trim() : '',
      quantity:
        typeof req?.quantity === 'number' && Number.isFinite(req.quantity)
          ? req.quantity
          : 1,
      unitCost:
        typeof req?.unitCost === 'number' && Number.isFinite(req.unitCost)
          ? req.unitCost
          : 0,
      unitValue:
        typeof req?.unitValue === 'number' && Number.isFinite(req.unitValue)
          ? req.unitValue
          : 0,
      totalCost:
        typeof req?.totalCost === 'number' && Number.isFinite(req.totalCost)
          ? req.totalCost
          : 0,
      totalInvoice:
        typeof req?.totalInvoice === 'number' && Number.isFinite(req.totalInvoice)
          ? req.totalInvoice
          : 0,
      gananciaNeta:
        typeof req?.gananciaNeta === 'number' && Number.isFinite(req.gananciaNeta)
          ? req.gananciaNeta
          : 0,
    };
  }

  private normalizeUpdateRequest(req: UpdateSparePartRequest): UpdateSparePartRequest {
    const normalized: UpdateSparePartRequest = {};

    if (req?.workOrderId !== undefined) {
      normalized.workOrderId =
        Number.isFinite(req.workOrderId) ? req.workOrderId : undefined;
    }

    if (req?.invoiceId !== undefined) {
      normalized.invoiceId =
        req.invoiceId === null
          ? null
          : Number.isFinite(req.invoiceId)
            ? req.invoiceId
            : undefined;
    }

    if (req?.item !== undefined) {
      normalized.item = typeof req.item === 'string' ? req.item.trim() : undefined;
    }

    if (req?.quantity !== undefined) {
      normalized.quantity =
        Number.isFinite(req.quantity) ? req.quantity : undefined;
    }

    if (req?.unitCost !== undefined) {
      normalized.unitCost =
        Number.isFinite(req.unitCost) ? req.unitCost : undefined;
    }

    if (req?.unitValue !== undefined) {
      normalized.unitValue =
        Number.isFinite(req.unitValue) ? req.unitValue : undefined;
    }

    if (req?.totalCost !== undefined) {
      normalized.totalCost =
        Number.isFinite(req.totalCost) ? req.totalCost : undefined;
    }

    if (req?.totalInvoice !== undefined) {
      normalized.totalInvoice =
        Number.isFinite(req.totalInvoice) ? req.totalInvoice : undefined;
    }

    if (req?.gananciaNeta !== undefined) {
      normalized.gananciaNeta =
        Number.isFinite(req.gananciaNeta) ? req.gananciaNeta : undefined;
    }

    return normalized;
  }

  private buildUpdatePayload(req: UpdateSparePartRequest): Partial<SparePart> {
    const payload: Partial<SparePart> = {};

    if (req.workOrderId !== undefined) payload.workOrderId = req.workOrderId;
    if (req.invoiceId !== undefined) payload.invoiceId = req.invoiceId;
    if (req.item !== undefined) payload.item = req.item;
    if (req.quantity !== undefined) payload.quantity = req.quantity;
    if (req.unitCost !== undefined) payload.unitCost = req.unitCost;
    if (req.unitValue !== undefined) payload.unitValue = req.unitValue;
    if (req.totalCost !== undefined) payload.totalCost = req.totalCost;
    if (req.totalInvoice !== undefined) payload.totalInvoice = req.totalInvoice;
    if (req.gananciaNeta !== undefined) payload.gananciaNeta = req.gananciaNeta;

    return payload;
  }
}
