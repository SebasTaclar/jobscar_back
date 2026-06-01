import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getClientService } from '../src/shared/serviceProvider';
import { withApiHandler } from '../src/shared/apiHandler';
import { validateAuthToken } from '../src/shared/authHelper';
import { AuthenticationError } from '../src/shared/exceptions';
import { verifyToken } from '../src/shared/jwtHelper';

const funcClients = async (_context: Context, req: HttpRequest, log: Logger): Promise<unknown> => {
  const clientService = getClientService(log);
  const method = req.method?.toUpperCase();
  const clientId = req.params?.id;

  if (method === 'GET') {
    log.logInfo(`Processing ${method} request for clients (public)`, { clientId });

    if (clientId) {
      const client = await clientService.getClientById(clientId);
      return ApiResponseBuilder.success(client, 'Client retrieved successfully');
    }

    const clients = await clientService.getAllClients(req.query);
    return ApiResponseBuilder.success(
      {
        count: clients.length,
        clients,
      },
      'Clients retrieved successfully'
    );
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader) {
    throw new AuthenticationError('Unauthorized: Missing authorization header');
  }

  const token = validateAuthToken(authHeader);
  const userPayload = verifyToken(token);

  log.logInfo(`User authenticated successfully: ${userPayload.email}`);
  log.logInfo(`Processing ${method} request for clients (authenticated)`, {
    clientId,
    userId: userPayload.id,
  });

  switch (method) {
    case 'POST': {
      if (clientId) {
        return ApiResponseBuilder.validationError([
          'ID should not be provided when creating a client',
        ]);
      }

      const newClient = await clientService.createClient(req.body);
      return ApiResponseBuilder.success(newClient, 'Client created successfully');
    }

    case 'PUT': {
      if (!clientId) {
        return ApiResponseBuilder.validationError(['Client ID is required for update']);
      }

      const updatedClient = await clientService.updateClient(clientId, req.body);
      return ApiResponseBuilder.success(updatedClient, 'Client updated successfully');
    }

    case 'DELETE':
      if (!clientId) {
        return ApiResponseBuilder.validationError(['Client ID is required for deletion']);
      }

      await clientService.deleteClient(clientId);
      return ApiResponseBuilder.success(null, 'Client deleted successfully');

    default:
      return ApiResponseBuilder.validationError([`HTTP method ${method} not supported`]);
  }
};

export default withApiHandler(funcClients);
