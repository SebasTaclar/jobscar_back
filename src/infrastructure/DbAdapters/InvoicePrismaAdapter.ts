import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../../config/PrismaClient';
import { IInvoiceDataSource } from '../../domain/interfaces/IInvoiceDataSource';
import { Invoice, InvoiceItem, Deposit } from '../../domain/entities/Invoice';

export class InvoicePrismaAdapter implements IInvoiceDataSource {
  private readonly prisma = getPrismaClient();

  public async getAll(query?: unknown): Promise<Invoice[]> {
    let whereClause: Prisma.InvoiceWhereInput = {};

    if (query && typeof query === 'object') {
      const queryObj = query as Record<string, unknown>;

      whereClause = {
        ...(typeof queryObj.status === 'string' && {
          status: { contains: queryObj.status, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.workOrderId === 'string' && {
          workOrderId: parseInt(queryObj.workOrderId, 10),
        }),
      };
    }

    const invoices = await this.prisma.invoice.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map(this.mapToInvoice);
  }

  public async getById(id: number): Promise<Invoice | null> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    return invoice ? this.mapToInvoice(invoice) : null;
  }

  public async getByWorkOrderId(workOrderId: number): Promise<Invoice | null> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { workOrderId },
    });

    return invoice ? this.mapToInvoice(invoice) : null;
  }

  public async create(invoice: Invoice): Promise<Invoice> {
    const newInvoice = await this.prisma.invoice.create({
      data: {
        workOrderId: invoice.workOrderId ?? null,
        items: invoice.items ? JSON.stringify(invoice.items) : null,
        taxPct: invoice.taxPct ?? null,
        discount: invoice.discount ?? null,
        retention: invoice.retention ?? null,
        deposits: invoice.deposits ? JSON.stringify(invoice.deposits) : null,
        formaDePago: invoice.formaDePago ?? null,
        status: invoice.status ?? 'Pendiente',
        notes: invoice.notes ?? null,
      },
    });

    return this.mapToInvoice(newInvoice);
  }

  public async update(id: number, invoice: Partial<Invoice>): Promise<Invoice | null> {
    try {
      const updatedInvoice = await this.prisma.invoice.update({
        where: { id },
        data: {
          ...(invoice.workOrderId !== undefined && { workOrderId: invoice.workOrderId }),
          ...(invoice.items !== undefined && {
            items: invoice.items ? JSON.stringify(invoice.items) : null,
          }),
          ...(invoice.taxPct !== undefined && { taxPct: invoice.taxPct }),
          ...(invoice.discount !== undefined && { discount: invoice.discount }),
          ...(invoice.retention !== undefined && { retention: invoice.retention }),
          ...(invoice.deposits !== undefined && {
            deposits: invoice.deposits ? JSON.stringify(invoice.deposits) : null,
          }),
          ...(invoice.formaDePago !== undefined && { formaDePago: invoice.formaDePago }),
          ...(invoice.status !== undefined && { status: invoice.status }),
          ...(invoice.notes !== undefined && { notes: invoice.notes }),
        },
      });

      return this.mapToInvoice(updatedInvoice);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  public async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.invoice.delete({
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

  private mapToInvoice(prismaInvoice: {
    id: number;
    workOrderId: number | null;
    items: string | null;
    taxPct: boolean | null;
    discount: Prisma.Decimal | null;
    retention: Prisma.Decimal | null;
    deposits: string | null;
    formaDePago: string | null;
    status: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Invoice {
    return {
      id: prismaInvoice.id,
      workOrderId: prismaInvoice.workOrderId ?? undefined,
      items: prismaInvoice.items ? (JSON.parse(prismaInvoice.items) as InvoiceItem[]) : undefined,
      taxPct: prismaInvoice.taxPct ?? undefined,
      discount: prismaInvoice.discount ? Number(prismaInvoice.discount) : undefined,
      retention: prismaInvoice.retention ? Number(prismaInvoice.retention) : undefined,
      deposits: prismaInvoice.deposits
        ? (JSON.parse(prismaInvoice.deposits) as Deposit[])
        : undefined,
      formaDePago: prismaInvoice.formaDePago ?? undefined,
      status: prismaInvoice.status,
      notes: prismaInvoice.notes ?? undefined,
      createdAt: prismaInvoice.createdAt,
      updatedAt: prismaInvoice.updatedAt,
    };
  }
}
