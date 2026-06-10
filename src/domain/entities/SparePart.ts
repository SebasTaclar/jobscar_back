export type SparePart = {
  id: number;
  workOrderId: number;
  invoiceId?: number | null;
  item: string;
  quantity: number;
  unitCost: number;
  unitValue: number;
  totalCost: number;
  totalInvoice: number;
  gananciaNeta: number;
  createdAt?: Date;
  updatedAt?: Date;
};
