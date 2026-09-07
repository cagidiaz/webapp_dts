import apiClient from './apiClient';

export interface EmailLookupPayload {
  userEmail: string;
  fromEmail: string;
  fromName?: string;
  toEmails: string[];
  subject?: string;
  itemId?: string;
}

export interface LookupResult {
  isAlreadyLogged: boolean;
  existingActivity?: {
    id: string;
    title: string;
    createdAt: string;
    clientName?: string;
    contactName?: string;
  } | null;
  matchedContact?: {
    id: string;
    name: string;
    email: string;
    jobTitle?: string;
    clientId: string;
  } | null;
  matchedCustomer?: {
    clientId: string;
    name: string;
    city?: string;
    salespersonCode?: string;
  } | null;
  openQuotes: Array<{
    document_no: string;
    document_date?: string;
    amount: number;
    estado: string;
    probabilidad: number;
    proxima_accion?: string;
  }>;
  detectedInterlocutors: string[];
  isOutgoing: boolean;
  userFound: boolean;
}

export interface LogEmailPayload {
  userEmail: string;
  exchangeItemId: string;
  exchangeWebLink?: string;
  contactId?: string;
  clientId?: string;
  subject: string;
  body: string;
  sentDate?: string;
  direction?: 'INCOMING' | 'OUTGOING';
  interlocutorEmail?: string;
  categoryTag?: 'ACEPTACION' | 'TECNICA' | 'NEGOCIACION' | 'POSTVENTA' | 'GENERAL';
  quoteDocumentNo?: string;
  cleanBody?: boolean;
}

export interface LogEmailResponse {
  success: boolean;
  alreadyExisted: boolean;
  quoteLinked: boolean;
  activity: {
    id: string;
    title: string;
    createdAt: string;
    customerName?: string;
    contactName?: string;
  };
  message: string;
}

export interface CompanyCandidate {
  client_id: string;
  name: string;
  city?: string;
  salesperson_code?: string;
}

/**
 * Consulta en backend la información contextual del correo para el Add-in
 */
export const lookupEmailInAddin = async (payload: EmailLookupPayload): Promise<LookupResult> => {
  const { data } = await apiClient.post<LookupResult>('/outlook-addin/lookup', payload);
  return data;
};

/**
 * Registra el correo en el CRM vinculado a contacto y/o cotización
 */
export const logEmailToAddin = async (payload: LogEmailPayload): Promise<LogEmailResponse> => {
  const { data } = await apiClient.post<LogEmailResponse>('/outlook-addin/log-email', payload);
  return data;
};

/**
 * Busca clientes de dTS para asociar cuando el correo es de un nuevo interlocutor
 */
export const searchCompaniesForAddin = async (query: string): Promise<CompanyCandidate[]> => {
  const { data } = await apiClient.get<CompanyCandidate[]>('/outlook-addin/search-companies', {
    params: { q: query },
  });
  return data;
};
