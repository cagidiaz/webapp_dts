import { resolvedEmailWindow, type EmailResolveResult } from '../utils/resolvedEmailWindow';
import { isAxiosError } from 'axios';
import apiClient from './apiClient';

export interface ExchangeStatus {
  emailIdentityEnabled?: boolean;
  isConnected: boolean;
  requiresConsent?: boolean;
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

export const OUTLOOK_WEB_TAB_NAME = 'dts_outlook_web';

/**
 * Dispara de manera segura una URI mailto para Outlook de Escritorio / Classic
 * evitando interrupciones en la navegación de la SPA.
 */
const triggerMailtoUri = (mailtoUri: string) => {
  const link = document.createElement('a');
  link.href = mailtoUri;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 200);
};

/**
 * Abre o compone un correo nuevo en Outlook (Web o Desktop/Classic)
 */
export const openInOutlook = (options: {
  to?: string | string[] | null;
  cc?: string | string[] | null;
  subject?: string | null;
  body?: string | null;
  target?: 'desktop' | 'web';
  webLink?: string | null;
  preOpenedWindow?: Window | null;
}) => {
  const target = options.target || getPreferredOutlookClient();
  const toList = Array.isArray(options.to) ? options.to : (options.to ? [options.to] : []);
  const ccList = Array.isArray(options.cc) ? options.cc : (options.cc ? [options.cc] : []);
  const subject = options.subject || '';
  const body = options.body || '';

  if (target === 'web') {
    let targetUrl: string;

    if (options.webLink) {
      targetUrl = options.webLink;
    } else {
      // Deeplink oficial de composición en Outlook Web (M365)
      const composeUrl = new URL('https://outlook.office.com/mail/deeplink/compose');
      if (toList.length > 0) composeUrl.searchParams.set('to', toList.join(';'));
      if (ccList.length > 0) composeUrl.searchParams.set('cc', ccList.join(';'));
      if (subject) composeUrl.searchParams.set('subject', subject);
      if (body) composeUrl.searchParams.set('body', body);
      targetUrl = composeUrl.toString();
    }

    if (options.preOpenedWindow && !options.preOpenedWindow.closed) {
      options.preOpenedWindow.location.href = targetUrl;
      options.preOpenedWindow.focus();
    } else {
      window.open(targetUrl, OUTLOOK_WEB_TAB_NAME);
    }
  } else {
    // Si se había pre-abierto una ventana en blanco para web por error, cerrarla
    if (options.preOpenedWindow && !options.preOpenedWindow.closed) {
      options.preOpenedWindow.close();
    }

    // Protocolo nativo mailto para Outlook Classic / Escritorio
    const params: string[] = [];
    if (ccList.length > 0) params.push(`cc=${encodeURIComponent(ccList.join(';'))}`);
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (body) params.push(`body=${encodeURIComponent(body)}`);

    const toParam = encodeURIComponent(toList.join(';'));
    const queryString = params.length > 0 ? `?${params.join('&')}` : '';
    const mailtoUri = `mailto:${toParam}${queryString}`;

    triggerMailtoUri(mailtoUri);
  }
};

/**
 * Limpia el asunto del correo eliminando prefijos de tipología del CRM (ej. [📥 Recibido · 📋 Petición oferta]),
 * normalizando caracteres especiales, emojis y guiones tipográficos para compatibilidad total con Outlook.
 */
export const cleanEmailSubjectForOutlook = (rawSubject?: string | null): string => {
  if (!rawSubject) return '';
  return rawSubject
    // Eliminar cualquier etiqueta entre corchetes al inicio ej. [📥 Recibido · 📋 ...]
    .replace(/^\[.*?\]\s*/, '')
    // Reemplazar guiones largos/tipográficos por guión estándar
    .replace(/[—–]/g, '-')
    // Eliminar caracteres no estándar o emojis restantes al inicio o fin
    .replace(/^[\p{Extended_Pictographic}\s]+/u, '')
    .trim();
};

