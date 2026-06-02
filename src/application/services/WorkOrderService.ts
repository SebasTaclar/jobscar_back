import { Logger } from '../../shared/Logger';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/exceptions';
import { IWorkOrderDataSource } from '../../domain/interfaces/IWorkOrderDataSource';
import { IVehicleDataSource } from '../../domain/interfaces/IVehicleDataSource';
import { IEmployeeDataSource } from '../../domain/interfaces/IEmployeeDataSource';
import { WorkOrder } from '../../domain/entities/WorkOrder';

const VALID_STATUSES = ['Recepción', 'Diagnóstico', 'Terminado', 'Entregado'];

export interface CreateWorkOrderRequest {
  vehicleId: number;
  mechanicId?: number;
  status?: 'Recepción' | 'Diagnóstico' | 'Terminado' | 'Entregado';
  services?: string[];
  gases?: boolean;
  escaner?: boolean;
  observations?: string;
  diagnosis?: string;
  deliveryDate?: string;
  garantia?: number;
  total?: number;
}

export interface UpdateWorkOrderRequest {
  vehicleId?: number;
  mechanicId?: number | null;
  status?: 'Recepción' | 'Diagnóstico' | 'Terminado' | 'Entregado';
  services?: string[] | null;
  gases?: boolean | null;
  escaner?: boolean | null;
  observations?: string | null;
  diagnosis?: string | null;
  deliveryDate?: string | null;
  garantia?: number | null;
  total?: number | null;
}

export class WorkOrderService {
  private logger: Logger;
  private workOrderDataSource: IWorkOrderDataSource;
  private vehicleDataSource: IVehicleDataSource;
  private employeeDataSource: IEmployeeDataSource;

  constructor(
    logger: Logger,
    workOrderDataSource: IWorkOrderDataSource,
    vehicleDataSource: IVehicleDataSource,
    employeeDataSource: IEmployeeDataSource
  ) {
    this.logger = logger;
    this.workOrderDataSource = workOrderDataSource;
    this.vehicleDataSource = vehicleDataSource;
    this.employeeDataSource = employeeDataSource;
  }

  async getAllWorkOrders(query?: unknown): Promise<WorkOrder[]> {
    this.logger.logInfo('Getting all work orders');

    try {
      const workOrders = await this.workOrderDataSource.getAll(query);
      this.logger.logInfo(`Retrieved ${workOrders.length} work orders`);
      return workOrders;
    } catch (error) {
      this.logger.logError('Error getting work orders', error);
      throw error;
    }
  }

  async getWorkOrderById(id: string): Promise<WorkOrder> {
    this.logger.logInfo(`Getting work order by id: ${id}`);

    if (!id) {
      throw new ValidationError('Work order ID is required');
    }

    const workOrderId = parseInt(id, 10);
    if (Number.isNaN(workOrderId)) {
      throw new ValidationError('Work order ID must be a valid number');
    }

    try {
      const workOrder = await this.workOrderDataSource.getById(workOrderId);
      if (!workOrder) {
        this.logger.logWarning(`Work order not found with id: ${id}`);
        throw new NotFoundError('Work order not found');
      }

      this.logger.logInfo(`Retrieved work order: ${workOrder.id}`);
      return workOrder;
    } catch (error) {
      this.logger.logError(`Error getting work order by id: ${id}`, error);
      throw error;
    }
  }

