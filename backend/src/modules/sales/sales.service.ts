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
    take?: number;
    skip?: number;
  }) {
    const { year, months, salespersonCode, familyCode, subfamilyCode, take, skip } = filters;

    // 1. Where clause para value_entries
    const salesWhere: any = {
      document_type: { in: SALES_DOC_TYPES },
      calendar: { year },
    };
    if (months && months.length > 0) {
      salesWhere.calendar.month = { in: months };
    }
    if (salespersonCode) salesWhere.salesperson_code = salespersonCode;
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
      calendar: { year },
    };
    if (months && months.length > 0) {
      budgetWhere.calendar.month = { in: months };
    }
    if (salespersonCode) budgetWhere.salesperson_code = salespersonCode;
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
        select: { client_id: true, name: true, customer_since: true }
      });
      customersDict = customers.reduce((acc, c) => {
        acc[c.client_id] = { name: c.name, since: c.customer_since };
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

    // 5. Array final y totales
    const results = Array.from(mergedData.values()).map(row => ({
      customerCode: row.customerCode,
      customerName: row.customerName,
      isNew: row.isNew,
      facturacion: row.salesSum,
      objetivo: row.budgetSum,
      desviacion: row.salesSum - row.budgetSum,
      desviacionPorcentaje: row.budgetSum > 0 ? ((row.salesSum - row.budgetSum) / row.budgetSum) * 100 : 0
    }));

    let totalSales = 0;
    let totalBudget = 0;

    mergedData.forEach((val) => {
      totalSales += val.salesSum;
      totalBudget += val.budgetSum;
    });

    // Ordenar por facturación descendente. Si empatan (ej: ambos a cero), por objetivo descendente.
    results.sort((a, b) => {
      if (b.facturacion !== a.facturacion) return b.facturacion - a.facturacion;
      return b.objetivo - a.objetivo;
    });

    const devEuros = totalSales - totalBudget;
    const devPct = totalBudget > 0 ? (devEuros / totalBudget) * 100 : 0;

    return {
      kpis: {
        ventas: totalSales,
        objetivo: totalBudget,
        desviacionEur: devEuros,
        desviacionPct: devPct,
        carteraVentas: 0, // Placeholder
        enviadosFacturar: 0, // Placeholder
      },
      rows: results.slice(skip ? Number(skip) : 0, take ? (Number(skip) || 0) + Number(take) : undefined),
      total: results.length
    };
  }

  /**
   * Evolución mensual (1 a 12) del año para ventas vs presupuestos
   */
  async getSalesBudgetEvolution(filters: {
    year: number;
    salespersonCode?: string;
    familyCode?: string;
    subfamilyCode?: string;
  }) {
    const { year, salespersonCode, familyCode, subfamilyCode } = filters;

    // 1. Where clauses
    const salesWhere: any = {
      document_type: { in: SALES_DOC_TYPES },
      calendar: { year },
    };
    if (salespersonCode) salesWhere.salesperson_code = salespersonCode;

    const budgetWhere: any = {
      calendar: { year },
    };
    if (salespersonCode) budgetWhere.salesperson_code = salespersonCode;

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

    // Ya hemos aplicado los filtros de item_no arriba si era necesario

    // Agrupamos por reg_date (calendar) o extraemos el mes
    // Nota: Como groupBy no soporta relaciones en by, o agrupamos por reg_date y parseamos,
    // o hacemos 12 consultas concurrentes. Mejor traer raw_data o count/group by reg_date.
    
    // Al ser un año (365 días max), podemos traer la agregación por fecha y sumar en Javascript
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
      const m = new Date(sale.reg_date).getMonth(); // 0 al 11
      if (salesWhere.calendar.year === new Date(sale.reg_date).getFullYear()) {
         monthsData[m].ventas += sale._sum.sales_amount ? Number(sale._sum.sales_amount) : 0;
      }
    });

    budgetsByDay.forEach(budget => {
      if (!budget.budget_date) return;
      const m = new Date(budget.budget_date).getMonth();
      if (budgetWhere.calendar.year === new Date(budget.budget_date).getFullYear()) {
        monthsData[m].objetivo += budget._sum.monthly_budget ? Number(budget._sum.monthly_budget) : 0;
      }
    });

    return monthsData;
  }
}

