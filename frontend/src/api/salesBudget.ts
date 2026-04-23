import apiClient from './apiClient';

export interface SalesBudgetPerformanceFilters {
  year: number;
  months?: number[];
  salespersonCode?: string;
  familyCode?: string;
  subfamilyCode?: string;
  customerCode?: string;
  search?: string;
  take?: number;
  skip?: number;

  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface SalesBudgetPerformanceKPIs {
  ventas: number;
  objetivo: number;
  desviacionEur: number;
  desviacionPct: number;
  carteraVentas: number;
  carteraVentasAccounts: number;
  enviadosFacturar: number;
  enviadosFacturarAccounts: number;
}

export interface SalesBudgetPerformanceDataRow {
  customerCode: string;
  customerName: string;
  isNew?: boolean;
  facturacion: number;
  objetivo: number;
  desviacion: number;
  desviacionPorcentaje: number;
  [key: string]: any; // Permite indexación dinámica para ordenación
}

export interface SalesBudgetPerformanceResponse {
  kpis: SalesBudgetPerformanceKPIs;
  rows: SalesBudgetPerformanceDataRow[];
  total: number;
}

export interface SalesBudgetEvolutionRow {
  month: number;
  ventas: number;
  objetivo: number;
}

/**
 * Fetch budget performance data for KPIs and Table
 */
export const getSalesBudgetPerformance = async (
  filters: SalesBudgetPerformanceFilters
): Promise<SalesBudgetPerformanceResponse> => {
  const { 
    year, months, salespersonCode, familyCode, subfamilyCode, 
    customerCode, search, take, skip, sortBy, sortDir 
  } = filters;
  
  const params = new URLSearchParams();
  params.append('year', String(year));
  if (months && months.length > 0) params.append('months', months.join(','));
  if (salespersonCode) params.append('salespersonCode', salespersonCode);
  if (customerCode) params.append('customerCode', customerCode);
  if (search) params.append('search', search);
  if (familyCode) params.append('familyCode', familyCode);
  if (subfamilyCode) params.append('subfamilyCode', subfamilyCode);
  if (take !== undefined) params.append('take', String(take));
  if (skip !== undefined) params.append('skip', String(skip));
  if (sortBy) params.append('sortBy', sortBy);
  if (sortDir) params.append('sortDir', sortDir);


  const response = await apiClient.get<SalesBudgetPerformanceResponse>(`/sales/budget-performance?${params.toString()}`);
  return response.data;
};

/**
 * Fetch budget evolution for chart
 */
export const getSalesBudgetEvolution = async (
  filters: Omit<SalesBudgetPerformanceFilters, 'months'>
): Promise<SalesBudgetEvolutionRow[]> => {
  const { year, salespersonCode, familyCode, subfamilyCode, customerCode, search } = filters;
  
  const params = new URLSearchParams();
  params.append('year', String(year));
  if (salespersonCode) params.append('salespersonCode', salespersonCode);
  if (customerCode) params.append('customerCode', customerCode);
  if (search) params.append('search', search);
  if (familyCode) params.append('familyCode', familyCode);
  if (subfamilyCode) params.append('subfamilyCode', subfamilyCode);


  const response = await apiClient.get<SalesBudgetEvolutionRow[]>(`/sales/budget-evolution?${params.toString()}`);
  return response.data;
};

/**
 * Fetches sales reps
 */

export const getSalesReps = async () => {
  const response = await apiClient.get<{code: string; name: string}[]>('/customers/salespersons');
  return response.data;
};

export const getTopProducts = async (params: {
  year: number;
  take?: number;
  salespersonCode?: string;
}): Promise<any[]> => {
  const { data } = await apiClient.get('/sales/top-products', { params });
  return data;
};

/**
 * Fetches ALL rows (no pagination) for XLSX export.
 * Passes the same filters as the table but with a very high take value.
 */
export const getSalesBudgetPerformanceExport = async (
  filters: Omit<SalesBudgetPerformanceFilters, 'take' | 'skip'>
): Promise<SalesBudgetPerformanceResponse> => {
  return getSalesBudgetPerformance({ ...filters, take: 99999, skip: 0 });
};
