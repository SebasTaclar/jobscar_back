import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getEmployeeService } from '../src/shared/serviceProvider';
import { withApiHandler } from '../src/shared/apiHandler';
import { validateAuthToken } from '../src/shared/authHelper';
import { AuthenticationError } from '../src/shared/exceptions';
import { verifyToken } from '../src/shared/jwtHelper';

const toEmployeeResponse = (employee: {
  id: number;
  name: string;
  role?: string;
  specialty?: string;
  email?: string;
  phone: string;
  status?: string;
  entryDate?: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}) => ({
  id: employee.id,
  name: employee.name,
  role: employee.role,
  specialty: employee.specialty,
  email: employee.email,
  phone: employee.phone,
  status: employee.status,
  entryDate: employee.entryDate ? employee.entryDate.toISOString() : undefined,
  notes: employee.notes,
  createdAt: employee.createdAt ? employee.createdAt.toISOString() : undefined,
  updatedAt: employee.updatedAt ? employee.updatedAt.toISOString() : undefined,
});

const funcEmployees = async (
  _context: Context,
  req: HttpRequest,
  log: Logger
): Promise<unknown> => {
  const employeeService = getEmployeeService(log);
  const method = req.method?.toUpperCase();
  const employeeId = req.params?.id;

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    throw new AuthenticationError('Unauthorized: Missing authorization header');
  }

  const token = validateAuthToken(authHeader);
  const userPayload = verifyToken(token);

  if (method === 'GET') {
    log.logInfo(`User authenticated successfully: ${userPayload.email}`);
    log.logInfo(`Processing ${method} request for employees (authenticated)`, {
      employeeId,
      userId: userPayload.id,
    });

    if (employeeId) {
      const employee = await employeeService.getEmployeeById(employeeId);

      return ApiResponseBuilder.success(
        toEmployeeResponse(employee),
        'Employee retrieved successfully'
      );
    }

    const employees = await employeeService.getAllEmployees(req.query);
    return ApiResponseBuilder.success(
      {
        count: employees.length,
        employees: employees.map(toEmployeeResponse),
      },
      'Employees retrieved successfully'
    );
  }

  log.logInfo(`User authenticated successfully: ${userPayload.email}`);
  log.logInfo(`Processing ${method} request for employees (authenticated)`, {
    employeeId,
    userId: userPayload.id,
  });

  switch (method) {
    case 'POST': {
      if (employeeId) {
        return ApiResponseBuilder.validationError([
          'ID should not be provided when creating an employee',
        ]);
      }

      const newEmployee = await employeeService.createEmployee(req.body);
      return ApiResponseBuilder.success(
        toEmployeeResponse(newEmployee),
        'Employee created successfully'
      );
    }

    case 'PUT': {
      if (!employeeId) {
        return ApiResponseBuilder.validationError(['Employee ID is required for update']);
      }

      const updatedEmployee = await employeeService.updateEmployee(employeeId, req.body);
      return ApiResponseBuilder.success(
        toEmployeeResponse(updatedEmployee),
        'Employee updated successfully'
      );
    }

    case 'DELETE': {
      if (!employeeId) {
        return ApiResponseBuilder.validationError(['Employee ID is required for deletion']);
      }

      await employeeService.deleteEmployee(employeeId);
      return ApiResponseBuilder.success(null, 'Employee deleted successfully');
    }

    default:
      return ApiResponseBuilder.validationError([`HTTP method ${method} not supported`]);
  }
};

export default withApiHandler(funcEmployees);
