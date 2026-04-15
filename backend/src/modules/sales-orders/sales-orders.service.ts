import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SalesOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todos los pedidos de venta con soporte para filtros y búsqueda.
   */
  async getAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    customerCode?: string;
    itemCode?: string;
  } = {}) {
    const { skip, take, search, customerCode, itemCode } = params;

    const where: any = {};
    const and: any[] = [];

    if (search) {
      and.push({
        OR: [
          { document_number: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (customerCode) {
      and.push({ customer_code: customerCode });
    }

    if (itemCode) {
      and.push({ item_code: itemCode });
    }

    if (and.length > 0) {
      where.AND = and;
    }

    try {
      const [data, total] = await Promise.all([
        this.prisma.sales_orders.findMany({
          where,
          skip: skip ? Number(skip) : undefined,
          take: take ? Number(take) : undefined,
          orderBy: { posting_date: 'desc' },
          include: {
            customer: {
              select: {
                name: true,
                salesperson_code: true,
              },
            },
          },
        }),
        this.prisma.sales_orders.count({ where }),
      ]);

      return { data, total };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene un pedido por su ID (UUID).
   */
  async getById(id: string) {
    try {
      const order = await this.prisma.sales_orders.findUnique({
        where: { id },
        include: {
          customer: true,
          product: true,
        },
      });
      if (!order) throw new NotFoundException('Pedido no encontrado');
      return order;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene pedidos por código de cliente.
   */
  async getByCustomer(customerCode: string) {
    return this.getAll({ customerCode });
  }
}
