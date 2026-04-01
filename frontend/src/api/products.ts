import apiClient from './apiClient';

export interface ProductCategory {
  id: string;
  family_code: string | null;
  subfamily_code: string | null;
  family_name: string | null;
  subfamily_name: string | null;
  pm_code: string | null;
}

export interface ProductDataRow {
  id: string;
  item_no: string;
  description: string | null;
  type: string | null;
  inventory_qty: number;
  is_assembly: boolean;
  base_uom: string | null;
  standard_cost: number;
  unit_cost: number;
  last_purchase_price: number;
  profit_margin_pct: number;
  unit_price: number;
  gen_bus_group: string | null;
  vat_group: string | null;
  vendor_no: string | null;
  subfamily_code: string | null;
  is_blocked: boolean;
  last_date_modified: string | null;
  replenish_type: string | null;
  created_at: string;
  updated_at: string;
  category?: ProductCategory | null;
}

export interface ProductsResponse {
  data: ProductDataRow[];
  total: number;
  summary: {
    totalStock: number;
    avgPrice: number;
  };
}

export const getAllProducts = async (params: { 
  take?: number; 
  skip?: number; 
  search?: string;
  family?: string;
  vendor?: string;
  withStock?: boolean;
  isBlocked?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): Promise<ProductsResponse> => {
  const { data } = await apiClient.get('/products', { params });
  return data;
};

export const getProductFamilies = async (): Promise<ProductCategory[]> => {
  const { data } = await apiClient.get('/products/families');
  return data;
};

export const getProductVendors = async (): Promise<string[]> => {
  const { data } = await apiClient.get('/products/vendors');
  return data;
};

export const getProductById = async (id: string): Promise<ProductDataRow> => {
  const { data } = await apiClient.get(`/products/${id}`);
  return data;
};

export const getProductByItemNo = async (itemNo: string): Promise<ProductDataRow> => {
  const { data } = await apiClient.get(`/products/code/${itemNo}`);
  return data;
};
