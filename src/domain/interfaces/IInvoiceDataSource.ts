import { Invoice } from '../entities/Invoice';

export interface IInvoiceDataSource {
  getAll(query?: unknown): Promise<Invoice[]>;
  getById(id: number): Promise<Invoice | null>;
  getByWorkOrderId(workOrderId: number): Promise<Invoice | null>;
  create(invoice: Invoice): Promise<Invoice>;
  update(id: number, invoice: Partial<Invoice>): Promise<Invoice | null>;
  delete(id: number): Promise<boolean>;
}
