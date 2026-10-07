import apiClient from './apiClient';

export interface ExchangeStatus {
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
 * Abre un correo existente en Outlook respetando la preferencia del usuario
 */
export const openExistingEmailInOutlook = (options: {
  webLink?: string | null;
  itemId?: string | null;
  email?: string | null;
  subject?: string | null;
  target?: 'desktop' | 'web';
  exchangeSyncStatus?: string | null;
}) => {
  const target = options.target || getPreferredOutlookClient();
  const { webLink, itemId, email, subject, exchangeSyncStatus } = options;

  // 1. Si existe enlace directo generado por Microsoft Graph/Exchange
  if (webLink) {
    window.open(webLink, OUTLOOK_WEB_TAB_NAME);
    return;
  }

  // 2. Si tenemos el ItemID de Exchange (guardado por ejemplo desde el Add-in de Outlook)
  if (itemId) {
    const directItemUrl = `https://outlook.office.com/mail/deeplink?ItemID=${encodeURIComponent(itemId)}&exvsurl=1`;
    window.open(directItemUrl, OUTLOOK_WEB_TAB_NAME);
    return;
  }

  // 3. Si es un borrador sin enlace directo, abrir la bandeja de borradores
  if (exchangeSyncStatus === 'draft') {
    window.open('https://outlook.office.com/mail/drafts', OUTLOOK_WEB_TAB_NAME);
    return;
  }

  // 4. Si tenemos email del contacto pero no enlace directo al mensaje
  if (email) {
    if (target === 'web') {
      const composeUrl = new URL('https://outlook.office.com/mail/deeplink/compose');
      composeUrl.searchParams.set('to', email);
      if (subject) {
        composeUrl.searchParams.set('subject', subject.startsWith('Re:') ? subject : `Re: ${subject}`);
      }
      window.open(composeUrl.toString(), OUTLOOK_WEB_TAB_NAME);
    } else {
      const sub = subject ? (subject.startsWith('Re:') ? subject : `Re: ${subject}`) : '';
      const params: string[] = [];
      if (sub) params.push(`subject=${encodeURIComponent(sub)}`);
      const queryString = params.length > 0 ? `?${params.join('&')}` : '';
      triggerMailtoUri(`mailto:${encodeURIComponent(email)}${queryString}`);
    }
    return;
  }

  // 5. Fallback por defecto
  window.open('https://outlook.office.com/mail/inbox', OUTLOOK_WEB_TAB_NAME);
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


