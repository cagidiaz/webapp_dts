import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene los clientes con soporte para búsqueda, filtros, ordenación y paginación en servidor.
   * Retorna un objeto con los datos, el total de registros y un resumen de KPIs globales.
   */
  async getAll(params: { 
    skip?: number; 
    take?: number; 
    search?: string; 
    blocked?: boolean;
    salesperson?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  } = {}) {
    const { skip, take, search, blocked, salesperson, sortBy = 'client_id', sortDir = 'desc' } = params;
    
    // Construir el filtro de búsqueda
    const where: any = {};
    const and: any[] = [];

    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' as any } },
          { client_id: { contains: search, mode: 'insensitive' as any } },
          { city: { contains: search, mode: 'insensitive' as any } },
          { salesperson_code: { contains: search, mode: 'insensitive' as any } },
        ],
      });
    }
    
    // Filtro por estado de bloqueo (Flexible para Navision/BC)
    if (blocked !== undefined) {
      if (blocked) {
        and.push({
          AND: [
            { blocked: { not: null } },
            { blocked: { not: '' } },
            { blocked: { not: ' ' } }
          ]
        });
      } else {
        and.push({
          OR: [
            { blocked: null },
            { blocked: '' },
            { blocked: ' ' }
          ]
        });
      }
    }

    // Filtro por vendedor
    if (salesperson) {
      and.push({ salesperson_code: salesperson });
    }

    if (and.length > 0) {
      where.AND = and;
    }

    // Configuración de ordenación
    const allowedSortFields = ['client_id', 'name', 'balance_due_lcy', 'total_sales', 'city', 'salesperson_code'];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'client_id';
    const orderBy: any = {};
    orderBy[orderByField] = sortDir || 'desc';

    try {
      // Ejecutar consultas en paralelo para máxima eficiencia
      const [data, total, aggregation] = await Promise.all([
        this.prisma.customers.findMany({
          where,
          skip: skip ? Number(skip) : undefined,
          take: take ? Number(take) : undefined,
          orderBy,
        }),
        this.prisma.customers.count({ where }),
        this.prisma.customers.aggregate({
          where,
          _sum: {
            balance_due_lcy: true,
            total_sales: true,
          }
        }),
      ]);

      return { 
        data, 
        total: total || 0,
        summary: {
          totalDebt: Number(aggregation._sum.balance_due_lcy) || 0,
          totalSales: Number(aggregation._sum.total_sales) || 0,
        }
      };
    } catch (error) {
       console.error('Error en CustomersService.getAll:', error);
       throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene la lista de vendedores únicos con clientes asignados.
   */
  async getSalespersons() {
    try {
      const result = await this.prisma.customers.findMany({
        select: { salesperson_code: true },
        distinct: ['salesperson_code'],
        where: { 
          AND: [
            { salesperson_code: { not: null } },
            { salesperson_code: { not: '' } },
            { salesperson_code: { not: ' ' } },
          ]
        },
        orderBy: { salesperson_code: 'asc' }
      });
      return result.map(r => r.salesperson_code);
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
