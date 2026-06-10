import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../../config/PrismaClient';
import { IMoneyMovementDataSource } from '../../domain/interfaces/IMoneyMovementDataSource';
import { MoneyMovement } from '../../domain/entities/MoneyMovement';

export class MoneyMovementPrismaAdapter implements IMoneyMovementDataSource {
  private readonly prisma = getPrismaClient();

  public async getAll(query?: unknown): Promise<MoneyMovement[]> {
    let whereClause: Prisma.MoneyMovementWhereInput = {};

    if (query && typeof query === 'object') {
      const queryObj = query as Record<string, unknown>;

      whereClause = {
        ...(typeof queryObj.movement === 'string' && {
          movement: queryObj.movement,
        }),
        ...(typeof queryObj.account === 'string' && {
          account: queryObj.account,
        }),
        ...(typeof queryObj.name === 'string' && {
          name: { contains: queryObj.name, mode: 'insensitive' },
        }),
      };
    }

    const movements = await this.prisma.moneyMovement.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return movements.map(this.mapToMoneyMovement);
  }

  public async getById(id: number): Promise<MoneyMovement | null> {
    const movement = await this.prisma.moneyMovement.findUnique({
      where: { id },
    });

    return movement ? this.mapToMoneyMovement(movement) : null;
  }

  public async create(moneyMovement: MoneyMovement): Promise<MoneyMovement> {
    const newMovement = await this.prisma.moneyMovement.create({
      data: {
        reference: moneyMovement.reference ?? null,
        name: moneyMovement.name,
        concept: moneyMovement.concept,
        movement: moneyMovement.movement,
        amount: moneyMovement.amount,
        account: moneyMovement.account ?? null,
        observation: moneyMovement.observation ?? null,
      },
    });

    return this.mapToMoneyMovement(newMovement);
  }

  public async update(id: number, moneyMovement: Partial<MoneyMovement>): Promise<MoneyMovement | null> {
    try {
      const updatedMovement = await this.prisma.moneyMovement.update({
        where: { id },
        data: {
          ...(moneyMovement.reference !== undefined && { reference: moneyMovement.reference }),
          ...(moneyMovement.name !== undefined && { name: moneyMovement.name }),
          ...(moneyMovement.concept !== undefined && { concept: moneyMovement.concept }),
          ...(moneyMovement.movement !== undefined && { movement: moneyMovement.movement }),
          ...(moneyMovement.amount !== undefined && { amount: moneyMovement.amount }),
          ...(moneyMovement.account !== undefined && { account: moneyMovement.account }),
          ...(moneyMovement.observation !== undefined && { observation: moneyMovement.observation }),
        },
      });

      return this.mapToMoneyMovement(updatedMovement);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  public async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.moneyMovement.delete({
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

  private mapToMoneyMovement(prismaMoneyMovement: {
    id: number;
    reference: string | null;
    name: string;
    concept: string;
    movement: string;
    amount: Prisma.Decimal;
    account: string | null;
    observation: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): MoneyMovement {
    return {
      id: prismaMoneyMovement.id,
      reference: prismaMoneyMovement.reference ?? undefined,
      name: prismaMoneyMovement.name,
      concept: prismaMoneyMovement.concept,
      movement: prismaMoneyMovement.movement,
      amount: Number(prismaMoneyMovement.amount),
      account: prismaMoneyMovement.account ?? undefined,
      observation: prismaMoneyMovement.observation ?? undefined,
      createdAt: prismaMoneyMovement.createdAt,
      updatedAt: prismaMoneyMovement.updatedAt,
    };
  }
}
