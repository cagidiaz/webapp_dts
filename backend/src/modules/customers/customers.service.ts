import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todos los clientes ordenados por nombre.
   */
  async getAll() {
    try {
      return await this.prisma.customers.findMany({
        orderBy: { name: 'asc' },
      });
    } catch (error) {
       throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene un cliente por su ID (UUID).
   */
  async getById(id: string) {
    try {
      const customer = await this.prisma.customers.findUnique({
        where: { id },
      });
      if (!customer) throw new NotFoundException('Cliente no encontrado');
      return customer;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene un cliente por su client_id (Navision code).
   */
  async getByClientId(clientId: string) {
    try {
      const customer = await this.prisma.customers.findUnique({
        where: { client_id: clientId },
      });
      if (!customer) throw new NotFoundException('Cliente no encontrado');
      return customer;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }
}
