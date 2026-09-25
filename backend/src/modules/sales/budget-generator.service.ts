import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Response } from 'express';
import * as ExcelJS from 'exceljs';
const archiver = require('archiver');

export interface BudgetGeneratorOptions {
  priceIncreasePct?: number;
  salespersonCode?: string;
  asZip?: boolean;
  protectSheet?: boolean;
}

@Injectable()
export class BudgetGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene metadatos para la pantalla de generación de presupuestos.
   */
  async getMetadata() {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    const salesReps = await this.prisma.sales_reps.findMany({
      select: { code: true, name: true },
      orderBy: { code: 'asc' },
    });

    return {
      currentYear,
      nextYear,
      salesReps: salesReps.filter((r) => r.code && r.code.trim() !== ''),
    };
  }

  /**
   * Genera el Excel o paquete ZIP con las plantillas de presupuestos.
   */
  async exportBudgetTemplates(options: BudgetGeneratorOptions, res: Response) {
    try {
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      const priceIncreasePct = Number(options.priceIncreasePct) || 0;
      const filterSalesperson = options.salespersonCode ? options.salespersonCode.trim() : undefined;
      const asZip = String(options.asZip) === 'true';
      const protectSheet = String(options.protectSheet) === 'true';

      const startDate = new Date(`${currentYear}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${currentYear}-12-31T23:59:59.999Z`);

      // 1. Consultas paralelas a Supabase
      const [
        currentYearDocs,
        openOrders,
        allCustomers,
        allProducts,
        allCategories,
        salesRepsList,
      ] = await Promise.all([
        this.prisma.sales_documents.findMany({
          where: {
            posting_date: { gte: startDate, lte: endDate },
            document_type: {
              in: ['Factura', 'Abono', 'Invoice', 'Credit Memo', 'Sales Invoice', 'Sales Credit Memo'],
            },
          },
          select: {
            document_no: true,
            document_type: true,
            customer_no: true,
            lines: {
              where: { type: 'Item' },
              select: {
                product_no: true,
                quantity: true,
                line_amount: true,
                unit_price: true,
              },
            },
          },
        }),
        this.prisma.sales_orders.findMany({
          where: {
            outstanding_quantity: { gt: 0 },
            type: 'Item',
          },
          select: {
            document_number: true,
            customer_code: true,
            item_code: true,
            description: true,
            quantity: true,
            outstanding_quantity: true,
            line_amount: true,
            unit_price: true,
            type: true,
          },
        }),
        this.prisma.customers.findMany({
          select: {
            client_id: true,
            name: true,
            salesperson_code: true,
            city: true,
            county: true,
            post_code: true,
            country_reg_code: true,
          },
        }),
        this.prisma.products.findMany({
          select: {
            item_no: true,
            description: true,
            subfamily_code: true,
            unit_price: true,
          },
        }),
        this.prisma.product_categories.findMany({
          select: {
            family_code: true,
            family_name: true,
            subfamily_code: true,
            subfamily_name: true,
            pm_code: true,
          },
        }),
        this.prisma.sales_reps.findMany({
          select: { code: true, name: true },
        }),
      ]);

      // 2. Diccionarios en memoria para resolución inmediata
      const customerMap = new Map<string, { name: string; rep: string; community: string }>();
      for (const c of allCustomers) {
        customerMap.set(c.client_id, {
          name: c.name || c.client_id,
          rep: (c.salesperson_code || 'SIN_ASIGNAR').trim(),
          community: this.resolveCommunity(c),
        });
      }

      const productMap = new Map<string, { description: string; subfamilyCode: string; unitPrice: number }>();
      for (const p of allProducts) {
        productMap.set(p.item_no.trim(), {
          description: p.description || '',
          subfamilyCode: (p.subfamily_code || '').trim(),
          unitPrice: Number(p.unit_price) || 0,
        });
      }

      const categoryMap = new Map<string, { familyCode: string; familyName: string; subfamilyName: string; pmCode: string }>();
      for (const cat of allCategories) {
        const sub = (cat.subfamily_code || '').trim();
        if (sub && !categoryMap.has(sub)) {
          categoryMap.set(sub, {
            familyCode: cat.family_code || '',
            familyName: cat.family_name || '',
            subfamilyName: cat.subfamily_name || '',
            pmCode: cat.pm_code || '',
          });
        }
      }

      // 3. Consolidación: clave única (customer_code + '__' + product_no)
      interface ConsolidatedRow {
        repCode: string;
        customerCode: string;
        customerName: string;
        community: string;
        pmCode: string;
        familyCode: string;
        familyName: string;
        subfamilyCode: string;
        subfamilyName: string;
        productNo: string;
        description: string;
        udFacturadas: number;
        udCartera: number;
        udPrevision: number;
        precioVentaActual: number;
        precioVentaSiguiente: number;
        totalFacturado: number;
        eurosCartera: number;
        eurosPrevision: number;
      }

      const rowsMap = new Map<string, {
        customerCode: string;
        productNo: string;
        factQty: number;
        factAmount: number;
        carteraQty: number;
        carteraAmount: number;
        lastOrderPrice: number;
      }>();

      // Procesar facturas del año actual (solo Item / Productos)
      for (const doc of currentYearDocs) {
        const isAbono = doc.document_type === 'Abono' || doc.document_type === 'Credit Memo' || doc.document_type === 'Sales Credit Memo';
        const mult = isAbono ? -1 : 1;
        const cCode = doc.customer_no || 'SIN_CLIENTE';

        for (const line of doc.lines) {
          if (!line.product_no) continue;
          const pNo = line.product_no.trim();
          // Excluir cuentas contables (G/L accounts de 7 dígitos)
          if (/^[0-9]{7}$/.test(pNo)) continue;

          const key = `${cCode}__${pNo}`;

          if (!rowsMap.has(key)) {
            rowsMap.set(key, {
              customerCode: cCode,
              productNo: pNo,
              factQty: 0,
              factAmount: 0,
              carteraQty: 0,
              carteraAmount: 0,
              lastOrderPrice: 0,
            });
          }

          const item = rowsMap.get(key)!;
          const qty = (Number(line.quantity) || 0) * mult;
          const amt = (Number(line.line_amount) || 0) * mult;
          item.factQty += qty;
          item.factAmount += amt;
        }
      }

      // Procesar pedidos en cartera abiertos (solo Item / Productos)
      for (const ord of openOrders) {
        if ((ord.type || '').toLowerCase() !== 'item') continue;
        const cCode = ord.customer_code || 'SIN_CLIENTE';
        const pNo = (ord.item_code || '').trim();
        if (!pNo || /^[0-9]{7}$/.test(pNo)) continue;
        const key = `${cCode}__${pNo}`;

        if (!rowsMap.has(key)) {
          rowsMap.set(key, {
            customerCode: cCode,
            productNo: pNo,
            factQty: 0,
            factAmount: 0,
            carteraQty: 0,
            carteraAmount: 0,
            lastOrderPrice: 0,
          });
        }

        const item = rowsMap.get(key)!;
        const outQty = Number(ord.outstanding_quantity) || 0;
        const totalQty = Number(ord.quantity) || 0;
        const totalAmt = Number(ord.line_amount) || 0;
        const effectivePrice = totalQty > 0 ? (totalAmt / totalQty) : (Number(ord.unit_price) || 0);

        if (effectivePrice > 0) {
          item.carteraQty += outQty;
          item.carteraAmount += outQty * effectivePrice;
          item.lastOrderPrice = effectivePrice;
        }
      }

      // 4. Mapear filas completas enriquecidas
      const consolidatedList: ConsolidatedRow[] = [];

      for (const [key, raw] of rowsMap.entries()) {
        // Excluir combinaciones sin unidades facturadas ni en cartera
        if (raw.factQty <= 0 && raw.carteraQty <= 0) continue;

        const custInfo = customerMap.get(raw.customerCode);
        const repCode = custInfo?.rep || 'SIN_ASIGNAR';

        // Filtro si se solicitó un comercial específico en modo individual
        if (filterSalesperson && repCode !== filterSalesperson) {
          continue;
        }

        const prodInfo = productMap.get(raw.productNo);
        const subCode = prodInfo?.subfamilyCode || '';
        const catInfo = subCode ? categoryMap.get(subCode) : undefined;

        const udFacturadas = Math.round(raw.factQty);
        const udCartera = Math.round(raw.carteraQty);
        const udPrevision = udFacturadas + udCartera;

        // Cálculo de Precio de Venta Unitario del año en curso
        let precioVentaActual = 0;
        if (udFacturadas > 0 && raw.factAmount > 0) {
          precioVentaActual = raw.factAmount / udFacturadas;
        } else if (raw.carteraQty > 0 && raw.carteraAmount > 0) {
          precioVentaActual = raw.carteraAmount / raw.carteraQty;
        } else if (raw.lastOrderPrice > 0) {
          precioVentaActual = raw.lastOrderPrice;
        } else if (prodInfo && prodInfo.unitPrice > 0) {
          precioVentaActual = prodInfo.unitPrice;
        }
        precioVentaActual = Math.round(precioVentaActual * 100) / 100;

        // Cálculo de Precio de Venta Unitario del año siguiente con incremento
        let precioVentaSiguiente = precioVentaActual * (1 + priceIncreasePct / 100);
        precioVentaSiguiente = Math.round(precioVentaSiguiente * 100) / 100;

        const totalFacturado = Math.round(raw.factAmount * 100) / 100;
        const eurosCartera = Math.round((udCartera * precioVentaActual) * 100) / 100;
        const eurosPrevision = Math.round((udPrevision * precioVentaActual) * 100) / 100;

        consolidatedList.push({
          repCode,
          customerCode: raw.customerCode,
          customerName: custInfo?.name || raw.customerCode,
          community: custInfo?.community || '',
          pmCode: catInfo?.pmCode || '',
          familyCode: catInfo?.familyCode || '',
          familyName: catInfo?.familyName || '',
          subfamilyCode: subCode,
          subfamilyName: catInfo?.subfamilyName || '',
          productNo: raw.productNo,
          description: prodInfo?.description || '',
          udFacturadas,
          udCartera,
          udPrevision,
          precioVentaActual,
          precioVentaSiguiente,
          totalFacturado,
          eurosCartera,
          eurosPrevision,
        });
      }

      // Ordenar por comercial, cliente y producto
      consolidatedList.sort((a, b) => {
        if (a.repCode !== b.repCode) return a.repCode.localeCompare(b.repCode);
        if (a.customerName !== b.customerName) return a.customerName.localeCompare(b.customerName);
        return a.productNo.localeCompare(b.productNo);
      });

      // 5. Generación de Excel / ZIP
      if (asZip) {
        // Agrupar filas por comercial
        const rowsByRep = new Map<string, ConsolidatedRow[]>();
        for (const row of consolidatedList) {
          const list = rowsByRep.get(row.repCode) || [];
          list.push(row);
          rowsByRep.set(row.repCode, list);
        }

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="Plantillas_Presupuestos_${nextYear}.zip"`,
        );

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(res);

        for (const [repCode, repRows] of rowsByRep.entries()) {
          const wb = this.createExcelWorkbook(repRows, currentYear, nextYear, priceIncreasePct, protectSheet);
          const buffer = await wb.xlsx.writeBuffer();
          archive.append(Buffer.from(buffer), {
            name: `Presupuestos_${nextYear}_${repCode}.xlsx`,
          });
        }

        // Si hay varios comerciales, incluir también el archivo global consolidado dentro del ZIP
        if (rowsByRep.size > 1) {
          const globalWb = this.createExcelWorkbook(consolidatedList, currentYear, nextYear, priceIncreasePct, protectSheet);
          const globalBuffer = await globalWb.xlsx.writeBuffer();
          archive.append(Buffer.from(globalBuffer), {
            name: `Presupuestos_${nextYear}_TODOS_CONSOLIDADO.xlsx`,
          });
        }

        await archive.finalize();
      } else {
        // Archivo Excel único
        const fileName = filterSalesperson
          ? `Presupuestos_${nextYear}_${filterSalesperson}.xlsx`
          : `Presupuestos_${nextYear}_TODOS.xlsx`;

        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        const wb = this.createExcelWorkbook(consolidatedList, currentYear, nextYear, priceIncreasePct, protectSheet);
        await wb.xlsx.write(res);
        res.end();
      }
    } catch (error) {
      console.error('Error al generar plantillas de presupuestos:', error);
      throw new InternalServerErrorException(
        error.message || 'Error al generar el archivo Excel de presupuestos',
      );
    }
  }

  /**
   * Crea un libro de trabajo ExcelJS con el formato exacto requerido,
   * estilos corporativos (#003E51), bloqueo de columnas y fórmulas de cálculo.
   */
  private createExcelWorkbook(
    rows: any[],
    currentYear: number,
    nextYear: number,
    priceIncreasePct: number = 0,
    protectSheet: boolean = false,
  ): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'dTS Instruments';
    workbook.lastModifiedBy = 'dTS Instruments WebApp';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(`Presupuestos ${nextYear}`, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'N2' }],
    });

    const pctSign = priceIncreasePct >= 0 ? `+${priceIncreasePct}%` : `${priceIncreasePct}%`;
    const headerPrecioSiguiente = `PrecioVentaUd ${nextYear} (${pctSign})`;

    // 21 Columnas: Comunidad Autónoma añadida tras Nombre cliente, y Nº producto reubicado a la izquierda de Descripción
    worksheet.columns = [
      { header: 'Cod vendedor', key: 'repCode', width: 14 }, // A (1)
      { header: 'Cod cliente', key: 'customerCode', width: 14 }, // B (2)
      { header: 'Nombre cliente', key: 'customerName', width: 34 }, // C (3)
      { header: 'Comunidad Autónoma', key: 'community', width: 24 }, // D (4) - NUEVA COLUMNA
      { header: 'Cod Product Manager', key: 'pmCode', width: 20 }, // E (5)
      { header: 'familia', key: 'familyCode', width: 12 }, // F (6)
      { header: 'Desc_familia', key: 'familyName', width: 28 }, // G (7)
      { header: 'subfamilia', key: 'subfamilyCode', width: 14 }, // H (8)
      { header: 'Desc_subfam', key: 'subfamilyName', width: 28 }, // I (9)
      { header: 'Nº producto', key: 'productNo', width: 16 }, // J (10) - A LA IZQUIERDA DE DESCRIPCIÓN
      { header: 'Descripción', key: 'description', width: 38 }, // K (11)
      { header: 'UdFacturadas a dia de hoy', key: 'udFacturadas', width: 24 }, // L (12)
      { header: 'UdCartera', key: 'udCartera', width: 14 }, // M (13)
      { header: `UdPrevision 31/12/${currentYear}`, key: 'udPrevision', width: 24 }, // N (14) (EDITABLE / EN BLANCO)
      { header: `UdObjetivo ${nextYear}`, key: 'udObjetivo', width: 20 }, // O (15) (EDITABLE / EN BLANCO)
      { header: `PrecioVentaUd ${currentYear}`, key: 'precioVentaActual', width: 20 }, // P (16)
      { header: headerPrecioSiguiente, key: 'precioVentaSiguiente', width: 24 }, // Q (17) (SOLO LECTURA)
      { header: 'TotalLineaFacturado a dia de hoy', key: 'totalFacturado', width: 28 }, // R (18)
      { header: '€ Cartera', key: 'eurosCartera', width: 16 }, // S (19)
      { header: `€ Previsión ${currentYear}`, key: 'eurosPrevision', width: 18 }, // T (20) (FÓRMULA / BLOQUEADA)
      { header: `€ Objetivo ${nextYear}`, key: 'eurosObjetivo', width: 18 }, // U (21) (FÓRMULA / BLOQUEADA)
    ];

    // Estilo de Cabecera (Fila 1)
    const headerRow = worksheet.getRow(1);
    headerRow.height = 32;

    headerRow.eachCell((cell, colNumber) => {
      // Cabeceras de columnas editables N (14) y O (15) con distintivo de edición
      const isEditableCol = colNumber === 14 || colNumber === 15;

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEditableCol ? 'FF00B0B9' : 'FF003E51' }, // Cian para destacar editables, Azul corporativo para las demás
      };
      cell.font = {
        name: 'Segoe UI',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'medium', color: { argb: isEditableCol ? 'FFFEF08A' : 'FF00B0B9' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    });

    // Añadir Filas de Datos
    rows.forEach((r, idx) => {
      const rowNumber = idx + 2;

      // Columna T (20): Fórmula Excel =SI(O(ESBLANCO(N2);ESBLANCO(P2)); ""; N2*P2)
      const formulaEurosPrevision = {
        formula: `IF(OR(ISBLANK(N${rowNumber}),ISBLANK(P${rowNumber})),"",N${rowNumber}*P${rowNumber})`,
      };

      // Columna U (21): Fórmula Excel =SI(O(ESBLANCO(O2);ESBLANCO(Q2)); ""; O2*Q2)
      const formulaEurosObjetivo = {
        formula: `IF(OR(ISBLANK(O${rowNumber}),ISBLANK(Q${rowNumber})),"",O${rowNumber}*Q${rowNumber})`,
      };

      const row = worksheet.addRow({
        repCode: r.repCode,
        customerCode: r.customerCode,
        customerName: r.customerName,
        community: r.community,
        pmCode: r.pmCode,
        familyCode: r.familyCode,
        familyName: r.familyName,
        subfamilyCode: r.subfamilyCode,
        subfamilyName: r.subfamilyName,
        productNo: r.productNo,
        description: r.description,
        udFacturadas: r.udFacturadas,
        udCartera: r.udCartera,
        udPrevision: null, // EN BLANCO: rellenable por el comercial
        udObjetivo: null, // EN BLANCO: rellenable por el comercial
        precioVentaActual: r.precioVentaActual,
        precioVentaSiguiente: r.precioVentaSiguiente,
        totalFacturado: r.totalFacturado,
        eurosCartera: r.eurosCartera,
        eurosPrevision: formulaEurosPrevision,
        eurosObjetivo: formulaEurosObjetivo,
      });

      row.height = 20;

      // Aplicar formatos, alineaciones y reglas de protección por celda
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // Por defecto: Calibri 9.5
        cell.font = { name: 'Segoe UI', size: 9.5 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFF3F4F6' } },
          bottom: { style: 'thin', color: { argb: 'FFF3F4F6' } },
          left: { style: 'thin', color: { argb: 'FFF3F4F6' } },
          right: { style: 'thin', color: { argb: 'FFF3F4F6' } },
        };

        // Códigos centrados (A, B, E, F, H, J)
        if ([1, 2, 5, 6, 8, 10].includes(colNumber)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if ([3, 4, 7, 9, 11].includes(colNumber)) {
          // Textos a la izquierda (C, D, G, I, K)
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        // Cantidades enteras del sistema (L, M)
        if ([12, 13].includes(colNumber)) {
          cell.numFmt = '#,##0;(#,##0);"-"';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }

        // Columnas N y O: UdPrevision y UdObjetivo (AMBAS EDITABLES POR EL COMERCIAL)
        if (colNumber === 14 || colNumber === 15) {
          cell.numFmt = '#,##0;(#,##0);"-"';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003E51' } };
          // Fondo suave amarillo pastel para indicar campo de entrada de datos
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEF9C3' }, // Amarillo pastel suave
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFFDE047' } },
            bottom: { style: 'thin', color: { argb: 'FFFDE047' } },
            left: { style: 'thin', color: { argb: 'FFFDE047' } },
            right: { style: 'thin', color: { argb: 'FFFDE047' } },
          };
          // DESBLOQUEAR para que el comercial las pueda editar
          cell.protection = { locked: false };
        } else {
          // TODAS LAS DEMÁS CELDAS: BLOQUEADAS (SOLO LECTURA)
          cell.protection = { locked: true };
        }

        // Monedas (P, Q, R, S, T, U)
        if ([16, 17, 18, 19, 20, 21].includes(colNumber)) {
          cell.numFmt = '#,##0.00 €;(#,##0.00 €);"-"';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }

        // Columna Q (PrecioVentaUd Siguiente): Solo lectura con fondo gris claro sutil
        if (colNumber === 17) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' },
          };
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF1F2937' } };
        }

        // Columnas T y U (€ Previsión y € Objetivo): Fondo cian suave con negrita y fórmula (solo lectura protegida)
        if (colNumber === 20 || colNumber === 21) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0FDFA' }, // Cian muy suave
          };
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F766E' } };
        }
      });
    });

    // Auto-filtro activo en toda la tabla
    const lastRowIndex = Math.max(rows.length + 1, 2);
    worksheet.autoFilter = {
      from: 'A1',
      to: `U${lastRowIndex}`,
    };

    // Si se solicita protección expresamente, proteger la hoja.
    // Por defecto se mantiene DESPROTEGIDA para que los comerciales puedan insertar filas nuevas
    // con productos/clientes nuevos y editar con total flexibilidad.
    if (protectSheet) {
      worksheet.protect('', {
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertColumns: false,
        insertRows: true,
        insertHyperlinks: false,
        deleteColumns: false,
        deleteRows: false,
        sort: true,
        autoFilter: true,
      });
    }

    return workbook;
  }

  /**
   * Resuelve la Comunidad Autónoma o país a partir de los datos geográficos del cliente.
   */
  private resolveCommunity(c: {
    country_reg_code?: string | null;
    post_code?: string | null;
    city?: string | null;
    county?: string | null;
    name?: string | null;
  }): string {
    const country = (c.country_reg_code || '').trim().toUpperCase();
    const rawPostCode = (c.post_code || '').trim();
    const countyNorm = this.normalizeGeoString(c.county);
    const cityNorm = this.normalizeGeoString(c.city);

    const isSpain = !country || country === 'ES' || country === 'ESP' || country === 'ESPAÑA' || country === 'SPAIN';
    if (!isSpain) {
      return COUNTRY_NAMES[country] || (country ? `Internacional (${country})` : '');
    }

    // 1. Código Postal de España (prefijo de 2 dígitos)
    if (rawPostCode) {
      const cleaned = rawPostCode.replace(/^ES-?/i, '').replace(/\s+/g, '');
      const digits = cleaned.replace(/\D/g, '');
      if (digits.length >= 4 && digits.length <= 5) {
        const prefix = digits.length === 4 ? ('0' + digits[0]) : digits.substring(0, 2);
        if (POSTCODE_TO_REGION[prefix]) {
          return POSTCODE_TO_REGION[prefix];
        }
      }
    }

    // 2. Coincidencia por provincia / county
    if (countyNorm) {
      for (const [prov, region] of Object.entries(PROVINCE_TO_REGION)) {
        if (countyNorm.includes(prov)) return region;
      }
    }

    // 3. Coincidencia por ciudad
    if (cityNorm) {
      for (const [prov, region] of Object.entries(PROVINCE_TO_REGION)) {
        if (cityNorm.includes(prov)) return region;
      }
    }

    // 4. Si el nombre del cliente contiene una comunidad o provincia
    const nameNorm = this.normalizeGeoString(c.name);
    if (nameNorm) {
      for (const [prov, region] of Object.entries(PROVINCE_TO_REGION)) {
        if (nameNorm.includes(prov)) return region;
      }
    }

    return c.county || c.city || '';
  }

  private normalizeGeoString(str?: string | null): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}

// --- Tablas de Normalización Geográfica ---

const POSTCODE_TO_REGION: Record<string, string> = {
  '01': 'País Vasco',
  '02': 'Castilla-La Mancha',
  '03': 'Comunidad Valenciana',
  '04': 'Andalucía',
  '05': 'Castilla y León',
  '06': 'Extremadura',
  '07': 'Islas Baleares',
  '08': 'Cataluña',
  '09': 'Castilla y León',
  '10': 'Extremadura',
  '11': 'Andalucía',
  '12': 'Comunidad Valenciana',
  '13': 'Castilla-La Mancha',
  '14': 'Andalucía',
  '15': 'Galicia',
  '16': 'Castilla-La Mancha',
  '17': 'Cataluña',
  '18': 'Andalucía',
  '19': 'Castilla-La Mancha',
  '20': 'País Vasco',
  '21': 'Andalucía',
  '22': 'Aragón',
  '23': 'Andalucía',
  '24': 'Castilla y León',
  '25': 'Cataluña',
  '26': 'La Rioja',
  '27': 'Galicia',
  '28': 'Comunidad de Madrid',
  '29': 'Andalucía',
  '30': 'Región de Murcia',
  '31': 'Comunidad Foral de Navarra',
  '32': 'Galicia',
  '33': 'Principado de Asturias',
  '34': 'Castilla y León',
  '35': 'Canarias',
  '36': 'Galicia',
  '37': 'Castilla y León',
  '38': 'Canarias',
  '39': 'Cantabria',
  '40': 'Castilla y León',
  '41': 'Andalucía',
  '42': 'Castilla y León',
  '43': 'Cataluña',
  '44': 'Aragón',
  '45': 'Castilla-La Mancha',
  '46': 'Comunidad Valenciana',
  '47': 'Castilla y León',
  '48': 'País Vasco',
  '49': 'Castilla y León',
  '50': 'Aragón',
  '51': 'Ceuta',
  '52': 'Melilla',
};

const PROVINCE_TO_REGION: Record<string, string> = {
  alava: 'País Vasco', araba: 'País Vasco',
  albacete: 'Castilla-La Mancha',
  alicante: 'Comunidad Valenciana', alacant: 'Comunidad Valenciana',
  almeria: 'Andalucía',
  avila: 'Castilla y León',
  badajoz: 'Extremadura',
  baleares: 'Islas Baleares', balears: 'Islas Baleares', mallorca: 'Islas Baleares', menorca: 'Islas Baleares', ibiza: 'Islas Baleares',
  barcelona: 'Cataluña',
  burgos: 'Castilla y León',
  caceres: 'Extremadura',
  cadiz: 'Andalucía',
  castellon: 'Comunidad Valenciana', castello: 'Comunidad Valenciana',
  'ciudad real': 'Castilla-La Mancha',
  cordoba: 'Andalucía',
  coruna: 'Galicia', 'a coruna': 'Galicia', 'la coruna': 'Galicia',
  cuenca: 'Castilla-La Mancha',
  girona: 'Cataluña', gerona: 'Cataluña',
  granada: 'Andalucía',
  guadalajara: 'Castilla-La Mancha',
  guipuzcoa: 'País Vasco', gipuzkoa: 'País Vasco',
  huelva: 'Andalucía',
  huesca: 'Aragón',
  jaen: 'Andalucía',
  leon: 'Castilla y León',
  lleida: 'Cataluña', lerida: 'Cataluña',
  rioja: 'La Rioja', 'la rioja': 'La Rioja',
  lugo: 'Galicia',
  madrid: 'Comunidad de Madrid',
  malaga: 'Andalucía',
  murcia: 'Región de Murcia',
  navarra: 'Comunidad Foral de Navarra', nafarroa: 'Comunidad Foral de Navarra',
  ourense: 'Galicia', orense: 'Galicia',
  asturias: 'Principado de Asturias',
  palencia: 'Castilla y León',
  'las palmas': 'Canarias', palmas: 'Canarias', 'gran canaria': 'Canarias', fuerteventura: 'Canarias', lanzarote: 'Canarias',
  pontevedra: 'Galicia',
  salamanca: 'Castilla y León',
  'santa cruz de tenerife': 'Canarias', tenerife: 'Canarias',
  cantabria: 'Cantabria', santander: 'Cantabria',
  segovia: 'Castilla y León',
  sevilla: 'Andalucía',
  soria: 'Castilla y León',
  tarragona: 'Cataluña',
  teruel: 'Aragón',
  toledo: 'Castilla-La Mancha',
  valencia: 'Comunidad Valenciana',
  valladolid: 'Castilla y León',
  vizcaya: 'País Vasco', bizkaia: 'País Vasco',
  zamora: 'Castilla y León',
  zaragoza: 'Aragón',
  ceuta: 'Ceuta',
  melilla: 'Melilla',
};

const COUNTRY_NAMES: Record<string, string> = {
  PT: 'Portugal',
  AT: 'Austria',
  FR: 'Francia',
  DE: 'Alemania',
  IT: 'Italia',
  US: 'Estados Unidos',
  GB: 'Reino Unido',
  UK: 'Reino Unido',
  IE: 'Irlanda',
  NL: 'Países Bajos',
  BE: 'Bélgica',
  CH: 'Suiza',
  MX: 'México',
  CO: 'Colombia',
  CL: 'Chile',
  DZ: 'Argelia',
  GH: 'Ghana',
  AE: 'EAU (Dubái)',
  CN: 'China',
  MA: 'Marruecos',
  SE: 'Suecia',
  NO: 'Noruega',
  DK: 'Dinamarca',
  PL: 'Polonia',
};
