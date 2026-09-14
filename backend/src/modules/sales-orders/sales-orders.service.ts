import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SalesOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todos los pedidos de venta con soporte para filtros y búsqueda.
   */
  async getAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    customerCode?: string;
    itemCode?: string;
    type?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  } = {}) {
    const { skip, take, search, customerCode, itemCode, type, sortBy = 'document_number', sortDir = 'desc' } = params;

    const where: any = {};
    const and: any[] = [];

    if (search) {
      and.push({
        OR: [
          { document_number: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { customer_code: { contains: search, mode: 'insensitive' } },
          { item_code: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (customerCode) {
      and.push({ customer_code: customerCode });
    }

    if (itemCode) {
      and.push({ item_code: itemCode });
    }
    
    if (type) {
      and.push({ type: type });
    }

    if (and.length > 0) {
      where.AND = and;
    }

    try {
      const [data, total, allRelevantOrders] = await Promise.all([
        this.prisma.sales_orders.findMany({
          where,
          skip: skip ? Number(skip) : undefined,
          take: take ? Number(take) : undefined,
          orderBy: [
            { [sortBy]: sortDir },
            { id: 'asc' }
          ],
          include: {
            customer: {
              select: {
                name: true,
                salesperson_code: true,
              },
            },
          },
        }),
        this.prisma.sales_orders.count({ where }),
        // Obtenemos solo los campos necesarios para el sumatorio global de la selección
        this.prisma.sales_orders.findMany({
          where,
          select: {
            document_number: true,
            customer_code: true,
            quantity: true,
            outstanding_quantity: true,
            qty_shipped_not_invoiced: true,
            line_amount: true,
            type: true,
          },
        }),
      ]);

      // Calcular sumatorios globales y agrupar por cliente
      let totalCartera = 0;
      let totalCarteraAccounts = 0;
      let totalEnviadoNoFacturado = 0;
      let totalEnviadoNoFacturadoAccounts = 0;
      const uniqueOrderNumbers = new Set<string>();
      const ordersByCustomer: Record<string, { shipped: number; cartera: number }> = {};

      allRelevantOrders.forEach(order => {
        const totalQty = Number(order.quantity || 0);
        const lineAmount = Number(order.line_amount || 0);
        const effectivePrice = totalQty > 0 ? (lineAmount / totalQty) : 0;
        
        if (effectivePrice === 0) return; // Equivalente a continue en forEach

        const outstanding = Number(order.outstanding_quantity || 0);
        const shippedNotInv = Number(order.qty_shipped_not_invoiced || 0);
        const isAccount = (order as any).type === 'G/L Account';

        const lineCartera = (outstanding * effectivePrice);
        const lineShippedNotInv = (shippedNotInv * effectivePrice);

        totalCartera += lineCartera;
        if (isAccount) totalCarteraAccounts += lineCartera;

        totalEnviadoNoFacturado += lineShippedNotInv;
        if (isAccount) totalEnviadoNoFacturadoAccounts += lineShippedNotInv;

        if (order.document_number) uniqueOrderNumbers.add(order.document_number);

        const cust = order.customer_code;
        if (cust) {
          if (!ordersByCustomer[cust]) {
            ordersByCustomer[cust] = { shipped: 0, cartera: 0 };
          }
          ordersByCustomer[cust].shipped += lineShippedNotInv;
          ordersByCustomer[cust].cartera += lineCartera;
        }
      });

      // Prepagos facturados pendientes de compensación
      const customerPrepaymentsMap: Record<string, {
        totalAmount: number;
        documents: string[];
        details: Array<{
          document_no: string;
          amount: number;
          originalAmount: number;
          posting_date: string | null;
          external_doc_no: string | null;
        }>;
      }> = {};
      const agedPrepayments: Array<{
        document_no: string;
        customer_no: string;
        customer_name: string;
        posting_date: string | null;
        amount: number;
        agingDays: number;
        external_doc_no: string | null;
      }> = [];

      let totalPrepagosDescontadosFacturar = 0;
      let totalPrepagosDescontadosCartera = 0;

      try {
        const pfvs = await this.prisma.sales_documents.findMany({
          where: {
            document_no: { startsWith: 'PFV' },
            ...(customerCode ? { customer_no: customerCode } : {}),
          },
          select: {
            document_no: true,
            customer_no: true,
            posting_date: true,
            external_doc_no: true,
            total_amount_excl_vat: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { posting_date: 'asc' },
        });

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

          // Total compensado acumulado por cliente en facturas FV
          const compByCustomer: Record<string, number> = {};
          for (const comp of compensaciones) {
            const cust = comp.document?.customer_no;
            if (!cust) continue;
            compByCustomer[cust] = (compByCustomer[cust] || 0) + Math.abs(Number(comp.line_amount) || 0);
          }

          // Asignar compensaciones en FIFO a las PFVs de cada cliente para obtener saldo vivo real
          for (const cust of customerCodes) {
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
                if (!customerPrepaymentsMap[cust]) {
                  customerPrepaymentsMap[cust] = {
                    totalAmount: 0,
                    documents: [],
                    details: [],
                  };
                }
                customerPrepaymentsMap[cust].totalAmount += saldoVivo;
                customerPrepaymentsMap[cust].documents.push(p.document_no);
                customerPrepaymentsMap[cust].details.push({
                  document_no: p.document_no,
                  amount: saldoVivo,
                  originalAmount: amt,
                  posting_date: p.posting_date ? p.posting_date.toISOString() : null,
                  external_doc_no: p.external_doc_no || null,
                });

                if (p.posting_date) {
                  const diffTime = Date.now() - new Date(p.posting_date).getTime();
                  const agingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                  if (agingDays >= 60) {
                    agedPrepayments.push({
                      document_no: p.document_no,
                      customer_no: cust,
                      customer_name: p.customer?.name || cust,
                      posting_date: p.posting_date.toISOString(),
                      amount: saldoVivo,
                      agingDays,
                      external_doc_no: p.external_doc_no || null,
                    });
                  }
                }
              }
            }
          }

          // Descontar cliente a cliente: primero de pedidos por facturar y luego de cartera
          for (const [cust, prepay] of Object.entries(customerPrepaymentsMap)) {
            const custOrders = ordersByCustomer[cust] || { shipped: 0, cartera: 0 };
            const vivo = prepay.totalAmount;

            const descFacturar = Math.min(vivo, custOrders.shipped);
            totalPrepagosDescontadosFacturar += descFacturar;

            const remanente = vivo - descFacturar;
            const descCartera = Math.min(remanente, custOrders.cartera);
            totalPrepagosDescontadosCartera += descCartera;
          }
        }
      } catch (err) {
        console.warn('Error calculando deducción de prepagos en pedidos:', err);
      }

      // Ordenar prepagos con antigüedad mayor de mayor a menor días
      agedPrepayments.sort((a, b) => b.agingDays - a.agingDays);

      const totalCarteraBruta = totalCartera;
      const totalEnviadoNoFacturadoBruto = totalEnviadoNoFacturado;
      const totalEnviadoNoFacturadoNeto = Math.max(0, totalEnviadoNoFacturadoBruto - totalPrepagosDescontadosFacturar);
      const totalCarteraNeta = Math.max(0, totalCarteraBruta - totalPrepagosDescontadosCartera);

      // Salvaguarda: las cuentas contables no deben exceder el neto ni mostrar incoherencias
      const totalEnviadoNoFacturadoAccountsNeto = Math.min(totalEnviadoNoFacturadoAccounts, totalEnviadoNoFacturadoNeto);
      const totalCarteraAccountsNeta = Math.min(totalCarteraAccounts, totalCarteraNeta);

      // Enriquecer cada pedido con información de prepagos de su cliente si existe
      const enrichedData = data.map((item) => {
        const prepay = customerPrepaymentsMap[item.customer_code];
        return prepay ? { ...item, prepaymentInfo: prepay } : item;
      });

      return { 
        data: enrichedData, 
        total,
        summary: {
          totalOrders: uniqueOrderNumbers.size,
          totalAmount: totalCarteraNeta,
          totalAmountBruto: totalCarteraBruta,
          prepagosDescontados: totalPrepagosDescontadosFacturar + totalPrepagosDescontadosCartera,
          prepagosDescontadosFacturar: totalPrepagosDescontadosFacturar,
          prepagosDescontadosCartera: totalPrepagosDescontadosCartera,
          totalAmountAccounts: totalCarteraAccountsNeta,
          totalOutstandingUnits: allRelevantOrders.reduce((acc, curr) => {
            const totalQty = Number(curr.quantity || 0);
            const lineAmount = Number(curr.line_amount || 0);
            if (totalQty > 0 && (lineAmount / totalQty) === 0) return acc;
            return acc + Number(curr.outstanding_quantity || 0);
          }, 0),
          totalEnviadoNoFacturado: totalEnviadoNoFacturadoNeto,
          totalEnviadoNoFacturadoBruto: totalEnviadoNoFacturadoBruto,
          totalEnviadoNoFacturadoAccounts: totalEnviadoNoFacturadoAccountsNeto,
          customerPrepayments: customerPrepaymentsMap,
          agedPrepayments,
        }
      };


    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene un pedido por su ID (UUID).
   */
  async getById(id: string) {
    try {
      const order = await this.prisma.sales_orders.findUnique({
        where: { id },
        include: {
          customer: true,
          product: true,
        },
      });
      if (!order) throw new NotFoundException('Pedido no encontrado');
      return order;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene pedidos por código de cliente.
   */
  async getByCustomer(customerCode: string) {
    return this.getAll({ customerCode });
  }
}
