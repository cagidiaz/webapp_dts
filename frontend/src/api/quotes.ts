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
  probabilidadExito?: string;
}): Promise<SalesQuotesResponse> => {
  const { data } = await apiClient.get('/quotes', { params });
  return data;
};

export const getQuoteById = async (id: string): Promise<SalesQuote> => {
  const { data } = await apiClient.get(`/quotes/${id}`);
  return data;
};

// --- CRM TYPES & API ENDPOINTS ---

export interface CRMQuoteActivity {
  id: string;
  crm_quote_id: string;
  tipo: string;
  notas: string;
  fecha: string;
  hecho: boolean;
  created_at?: string;
}

export interface CRMQuote {
  id: string;
  document_no: string;
  document_date: string | null;
  amount: number;
  salesperson_code: string | null;
  customer_no: string;
  customer_name: string;
  salesperson_name: string;
  
  crm_id: string | null;
  estado_oferta: string;
  probabilidad_exito: number;
  oferta_type: string;
  cierreprev_date: string | null;
  confirmacion_date: string | null;
  motivo_ganada: string | null;
  motivo_perdida: string | null;
  observaciones: string | null;
  contacto_nombre: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  contact_id?: string | null; // ← NUEVO
  proxima_accion: string | null;
  fecha_proxima_accion: string | null;
  valor_oferta_ponderado: number;
  
  activities: CRMQuoteActivity[];
}

export const getAllCrmQuotes = async (params?: {
  salespersonCode?: string;
  estadoOferta?: string;
  probabilidadExito?: string;
  ofertaType?: string;
  search?: string;
  year?: number | string;
  contactId?: string; // ← NUEVO
}): Promise<CRMQuote[]> => {
  const { data } = await apiClient.get('/quotes/crm', { params });
  return data;
};

export const updateCrmQuote = async (id: string, updateData: Partial<CRMQuote>): Promise<any> => {
  const { data } = await apiClient.patch(`/quotes/crm/${id}`, updateData);
  return data;
};

export const getQuoteActivities = async (id: string): Promise<CRMQuoteActivity[]> => {
  const { data } = await apiClient.get(`/quotes/crm/${id}/activities`);
  return data;
};

export const addQuoteActivity = async (id: string, activityData: {
  tipo: string;
  notas: string;
  fecha: string;
  hecho?: boolean;
}): Promise<CRMQuoteActivity> => {
  const { data } = await apiClient.post(`/quotes/crm/${id}/activities`, activityData);
  return data;
};

export const updateQuoteActivity = async (activityId: string, activityData: {
  tipo?: string;
  notas?: string;
  fecha?: string;
  hecho?: boolean;
}): Promise<CRMQuoteActivity> => {
  const { data } = await apiClient.patch(`/quotes/crm/activities/${activityId}`, activityData);
  return data;
};

export const deleteQuoteActivity = async (activityId: string): Promise<any> => {
  const { data } = await apiClient.delete(`/quotes/crm/activities/${activityId}`);
  return data;
};

