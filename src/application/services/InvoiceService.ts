import { Logger } from '../../shared/Logger';
import { NotFoundError, ValidationError } from '../../shared/exceptions';
import { IInvoiceDataSource } from '../../domain/interfaces/IInvoiceDataSource';
import { IWorkOrderDataSource } from '../../domain/interfaces/IWorkOrderDataSource';
import { IVehicleDataSource } from '../../domain/interfaces/IVehicleDataSource';
import { IClientDataSource } from '../../domain/interfaces/IClientDataSource';
import { Invoice, InvoiceItem, Deposit, Evidence } from '../../domain/entities/Invoice';

export interface CreateInvoiceRequest {
  workOrderId?: number;
  items?: InvoiceItem[];
  taxPct?: boolean;
  discount?: number;
  retention?: number;
  deposits?: Deposit[];
  formaDePago?: string;
  status?: string;
  notes?: string;
  evidences?: Evidence[];
  showEvidencesInPdf?: boolean;
}

export interface UpdateInvoiceRequest {
  workOrderId?: number | null;
  items?: InvoiceItem[] | null;
  taxPct?: boolean | null;
  discount?: number | null;
  retention?: number | null;
  deposits?: Deposit[] | null;
  formaDePago?: string | null;
  status?: string | null;
  notes?: string | null;
  evidences?: Evidence[] | null;
  showEvidencesInPdf?: boolean | null;
}

export interface VehicleInfo {
  client: string;
  plate: string;
  brand: string;
  model: string;
}

export interface InvoiceWithDetails extends Invoice {
  clientName?: string;
  vehicleInfo?: string;
  placa?: string;
  total: number;
  abono: number;
  saldo: number;
}

export class InvoiceService {
  private logger: Logger;
  private invoiceDataSource: IInvoiceDataSource;
  private workOrderDataSource: IWorkOrderDataSource;
  private vehicleDataSource: IVehicleDataSource;
  private clientDataSource: IClientDataSource;

  constructor(
    logger: Logger,
    invoiceDataSource: IInvoiceDataSource,
    workOrderDataSource: IWorkOrderDataSource,
    vehicleDataSource: IVehicleDataSource,
    clientDataSource: IClientDataSource
  ) {
    this.logger = logger;
    this.invoiceDataSource = invoiceDataSource;
    this.workOrderDataSource = workOrderDataSource;
    this.vehicleDataSource = vehicleDataSource;
    this.clientDataSource = clientDataSource;
  }

  async getAllInvoices(query?: unknown): Promise<InvoiceWithDetails[]> {
    this.logger.logInfo('Getting all invoices');

    try {
      const invoices = await this.invoiceDataSource.getAll(query);
      const result = await Promise.all(
        invoices.map((inv) => this.enrichInvoice(inv))
      );
      this.logger.logInfo(`Retrieved ${result.length} invoices`);
      return result;
    } catch (error) {
      this.logger.logError('Error getting invoices', error);
      throw error;
    }
  }

  async getInvoiceById(id: string): Promise<InvoiceWithDetails> {
    this.logger.logInfo(`Getting invoice by id: ${id}`);

    if (!id) {
      throw new ValidationError('Invoice ID is required');
    }

    const invoiceId = parseInt(id, 10);
    if (Number.isNaN(invoiceId)) {
      throw new ValidationError('Invoice ID must be a valid number');
    }

    try {
      const invoice = await this.invoiceDataSource.getById(invoiceId);
      if (!invoice) {
        this.logger.logWarning(`Invoice not found with id: ${id}`);
        throw new NotFoundError('Invoice not found');
      }

      const enriched = await this.enrichInvoice(invoice);
      this.logger.logInfo(`Retrieved invoice: ${enriched.id}`);
      return enriched;
    } catch (error) {
      this.logger.logError(`Error getting invoice by id: ${id}`, error);
      throw error;
    }
  }

  async createInvoice(createRequest: CreateInvoiceRequest): Promise<InvoiceWithDetails> {
    this.logger.logInfo('Creating invoice');

    const normalized = this.normalizeCreateRequest(createRequest);

    if (normalized.workOrderId) {
      const workOrder = await this.workOrderDataSource.getById(normalized.workOrderId);
      if (!workOrder) {
        throw new ValidationError(`Work order with id ${normalized.workOrderId} does not exist`);
      }
    }

    try {
      const invoiceData: Invoice = {
        id: 0,
        workOrderId: normalized.workOrderId,
        items: normalized.items,
        taxPct: normalized.taxPct,
        discount: normalized.discount,
        retention: normalized.retention,
        deposits: normalized.deposits,
        formaDePago: normalized.formaDePago,
        status: normalized.status ?? 'Pendiente',
        notes: normalized.notes,
        evidences: normalized.evidences,
        showEvidencesInPdf: normalized.showEvidencesInPdf,
      };

      const newInvoice = await this.invoiceDataSource.create(invoiceData);
      this.logger.logInfo(`Invoice created successfully: ID ${newInvoice.id}`);

      return this.enrichInvoice(newInvoice);
    } catch (error) {
      this.logger.logError('Error creating invoice', error);
      throw error;
    }
  }

