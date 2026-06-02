import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../../config/PrismaClient';
import { IWorkOrderDataSource } from '../../domain/interfaces/IWorkOrderDataSource';
import { WorkOrder } from '../../domain/entities/WorkOrder';

export class WorkOrderPrismaAdapter implements IWorkOrderDataSource {
  private readonly prisma = getPrismaClient();

  public async getAll(query?: unknown): Promise<WorkOrder[]> {
    let whereClause: Prisma.WorkOrderWhereInput = {};

    if (query && typeof query === 'object') {
      const queryObj = query as Record<string, unknown>;

      whereClause = {
        ...(typeof queryObj.status === 'string' && {
          status: { contains: queryObj.status, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.vehicleId === 'string' && {
          vehicleId: parseInt(queryObj.vehicleId, 10),
        }),
        ...(typeof queryObj.mechanicId === 'string' && {
          mechanicId: parseInt(queryObj.mechanicId, 10),
        }),
      };
    }

    const workOrders = await this.prisma.workOrder.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return workOrders.map(this.mapToWorkOrder);
  }

  public async getById(id: number): Promise<WorkOrder | null> {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
    });

    return workOrder ? this.mapToWorkOrder(workOrder) : null;
  }

  public async create(workOrder: WorkOrder): Promise<WorkOrder> {
    const newWorkOrder = await this.prisma.workOrder.create({
      data: {
        vehicleId: workOrder.vehicleId,
        mechanicId: workOrder.mechanicId ?? null,
        status: workOrder.status ?? 'Recepción',
        services: workOrder.services ? JSON.stringify(workOrder.services) : null,
        gases: workOrder.gases ?? false,
        escaner: workOrder.escaner ?? false,
        observations: workOrder.observations ?? null,
        diagnosis: workOrder.diagnosis ?? null,
        deliveryDate: workOrder.deliveryDate ?? null,
        garantia: workOrder.garantia ?? null,
        total: workOrder.total ?? null,
      },
    });

    return this.mapToWorkOrder(newWorkOrder);
  }

  public async update(id: number, workOrder: Partial<WorkOrder>): Promise<WorkOrder | null> {
    try {
      const updatedWorkOrder = await this.prisma.workOrder.update({
        where: { id },
        data: {
          ...(workOrder.vehicleId !== undefined && { vehicleId: workOrder.vehicleId }),
          ...(workOrder.mechanicId !== undefined && { mechanicId: workOrder.mechanicId }),
          ...(workOrder.status !== undefined && { status: workOrder.status }),
          ...(workOrder.services !== undefined && {
            services: workOrder.services ? JSON.stringify(workOrder.services) : null,
          }),
          ...(workOrder.gases !== undefined && { gases: workOrder.gases }),
          ...(workOrder.escaner !== undefined && { escaner: workOrder.escaner }),
          ...(workOrder.observations !== undefined && { observations: workOrder.observations }),
          ...(workOrder.diagnosis !== undefined && { diagnosis: workOrder.diagnosis }),
          ...(workOrder.deliveryDate !== undefined && { deliveryDate: workOrder.deliveryDate }),
          ...(workOrder.garantia !== undefined && { garantia: workOrder.garantia }),
          ...(workOrder.total !== undefined && { total: workOrder.total }),
        },
      });

      return this.mapToWorkOrder(updatedWorkOrder);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  public async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.workOrder.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  private mapToWorkOrder(prismaWorkOrder: {
    id: number;
    vehicleId: number;
    mechanicId: number | null;
    status: string;
    services: string | null;
    gases: boolean;
    escaner: boolean;
    observations: string | null;
    diagnosis: string | null;
    deliveryDate: Date | null;
    garantia: number | null;
    total: Prisma.Decimal | null;
    createdAt: Date;
    updatedAt: Date;
  }): WorkOrder {
    return {
      id: prismaWorkOrder.id,
      vehicleId: prismaWorkOrder.vehicleId,
      mechanicId: prismaWorkOrder.mechanicId ?? undefined,
      status: prismaWorkOrder.status,
      services: prismaWorkOrder.services ? JSON.parse(prismaWorkOrder.services) : undefined,
      gases: prismaWorkOrder.gases,
      escaner: prismaWorkOrder.escaner,
      observations: prismaWorkOrder.observations ?? undefined,
      diagnosis: prismaWorkOrder.diagnosis ?? undefined,
      deliveryDate: prismaWorkOrder.deliveryDate ?? undefined,
      garantia: prismaWorkOrder.garantia ?? undefined,
      total: prismaWorkOrder.total ? Number(prismaWorkOrder.total) : undefined,
      createdAt: prismaWorkOrder.createdAt,
      updatedAt: prismaWorkOrder.updatedAt,
    };
  }
}
