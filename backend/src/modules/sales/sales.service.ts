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
   * Resuelve de forma unificada la lista de item_no según los filtros de PM, familia, subfamilia y código de producto.
   * Retorna:
   * - null: si ningún filtro de producto está activo (sin restricción).
   * - string[]: lista de item_no que cumplen los filtros (vacío [] si ninguno coincide).
   */
  private async resolveItemNos(filters: {
    pmCode?: string;
    familyCode?: string;
    subfamilyCode?: string;
    productCode?: string;
  }): Promise<string[] | null> {
    const { pmCode, familyCode, subfamilyCode, productCode } = filters;
    const cleanPm = pmCode && String(pmCode).trim() !== '' ? String(pmCode).trim() : undefined;
    const cleanFamily = familyCode && String(familyCode).trim() !== '' ? String(familyCode).trim() : undefined;
    const cleanSubfamily = subfamilyCode && String(subfamilyCode).trim() !== '' ? String(subfamilyCode).trim() : undefined;
    const cleanProduct = productCode && String(productCode).trim() !== '' ? String(productCode).trim() : undefined;

    const hasFilter = Boolean(cleanPm || cleanFamily || cleanSubfamily || cleanProduct);
    if (!hasFilter) return null;

    let matchingSubfamilies: string[] | null = null;
    if (cleanPm || cleanFamily || cleanSubfamily) {
      const catWhere: any = {};
      if (cleanPm) catWhere.pm_code = cleanPm;
      if (cleanFamily) catWhere.family_code = cleanFamily;
      if (cleanSubfamily) catWhere.subfamily_code = cleanSubfamily;

      const matchingCategories = await this.prisma.product_categories.findMany({
        where: catWhere,
        select: { subfamily_code: true },
      });
      matchingSubfamilies = matchingCategories.map((c) => c.subfamily_code).filter(Boolean) as string[];

      // Si se filtró por categoría y no hay ninguna que coincida, no hay productos posibles
      if (matchingSubfamilies.length === 0) {
        return [];
      }
    }

    const prodWhere: any = {};
    if (matchingSubfamilies !== null) {
      prodWhere.subfamily_code = { in: matchingSubfamilies };
    }
    if (cleanProduct) {
      prodWhere.item_no = { contains: cleanProduct, mode: 'insensitive' };
    }

    const matchingProducts = await this.prisma.products.findMany({
      where: prodWhere,
      select: { item_no: true },
    });

    return matchingProducts.map((p) => p.item_no);
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

    const itemNos = await this.resolveItemNos({ familyCode, subfamilyCode });
    const hasCategoryFilter = itemNos !== null;

    if (hasCategoryFilter) {
      if (itemNos.length > 0) {
        docsWhere.lines = {
          some: { product_no: { in: itemNos } },
        };
      } else {
        docsWhere.document_no = 'NO_DOCS_FOUND';
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
    if (hasCategoryFilter) {
      budgetWhere.item_no = itemNos.length > 0 ? { in: itemNos } : { in: ['NO_PRODUCTS_FOUND'] };
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
    if (hasCategoryFilter) {
      if (itemNos.length > 0) {
        prevDocsWhere.lines = {
          some: { product_no: { in: itemNos } },
        };
      } else {
        prevDocsWhere.document_no = 'NO_DOCS_FOUND';
      }
    }

    const productSalesWhere: any = {
      document_type: { in: SALES_DOC_TYPES },
      reg_date: { in: dates },
    };
    if (hasCategoryFilter) {
      productSalesWhere.item_no = itemNos.length > 0 ? { in: itemNos } : 'NO_PRODUCTS_FOUND';
    }
    if (salespersonCode) {
      productSalesWhere.salesperson_code = salespersonCode;
    }
    if (customerCode) {
      productSalesWhere.source_no = customerCode;
    }

    const [
      currentYearDocs, 
      budgetsRaw, 
      prevYearDocs, 
      productSalesAgg, 
      prevProductSalesAgg,
      salesRepsList,
      budgetsByRepRaw,
      allCustomers
    ] = await Promise.all([
      this.prisma.sales_documents.findMany({
        where: docsWhere,
        select: {
          document_no: true,
          document_type: true,
          total_amount_excl_vat: true,
          customer_no: true,
          // Siempre traemos lines con type para poder calcular cuentas contables
          lines: {
            select: {
              type: true,
              line_amount: true,
              product_no: true,
              ...(hasCategoryFilter && itemNos.length > 0 ? { product_no: true } : {}),
            },
            ...(hasCategoryFilter && itemNos.length > 0 ? { where: { product_no: { in: itemNos } } } : {}),
          },
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
              document_no: true,
              document_type: true,
              total_amount_excl_vat: true,
              customer_no: true,
              lines: {
                select: { type: true, line_amount: true, product_no: true },
                ...(hasCategoryFilter && itemNos.length > 0 ? { where: { product_no: { in: itemNos } } } : {}),
              },
            },
          })
        : Promise.resolve([] as any[]),
      this.prisma.value_entries.aggregate({
        _sum: { sales_amount: true },
        where: productSalesWhere,
      }),
      prevYearDates.length > 0
        ? this.prisma.value_entries.aggregate({
            _sum: { sales_amount: true },
            where: { ...productSalesWhere, reg_date: { in: prevYearDates } },
          })
        : Promise.resolve({ _sum: { sales_amount: null } }),
      this.prisma.sales_reps.findMany({
        select: { code: true, name: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.sales_budgets.groupBy({
        by: ['salesperson_code'],
        _sum: { monthly_budget: true },
        where: budgetWhere,
      }),
      this.prisma.customers.findMany({
        select: { client_id: true, name: true, salesperson_code: true, created_at: true },
      }),
    ]);

    // Mapeo ágil de clientes y comerciales
    const customerSalespersonMap = new Map<string, string>();
    const customerIsNewMap = new Map<string, boolean>();
    const customersDict: Record<string, { name: string; since: Date | null }> = {};

    for (const c of allCustomers) {
      if (c.salesperson_code) {
        customerSalespersonMap.set(c.client_id, c.salesperson_code.trim());
      }
      const isNew = Boolean(c.created_at && new Date(c.created_at) >= startDate && new Date(c.created_at) <= endDate);
      customerIsNewMap.set(c.client_id, isNew);
      customersDict[c.client_id] = { name: c.name, since: c.created_at };
    }

    // Inicialización del acumulador de rendimiento por comercial
    const repMap = new Map<string, any>();
    const getOrCreateRep = (code: string, fallbackName?: string) => {
      const cleanCode = (code || 'SIN_ASIGNAR').trim();
      if (!repMap.has(cleanCode)) {
        const matchedRep = salesRepsList.find(r => r.code?.trim() === cleanCode);
        repMap.set(cleanCode, {
          code: cleanCode,
          name: matchedRep?.name || fallbackName || (cleanCode === 'SIN_ASIGNAR' ? 'Sin Asignar' : cleanCode),
          productoFacturas: 0,
          productoAbonos: 0,
          facturacion: 0,
          facturacionAnioAnterior: 0,
          objetivo: 0,
          desviacion: 0,
          desviacionPorcentaje: 0,
          porcentajeCumplimiento: 0,
          facturasOrdinarias: 0,
          prepagosFacturados: 0,
          abonos: 0,
          facturacionTotal: 0,
          portes: 0,
          otrasCuentas: 0,
          prepagosVivos: 0,
          cartera: 0,
          enviadosFacturar: 0,
          prepagosDescontados: 0,
          countNuevosClientes: 0,
          facturacionNuevos: 0,
          previsionCierre: 0,
        });
      }
      return repMap.get(cleanCode)!;
    };

    // Pre-cargar todos los comerciales oficiales de la empresa
    for (const rep of salesRepsList) {
      if (rep.code) getOrCreateRep(rep.code, rep.name);
    }

    // Cargar presupuestos por comercial
    for (const b of budgetsByRepRaw) {
      const bRep = (b.salesperson_code || '').trim();
      if (bRep) {
        const r = getOrCreateRep(bRep);
        r.objetivo += Number(b._sum?.monthly_budget) || 0;
      }
    }

    // Contar nuevos clientes asignados a cada comercial
    for (const c of allCustomers) {
      if (c.created_at && new Date(c.created_at) >= startDate && new Date(c.created_at) <= endDate) {
        const rep = (c.salesperson_code || 'SIN_ASIGNAR').trim();
        const r = getOrCreateRep(rep);
        r.countNuevosClientes += 1;
      }
    }

    // Desglose de facturación actual
    let totalFacturasOrdinarias = 0;
    let totalPrepagosFacturados = 0;
    let totalAbonosDevoluciones = 0;
    let totalCuentasFacturadas = 0;      // Líneas de tipo G/L Account (excluidas las 438 de prepago)
    let totalPortesFacturados = 0;       // Líneas de cuentas 624% (portes y transportes)
    let totalOtrasCuentasFacturadas = 0; // Líneas de cuentas GL distintas de 438 y 624
    let totalLineasProducto = 0;         // Líneas de tipo Item (netas de abonos)

    const currentSalesByCustomer = new Map<string, number>();

    for (const doc of currentYearDocs) {
      const isAbono = doc.document_type === 'Abono';
      const docNoUpper = (doc.document_no || '').toUpperCase();
      const isPrepay = docNoUpper.startsWith('PFV') || docNoUpper.startsWith('PFC');
      const multiplier = isAbono ? -1 : 1;

      let amt: number;
      let cuentasEnDoc = 0;
      let portesEnDoc = 0;
      let otrasCuentasEnDoc = 0;
      let productoEnDoc = 0;
      let productoFacturasDoc = 0;
      let productoAbonosDoc = 0;

      if ((doc as any).lines) {
        for (const line of (doc as any).lines) {
          const lineTypeLower = (line.type || '').toLowerCase();
          const lineAmt = Number(line.line_amount) || 0;
          if (lineTypeLower === 'item') {
            productoEnDoc += lineAmt * multiplier;
            if (isAbono) {
              productoAbonosDoc += lineAmt;
            } else {
              productoFacturasDoc += lineAmt;
            }
          } else if (lineTypeLower === 'g/l account') {
            // Excluimos líneas 438 (son los prepagos ya liquidados, no ingresos nuevos)
            const acctNo = line.product_no || '';
            if (!acctNo.startsWith('438')) {
              const effAmt = lineAmt * multiplier;
              cuentasEnDoc += effAmt;
              if (acctNo.startsWith('624')) {
                portesEnDoc += effAmt;
              } else {
                otrasCuentasEnDoc += effAmt;
              }
            }
          }
        }
      }

      if (hasCategoryFilter && itemNos.length > 0) {
        amt = productoEnDoc;
      } else {
        amt = (Number(doc.total_amount_excl_vat) || 0);
      }

      totalLineasProducto += productoEnDoc;

      if (isAbono) {
        totalAbonosDevoluciones += Math.abs(amt);
      } else if (isPrepay) {
        totalPrepagosFacturados += amt;
      } else {
        totalFacturasOrdinarias += amt;
      }

      if (!isPrepay) {
        totalCuentasFacturadas += cuentasEnDoc;
        totalPortesFacturados += portesEnDoc;
        totalOtrasCuentasFacturadas += otrasCuentasEnDoc;
      }

      const cCode = doc.customer_no;
      if (cCode) {
        currentSalesByCustomer.set(cCode, (currentSalesByCustomer.get(cCode) || 0) + productoEnDoc);
      }

      // Acumulación por comercial
      const docRep = (customerSalespersonMap.get(cCode) || 'SIN_ASIGNAR').trim();
      const repItem = getOrCreateRep(docRep);

      if (isAbono) {
        repItem.abonos += Math.abs(amt);
      } else if (isPrepay) {
        repItem.prepagosFacturados += amt;
      } else {
        repItem.facturasOrdinarias += amt;
      }

      if (!isPrepay) {
        repItem.portes += portesEnDoc;
        repItem.otrasCuentas += otrasCuentasEnDoc;
      }

      repItem.productoFacturas += productoFacturasDoc;
      repItem.productoAbonos += productoAbonosDoc;
      repItem.facturacion += productoEnDoc;

      if (customerIsNewMap.get(cCode)) {
        repItem.facturacionNuevos += productoEnDoc;
      }
    }

    const prevSalesByCustomer = new Map<string, number>();
    for (const doc of prevYearDocs) {
      const isAbono = doc.document_type === 'Abono';
      const multiplier = isAbono ? -1 : 1;
      let productoEnDocPrev = 0;
      if ((doc as any).lines) {
        for (const line of (doc as any).lines) {
          const lineTypeLower = (line.type || '').toLowerCase();
          const lineAmt = Number(line.line_amount) || 0;
          if (hasCategoryFilter && itemNos.length > 0) {
            productoEnDocPrev += lineAmt * multiplier;
          } else if (lineTypeLower === 'item') {
            productoEnDocPrev += lineAmt * multiplier;
          }
        }
      }
      const cCode = doc.customer_no;
      if (cCode) {
        prevSalesByCustomer.set(cCode, (prevSalesByCustomer.get(cCode) || 0) + productoEnDocPrev);
        const prevRep = (customerSalespersonMap.get(cCode) || 'SIN_ASIGNAR').trim();
        const r = getOrCreateRep(prevRep);
        r.facturacionAnioAnterior += productoEnDocPrev;
      }
    }

    // 4. Merge data por cliente
    const mergedData = new Map<string, any>();

    currentSalesByCustomer.forEach((salesSum, cCode) => {
      const cInfo = customersDict[cCode];
      mergedData.set(cCode, {
        customerCode: cCode,
        customerName: cInfo ? cInfo.name : cCode === '99999999' ? 'CLIENTE NUEVO' : cCode,
        isNew: customerIsNewMap.get(cCode) || false,
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
          isNew: customerIsNewMap.get(cCode) || false,
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
          isNew: customerIsNewMap.get(bCode) || false,
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
    const countNewClients = allCustomers.filter(c => 
      c.created_at && new Date(c.created_at) >= startDate && new Date(c.created_at) <= endDate &&
      (!salespersonCode || c.salesperson_code === salespersonCode)
    ).length;

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
        facturacionAnioAnterior: 0,
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

    const totalProductSales = Number(productSalesAgg._sum.sales_amount) || 0;
    const totalPrevProductSales = Number(prevProductSalesAgg._sum.sales_amount) || 0;

    // Desviación se calcula respecto a la facturación de producto (para comparabilidad con presupuestos)
    let devEuros = 0;
    let devPct = 0;

    // 7. KPIs adicionales (Pedidos y Pendiente de facturar)
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
        ordersWhere.item_code = "NO_PRODUCTS_FOUND";
      }
    }

    // Ejecutamos la consulta de pedidos
    const ordersRaw = await this.prisma.sales_orders.findMany({
      where: ordersWhere,
      select: { 
        customer_code: true,
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
    const ordersByCustomer: Record<string, { shipped: number; cartera: number }> = {};
    const rawShippedByRep: Record<string, number> = {};
    const rawCarteraByRep: Record<string, number> = {};

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

        const cust = order.customer_code;
        if (cust) {
          if (!ordersByCustomer[cust]) {
            ordersByCustomer[cust] = { shipped: 0, cartera: 0 };
          }
          ordersByCustomer[cust].shipped += lineShippedNotInv;
          ordersByCustomer[cust].cartera += lineCartera;

          const rep = (customerSalespersonMap.get(cust) || 'SIN_ASIGNAR').trim();
          rawShippedByRep[rep] = (rawShippedByRep[rep] || 0) + lineShippedNotInv;
          rawCarteraByRep[rep] = (rawCarteraByRep[rep] || 0) + lineCartera;
        }
      }
    }

    // Prepagos vivos para descontar de pedidos y para métrica informativa de prepagos no facturados
    const { totalVivo: totalPrepagosVivos, byCustomer: prepaymentsByCustomer } = await this.getAlivePrepayments({
      customerCode: customerCode ? String(customerCode).trim() : undefined,
      salespersonCode: salespersonCode ? String(salespersonCode).trim() : undefined,
    });

    let totalPrepagosDescontadosFacturar = 0;
    let totalPrepagosDescontadosCartera = 0;

    const repPrepagosVivos: Record<string, number> = {};
    const repPrepagosDescontadosFacturar: Record<string, number> = {};
    const repPrepagosDescontadosCartera: Record<string, number> = {};

    // Descontar cliente a cliente: primero de enviados por facturar y luego de cartera
    for (const [cust, vivo] of Object.entries(prepaymentsByCustomer)) {
      const custOrders = ordersByCustomer[cust] || { shipped: 0, cartera: 0 };

      const descFacturar = Math.min(vivo, custOrders.shipped);
      totalPrepagosDescontadosFacturar += descFacturar;

      const remanente = vivo - descFacturar;
      const descCartera = Math.min(remanente, custOrders.cartera);
      totalPrepagosDescontadosCartera += descCartera;

      const rep = (customerSalespersonMap.get(cust) || 'SIN_ASIGNAR').trim();
      repPrepagosVivos[rep] = (repPrepagosVivos[rep] || 0) + vivo;
      repPrepagosDescontadosFacturar[rep] = (repPrepagosDescontadosFacturar[rep] || 0) + descFacturar;
      repPrepagosDescontadosCartera[rep] = (repPrepagosDescontadosCartera[rep] || 0) + descCartera;
    }

    // Inyectar prepagos vivos por cliente en cada fila de la tabla
    filteredResults.forEach((r: any) => {
      r.prepagos = prepaymentsByCustomer[r.customerCode] || 0;
    });

    // Cerrar métricas consolidadas por comercial
    repMap.forEach((r, repCode) => {
      const pVivo = repPrepagosVivos[repCode] || 0;
      const pDescFact = repPrepagosDescontadosFacturar[repCode] || 0;
      const pDescCart = repPrepagosDescontadosCartera[repCode] || 0;

      r.prepagosVivos = pVivo;
      r.prepagosDescontados = pDescFact + pDescCart;

      const rawShipped = rawShippedByRep[repCode] || 0;
      const rawCart = rawCarteraByRep[repCode] || 0;

      r.enviadosFacturar = Math.max(0, rawShipped - pDescFact);
      r.cartera = Math.max(0, rawCart - pDescCart);

      r.facturacionTotal = r.facturasOrdinarias + r.prepagosFacturados - r.abonos;
      r.desviacion = r.facturacion - r.objetivo;
      r.desviacionPorcentaje = r.objetivo > 0 ? (r.desviacion / r.objetivo) * 100 : 0;
      r.porcentajeCumplimiento = r.objetivo > 0 ? (r.facturacion / r.objetivo) * 100 : 0;
      r.previsionCierre = r.facturacion + r.cartera + r.enviadosFacturar;
    });

    let salespersonSummary = Array.from(repMap.values());
    if (salespersonCode) {
      salespersonSummary = salespersonSummary.filter(r => r.code === salespersonCode.trim());
    } else {
      // Filtrar comerciales con actividad o presupuesto
      salespersonSummary = salespersonSummary.filter(r => 
        r.facturacion !== 0 || r.objetivo !== 0 || r.cartera !== 0 || 
        r.enviadosFacturar !== 0 || r.facturasOrdinarias !== 0 || 
        r.facturacionAnioAnterior !== 0 || r.countNuevosClientes !== 0
      );
      salespersonSummary.sort((a, b) => b.facturacion - a.facturacion);
    }

    const totalCarteraBruta = totalCartera;
    const totalEnviadoNoFacturadoBruto = totalEnviadoNoFacturado;
    const totalEnviadoNoFacturadoNeto = Math.max(0, totalEnviadoNoFacturadoBruto - totalPrepagosDescontadosFacturar);
    const totalCarteraNeta = Math.max(0, totalCarteraBruta - totalPrepagosDescontadosCartera);

    // Salvaguarda de consistencia: las cuentas contables nunca deben superar el neto
    const totalEnviadoNoFacturadoAccountsNeto = Math.min(totalEnviadoNoFacturadoAccounts, totalEnviadoNoFacturadoNeto);
    const totalCarteraAccountsNeta = Math.min(totalCarteraAccounts, totalCarteraNeta);

    // Total de facturación neta que incluye cuentas y prepagos, y deduce devoluciones y abonos (para Panel Gerencia/Comercial)
    const totalFacturacionConCuentas = totalFacturasOrdinarias + totalPrepagosFacturados - totalAbonosDevoluciones;
    // Ventas de producto puras (para Panel Presupuestos: productos netos de líneas Item)
    const totalVentasSinCuentas = totalLineasProducto > 0 ? totalLineasProducto : (totalFacturacionConCuentas - totalCuentasFacturadas);

    // Para los KPIs de presupuesto usamos value_entries (excluye cuentas por definición)
    // y lo contrastamos con la cifra sin cuentas de sales_documents
    const ventasParaPresupuestos = hasCategoryFilter ? totalProductSales : totalVentasSinCuentas;
    devEuros = ventasParaPresupuestos - totalBudget;
    devPct = totalBudget > 0 ? (devEuros / totalBudget) * 100 : 0;

    return {
      kpis: {
        // Cifra total que incluye cuentas + prepagos (Gerencia/Comercial)
        ventas: totalFacturacionConCuentas,
        // Cifra de producto puro sin cuentas GL (para presupuestos y comparativas puras de producto)
        ventasSinCuentas: totalVentasSinCuentas,
        ventasProducto: totalLineasProducto,
        // Desglose de documentos reales de facturación (cabeceras sin deducciones artificiales)
        facturasOrdinarias: totalFacturasOrdinarias,
        prepagosFacturados: totalPrepagosFacturados,
        prepagosVivos: totalPrepagosVivos,
        cuentasFacturadas: totalCuentasFacturadas,
        portesFacturados: totalPortesFacturados,
        otrasCuentasFacturadas: totalOtrasCuentasFacturadas,
        abonosDevoluciones: totalAbonosDevoluciones,
        objetivo: totalBudget,
        desviacionEur: devEuros,
        desviacionPct: devPct,
        carteraVentas: totalCarteraNeta,
        carteraVentasBruta: totalCarteraBruta,
        carteraVentasAccounts: totalCarteraAccountsNeta,
        enviadosFacturar: totalEnviadoNoFacturadoNeto,
        enviadosFacturarBruto: totalEnviadoNoFacturadoBruto,
        prepagosDescontadosFacturar: totalPrepagosDescontadosFacturar,
        prepagosDescontadosCartera: totalPrepagosDescontadosCartera,
        enviadosFacturarAccounts: totalEnviadoNoFacturadoAccountsNeto,
        facturacionNuevos: totalNewClientsSales,
        countNuevos: countNewClients,
        countNuevosSinVenta: countNewClientsNoSales,
        facturacionAnioAnterior: totalPrevProductSales,
      },

      rows: filteredResults.slice(skip ? Number(skip) : 0, take ? (Number(skip) || 0) + Number(take) : undefined),
      total: filteredResults.length,
      salespersonSummary,
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

    const itemNos = await this.resolveItemNos({ familyCode, subfamilyCode });
    const hasCategoryFilter = itemNos !== null;

    if (hasCategoryFilter) {
      if (itemNos.length > 0) {
        docsWhere.lines = { some: { product_no: { in: itemNos } } };
        prevDocsWhere.lines = { some: { product_no: { in: itemNos } } };
        budgetWhere.item_no = { in: itemNos };
      } else {
        docsWhere.document_no = 'NO_DOCS_FOUND';
        prevDocsWhere.document_no = 'NO_DOCS_FOUND';
        budgetWhere.item_no = { in: ['NO_PRODUCTS_FOUND'] };
      }
    }

    const [salesDocsCurrent, budgetsByDay, salesDocsPrev] = await Promise.all([
      this.prisma.sales_documents.findMany({
        where: docsWhere,
        select: {
          posting_date: true,
          total_amount_excl_vat: true,
          document_type: true,
          lines: (hasCategoryFilter && itemNos.length > 0) ? {
            where: { product_no: { in: itemNos } },
            select: { line_amount: true },
          } : undefined,
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
          lines: (hasCategoryFilter && itemNos.length > 0) ? {
            where: { product_no: { in: itemNos } },
            select: { line_amount: true },
          } : undefined,
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
      const amt = (hasCategoryFilter && itemNos.length > 0)
        ? ((doc as any).lines || []).reduce((sum: number, l: any) => sum + (Number(l.line_amount) || 0), 0)
        : (Number(doc.total_amount_excl_vat) || 0);
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
      const amt = (hasCategoryFilter && itemNos.length > 0)
        ? ((doc as any).lines || []).reduce((sum: number, l: any) => sum + (Number(l.line_amount) || 0), 0)
        : (Number(doc.total_amount_excl_vat) || 0);
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
   * Retorna estructura jerárquica: cliente → productos, consumiendo sales_documents y sales_document_lines
   * para homogeneidad total con la vista de Ventas vs Presupuestos.
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
    const itemNos = await this.resolveItemNos({ pmCode, familyCode, subfamilyCode, productCode });
    const hasProductFilter = itemNos !== null;
    const itemNosSet = hasProductFilter && itemNos.length > 0 ? new Set(itemNos) : null;

    // 2. Fechas del periodo
    const isTodayFilter = limitToToday || false;
    const dates = await this.getDatesForMonths(year, months, isTodayFilter);

    // 3. Where clause para sales_documents (año actual)
    const docsWhere: any = {
      posting_date: { in: dates },
    };
    if (salespersonCode) docsWhere.customer = { salesperson_code: salespersonCode };
    if (hasProductFilter) {
      if (itemNos.length > 0) {
        docsWhere.lines = {
          some: { product_no: { in: itemNos }, type: { equals: 'Item', mode: 'insensitive' } },
        };
      } else {
        docsWhere.document_no = 'NO_DOCS_FOUND';
      }
    }

    // 4. Where clause para sales_budgets
    const budgetWhere: any = {
      budget_date: { gte: startDate, lte: endDate },
    };
    if (months && months.length > 0) {
      budgetWhere.budget_date = { in: dates };
    }
    if (salespersonCode) budgetWhere.salesperson_code = salespersonCode;
    if (hasProductFilter) {
      budgetWhere.item_no = itemNos.length > 0 ? { in: itemNos } : { in: ['NO_PRODUCTS_FOUND'] };
    }

    // 5. Fechas y Where clause del año anterior (LYTD)
    const prevYear = year - 1;
    const prevYearDates = await this.getDatesForMonths(prevYear, months, isTodayFilter);

    const prevDocsWhere: any = {
      posting_date: { in: prevYearDates },
    };
    if (salespersonCode) prevDocsWhere.customer = { salesperson_code: salespersonCode };
    if (hasProductFilter) {
      if (itemNos.length > 0) {
        prevDocsWhere.lines = {
          some: { product_no: { in: itemNos }, type: { equals: 'Item', mode: 'insensitive' } },
        };
      } else {
        prevDocsWhere.document_no = 'NO_DOCS_FOUND';
      }
    }

    // 6. Consultas concurrentes en base de datos
    const [currentYearDocs, budgetsRaw, prevYearDocs] = await Promise.all([
      this.prisma.sales_documents.findMany({
        where: docsWhere,
        select: {
          document_no: true,
          document_type: true,
          total_amount_excl_vat: true,
          customer_no: true,
          lines: {
            select: {
              type: true,
              line_amount: true,
              product_no: true,
            },
          },
        },
      }),
      this.prisma.sales_budgets.groupBy({
        by: ['customer_code', 'item_no'],
        _sum: { monthly_budget: true },
        where: budgetWhere,
      }),
      prevYearDates.length > 0
        ? this.prisma.sales_documents.findMany({
            where: prevDocsWhere,
            select: {
              document_no: true,
              document_type: true,
              total_amount_excl_vat: true,
              customer_no: true,
              lines: {
                select: {
                  type: true,
                  line_amount: true,
                  product_no: true,
                },
              },
            },
          })
        : Promise.resolve([] as any[]),
    ]);

    // 7. Desglose de magnitudes de facturación y mapa jerárquico: Cliente → Producto
    let pmFacturasOrdinarias = 0;
    let pmPrepagosFacturados = 0;
    let pmAbonosDevoluciones = 0;
    let pmCuentasFacturadas = 0;
    let pmPortesFacturados = 0;
    let pmOtrasCuentasFacturadas = 0;
    let totalLineasProducto = 0;

    const clientMap = new Map<string, Map<string, { sales: number; budget: number; prevSales: number }>>();

    for (const doc of currentYearDocs) {
      const isAbono = doc.document_type === 'Abono';
      const docNoUpper = (doc.document_no || '').toUpperCase();
      const isPrepay = docNoUpper.startsWith('PFV') || docNoUpper.startsWith('PFC');
      const multiplier = isAbono ? -1 : 1;
      const amt = Number(doc.total_amount_excl_vat) || 0;

      let productoEnDoc = 0;
      let cuentasEnDoc = 0;
      let portesEnDoc = 0;
      let otrasCuentasEnDoc = 0;

      const cCode = doc.customer_no || 'SIN_CLIENTE';

      if (doc.lines) {
        for (const line of doc.lines) {
          const lineTypeLower = (line.type || '').toLowerCase();
          const lineAmt = Number(line.line_amount) || 0;
          const pNo = line.product_no || 'SIN_PRODUCTO';

          if (lineTypeLower === 'item') {
            if (hasProductFilter && itemNosSet && !itemNosSet.has(pNo)) {
              continue;
            }
            const effAmt = lineAmt * multiplier;
            productoEnDoc += effAmt;

            if (!clientMap.has(cCode)) clientMap.set(cCode, new Map());
            const prodMap = clientMap.get(cCode)!;
            const existing = prodMap.get(pNo) || { sales: 0, budget: 0, prevSales: 0 };
            existing.sales += effAmt;
            prodMap.set(pNo, existing);
          } else if (lineTypeLower === 'g/l account' && !hasProductFilter && !isPrepay) {
            if (!pNo.startsWith('438')) {
              const effAmt = lineAmt * multiplier;
              cuentasEnDoc += effAmt;
              if (pNo.startsWith('624')) {
                portesEnDoc += effAmt;
              } else {
                otrasCuentasEnDoc += effAmt;
              }
            }
          }
        }
      }

      totalLineasProducto += productoEnDoc;

      if (isAbono) {
        pmAbonosDevoluciones += Math.abs(amt);
      } else if (isPrepay) {
        pmPrepagosFacturados += amt;
      } else {
        pmFacturasOrdinarias += amt;
      }

      if (!isPrepay && !hasProductFilter) {
        pmCuentasFacturadas += cuentasEnDoc;
        pmPortesFacturados += portesEnDoc;
        pmOtrasCuentasFacturadas += otrasCuentasEnDoc;
      }
    }

    // 8. Procesamiento de líneas de año anterior (LYTD)
    let totalPrevProductSales = 0;
    for (const doc of prevYearDocs) {
      const isAbono = doc.document_type === 'Abono';
      const multiplier = isAbono ? -1 : 1;
      const cCode = doc.customer_no || 'SIN_CLIENTE';

      if (doc.lines) {
        for (const line of doc.lines) {
          const lineTypeLower = (line.type || '').toLowerCase();
          if (lineTypeLower === 'item') {
            const pNo = line.product_no || 'SIN_PRODUCTO';
            if (hasProductFilter && itemNosSet && !itemNosSet.has(pNo)) {
              continue;
            }
            const effAmt = (Number(line.line_amount) || 0) * multiplier;
            totalPrevProductSales += effAmt;

            if (!clientMap.has(cCode)) clientMap.set(cCode, new Map());
            const prodMap = clientMap.get(cCode)!;
            const existing = prodMap.get(pNo) || { sales: 0, budget: 0, prevSales: 0 };
            existing.prevSales += effAmt;
            prodMap.set(pNo, existing);
          }
        }
      }
    }

    // 9. Cargar presupuestos por cliente y producto
    for (const b of budgetsRaw) {
      const cCode = b.customer_code;
      const pNo = b.item_no;
      if (!cCode || !pNo) continue;
      const bAmt = Number(b._sum.monthly_budget) || 0;

      if (!clientMap.has(cCode)) clientMap.set(cCode, new Map());
      const prodMap = clientMap.get(cCode)!;
      const existing = prodMap.get(pNo) || { sales: 0, budget: 0, prevSales: 0 };
      existing.budget += bAmt;
      prodMap.set(pNo, existing);
    }

    // 10. Prepagos vivos por cliente
    const { totalVivo: pmPrepagosVivos, byCustomer: pmPrepaymentsByCustomer } = await this.getAlivePrepayments({
      salespersonCode: salespersonCode ? String(salespersonCode).trim() : undefined,
    });

    // 11. Recopilar nombres de clientes y productos
    const customerIds = Array.from(clientMap.keys());
    const productIds = new Set<string>();
    for (const prodMap of clientMap.values()) {
      for (const itemNo of prodMap.keys()) {
        productIds.add(itemNo);
      }
    }

    const [customers, productsData] = await Promise.all([
      customerIds.length > 0
        ? this.prisma.customers.findMany({
            where: { client_id: { in: customerIds } },
            select: { client_id: true, name: true, created_at: true },
          })
        : ([] as { client_id: string; name: string; created_at: Date | null }[]),
      productIds.size > 0
        ? this.prisma.products.findMany({
            where: { item_no: { in: Array.from(productIds) } },
            select: { item_no: true, description: true },
          })
        : ([] as { item_no: string; description: string | null }[]),
    ]);

    const customersDict: Record<string, { name: string; since: Date | null }> = {};
    customers.forEach((c) => {
      customersDict[c.client_id] = { name: c.name, since: c.created_at };
    });

    const productsDict: Record<string, string> = {};
    productsData.forEach((p) => {
      productsDict[p.item_no] = p.description || p.item_no;
    });

    // 12. Construir resultado jerárquico Cliente → Productos
    let results = Array.from(clientMap.entries()).map(([customerCode, prodMap]) => {
      const cInfo = customersDict[customerCode];
      let totalSales = 0;
      let totalBudget = 0;
      let totalPrevSales = 0;

      const productRows = Array.from(prodMap.entries()).map(([itemNo, vals]) => {
        totalSales += vals.sales;
        totalBudget += vals.budget;
        totalPrevSales += vals.prevSales;
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

      const isNew = Boolean(cInfo?.since && new Date(cInfo.since) >= startDate && new Date(cInfo.since) <= endDate);

      return {
        customerCode,
        customerName: cInfo ? cInfo.name : customerCode === '99999999' ? 'CLIENTE NUEVO' : customerCode,
        isNew,
        facturacion: totalSales,
        facturacionAnioAnterior: totalPrevSales,
        objetivo: totalBudget,
        desviacion: totalSales - totalBudget,
        desviacionPorcentaje: totalBudget > 0 ? ((totalSales - totalBudget) / totalBudget) * 100 : 0,
        prepagos: pmPrepaymentsByCustomer[customerCode] || 0,
        products: productRows,
      };
    });

    // 12.1 Lógica especial para Cliente Nuevo (99999999)
    const totalNewClientsSales = results
      .filter((r) => r.isNew)
      .reduce((acc, curr) => acc + curr.facturacion, 0);

    let placeholderIndex = results.findIndex((r) => r.customerCode === '99999999');
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
        facturacionAnioAnterior: 0,
        objetivo: 0,
        desviacion: totalNewClientsSales,
        desviacionPorcentaje: 0,
        products: [],
        excludeFacturacionFromTotal: true,
      } as any);
    }

    // 13. Filtrado por búsqueda
    if (search && search.trim() !== '') {
      const s = search.toLowerCase();
      results = results.filter((r) =>
        (r.customerCode && r.customerCode.toLowerCase().includes(s)) ||
        (r.customerName && r.customerName.toLowerCase().includes(s))
      );
    }

    // 14. Totales globales
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

    // 15. KPIs de pedidos (Cartera + Pendiente de facturar) con deducción cliente a cliente de prepagos
    const ordersWhere: any = {};
    if (salespersonCode) ordersWhere.customer = { salesperson_code: salespersonCode };
    if (hasProductFilter) {
      if (itemNos && itemNos.length > 0) {
        ordersWhere.item_code = { in: itemNos };
      } else {
        ordersWhere.item_code = 'NO_PRODUCTS_FOUND';
      }
    }

    const ordersRaw = await this.prisma.sales_orders.findMany({
      where: ordersWhere,
      select: {
        customer_code: true,
        quantity: true,
        outstanding_quantity: true,
        qty_shipped_not_invoiced: true,
        line_amount: true,
        type: true,
      },
    });

    let totalCartera = 0;
    let totalCarteraAccounts = 0;
    let totalEnviadoNoFacturado = 0;
    let totalEnviadoNoFacturadoAccounts = 0;
    const ordersByCustomer: Record<string, { shipped: number; cartera: number }> = {};

    for (const order of ordersRaw) {
      const totalQty = Number(order.quantity) || 0;
      const lineAmount = Number(order.line_amount) || 0;
      const effectivePrice = totalQty > 0 ? lineAmount / totalQty : 0;

      if (effectivePrice === 0) continue;

      const outstanding = Number(order.outstanding_quantity) || 0;
      const shippedNotInv = Number(order.qty_shipped_not_invoiced) || 0;
      const isAccount = order.type === 'G/L Account';

      const lineCartera = outstanding * effectivePrice;
      const lineShippedNotInv = shippedNotInv * effectivePrice;

      totalCartera += lineCartera;
      if (isAccount) totalCarteraAccounts += lineCartera;

      totalEnviadoNoFacturado += lineShippedNotInv;
      if (isAccount) totalEnviadoNoFacturadoAccounts += lineShippedNotInv;

      const cust = order.customer_code;
      if (cust) {
        if (!ordersByCustomer[cust]) {
          ordersByCustomer[cust] = { shipped: 0, cartera: 0 };
        }
        ordersByCustomer[cust].shipped += lineShippedNotInv;
        ordersByCustomer[cust].cartera += lineCartera;
      }
    }

    let totalPrepagosDescontadosFacturar = 0;
    let totalPrepagosDescontadosCartera = 0;

    Object.keys(ordersByCustomer).forEach((custCode) => {
      const pVivoCust = pmPrepaymentsByCustomer[custCode] || 0;
      if (pVivoCust > 0) {
        const cOrders = ordersByCustomer[custCode];
        const descFact = Math.min(pVivoCust, cOrders.shipped);
        const remanente = pVivoCust - descFact;
        const descCart = Math.min(remanente, cOrders.cartera);

        totalPrepagosDescontadosFacturar += descFact;
        totalPrepagosDescontadosCartera += descCart;
      }
    });

    const totalCarteraBruta = totalCartera;
    const totalEnviadoNoFacturadoBruto = totalEnviadoNoFacturado;
    const totalEnviadoNoFacturadoNeto = Math.max(0, totalEnviadoNoFacturadoBruto - totalPrepagosDescontadosFacturar);
    const totalCarteraNeta = Math.max(0, totalCarteraBruta - totalPrepagosDescontadosCartera);

    const totalEnviadoNoFacturadoAccountsNeto = Math.min(totalEnviadoNoFacturadoAccounts, totalEnviadoNoFacturadoNeto);
    const totalCarteraAccountsNeta = Math.min(totalCarteraAccounts, totalCarteraNeta);

    // Total de facturación documental (para desglose info)
    const totalFacturacionConCuentas = pmFacturasOrdinarias + pmPrepagosFacturados - pmAbonosDevoluciones;

    // 16. Ordenación
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
        ventas: hasProductFilter ? totalSales : totalFacturacionConCuentas,
        ventasSinCuentas: totalSales,
        ventasProducto: totalSales,
        cuentasFacturadas: pmCuentasFacturadas,
        portesFacturados: pmPortesFacturados,
        otrasCuentasFacturadas: pmOtrasCuentasFacturadas,
        facturasOrdinarias: pmFacturasOrdinarias,
        prepagosFacturados: pmPrepagosFacturados,
        prepagosVivos: pmPrepagosVivos,
        abonosDevoluciones: pmAbonosDevoluciones,
        objetivo: totalBudget,
        desviacionEur: devEuros,
        desviacionPct: devPct,
        carteraVentas: totalCarteraNeta,
        carteraVentasBruta: totalCarteraBruta,
        carteraVentasAccounts: totalCarteraAccountsNeta,
        enviadosFacturar: totalEnviadoNoFacturadoNeto,
        enviadosFacturarBruto: totalEnviadoNoFacturadoBruto,
        prepagosDescontadosFacturar: totalPrepagosDescontadosFacturar,
        prepagosDescontadosCartera: totalPrepagosDescontadosCartera,
        enviadosFacturarAccounts: totalEnviadoNoFacturadoAccountsNeto,
        facturacionAnioAnterior: totalPrevYear,
      },
      rows: results.slice(skip ? Number(skip) : 0, take ? (Number(skip) || 0) + Number(take) : undefined),
      total: results.length,
    };
  }

  /**
   * Evolución mensual de ventas vs presupuesto, con filtro de Product Manager.
   * Utiliza sales_documents y sales_document_lines de forma homogénea con la tabla de rendimiento.
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

    // 1. Resolver item_nos
    const itemNos = await this.resolveItemNos({ pmCode, familyCode, subfamilyCode, productCode });
    const hasProductFilter = itemNos !== null;
    const itemNosSet = hasProductFilter && itemNos.length > 0 ? new Set(itemNos) : null;

    // 2. Where clause para sales_documents
    const docsWhere: any = {
      posting_date: { gte: startDate, lte: endDate },
    };
    if (salespersonCode) docsWhere.customer = { salesperson_code: salespersonCode };
    if (hasProductFilter) {
      if (itemNos.length > 0) {
        docsWhere.lines = {
          some: { product_no: { in: itemNos }, type: { equals: 'Item', mode: 'insensitive' } },
        };
      } else {
        docsWhere.document_no = 'NO_DOCS_FOUND';
      }
    }

    // 3. Where clause para sales_budgets
    const budgetWhere: any = {
      budget_date: { gte: startDate, lte: endDate },
    };
    if (salespersonCode) budgetWhere.salesperson_code = salespersonCode;
    if (hasProductFilter) {
      budgetWhere.item_no = itemNos.length > 0 ? { in: itemNos } : { in: ['NO_PRODUCTS_FOUND'] };
    }

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
      budgetWhere.customer_code = { in: customerIds };
    }

    const [salesDocsCurrent, budgetsByDay] = await Promise.all([
      this.prisma.sales_documents.findMany({
        where: docsWhere,
        select: {
          posting_date: true,
          document_type: true,
          lines: {
            select: {
              type: true,
              product_no: true,
              line_amount: true,
            },
          },
        },
      }),
      this.prisma.sales_budgets.groupBy({
        by: ['budget_date'],
        _sum: { monthly_budget: true },
        where: budgetWhere,
      }),
    ]);

    const monthsData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      ventas: 0,
      objetivo: 0,
    }));

    salesDocsCurrent.forEach((doc) => {
      if (!doc.posting_date) return;
      const m = new Date(doc.posting_date).getMonth();
      const multiplier = doc.document_type === 'Abono' ? -1 : 1;

      let docProductAmt = 0;
      if (doc.lines) {
        for (const line of doc.lines) {
          const lineTypeLower = (line.type || '').toLowerCase();
          if (lineTypeLower === 'item') {
            const pNo = line.product_no || '';
            if (hasProductFilter && itemNosSet && !itemNosSet.has(pNo)) {
              continue;
            }
            docProductAmt += (Number(line.line_amount) || 0) * multiplier;
          }
        }
      }
      monthsData[m].ventas += docProductAmt;
    });

    budgetsByDay.forEach((budget) => {
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
   * Calcula los prepagos vivos (pendientes de facturar definitivamente) por cliente mediante asignación FIFO
   */
  private async getAlivePrepayments(params: {
    customerCodes?: string[];
    salespersonCode?: string;
    customerCode?: string;
  }): Promise<{ totalVivo: number; byCustomer: Record<string, number> }> {
    const pfvWhere: any = {
      OR: [
        { document_no: { startsWith: 'PFV' } },
        { document_no: { startsWith: 'PFC' } },
      ],
    };

    if (params.customerCode && String(params.customerCode).trim() !== '') {
      pfvWhere.customer_no = String(params.customerCode).trim();
    } else if (params.customerCodes && params.customerCodes.length > 0) {
      pfvWhere.customer_no = { in: params.customerCodes };
    } else if (params.salespersonCode && String(params.salespersonCode).trim() !== '') {
      pfvWhere.customer = { salesperson_code: String(params.salespersonCode).trim() };
    }

    const pfvs = await this.prisma.sales_documents.findMany({
      where: pfvWhere,
      select: {
        document_no: true,
        customer_no: true,
        total_amount_excl_vat: true,
        posting_date: true,
      },
      orderBy: { posting_date: 'asc' },
    });

    if (!pfvs || pfvs.length === 0) {
      return { totalVivo: 0, byCustomer: {} };
    }

    const uniqueCustomerCodes = Array.from(new Set(pfvs.map((p) => p.customer_no).filter(Boolean))) as string[];
    const compensaciones = await this.prisma.sales_document_lines.findMany({
      where: {
        document: {
          customer_no: { in: uniqueCustomerCodes },
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

    const compByCustomer: Record<string, number> = {};
    for (const comp of compensaciones) {
      const cust = comp.document?.customer_no;
      if (!cust) continue;
      compByCustomer[cust] = (compByCustomer[cust] || 0) + Math.abs(Number(comp.line_amount) || 0);
    }

    const byCustomer: Record<string, number> = {};
    let totalVivo = 0;

    for (const cust of uniqueCustomerCodes) {
      let compRestante = compByCustomer[cust] || 0;
      const custPfvs = pfvs.filter((p) => p.customer_no === cust);

      for (const p of custPfvs) {
        const amt = Number(p.total_amount_excl_vat) || 0;
        let saldoVivo = 0;

        if (compRestante >= amt) {
          compRestante -= amt;
          saldoVivo = 0;
        } else if (compRestante > 0) {
          saldoVivo = amt - compRestante;
          compRestante = 0;
        } else {
          saldoVivo = amt;
        }

        if (saldoVivo > 0.01) {
          byCustomer[cust] = (byCustomer[cust] || 0) + saldoVivo;
          totalVivo += saldoVivo;
        }
      }
    }

    return { totalVivo, byCustomer };
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

