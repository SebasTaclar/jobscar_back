import { Logger } from '../../shared/Logger';
import { NotFoundError, ValidationError } from '../../shared/exceptions';
import { IEmployeeDataSource } from '../../domain/interfaces/IEmployeeDataSource';
import { Employee } from '../../domain/entities/Employee';

export interface CreateEmployeeRequest {
  name: string;
  role?: string;
  specialty?: string;
  email?: string;
  phone: string;
  status?: string;
  entryDate?: string;
  notes?: string;
}

export interface UpdateEmployeeRequest {
  name?: string;
  role?: string;
  specialty?: string;
  email?: string;
  phone?: string;
  status?: string;
  entryDate?: string | null;
  notes?: string | null;
}

export class EmployeeService {
  private logger: Logger;
  private employeeDataSource: IEmployeeDataSource;

  constructor(logger: Logger, employeeDataSource: IEmployeeDataSource) {
    this.logger = logger;
    this.employeeDataSource = employeeDataSource;
  }

  async getAllEmployees(query?: unknown): Promise<Employee[]> {
    this.logger.logInfo('Getting all employees');

    try {
      const employees = await this.employeeDataSource.getAll(query);
      this.logger.logInfo(`Retrieved ${employees.length} employees`);
      return employees;
    } catch (error) {
      this.logger.logError('Error getting employees', error);
      throw error;
    }
  }

  async getEmployeeById(id: string): Promise<Employee> {
    this.logger.logInfo(`Getting employee by id: ${id}`);

    if (!id) {
      throw new ValidationError('Employee ID is required');
    }

    const employeeId = parseInt(id, 10);
    if (Number.isNaN(employeeId)) {
      throw new ValidationError('Employee ID must be a valid number');
    }

    try {
      const employee = await this.employeeDataSource.getById(employeeId);
      if (!employee) {
        this.logger.logWarning(`Employee not found with id: ${id}`);
        throw new NotFoundError('Employee not found');
      }

      this.logger.logInfo(`Retrieved employee: ${employee.name}`);
      return employee;
    } catch (error) {
      this.logger.logError(`Error getting employee by id: ${id}`, error);
      throw error;
    }
  }

  async createEmployee(createRequest: CreateEmployeeRequest): Promise<Employee> {
    this.logger.logInfo(`Creating employee: ${createRequest?.name || 'unknown'}`);

    const normalizedEmployee = this.normalizeCreateRequest(createRequest);

    if (!normalizedEmployee.name || !normalizedEmployee.phone) {
      throw new ValidationError('Name and phone are required');
    }

    if (normalizedEmployee.email && !this.isValidEmail(normalizedEmployee.email)) {
      throw new ValidationError('Email must be a valid email address');
    }

    try {
      const employeeData: Employee = {
        id: 0,
        name: normalizedEmployee.name,
        role: normalizedEmployee.role,
        specialty: normalizedEmployee.specialty,
        email: normalizedEmployee.email,
        phone: normalizedEmployee.phone,
        status: normalizedEmployee.status || 'Activo',
        entryDate: this.parseEntryDate(normalizedEmployee.entryDate),
        notes: normalizedEmployee.notes,
      };

      const newEmployee = await this.employeeDataSource.create(employeeData);
      this.logger.logInfo(
        `Employee created successfully: ${newEmployee.name} (ID: ${newEmployee.id})`
      );
      return newEmployee;
    } catch (error) {
      this.logger.logError(`Error creating employee: ${normalizedEmployee.name}`, error);
      throw error;
    }
  }

  async updateEmployee(id: string, updateRequest: UpdateEmployeeRequest): Promise<Employee> {
    this.logger.logInfo(`Updating employee with id: ${id}`);

    if (!id) {
      throw new ValidationError('Employee ID is required');
    }

    const employeeId = parseInt(id, 10);
    if (Number.isNaN(employeeId)) {
      throw new ValidationError('Employee ID must be a valid number');
    }

    const normalizedUpdateRequest = this.normalizeUpdateRequest(updateRequest);
    if (Object.keys(normalizedUpdateRequest).length === 0) {
      throw new ValidationError('At least one field must be provided for update');
    }

    if (
      normalizedUpdateRequest.email !== undefined &&
      normalizedUpdateRequest.email !== null &&
      normalizedUpdateRequest.email !== '' &&
      !this.isValidEmail(normalizedUpdateRequest.email)
    ) {
      throw new ValidationError('Email must be a valid email address');
    }

    try {
      const existingEmployee = await this.employeeDataSource.getById(employeeId);
      if (!existingEmployee) {
        this.logger.logWarning(`Employee update failed: employee not found with id ${id}`);
        throw new NotFoundError('Employee not found');
      }

      const updatedEmployee = await this.employeeDataSource.update(
        employeeId,
        this.buildEmployeeUpdatePayload(normalizedUpdateRequest)
      );

      if (!updatedEmployee) {
        this.logger.logWarning(`Employee update failed: employee not found with id ${id}`);
        throw new NotFoundError('Employee not found');
      }

      this.logger.logInfo(`Employee updated successfully: ${updatedEmployee.name} (ID: ${id})`);
      return updatedEmployee;
    } catch (error) {
      this.logger.logError(`Error updating employee with id: ${id}`, error);
      throw error;
    }
  }

