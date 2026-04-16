import apiClient from './apiClient';

export interface SalesOrderData {
  id: string;
  posting_date: string | null;
  document_type: string | null;
  type: string | null;
  document_number: string;
  item_code: string;
  description: string | null;
  unit_of_measure: string | null;
  quantity: number;
  outstanding_quantity: number;
  quantity_invoice: number;
  qty_shipped_not_invoiced: number;
  unit_price: number;
  line_amount: number;
  customer_code: string;
  shipment_date: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    name: string;
    salesperson_code: string | null;
  };
}

export interface SalesOrdersResponse {
  data: SalesOrderData[];
  total: number;
  summary: {
    totalOrders: number;
    totalAmount: number;
    totalOutstandingUnits: number;
    totalEnviadoNoFacturado: number;
  };
}

export const getAllSalesOrders = async (params: {
  take?: number;
  skip?: number;
  search?: string;
  customerCode?: string;
  sortBy?: string;
  sortDir?: string;
}): Promise<SalesOrdersResponse> => {
  const { data } = await apiClient.get('/sales-orders', { params });
  return data;
};

export const getSalesOrderById = async (id: string): Promise<SalesOrderData> => {
  const { data } = await apiClient.get(`/sales-orders/${id}`);
  return data;
};

export const getSalesOrdersByCustomer = async (customerCode: string): Promise<SalesOrdersResponse> => {
  const { data } = await apiClient.get(`/sales-orders/customer/${customerCode}`);
  return data;
};
