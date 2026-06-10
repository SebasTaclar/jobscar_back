import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../../config/PrismaClient';
import { ISparePartDataSource } from '../../domain/interfaces/ISparePartDataSource';
import { SparePart } from '../../domain/entities/SparePart';

export class SparePartPrismaAdapter implements ISparePartDataSource {
  private readonly prisma = getPrismaClient();

  public async getAll(query?: unknown): Promise<SparePart[]> {
    let whereClause: Prisma.SparePartWhereInput = {};

    if (query && typeof query === 'object') {
      const queryObj = query as Record<string, unknown>;

      whereClause = {
        ...(typeof queryObj.workOrderId === 'string' && {
          workOrderId: parseInt(queryObj.workOrderId, 10),
        }),
        ...(typeof queryObj.invoiceId === 'string' && {
          invoiceId: parseInt(queryObj.invoiceId, 10),
        }),
      };
    }

    const spareParts = await this.prisma.sparePart.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return spareParts.map(this.mapToSparePart);
  }

  public async getById(id: number): Promise<SparePart | null> {
    const sparePart = await this.prisma.sparePart.findUnique({
      where: { id },
    });

    return sparePart ? this.mapToSparePart(sparePart) : null;
  }

  public async create(sparePart: SparePart): Promise<SparePart> {
    const newSparePart = await this.prisma.sparePart.create({
      data: {
        workOrderId: sparePart.workOrderId,
        invoiceId: sparePart.invoiceId ?? null,
        item: sparePart.item,
        quantity: sparePart.quantity,
        unitCost: sparePart.unitCost,
        unitValue: sparePart.unitValue,
        totalCost: sparePart.totalCost,
        totalInvoice: sparePart.totalInvoice,
        gananciaNeta: sparePart.gananciaNeta,
      },
    });

    return this.mapToSparePart(newSparePart);
  }

  public async update(id: number, sparePart: Partial<SparePart>): Promise<SparePart | null> {
    try {
      const updatedSparePart = await this.prisma.sparePart.update({
        where: { id },
        data: {
          ...(sparePart.workOrderId !== undefined && { workOrderId: sparePart.workOrderId }),
          ...(sparePart.invoiceId !== undefined && { invoiceId: sparePart.invoiceId }),
          ...(sparePart.item !== undefined && { item: sparePart.item }),
          ...(sparePart.quantity !== undefined && { quantity: sparePart.quantity }),
          ...(sparePart.unitCost !== undefined && { unitCost: sparePart.unitCost }),
          ...(sparePart.unitValue !== undefined && { unitValue: sparePart.unitValue }),
          ...(sparePart.totalCost !== undefined && { totalCost: sparePart.totalCost }),
          ...(sparePart.totalInvoice !== undefined && { totalInvoice: sparePart.totalInvoice }),
          ...(sparePart.gananciaNeta !== undefined && { gananciaNeta: sparePart.gananciaNeta }),
        },
      });

      return this.mapToSparePart(updatedSparePart);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  public async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.sparePart.delete({
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

  private mapToSparePart(prismaSparePart: {
    id: number;
    workOrderId: number;
    invoiceId: number | null;
    item: string;
    quantity: number;
    unitCost: Prisma.Decimal;
    unitValue: Prisma.Decimal;
    totalCost: Prisma.Decimal;
    totalInvoice: Prisma.Decimal;
    gananciaNeta: Prisma.Decimal;
    createdAt: Date;
    updatedAt: Date;
  }): SparePart {
    return {
      id: prismaSparePart.id,
      workOrderId: prismaSparePart.workOrderId,
      invoiceId: prismaSparePart.invoiceId ?? undefined,
      item: prismaSparePart.item,
      quantity: prismaSparePart.quantity,
      unitCost: Number(prismaSparePart.unitCost),
      unitValue: Number(prismaSparePart.unitValue),
      totalCost: Number(prismaSparePart.totalCost),
      totalInvoice: Number(prismaSparePart.totalInvoice),
      gananciaNeta: Number(prismaSparePart.gananciaNeta),
      createdAt: prismaSparePart.createdAt,
      updatedAt: prismaSparePart.updatedAt,
    };
  }
}
