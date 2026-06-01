import { Client } from '../entities/Client';

export interface IClientDataSource {
  getAll(query?: unknown): Promise<Client[]>;
  getById(id: number): Promise<Client | null>;
  getByEmail(email: string): Promise<Client | null>;
  getByPhone(phone: string): Promise<Client | null>;
  create(client: Client): Promise<Client>;
  update(id: number, client: Partial<Client>): Promise<Client | null>;
  delete(id: number): Promise<boolean>;
}
