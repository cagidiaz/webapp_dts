import apiClient from './apiClient';

export interface CustomerDataRow {
  id: string;
  client_id: string;
  name: string;
  balance_lcy: number;
  balance_due_lcy: number;
  credit_limit_lcy: number;
  blocked: string | null;
  privacy_blocked: boolean;
  salesperson_code: string | null;
  market_segment: string | null;
  business_model: string | null;
  client_type?: string | null;
  total_sales: number;
  cost_profit_variance_lcy: number;
  adjusted_profit: number;
  adjusted_profit_pct: number;
  order_margin: number;
  invoice_margin: number;
  address: string | null;
  address_2: string | null;
  country_reg_code: string | null;
  city: string | null;
  county: string | null;
  post_code: string | null;
  phone_no: string | null;
  mobile_no: string | null;
  email: string | null;
  home_page: string | null;
  language_code: string | null;
  vat_no: string | null;
  customer_posting_group: string | null;
  payment_terms_code: string | null;
  payment_method_code: string | null;
  shipment_method_code: string | null;
  shipping_agent_code: string | null;
  payments_lcy: number;
  created_at: string;
  updated_at: string;
}

export interface ClientTypeDefinition {
  code: string;
  name: string;
  description: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  dotColor: string;
}

export const CLIENT_TYPES: Record<string, ClientTypeDefinition> = {
  A: {
    code: 'A',
    name: 'Clientes Leales o Fieles',
    description: 'Aman la marca y la recomiendan a otras empresas y personas',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    badgeColor: 'text-emerald-900 dark:text-emerald-200 font-black',
    badgeBorder: 'border-emerald-300 dark:border-emerald-600/60',
    dotColor: 'bg-emerald-600 dark:bg-emerald-400',
  },
  B: {
    code: 'B',
    name: 'Habituales / Frecuentes',
    description: 'Compran de forma recurrente y confían en la marca.',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/50',
    badgeColor: 'text-cyan-950 dark:text-cyan-200 font-black',
    badgeBorder: 'border-cyan-300 dark:border-cyan-600/60',
    dotColor: 'bg-cyan-600 dark:bg-[#00B0B9]',
  },
  C: {
    code: 'C',
    name: 'Clientes Ocasionales',
    description: 'Compran de vez en cuando, sin un ritmo fijo',
    badgeBg: 'bg-violet-50 dark:bg-violet-950/50',
    badgeColor: 'text-violet-950 dark:text-violet-200 font-black',
    badgeBorder: 'border-violet-300 dark:border-violet-600/60',
    dotColor: 'bg-violet-600 dark:bg-violet-400',
  },
  D: {
    code: 'D',
    name: 'Clientes Nuevos',
    description: 'Hicieron su primera compra recientemente.',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
    badgeColor: 'text-amber-950 dark:text-amber-200 font-black',
    badgeBorder: 'border-amber-300 dark:border-amber-600/60',
    dotColor: 'bg-amber-600 dark:bg-amber-400',
  },
  E: {
    code: 'E',
    name: 'Potenciales',
    description: 'No han comprado, pero muestran interés.',
    badgeBg: 'bg-slate-100 dark:bg-slate-800/80',
    badgeColor: 'text-slate-900 dark:text-slate-100 font-black',
    badgeBorder: 'border-slate-300 dark:border-slate-600',
    dotColor: 'bg-slate-600 dark:bg-slate-400',
  },
  F: {
    code: 'F',
    name: 'Inactivos',
    description: 'Estuvieron en el pasado, pero ya no compran',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/50',
    badgeColor: 'text-rose-950 dark:text-rose-200 font-black',
    badgeBorder: 'border-rose-300 dark:border-rose-600/60',
    dotColor: 'bg-rose-600 dark:bg-rose-400',
  },
};

export interface CustomersResponse {
  data: CustomerDataRow[];
  total: number;
  summary: {
    totalDebt: number;
    totalSales: number;
    newCustomersCount: number;
  };
}

export const getAllCustomers = async (params: { 
  take?: number; 
  skip?: number; 
  search?: string;
  blocked?: boolean;
  salesperson?: string;
  clientType?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): Promise<CustomersResponse> => {
  const { data } = await apiClient.get('/customers', { params });
  return data;
};

export interface Salesperson {
  code: string;
  name: string;
}

export const getCustomerSalespersons = async (): Promise<Salesperson[]> => {
  const { data } = await apiClient.get('/customers/salespersons');
  return data;
};

export const getCustomerById = async (id: string): Promise<CustomerDataRow> => {
  const { data } = await apiClient.get(`/customers/${id}`);
  return data;
};

export const getCustomerByClientId = async (clientId: string): Promise<CustomerDataRow> => {
  const { data } = await apiClient.get(`/customers/code/${clientId}`);
  return data;
};

export const updateCustomerClientType = async (clientId: string, clientType: string | null): Promise<CustomerDataRow> => {
  const { data } = await apiClient.patch(`/customers/${clientId}/client-type`, { clientType });
  return data;
};
