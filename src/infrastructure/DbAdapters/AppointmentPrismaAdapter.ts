import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../../config/PrismaClient';
import { IAppointmentDataSource } from '../../domain/interfaces/IAppointmentDataSource';
import { Appointment } from '../../domain/entities/Appointment';

export class AppointmentPrismaAdapter implements IAppointmentDataSource {
  private readonly prisma = getPrismaClient();

  public async getAll(query?: unknown): Promise<Appointment[]> {
    let whereClause: Prisma.AppointmentWhereInput = {};

    if (query && typeof query === 'object') {
      const queryObj = query as Record<string, unknown>;

      if (typeof queryObj.date === 'string' && queryObj.date.trim()) {
        const dateValue = new Date(queryObj.date);
        if (!Number.isNaN(dateValue.getTime())) {
          whereClause = {
            ...whereClause,
            date: dateValue,
          };
        }
      }

      if (typeof queryObj.plate === 'string' && queryObj.plate.trim()) {
        whereClause = {
          ...whereClause,
          plate: { contains: queryObj.plate.trim(), mode: 'insensitive' },
        };
      }

      if (typeof queryObj.client === 'string' && queryObj.client.trim()) {
        whereClause = {
          ...whereClause,
          client: { contains: queryObj.client.trim(), mode: 'insensitive' },
        };
      }
    }

    const appointments = await this.prisma.appointment.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    });

    return appointments.map(this.mapToAppointment);
  }

  public async getById(id: number): Promise<Appointment | null> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    return appointment ? this.mapToAppointment(appointment) : null;
  }

  public async create(appointment: Appointment): Promise<Appointment> {
    const newAppointment = await this.prisma.appointment.create({
      data: {
        date: appointment.date,
        plate: appointment.plate ?? null,
        client: appointment.client ?? null,
        subject: appointment.subject ?? null,
      },
    });

    return this.mapToAppointment(newAppointment);
  }

  public async update(id: number, appointment: Partial<Appointment>): Promise<Appointment | null> {
    try {
      const updatedAppointment = await this.prisma.appointment.update({
        where: { id },
        data: {
          ...(appointment.date !== undefined && { date: appointment.date }),
          ...(appointment.plate !== undefined && { plate: appointment.plate }),
          ...(appointment.client !== undefined && { client: appointment.client }),
          ...(appointment.subject !== undefined && { subject: appointment.subject }),
        },
      });

      return this.mapToAppointment(updatedAppointment);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  public async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.appointment.delete({ where: { id } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  private mapToAppointment(prismaAppointment: {
    id: number;
    date: Date;
    plate: string | null;
    client: string | null;
    subject: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Appointment {
    return {
      id: prismaAppointment.id,
      date: prismaAppointment.date,
      plate: prismaAppointment.plate ?? undefined,
      client: prismaAppointment.client ?? undefined,
      subject: prismaAppointment.subject ?? undefined,
      createdAt: prismaAppointment.createdAt,
      updatedAt: prismaAppointment.updatedAt,
    };
  }
}