/**
 * Abre la búsqueda de la conversación o hilo completo en Outlook (Mejora E)
 */
export const searchConversationInOutlook = (options: {
  email?: string | null;
  subject?: string | null;
}) => {
  const { email } = options;
  const cleanSubject = cleanEmailSubjectForOutlook(options.subject);

  // Si es Web, enlace canónico de búsqueda en Outlook Web (M365)
  const baseSub = cleanSubject ? cleanSubject.replace(/^Re:\s*/i, '').trim() : '';
  const queryParts: string[] = [];
  if (email) queryParts.push(`from:${email}`);
  if (baseSub) queryParts.push(`subject:"${baseSub}"`);

  const searchUrl = `https://outlook.office.com/mail/search?q=${encodeURIComponent(queryParts.join(' '))}`;
  window.open(searchUrl, OUTLOOK_WEB_TAB_NAME);
};

/**
 * Copia los criterios de búsqueda al portapapeles para pegarlos en Outlook
 */
export const copyEmailSearchToClipboard = async (options: {
  email?: string | null;
  subject?: string | null;
}): Promise<boolean> => {
  const { email } = options;
  const cleanSubject = cleanEmailSubjectForOutlook(options.subject);
  const baseSub = cleanSubject ? cleanSubject.replace(/^Re:\s*/i, '').trim() : '';

  const parts: string[] = [];
  if (email) parts.push(`de:${email}`);
  if (baseSub) parts.push(`asunto:"${baseSub}"`);
  const text = parts.join(' ');

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('No se pudo copiar automáticamente al portapapeles:', err);
  }
  return false;
};

/**
 * Abre un evento o calendario en Outlook respetando la preferencia del usuario (Escritorio o Web).
 * Utiliza Deep Links canónicos de lectura para evitar que Outlook Web (OWA) abra el compositor
 * de eventos o provoque duplicaciones visuales o físicas en el calendario.
 */
export const openCalendarEventInOutlook = (options: {
  webLink?: string | null;
  itemId?: string | null;
  target?: 'desktop' | 'web';
}) => {
  const target = options.target || getPreferredOutlookClient();
  const { itemId, webLink } = options;

  if (target === 'desktop') {
    // Protocolo registrado en Windows para la app nativa de Outlook en la vista de calendario
    window.location.href = 'outlook:calendar';
    return;
  }

  // Modo Web (M365):
  // 1. Extraer o normalizar el Item ID de Exchange
  let cleanItemId = itemId || null;
  if (!cleanItemId && webLink) {
    try {
      const parsedUrl = new URL(webLink);
      cleanItemId = parsedUrl.searchParams.get('itemid');
    } catch {
      // Ignorar fallo de parseo si no es una URL absoluta válida
    }
  }

  // 2. Construir la URL canónica de visualización
  let finalUrl = 'https://outlook.office.com/calendar';
  if (cleanItemId) {
    // Enlace profundo oficial de Microsoft 365 para ver el evento existente en lectura directa
    finalUrl = `https://outlook.office.com/calendar/item/${encodeURIComponent(cleanItemId)}`;
  } else if (webLink) {
    finalUrl = webLink;
  }

  // 3. Reutilizar la pestaña oficial de la app para no colisionar instancias de OWA en segundo plano
  const win = window.open(finalUrl, OUTLOOK_WEB_TAB_NAME);
  if (win && !win.closed) {
    win.focus();
  }
};



/** The browser sends only the authorized CRM activity and an optional explicit copy selection. */
export function openVerifiedEmailInWeb(activityId: string, candidateId?: string): Promise<EmailResolveResult> {
  return resolvedEmailWindow(async () => {
    try {
      const { data } = await apiClient.post<EmailResolveResult>(`/exchange-sync/emails/${encodeURIComponent(activityId)}/resolve`, { candidateId });
      return data;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 403) return { status: 'access_denied', message: 'No tienes permiso para abrir este correo desde el CRM.' };
      throw error;
    }
  });
}
