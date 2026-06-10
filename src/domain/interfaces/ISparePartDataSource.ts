import { SparePart } from '../entities/SparePart';

export interface ISparePartDataSource {
  getAll(query?: unknown): Promise<SparePart[]>;
  getById(id: number): Promise<SparePart | null>;
  create(sparePart: SparePart): Promise<SparePart>;
  update(id: number, sparePart: Partial<SparePart>): Promise<SparePart | null>;
  delete(id: number): Promise<boolean>;
}