  async updateInvoice(id: string, updateRequest: UpdateInvoiceRequest): Promise<InvoiceWithDetails> {
    this.logger.logInfo(`Updating invoice with id: ${id}`);

    if (!id) {
      throw new ValidationError('Invoice ID is required');
    }

    const invoiceId = parseInt(id, 10);
    if (Number.isNaN(invoiceId)) {
      throw new ValidationError('Invoice ID must be a valid number');
    }

    const normalized = this.normalizeUpdateRequest(updateRequest);

    if (Object.keys(normalized).length === 0) {
      throw new ValidationError('At least one field must be provided for update');
    }

    if (normalized.workOrderId) {
      const workOrder = await this.workOrderDataSource.getById(normalized.workOrderId);
      if (!workOrder) {
        throw new ValidationError(`Work order with id ${normalized.workOrderId} does not exist`);
      }
    }

    try {
      const existing = await this.invoiceDataSource.getById(invoiceId);
      if (!existing) {
        this.logger.logWarning(`Invoice update failed: invoice not found with id ${id}`);
        throw new NotFoundError('Invoice not found');
      }

      const updatedInvoice = await this.invoiceDataSource.update(
        invoiceId,
        this.buildUpdatePayload(normalized)
      );

      if (!updatedInvoice) {
        this.logger.logError(`Invoice update failed: invoice not found with id ${id}`);
        throw new NotFoundError('Invoice not found');
      }

      this.logger.logInfo(`Invoice updated successfully: ID ${id}`);
      return this.enrichInvoice(updatedInvoice);
    } catch (error) {
      this.logger.logError(`Error updating invoice with id: ${id}`, error);
      throw error;
    }
  }

  async deleteInvoice(id: string): Promise<boolean> {
    this.logger.logInfo(`Deleting invoice with id: ${id}`);

    if (!id) {
      throw new ValidationError('Invoice ID is required');
    }

    const invoiceId = parseInt(id, 10);
    if (Number.isNaN(invoiceId)) {
      throw new ValidationError('Invoice ID must be a valid number');
    }

    try {
      const deleted = await this.invoiceDataSource.delete(invoiceId);
      if (!deleted) {
        this.logger.logWarning(`Invoice deletion failed: invoice not found with id ${id}`);
        throw new NotFoundError('Invoice not found');
      }

      this.logger.logInfo(`Invoice deleted successfully with id: ${id}`);
      return true;
    } catch (error) {
      this.logger.logError(`Error deleting invoice with id: ${id}`, error);
      throw error;
    }
  }

  private async enrichInvoice(invoice: Invoice): Promise<InvoiceWithDetails> {
    let clientName: string | undefined;
    let vehicleInfo: string | undefined;
    let placa: string | undefined;

    if (invoice.workOrderId) {
      try {
        const workOrder = await this.workOrderDataSource.getById(invoice.workOrderId);
        if (workOrder) {
          const vehicle = await this.vehicleDataSource.getById(workOrder.vehicleId);
          if (vehicle) {
            vehicleInfo = `${vehicle.brand} ${vehicle.model}`;
            placa = vehicle.plate;
            if (vehicle.clientId) {
              const client = await this.clientDataSource.getById(vehicle.clientId);
              clientName = client?.name ?? vehicle.client;
            } else {
              clientName = vehicle.client;
            }
          }
        }
      } catch {
        // skip enrichment if work order or vehicle not found
      }
    }

    const itemsTotal =
      invoice.items?.reduce((sum, item) => sum + item.qty * item.price, 0) ?? 0;

    const taxAmount = invoice.taxPct ? Math.round(itemsTotal * 0.19) : 0;

    const discountAmount = invoice.discount ?? 0;
    const retentionAmount = invoice.retention ?? 0;

    const total = itemsTotal + taxAmount - discountAmount - retentionAmount;

    const abono =
      invoice.deposits?.reduce((sum, d) => sum + d.amount, 0) ?? 0;

    const saldo = total - abono;

    return {
      ...invoice,
      clientName,
      vehicleInfo,
      placa,
      total,
      abono,
      saldo,
    };
  }

