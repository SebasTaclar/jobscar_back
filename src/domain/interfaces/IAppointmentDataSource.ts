import { Appointment } from '../entities/Appointment';

export interface IAppointmentDataSource {
  getAll(query?: unknown): Promise<Appointment[]>;
  getById(id: number): Promise<Appointment | null>;
  create(appointment: Appointment): Promise<Appointment>;
  update(id: number, appointment: Partial<Appointment>): Promise<Appointment | null>;
  delete(id: number): Promise<boolean>;
}
