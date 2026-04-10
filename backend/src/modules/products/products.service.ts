import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene los productos con soporte para búsqueda, filtros avanzados, ordenación y paginación en servidor.
   * Retorna un objeto con los datos, el total de registros y KPIs globales del conjunto filtrado.
   */
  async getAll(params: { 
    skip?: number; 
    take?: number; 
    search?: string;
    family?: string;
    vendor?: string;
    withStock?: boolean;
    isBlocked?: boolean;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  } = {}) {
    const { 
      skip, 
      take, 
      search, 
      family, 
      vendor, 
      withStock, 
      isBlocked, 
      sortBy = 'item_no', 
      sortDir = 'asc' 
    } = params;
    
    // Construir el filtro de búsqueda
    const where: any = {};
    const and: any[] = [];

    if (search) {
      and.push({
        OR: [
          { item_no: { contains: search, mode: 'insensitive' as any } },
          { description: { contains: search, mode: 'insensitive' as any } },
          { vendor_no: { contains: search, mode: 'insensitive' as any } },
          { subfamily_code: { contains: search, mode: 'insensitive' as any } },
          { category: { subfamily_name: { contains: search, mode: 'insensitive' as any } } },
          { category: { family_name: { contains: search, mode: 'insensitive' as any } } },
        ],
      });
    }

    if (family) {
      and.push({ subfamily_code: family });
    }

    if (vendor) {
      and.push({ vendor_no: vendor });
    }

    if (withStock === true) {
      and.push({ inventory_qty: { gt: 0 } });
    }

    if (isBlocked !== undefined) {
      and.push({ is_blocked: isBlocked });
    }

    if (and.length > 0) {
      where.AND = and;
    }

    // Configuración de ordenación (Validar campos permitidos)
    const allowedSortFields = ['item_no', 'description', 'inventory_qty', 'unit_cost', 'unit_price', 'profit_margin_pct', 'vendor_no', 'subfamily_code'];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'item_no';
    const orderBy: any = {};
    orderBy[orderByField] = sortDir || 'asc';

    try {
      // Ejecutar consultas en paralelo
      const [data, total, aggregation] = await Promise.all([
        this.prisma.products.findMany({
          where,
          skip: skip ? Number(skip) : undefined,
          take: take ? Number(take) : undefined,
          orderBy,
          include: { category: true }
        }),
        this.prisma.products.count({ where }),
        this.prisma.products.aggregate({
          where: { ...where, inventory_qty: { gt: 0 } },
          _sum: { inventory_qty: true },
          _avg: { unit_price: true },
        }),
      ]);

      return { 
        data, 
        total,
        summary: {
          totalStock: aggregation._sum.inventory_qty || 0,
          avgPrice: aggregation._avg.unit_price || 0,
        }
      };
    } catch (error) {
       throw new InternalServerErrorException(error.message);
    }
  }

   async getFamilies() {
    // Retornamos todas las categorías de la tabla maestra
    return this.prisma.product_categories.findMany({
      orderBy: [
        { family_name: 'asc' },
        { subfamily_name: 'asc' }
      ]
    });
  }

  async getVendors() {
    const result = await this.prisma.products.findMany({
      select: { vendor_no: true },
      distinct: ['vendor_no'],
      where: { vendor_no: { not: null } },
      orderBy: { vendor_no: 'asc' }
    });
    return result.map(r => r.vendor_no);
  }

  async getById(id: string) {
    const product = await this.prisma.products.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    return product;
  }

  async getByItemNo(itemNo: string) {
    const product = await this.prisma.products.findUnique({
      where: { item_no: itemNo },
    });
    if (!product) {
      throw new NotFoundException(`Producto con código ${itemNo} no encontrado`);
    }
    return product;
  }

  async create(data: any) {
    return this.prisma.products.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.products.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.products.delete({
      where: { id },
    });
  }
}
