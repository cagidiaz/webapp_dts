import * as XLSX from 'xlsx';

export interface ExportColumn {
  /** Key in the data row object */
  key: string;
  /** Header label shown in the Excel file */
  label: string;
  /** Optional value transformer */
  format?: (value: any, row: any) => string | number;
}

/**
 * Generates and downloads an .xlsx file from the given data.
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
  // 1. Build header row
  const header = columns.map((col) => col.label);

  // 2. Build data rows
  const data = rows.map((row) =>
    columns.map((col) => {
      const raw = row[col.key];
      if (col.format) return col.format(raw, row);
      if (raw === null || raw === undefined) return '';
      return raw;
    })
  );

  // 3. Optional totals row
  const totals = totalsRow
    ? columns.map((col) => {
        const raw = totalsRow[col.key];
        if (col.format && raw !== undefined) return col.format(raw, totalsRow);
        if (raw === null || raw === undefined) return '';
        return raw;
      })
    : null;

  // 4. Assemble sheet data
  const sheetData = [header, ...data];
  if (totals) sheetData.push(totals);

  // 5. Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // 6. Style header row (bold, background colour)
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

  // 7. Style totals row (bold, different background)
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

  // 8. Auto-fit column widths
  const colWidths = columns.map((col, colIdx) => {
    const maxLen = Math.max(
      col.label.length,
      ...data.map((row) => String(row[colIdx] ?? '').length)
    );
    return { wch: Math.min(maxLen + 4, 50) };
  });
  ws['!cols'] = colWidths;

  // 9. Create workbook and export
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
