import { WorkOrder } from '../entities/WorkOrder';

export interface IWorkOrderDataSource {
  getAll(query?: unknown): Promise<WorkOrder[]>;
  getById(id: number): Promise<WorkOrder | null>;
  create(workOrder: WorkOrder): Promise<WorkOrder>;
  update(id: number, workOrder: Partial<WorkOrder>): Promise<WorkOrder | null>;
  delete(id: number): Promise<boolean>;
}
