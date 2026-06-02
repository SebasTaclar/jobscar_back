import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../../config/PrismaClient';
import { IEmployeeDataSource } from '../../domain/interfaces/IEmployeeDataSource';
import { Employee } from '../../domain/entities/Employee';

export class EmployeePrismaAdapter implements IEmployeeDataSource {
  private readonly prisma = getPrismaClient();

  public async getAll(query?: unknown): Promise<Employee[]> {
    let whereClause: Prisma.EmployeeWhereInput = {};

    if (query && typeof query === 'object') {
      const queryObj = query as Record<string, unknown>;

      whereClause = {
        ...(typeof queryObj.name === 'string' && {
          name: { contains: queryObj.name, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.role === 'string' && {
          role: { contains: queryObj.role, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.specialty === 'string' && {
          specialty: { contains: queryObj.specialty, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.email === 'string' && {
          email: { contains: queryObj.email, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.phone === 'string' && {
          phone: { contains: queryObj.phone, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.status === 'string' && {
          status: { contains: queryObj.status, mode: 'insensitive' as const },
        }),
      };
    }

    const employees = await this.prisma.employee.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        role: true,
        specialty: true,
        email: true,
        phone: true,
        status: true,
        entryDate: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return employees as unknown as Employee[];
  }

  public async getById(id: number): Promise<Employee | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        specialty: true,
        email: true,
        phone: true,
        status: true,
        entryDate: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return employee as unknown as Employee | null;
  }

  public async create(employee: Employee): Promise<Employee> {
    const newEmployee = await this.prisma.employee.create({
      data: {
        name: employee.name,
        role: employee.role,
        specialty: employee.specialty,
        email: employee.email,
        phone: employee.phone,
        status: employee.status ?? 'Activo',
        entryDate: employee.entryDate,
        notes: employee.notes,
      },
      select: {
        id: true,
        name: true,
        role: true,
        specialty: true,
        email: true,
        phone: true,
        status: true,
        entryDate: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return newEmployee as Employee;
  }

  public async update(id: number, employee: Partial<Employee>): Promise<Employee | null> {
    try {
      const updatedEmployee = await this.prisma.employee.update({
        where: { id },
        data: {
          ...(employee.name !== undefined && { name: employee.name }),
          ...(employee.role !== undefined && { role: employee.role }),
          ...(employee.specialty !== undefined && { specialty: employee.specialty }),
          ...(employee.email !== undefined && { email: employee.email }),
          ...(employee.phone !== undefined && { phone: employee.phone }),
          ...(employee.status !== undefined && { status: employee.status }),
          ...(employee.entryDate !== undefined && { entryDate: employee.entryDate }),
          ...(employee.notes !== undefined && { notes: employee.notes }),
        },
        select: {
          id: true,
          name: true,
          role: true,
          specialty: true,
          email: true,
          phone: true,
          status: true,
          entryDate: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedEmployee as Employee;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  public async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.employee.delete({
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
}
