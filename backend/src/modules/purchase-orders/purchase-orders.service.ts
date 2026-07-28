import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todos los pedidos de compra con sus líneas y proveedores.
   * Soporta filtros por búsqueda (nº pedido, nombre proveedor, descripción producto, código artículo),
   * proveedor, tipo de línea (Item/G/L Account) y ordenación/paginación.
   */
  async getAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    vendorNo?: string;
    itemCode?: string;
    type?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  } = {}) {
    const { skip, take, search, vendorNo, itemCode, type, sortBy = 'order_date', sortDir = 'desc' } = params;

    const lineWhere: any = {};
    const lineAnd: any[] = [];

    if (itemCode) {
      lineAnd.push({ item_code: itemCode });
    }

    if (type) {
      lineAnd.push({ type: type });
    }

    if (lineAnd.length > 0) {
      lineWhere.AND = lineAnd;
    }

    const orderWhere: any = {};
    const orderAnd: any[] = [];

    if (vendorNo) {
      orderAnd.push({ vendor_no: vendorNo });
    }

    if (search) {
      orderAnd.push({
        OR: [
          { order_no: { contains: search, mode: 'insensitive' } },
          { vendor_no: { contains: search, mode: 'insensitive' } },
          { vendor: { name: { contains: search, mode: 'insensitive' } } },
          {
            lines: {
              some: {
                OR: [
                  { item_code: { contains: search, mode: 'insensitive' } },
                  { description: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      });
    }

    if (Object.keys(lineWhere).length > 0) {
      orderAnd.push({
        lines: {
          some: lineWhere,
        },
      });
    }

    if (orderAnd.length > 0) {
      orderWhere.AND = orderAnd;
    }

    try {
      const allowedSortFields = ['order_no', 'order_date', 'document_date', 'amount', 'vendor_no'];
      const actualSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'order_no';

      const [data, total, allRelevantLines] = await Promise.all([
        this.prisma.purchase_orders.findMany({
          where: orderWhere,
          skip: skip ? Number(skip) : undefined,
          take: take ? Number(take) : undefined,
          orderBy: [
            { [actualSortBy]: sortDir },
            { id: 'asc' },
          ],
          include: {
            vendor: {
              select: {
                name: true,
                vendor_id: true,
              },
            },
            lines: {
              where: lineWhere,
              orderBy: { line_no: 'asc' },
            },
          },
        }),
        this.prisma.purchase_orders.count({ where: orderWhere }),
        this.prisma.purchase_order_lines.findMany({
          where: {
            order: orderWhere,
            ...lineWhere,
          },
          select: {
            document_no: true,
            quantity: true,
            qty_to_receive: true,
            qty_to_invoice: true,
            line_amount: true,
            type: true,
          },
        }),
      ]);

      // KPIs y Resumen
      let totalPendingAmount = 0;
      let totalPendingAmountAccounts = 0;
      let totalPendingToInvoice = 0;
      let totalPendingToInvoiceAccounts = 0;
      let totalPendingUnits = 0;
      const uniqueOrderNumbers = new Set<string>();

      allRelevantLines.forEach(line => {
        const totalQty = Number(line.quantity || 0);
        const lineAmount = Number(line.line_amount || 0);
        const effectivePrice = totalQty > 0 ? (lineAmount / totalQty) : 0;

        // Regla de negocio: excluir líneas con precio efectivo 0
        if (effectivePrice === 0) return;

        const qtyToReceive = Number(line.qty_to_receive || 0);
        const qtyToInvoice = Number(line.qty_to_invoice || 0);
        const isAccount = line.type === 'G/L Account';

        const linePendingAmount = qtyToReceive * effectivePrice;
        const linePendingToInvoice = qtyToInvoice * effectivePrice;

        totalPendingAmount += linePendingAmount;
        if (isAccount) totalPendingAmountAccounts += linePendingAmount;

        totalPendingToInvoice += linePendingToInvoice;
        if (isAccount) totalPendingToInvoiceAccounts += linePendingToInvoice;

        totalPendingUnits += qtyToReceive;

        if (line.document_no) uniqueOrderNumbers.add(line.document_no);
      });

      return {
        data,
        total,
        summary: {
          totalOrders: uniqueOrderNumbers.size,
          totalPendingAmount,
          totalPendingAmountAccounts,
          totalPendingUnits,
          totalPendingToInvoice,
          totalPendingToInvoiceAccounts,
        },
      };
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene un pedido de compra por ID.
   */
  async getById(id: string) {
    try {
      const order = await this.prisma.purchase_orders.findUnique({
        where: { id },
        include: {
          vendor: true,
          lines: {
            orderBy: { line_no: 'asc' },
          },
        },
      });
      if (!order) throw new NotFoundException('Pedido de compra no encontrado');
      return order;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene pedidos de compra por código de proveedor.
   */
  async getByVendor(vendorNo: string) {
    return this.getAll({ vendorNo });
  }
}
