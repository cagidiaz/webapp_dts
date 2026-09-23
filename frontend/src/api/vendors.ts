import apiClient from './apiClient';

export interface VendorDataRow {
  id: string;
  vendor_id: string;
  name: string;
  address: string | null;
  address_2: string | null;
  city: string | null;
  county: string | null;
  post_code: string | null;
  country_code: string | null;
  phone_no: string | null;
  mobile_no: string | null;
  email: string | null;
  contact: string | null;
  vat_no: string | null;
  home_page: string | null;
  payment_terms_code: string | null;
  payment_method_code: string | null;
  shipment_method_code: string | null;
  blocked: string | null;
  privacy_blocked: boolean;
  balance_lcy: number;
  balance_due_lcy: number;
  payments_lcy: number;
  prepayment_percent: number;
  created_at: string;
  updated_at: string;
  purchase_volume?: number;
  abc_class?: 'A' | 'B' | 'C' | '-';
}

export interface VendorsResponse {
  data: VendorDataRow[];
  total: number;
  summary: {
    totalBalance: number;
    totalBalanceDue: number;
    totalPayments: number;
    totalPurchases?: number;
    blockedCount: number;
  };
}

export interface VendorProductSupplied {
  item_no: string;
  description: string;
  total_qty: number;
  total_amount: number;
  last_purchase_date: string | null;
  last_purchase_price: number;
  inventory_qty: number;
}

export interface VendorEvolutionEntry {
  year: number;
  month?: number;
  amount: number;
  count: number;
}

export interface VendorAnalyticsResponse {
  vendor: VendorDataRow;
  totalPurchases: number;
  totalOpenOrdersAmount: number;
  yearlyEvolution: VendorEvolutionEntry[];
  monthlyEvolution: VendorEvolutionEntry[];
  products: VendorProductSupplied[];
  openOrders: any[];
}

export const getAllVendors = async (params: {
  take?: number;
  skip?: number;
  search?: string;
  blocked?: boolean;
  year?: number;
  territory?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): Promise<VendorsResponse> => {
  const { data } = await apiClient.get('/vendors', { params });
  return data;
};

export const getVendorById = async (id: string): Promise<VendorDataRow> => {
  const { data } = await apiClient.get(`/vendors/${id}`);
  return data;
};

export const getVendorByVendorId = async (vendorId: string): Promise<VendorDataRow> => {
  const { data } = await apiClient.get(`/vendors/code/${vendorId}`);
  return data;
};

export const getVendorAnalytics = async (vendorId: string): Promise<VendorAnalyticsResponse> => {
  const { data } = await apiClient.get(`/vendors/analytics/${vendorId}`);
  return data;
};

export const getVendorsMapData = async (year?: number): Promise<VendorDataRow[]> => {
  const { data } = await apiClient.get('/vendors/map-data', {
    params: year ? { year } : undefined,
  });
  return data;
};

