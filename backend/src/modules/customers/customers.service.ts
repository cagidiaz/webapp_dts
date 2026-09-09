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
    const and: any[] = [
      // Excluir cliente ficticio / comodín de cliente nuevo (9999999 / 99999999)
      {
        client_id: {
          notIn: ['9999999', '99999999', 'CLI-9999999', 'CLI-99999999']
        }
      }
    ];

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

    // Filtro por territorio / provincia / país / código postal / internacional
    if (territory) {
      const cleanTerritory = territory.trim();
      const isIntlFilter = cleanTerritory === 'INTL' || 
                           cleanTerritory.toUpperCase().includes('INTERNACIONAL') || 
                           cleanTerritory.toUpperCase().includes('EXPORT');

      if (isIntlFilter) {
        and.push({
          AND: [
            { country_reg_code: { not: null } },
            { country_reg_code: { not: '' } },
            { country_reg_code: { not: 'ES' } },
            { country_reg_code: { not: 'PT' } },
            { country_reg_code: { not: 'ESP' } },
            { country_reg_code: { not: 'PRT' } },
          ]
        });
      } else {
        const postalPrefix = cleanTerritory.replace(/^(ES|PT)-/i, '');
        const orConditions: any[] = [
          { county: { contains: cleanTerritory, mode: 'insensitive' as any } },
          { country_reg_code: { contains: cleanTerritory, mode: 'insensitive' as any } },
          { city: { contains: cleanTerritory, mode: 'insensitive' as any } },
        ];
        if (/^\d{1,2}$/.test(postalPrefix)) {
          const padded = postalPrefix.padStart(2, '0');
          orConditions.push({ post_code: { startsWith: padded } });
        }
        and.push({
          OR: orConditions
        });
      }
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

      const parsePaymentDays = (code: string | null | undefined): number => {
        if (!code) return 30;
        const upper = code.toUpperCase();
        if (upper.includes('CON') || upper.includes('CONTADO')) return 0;
        if (upper.includes('120')) return 120;
        if (upper.includes('90')) return 90;
        if (upper.includes('85')) return 85;
        if (upper.includes('60')) return 60;
        if (upper.includes('55')) return 55;
        if (upper.includes('50')) return 50;
        if (upper.includes('45')) return 45;
        if (upper.includes('30 + 30') || upper.includes('30+30')) return 60;
        if (upper.includes('30')) return 30;
        if (upper.includes('15') || upper.includes('14')) return 15;
        const match = upper.match(/\d+/);
        return match ? parseInt(match[0], 10) : 30;
      };

      const data = rawCustomers.map(customer => {
        const yData = yearlySalesMap[customer.client_id] || { y2023: 0, y2024: 0, y2025: 0, y2026: 0 };
        const sales2023 = yData.y2023;
        const sales2024 = yData.y2024;
        const sales2025 = yData.y2025;
        const sales2026Ytd = Number(customer.total_sales) || yData.y2026 || 0;
        const salesTotal = sales2023 + sales2024 + sales2025 + sales2026Ytd;

        // Cálculo de Días Reales de Cobro (Opción 3: Días Pactados + Demora Real por Mora)
        const agreedDays = parsePaymentDays(customer.payment_terms_code);
        const balanceDue = Number(customer.balance_due_lcy || 0);
        const recentSales = Math.max(sales2025, sales2026Ytd, Number(customer.total_sales || 0));

        let delayDays = 0;
        if (balanceDue > 0) {
          if (recentSales > 0) {
            delayDays = Math.min(180, Math.round((balanceDue / recentSales) * 365));
          } else {
            delayDays = Math.min(120, Math.max(15, Math.round(balanceDue / 100)));
          }
        }

        const totalPaymentDays = agreedDays + delayDays;

        return {
          ...customer,
          sales_2023: sales2023,
          sales_2024: sales2024,
          sales_2025: sales2025,
          sales_2026_ytd: sales2026Ytd,
          sales_total: salesTotal,
          payment_days_agreed: agreedDays,
          payment_days_delay: delayDays,
          payment_days_total: totalPaymentDays,
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

  /**
   * Obtiene las fechas del calendario para un año dado, con soporte opcional de corte día a día (YTD vs LYTD).
   */
  private async getDatesForYear(year: number, limitToToday: boolean = false): Promise<Date[]> {
    const where: any = { year };
    if (limitToToday) {
      const today = new Date();
      if (year <= today.getFullYear()) {
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        where.OR = [
          { month: { lt: currentMonth } },
          { 
            month: currentMonth,
            day: { lte: currentDay }
          }
        ];
      }
    }

    const dates = await this.prisma.calendar.findMany({
      where,
      select: { date: true }
    });
    return dates.map(d => d.date);
  }

  /**
   * Obtiene la Matriz de Relación de Clientes por tipo (A, B, C, D, E, F)
   * con facturación del ejercicio, comparativa con año anterior,
   * recuento de clientes, porcentajes relativos y subtotales Pareto (A+B vs C+D+E+F).
   */
  async getRelationshipMatrix(params: {
    year?: number;
    salespersonCode?: string;
    limitToToday?: boolean;
  }) {
    try {
      const year = params.year ? Number(params.year) : new Date().getFullYear();
      const prevYear = year - 1;
      const limitToToday = params.limitToToday !== undefined ? Boolean(params.limitToToday) : true;
      const salespersonFilter = params.salespersonCode ? params.salespersonCode.trim() : undefined;

      const SALES_DOC_TYPES = ['Sales Invoice', 'Sales Credit Memo'];

      // 1. Obtener fechas de los calendarios para año en curso y año anterior
      const [currentDates, prevDates] = await Promise.all([
        this.getDatesForYear(year, limitToToday),
        this.getDatesForYear(prevYear, limitToToday),
      ]);

      // 2. Obtener lista de comerciales y clientes
      const [salesReps, allCustomers] = await Promise.all([
        this.prisma.sales_reps.findMany({
          select: { code: true, name: true },
          orderBy: { name: 'asc' }
        }),
        this.prisma.customers.findMany({
          select: {
            client_id: true,
            name: true,
            salesperson_code: true,
            client_type: true,
          }
        })
      ]);

      const salesRepMap = new Map<string, string>();
      salesReps.forEach(sr => salesRepMap.set(sr.code, sr.name));

      // 3. Obtener sumatorio de ventas de value_entries por cliente para el año y el año anterior
      const [salesCurrentRaw, salesPrevRaw] = await Promise.all([
        currentDates.length > 0
          ? this.prisma.value_entries.groupBy({
              by: ['source_no'],
              _sum: { sales_amount: true },
              where: {
                document_type: { in: SALES_DOC_TYPES },
                reg_date: { in: currentDates }
              }
            })
          : Promise.resolve([] as any[]),
        prevDates.length > 0
          ? this.prisma.value_entries.groupBy({
              by: ['source_no'],
              _sum: { sales_amount: true },
              where: {
                document_type: { in: SALES_DOC_TYPES },
                reg_date: { in: prevDates }
              }
            })
          : Promise.resolve([] as any[])
      ]);

      const salesMapCurrent = new Map<string, number>();
      salesCurrentRaw.forEach(s => {
        if (s.source_no) {
          salesMapCurrent.set(s.source_no, Number(s._sum.sales_amount || 0));
        }
      });

      const salesMapPrev = new Map<string, number>();
      salesPrevRaw.forEach(s => {
        if (s.source_no) {
          salesMapPrev.set(s.source_no, Number(s._sum.sales_amount || 0));
        }
      });

      // 4. Función generadora de bloques de matriz
      const labelsMap: Record<string, string> = {
        A: 'Cautivos',
        B: 'Habituales',
        C: 'Ocasionales',
        D: 'Nuevos',
        E: 'Potenciales',
        F: 'Inactivos',
        SIN_CLASIFICAR: 'Sin Clasificar',
      };

      const codes = ['A', 'B', 'C', 'D', 'E', 'F'];

      const buildBlock = (
        salespersonCode: string,
        salespersonName: string,
        customersList: typeof allCustomers
      ) => {
        const accumulators: Record<string, { numClientes: number; facturacion: number; facturacionPrev: number }> = {};
        codes.forEach(c => {
          accumulators[c] = { numClientes: 0, facturacion: 0, facturacionPrev: 0 };
        });
        accumulators['SIN_CLASIFICAR'] = { numClientes: 0, facturacion: 0, facturacionPrev: 0 };

        customersList.forEach(c => {
          const rawType = c.client_type ? c.client_type.trim().toUpperCase() : null;
          const typeCode = (rawType && codes.includes(rawType)) ? rawType : 'SIN_CLASIFICAR';

          accumulators[typeCode].numClientes += 1;
          accumulators[typeCode].facturacion += salesMapCurrent.get(c.client_id) || 0;
          accumulators[typeCode].facturacionPrev += salesMapPrev.get(c.client_id) || 0;
        });

        let totalFacturacion = 0;
        let totalFacturacionPrev = 0;
        let totalClientes = 0;

        Object.values(accumulators).forEach(acc => {
          totalFacturacion += acc.facturacion;
          totalFacturacionPrev += acc.facturacionPrev;
          totalClientes += acc.numClientes;
        });

        const rows = codes.map(code => {
          const acc = accumulators[code];
          const facturacionPct = totalFacturacion > 0 ? (acc.facturacion / totalFacturacion) * 100 : 0;
          const clientesPct = totalClientes > 0 ? (acc.numClientes / totalClientes) * 100 : 0;
          const variacionYoYPct = acc.facturacionPrev > 0
            ? ((acc.facturacion - acc.facturacionPrev) / acc.facturacionPrev) * 100
            : (acc.facturacion > 0 ? 100 : 0);

          return {
            code,
            label: labelsMap[code],
            facturacion: Math.round(acc.facturacion * 100) / 100,
            facturacionPct: Math.round(facturacionPct * 10) / 10,
            facturacionPrevYear: Math.round(acc.facturacionPrev * 100) / 100,
            variacionYoYPct: Math.round(variacionYoYPct * 10) / 10,
            numClientes: acc.numClientes,
            clientesPct: Math.round(clientesPct * 10) / 10,
          };
        });

        if (accumulators['SIN_CLASIFICAR'].numClientes > 0 || accumulators['SIN_CLASIFICAR'].facturacion > 0) {
          const acc = accumulators['SIN_CLASIFICAR'];
          const facturacionPct = totalFacturacion > 0 ? (acc.facturacion / totalFacturacion) * 100 : 0;
          const clientesPct = totalClientes > 0 ? (acc.numClientes / totalClientes) * 100 : 0;
          const variacionYoYPct = acc.facturacionPrev > 0
            ? ((acc.facturacion - acc.facturacionPrev) / acc.facturacionPrev) * 100
            : (acc.facturacion > 0 ? 100 : 0);

          rows.push({
            code: 'SIN_CLASIFICAR',
            label: labelsMap['SIN_CLASIFICAR'],
            facturacion: Math.round(acc.facturacion * 100) / 100,
            facturacionPct: Math.round(facturacionPct * 10) / 10,
            facturacionPrevYear: Math.round(acc.facturacionPrev * 100) / 100,
            variacionYoYPct: Math.round(variacionYoYPct * 10) / 10,
            numClientes: acc.numClientes,
            clientesPct: Math.round(clientesPct * 10) / 10,
          });
        }

        // Subtotal Grupo 1: Cautivos + Habituales (A + B)
        const loyaltyRows = rows.filter(r => r.code === 'A' || r.code === 'B');
        const loyaltyFact = loyaltyRows.reduce((sum, r) => sum + r.facturacion, 0);
        const loyaltyFactPrev = loyaltyRows.reduce((sum, r) => sum + r.facturacionPrevYear, 0);
        const loyaltyClients = loyaltyRows.reduce((sum, r) => sum + r.numClientes, 0);
        const loyaltyFactPct = totalFacturacion > 0 ? (loyaltyFact / totalFacturacion) * 100 : 0;
        const loyaltyClientsPct = totalClientes > 0 ? (loyaltyClients / totalClientes) * 100 : 0;
        const loyaltyYoY = loyaltyFactPrev > 0
          ? ((loyaltyFact - loyaltyFactPrev) / loyaltyFactPrev) * 100
          : (loyaltyFact > 0 ? 100 : 0);

        const subtotalLoyalty = {
          label: 'Subtotal Cautivos + Habituales',
          categories: ['A', 'B'],
          facturacion: Math.round(loyaltyFact * 100) / 100,
          facturacionPct: Math.round(loyaltyFactPct * 10) / 10,
          facturacionPrevYear: Math.round(loyaltyFactPrev * 100) / 100,
          variacionYoYPct: Math.round(loyaltyYoY * 10) / 10,
          numClientes: loyaltyClients,
          clientesPct: Math.round(loyaltyClientsPct * 10) / 10,
        };

        // Subtotal Grupo 2: Ocasionales + Nuevos + Potenciales + Inactivos (C + D + E + F + SIN_CLASIFICAR)
        const oppRows = rows.filter(r => ['C', 'D', 'E', 'F', 'SIN_CLASIFICAR'].includes(r.code));
        const oppFact = oppRows.reduce((sum, r) => sum + r.facturacion, 0);
        const oppFactPrev = oppRows.reduce((sum, r) => sum + r.facturacionPrevYear, 0);
        const oppClients = oppRows.reduce((sum, r) => sum + r.numClientes, 0);
        const oppFactPct = totalFacturacion > 0 ? (oppFact / totalFacturacion) * 100 : 0;
        const oppClientsPct = totalClientes > 0 ? (oppClients / totalClientes) * 100 : 0;
        const oppYoY = oppFactPrev > 0
          ? ((oppFact - oppFactPrev) / oppFactPrev) * 100
          : (oppFact > 0 ? 100 : 0);

        const subtotalOpportunity = {
          label: 'Subtotal Ocasionales + Nuevos + Potenciales + Inactivos',
          categories: ['C', 'D', 'E', 'F'],
          facturacion: Math.round(oppFact * 100) / 100,
          facturacionPct: Math.round(oppFactPct * 10) / 10,
          facturacionPrevYear: Math.round(oppFactPrev * 100) / 100,
          variacionYoYPct: Math.round(oppYoY * 10) / 10,
          numClientes: oppClients,
          clientesPct: Math.round(oppClientsPct * 10) / 10,
        };

        const totalVariacionYoYPct = totalFacturacionPrev > 0
          ? ((totalFacturacion - totalFacturacionPrev) / totalFacturacionPrev) * 100
          : (totalFacturacion > 0 ? 100 : 0);

        return {
          salespersonCode,
          salespersonName,
          rows,
          subtotalLoyalty,
          subtotalOpportunity,
          total: {
            facturacion: Math.round(totalFacturacion * 100) / 100,
            facturacionPrevYear: Math.round(totalFacturacionPrev * 100) / 100,
            variacionYoYPct: Math.round(totalVariacionYoYPct * 10) / 10,
            numClientes: totalClientes,
          }
        };
      };

      // 5. Construir Bloque TOTAL GLOBAL (dTS)
      const totalGlobal = buildBlock('TOTAL', 'dTS', allCustomers);

      // 6. Construir Bloques por Comercial
      // Agrupar clientes por salesperson_code
      const customersByRep = new Map<string, typeof allCustomers>();
      allCustomers.forEach(c => {
        const repCode = c.salesperson_code ? c.salesperson_code.trim() : 'SIN_ASIGNAR';
        if (!customersByRep.has(repCode)) {
          customersByRep.set(repCode, []);
        }
        customersByRep.get(repCode)!.push(c);
      });

      const commercialBlocks: ReturnType<typeof buildBlock>[] = [];

      // Incluir todos los comerciales que tengan clientes o estén en sales_reps (excluyendo SIN_ASIGNAR y Joaquim Pla 'JPL')
      const repCodes = Array.from(new Set([
        ...salesReps.map(r => r.code),
        ...Array.from(customersByRep.keys())
      ])).filter(code => code !== 'SIN_ASIGNAR' && code !== 'JPL');

      repCodes.forEach(code => {
        if (salespersonFilter && salespersonFilter !== code) return;
        const repCustomers = customersByRep.get(code) || [];
        const repName = salesRepMap.get(code) || code;
        commercialBlocks.push(buildBlock(code, repName, repCustomers));
      });

      // Incluir sin asignar si tiene clientes y no hay filtro específico
      if (!salespersonFilter && customersByRep.has('SIN_ASIGNAR')) {
        commercialBlocks.push(buildBlock('SIN_ASIGNAR', 'Sin Asignar', customersByRep.get('SIN_ASIGNAR')!));
      }

      // Ordenar comerciales: los que tienen mayor facturación primero
      commercialBlocks.sort((a, b) => b.total.facturacion - a.total.facturacion);

      return {
        year,
        prevYear,
        limitToToday,
        totalGlobal,
        commercials: commercialBlocks,
      };
    } catch (error) {
      console.error('Error en CustomersService.getRelationshipMatrix:', error);
      throw new InternalServerErrorException(error.message);
    }
  }
}
