import { Employee } from '../entities/Employee';

export interface IEmployeeDataSource {
  getAll(query?: unknown): Promise<Employee[]>;
  getById(id: number): Promise<Employee | null>;
  create(employee: Employee): Promise<Employee>;
  update(id: number, employee: Partial<Employee>): Promise<Employee | null>;
  delete(id: number): Promise<boolean>;
}
