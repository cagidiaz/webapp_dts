import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene los proveedores con soporte para búsqueda, filtros, ordenación, paginación
   * y cálculo de volumen de compras (value_entries) por año o histórico.
   */
  async getAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    blocked?: boolean;
    year?: number;
    territory?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  } = {}) {
    const { skip, take, search, blocked, year, territory, sortBy = 'vendor_id', sortDir = 'asc' } = params;

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

    if (territory) {
      let cleanTerritory = territory.trim().replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim().toUpperCase();
      const countryAliasMap: Record<string, string> = {
        'FRANCIA': 'FR',
        'FRANCE': 'FR',
        'ALEMANIA': 'DE',
        'GERMANY': 'DE',
        'DEUTSCHLAND': 'DE',
        'ITALIA': 'IT',
        'ITALY': 'IT',
        'PAISES BAJOS': 'NL',
        'PAÍSES BAJOS': 'NL',
        'NETHERLANDS': 'NL',
        'HOLANDA': 'NL',
        'REINO UNIDO': 'GB',
        'UNITED KINGDOM': 'GB',
        'UK': 'GB',
        'ESTADOS UNIDOS': 'US',
        'USA': 'US',
        'AMERICA': 'US',
        'AMÉRICA': 'US',
        'CHINA': 'CN',
        'SUIZA': 'CH',
        'SWITZERLAND': 'CH',
        'DINAMARCA': 'DK',
        'DENMARK': 'DK',
        'PORTUGAL': 'PT',
        'IRLANDA': 'IE',
        'IRELAND': 'IE',
        'AUSTRIA': 'AT',
        'BELGICA': 'BE',
        'BÉLGICA': 'BE',
        'BELGIUM': 'BE',
        'SUECIA': 'SE',
        'SWEDEN': 'SE',
        'JAPON': 'JP',
        'JAPÓN': 'JP',
        'JAPAN': 'JP',
        'POLONIA': 'PL',
        'POLAND': 'PL',
        'NORUEGA': 'NO',
        'NORWAY': 'NO',
        'FINLANDIA': 'FI',
        'FINLAND': 'FI',
        'REPUBLICA CHECA': 'CZ',
        'CZECHIA': 'CZ',
      };
      if (countryAliasMap[cleanTerritory]) {
        cleanTerritory = countryAliasMap[cleanTerritory];
      }

      const isIntlGeneral = cleanTerritory === 'INTL' ||
                            cleanTerritory.includes('INTERNACIONAL') ||
                            cleanTerritory.includes('EXPORT');

      if (isIntlGeneral) {
        and.push({
          OR: [
            { vat_no: { startsWith: 'FR' } },
            { vat_no: { startsWith: 'DE' } },
            { vat_no: { startsWith: 'IT' } },
            { vat_no: { startsWith: 'GB' } },
            { vat_no: { startsWith: 'NL' } },
            { vat_no: { startsWith: 'US' } },
            { vat_no: { startsWith: 'CN' } },
            { vat_no: { startsWith: 'DK' } },
            { vat_no: { startsWith: 'CH' } },
            { vat_no: { startsWith: 'JP' } },
            { vat_no: { startsWith: 'BE' } },
            { vat_no: { startsWith: 'AT' } },
            { vat_no: { startsWith: 'SE' } },
            { vat_no: { startsWith: 'PT' } },
            { vat_no: { startsWith: 'IE' } },
            { country_code: { notIn: ['ES', null] } },
            { vat_no: { startsWith: 'FR' } },
            { vat_no: { startsWith: 'DE' } },
            { vat_no: { startsWith: 'IT' } },
            { vat_no: { startsWith: 'GB' } },
            { vat_no: { startsWith: 'NL' } },
            { vat_no: { startsWith: 'US' } },
            { vat_no: { startsWith: 'CN' } },
            { vat_no: { startsWith: 'DK' } },
            { vat_no: { startsWith: 'CH' } },
            { vat_no: { startsWith: 'JP' } },
            { vat_no: { startsWith: 'BE' } },
            { vat_no: { startsWith: 'AT' } },
            { vat_no: { startsWith: 'SE' } },
            { vat_no: { startsWith: 'PT' } },
            { vat_no: { startsWith: 'IE' } },
            { vat_no: { in: ['22-1895944', '95-2859818', '14-1682544'] } },
            { city: { in: ['San Diego', 'Elizabeth City', 'Horsham'] } },
            { county: { contains: 'CALIFORNIA', mode: 'insensitive' as any } },
          ]
        });
      } else if (cleanTerritory === 'ES' || cleanTerritory === 'ESPAÑA') {
        and.push({
          AND: [
            {
              OR: [
                { country_code: 'ES' },
                { country_code: null },
              ]
            },
            { vat_no: { not: { startsWith: 'FR' } } },
            { vat_no: { not: { startsWith: 'DE' } } },
            { vat_no: { not: { startsWith: 'IT' } } },
            { vat_no: { not: { startsWith: 'GB' } } },
            { vat_no: { not: { startsWith: 'NL' } } },
            { vat_no: { not: { startsWith: 'US' } } },
            { vat_no: { not: { startsWith: 'CN' } } },
            { vat_no: { not: { startsWith: 'DK' } } },
            { vat_no: { not: { startsWith: 'CH' } } },
            { vat_no: { not: { startsWith: 'JP' } } },
            { vat_no: { notIn: ['22-1895944', '95-2859818', '14-1682544'] } },
          ]
        });
      } else if (cleanTerritory === 'US') {
        and.push({
          OR: [
            { country_code: 'US' },
            { vat_no: { startsWith: 'US' } },
            { vat_no: { in: ['22-1895944', '95-2859818', '14-1682544'] } },
            { city: { in: ['San Diego', 'Elizabeth City', 'Horsham'] } },
            { county: { contains: 'CALIFORNIA', mode: 'insensitive' as any } },
            { post_code: { startsWith: 'NC' } },
            { post_code: { startsWith: 'PA' } },
            { name: { contains: 'US GAUGE', mode: 'insensitive' as any } },
          ]
        });
      } else if (['DE', 'FR', 'IT', 'NL', 'GB', 'DK', 'CH', 'BE', 'AT', 'SE', 'PT', 'IE', 'CN', 'JP', 'PL', 'CZ', 'NO', 'FI'].includes(cleanTerritory)) {
        and.push({
          OR: [
            { country_code: cleanTerritory },
            { vat_no: { startsWith: cleanTerritory } },
            { post_code: { startsWith: `${cleanTerritory}-` } },
          ]
        });
      } else {
        const postalPrefix = cleanTerritory.replace(/^(ES|PT)-/i, '');
        const orConditions: any[] = [
          { county: { contains: cleanTerritory, mode: 'insensitive' as any } },
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

    try {
      // 1. Consulta de compras en value_entries (agrupadas por proveedor)
      const purchaseWhere: any = {
        source_type: 'Vendor',
        document_type: { in: ['Purchase Invoice', 'Purchase Credit Memo'] },
      };
      if (year) {
        purchaseWhere.reg_date = {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        };
      }

      const [purchasesByVendor, total, aggregation, blockedCount] = await Promise.all([
        this.prisma.value_entries.groupBy({
          by: ['source_no'],
          _sum: { cost_amount: true },
          where: purchaseWhere,
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

      const purchaseMap = new Map<string, number>();
      let totalPurchasesSum = 0;
      purchasesByVendor.forEach((p) => {
        if (p.source_no) {
          const amt = Number(p._sum.cost_amount || 0);
          purchaseMap.set(p.source_no, amt);
          totalPurchasesSum += amt;
        }
      });

      // 2. Clasificación ABC de Pareto
      const sortedBySpend = Array.from(purchaseMap.entries()).sort((a, b) => b[1] - a[1]);
      let runningSpend = 0;
      const abcMap = new Map<string, 'A' | 'B' | 'C'>();
      sortedBySpend.forEach(([code, amt]) => {
        runningSpend += amt;
        const share = totalPurchasesSum > 0 ? runningSpend / totalPurchasesSum : 1;
        if (share <= 0.8) abcMap.set(code, 'A');
        else if (share <= 0.95) abcMap.set(code, 'B');
        else abcMap.set(code, 'C');
      });

      // 3. Ordenación y obtención de datos
      const isPurchaseSort = sortBy === 'purchase_volume' || sortBy === 'total_purchases';
      let rawVendors: any[] = [];

      if (isPurchaseSort) {
        // Obtenemos todos los proveedores que cumplen el filtro para ordenar por volumen de compras
        const allMatchingVendors = await this.prisma.vendors.findMany({
          where,
        });

        allMatchingVendors.sort((a, b) => {
          const volA = purchaseMap.get(a.vendor_id) || 0;
          const volB = purchaseMap.get(b.vendor_id) || 0;
          return sortDir === 'asc' ? volA - volB : volB - volA;
        });

        const start = skip ? Number(skip) : 0;
        const end = take ? start + Number(take) : undefined;
        rawVendors = allMatchingVendors.slice(start, end);
      } else {
        const allowedSortFields = ['vendor_id', 'name', 'city', 'balance_lcy', 'balance_due_lcy', 'payments_lcy'];
        const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'vendor_id';
        const orderBy: any = {};
        orderBy[orderByField] = sortDir || 'asc';

        rawVendors = await this.prisma.vendors.findMany({
          where,
          skip: skip ? Number(skip) : undefined,
          take: take ? Number(take) : undefined,
          orderBy,
        });
      }

      // 4. Enriquecer con volumen de compra y clase ABC
      const enrichedData = rawVendors.map((v) => {
        const vol = purchaseMap.get(v.vendor_id) || 0;
        return {
          ...v,
          purchase_volume: vol,
          abc_class: abcMap.get(v.vendor_id) || (vol > 0 ? 'C' : '-'),
        };
      });

      return {
        data: enrichedData,
        total,
        summary: {
          totalBalance: Number(aggregation._sum.balance_lcy || 0),
          totalBalanceDue: Number(aggregation._sum.balance_due_lcy || 0),
          totalPayments: Number(aggregation._sum.payments_lcy || 0),
          totalPurchases: totalPurchasesSum,
          blockedCount,
        }
      };
    } catch (error) {
      console.error('Error fetching vendors:', error);
      throw new InternalServerErrorException('Error al obtener el listado de proveedores');
    }
  }

  /**
   * Obtiene la analítica completa de compras para un proveedor:
   * - Evolución temporal mensual y anual
   * - Productos suministrados (referencia, descripción, total unidades, gasto total, última compra)
   * - Pedidos de compra en curso
   */
  async getVendorAnalytics(vendorId: string) {
    const vendor = await this.getByVendorId(vendorId);

    // 1. Movimientos de compras en value_entries
    const entries = await this.prisma.value_entries.findMany({
      where: {
        source_type: 'Vendor',
        source_no: vendorId,
        document_type: { in: ['Purchase Invoice', 'Purchase Credit Memo'] },
      },
      select: {
        reg_date: true,
        cost_amount: true,
        quantity: true,
        item_no: true,
        document_no: true,
        document_type: true,
      },
      orderBy: { reg_date: 'asc' },
    });

    // 2. Agrupación temporal (anual y mensual)
    const monthlyMap = new Map<string, { year: number; month: number; amount: number; count: number }>();
    const yearlyMap = new Map<number, { year: number; amount: number; count: number }>();

    entries.forEach((e) => {
      const d = new Date(e.reg_date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const amt = Number(e.cost_amount || 0);

      const mKey = `${y}-${m}`;
      const mVal = monthlyMap.get(mKey) || { year: y, month: m, amount: 0, count: 0 };
      mVal.amount += amt;
      mVal.count += 1;
      monthlyMap.set(mKey, mVal);

      const yVal = yearlyMap.get(y) || { year: y, amount: 0, count: 0 };
      yVal.amount += amt;
      yVal.count += 1;
      yearlyMap.set(y, yVal);
    });

    // 3. Agrupación de productos suministrados
    const productAgg = new Map<string, {
      item_no: string;
      total_qty: number;
      total_amount: number;
      last_purchase_date: Date | null;
      last_purchase_price: number;
    }>();

    entries.forEach((e) => {
      const itemNo = e.item_no;
      if (!itemNo) return;
      const amt = Number(e.cost_amount || 0);
      const qty = Number(e.quantity || 0);
      const unitCost = qty > 0 ? amt / qty : 0;

      const existing = productAgg.get(itemNo) || {
        item_no: itemNo,
        total_qty: 0,
        total_amount: 0,
        last_purchase_date: null,
        last_purchase_price: 0,
      };

      existing.total_qty += qty;
      existing.total_amount += amt;

      const entryDate = new Date(e.reg_date);
      if (!existing.last_purchase_date || entryDate > new Date(existing.last_purchase_date)) {
        existing.last_purchase_date = e.reg_date;
        if (unitCost > 0) existing.last_purchase_price = unitCost;
      }

      productAgg.set(itemNo, existing);
    });

    // Productos asignados al proveedor en catálogo
    const catalogProducts = await this.prisma.products.findMany({
      where: { vendor_no: vendorId },
      select: {
        item_no: true,
        description: true,
        unit_cost: true,
        standard_cost: true,
        last_purchase_price: true,
        inventory_qty: true,
      },
    });

    const allItemNos = Array.from(new Set([...productAgg.keys(), ...catalogProducts.map(p => p.item_no)]));
    const descriptions = await this.prisma.products.findMany({
      where: { item_no: { in: allItemNos } },
      select: {
        item_no: true,
        description: true,
        inventory_qty: true,
        last_purchase_price: true,
      },
    });
    const descMap = new Map(descriptions.map(d => [d.item_no, d]));

    const productsList = allItemNos.map((itemNo) => {
      const agg = productAgg.get(itemNo);
      const info = descMap.get(itemNo);
      return {
        item_no: itemNo,
        description: info?.description || itemNo,
        total_qty: agg?.total_qty || 0,
        total_amount: agg?.total_amount || 0,
        last_purchase_date: agg?.last_purchase_date || null,
        last_purchase_price: agg?.last_purchase_price || Number(info?.last_purchase_price || 0),
        inventory_qty: info?.inventory_qty || 0,
      };
    }).sort((a, b) => b.total_amount - a.total_amount);

    // 4. Pedidos de compra abiertos
    const openOrders = await this.prisma.purchase_orders.findMany({
      where: { vendor_no: vendorId },
      include: {
        lines: {
          select: {
            item_code: true,
            description: true,
            quantity: true,
            direct_unit_cost: true,
            line_amount: true,
            qty_to_receive: true,
            qty_to_invoice: true,
            expected_receipt_date: true,
          }
        }
      },
      orderBy: { document_date: 'desc' },
      take: 10,
    });

    const totalOpenOrdersAmount = openOrders.reduce((acc, o) => acc + Number(o.amount || 0), 0);

    return {
      vendor,
      totalPurchases: Array.from(yearlyMap.values()).reduce((sum, y) => sum + y.amount, 0),
      totalOpenOrdersAmount,
      yearlyEvolution: Array.from(yearlyMap.values()).sort((a, b) => a.year - b.year),
      monthlyEvolution: Array.from(monthlyMap.values()).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month),
      products: productsList,
      openOrders,
    };
  }

  /**
   * Datos ligeros para alimentar el mapa geográfico interactivo de proveedores
   */
  async getVendorsMapData(year?: number) {
    const purchaseWhere: any = {
      source_type: 'Vendor',
      document_type: { in: ['Purchase Invoice', 'Purchase Credit Memo'] },
    };
    if (year) {
      purchaseWhere.reg_date = {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31, 23, 59, 59),
      };
    }

    const [vendors, purchases] = await Promise.all([
      this.prisma.vendors.findMany({
        select: {
          id: true,
          vendor_id: true,
          name: true,
          city: true,
          county: true,
          post_code: true,
          country_code: true,
          address: true,
          phone_no: true,
          email: true,
          vat_no: true,
          balance_lcy: true,
          balance_due_lcy: true,
          payments_lcy: true,
          blocked: true,
        },
      }),
      this.prisma.value_entries.groupBy({
        by: ['source_no'],
        _sum: { cost_amount: true },
        where: purchaseWhere,
      }),
    ]);

    const purchaseMap = new Map<string, number>();
    let totalSpend = 0;
    purchases.forEach((p) => {
      if (p.source_no) {
        const amt = Number(p._sum.cost_amount || 0);
        purchaseMap.set(p.source_no, amt);
        totalSpend += amt;
      }
    });

    // Clasificación ABC
    const sorted = Array.from(purchaseMap.entries()).sort((a, b) => b[1] - a[1]);
    let running = 0;
    const abcMap = new Map<string, 'A' | 'B' | 'C'>();
    sorted.forEach(([code, amt]) => {
      running += amt;
      const share = totalSpend > 0 ? running / totalSpend : 1;
      abcMap.set(code, share <= 0.8 ? 'A' : share <= 0.95 ? 'B' : 'C');
    });

    return vendors.map((v) => ({
      ...v,
      purchase_volume: purchaseMap.get(v.vendor_id) || 0,
      balance_lcy: Number(v.balance_lcy || 0),
      balance_due_lcy: Number(v.balance_due_lcy || 0),
      payments_lcy: Number(v.payments_lcy || 0),
      abc_class: abcMap.get(v.vendor_id) || (purchaseMap.has(v.vendor_id) ? 'C' : '-'),
    }));
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

