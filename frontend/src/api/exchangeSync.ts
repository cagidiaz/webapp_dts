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
export const OUTLOOK_PROTOCOL_INSTALLED_KEY = 'dts_outlook_protocol_installed';

/**
 * Comprueba si el usuario ya tiene registrado y validado el protocolo dts-mail:// en este equipo
 */
export const isOutlookProtocolInstalled = (): boolean => {
  return localStorage.getItem(OUTLOOK_PROTOCOL_INSTALLED_KEY) === 'true';
};

/**
 * Marca en localStorage que el protocolo dts-mail:// ya está instalado en este navegador
 */
export const markOutlookProtocolInstalled = (installed: boolean = true) => {
  if (installed) {
    localStorage.setItem(OUTLOOK_PROTOCOL_INSTALLED_KEY, 'true');
  } else {
    localStorage.removeItem(OUTLOOK_PROTOCOL_INSTALLED_KEY);
  }
};

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
 * Lanza una URI de protocolo personalizado (ej. dts-mail://) y detecta si el sistema operativo
 * atendió la llamada o si el protocolo no está instalado (Mejora B: Fallback inteligente).
 */
export const triggerCustomProtocolWithFallback = (
  protocolUri: string,
  onFailed?: () => void
) => {
  // 1. Invocar mediante iframe invisible y enlace directo para máxima compatibilidad Chromium/Firefox
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = protocolUri;
    document.body.appendChild(iframe);
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  } catch {
    // Silencioso
  }

  triggerMailtoUri(protocolUri);

  // 2. Si el usuario ya marcó o instaló el protocolo, no molestar con falsas alarmas
  if (isOutlookProtocolInstalled()) {
    return;
  }

  let hasBlurred = false;
  const onBlurHandler = () => {
    hasBlurred = true;
  };

  window.addEventListener('blur', onBlurHandler);

  // Margen de 4.5 segundos para no interrumpir el cuadro de diálogo de Chrome/Edge
  setTimeout(() => {
    window.removeEventListener('blur', onBlurHandler);
    if (!hasBlurred && document.hasFocus() && !isOutlookProtocolInstalled()) {
      if (onFailed) {
        onFailed();
      }
      window.dispatchEvent(
        new CustomEvent('dts:outlook-protocol-not-installed', {
          detail: { protocolUri },
        })
      );
    }
  }, 4500);
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
  onProtocolFailed?: () => void;
}) => {
  const target = options.target || getPreferredOutlookClient();
  const { webLink, itemId, email, subject, exchangeSyncStatus, onProtocolFailed } = options;

  // 1. Si el usuario tiene configurado Outlook de Escritorio (Classic / App)
  if (target === 'desktop') {
    const params: string[] = [];
    if (itemId) params.push(`id=${encodeURIComponent(itemId)}`);
    if (email) params.push(`from=${encodeURIComponent(email)}`);
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);

    const queryString = params.length > 0 ? `?${params.join('&')}` : '';
    const dtsMailUri = `dts-mail://open${queryString}`;

    triggerCustomProtocolWithFallback(dtsMailUri, () => {
      if (onProtocolFailed) {
        onProtocolFailed();
      } else {
        // Fallback estándar en caso de fallo: ventana de redacción o diálogo de protocolo
        const sub = subject ? (subject.startsWith('Re:') ? subject : `Re: ${subject}`) : '';
        const mailtoParams: string[] = [];
        if (sub) mailtoParams.push(`subject=${encodeURIComponent(sub)}`);
        const qStr = mailtoParams.length > 0 ? `?${mailtoParams.join('&')}` : '';
        const toParam = email ? encodeURIComponent(email) : '';
        triggerMailtoUri(`mailto:${toParam}${qStr}`);
      }
    });
    return;
  }

  // 2. Si el usuario tiene configurado Outlook Web (M365):
  // 2.1 Si existe enlace directo generado por Microsoft Graph/Exchange
  if (webLink) {
    window.open(webLink, OUTLOOK_WEB_TAB_NAME);
    return;
  }

  // 2.2 Si tenemos el ItemID de Exchange (guardado por ejemplo desde el Add-in de Outlook)
  if (itemId) {
    const directItemUrl = `https://outlook.office.com/mail/deeplink?ItemID=${encodeURIComponent(itemId)}&exvsurl=1`;
    window.open(directItemUrl, OUTLOOK_WEB_TAB_NAME);
    return;
  }

  // 2.3 Si es un borrador sin enlace directo, abrir la bandeja de borradores
  if (exchangeSyncStatus === 'draft') {
    window.open('https://outlook.office.com/mail/drafts', OUTLOOK_WEB_TAB_NAME);
    return;
  }

  // 2.4 Si tenemos email del contacto pero no enlace directo al mensaje
  if (email) {
    const composeUrl = new URL('https://outlook.office.com/mail/deeplink/compose');
    composeUrl.searchParams.set('to', email);
    if (subject) {
      composeUrl.searchParams.set('subject', subject.startsWith('Re:') ? subject : `Re: ${subject}`);
    }
    window.open(composeUrl.toString(), OUTLOOK_WEB_TAB_NAME);
    return;
  }

  // 2.5 Fallback por defecto en Outlook Web
  window.open('https://outlook.office.com/mail/inbox', OUTLOOK_WEB_TAB_NAME);
};

