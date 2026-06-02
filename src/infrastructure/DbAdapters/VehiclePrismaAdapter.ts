import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../../config/PrismaClient';
import { IVehicleDataSource } from '../../domain/interfaces/IVehicleDataSource';
import { Vehicle } from '../../domain/entities/Vehicle';

export class VehiclePrismaAdapter implements IVehicleDataSource {
  private readonly prisma = getPrismaClient();

  public async getAll(query?: unknown): Promise<Vehicle[]> {
    let whereClause: Prisma.VehicleWhereInput = {};

    if (query && typeof query === 'object') {
      const queryObj = query as Record<string, unknown>;

      whereClause = {
        ...(typeof queryObj.client === 'string' && {
          client: { contains: queryObj.client, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.plate === 'string' && {
          plate: { contains: queryObj.plate, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.brand === 'string' && {
          brand: { contains: queryObj.brand, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.model === 'string' && {
          model: { contains: queryObj.model, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.vehicleType === 'string' && {
          vehicleType: { contains: queryObj.vehicleType, mode: 'insensitive' as const },
        }),
      };
    }

    const vehicles = await this.prisma.vehicle.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return vehicles.map(this.mapToVehicle);
  }

  public async getById(id: number): Promise<Vehicle | null> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    return vehicle ? this.mapToVehicle(vehicle) : null;
  }

  public async create(vehicle: Vehicle): Promise<Vehicle> {
    const newVehicle = await this.prisma.vehicle.create({
      data: {
        clientId: vehicle.clientId ?? null,
        client: vehicle.client,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year ?? null,
        km: vehicle.km,
        vehicleType: vehicle.vehicleType,
        lastServiceDate: vehicle.lastServiceDate ?? null,
        nextServiceKm: vehicle.nextServiceKm ?? null,
        observations: vehicle.observations ?? null,
      },
    });

    return this.mapToVehicle(newVehicle);
  }

  public async update(id: number, vehicle: Partial<Vehicle>): Promise<Vehicle | null> {
    try {
      const updatedVehicle = await this.prisma.vehicle.update({
        where: { id },
        data: {
          ...(vehicle.clientId !== undefined && { clientId: vehicle.clientId }),
          ...(vehicle.client !== undefined && { client: vehicle.client }),
          ...(vehicle.plate !== undefined && { plate: vehicle.plate }),
          ...(vehicle.brand !== undefined && { brand: vehicle.brand }),
          ...(vehicle.model !== undefined && { model: vehicle.model }),
          ...(vehicle.year !== undefined && { year: vehicle.year }),
          ...(vehicle.km !== undefined && { km: vehicle.km }),
          ...(vehicle.vehicleType !== undefined && { vehicleType: vehicle.vehicleType }),
          ...(vehicle.lastServiceDate !== undefined && {
            lastServiceDate: vehicle.lastServiceDate,
          }),
          ...(vehicle.nextServiceKm !== undefined && { nextServiceKm: vehicle.nextServiceKm }),
          ...(vehicle.observations !== undefined && { observations: vehicle.observations }),
        },
      });

      return this.mapToVehicle(updatedVehicle);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }

      throw error;
    }
  }

  public async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.vehicle.delete({
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

  private mapToVehicle(prismaVehicle: {
    id: number;
    clientId: number | null;
    client: string;
    plate: string;
    brand: string;
    model: string;
    year: number | null;
    km: number;
    vehicleType: string;
    lastServiceDate: Date | null;
    nextServiceKm: number | null;
    observations: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Vehicle {
    return {
      id: prismaVehicle.id,
      clientId: prismaVehicle.clientId ?? undefined,
      client: prismaVehicle.client,
      plate: prismaVehicle.plate,
      brand: prismaVehicle.brand,
      model: prismaVehicle.model,
      year: prismaVehicle.year ?? undefined,
      km: prismaVehicle.km,
      vehicleType: prismaVehicle.vehicleType,
      lastServiceDate: prismaVehicle.lastServiceDate ?? undefined,
      nextServiceKm: prismaVehicle.nextServiceKm ?? undefined,
      observations: prismaVehicle.observations ?? undefined,
      createdAt: prismaVehicle.createdAt,
      updatedAt: prismaVehicle.updatedAt,
    };
  }
}
