import apiClient from './apiClient';

export interface PurchaseOrderLineData {
  id: string;
  document_no: string;
  type: string | null;
  line_no: number | null;
  item_code: string | null;
  description: string | null;
  unit_of_measure: string | null;
  quantity: number;
  direct_unit_cost: number;
  indirect_cost_percent: number;
  unit_cost_lcy: number;
  unit_price_lcy: number;
  line_discount_percent: number;
  line_amount: number;
  line_discount_amount: number;
  prepayment_percent: number;
  prepmt_line_amount: number;
  quantity_received: number;
  qty_to_receive: number;
  qty_to_invoice: number;
  quantity_invoiced: number;
  requested_receipt_date: string | null;
  promised_receipt_date: string | null;
  planned_receipt_date: string | null;
  expected_receipt_date: string | null;
  order_date: string | null;
}

export interface PurchaseOrderHeaderData {
  id: string;
  order_no: string;
  vendor_no: string;
  posting_date: string | null;
  document_date: string | null;
  payment_terms_code: string | null;
  payment_discount_percent: number;
  due_date: string | null;
  payment_method_code: string | null;
  shipment_method_code: string | null;
  posting_description: string | null;
  requested_receipt_date: string | null;
  amount_received_not_invoiced_excl_vat_lcy: number;
  amount: number;
  your_reference: string | null;
  vendor_order_no: string | null;
  created_at: string;
  updated_at: string;
  vendor?: {
    vendor_id: string;
    name: string;
  };
  lines: PurchaseOrderLineData[];
}

export interface PurchaseOrdersResponse {
  data: PurchaseOrderHeaderData[];
  total: number;
  summary: {
    totalOrders: number;
    totalPendingAmount: number;
    totalPendingAmountAccounts: number;
    totalPendingUnits: number;
    totalPendingToInvoice: number;
    totalPendingToInvoiceAccounts: number;
  };
}

export const getAllPurchaseOrders = async (params: {
  take?: number;
  skip?: number;
  search?: string;
  vendorNo?: string;
  type?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): Promise<PurchaseOrdersResponse> => {
  const { data } = await apiClient.get('/purchase-orders', { params });
  return data;
};

export const getPurchaseOrderById = async (id: string): Promise<PurchaseOrderHeaderData> => {
  const { data } = await apiClient.get(`/purchase-orders/${id}`);
  return data;
};

export const getPurchaseOrdersByVendor = async (vendorNo: string): Promise<PurchaseOrdersResponse> => {
  const { data } = await apiClient.get(`/purchase-orders/vendor/${vendorNo}`);
  return data;
};
