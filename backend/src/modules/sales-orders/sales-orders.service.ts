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
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  } = {}) {
    const { skip, take, search, customerCode, itemCode, sortBy = 'document_number', sortDir = 'desc' } = params;

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
      const [data, total, allRelevantOrders] = await Promise.all([
        this.prisma.sales_orders.findMany({
          where,
          skip: skip ? Number(skip) : undefined,
          take: take ? Number(take) : undefined,
          orderBy: [
            { [sortBy]: sortDir },
            { id: 'asc' }
          ],
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
        // Obtenemos solo los campos necesarios para el sumatorio global de la selección
        this.prisma.sales_orders.findMany({
          where,
          select: {
            document_number: true,
            outstanding_quantity: true,
            qty_shipped_not_invoiced: true,
            unit_price: true,
          },
        }),
      ]);

      // Calcular sumatorios globales
      let totalCartera = 0;
      let totalEnviadoNoFacturado = 0;
      const uniqueOrderNumbers = new Set<string>();

      allRelevantOrders.forEach(order => {
        const price = Number(order.unit_price || 0);
        const outstanding = Number(order.outstanding_quantity || 0);
        const shippedNotInv = Number(order.qty_shipped_not_invoiced || 0);

        totalCartera += (outstanding * price);
        totalEnviadoNoFacturado += (shippedNotInv * price);
        if (order.document_number) uniqueOrderNumbers.add(order.document_number);
      });

      return { 
        data, 
        total,
        summary: {
          totalOrders: uniqueOrderNumbers.size,
          totalAmount: totalCartera,
          totalOutstandingUnits: allRelevantOrders.reduce((acc, curr) => acc + Number(curr.outstanding_quantity || 0), 0),
          totalEnviadoNoFacturado: totalEnviadoNoFacturado,
        }
      };


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
