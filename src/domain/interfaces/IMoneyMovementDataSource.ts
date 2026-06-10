import { MoneyMovement } from '../entities/MoneyMovement';

export interface IMoneyMovementDataSource {
  getAll(query?: unknown): Promise<MoneyMovement[]>;
  getById(id: number): Promise<MoneyMovement | null>;
  create(moneyMovement: MoneyMovement): Promise<MoneyMovement>;
  update(id: number, moneyMovement: Partial<MoneyMovement>): Promise<MoneyMovement | null>;
  delete(id: number): Promise<boolean>;
}
