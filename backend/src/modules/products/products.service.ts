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

      // Calculate total inventory value in € (Sum of inventory_qty * unit_cost) for current filtered references
      // To be accurate and performant, we can run a quick select on the filtered query
      const stockProducts = await this.prisma.products.findMany({
        where: { ...where, inventory_qty: { gt: 0 } },
        select: {
          inventory_qty: true,
          unit_cost: true
        }
      });

      const totalValuation = stockProducts.reduce((acc, p) => {
        return acc + (p.inventory_qty * Number(p.unit_cost || 0));
      }, 0);

      return { 
        data, 
        total,
        summary: {
          totalStock: aggregation._sum.inventory_qty || 0,
          avgPrice: aggregation._avg.unit_price || 0,
          totalValuation: totalValuation
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

  /**
   * Obtiene datos comparativos de la valoración del inventario para el año actual y años anteriores.
   * Utiliza la tabla value_entries sumando los importes de coste históricos hasta el fin de cada año.
   */
  async getInventoryDashboard() {
    try {
      const currentYear = new Date().getFullYear();
      
      // Calculate current valuation from products table (live snapshot)
      const currentProducts = await this.prisma.products.findMany({
        where: { inventory_qty: { gt: 0 } },
        select: { inventory_qty: true, unit_cost: true }
      });
      const currentValuation = currentProducts.reduce((acc, p) => {
        return acc + (p.inventory_qty * Number(p.unit_cost || 0));
      }, 0);

      // We will pull the cumulative historical valuation at the end of each year from value_entries.
      // The cumulative inventory value at date T is the sum of cost_amount (or cost expected/actual) of all value entries up to T.
      // Let's retrieve cumulative cost_amount sums for 2023, 2024, 2025.
      const years = [2023, 2024, 2025];
      const historicalData: { year: number; valuation: number }[] = [];

      for (const y of years) {
        const endDate = new Date(Date.UTC(y, 11, 31, 23, 59, 59));
        
        // Sum all cost_amount up to y-12-31.
        // In Business Central, the sum of "Cost Amount (Actual)" + "Cost Amount (Expected)" gives the inventory value.
        // In our value_entries schema, we have cost_amount.
        const aggregation = await this.prisma.value_entries.aggregate({
          where: {
            reg_date: {
              lte: endDate
            }
          },
          _sum: {
            cost_amount: true
          }
        });
        
        // The cost_amount of inventory entries is stored as negative for sales (outflows) and positive for purchases/adjustments (inflows).
        // The sum represents the remaining asset cost.
        historicalData.push({
          year: y,
          valuation: Math.max(0, Number(aggregation._sum.cost_amount || 0))
        });
      }

      // Add the current year live snapshot
      historicalData.push({
        year: currentYear,
        valuation: currentValuation
      });

      return historicalData.sort((a, b) => a.year - b.year);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