  private normalizeCreateRequest(req: CreateInvoiceRequest): CreateInvoiceRequest {
    return {
      workOrderId:
        typeof req?.workOrderId === 'number' && Number.isFinite(req.workOrderId)
          ? req.workOrderId
          : undefined,
      items: Array.isArray(req?.items)
        ? req.items.map((item) => ({
            description: typeof item.description === 'string' ? item.description.trim() : '',
            qty: typeof item.qty === 'number' && Number.isFinite(item.qty) ? item.qty : 1,
            price: typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0,
            isLabor: typeof item.isLabor === 'boolean' ? item.isLabor : false,
            discountToTechnician: typeof item.discountToTechnician === 'boolean' ? item.discountToTechnician : true,
          }))
        : undefined,
      taxPct: typeof req?.taxPct === 'boolean' ? req.taxPct : undefined,
      discount:
        typeof req?.discount === 'number' && Number.isFinite(req.discount) ? req.discount : undefined,
      retention:
        typeof req?.retention === 'number' && Number.isFinite(req.retention)
          ? req.retention
          : undefined,
      deposits: Array.isArray(req?.deposits)
        ? req.deposits.map((d) => ({
            amount: typeof d.amount === 'number' && Number.isFinite(d.amount) ? d.amount : 0,
            date: typeof d.date === 'string' ? d.date.trim() : '',
            method: typeof d.method === 'string' ? d.method.trim() : '',
          }))
        : undefined,
      formaDePago:
        typeof req?.formaDePago === 'string' ? req.formaDePago.trim() || undefined : undefined,
      status: typeof req?.status === 'string' ? req.status.trim() || undefined : undefined,
      notes: typeof req?.notes === 'string' ? req.notes.trim() || undefined : undefined,
      evidences: Array.isArray(req?.evidences)
        ? req.evidences
            .filter(
              (e) => typeof e?.type === 'string' && typeof e?.url === 'string' && e.url.trim() !== ''
            )
            .map((e) => ({
              type: e.type.trim(),
              url: e.url.trim(),
            }))
        : undefined,
      showEvidencesInPdf: typeof req?.showEvidencesInPdf === 'boolean' ? req.showEvidencesInPdf : undefined,
    };
  }

  private normalizeUpdateRequest(req: UpdateInvoiceRequest): UpdateInvoiceRequest {
    const normalized: UpdateInvoiceRequest = {};

    if (req?.workOrderId !== undefined) {
      normalized.workOrderId =
        req.workOrderId === null
          ? null
          : Number.isFinite(req.workOrderId)
            ? req.workOrderId
            : undefined;
    }

    if (req?.items !== undefined) {
      normalized.items = Array.isArray(req.items)
        ? req.items.map((item) => ({
            description: typeof item.description === 'string' ? item.description.trim() : '',
            qty: typeof item.qty === 'number' && Number.isFinite(item.qty) ? item.qty : 1,
            price: typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0,
            isLabor: typeof item.isLabor === 'boolean' ? item.isLabor : false,
            discountToTechnician: typeof item.discountToTechnician === 'boolean' ? item.discountToTechnician : true,
          }))
        : null;
    }

    if (req?.taxPct !== undefined) {
      normalized.taxPct = req.taxPct === null ? null : req.taxPct;
    }

    if (req?.discount !== undefined) {
      normalized.discount = req.discount === null ? null : this.normalizeNumber(req.discount);
    }

    if (req?.retention !== undefined) {
      normalized.retention = req.retention === null ? null : this.normalizeNumber(req.retention);
    }

    if (req?.deposits !== undefined) {
      normalized.deposits = Array.isArray(req.deposits)
        ? req.deposits.map((d) => ({
            amount: typeof d.amount === 'number' && Number.isFinite(d.amount) ? d.amount : 0,
            date: typeof d.date === 'string' ? d.date.trim() : '',
            method: typeof d.method === 'string' ? d.method.trim() : '',
          }))
        : null;
    }

    if (req?.formaDePago !== undefined) {
      normalized.formaDePago = req.formaDePago === null ? null : req.formaDePago.trim() || null;
    }

    if (req?.status !== undefined) {
      normalized.status = req.status === null ? null : req.status.trim() || null;
    }

    if (req?.notes !== undefined) {
      normalized.notes = req.notes === null ? null : req.notes.trim() || null;
    }

    if (req?.evidences !== undefined) {
      normalized.evidences = Array.isArray(req.evidences)
        ? req.evidences
            .filter(
              (e) => typeof e?.type === 'string' && typeof e?.url === 'string' && e.url.trim() !== ''
            )
            .map((e) => ({
              type: e.type.trim(),
              url: e.url.trim(),
            }))
        : null;
    }

    if (req?.showEvidencesInPdf !== undefined) {
      normalized.showEvidencesInPdf = req.showEvidencesInPdf === null ? null : req.showEvidencesInPdf;
    }

    return normalized;
  }

  private buildUpdatePayload(req: UpdateInvoiceRequest): Partial<Invoice> {
    const payload: Partial<Invoice> = {};

    if (req.workOrderId !== undefined) payload.workOrderId = req.workOrderId;
    if (req.items !== undefined) payload.items = req.items;
    if (req.taxPct !== undefined) payload.taxPct = req.taxPct;
    if (req.discount !== undefined) payload.discount = req.discount;
    if (req.retention !== undefined) payload.retention = req.retention;
    if (req.deposits !== undefined) payload.deposits = req.deposits;
    if (req.formaDePago !== undefined) payload.formaDePago = req.formaDePago;
    if (req.status !== undefined) payload.status = req.status;
    if (req.notes !== undefined) payload.notes = req.notes;
    if (req.evidences !== undefined) payload.evidences = req.evidences;
    if (req.showEvidencesInPdf !== undefined) payload.showEvidencesInPdf = req.showEvidencesInPdf;

    return payload;
  }

  private normalizeNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  }
}
