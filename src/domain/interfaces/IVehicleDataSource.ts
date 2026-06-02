import { Vehicle } from '../entities/Vehicle';

export interface IVehicleDataSource {
  getAll(query?: unknown): Promise<Vehicle[]>;
  getById(id: number): Promise<Vehicle | null>;
  create(vehicle: Vehicle): Promise<Vehicle>;
  update(id: number, vehicle: Partial<Vehicle>): Promise<Vehicle | null>;
  delete(id: number): Promise<boolean>;
}
