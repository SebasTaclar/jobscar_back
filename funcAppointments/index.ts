import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getAppointmentService } from '../src/shared/serviceProvider';
import { withApiHandler } from '../src/shared/apiHandler';
import { validateAuthToken } from '../src/shared/authHelper';
import { AuthenticationError } from '../src/shared/exceptions';
import { verifyToken } from '../src/shared/jwtHelper';

const funcAppointments = async (
  _context: Context,
  req: HttpRequest,
  log: Logger
): Promise<unknown> => {
  const appointmentService = getAppointmentService(log);
  const method = req.method?.toUpperCase();
  const appointmentId = req.params?.id;

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    throw new AuthenticationError('Unauthorized: Missing authorization header');
  }

  const token = validateAuthToken(authHeader);
  const userPayload = verifyToken(token);

  log.logInfo(`User authenticated successfully: ${userPayload.email}`);
  log.logInfo(`Processing ${method} request for appointments (authenticated)`, {
    appointmentId,
    userId: userPayload.id,
  });

  switch (method) {
    case 'GET': {
      if (appointmentId) {
        const appointment = await appointmentService.getAppointmentById(appointmentId);
        return ApiResponseBuilder.success(appointment, 'Appointment retrieved successfully');
      }

      const appointments = await appointmentService.getAllAppointments(req.query);
      return ApiResponseBuilder.success(
        {
          count: appointments.length,
          appointments,
        },
        'Appointments retrieved successfully'
      );
    }

    case 'POST': {
      if (appointmentId) {
        return ApiResponseBuilder.validationError([
          'ID should not be provided when creating an appointment',
        ]);
      }

      const newAppointment = await appointmentService.createAppointment(req.body);
      return ApiResponseBuilder.success(newAppointment, 'Appointment created successfully');
    }

    case 'PUT': {
      if (!appointmentId) {
        return ApiResponseBuilder.validationError(['Appointment ID is required for update']);
      }

      const updatedAppointment = await appointmentService.updateAppointment(
        appointmentId,
        req.body
      );
      return ApiResponseBuilder.success(updatedAppointment, 'Appointment updated successfully');
    }

    case 'DELETE': {
      if (!appointmentId) {
        return ApiResponseBuilder.validationError(['Appointment ID is required for deletion']);
      }

      await appointmentService.deleteAppointment(appointmentId);
      return ApiResponseBuilder.success(null, 'Appointment deleted successfully');
    }

    default:
      return ApiResponseBuilder.validationError([`HTTP method ${method} not supported`]);
  }
};

export default withApiHandler(funcAppointments);