/**
 * Abre Outlook en modo respuesta (Reply / Responder a todos) citando el correo (Mejora D)
 */
export const replyInOutlook = (options: {
  itemId?: string | null;
  email?: string | null;
  subject?: string | null;
  target?: 'desktop' | 'web';
  onProtocolFailed?: () => void;
}) => {
  const target = options.target || getPreferredOutlookClient();
  const { itemId, email, subject, onProtocolFailed } = options;

  if (target === 'desktop') {
    const params: string[] = [];
    if (itemId) params.push(`id=${encodeURIComponent(itemId)}`);
    if (email) params.push(`from=${encodeURIComponent(email)}`);
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);

    const queryString = params.length > 0 ? `?${params.join('&')}` : '';
    const dtsMailUri = `dts-mail://reply${queryString}`;

    triggerCustomProtocolWithFallback(dtsMailUri, onProtocolFailed);
    return;
  }

  // Si es Web, abrir compositor con Re:
  const composeUrl = new URL('https://outlook.office.com/mail/deeplink/compose');
  if (email) composeUrl.searchParams.set('to', email);
  if (subject) {
    composeUrl.searchParams.set('subject', subject.startsWith('Re:') ? subject : `Re: ${subject}`);
  }
  window.open(composeUrl.toString(), OUTLOOK_WEB_TAB_NAME);
};

/**
 * Abre la búsqueda de la conversación o hilo completo en Outlook (Mejora E)
 */
export const searchConversationInOutlook = (options: {
  email?: string | null;
  subject?: string | null;
  target?: 'desktop' | 'web';
  onProtocolFailed?: () => void;
}) => {
  const target = options.target || getPreferredOutlookClient();
  const { email, subject, onProtocolFailed } = options;

  if (target === 'desktop') {
    const params: string[] = [];
    if (email) params.push(`from=${encodeURIComponent(email)}`);
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);

    const queryString = params.length > 0 ? `?${params.join('&')}` : '';
    const dtsMailUri = `dts-mail://search${queryString}`;

    triggerCustomProtocolWithFallback(dtsMailUri, onProtocolFailed);
    return;
  }

  // Si es Web, enlace canónico de búsqueda en Outlook Web (M365)
  const cleanSubject = subject ? subject.replace(/^Re:\s*/i, '').trim() : '';
  const queryParts: string[] = [];
  if (email) queryParts.push(`from:${email}`);
  if (cleanSubject) queryParts.push(`subject:"${cleanSubject}"`);

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
  const { email, subject } = options;
  const cleanSubject = subject ? subject.replace(/^Re:\s*/i, '').trim() : '';
  const parts: string[] = [];
  if (email) parts.push(`de:${email}`);
  if (cleanSubject) parts.push(`asunto:"${cleanSubject}"`);

  const textToCopy = parts.join(' ');
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(textToCopy);
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