  async deleteEmployee(id: string): Promise<boolean> {
    this.logger.logInfo(`Deleting employee with id: ${id}`);

    if (!id) {
      throw new ValidationError('Employee ID is required');
    }

    const employeeId = parseInt(id, 10);
    if (Number.isNaN(employeeId)) {
      throw new ValidationError('Employee ID must be a valid number');
    }

    try {
      const deleted = await this.employeeDataSource.delete(employeeId);
      if (!deleted) {
        this.logger.logWarning(`Employee deletion failed: employee not found with id ${id}`);
        throw new NotFoundError('Employee not found');
      }

      this.logger.logInfo(`Employee deleted successfully with id: ${id}`);
      return true;
    } catch (error) {
      this.logger.logError(`Error deleting employee with id: ${id}`, error);
      throw error;
    }
  }

  private normalizeCreateRequest(createRequest: CreateEmployeeRequest): CreateEmployeeRequest {
    return {
      name: typeof createRequest?.name === 'string' ? createRequest.name.trim() : '',
      role: typeof createRequest?.role === 'string' ? createRequest.role.trim() : undefined,
      specialty:
        typeof createRequest?.specialty === 'string' ? createRequest.specialty.trim() : undefined,
      email:
        typeof createRequest?.email === 'string'
          ? createRequest.email.trim().toLowerCase()
          : undefined,
      phone: typeof createRequest?.phone === 'string' ? createRequest.phone.trim() : '',
      status: typeof createRequest?.status === 'string' ? createRequest.status.trim() : undefined,
      entryDate:
        typeof createRequest?.entryDate === 'string'
          ? createRequest.entryDate.trim() || undefined
          : undefined,
      notes:
        typeof createRequest?.notes === 'string'
          ? createRequest.notes.trim() || undefined
          : undefined,
    };
  }

  private normalizeUpdateRequest(updateRequest: UpdateEmployeeRequest): UpdateEmployeeRequest {
    const normalizedRequest: UpdateEmployeeRequest = {};

    if (typeof updateRequest?.name === 'string') {
      normalizedRequest.name = updateRequest.name.trim();
    }

    if (typeof updateRequest?.role === 'string') {
      normalizedRequest.role = updateRequest.role.trim();
    }

    if (typeof updateRequest?.specialty === 'string') {
      normalizedRequest.specialty = updateRequest.specialty.trim();
    }

    if (typeof updateRequest?.email === 'string') {
      normalizedRequest.email = updateRequest.email.trim().toLowerCase();
    }

    if (typeof updateRequest?.phone === 'string') {
      normalizedRequest.phone = updateRequest.phone.trim();
    }

    if (typeof updateRequest?.status === 'string') {
      normalizedRequest.status = updateRequest.status.trim();
    }

    if (updateRequest?.entryDate !== undefined) {
      normalizedRequest.entryDate =
        typeof updateRequest.entryDate === 'string'
          ? updateRequest.entryDate.trim() || undefined
          : updateRequest.entryDate;
    }

    if (updateRequest?.notes !== undefined) {
      normalizedRequest.notes =
        typeof updateRequest.notes === 'string'
          ? updateRequest.notes.trim() || null
          : updateRequest.notes;
    }

    return normalizedRequest;
  }

  private buildEmployeeUpdatePayload(updateRequest: UpdateEmployeeRequest): Partial<Employee> {
    const payload: Partial<Employee> = {};

    if (updateRequest.name !== undefined) {
      payload.name = updateRequest.name;
    }
    if (updateRequest.role !== undefined) {
      payload.role = updateRequest.role;
    }
    if (updateRequest.specialty !== undefined) {
      payload.specialty = updateRequest.specialty;
    }
    if (updateRequest.email !== undefined) {
      payload.email = updateRequest.email;
    }
    if (updateRequest.phone !== undefined) {
      payload.phone = updateRequest.phone;
    }
    if (updateRequest.status !== undefined) {
      payload.status = updateRequest.status;
    }
    if (updateRequest.entryDate !== undefined) {
      payload.entryDate = this.parseEntryDate(updateRequest.entryDate ?? undefined);
    }
    if (updateRequest.notes !== undefined) {
      payload.notes = updateRequest.notes;
    }

    return payload;
  }

  private parseEntryDate(value?: string): Date {
    if (!value) {
      return new Date();
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new ValidationError('Entry date must be a valid date');
    }

    return parsedDate;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
