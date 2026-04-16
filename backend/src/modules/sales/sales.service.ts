import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Valid document types from Supabase:
 * - Purchase Credit Memo
 * - Sales Credit Memo
 * - Purchase Invoice
 * - Purchase Receipt
 * - Sales Shipment
 * - Sales Invoice
 * - Posted Assembly
 */
const SALES_DOC_TYPES = ['Sales Invoice', 'Sales Credit Memo'];
const PURCHASE_DOC_TYPES = ['Purchase Invoice', 'Purchase Credit Memo'];
const MIN_DATE_FOR_QUERIES = new Date('2022-01-01');

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene los presupuestos de ventas por año.
   */
  async getSalesBudgets(year?: number) {
    try {
      const targetYear = year || new Date().getFullYear();
      const startDate = new Date(`${targetYear}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${targetYear}-12-31T23:59:59.999Z`);

      const budgets = await this.prisma.sales_budgets.groupBy({
        by: ['budget_date'],
        _sum: {
          monthly_budget: true,
        },
        where: {
          budget_date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const totalBudget = budgets.reduce((acc: number, current: any) => {
        return acc + (current._sum.monthly_budget ? Number(current._sum.monthly_budget) : 0);
      }, 0);

      return { year: targetYear, totalSalesBudget: totalBudget };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene exclusivamente las entradas de ventas de value_entries.
   * Filtra por tipos de documento de venta y opcionalmente excluye datos históricos previos a 2022.
   */
  async getSalesEntries(excludeHistorical = true) {
    return this.prisma.value_entries.findMany({
      where: {
        document_type: { in: SALES_DOC_TYPES },
        reg_date: excludeHistorical ? { gte: MIN_DATE_FOR_QUERIES } : undefined,
      },
      orderBy: { reg_date: 'desc' },
      take: 100, // Limit for safety
    });
  }

  /**
   * Obtiene exclusivamente las entradas de compras de value_entries.
   */
  async getPurchasesEntries(excludeHistorical = true) {
    return this.prisma.value_entries.findMany({
      where: {
        document_type: { in: PURCHASE_DOC_TYPES },
        reg_date: excludeHistorical ? { gte: MIN_DATE_FOR_QUERIES } : undefined,
      },
      orderBy: { reg_date: 'desc' },
      take: 100, // Limit for safety
    });
  }
  /**
   * Obtiene las métricas de rendimiento de ventas vs presupuestos
   */
  async getSalesBudgetPerformance(filters: {
    year: number;
    months?: number[];
    salespersonCode?: string;
    familyCode?: string;
    subfamilyCode?: string;
    customerCode?: string;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    take?: number;
    skip?: number;
  }) {
    const { 
      year, months, salespersonCode, familyCode, subfamilyCode, 
      customerCode, search, sortBy, sortDir, take, skip 
    } = filters;


    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // 1. Where clause para value_entries
    const salesWhere: any = {
      document_type: { in: SALES_DOC_TYPES },
      reg_date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (months && months.length > 0) {
      // Si hay meses específicos, usamos una condición OR para las fechas o filtramos después.
      // Pero Prisma no permite extraer el mes en el where fácilmente sin raw query.
      // Sin embargo, podemos aproximar o filtrar por los rangos de esos meses.
      // Para simplificar y mantener compatibilidad con groupBy,
      // usaremos el campo reg_date con una lista de rangos si es necesario, 
      // o mejor, aprovechamos que la tabla calendar existe pero la filtramos por fechas.
      salesWhere.reg_date = {
        in: await this.getDatesForMonths(year, months)
      };
    }
    if (salespersonCode) salesWhere.salesperson_code = salespersonCode;
    if (customerCode) salesWhere.source_no = customerCode;

    let itemNos: string[] = [];

    if (familyCode || subfamilyCode) {
      // 1.1 Búsqueda en dos pasos: Primero obtenemos los IDs de productos que coinciden con la familia/subfamilia
      const matchingProducts = await this.prisma.products.findMany({
        where: {
          subfamily_code: subfamilyCode || undefined,
          category: familyCode ? { family_code: familyCode } : undefined,
        },
        select: { item_no: true }
      });
      
      itemNos = matchingProducts.map(p => p.item_no);
      salesWhere.item_no = { in: itemNos };
    }

    // 2. Where clause para sales_budgets
    const budgetWhere: any = {
      budget_date: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (months && months.length > 0) {
      budgetWhere.budget_date = {
        in: await this.getDatesForMonths(year, months)
      };
    }
    if (salespersonCode) budgetWhere.salesperson_code = salespersonCode;
    if (customerCode) budgetWhere.customer_code = customerCode;

    if (familyCode || subfamilyCode) {

      // Reutilizamos los itemNos obtenidos anteriormente para filtrar el presupuesto
      budgetWhere.item_no = { in: itemNos };
    }

    // 3. Obtener sumatorios paralelos
    const [salesRaw, budgetsRaw] = await Promise.all([
      this.prisma.value_entries.groupBy({
        by: ['source_no'],
        _sum: { sales_amount: true },
        where: salesWhere,
      }),
      this.prisma.sales_budgets.groupBy({
        by: ['customer_code'],
        _sum: { monthly_budget: true },
        where: budgetWhere,
      })
    ]);

    // Mejor enfoque para nombres de cliente: extraer IDs
    const customerIds = new Set<string>();
    salesRaw.forEach(s => s.source_no && customerIds.add(s.source_no));
    budgetsRaw.forEach(b => b.customer_code && customerIds.add(b.customer_code));

    let customersDict: Record<string, { name: string; since: Date | null }> = {};
    if (customerIds.size > 0) {
      const customers = await this.prisma.customers.findMany({
        where: { client_id: { in: Array.from(customerIds) } },
        select: { client_id: true, name: true, created_at: true }
      });
      customersDict = customers.reduce((acc, c) => {
        acc[c.client_id] = { name: c.name, since: c.created_at };
        return acc;
      }, {} as Record<string, { name: string; since: Date | null }>);
    }

    // 4. Merge data por cliente
    const mergedData = new Map<string, any>();

    salesRaw.forEach(sale => {
      if (!sale.source_no) return;
      const cInfo = customersDict[sale.source_no];
      mergedData.set(sale.source_no, {
        customerCode: sale.source_no,
        customerName: cInfo ? cInfo.name : (sale.source_no === '99999999' ? 'CLIENTE NUEVO' : sale.source_no),
        isNew: cInfo?.since ? new Date(cInfo.since).getFullYear() === new Date().getFullYear() : false,
        salesSum: sale._sum.sales_amount ? Number(sale._sum.sales_amount) : 0,
        budgetSum: 0,
      });
    });

    budgetsRaw.forEach(budget => {
      if (!budget.customer_code) return;
      if (mergedData.has(budget.customer_code)) {
        mergedData.get(budget.customer_code).budgetSum = budget._sum.monthly_budget ? Number(budget._sum.monthly_budget) : 0;
      } else {
        const cInfo = customersDict[budget.customer_code];
        mergedData.set(budget.customer_code, {
          customerCode: budget.customer_code,
          customerName: cInfo ? cInfo.name : (budget.customer_code === '99999999' ? 'CLIENTE NUEVO' : budget.customer_code),
          isNew: cInfo?.since ? new Date(cInfo.since).getFullYear() === new Date().getFullYear() : false,
          salesSum: 0,
          budgetSum: budget._sum.monthly_budget ? Number(budget._sum.monthly_budget) : 0,
        });
      }
    });

    // 5. Array final
    const results = Array.from(mergedData.values()).map(row => ({
      customerCode: row.customerCode,
      customerName: row.customerName,
      isNew: row.isNew,
      facturacion: row.salesSum,
      objetivo: row.budgetSum,
      desviacion: row.salesSum - row.budgetSum,
      desviacionPorcentaje: row.budgetSum > 0 ? ((row.salesSum - row.budgetSum) / row.budgetSum) * 100 : 0
    }));

    // 5.1. Filtrado por búsqueda
    let filteredResults = results;
    if (search && search.trim() !== '') {
      const s = search.toLowerCase();
      filteredResults = results.filter(r => 
        (r.customerCode && r.customerCode.toLowerCase().includes(s)) || 
        (r.customerName && r.customerName.toLowerCase().includes(s))
      );
    }

    let totalSales = 0;
    let totalBudget = 0;

    filteredResults.forEach((val) => {
      totalSales += val.facturacion;
      totalBudget += val.objetivo;
    });

    // 6. Ordenación dinámica según parámetros
    if (sortBy) {
      filteredResults.sort((a, b) => {
        let valA = (a as any)[sortBy];
        let valB = (b as any)[sortBy];

        // Manejo de nulos/undefined
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDir === 'asc' 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        }
        return sortDir === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      });
    } else {
      // Orden por defecto: Facturación descendente
      filteredResults.sort((a, b) => b.facturacion - a.facturacion);
    }


    const devEuros = totalSales - totalBudget;
    const devPct = totalBudget > 0 ? (devEuros / totalBudget) * 100 : 0;

    // 7. KPIs adicionales (Pedidos y Pendiente de facturar)
    // Estos KPIs muestran el total anual según petición del usuario, ignorando el filtro de meses
    const ordersWhere: any = {
      shipment_date: {
        gte: startDate,
        lte: endDate,
      }
    };
    
    // Filtro por Cliente
    if (customerCode && String(customerCode).trim() !== "") {
      ordersWhere.customer_code = String(customerCode).trim();
    } else if (salespersonCode && String(salespersonCode).trim() !== "") {
      // Filtro por Vendedor (via relación)
      ordersWhere.customer = { salesperson_code: String(salespersonCode).trim() };
    }

    // Filtro por Familia / Subfamilia
    if ((familyCode && String(familyCode).trim() !== "") || (subfamilyCode && String(subfamilyCode).trim() !== "")) {
      if (itemNos && itemNos.length > 0) {
        ordersWhere.item_code = { in: itemNos };
      } else {
        // Si se pide filtro pero no hay productos, forzamos vacío
        ordersWhere.item_code = "NO_PRODUCTS_FOUND";
      }
    }

    // Ejecutamos la consulta de pedidos
    const ordersRaw = await this.prisma.sales_orders.findMany({
      where: ordersWhere,
      select: { 
        outstanding_quantity: true, 
        qty_shipped_not_invoiced: true, 
        unit_price: true 
      },
    });

    let totalCartera = 0;
    let totalEnviadoNoFacturado = 0;

    if (ordersRaw && ordersRaw.length > 0) {
      for (const order of ordersRaw) {
        const price = Number(order.unit_price) || 0;
        const outstanding = Number(order.outstanding_quantity) || 0;
        const shippedNotInv = Number(order.qty_shipped_not_invoiced) || 0;

        totalCartera += (outstanding * price);
        totalEnviadoNoFacturado += (shippedNotInv * price);
      }
    }





    return {

      kpis: {
        ventas: totalSales,
        objetivo: totalBudget,
        desviacionEur: devEuros,
        desviacionPct: devPct,
        carteraVentas: totalCartera,
        enviadosFacturar: totalEnviadoNoFacturado,
      },

      rows: filteredResults.slice(skip ? Number(skip) : 0, take ? (Number(skip) || 0) + Number(take) : undefined),
      total: filteredResults.length
    };
  }

  async getSalesBudgetEvolution(filters: {
    year: number;
    salespersonCode?: string;
    familyCode?: string;
    subfamilyCode?: string;
    customerCode?: string;
    search?: string;
  }) {
    const { year, salespersonCode, familyCode, subfamilyCode, customerCode, search } = filters;


    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // 1. Where clauses
    const salesWhere: any = {
      document_type: { in: SALES_DOC_TYPES },
      reg_date: { gte: startDate, lte: endDate }
    };
    if (salespersonCode) salesWhere.salesperson_code = salespersonCode;
    if (customerCode) salesWhere.source_no = customerCode;

    const budgetWhere: any = {
      budget_date: { gte: startDate, lte: endDate }
    };
    if (salespersonCode) budgetWhere.salesperson_code = salespersonCode;
    if (customerCode) budgetWhere.customer_code = customerCode;

    if (search && search.trim() !== '') {
      const matchingCustomers = await this.prisma.customers.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { client_id: { contains: search, mode: 'insensitive' } }
          ]
        },
        select: { client_id: true }
      });
      const customerIds = matchingCustomers.map(c => c.client_id);
      salesWhere.source_no = { in: customerIds };
      budgetWhere.customer_code = { in: customerIds };
    }

    if (familyCode || subfamilyCode) {
      const matchingProducts = await this.prisma.products.findMany({
        where: {
          subfamily_code: subfamilyCode || undefined,
          category: familyCode ? { family_code: familyCode } : undefined,
        },
        select: { item_no: true }
      });
      const itemNos = matchingProducts.map(p => p.item_no);
      salesWhere.item_no = { in: itemNos };
      budgetWhere.item_no = { in: itemNos };
    }

    const [salesByDay, budgetsByDay] = await Promise.all([
      this.prisma.value_entries.groupBy({
        by: ['reg_date'],
        _sum: { sales_amount: true },
        where: salesWhere,
      }),
      this.prisma.sales_budgets.groupBy({
        by: ['budget_date'],
        _sum: { monthly_budget: true },
        where: budgetWhere,
      })
    ]);

    const monthsData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      ventas: 0,
      objetivo: 0
    }));

    salesByDay.forEach(sale => {
      if (!sale.reg_date) return;
      const d = new Date(sale.reg_date);
      const m = d.getMonth();
      monthsData[m].ventas += sale._sum.sales_amount ? Number(sale._sum.sales_amount) : 0;
    });

    budgetsByDay.forEach(budget => {
      if (!budget.budget_date) return;
      const d = new Date(budget.budget_date);
      const m = d.getMonth();
      monthsData[m].objetivo += budget._sum.monthly_budget ? Number(budget._sum.monthly_budget) : 0;
    });


    return monthsData;
  }

  /**
   * Obtiene el ranking de productos más vendidos
   */
  async getTopProducts(filters: {
    year: number;
    salespersonCode?: string;
    take?: number;
  }) {
    const { year, salespersonCode, take = 5 } = filters;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const where: any = {
      document_type: { in: SALES_DOC_TYPES },
      reg_date: { gte: startDate, lte: endDate },
    };
    if (salespersonCode) where.salesperson_code = salespersonCode;

    const salesByProduct = await this.prisma.value_entries.groupBy({
      by: ['item_no'],
      _sum: { sales_amount: true },
      where,
      orderBy: {
        _sum: {
          sales_amount: 'desc'
        }
      },
      take: Number(take),
    });

    const itemNos = salesByProduct.map(s => s.item_no);
    const products = await this.prisma.products.findMany({
      where: { item_no: { in: itemNos } },
      select: { item_no: true, description: true }
    });
    const productsDict = products.reduce((acc, p) => {
      acc[p.item_no] = p.description || p.item_no;
      return acc;
    }, {} as Record<string, string>);

    return salesByProduct.map(s => ({
      itemNo: s.item_no,
      description: productsDict[s.item_no] || s.item_no,
      totalSales: s._sum.sales_amount ? Number(s._sum.sales_amount) : 0
    }));
  }

  /**
   * Obtiene las fechas correspondientes a los meses seleccionados de un año
   */
  private async getDatesForMonths(year: number, months?: number[]) {
    const where: any = { year };
    if (months && months.length > 0) {
      where.month = { in: months };
    }
    const dates = await this.prisma.calendar.findMany({
      where,
      select: { date: true }
    });
    return dates.map(d => d.date);
  }
}

