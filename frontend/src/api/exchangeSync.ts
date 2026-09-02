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

/**
 * Crea un borrador en Exchange (Microsoft 365) para abrirlo en Outlook sin enviarlo directamente
 */
export const createExchangeDraft = async (payload: {
  contactId?: string;
  clientId?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
}): Promise<{ success: boolean; draft: { id: string; webLink: string; conversationId?: string; subject: string }; activity: any }> => {
  const { data } = await apiClient.post('/exchange-sync/create-draft', payload);
  return data;
};

const OUTLOOK_PREF_KEY = 'dts_outlook_preferred_client';

/**
 * Obtiene la preferencia guardada del cliente de Outlook del usuario ('desktop' o 'web')
 */
export const getPreferredOutlookClient = (): 'desktop' | 'web' => {
  const saved = localStorage.getItem(OUTLOOK_PREF_KEY);
  if (saved === 'web' || saved === 'desktop') {
    return saved;
  }
  return 'desktop';
};

/**
 * Guarda la preferencia del cliente de Outlook en localStorage
 */
export const setPreferredOutlookClient = (client: 'desktop' | 'web') => {
  localStorage.setItem(OUTLOOK_PREF_KEY, client);
};

const OUTLOOK_WEB_TAB_NAME = 'dts_outlook_web';

/**
 * Abre Outlook (Bandeja de Borradores en Web o App de Escritorio) para editar y enviar el borrador
 */
export const openInOutlook = (options: {
  to: string;
  subject: string;
  body: string;
  target?: 'desktop' | 'web';
  webLink?: string;
}) => {
  const target = options.target || getPreferredOutlookClient();
  const { to, subject, body } = options;

  if (target === 'web') {
    // Abrir directamente la Bandeja de Borradores en la interfaz completa de Outlook Web (reutilizando pestaña existente)
    window.open('https://outlook.office.com/mail/drafts', OUTLOOK_WEB_TAB_NAME);
  } else {
    // Protocolo nativo para Outlook de Escritorio
    const mailtoUri = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUri;
  }
};

/**
 * Abre un correo existente o la conversación de un contacto en Outlook respetando la preferencia del usuario
 */
export const openExistingEmailInOutlook = (options: {
  webLink?: string | null;
  email?: string | null;
  subject?: string | null;
  target?: 'desktop' | 'web';
  exchangeSyncStatus?: string | null;
}) => {
  const target = options.target || getPreferredOutlookClient();
  const { email, subject, exchangeSyncStatus } = options;

  if (target === 'web') {
    if (exchangeSyncStatus === 'draft') {
      // Abrir la carpeta de borradores en la interfaz completa de Outlook Web
      window.open('https://outlook.office.com/mail/drafts', OUTLOOK_WEB_TAB_NAME);
      return;
    }

    // Para correos enviados o recibidos, abrir la bandeja de Elementos Enviados con la interfaz completa de Outlook
    window.open('https://outlook.office.com/mail/sentitems', OUTLOOK_WEB_TAB_NAME);
  } else {
    // Modo Desktop (Windows)
    if (email) {
      const sub = subject ? `Re: ${subject}` : '';
      const mailtoUri = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(sub)}`;
      window.location.href = mailtoUri;
    } else {
      window.open('https://outlook.office.com/mail/sentitems', OUTLOOK_WEB_TAB_NAME);
    }
  }
};
