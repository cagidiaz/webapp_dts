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
    limitToToday?: boolean;
  }) {
    const { 
      year, months, salespersonCode, familyCode, subfamilyCode, 
      customerCode, search, sortBy, sortDir, take, skip, limitToToday 
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

    // 1. Obtener fechas exactas para el periodo
    const isTodayFilter = limitToToday || false;
    const dates = await this.getDatesForMonths(year, months, isTodayFilter);

    // Where clause para sales_documents
    const docsWhere: any = {
      posting_date: { in: dates },
    };
    if (customerCode) docsWhere.customer_no = customerCode;
    if (salespersonCode) {
      docsWhere.customer = { salesperson_code: salespersonCode };
    }

    let itemNos: string[] = [];
    if (familyCode || subfamilyCode) {
      const matchingProducts = await this.prisma.products.findMany({
        where: {
          subfamily_code: subfamilyCode || undefined,
          category: familyCode ? { family_code: familyCode } : undefined,
        },
        select: { item_no: true },
      });
      itemNos = matchingProducts.map((p) => p.item_no);
      if (itemNos.length > 0) {
        docsWhere.lines = {
          some: { product_no: { in: itemNos } },
        };
      }
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
        in: dates,
      };
    }
    if (salespersonCode) budgetWhere.salesperson_code = salespersonCode;
    if (customerCode) budgetWhere.customer_code = customerCode;
    if (familyCode || subfamilyCode) {
      budgetWhere.item_no = { in: itemNos };
    }

    // 3. Fechas del año anterior (LYTD)
    const prevYear = year - 1;
    const prevYearDates = await this.getDatesForMonths(prevYear, months, isTodayFilter);

    const prevDocsWhere: any = {
      posting_date: { in: prevYearDates },
    };
    if (customerCode) prevDocsWhere.customer_no = customerCode;
    if (salespersonCode) {
      prevDocsWhere.customer = { salesperson_code: salespersonCode };
    }
    if (itemNos.length > 0) {
      prevDocsWhere.lines = {
        some: { product_no: { in: itemNos } },
      };
    }

    const [currentYearDocs, budgetsRaw, prevYearDocs] = await Promise.all([
      this.prisma.sales_documents.findMany({
        where: docsWhere,
        select: {
          document_no: true,
          document_type: true,
          total_amount_excl_vat: true,
          customer_no: true,
        },
      }),
      this.prisma.sales_budgets.groupBy({
        by: ['customer_code'],
        _sum: { monthly_budget: true },
        where: budgetWhere,
      }),
      prevYearDates.length > 0
        ? this.prisma.sales_documents.findMany({
            where: prevDocsWhere,
            select: {
              document_type: true,
              total_amount_excl_vat: true,
              customer_no: true,
            },
          })
        : Promise.resolve([] as any[]),
    ]);

    // Desglose de facturación actual
    let totalFacturasOrdinarias = 0;
    let totalPrepagosFacturados = 0;
    let totalAbonosDevoluciones = 0;

    const currentSalesByCustomer = new Map<string, number>();

    for (const doc of currentYearDocs) {
      const amt = Number(doc.total_amount_excl_vat) || 0;
      const isAbono = doc.document_type === 'Abono';
      const isPrepay = doc.document_no.startsWith('PFV');

      if (isAbono) {
        totalAbonosDevoluciones += amt;
      } else if (isPrepay) {
        totalPrepagosFacturados += amt;
      } else {
        totalFacturasOrdinarias += amt;
      }

      const signedAmt = isAbono ? -amt : amt;
      const cCode = doc.customer_no;
      if (cCode) {
        currentSalesByCustomer.set(cCode, (currentSalesByCustomer.get(cCode) || 0) + signedAmt);
      }
    }

    const prevSalesByCustomer = new Map<string, number>();
    for (const doc of prevYearDocs) {
      const amt = Number(doc.total_amount_excl_vat) || 0;
      const isAbono = doc.document_type === 'Abono';
      const signedAmt = isAbono ? -amt : amt;
      const cCode = doc.customer_no;
      if (cCode) {
        prevSalesByCustomer.set(cCode, (prevSalesByCustomer.get(cCode) || 0) + signedAmt);
      }
    }

    // Mejor enfoque para nombres de cliente: extraer IDs
    const customerIds = new Set<string>();
    currentSalesByCustomer.forEach((_, cCode) => customerIds.add(cCode));
    budgetsRaw.forEach((b) => b.customer_code && customerIds.add(b.customer_code));
    prevSalesByCustomer.forEach((_, cCode) => customerIds.add(cCode));

    let customersDict: Record<string, { name: string; since: Date | null }> = {};
    if (customerIds.size > 0) {
      const customers = await this.prisma.customers.findMany({
        where: { client_id: { in: Array.from(customerIds) } },
        select: { client_id: true, name: true, created_at: true },
      });
      customersDict = customers.reduce((acc, c) => {
        acc[c.client_id] = { name: c.name, since: c.created_at };
        return acc;
      }, {} as Record<string, { name: string; since: Date | null }>);
    }

    // 4. Merge data por cliente
    const mergedData = new Map<string, any>();

    currentSalesByCustomer.forEach((salesSum, cCode) => {
      const cInfo = customersDict[cCode];
      mergedData.set(cCode, {
        customerCode: cCode,
        customerName: cInfo ? cInfo.name : cCode === '99999999' ? 'CLIENTE NUEVO' : cCode,
        isNew: cInfo?.since ? new Date(cInfo.since).getFullYear() === new Date().getFullYear() : false,
        salesSum,
        budgetSum: 0,
        prevYearSales: 0,
      });
    });

    prevSalesByCustomer.forEach((prevYearSales, cCode) => {
      if (mergedData.has(cCode)) {
        mergedData.get(cCode).prevYearSales = prevYearSales;
      } else {
        const cInfo = customersDict[cCode];
        mergedData.set(cCode, {
          customerCode: cCode,
          customerName: cInfo ? cInfo.name : cCode === '99999999' ? 'CLIENTE NUEVO' : cCode,
          isNew: cInfo?.since ? new Date(cInfo.since).getFullYear() === new Date().getFullYear() : false,
          salesSum: 0,
          budgetSum: 0,
          prevYearSales,
        });
      }
    });

    budgetsRaw.forEach((budget) => {
      if (!budget.customer_code) return;
      const bCode = budget.customer_code;
      const bSum = budget._sum.monthly_budget ? Number(budget._sum.monthly_budget) : 0;
      if (mergedData.has(bCode)) {
        mergedData.get(bCode).budgetSum = bSum;
      } else {
        const cInfo = customersDict[bCode];
        mergedData.set(bCode, {
          customerCode: bCode,
          customerName: cInfo ? cInfo.name : bCode === '99999999' ? 'CLIENTE NUEVO' : bCode,
          isNew: cInfo?.since ? new Date(cInfo.since).getFullYear() === new Date().getFullYear() : false,
          salesSum: 0,
          budgetSum: bSum,
          prevYearSales: 0,
        });
      }
    });

    // 5. Array final
    const results = Array.from(mergedData.values()).map(row => ({
      customerCode: row.customerCode,
      customerName: row.customerName,
      isNew: row.isNew,
      facturacion: row.salesSum,
      facturacionAnioAnterior: row.prevYearSales,
      objetivo: row.budgetSum,
      desviacion: row.salesSum - row.budgetSum,
      desviacionPorcentaje: row.budgetSum > 0 ? ((row.salesSum - row.budgetSum) / row.budgetSum) * 100 : 0
    }));

    // 5.1. Lógica especial para Cliente Nuevo (99999999)
    // Calculamos el total de facturación de todos los clientes creados en el año actual
    const totalNewClientsSales = results
      .filter(r => r.isNew)
      .reduce((acc, curr) => acc + curr.facturacion, 0);

    // Cantidad real de clientes creados en el año actual (independientemente de si tienen ventas)
    const countNewClients = await this.prisma.customers.count({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate
        },
        ...(salespersonCode ? { salesperson_code: salespersonCode } : {})
      }
    });

    const countNewClientsWithSales = results.filter(r => r.isNew && r.facturacion > 0).length;
    const countNewClientsNoSales = countNewClients - countNewClientsWithSales;

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
    let totalPrevYear = 0;

    filteredResults.forEach((val: any) => {
      totalSales += val.excludeFacturacionFromTotal ? 0 : val.facturacion;
      totalBudget += val.objetivo;
      totalPrevYear += val.facturacionAnioAnterior || 0;
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
        quantity: true,
        outstanding_quantity: true, 
        qty_shipped_not_invoiced: true, 
        line_amount: true,
        type: true
      },
    });

    let totalCartera = 0;
    let totalCarteraAccounts = 0;
    let totalEnviadoNoFacturado = 0;
    let totalEnviadoNoFacturadoAccounts = 0;

    if (ordersRaw && ordersRaw.length > 0) {
      for (const order of ordersRaw) {
        const totalQty = Number(order.quantity) || 0;
        const lineAmount = Number(order.line_amount) || 0;
        
        // Calculamos el precio efectivo (neto) para incluir descuentos
        const effectivePrice = totalQty > 0 ? (lineAmount / totalQty) : 0;
        
        // Si el precio efectivo es 0, ignoramos la línea según lo solicitado
        if (effectivePrice === 0) continue;

        const outstanding = Number(order.outstanding_quantity) || 0;
        const shippedNotInv = Number(order.qty_shipped_not_invoiced) || 0;
        const isAccount = order.type === 'G/L Account';

        const lineCartera = (outstanding * effectivePrice);
        const lineShippedNotInv = (shippedNotInv * effectivePrice);

        totalCartera += lineCartera;
        if (isAccount) totalCarteraAccounts += lineCartera;

        totalEnviadoNoFacturado += lineShippedNotInv;
        if (isAccount) totalEnviadoNoFacturadoAccounts += lineShippedNotInv;
      }
    }

    // Prepagos vivos para descontar en Cartera de pedidos:
    // Facturas PFV registradas que aún no han sido compensadas en una factura final FV
    const pfvs = currentYearDocs.filter((d) => d.document_no && d.document_no.startsWith('PFV'));
    let totalPrepagosDescontados = 0;

    if (pfvs.length > 0) {
      const customerCodes = Array.from(new Set(pfvs.map((p) => p.customer_no).filter(Boolean)));
      const compensaciones = await this.prisma.sales_document_lines.findMany({
        where: {
          document: {
            customer_no: { in: customerCodes },
            document_no: { startsWith: 'FV' },
          },
          product_no: { startsWith: '438' },
          line_amount: { lt: 0 },
        },
        select: {
          line_amount: true,
          document: { select: { customer_no: true } },
        },
      });

      for (const p of pfvs) {
        const amt = Number(p.total_amount_excl_vat) || 0;
        const isCompensated = compensaciones.some(
          (c) =>
            c.document?.customer_no === p.customer_no &&
            Math.abs(Math.abs(Number(c.line_amount)) - amt) < 1,
        );
        if (!isCompensated) {
          totalPrepagosDescontados += amt;
        }
      }
    }

    const totalCarteraBruta = totalCartera;
    const totalEnviadoNoFacturadoBruto = totalEnviadoNoFacturado;
    const totalEnviadoNoFacturadoNeto = Math.max(0, totalEnviadoNoFacturadoBruto - totalPrepagosDescontados);

    return {
      kpis: {
        ventas: totalSales,
        facturasOrdinarias: totalFacturasOrdinarias,
        prepagosFacturados: totalPrepagosFacturados,
        abonosDevoluciones: totalAbonosDevoluciones,
        objetivo: totalBudget,
        desviacionEur: devEuros,
        desviacionPct: devPct,
        carteraVentas: totalCarteraBruta,
        carteraVentasBruta: totalCarteraBruta,
        carteraVentasAccounts: totalCarteraAccounts,
        enviadosFacturar: totalEnviadoNoFacturadoNeto,
        enviadosFacturarBruto: totalEnviadoNoFacturadoBruto,
        prepagosDescontadosFacturar: totalPrepagosDescontados,
        prepagosDescontadosCartera: 0,
        enviadosFacturarAccounts: totalEnviadoNoFacturadoAccounts,
        facturacionNuevos: totalNewClientsSales,
        countNuevos: countNewClients,
        countNuevosSinVenta: countNewClientsNoSales,
        facturacionAnioAnterior: totalPrevYear,
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
    const docsWhere: any = {
      posting_date: { gte: startDate, lte: endDate },
    };
    if (salespersonCode) docsWhere.customer = { salesperson_code: salespersonCode };
    if (customerCode) docsWhere.customer_no = customerCode;

    const budgetWhere: any = {
      budget_date: { gte: startDate, lte: endDate },
    };
    if (salespersonCode) budgetWhere.salesperson_code = salespersonCode;
    if (customerCode) budgetWhere.customer_code = customerCode;

    const prevYearStartDate = new Date(year - 1, 0, 1);
    const prevYearEndDate = new Date(year - 1, 11, 31, 23, 59, 59);

    const prevDocsWhere: any = {
      posting_date: { gte: prevYearStartDate, lte: prevYearEndDate },
    };
    if (salespersonCode) prevDocsWhere.customer = { salesperson_code: salespersonCode };
    if (customerCode) prevDocsWhere.customer_no = customerCode;

    if (search && search.trim() !== '') {
      const matchingCustomers = await this.prisma.customers.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { client_id: { contains: search, mode: 'insensitive' } },
          ],
        },
        select: { client_id: true },
      });
      const customerIds = matchingCustomers.map((c) => c.client_id);
      docsWhere.customer_no = { in: customerIds };
      prevDocsWhere.customer_no = { in: customerIds };
      budgetWhere.customer_code = { in: customerIds };
    }

    let itemNos: string[] = [];
    if (familyCode || subfamilyCode) {
      const matchingProducts = await this.prisma.products.findMany({
        where: {
          subfamily_code: subfamilyCode || undefined,
          category: familyCode ? { family_code: familyCode } : undefined,
        },
        select: { item_no: true },
      });
      itemNos = matchingProducts.map((p) => p.item_no);
      if (itemNos.length > 0) {
        docsWhere.lines = { some: { product_no: { in: itemNos } } };
        prevDocsWhere.lines = { some: { product_no: { in: itemNos } } };
        budgetWhere.item_no = { in: itemNos };
      }
    }

    const [salesDocsCurrent, budgetsByDay, salesDocsPrev] = await Promise.all([
      this.prisma.sales_documents.findMany({
        where: docsWhere,
        select: {
          posting_date: true,
          total_amount_excl_vat: true,
          document_type: true,
        },
      }),
      this.prisma.sales_budgets.groupBy({
        by: ['budget_date'],
        _sum: { monthly_budget: true },
        where: budgetWhere,
      }),
      this.prisma.sales_documents.findMany({
        where: prevDocsWhere,
        select: {
          posting_date: true,
          total_amount_excl_vat: true,
          document_type: true,
        },
      }),
    ]);

    const monthsData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      ventas: 0,
      ventasAnterior: 0,
      objetivo: 0,
    }));

    salesDocsCurrent.forEach((doc) => {
      if (!doc.posting_date) return;
      const m = new Date(doc.posting_date).getMonth();
      const amt = Number(doc.total_amount_excl_vat) || 0;
      const signedAmt = doc.document_type === 'Abono' ? -amt : amt;
      monthsData[m].ventas += signedAmt;
    });

    budgetsByDay.forEach((budget) => {
      if (!budget.budget_date) return;
      const d = new Date(budget.budget_date);
      const m = d.getMonth();
      monthsData[m].objetivo += budget._sum.monthly_budget ? Number(budget._sum.monthly_budget) : 0;
    });

    salesDocsPrev.forEach((doc) => {
      if (!doc.posting_date) return;
      const m = new Date(doc.posting_date).getMonth();
      const amt = Number(doc.total_amount_excl_vat) || 0;
      const signedAmt = doc.document_type === 'Abono' ? -amt : amt;
      monthsData[m].ventasAnterior += signedAmt;
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
    productCode?: string;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    take?: number;
    skip?: number;
    limitToToday?: boolean;
  }) {
    const {
      year, months, salespersonCode, pmCode, familyCode, subfamilyCode,
      productCode, search, sortBy, sortDir, take, skip, limitToToday
    } = filters;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // 1. Resolver item_nos según filtros de PM / familia / subfamilia / código producto
    let itemNos: string[] | null = null;

    if (pmCode || familyCode || subfamilyCode || productCode) {
      const catWhere: any = {};
      if (pmCode) catWhere.pm_code = pmCode;
      if (familyCode) catWhere.family_code = familyCode;
      if (subfamilyCode) catWhere.subfamily_code = subfamilyCode;

      let matchingSubfamilies: string[] | undefined = undefined;
      if (pmCode || familyCode || subfamilyCode) {
        const matchingCategories = await this.prisma.product_categories.findMany({
          where: catWhere,
          select: { subfamily_code: true }
        });
        matchingSubfamilies = matchingCategories.map(c => c.subfamily_code).filter(Boolean) as string[];
      }

      const prodWhere: any = {};
      if (matchingSubfamilies) {
        prodWhere.subfamily_code = { in: matchingSubfamilies };
      }
      if (productCode) {
        prodWhere.item_no = { contains: productCode, mode: 'insensitive' };
      }

      const matchingProducts = await this.prisma.products.findMany({
        where: prodWhere,
        select: { item_no: true }
      });
      itemNos = matchingProducts.map(p => p.item_no);
    }

    // 2. Where clause para value_entries
    const salesWhere: any = {
      document_type: { in: SALES_DOC_TYPES },
      reg_date: { gte: startDate, lte: endDate },
    };

    const isTodayFilter = limitToToday || false;
    if (months && months.length > 0) {
      salesWhere.reg_date = { in: await this.getDatesForMonths(year, months, isTodayFilter) };
    }
    if (salespersonCode) salesWhere.salesperson_code = salespersonCode;
    if (itemNos !== null) salesWhere.item_no = { in: itemNos };

    // 3. Where clause para sales_budgets
    const budgetWhere: any = {
      budget_date: { gte: startDate, lte: endDate },
    };
    if (months && months.length > 0) {
      budgetWhere.budget_date = { in: await this.getDatesForMonths(year, months, isTodayFilter) };
    }
    if (salespersonCode) budgetWhere.salesperson_code = salespersonCode;
    if (itemNos !== null) budgetWhere.item_no = { in: itemNos };

    // 4. Obtener datos agrupados por cliente+producto en paralelo
    const prevYear = year - 1;
    const prevYearDates = await this.getDatesForMonths(prevYear, months, isTodayFilter);

    const [salesRaw, budgetsRaw, prevYearSalesRaw] = await Promise.all([
      this.prisma.value_entries.groupBy({
        by: ['source_no', 'item_no'],
        _sum: { sales_amount: true },
        where: salesWhere,
      }),
      this.prisma.sales_budgets.groupBy({
        by: ['customer_code', 'item_no'],
        _sum: { monthly_budget: true },
        where: budgetWhere,
      }),
      prevYearDates.length > 0 
        ? this.prisma.value_entries.groupBy({
            by: ['source_no', 'item_no'],
            _sum: { sales_amount: true },
            where: { ...salesWhere, reg_date: { in: prevYearDates } },
          })
        : Promise.resolve([] as any[])
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
    prevYearSalesRaw.forEach(s => {
      if (s.source_no) customerIds.add(s.source_no);
      if (s.item_no) productIds.add(s.item_no);
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

    // 7. Merge: cliente → Map<item_no, {sales, budget, prevSales}>
    const clientMap = new Map<string, Map<string, { sales: number; budget: number; prevSales: number }>>();

    salesRaw.forEach(sale => {
      if (!sale.source_no) return;
      if (!clientMap.has(sale.source_no)) clientMap.set(sale.source_no, new Map());
      const prodMap = clientMap.get(sale.source_no)!;
      const existing = prodMap.get(sale.item_no) || { sales: 0, budget: 0, prevSales: 0 };
      existing.sales += sale._sum.sales_amount ? Number(sale._sum.sales_amount) : 0;
      prodMap.set(sale.item_no, existing);
    });

    budgetsRaw.forEach(budget => {
      if (!budget.customer_code) return;
      if (!clientMap.has(budget.customer_code)) clientMap.set(budget.customer_code, new Map());
      const prodMap = clientMap.get(budget.customer_code)!;
      const existing = prodMap.get(budget.item_no) || { sales: 0, budget: 0, prevSales: 0 };
      existing.budget += budget._sum.monthly_budget ? Number(budget._sum.monthly_budget) : 0;
      prodMap.set(budget.item_no, existing);
    });

    prevYearSalesRaw.forEach(sale => {
      if (!sale.source_no) return;
      if (!clientMap.has(sale.source_no)) clientMap.set(sale.source_no, new Map());
      const prodMap = clientMap.get(sale.source_no)!;
      const existing = prodMap.get(sale.item_no) || { sales: 0, budget: 0, prevSales: 0 };
      existing.prevSales += sale._sum.sales_amount ? Number(sale._sum.sales_amount) : 0;
      prodMap.set(sale.item_no, existing);
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
          facturacionAnioAnterior: vals.prevSales,
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
        facturacionAnioAnterior: Array.from(prodMap.values()).reduce((acc, v) => acc + v.prevSales, 0),
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
    let totalPrevYear = 0;
    results.forEach((r: any) => { 
      totalSales += r.excludeFacturacionFromTotal ? 0 : r.facturacion; 
      totalBudget += r.objetivo; 
      totalPrevYear += r.facturacionAnioAnterior || 0;
    });
    const devEuros = totalSales - totalBudget;
    const devPct = totalBudget > 0 ? (devEuros / totalBudget) * 100 : 0;

    // 11. KPIs de pedidos (Cartera + Pend. Facturar)
    const ordersWhere: any = {};
    if (salespersonCode) ordersWhere.customer = { salesperson_code: salespersonCode };
    if (itemNos !== null && itemNos.length > 0) ordersWhere.item_code = { in: itemNos };

    const ordersRaw = await this.prisma.sales_orders.findMany({
      where: ordersWhere,
      select: { 
        quantity: true,
        outstanding_quantity: true, 
        qty_shipped_not_invoiced: true, 
        line_amount: true, 
        type: true 
      },
    });

    let totalCartera = 0;
    let totalCarteraAccounts = 0;
    let totalEnviadoNoFacturado = 0;
    let totalEnviadoNoFacturadoAccounts = 0;

    for (const order of ordersRaw) {
      const totalQty = Number(order.quantity) || 0;
      const lineAmount = Number(order.line_amount) || 0;
      const effectivePrice = totalQty > 0 ? (lineAmount / totalQty) : 0;
      
      if (effectivePrice === 0) continue;

      const isAccount = order.type === 'G/L Account';
      const lineCartera = (Number(order.outstanding_quantity) || 0) * effectivePrice;
      const lineShippedNotInv = (Number(order.qty_shipped_not_invoiced) || 0) * effectivePrice;

      totalCartera += lineCartera;
      if (isAccount) totalCarteraAccounts += lineCartera;

      totalEnviadoNoFacturado += lineShippedNotInv;
      if (isAccount) totalEnviadoNoFacturadoAccounts += lineShippedNotInv;
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
        carteraVentasAccounts: totalCarteraAccounts,
        enviadosFacturar: totalEnviadoNoFacturado,
        enviadosFacturarAccounts: totalEnviadoNoFacturadoAccounts,
        facturacionAnioAnterior: totalPrevYear,
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
    productCode?: string;
    search?: string;
  }) {
    const { year, salespersonCode, pmCode, familyCode, subfamilyCode, productCode, search } = filters;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Resolver item_nos
    let itemNos: string[] | null = null;
    if (pmCode || familyCode || subfamilyCode || productCode) {
      const catWhere: any = {};
      if (pmCode) catWhere.pm_code = pmCode;
      if (familyCode) catWhere.family_code = familyCode;
      if (subfamilyCode) catWhere.subfamily_code = subfamilyCode;

      let matchingSubfamilies: string[] | undefined = undefined;
      if (pmCode || familyCode || subfamilyCode) {
        const matchingCategories = await this.prisma.product_categories.findMany({
          where: catWhere,
          select: { subfamily_code: true }
        });
        matchingSubfamilies = matchingCategories.map(c => c.subfamily_code).filter(Boolean) as string[];
      }

      const prodWhere: any = {};
      if (matchingSubfamilies) {
        prodWhere.subfamily_code = { in: matchingSubfamilies };
      }
      if (productCode) {
        prodWhere.item_no = { contains: productCode, mode: 'insensitive' };
      }

      const matchingProducts = await this.prisma.products.findMany({
        where: prodWhere,
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

  async getValueEntries(filters: {
    search?: string;
    documentType?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    take?: number;
    skip?: number;
  }) {
    const { search, documentType, sortBy = 'reg_date', sortDir = 'desc', take = 50, skip = 0 } = filters;

    const where: any = {};

    if (search && search.trim() !== '') {
      const s = search.trim();
      where.OR = [
        { document_no: { contains: s, mode: 'insensitive' } },
        { item_no: { contains: s, mode: 'insensitive' } },
        { source_no: { contains: s, mode: 'insensitive' } },
        { source_description: { contains: s, mode: 'insensitive' } },
        { external_doc_no: { contains: s, mode: 'insensitive' } },
        { salesperson_code: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (documentType && documentType.trim() !== '') {
      where.document_type = documentType.trim();
    }

    const [rows, total] = await Promise.all([
      this.prisma.value_entries.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        take: Number(take),
        skip: Number(skip),
      }),
      this.prisma.value_entries.count({ where }),
    ]);

    // Convert BigInt and Decimal to JSON-friendly types
    const formattedRows = rows.map(row => ({
      ...row,
      entry_no: row.entry_no ? Number(row.entry_no) : undefined,
      sales_amount: row.sales_amount ? Number(row.sales_amount) : 0,
      cost_amount: row.cost_amount ? Number(row.cost_amount) : 0,
      unit_cost: row.unit_cost ? Number(row.unit_cost) : 0,
    }));

    return {
      rows: formattedRows,
      total,
    };
  }

  /**
   * Obtiene las fechas correspondientes a los meses seleccionados de un año
   */
  private async getDatesForMonths(year: number, months?: number[], limitToToday: boolean = false) {
    const where: any = { year };
    if (months && months.length > 0) {
      where.month = { in: months };
    }
    
    if (limitToToday) {
      const today = new Date();
      // Solo aplicamos el límite si el año de la consulta es <= año actual
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
}

