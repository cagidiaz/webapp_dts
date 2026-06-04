import apiClient from './apiClient';

export interface SalesDocumentLine {
  id: string;
  document_no: string;
  line_no: number | null;
  type: string | null;
  product_no: string | null;
  gen_prod_posting_group: string | null;
  vat_bus_posting_group: string | null;
  quantity: number | null;
  unit_of_measure_code: string | null;
  unit_cost_lcy: number | null;
  unit_price: number | null;
  vat_percent: number | null;
  line_disc_percent: number | null;
  line_amount: number | null;
  line_disc_amount: number | null;
  margen_percent_ldr: number | null;
  product?: {
    description: string | null;
  };
}

export interface SalesDocument {
  id: string;
  document_no: string;
  document_type?: string | null;
  disc_amount: number | null;
  total_amount_excl_vat: number | null;
  total_vat_amount: number | null;
  total_amount_incl_vat: number | null;
  invoice_margen: number | null;
  customer_no: string;
  your_reference: string | null;
  document_date: string | null;
  posting_date: string | null;
  quote_no: string | null;
  order_no: string | null;
  external_doc_no: string | null;
  corrected_invoice_no: string | null;
  shipment_no: string | null;
  shipment_date: string | null;
  payment_terms_code: string | null;
  payment_method_code: string | null;
  created_at: string | null;
  customer?: {
    name: string;
    salesperson_code: string | null;
  };
  lines: SalesDocumentLine[];
}

export interface SalesDocumentsResponse {
  data: SalesDocument[];
  total: number;
  summary: {
    totalDocuments: number;
    totalInvoicedNet: number;
    totalDiscountsLine: number;
    totalDiscountsGlobal: number;
    averageMarginPct: number;
    totalCost: number;
    totalTransport?: number;
    totalServices?: number;
  };
}

export const getAllSalesDocuments = async (params: {
  take?: number;
  skip?: number;
  search?: string;
  customerCode?: string;
  type?: string;
  sortBy?: string;
  sortDir?: string;
  year?: number;
}): Promise<SalesDocumentsResponse> => {
  const { data } = await apiClient.get('/sales-documents', { params });
  return data;
};

export const getSalesDocumentById = async (id: string): Promise<SalesDocument> => {
  const { data } = await apiClient.get(`/sales-documents/${id}`);
  return data;
};

export const getSalesDocumentsByCustomer = async (customerCode: string): Promise<SalesDocumentsResponse> => {
  const { data } = await apiClient.get(`/sales-documents/customer/${customerCode}`);
  return data;
};
