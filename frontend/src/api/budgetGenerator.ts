import apiClient from './apiClient';

export interface BudgetGeneratorMeta {
  currentYear: number;
  nextYear: number;
  salesReps: Array<{ code: string; name: string }>;
}

export interface BudgetGeneratorExportParams {
  priceIncreasePct?: number;
  salespersonCode?: string;
  asZip?: boolean;
  protectSheet?: boolean;
}

/**
 * Obtiene los metadatos necesarios para configurar la generación de presupuestos.
 */
export async function getBudgetGeneratorMeta(): Promise<BudgetGeneratorMeta> {
  const response = await apiClient.get<BudgetGeneratorMeta>('/sales/budget-generator/meta');
  return response.data;
}

/**
 * Descarga el archivo Excel (.xlsx) o paquete comprimido (.zip) con las plantillas de presupuestos.
 */
export async function downloadBudgetTemplates(params: BudgetGeneratorExportParams): Promise<void> {
  const queryParams = new URLSearchParams();

  if (params.priceIncreasePct !== undefined) {
    queryParams.append('priceIncreasePct', String(params.priceIncreasePct));
  }
  if (params.salespersonCode) {
    queryParams.append('salespersonCode', params.salespersonCode);
  }
  if (params.asZip) {
    queryParams.append('asZip', 'true');
  }
  if (params.protectSheet) {
    queryParams.append('protectSheet', 'true');
  }

  const response = await apiClient.get(`/sales/budget-generator/export?${queryParams.toString()}`, {
    responseType: 'blob',
  });

  // Extraer nombre del archivo del header o generar uno por defecto
  let fileName = params.asZip ? 'Plantillas_Presupuestos.zip' : 'Plantilla_Presupuestos.xlsx';
  const contentDisposition = response.headers['content-disposition'];
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      fileName = filenameMatch[1];
    }
  }

  // Descarga en navegador
  const blob = new Blob([response.data], {
    type: params.asZip
      ? 'application/zip'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
