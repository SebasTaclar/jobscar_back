import { Logger } from '../../shared/Logger';
import { ValidationError, NotFoundError } from '../../shared/exceptions';
import { IAppointmentDataSource } from '../../domain/interfaces/IAppointmentDataSource';
import { Appointment } from '../../domain/entities/Appointment';

export interface CreateAppointmentRequest {
  date: string;
  plate?: string;
  client?: string;
  subject?: string;
}

export interface UpdateAppointmentRequest {
  date?: string;
  plate?: string | null;
  client?: string | null;
  subject?: string | null;
}

export class AppointmentService {
  private logger: Logger;
  private appointmentDataSource: IAppointmentDataSource;

  constructor(logger: Logger, appointmentDataSource: IAppointmentDataSource) {
    this.logger = logger;
    this.appointmentDataSource = appointmentDataSource;
  }

  async getAllAppointments(query?: unknown): Promise<Appointment[]> {
    this.logger.logInfo('Getting all appointments');

    try {
      const appointments = await this.appointmentDataSource.getAll(query);
      this.logger.logInfo(`Retrieved ${appointments.length} appointments`);
      return appointments;
    } catch (error) {
      this.logger.logError('Error getting appointments', error);
      throw error;
    }
  }

  async getAppointmentById(id: string): Promise<Appointment> {
    this.logger.logInfo(`Getting appointment by id: ${id}`);

    if (!id) {
      throw new ValidationError('Appointment ID is required');
    }

    const appointmentId = parseInt(id, 10);
    if (Number.isNaN(appointmentId)) {
      throw new ValidationError('Appointment ID must be a valid number');
    }

    const appointment = await this.appointmentDataSource.getById(appointmentId);
    if (!appointment) {
      this.logger.logWarning(`Appointment not found with id: ${id}`);
      throw new NotFoundError('Appointment not found');
    }

    return appointment;
  }

  async createAppointment(createRequest: CreateAppointmentRequest): Promise<Appointment> {
    this.logger.logInfo('Creating appointment', { request: createRequest });

    const normalizedRequest = this.normalizeCreateRequest(createRequest);

    if (!normalizedRequest.date) {
      throw new ValidationError('Date is required');
    }

    const appointmentData: Appointment = {
      id: 0,
      date: normalizedRequest.date,
      plate: normalizedRequest.plate,
      client: normalizedRequest.client,
      subject: normalizedRequest.subject,
    };

    try {
      const appointment = await this.appointmentDataSource.create(appointmentData);
      this.logger.logInfo(`Appointment created successfully: ID ${appointment.id}`);
      return appointment;
    } catch (error) {
      this.logger.logError('Error creating appointment', error);
      throw error;
    }
  }

  async updateAppointment(
    id: string,
    updateRequest: UpdateAppointmentRequest
  ): Promise<Appointment> {
    this.logger.logInfo(`Updating appointment id: ${id}`, { request: updateRequest });

    if (!id) {
      throw new ValidationError('Appointment ID is required');
    }

    const appointmentId = parseInt(id, 10);
    if (Number.isNaN(appointmentId)) {
      throw new ValidationError('Appointment ID must be a valid number');
    }

    const normalizedRequest = this.normalizeUpdateRequest(updateRequest);
    if (Object.keys(normalizedRequest).length === 0) {
      throw new ValidationError('At least one field must be provided for update');
    }

    const existingAppointment = await this.appointmentDataSource.getById(appointmentId);
    if (!existingAppointment) {
      this.logger.logWarning(`Appointment update failed: appointment not found with id ${id}`);
      throw new NotFoundError('Appointment not found');
    }

    const updatedAppointment = await this.appointmentDataSource.update(
      appointmentId,
      normalizedRequest
    );

    if (!updatedAppointment) {
      throw new NotFoundError('Appointment not found');
    }

    this.logger.logInfo(`Appointment updated successfully: ID ${id}`);
    return updatedAppointment;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    this.logger.logInfo(`Deleting appointment id: ${id}`);

    if (!id) {
      throw new ValidationError('Appointment ID is required');
    }

    const appointmentId = parseInt(id, 10);
    if (Number.isNaN(appointmentId)) {
      throw new ValidationError('Appointment ID must be a valid number');
    }

    const deleted = await this.appointmentDataSource.delete(appointmentId);
    if (!deleted) {
      this.logger.logWarning(`Appointment deletion failed: appointment not found with id ${id}`);
      throw new NotFoundError('Appointment not found');
    }

    this.logger.logInfo(`Appointment deleted successfully: ID ${id}`);
    return true;
  }

  private normalizeCreateRequest(createRequest: CreateAppointmentRequest): {
    date: Date;
    plate?: string;
    client?: string;
    subject?: string;
  } {
    const parsedDate = this.parseDate(createRequest.date);

    return {
      date: parsedDate,
      plate:
        typeof createRequest.plate === 'string' && createRequest.plate.trim()
          ? createRequest.plate.trim()
          : undefined,
      client:
        typeof createRequest.client === 'string' && createRequest.client.trim()
          ? createRequest.client.trim()
          : undefined,
      subject:
        typeof createRequest.subject === 'string' && createRequest.subject.trim()
          ? createRequest.subject.trim()
          : undefined,
    };
  }

  private normalizeUpdateRequest(updateRequest: UpdateAppointmentRequest): Partial<Appointment> {
    const normalized: Partial<Appointment> = {};

    if (updateRequest.date !== undefined) {
      normalized.date = this.parseDate(updateRequest.date);
    }

    if (updateRequest.plate !== undefined) {
      normalized.plate = updateRequest.plate?.trim() || null;
    }

    if (updateRequest.client !== undefined) {
      normalized.client = updateRequest.client?.trim() || null;
    }

    if (updateRequest.subject !== undefined) {
      normalized.subject = updateRequest.subject?.trim() || null;
    }

    return normalized;
  }

  private parseDate(dateValue?: string): Date {
    if (!dateValue || typeof dateValue !== 'string') {
      throw new ValidationError('Date must be provided as a valid string');
    }

    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new ValidationError('Date must be a valid ISO date string');
    }

    return parsedDate;
  }
}
