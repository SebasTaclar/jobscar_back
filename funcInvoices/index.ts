import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getInvoiceService } from '../src/shared/serviceProvider';
import { withApiHandler } from '../src/shared/apiHandler';
import { validateAuthToken } from '../src/shared/authHelper';
import { AuthenticationError } from '../src/shared/exceptions';
import { verifyToken } from '../src/shared/jwtHelper';

const toInvoiceResponse = (invoice: {
  id: number;
  workOrderId?: number | null;
  items?: { description: string; qty: number; price: number; isLabor: boolean }[] | null;
  taxPct?: boolean | null;
  discount?: number | null;
  retention?: number | null;
  deposits?: { amount: number; date: string; method: string }[] | null;
  formaDePago?: string | null;
  status?: string | null;
  notes?: string | null;
  evidences?: { type: string; url: string }[] | null;
  createdAt?: Date;
  updatedAt?: Date;
  clientName?: string;
  vehicleInfo?: string;
  placa?: string;
  total: number;
  abono: number;
  saldo: number;
}) => ({
  id: invoice.id,
  clientName: invoice.clientName ?? '',
  fechaCreacion: invoice.createdAt ? invoice.createdAt.toISOString() : '',
  vehiculo: invoice.vehicleInfo ?? '',
  placa: invoice.placa ?? '',
  total: invoice.total,
  abono: invoice.abono,
  saldo: invoice.saldo,
  workOrderId: invoice.workOrderId ?? undefined,
  items: invoice.items ?? undefined,
  taxPct: invoice.taxPct ?? undefined,
  discount: invoice.discount ?? 0,
  retention: invoice.retention ?? 0,
  deposits: invoice.deposits ?? undefined,
  formaDePago: invoice.formaDePago ?? '',
  status: invoice.status ?? 'Pendiente',
  notes: invoice.notes ?? undefined,
  evidences: invoice.evidences ?? [],
  createdAt: invoice.createdAt ? invoice.createdAt.toISOString() : '',
  updatedAt: invoice.updatedAt ? invoice.updatedAt.toISOString() : '',
});

const funcInvoices = async (_context: Context, req: HttpRequest, log: Logger): Promise<unknown> => {
  const invoiceService = getInvoiceService(log);
  const method = req.method?.toUpperCase();
  const invoiceId = req.params?.id;

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    throw new AuthenticationError('Unauthorized: Missing authorization header');
  }

  const token = validateAuthToken(authHeader);
  const userPayload = verifyToken(token);
  log.logInfo(`User authenticated successfully: ${userPayload.email}`);
  log.logInfo(`Processing ${method} request for invoices (authenticated)`, {
    invoiceId,
    userId: userPayload.id,
  });

  switch (method) {
    case 'GET': {
      if (invoiceId) {
        const invoice = await invoiceService.getInvoiceById(invoiceId);
        return ApiResponseBuilder.success(
          toInvoiceResponse(invoice),
          'Invoice retrieved successfully'
        );
      }

      const invoices = await invoiceService.getAllInvoices(req.query);
      return ApiResponseBuilder.success(
        {
          count: invoices.length,
          invoices: invoices.map(toInvoiceResponse),
        },
        'Invoices retrieved successfully'
      );
    }

    case 'POST': {
      if (invoiceId) {
        return ApiResponseBuilder.validationError([
          'ID should not be provided when creating an invoice',
        ]);
      }

      const newInvoice = await invoiceService.createInvoice(req.body);
      return ApiResponseBuilder.success(
        toInvoiceResponse(newInvoice),
        'Invoice created successfully'
      );
    }

    case 'PUT': {
      if (!invoiceId) {
        return ApiResponseBuilder.validationError(['Invoice ID is required for update']);
      }

      const updatedInvoice = await invoiceService.updateInvoice(invoiceId, req.body);
      return ApiResponseBuilder.success(
        toInvoiceResponse(updatedInvoice),
        'Invoice updated successfully'
      );
    }

    case 'DELETE': {
      if (!invoiceId) {
        return ApiResponseBuilder.validationError(['Invoice ID is required for deletion']);
      }

      await invoiceService.deleteInvoice(invoiceId);
      return ApiResponseBuilder.success(null, 'Invoice deleted successfully');
    }

    default:
      return ApiResponseBuilder.validationError([`HTTP method ${method} not supported`]);
  }
};

export default withApiHandler(funcInvoices);
