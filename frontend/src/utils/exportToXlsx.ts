import * as XLSX from 'xlsx';

export interface ExportColumn {
  /** Key in the data row object */
  key: string;
  /** Header label shown in the Excel file */
  label: string;
  /** Optional value transformer */
  format?: (value: any, row: any) => any;
  /** Optional Excel cell number format (e.g. '+0.0%;-0.0%;0.0%', '0.0%', '#,##0.00 €') */
  numFmt?: string;
}

export interface ExportSheet<T extends Record<string, any> = Record<string, any>> {
  sheetName: string;
  rows: T[];
  columns: ExportColumn[];
  totalsRow?: Record<string, any>;
}

/**
 * Generates and downloads an .xlsx file with multiple sheets.
 */
export function exportMultiSheetToXlsx(
  sheets: ExportSheet[],
  filename: string
): void {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const { rows, columns, sheetName, totalsRow } = sheet;

    // 1. Build header row
    const header = columns.map((col) => col.label);

    // 2. Build data rows
    const data = rows.map((row) =>
      columns.map((col) => {
        const raw = row[col.key];
        if (col.format) {
          try {
            const formatted = col.format(raw, row);
            return formatted !== undefined && formatted !== null ? formatted : '';
          } catch {
            return raw !== undefined && raw !== null ? raw : '';
          }
        }
        if (raw === null || raw === undefined) return '';
        return raw;
      })
    );

    // 3. Optional totals row
    const totals = totalsRow
      ? columns.map((col) => {
          const raw = totalsRow[col.key];
          if (col.format) {
            try {
              const formatted = col.format(raw, totalsRow);
              return formatted !== undefined && formatted !== null ? formatted : '';
            } catch {
              return raw !== undefined && raw !== null ? raw : '';
            }
          }
          if (raw === null || raw === undefined) return '';
          return raw;
        })
      : null;

    // 4. Assemble sheet data
    const sheetData = [header, ...data];
    if (totals) sheetData.push(totals);

    // 5. Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // 6. Style header row
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '002A38' } },
      alignment: { horizontal: 'center' as const },
    };
    columns.forEach((_, colIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIdx });
      if (ws[cellRef]) {
        ws[cellRef].s = headerStyle;
      }
    });

    // 7. Style totals row
    if (totals) {
      const totalsRowIdx = sheetData.length - 1;
      const totalsStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '00B0B9' } },
      };
      columns.forEach((_, colIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: totalsRowIdx, c: colIdx });
        if (ws[cellRef]) {
          ws[cellRef].s = totalsStyle;
        }
      });
    }

    // 8. Apply cell number formatting
    columns.forEach((col, colIdx) => {
      if (col.numFmt) {
        for (let rowIdx = 1; rowIdx < sheetData.length; rowIdx++) {
          const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
          const cell = ws[cellRef];
          if (cell && cell.t === 'n') {
            cell.z = col.numFmt;
          }
        }
      }
    });

    // 9. Auto-fit column widths
    const colWidths = columns.map((col, colIdx) => {
      let maxLen = col.label.length;
      for (let i = 0; i < data.length; i++) {
        const cell = data[i]?.[colIdx];
        const len = cell != null ? String(cell).length : 0;
        if (len > maxLen) maxLen = len;
      }
      return { wch: Math.min(Math.max(maxLen + 4, 12), 50) };
    });
    ws['!cols'] = colWidths;

    // 9. Append sheet with safe name length (Excel limit 31 chars)
    const safeSheetName = sheetName.replace(/[\\/?*[\]]/g, '').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName || 'Datos');
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Generates and downloads an .xlsx file from the given data (single sheet).
 *
 * @param rows     - Array of data objects (plain, flat)
 * @param columns  - Column definitions: which keys to export and their labels
 * @param filename - Output file name (without extension)
 * @param totalsRow - Optional totals row to append at the bottom
 */
export function exportToXlsx<T extends Record<string, any>>(
  rows: T[],
  columns: ExportColumn[],
  filename: string,
  totalsRow?: Record<string, any>
): void {
  exportMultiSheetToXlsx(
    [{ sheetName: 'Datos', rows, columns, totalsRow }],
    filename
  );
}
