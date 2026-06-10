import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getSparePartService } from '../src/shared/serviceProvider';
import { withApiHandler } from '../src/shared/apiHandler';
import { validateAuthToken } from '../src/shared/authHelper';
import { AuthenticationError } from '../src/shared/exceptions';
import { verifyToken } from '../src/shared/jwtHelper';

const toSparePartResponse = (sparePart: {
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
}) => ({
  id: sparePart.id,
  workOrderId: sparePart.workOrderId,
  invoiceId: sparePart.invoiceId ?? null,
  item: sparePart.item,
  quantity: sparePart.quantity,
  unitCost: sparePart.unitCost,
  unitValue: sparePart.unitValue,
  totalCost: sparePart.totalCost,
  totalInvoice: sparePart.totalInvoice,
  gananciaNeta: sparePart.gananciaNeta,
  createdAt: sparePart.createdAt ? sparePart.createdAt.toISOString() : '',
  updatedAt: sparePart.updatedAt ? sparePart.updatedAt.toISOString() : '',
});

const funcSpareParts = async (_context: Context, req: HttpRequest, log: Logger): Promise<unknown> => {
  const sparePartService = getSparePartService(log);
  const method = req.method?.toUpperCase();
  const sparePartId = req.params?.id;

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    throw new AuthenticationError('Unauthorized: Missing authorization header');
  }

  const token = validateAuthToken(authHeader);
  const userPayload = verifyToken(token);
  log.logInfo(`User authenticated successfully: ${userPayload.email}`);
  log.logInfo(`Processing ${method} request for spare parts (authenticated)`, {
    sparePartId,
    userId: userPayload.id,
  });

  switch (method) {
    case 'GET': {
      if (sparePartId) {
        const sparePart = await sparePartService.getSparePartById(sparePartId);
        return ApiResponseBuilder.success(
          toSparePartResponse(sparePart),
          'SparePart retrieved successfully'
        );
      }

      const spareParts = await sparePartService.getAllSpareParts(req.query);
      return ApiResponseBuilder.success(
        {
          count: spareParts.length,
          spareParts: spareParts.map(toSparePartResponse),
        },
        'SpareParts retrieved successfully'
      );
    }

    case 'POST': {
      if (sparePartId) {
        return ApiResponseBuilder.validationError([
          'ID should not be provided when creating a spare part',
        ]);
      }

      const newSparePart = await sparePartService.createSparePart(req.body);
      return ApiResponseBuilder.success(
        toSparePartResponse(newSparePart),
        'SparePart created successfully'
      );
    }

    case 'PUT': {
      if (!sparePartId) {
        return ApiResponseBuilder.validationError(['SparePart ID is required for update']);
      }

      const updatedSparePart = await sparePartService.updateSparePart(sparePartId, req.body);
      return ApiResponseBuilder.success(
        toSparePartResponse(updatedSparePart),
        'SparePart updated successfully'
      );
    }

    case 'DELETE': {
      if (!sparePartId) {
        return ApiResponseBuilder.validationError(['SparePart ID is required for deletion']);
      }

      await sparePartService.deleteSparePart(sparePartId);
      return ApiResponseBuilder.success(null, 'SparePart deleted successfully');
    }

    default:
      return ApiResponseBuilder.validationError([`HTTP method ${method} not supported`]);
  }
};

export default withApiHandler(funcSpareParts);
