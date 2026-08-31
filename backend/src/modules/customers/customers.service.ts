import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene los clientes con soporte para búsqueda, filtros avanzados, ordenación y paginación en servidor.
   * Retorna un objeto con los datos enriquecidos con histórico de ventas, el total de registros y un resumen de KPIs globales.
   */
  async getAll(params: { 
    skip?: number; 
    take?: number; 
    search?: string; 
    blocked?: boolean;
    salesperson?: string;
    clientType?: string;
    marketSegment?: string;
    businessModel?: string;
    territory?: string;
    paymentTerms?: string;
    shipmentMethod?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  } = {}) {
    const { 
      skip, 
      take, 
      search, 
      blocked, 
      salesperson, 
      clientType, 
      marketSegment,
      businessModel,
      territory,
      paymentTerms,
      shipmentMethod,
      sortBy = 'client_id', 
      sortDir = 'desc' 
    } = params;
    
    // Construir el filtro de búsqueda
    const where: any = {};
    const and: any[] = [];

    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' as any } },
          { client_id: { contains: search, mode: 'insensitive' as any } },
          { city: { contains: search, mode: 'insensitive' as any } },
          { county: { contains: search, mode: 'insensitive' as any } },
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

    // Filtro por tipo de cliente (A, B, C, D, E, F)
    if (clientType) {
      and.push({ client_type: clientType });
    }

    // Filtro por segmento de mercado
    if (marketSegment) {
      and.push({ market_segment: marketSegment });
    }

    // Filtro por modelo de negocio
    if (businessModel) {
      and.push({ business_model: businessModel });
    }

    // Filtro por territorio / provincia / país
    if (territory) {
      and.push({
        OR: [
          { county: { contains: territory, mode: 'insensitive' as any } },
          { country_reg_code: { contains: territory, mode: 'insensitive' as any } },
          { city: { contains: territory, mode: 'insensitive' as any } }
        ]
      });
    }

    // Filtro por términos de pago
    if (paymentTerms) {
      and.push({ payment_terms_code: paymentTerms });
    }

    // Filtro por método de envío / portes
    if (shipmentMethod) {
      and.push({ shipment_method_code: shipmentMethod });
    }

    if (and.length > 0) {
      where.AND = and;
    }

    // Configuración de ordenación
    const allowedSortFields = [
      'client_id', 'name', 'balance_due_lcy', 'total_sales', 'city', 
      'salesperson_code', 'client_type', 'invoice_margin', 'order_margin',
      'market_segment', 'business_model', 'county', 'payment_terms_code', 'shipment_method_code'
    ];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'client_id';
    const orderBy: any = {};
    orderBy[orderByField] = sortDir || 'desc';

    try {
      // Obtener el inicio del año actual para el KPI de clientes nuevos
      const currentYearStart = new Date(new Date().getFullYear(), 0, 1);

      // Ejecutar consultas en paralelo para máxima eficiencia
      const [rawCustomers, total, aggregation, newCustomersCount] = await Promise.all([
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
        this.prisma.customers.count({
          where: {
            ...where,
            created_at: {
              gte: currentYearStart
            }
          }
        })
      ]);

      const clientIds = rawCustomers.map(c => c.client_id).filter(Boolean);
      const yearlySalesMap: Record<string, { y2023: number; y2024: number; y2025: number; y2026: number }> = {};

      if (clientIds.length > 0) {
        const entries = await this.prisma.$queryRawUnsafe<any[]>(`
          SELECT 
            source_no, 
            EXTRACT(YEAR FROM reg_date)::int AS yr, 
            SUM(sales_amount)::numeric AS amount
          FROM value_entries
          WHERE source_no = ANY($1::text[])
            AND reg_date >= '2023-01-01'
            AND reg_date <= '2026-12-31'
          GROUP BY source_no, EXTRACT(YEAR FROM reg_date)
        `, clientIds);

        entries.forEach(e => {
          const sNo = e.source_no;
          if (!yearlySalesMap[sNo]) {
            yearlySalesMap[sNo] = { y2023: 0, y2024: 0, y2025: 0, y2026: 0 };
          }
          const yr = Number(e.yr);
          const amt = Number(e.amount || 0);
          if (yr === 2023) yearlySalesMap[sNo].y2023 = amt;
          else if (yr === 2024) yearlySalesMap[sNo].y2024 = amt;
          else if (yr === 2025) yearlySalesMap[sNo].y2025 = amt;
          else if (yr === 2026) yearlySalesMap[sNo].y2026 = amt;
        });
      }

      const data = rawCustomers.map(customer => {
        const yData = yearlySalesMap[customer.client_id] || { y2023: 0, y2024: 0, y2025: 0, y2026: 0 };
        const sales2023 = yData.y2023;
        const sales2024 = yData.y2024;
        const sales2025 = yData.y2025;
        const sales2026Ytd = Number(customer.total_sales) || yData.y2026 || 0;
        const salesTotal = sales2023 + sales2024 + sales2025 + sales2026Ytd;

        return {
          ...customer,
          sales_2023: sales2023,
          sales_2024: sales2024,
          sales_2025: sales2025,
          sales_2026_ytd: sales2026Ytd,
          sales_total: salesTotal
        };
      });

      return { 
        data, 
        total: total || 0,
        summary: {
          totalDebt: Number(aggregation._sum.balance_due_lcy) || 0,
          totalSales: Number(aggregation._sum.total_sales) || 0,
          newCustomersCount: newCustomersCount || 0,
        }
      };
    } catch (error) {
       console.error('Error en CustomersService.getAll:', error);
       throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene las opciones únicas de filtrado para mercados, modelos de negocio, territorios, términos de pago y portes.
   */
  async getFilterOptions() {
    try {
      const [marketSegments, businessModels, counties, paymentTerms, shipmentMethods] = await Promise.all([
        this.prisma.customers.findMany({
          where: { market_segment: { not: null } },
          select: { market_segment: true },
          distinct: ['market_segment'],
          orderBy: { market_segment: 'asc' }
        }),
        this.prisma.customers.findMany({
          where: { business_model: { not: null } },
          select: { business_model: true },
          distinct: ['business_model'],
          orderBy: { business_model: 'asc' }
        }),
        this.prisma.customers.findMany({
          where: { county: { not: null } },
          select: { county: true },
          distinct: ['county'],
          orderBy: { county: 'asc' }
        }),
        this.prisma.customers.findMany({
          where: { payment_terms_code: { not: null } },
          select: { payment_terms_code: true },
          distinct: ['payment_terms_code'],
          orderBy: { payment_terms_code: 'asc' }
        }),
        this.prisma.customers.findMany({
          where: { shipment_method_code: { not: null } },
          select: { shipment_method_code: true },
          distinct: ['shipment_method_code'],
          orderBy: { shipment_method_code: 'asc' }
        })
      ]);

      return {
        marketSegments: marketSegments.map(m => m.market_segment).filter((v): v is string => Boolean(v && v.trim())),
        businessModels: businessModels.map(b => b.business_model).filter((v): v is string => Boolean(v && v.trim())),
        territories: counties.map(c => c.county).filter((v): v is string => Boolean(v && v.trim())),
        paymentTerms: paymentTerms.map(p => p.payment_terms_code).filter((v): v is string => Boolean(v && v.trim())),
        shipmentMethods: shipmentMethods.map(s => s.shipment_method_code).filter((v): v is string => Boolean(v && v.trim())),
      };
    } catch (error) {
      console.error('Error en CustomersService.getFilterOptions:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene la lista de vendedores únicos con clientes asignados.
   */
  async getSalespersons() {
    try {
      return await this.prisma.sales_reps.findMany({
        orderBy: { code: 'asc' }
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

  /**
   * Obtiene un cliente por una dirección de correo, buscando primero en sus personas de contacto
   * y luego en el correo principal del cliente.
   */
  async getByEmail(email: string) {
    try {
      if (!email || !email.trim()) {
        throw new NotFoundException('Email no válido');
      }

      const emailTrimmed = email.trim().toLowerCase();

      // 1. Buscar en contactos
      const contact = await this.prisma.contacts.findFirst({
        where: {
          email: {
            equals: emailTrimmed,
            mode: 'insensitive'
          }
        }
      });

      if (contact && contact.client_id) {
        const customer = await this.prisma.customers.findUnique({
          where: { client_id: contact.client_id }
        });
        if (customer) {
          return { customer, contact };
        }
      }

      // 2. Si no se encontró en contactos, buscar en la tabla de clientes directamente
      const customer = await this.prisma.customers.findFirst({
        where: {
          email: {
            equals: emailTrimmed,
            mode: 'insensitive'
          }
        }
      });

      if (customer) {
        return { customer, contact: null };
      }

      throw new NotFoundException(`No se encontró ningún cliente o contacto con el email ${email}`);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Actualiza el tipo de cliente (relación con la marca: A, B, C, D, E, F o null)
   */
  async updateClientType(clientId: string, clientType: string | null) {
    try {
      const existing = await this.prisma.customers.findUnique({
        where: { client_id: clientId },
      });

      if (!existing) {
        throw new NotFoundException(`Cliente con código "${clientId}" no encontrado`);
      }

      const updated = await this.prisma.customers.update({
        where: { client_id: clientId },
        data: {
          client_type: clientType ? clientType.trim().toUpperCase() : null,
          updated_at: new Date(),
        },
      });

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error en CustomersService.updateClientType:', error);
      throw new InternalServerErrorException('Error al actualizar el tipo de cliente');
    }
  }
}
