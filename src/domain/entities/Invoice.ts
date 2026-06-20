export type InvoiceItem = {
  description: string;
  qty: number;
  price: number;
  isLabor: boolean;
  discountToTechnician: boolean;
};

export type Deposit = {
  amount: number;
  date: string;
  method: string;
};

export type Evidence = {
  type: string;
  url: string;
};

export type Invoice = {
  id: number;
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
  showEvidencesInPdf?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
