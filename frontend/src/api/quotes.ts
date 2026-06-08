import apiClient from './apiClient';

export interface SalesQuote {
  id: string;
  document_type: string | null;
  document_no: string;
  customer_no: string;
  amount: number | null;
  salesperson_code: string | null;
  cerrado: boolean;
  catproducto_code: string | null;
  document_date: string | null;
  estado_oferta: string | null;
  external_doc_no: string | null;
  confirmacion_date: string | null;
  cierreprev_date: string | null;
  motivo_ganada: string | null;
  motivo_perdida: string | null;
  observaciones: string | null;
  pedido_confirmado: boolean;
  probabilidad_exito: number | null;
  oferta_type: string | null;
  valor_oferta_ponderado: number | null;
  your_reference: string | null;
  created_at: string | null;
  updated_at: string | null;
  customer?: {
    name: string;
    salesperson_code: string | null;
  };
  sales_rep?: {
    name: string;
  };
}

export interface SalesQuotesResponse {
  data: SalesQuote[];
  total: number;
  summary: {
    totalCount: number;
    totalAmount: number;
    wonAmount: number;
    wonCount: number;
    lostAmount: number;
    lostCount: number;
    pendingAmount: number;
    pendingCount: number;
    successRate: number;
    totalWeightedValue: number;
    averageProbability: number;
    chartData?: {
      monthlyStatusData: {
        month: string;
        monthIndex: number;
        createdCount: number;
        createdAmount: number;
        approvedCount: number;
        approvedAmount: number;
      }[];
      monthlySalespersonData: {
        month: string;
        salespersonCode: string;
        salespersonName: string;
        count: number;
        amount: number;
        wonCount: number;
        wonAmount: number;
        successRate: number;
      }[];
    };
  };
}

export const getAllQuotes = async (params: {
  take?: number;
  skip?: number;
  search?: string;
  customerCode?: string;
  salespersonCode?: string;
  estadoOferta?: string;
  cerrado?: string | boolean;
  sortBy?: string;
  sortDir?: string;
  year?: number;
}): Promise<SalesQuotesResponse> => {
  const { data } = await apiClient.get('/quotes', { params });
  return data;
};

export const getQuoteById = async (id: string): Promise<SalesQuote> => {
  const { data } = await apiClient.get(`/quotes/${id}`);
  return data;
};
