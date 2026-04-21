import apiClient from './apiClient';

// --- Types ---

export interface ProductBudgetFilters {
  year: number;
  months?: number[];
  salespersonCode?: string;
  pmCode?: string;
  familyCode?: string;
  subfamilyCode?: string;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  take?: number;
  skip?: number;
}

export interface ProductBudgetKPIs {
  ventas: number;
  objetivo: number;
  desviacionEur: number;
  desviacionPct: number;
  carteraVentas: number;
  enviadosFacturar: number;
}

export interface ProductBudgetProductRow {
  itemNo: string;
  productName: string;
  facturacion: number;
  objetivo: number;
  desviacion: number;
  desviacionPorcentaje: number;
}

export interface ProductBudgetCustomerRow {
  customerCode: string;
  customerName: string;
  isNew?: boolean;
  facturacion: number;
  objetivo: number;
  desviacion: number;
  desviacionPorcentaje: number;
  products: ProductBudgetProductRow[];
  [key: string]: any;
}

export interface ProductBudgetResponse {
  kpis: ProductBudgetKPIs;
  rows: ProductBudgetCustomerRow[];
  total: number;
}

export interface ProductBudgetEvolutionRow {
  month: number;
  ventas: number;
  objetivo: number;
}

export interface PmCode {
  code: string;
  name: string;
}

// --- API Functions ---

export const getProductBudgetPerformance = async (
  filters: ProductBudgetFilters
): Promise<ProductBudgetResponse> => {
  const {
    year, months, salespersonCode, pmCode, familyCode, subfamilyCode,
    search, take, skip, sortBy, sortDir
  } = filters;

  const params = new URLSearchParams();
  params.append('year', String(year));
  if (months && months.length > 0) params.append('months', months.join(','));
  if (salespersonCode) params.append('salespersonCode', salespersonCode);
  if (pmCode) params.append('pmCode', pmCode);
  if (familyCode) params.append('familyCode', familyCode);
  if (subfamilyCode) params.append('subfamilyCode', subfamilyCode);
  if (search) params.append('search', search);
  if (take !== undefined) params.append('take', String(take));
  if (skip !== undefined) params.append('skip', String(skip));
  if (sortBy) params.append('sortBy', sortBy);
  if (sortDir) params.append('sortDir', sortDir);

  const response = await apiClient.get<ProductBudgetResponse>(`/sales/product-budget-performance?${params.toString()}`);
  return response.data;
};

export const getProductBudgetEvolution = async (
  filters: Omit<ProductBudgetFilters, 'months' | 'take' | 'skip' | 'sortBy' | 'sortDir'>
): Promise<ProductBudgetEvolutionRow[]> => {
  const { year, salespersonCode, pmCode, familyCode, subfamilyCode, search } = filters;

  const params = new URLSearchParams();
  params.append('year', String(year));
  if (salespersonCode) params.append('salespersonCode', salespersonCode);
  if (pmCode) params.append('pmCode', pmCode);
  if (familyCode) params.append('familyCode', familyCode);
  if (subfamilyCode) params.append('subfamilyCode', subfamilyCode);
  if (search) params.append('search', search);

  const response = await apiClient.get<ProductBudgetEvolutionRow[]>(`/sales/product-budget-evolution?${params.toString()}`);
  return response.data;
};

export const getProductBudgetExport = async (
  filters: Omit<ProductBudgetFilters, 'take' | 'skip'>
): Promise<ProductBudgetResponse> => {
  return getProductBudgetPerformance({ ...filters, take: 99999, skip: 0 });
};

export const getPmCodes = async (): Promise<PmCode[]> => {
  const response = await apiClient.get<PmCode[]>('/sales/pm-codes');
  return response.data;
};
