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

    // 5.1. Lógica especial para Cliente Nuevo (99999999)
    // Calculamos el total de facturación de todos los clientes creados en el año actual
    const totalNewClientsSales = results
      .filter(r => r.isNew)
      .reduce((acc, curr) => acc + curr.facturacion, 0);

    // Buscamos o inyectamos la fila 99999999
    let placeholderIndex = results.findIndex(r => r.customerCode === '99999999');
    
    if (placeholderIndex !== -1) {
      results[placeholderIndex].facturacion = totalNewClientsSales;
      results[placeholderIndex].desviacion = results[placeholderIndex].facturacion - results[placeholderIndex].objetivo;
      results[placeholderIndex].desviacionPorcentaje = results[placeholderIndex].objetivo > 0 
        ? (results[placeholderIndex].desviacion / results[placeholderIndex].objetivo) * 100 
        : 0;
      (results[placeholderIndex] as any).excludeFacturacionFromTotal = true;
    } else {
      // Si no existe, la añadimos (aunque suele estar en presupuestos)
      results.push({
        customerCode: '99999999',
        customerName: 'CLIENTE NUEVO',
        isNew: false,
        facturacion: totalNewClientsSales,
        objetivo: 0,
        desviacion: totalNewClientsSales,
        desviacionPorcentaje: 0,
        excludeFacturacionFromTotal: true
      } as any);
    }

    // 5.2. Filtrado por búsqueda
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

    filteredResults.forEach((val: any) => {
      totalSales += val.excludeFacturacionFromTotal ? 0 : val.facturacion;
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
    const ordersWhere: any = {};
    
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
        facturacionNuevos: totalNewClientsSales,
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
   * Obtiene los códigos únicos de Product Manager desde product_categories
   */
  async getPmCodes() {
    const categories = await this.prisma.product_categories.findMany({
      select: { pm_code: true },
      distinct: ['pm_code'],
      orderBy: { pm_code: 'asc' }
    });
    const pmCodes = categories.map(c => c.pm_code).filter(Boolean);

    // Enriquecer con nombre del sales_rep si existe
    const reps = await this.prisma.sales_reps.findMany({
      where: { code: { in: pmCodes } },
      select: { code: true, name: true }
    });
    const repsDict = reps.reduce((acc, r) => { acc[r.code] = r.name; return acc; }, {} as Record<string, string>);

    return pmCodes.map(code => ({ code, name: repsDict[code] || code }));
  }

  /**
   * Rendimiento de presupuestos agrupado por producto dentro de cada cliente.
   * Retorna estructura jerárquica: cliente → productos
   */
  async getProductBudgetPerformance(filters: {
    year: number;
    months?: number[];
    salespersonCode?: string;
    pmCode?: string;
    familyCode?: string;
    subfamilyCode?: string;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    take?: number;
    skip?: number;
  }) {
    const {
      year, months, salespersonCode, pmCode, familyCode, subfamilyCode,
      search, sortBy, sortDir, take, skip
    } = filters;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // 1. Resolver item_nos según filtros de PM / familia / subfamilia
    let itemNos: string[] | null = null;

    if (pmCode || familyCode || subfamilyCode) {
      const catWhere: any = {};
      if (pmCode) catWhere.pm_code = pmCode;
      if (familyCode) catWhere.family_code = familyCode;
      if (subfamilyCode) catWhere.subfamily_code = subfamilyCode;

      const matchingCategories = await this.prisma.product_categories.findMany({
        where: catWhere,
        select: { subfamily_code: true }
      });
      const subfamilyCodes = matchingCategories.map(c => c.subfamily_code);

      const matchingProducts = await this.prisma.products.findMany({
        where: { subfamily_code: { in: subfamilyCodes } },
        select: { item_no: true }
      });
      itemNos = matchingProducts.map(p => p.item_no);
    }

    // 2. Where clause para value_entries
    const salesWhere: any = {
      document_type: { in: SALES_DOC_TYPES },
      reg_date: { gte: startDate, lte: endDate },
    };

    if (months && months.length > 0) {
      salesWhere.reg_date = { in: await this.getDatesForMonths(year, months) };
    }
    if (salespersonCode) salesWhere.salesperson_code = salespersonCode;
    if (itemNos !== null) salesWhere.item_no = { in: itemNos };

    // 3. Where clause para sales_budgets
    const budgetWhere: any = {
      budget_date: { gte: startDate, lte: endDate },
    };
    if (months && months.length > 0) {
      budgetWhere.budget_date = { in: await this.getDatesForMonths(year, months) };
    }
    if (salespersonCode) budgetWhere.salesperson_code = salespersonCode;
    if (itemNos !== null) budgetWhere.item_no = { in: itemNos };

    // 4. Obtener datos agrupados por cliente+producto en paralelo
    const [salesRaw, budgetsRaw] = await Promise.all([
      this.prisma.value_entries.groupBy({
        by: ['source_no', 'item_no'],
        _sum: { sales_amount: true },
        where: salesWhere,
      }),
      this.prisma.sales_budgets.groupBy({
        by: ['customer_code', 'item_no'],
        _sum: { monthly_budget: true },
        where: budgetWhere,
      })
    ]);

    // 5. Recopilar IDs únicos de clientes y productos
    const customerIds = new Set<string>();
    const productIds = new Set<string>();

    salesRaw.forEach(s => {
      if (s.source_no) customerIds.add(s.source_no);
      if (s.item_no) productIds.add(s.item_no);
    });
    budgetsRaw.forEach(b => {
      if (b.customer_code) customerIds.add(b.customer_code);
      if (b.item_no) productIds.add(b.item_no);
    });

    // 6. Obtener nombres
    const customers = customerIds.size > 0
      ? await this.prisma.customers.findMany({
          where: { client_id: { in: Array.from(customerIds) } },
          select: { client_id: true, name: true, created_at: true }
        })
      : [] as { client_id: string; name: string; created_at: Date | null }[];

    const productsData = productIds.size > 0
      ? await this.prisma.products.findMany({
          where: { item_no: { in: Array.from(productIds) } },
          select: { item_no: true, description: true }
        })
      : [] as { item_no: string; description: string | null }[];

    const customersDict: Record<string, { name: string; since: Date | null }> = {};
    customers.forEach(c => { customersDict[c.client_id] = { name: c.name, since: c.created_at }; });

    const productsDict: Record<string, string> = {};
    productsData.forEach(p => { productsDict[p.item_no] = p.description || p.item_no; });

    // 7. Merge: cliente → Map<item_no, {sales, budget}>
    const clientMap = new Map<string, Map<string, { sales: number; budget: number }>>();

    salesRaw.forEach(sale => {
      if (!sale.source_no) return;
      if (!clientMap.has(sale.source_no)) clientMap.set(sale.source_no, new Map());
      const prodMap = clientMap.get(sale.source_no)!;
      const existing = prodMap.get(sale.item_no) || { sales: 0, budget: 0 };
      existing.sales += sale._sum.sales_amount ? Number(sale._sum.sales_amount) : 0;
      prodMap.set(sale.item_no, existing);
    });

    budgetsRaw.forEach(budget => {
      if (!budget.customer_code) return;
      if (!clientMap.has(budget.customer_code)) clientMap.set(budget.customer_code, new Map());
      const prodMap = clientMap.get(budget.customer_code)!;
      const existing = prodMap.get(budget.item_no) || { sales: 0, budget: 0 };
      existing.budget += budget._sum.monthly_budget ? Number(budget._sum.monthly_budget) : 0;
      prodMap.set(budget.item_no, existing);
    });

    // 8. Construir resultado jerárquico
    let results = Array.from(clientMap.entries()).map(([customerCode, prodMap]) => {
      const cInfo = customersDict[customerCode];
      let totalSales = 0;
      let totalBudget = 0;

      const productRows = Array.from(prodMap.entries()).map(([itemNo, vals]) => {
        totalSales += vals.sales;
        totalBudget += vals.budget;
        return {
          itemNo,
          productName: productsDict[itemNo] || itemNo,
          facturacion: vals.sales,
          objetivo: vals.budget,
          desviacion: vals.sales - vals.budget,
          desviacionPorcentaje: vals.budget > 0 ? ((vals.sales - vals.budget) / vals.budget) * 100 : 0,
        };
      });

      // Ordenar productos por facturación descendente
      productRows.sort((a, b) => b.facturacion - a.facturacion);

      return {
        customerCode,
        customerName: cInfo ? cInfo.name : customerCode,
        isNew: cInfo?.since ? new Date(cInfo.since).getFullYear() === new Date().getFullYear() : false,
        facturacion: totalSales,
        objetivo: totalBudget,
        desviacion: totalSales - totalBudget,
        desviacionPorcentaje: totalBudget > 0 ? ((totalSales - totalBudget) / totalBudget) * 100 : 0,
        products: productRows,
      };
    });

    // 8.1 Lógica especial para Cliente Nuevo (99999999)
    // Calculamos el total de facturación de todos los productos de clientes creados en el año actual
    const totalNewClientsSales = results
      .filter(r => r.isNew)
      .reduce((acc, curr) => acc + curr.facturacion, 0);

    // Buscamos o inyectamos la fila 99999999
    let placeholderIndex = results.findIndex(r => r.customerCode === '99999999');
    if (placeholderIndex !== -1) {
      results[placeholderIndex].facturacion = totalNewClientsSales;
      results[placeholderIndex].desviacion = results[placeholderIndex].facturacion - results[placeholderIndex].objetivo;
      results[placeholderIndex].desviacionPorcentaje = results[placeholderIndex].objetivo > 0 
        ? (results[placeholderIndex].desviacion / results[placeholderIndex].objetivo) * 100 
        : 0;
      (results[placeholderIndex] as any).customerName = 'CLIENTE NUEVO';
      (results[placeholderIndex] as any).excludeFacturacionFromTotal = true;
    } else {
      results.push({
        customerCode: '99999999',
        customerName: 'CLIENTE NUEVO',
        isNew: false,
        facturacion: totalNewClientsSales,
        objetivo: 0,
        desviacion: totalNewClientsSales,
        desviacionPorcentaje: 0,
        products: [],
        excludeFacturacionFromTotal: true
      } as any);
    }

    // 9. Filtrado por búsqueda
    if (search && search.trim() !== '') {
      const s = search.toLowerCase();
      results = results.filter(r =>
        (r.customerCode && r.customerCode.toLowerCase().includes(s)) ||
        (r.customerName && r.customerName.toLowerCase().includes(s))
      );
    }

    // 10. KPIs globales
    let totalSales = 0;
    let totalBudget = 0;
    results.forEach((r: any) => { 
      totalSales += r.excludeFacturacionFromTotal ? 0 : r.facturacion; 
      totalBudget += r.objetivo; 
    });
    const devEuros = totalSales - totalBudget;
    const devPct = totalBudget > 0 ? (devEuros / totalBudget) * 100 : 0;

    // 11. KPIs de pedidos (Cartera + Pend. Facturar)
    const ordersWhere: any = {};
    if (salespersonCode) ordersWhere.customer = { salesperson_code: salespersonCode };
    if (itemNos !== null && itemNos.length > 0) ordersWhere.item_code = { in: itemNos };

    const ordersRaw = await this.prisma.sales_orders.findMany({
      where: ordersWhere,
      select: { outstanding_quantity: true, qty_shipped_not_invoiced: true, unit_price: true },
    });

    let totalCartera = 0;
    let totalEnviadoNoFacturado = 0;
    for (const order of ordersRaw) {
      const price = Number(order.unit_price) || 0;
      totalCartera += (Number(order.outstanding_quantity) || 0) * price;
      totalEnviadoNoFacturado += (Number(order.qty_shipped_not_invoiced) || 0) * price;
    }

    // 12. Ordenación
    if (sortBy) {
      results.sort((a, b) => {
        let valA = (a as any)[sortBy];
        let valB = (b as any)[sortBy];
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDir === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      });
    } else {
      results.sort((a, b) => b.facturacion - a.facturacion);
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
      rows: results.slice(skip ? Number(skip) : 0, take ? (Number(skip) || 0) + Number(take) : undefined),
      total: results.length
    };
  }

  /**
   * Evolución mensual de ventas vs presupuesto, con filtro de Product Manager
   */
  async getProductBudgetEvolution(filters: {
    year: number;
    salespersonCode?: string;
    pmCode?: string;
    familyCode?: string;
    subfamilyCode?: string;
    search?: string;
  }) {
    const { year, salespersonCode, pmCode, familyCode, subfamilyCode, search } = filters;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Resolver item_nos
    let itemNos: string[] | null = null;
    if (pmCode || familyCode || subfamilyCode) {
      const catWhere: any = {};
      if (pmCode) catWhere.pm_code = pmCode;
      if (familyCode) catWhere.family_code = familyCode;
      if (subfamilyCode) catWhere.subfamily_code = subfamilyCode;

      const matchingCategories = await this.prisma.product_categories.findMany({
        where: catWhere,
        select: { subfamily_code: true }
      });
      const subfamilyCodes = matchingCategories.map(c => c.subfamily_code);
      const matchingProducts = await this.prisma.products.findMany({
        where: { subfamily_code: { in: subfamilyCodes } },
        select: { item_no: true }
      });
      itemNos = matchingProducts.map(p => p.item_no);
    }

    const salesWhere: any = {
      document_type: { in: SALES_DOC_TYPES },
      reg_date: { gte: startDate, lte: endDate }
    };
    if (salespersonCode) salesWhere.salesperson_code = salespersonCode;
    if (itemNos !== null) salesWhere.item_no = { in: itemNos };

    const budgetWhere: any = {
      budget_date: { gte: startDate, lte: endDate }
    };
    if (salespersonCode) budgetWhere.salesperson_code = salespersonCode;
    if (itemNos !== null) budgetWhere.item_no = { in: itemNos };

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
      const m = new Date(sale.reg_date).getMonth();
      monthsData[m].ventas += sale._sum.sales_amount ? Number(sale._sum.sales_amount) : 0;
    });

    budgetsByDay.forEach(budget => {
      if (!budget.budget_date) return;
      const m = new Date(budget.budget_date).getMonth();
      monthsData[m].objetivo += budget._sum.monthly_budget ? Number(budget._sum.monthly_budget) : 0;
    });

    return monthsData;
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

