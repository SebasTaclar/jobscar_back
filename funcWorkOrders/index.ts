import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import {
  getWorkOrderService,
  getVehicleService,
  getEmployeeService,
} from '../src/shared/serviceProvider';
import { withApiHandler } from '../src/shared/apiHandler';
import { validateAuthToken } from '../src/shared/authHelper';
import { AuthenticationError } from '../src/shared/exceptions';
import { verifyToken } from '../src/shared/jwtHelper';

const toWorkOrderResponse = (
  workOrder: {
    id: number;
    vehicleId: number;
    mechanicId?: number | null;
    status?: string;
    services?: string[];
    gases?: boolean;
    escaner?: boolean;
    observations?: string | null;
    diagnosis?: string | null;
    deliveryDate?: Date | null;
    garantia?: number | null;
    total?: number | null;
    createdAt?: Date;
    updatedAt?: Date;
  },
  vehicleData?: { plate: string; client: string },
  mechanicData?: { name: string }
) => ({
  id: workOrder.id,
  vehicleId: workOrder.vehicleId,
  mechanicId: workOrder.mechanicId,
  status: workOrder.status,
  services: workOrder.services,
  gases: workOrder.gases,
  escaner: workOrder.escaner,
  observations: workOrder.observations,
  diagnosis: workOrder.diagnosis,
  deliveryDate: workOrder.deliveryDate ? workOrder.deliveryDate.toISOString() : undefined,
  garantia: workOrder.garantia,
  total: workOrder.total,
  vehicle: vehicleData
    ? {
        plate: vehicleData.plate,
        client: vehicleData.client,
      }
    : undefined,
  mechanic: mechanicData ? { name: mechanicData.name } : undefined,
  createdAt: workOrder.createdAt ? workOrder.createdAt.toISOString() : undefined,
  updatedAt: workOrder.updatedAt ? workOrder.updatedAt.toISOString() : undefined,
});

const funcWorkOrders = async (
  _context: Context,
  req: HttpRequest,
  log: Logger
): Promise<unknown> => {
  const workOrderService = getWorkOrderService(log);
  const vehicleService = getVehicleService(log);
  const employeeService = getEmployeeService(log);
  const method = req.method?.toUpperCase();
  const workOrderId = req.params?.id;

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    throw new AuthenticationError('Unauthorized: Missing authorization header');
  }

  const token = validateAuthToken(authHeader);
  const userPayload = verifyToken(token);
  log.logInfo(`User authenticated successfully: ${userPayload.email}`);
  log.logInfo(`Processing ${method} request for work orders (authenticated)`, {
    workOrderId,
    userId: userPayload.id,
  });

  switch (method) {
    case 'GET': {
      if (workOrderId) {
        const workOrder = await workOrderService.getWorkOrderById(workOrderId);
        const vehicle = await vehicleService.getVehicleById(String(workOrder.vehicleId));
        const mechanic =
          workOrder.mechanicId !== undefined && workOrder.mechanicId !== null
            ? await employeeService.getEmployeeById(String(workOrder.mechanicId))
            : undefined;

        return ApiResponseBuilder.success(
          toWorkOrderResponse(
            workOrder,
            vehicle && { plate: vehicle.plate, client: vehicle.client },
            mechanic && { name: mechanic.name }
          ),
          'Work order retrieved successfully'
        );
      }

      const workOrders = await workOrderService.getAllWorkOrders(req.query);
      const workOrderResponses = await Promise.all(
        workOrders.map(async (wo) => {
          const vehicle = await vehicleService.getVehicleById(String(wo.vehicleId));
          const mechanic =
            wo.mechanicId !== undefined && wo.mechanicId !== null
              ? await employeeService.getEmployeeById(String(wo.mechanicId))
              : undefined;
          return toWorkOrderResponse(
            wo,
            vehicle && { plate: vehicle.plate, client: vehicle.client },
            mechanic && { name: mechanic.name }
          );
        })
      );

      return ApiResponseBuilder.success(
        {
          count: workOrderResponses.length,
          workOrders: workOrderResponses,
        },
        'Work orders retrieved successfully'
      );
    }

    case 'POST': {
      if (workOrderId) {
        return ApiResponseBuilder.validationError([
          'ID should not be provided when creating a work order',
        ]);
      }

      const newWorkOrder = await workOrderService.createWorkOrder(req.body);
      const vehicle = await vehicleService.getVehicleById(String(newWorkOrder.vehicleId));
      const mechanic =
        newWorkOrder.mechanicId !== undefined && newWorkOrder.mechanicId !== null
          ? await employeeService.getEmployeeById(String(newWorkOrder.mechanicId))
          : undefined;

      return ApiResponseBuilder.success(
        toWorkOrderResponse(
          newWorkOrder,
          vehicle && { plate: vehicle.plate, client: vehicle.client },
          mechanic && { name: mechanic.name }
        ),
        'Work order created successfully'
      );
    }

    case 'PUT': {
      if (!workOrderId) {
        return ApiResponseBuilder.validationError(['Work order ID is required for update']);
      }

      const updatedWorkOrder = await workOrderService.updateWorkOrder(workOrderId, req.body);
      const vehicle = await vehicleService.getVehicleById(String(updatedWorkOrder.vehicleId));
      const mechanic =
        updatedWorkOrder.mechanicId !== undefined && updatedWorkOrder.mechanicId !== null
          ? await employeeService.getEmployeeById(String(updatedWorkOrder.mechanicId))
          : undefined;

      return ApiResponseBuilder.success(
        toWorkOrderResponse(
          updatedWorkOrder,
          vehicle && { plate: vehicle.plate, client: vehicle.client },
          mechanic && { name: mechanic.name }
        ),
        'Work order updated successfully'
      );
    }

    case 'DELETE': {
      if (!workOrderId) {
        return ApiResponseBuilder.validationError(['Work order ID is required for deletion']);
      }

      await workOrderService.deleteWorkOrder(workOrderId);
      return ApiResponseBuilder.success(null, 'Work order deleted successfully');
    }

    default:
      return ApiResponseBuilder.validationError([`HTTP method ${method} not supported`]);
  }
};

export default withApiHandler(funcWorkOrders);
