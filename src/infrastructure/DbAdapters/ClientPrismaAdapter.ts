import { getPrismaClient } from '../../config/PrismaClient';
import { IClientDataSource } from '../../domain/interfaces/IClientDataSource';
import { Client } from '../../domain/entities/Client';
import { Prisma } from '@prisma/client';

export class ClientPrismaAdapter implements IClientDataSource {
  private readonly prisma = getPrismaClient();

  public async getAll(query?: unknown): Promise<Client[]> {
    let whereClause: Prisma.ClientWhereInput = {};

    if (query && typeof query === 'object') {
      const queryObj = query as Record<string, unknown>;

      whereClause = {
        ...(typeof queryObj.name === 'string' && {
          name: { contains: queryObj.name, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.phone === 'string' && {
          phone: { contains: queryObj.phone, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.email === 'string' && {
          email: { contains: queryObj.email, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.isActive === 'string' && {
          isActive: queryObj.isActive === 'true',
        }),
      };
    }

    const clients = await this.prisma.client.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return clients.map(this.mapToClient);
  }

  public async getById(id: number): Promise<Client | null> {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    return client ? this.mapToClient(client) : null;
  }

  public async getByEmail(email: string): Promise<Client | null> {
    const client = await this.prisma.client.findUnique({
      where: { email },
    });

    return client ? this.mapToClient(client) : null;
  }

  public async getByPhone(phone: string): Promise<Client | null> {
    const client = await this.prisma.client.findFirst({
      where: { phone },
    });

    return client ? this.mapToClient(client) : null;
  }

  public async create(client: Client): Promise<Client> {
    const newClient = await this.prisma.client.create({
      data: {
        name: client.name,
        phone: client.phone,
        email: client.email,
        notes: client.notes ?? null,
        isActive: client.isActive,
      },
    });

    return this.mapToClient(newClient);
  }

  public async update(id: number, client: Partial<Client>): Promise<Client | null> {
    try {
      const updatedClient = await this.prisma.client.update({
        where: { id },
        data: {
          ...(client.name !== undefined && { name: client.name }),
          ...(client.phone !== undefined && { phone: client.phone }),
          ...(client.email !== undefined && { email: client.email }),
          ...(client.notes !== undefined && { notes: client.notes }),
          ...(client.isActive !== undefined && { isActive: client.isActive }),
        },
      });

      return this.mapToClient(updatedClient);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }

      throw error;
    }
  }

  public async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.client.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }

      throw error;
    }
  }

  private mapToClient(prismaClient: {
    id: number;
    name: string;
    phone: string;
    email: string;
    notes: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Client {
    return {
      id: prismaClient.id,
      name: prismaClient.name,
      phone: prismaClient.phone,
      email: prismaClient.email,
      notes: prismaClient.notes ?? undefined,
      isActive: prismaClient.isActive,
      createdAt: prismaClient.createdAt,
      updatedAt: prismaClient.updatedAt,
    };
  }
}