  async createWorkOrder(createRequest: CreateWorkOrderRequest): Promise<WorkOrder> {
    this.logger.logInfo(`Creating work order for vehicleId: ${createRequest?.vehicleId}`);

    const normalizedWorkOrder = this.normalizeCreateRequest(createRequest);

    if (!normalizedWorkOrder.vehicleId) {
      throw new ValidationError('vehicleId is required');
    }

    if (normalizedWorkOrder.status && !VALID_STATUSES.includes(normalizedWorkOrder.status)) {
      throw new ValidationError(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    try {
      await this.validateVehicle(normalizedWorkOrder.vehicleId);

      if (normalizedWorkOrder.mechanicId !== undefined && normalizedWorkOrder.mechanicId !== null) {
        await this.validateMechanic(normalizedWorkOrder.mechanicId);
      }

      const workOrderData: WorkOrder = {
        id: 0,
        vehicleId: normalizedWorkOrder.vehicleId,
        mechanicId: normalizedWorkOrder.mechanicId,
        status: normalizedWorkOrder.status ?? 'Recepción',
        services: normalizedWorkOrder.services,
        gases: normalizedWorkOrder.gases,
        escaner: normalizedWorkOrder.escaner,
        observations: normalizedWorkOrder.observations,
        diagnosis: normalizedWorkOrder.diagnosis,
        deliveryDate: this.parseDeliveryDate(normalizedWorkOrder.deliveryDate),
        garantia: normalizedWorkOrder.garantia,
        total: normalizedWorkOrder.total,
      };

      const newWorkOrder = await this.workOrderDataSource.create(workOrderData);
      this.logger.logInfo(`Work order created successfully: ID ${newWorkOrder.id}`);
      return newWorkOrder;
    } catch (error) {
      this.logger.logError('Error creating work order', error);
      throw error;
    }
  }

  async updateWorkOrder(id: string, updateRequest: UpdateWorkOrderRequest): Promise<WorkOrder> {
    this.logger.logInfo(`Updating work order with id: ${id}`);

    if (!id) {
      throw new ValidationError('Work order ID is required');
    }

    const workOrderId = parseInt(id, 10);
    if (Number.isNaN(workOrderId)) {
      throw new ValidationError('Work order ID must be a valid number');
    }

    const normalizedUpdateRequest = this.normalizeUpdateRequest(updateRequest);

    if (Object.keys(normalizedUpdateRequest).length === 0) {
      throw new ValidationError('At least one field must be provided for update');
    }

    if (
      normalizedUpdateRequest.status !== undefined &&
      normalizedUpdateRequest.status !== null &&
      !VALID_STATUSES.includes(normalizedUpdateRequest.status)
    ) {
      throw new ValidationError(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    try {
      const existingWorkOrder = await this.workOrderDataSource.getById(workOrderId);
      if (!existingWorkOrder) {
        this.logger.logWarning(`Work order update failed: work order not found with id ${id}`);
        throw new NotFoundError('Work order not found');
      }

      if (
        normalizedUpdateRequest.vehicleId !== undefined &&
        normalizedUpdateRequest.vehicleId !== null
      ) {
        await this.validateVehicle(normalizedUpdateRequest.vehicleId);
      }

      if (
        normalizedUpdateRequest.mechanicId !== undefined &&
        normalizedUpdateRequest.mechanicId !== null
      ) {
        await this.validateMechanic(normalizedUpdateRequest.mechanicId);
      }

      const updatedWorkOrder = await this.workOrderDataSource.update(
        workOrderId,
        this.buildWorkOrderUpdatePayload(normalizedUpdateRequest)
      );

      if (!updatedWorkOrder) {
        this.logger.logWarning(`Work order update failed: work order not found with id ${id}`);
        throw new NotFoundError('Work order not found');
      }

      this.logger.logInfo(`Work order updated successfully: ID ${id}`);
      return updatedWorkOrder;
    } catch (error) {
      this.logger.logError(`Error updating work order with id: ${id}`, error);
      throw error;
    }
  }

  async deleteWorkOrder(id: string): Promise<boolean> {
    this.logger.logInfo(`Deleting work order with id: ${id}`);

    if (!id) {
      throw new ValidationError('Work order ID is required');
    }

    const workOrderId = parseInt(id, 10);
    if (Number.isNaN(workOrderId)) {
      throw new ValidationError('Work order ID must be a valid number');
    }

    try {
      const deleted = await this.workOrderDataSource.delete(workOrderId);
      if (!deleted) {
        this.logger.logWarning(`Work order deletion failed: work order not found with id ${id}`);
        throw new NotFoundError('Work order not found');
      }

      this.logger.logInfo(`Work order deleted successfully with id: ${id}`);
      return true;
    } catch (error) {
      this.logger.logError(`Error deleting work order with id: ${id}`, error);
      throw error;
    }
  }

  private normalizeCreateRequest(createRequest: CreateWorkOrderRequest): CreateWorkOrderRequest {
    return {
      vehicleId: Number.isFinite(createRequest?.vehicleId) ? createRequest.vehicleId : 0,
      mechanicId:
        typeof createRequest?.mechanicId === 'number' && Number.isFinite(createRequest.mechanicId)
          ? createRequest.mechanicId
          : undefined,
      status: createRequest?.status,
      services: Array.isArray(createRequest?.services)
        ? createRequest.services.map((service) => service?.trim()).filter(Boolean)
        : undefined,
      gases: typeof createRequest?.gases === 'boolean' ? createRequest.gases : false,
      escaner: typeof createRequest?.escaner === 'boolean' ? createRequest.escaner : false,
      observations:
        typeof createRequest?.observations === 'string'
          ? createRequest.observations.trim() || undefined
          : undefined,
      diagnosis:
        typeof createRequest?.diagnosis === 'string'
          ? createRequest.diagnosis.trim() || undefined
          : undefined,
      deliveryDate:
        typeof createRequest?.deliveryDate === 'string'
          ? createRequest.deliveryDate.trim() || undefined
          : undefined,
      garantia:
        typeof createRequest?.garantia === 'number' && Number.isFinite(createRequest.garantia)
          ? createRequest.garantia
          : undefined,
      total:
        typeof createRequest?.total === 'number' && Number.isFinite(createRequest.total)
          ? createRequest.total
          : undefined,
    };
  }

  private normalizeUpdateRequest(updateRequest: UpdateWorkOrderRequest): UpdateWorkOrderRequest {
    const normalizedRequest: UpdateWorkOrderRequest = {};

    if (typeof updateRequest?.vehicleId === 'number' && Number.isFinite(updateRequest.vehicleId)) {
      normalizedRequest.vehicleId = updateRequest.vehicleId;
    }

    if (
      updateRequest?.mechanicId !== undefined &&
      updateRequest?.mechanicId !== null &&
      Number.isFinite(updateRequest.mechanicId)
    ) {
      normalizedRequest.mechanicId = updateRequest.mechanicId;
    } else if (updateRequest?.mechanicId === null) {
      normalizedRequest.mechanicId = null;
    }

    if (updateRequest?.status !== undefined) {
      normalizedRequest.status = updateRequest.status;
    }

    if (updateRequest?.services !== undefined) {
      normalizedRequest.services = Array.isArray(updateRequest.services)
        ? updateRequest.services.map((service) => service?.trim()).filter(Boolean)
        : null;
    }

    if (updateRequest?.gases !== undefined) {
      normalizedRequest.gases = updateRequest.gases;
    }

    if (updateRequest?.escaner !== undefined) {
      normalizedRequest.escaner = updateRequest.escaner;
    }

    if (updateRequest?.observations !== undefined) {
      normalizedRequest.observations =
        typeof updateRequest.observations === 'string'
          ? updateRequest.observations.trim() || null
          : updateRequest.observations;
    }

    if (updateRequest?.diagnosis !== undefined) {
      normalizedRequest.diagnosis =
        typeof updateRequest.diagnosis === 'string'
          ? updateRequest.diagnosis.trim() || null
          : updateRequest.diagnosis;
    }

    if (updateRequest?.deliveryDate !== undefined) {
      normalizedRequest.deliveryDate =
        typeof updateRequest.deliveryDate === 'string'
          ? updateRequest.deliveryDate.trim() || null
          : updateRequest.deliveryDate;
    }

    if (updateRequest?.garantia !== undefined) {
      normalizedRequest.garantia =
        updateRequest.garantia === null || Number.isFinite(updateRequest.garantia)
          ? updateRequest.garantia
          : undefined;
    }

    if (updateRequest?.total !== undefined) {
      normalizedRequest.total =
        updateRequest.total === null || Number.isFinite(updateRequest.total)
          ? updateRequest.total
          : undefined;
    }

    return normalizedRequest;
  }

  private buildWorkOrderUpdatePayload(updateRequest: UpdateWorkOrderRequest): Partial<WorkOrder> {
    const payload: Partial<WorkOrder> = {};

    if (updateRequest.vehicleId !== undefined) {
      payload.vehicleId = updateRequest.vehicleId;
    }
    if (updateRequest.mechanicId !== undefined) {
      payload.mechanicId = updateRequest.mechanicId;
    }
    if (updateRequest.status !== undefined) {
      payload.status = updateRequest.status;
    }
    if (updateRequest.services !== undefined) {
      payload.services = updateRequest.services?.length ? updateRequest.services : ['General'];
    }
    if (updateRequest.gases !== undefined) {
      payload.gases = updateRequest.gases;
    }
    if (updateRequest.escaner !== undefined) {
      payload.escaner = updateRequest.escaner;
    }
    if (updateRequest.observations !== undefined) {
      payload.observations = updateRequest.observations;
    }
    if (updateRequest.diagnosis !== undefined) {
      payload.diagnosis = updateRequest.diagnosis;
    }
    if (updateRequest.deliveryDate !== undefined) {
      payload.deliveryDate = this.parseDeliveryDate(updateRequest.deliveryDate ?? undefined);
    }
    if (updateRequest.garantia !== undefined) {
      payload.garantia = updateRequest.garantia;
    }
    if (updateRequest.total !== undefined) {
      payload.total = updateRequest.total;
    }

    return payload;
  }

  private parseDeliveryDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new ValidationError('Delivery date must be a valid date');
    }

    return parsedDate;
  }

  private async validateVehicle(vehicleId: number): Promise<void> {
    const vehicle = await this.vehicleDataSource.getById(vehicleId);
    if (!vehicle) {
      throw new NotFoundError(`Vehicle with ID ${vehicleId} not found`);
    }
  }

  private async validateMechanic(mechanicId: number): Promise<void> {
    const mechanic = await this.employeeDataSource.getById(mechanicId);
    if (!mechanic) {
      throw new NotFoundError(`Mechanic with ID ${mechanicId} not found`);
    }
  }
}
