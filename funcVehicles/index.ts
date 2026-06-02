import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getVehicleService } from '../src/shared/serviceProvider';
import { withApiHandler } from '../src/shared/apiHandler';
import { validateAuthToken } from '../src/shared/authHelper';
import { AuthenticationError } from '../src/shared/exceptions';
import { verifyToken } from '../src/shared/jwtHelper';

const toVehicleResponse = (vehicle: {
  id: number;
  clientId?: number | null;
  client: string;
  plate: string;
  brand: string;
  model: string;
  year?: number | null;
  km: number;
  vehicleType: string;
  lastServiceDate?: Date | null;
  nextServiceKm?: number | null;
  observations?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}) => ({
  id: vehicle.id,
  clientId: vehicle.clientId ?? undefined,
  client: vehicle.client,
  plate: vehicle.plate,
  brand: vehicle.brand,
  model: vehicle.model,
  year: vehicle.year ?? undefined,
  km: vehicle.km,
  vehicleType: vehicle.vehicleType,
  registrationDate: vehicle.createdAt ? vehicle.createdAt.toISOString() : '',
  lastServiceDate: vehicle.lastServiceDate ? vehicle.lastServiceDate.toISOString() : undefined,
  nextServiceKm: vehicle.nextServiceKm ?? undefined,
  observations: vehicle.observations ?? undefined,
  createdAt: vehicle.createdAt ? vehicle.createdAt.toISOString() : '',
  updatedAt: vehicle.updatedAt ? vehicle.updatedAt.toISOString() : '',
});

const funcVehicles = async (_context: Context, req: HttpRequest, log: Logger): Promise<unknown> => {
  const vehicleService = getVehicleService(log);
  const method = req.method?.toUpperCase();
  const vehicleId = req.params?.id;

  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader) {
    throw new AuthenticationError('Unauthorized: Missing authorization header');
  }

  const token = validateAuthToken(authHeader);
  const userPayload = verifyToken(token);

  if (method === 'GET') {
    log.logInfo(`User authenticated successfully: ${userPayload.email}`);
    log.logInfo(`Processing ${method} request for vehicles (authenticated)`, {
      vehicleId,
      userId: userPayload.id,
    });

    if (vehicleId) {
      const vehicle = await vehicleService.getVehicleById(vehicleId);
      return ApiResponseBuilder.success(
        toVehicleResponse(vehicle),
        'Vehicle retrieved successfully'
      );
    }

    const vehicles = await vehicleService.getAllVehicles(req.query);
    return ApiResponseBuilder.success(
      {
        count: vehicles.length,
        vehicles: vehicles.map(toVehicleResponse),
      },
      'Vehicles retrieved successfully'
    );
  }

  log.logInfo(`User authenticated successfully: ${userPayload.email}`);
  log.logInfo(`Processing ${method} request for vehicles (authenticated)`, {
    vehicleId,
    userId: userPayload.id,
  });

  switch (method) {
    case 'POST': {
      if (vehicleId) {
        return ApiResponseBuilder.validationError([
          'ID should not be provided when creating a vehicle',
        ]);
      }

      const newVehicle = await vehicleService.createVehicle(req.body);
      return ApiResponseBuilder.success(
        toVehicleResponse(newVehicle),
        'Vehicle created successfully'
      );
    }

    case 'PUT': {
      if (!vehicleId) {
        return ApiResponseBuilder.validationError(['Vehicle ID is required for update']);
      }

      const updatedVehicle = await vehicleService.updateVehicle(vehicleId, req.body);
      return ApiResponseBuilder.success(
        toVehicleResponse(updatedVehicle),
        'Vehicle updated successfully'
      );
    }

    case 'DELETE':
      if (!vehicleId) {
        return ApiResponseBuilder.validationError(['Vehicle ID is required for deletion']);
      }

      await vehicleService.deleteVehicle(vehicleId);
      return ApiResponseBuilder.success(null, 'Vehicle deleted successfully');

    default:
      return ApiResponseBuilder.validationError([`HTTP method ${method} not supported`]);
  }
};

export default withApiHandler(funcVehicles);
