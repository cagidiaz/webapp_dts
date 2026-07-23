import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene los proveedores con soporte para búsqueda, filtros, ordenación y paginación en servidor.
   * Retorna un objeto con los datos, el total de registros y un resumen de KPIs globales.
   */
  async getAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    blocked?: boolean;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  } = {}) {
    const { skip, take, search, blocked, sortBy = 'vendor_id', sortDir = 'asc' } = params;

    const where: any = {};
    const and: any[] = [];

    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' as any } },
          { vendor_id: { contains: search, mode: 'insensitive' as any } },
          { city: { contains: search, mode: 'insensitive' as any } },
          { vat_no: { contains: search, mode: 'insensitive' as any } },
          { contact: { contains: search, mode: 'insensitive' as any } },
          { email: { contains: search, mode: 'insensitive' as any } },
        ],
      });
    }

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

    if (and.length > 0) {
      where.AND = and;
    }

    const allowedSortFields = ['vendor_id', 'name', 'city', 'balance_lcy', 'balance_due_lcy', 'payments_lcy'];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'vendor_id';
    const orderBy: any = {};
    orderBy[orderByField] = sortDir || 'asc';

    try {
      const [data, total, aggregation, blockedCount] = await Promise.all([
        this.prisma.vendors.findMany({
          where,
          skip: skip ? Number(skip) : undefined,
          take: take ? Number(take) : undefined,
          orderBy,
        }),
        this.prisma.vendors.count({ where }),
        this.prisma.vendors.aggregate({
          where,
          _sum: {
            balance_lcy: true,
            balance_due_lcy: true,
            payments_lcy: true,
          }
        }),
        this.prisma.vendors.count({
          where: {
            ...where,
            AND: [
              ...(where.AND || []),
              {
                OR: [
                  { blocked: { not: null } },
                  { blocked: { not: '' } },
                  { blocked: { not: ' ' } }
                ]
              }
            ]
          }
        })
      ]);

      return {
        data,
        total,
        summary: {
          totalBalance: Number(aggregation._sum.balance_lcy || 0),
          totalBalanceDue: Number(aggregation._sum.balance_due_lcy || 0),
          totalPayments: Number(aggregation._sum.payments_lcy || 0),
          blockedCount,
        }
      };
    } catch (error) {
      console.error('Error fetching vendors:', error);
      throw new InternalServerErrorException('Error al obtener el listado de proveedores');
    }
  }

  async getById(id: string) {
    const vendor = await this.prisma.vendors.findUnique({
      where: { id }
    });
    if (!vendor) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }
    return vendor;
  }

  async getByVendorId(vendorId: string) {
    const vendor = await this.prisma.vendors.findUnique({
      where: { vendor_id: vendorId }
    });
    if (!vendor) {
      throw new NotFoundException(`Proveedor con código ${vendorId} no encontrado`);
    }
    return vendor;
  }
}
