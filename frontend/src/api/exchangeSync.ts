import apiClient from './apiClient';

export interface ExchangeStatus {
  isConnected: boolean;
  account: {
    id: string;
    email: string;
    calendar_sync_enabled: boolean;
    mail_sync_enabled: boolean;
    last_synced_at: string | null;
    created_at: string;
  } | null;
}

/**
 * Obtiene la URL de login para conectar la cuenta de Microsoft Exchange / 365
 */
export const getExchangeConnectUrl = async (redirectUri?: string): Promise<{ authUrl: string }> => {
  const { data } = await apiClient.get('/exchange-sync/connect-url', {
    params: { redirectUri },
  });
  return data;
};

/**
 * Procesa el código devuelto por Microsoft tras la autenticación
 */
export const handleExchangeCallback = async (code: string, redirectUri?: string): Promise<{ success: boolean; email: string }> => {
  const { data } = await apiClient.post('/exchange-sync/callback', {
    code,
    redirectUri,
  });
  return data;
};

/**
 * Obtiene el estado de conexión de Exchange del usuario actual
 */
export const getExchangeStatus = async (): Promise<ExchangeStatus> => {
  const { data } = await apiClient.get('/exchange-sync/status');
  return data;
};

/**
 * Desconecta la cuenta de Exchange del usuario
 */
export const disconnectExchange = async (): Promise<{ success: boolean }> => {
  const { data } = await apiClient.post('/exchange-sync/disconnect');
  return data;
};

/**
 * Fuerza una sincronización manual inmediata entre Outlook y el CRM
 */
export const syncExchangeNow = async (): Promise<{ syncedEvents: number; syncedEmails: number; lastSyncedAt: string }> => {
  const { data } = await apiClient.post('/exchange-sync/sync-now');
  return data;
};

/**
 * Envía un correo electrónico a través de la cuenta de Exchange del comercial
 */
export const sendExchangeEmail = async (payload: {
  contactId?: string;
  clientId?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
}): Promise<{ success: boolean; activity: any }> => {
  const { data } = await apiClient.post('/exchange-sync/send-email', payload);
  return data;
};
