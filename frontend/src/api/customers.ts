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
