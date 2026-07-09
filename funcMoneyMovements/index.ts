import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getMoneyMovementService } from '../src/shared/serviceProvider';
import { withApiHandler } from '../src/shared/apiHandler';
import { validateAuthToken } from '../src/shared/authHelper';
import { AuthenticationError } from '../src/shared/exceptions';
import { verifyToken } from '../src/shared/jwtHelper';

const toMoneyMovementResponse = (movement: {
  id: number;
  reference?: string;
  name: string;
  concept: string;
  movement: string;
  amount: number;
  account?: string;
  observation?: string;
  date?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}) => ({
  id: movement.id,
  reference: movement.reference ?? null,
  name: movement.name,
  concept: movement.concept,
  movement: movement.movement,
  amount: movement.amount,
  account: movement.account ?? null,
  observation: movement.observation ?? null,
  date: movement.date ? movement.date.toISOString() : null,
  createdAt: movement.createdAt ? movement.createdAt.toISOString() : '',
  updatedAt: movement.updatedAt ? movement.updatedAt.toISOString() : '',
});

const funcMoneyMovements = async (_context: Context, req: HttpRequest, log: Logger): Promise<unknown> => {
  const moneyMovementService = getMoneyMovementService(log);
  const method = req.method?.toUpperCase();
  const movementId = req.params?.id;

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    throw new AuthenticationError('Unauthorized: Missing authorization header');
  }

  const token = validateAuthToken(authHeader);
  const userPayload = verifyToken(token);
  log.logInfo(`User authenticated successfully: ${userPayload.email}`);
  log.logInfo(`Processing ${method} request for money movements (authenticated)`, {
    movementId,
    userId: userPayload.id,
  });

  switch (method) {
    case 'GET': {
      if (movementId) {
        const movement = await moneyMovementService.getMoneyMovementById(movementId);
        return ApiResponseBuilder.success(
          toMoneyMovementResponse(movement),
          'MoneyMovement retrieved successfully'
        );
      }

      const movements = await moneyMovementService.getAllMoneyMovements(req.query);
      return ApiResponseBuilder.success(
        {
          count: movements.length,
          moneyMovements: movements.map(toMoneyMovementResponse),
        },
        'MoneyMovements retrieved successfully'
      );
    }

    case 'POST': {
      if (movementId) {
        return ApiResponseBuilder.validationError([
          'ID should not be provided when creating a money movement',
        ]);
      }

      const newMovement = await moneyMovementService.createMoneyMovement(req.body);
      return ApiResponseBuilder.success(
        toMoneyMovementResponse(newMovement),
        'MoneyMovement created successfully'
      );
    }

    case 'PUT': {
      if (!movementId) {
        return ApiResponseBuilder.validationError(['MoneyMovement ID is required for update']);
      }

      const updatedMovement = await moneyMovementService.updateMoneyMovement(movementId, req.body);
      return ApiResponseBuilder.success(
        toMoneyMovementResponse(updatedMovement),
        'MoneyMovement updated successfully'
      );
    }

    case 'DELETE': {
      if (!movementId) {
        return ApiResponseBuilder.validationError(['MoneyMovement ID is required for deletion']);
      }

      await moneyMovementService.deleteMoneyMovement(movementId);
      return ApiResponseBuilder.success(null, 'MoneyMovement deleted successfully');
    }

    default:
      return ApiResponseBuilder.validationError([`HTTP method ${method} not supported`]);
  }
};

export default withApiHandler(funcMoneyMovements);
