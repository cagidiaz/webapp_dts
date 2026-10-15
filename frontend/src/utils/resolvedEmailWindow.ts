export interface EmailResolveResult {
  status: 'resolved' | 'pending' | 'not_found' | 'ambiguous' | 'access_denied' | 'reconnect_required' | 'temporary_error' | 'disabled' | 'legacy_unverified' | 'busy' | 'popup_blocked' | 'error';
  message: string;
  webLink?: string;
  retryAfterSeconds?: number;
  candidates?: Array<{ id: string; folder: string; sentDate: string | null }>;
  truncated?: boolean;
}

/** Open synchronously during the click; resolve asynchronously without trusting stored URLs. */
export async function resolvedEmailWindow(resolve: () => Promise<EmailResolveResult>): Promise<EmailResolveResult> {
  const popup = window.open('about:blank', '_blank');
  if (!popup) return { status: 'popup_blocked', message: 'Permite las ventanas emergentes de esta app y vuelve a abrir el correo.' };
  try {
    popup.opener = null;
    popup.document.title = 'Comprobando correo en Outlook';
    popup.document.body.textContent = 'Comprobando el correo con Microsoft 365…';
    const result = await resolve();
    if (result.status !== 'resolved') { popup.close(); return result; }
    if (!result.webLink) throw new Error('MISSING_OUTLOOK_TARGET');
    const url = new URL(result.webLink);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !['outlook.office.com', 'outlook.office365.com', 'outlook.cloud.microsoft'].includes(url.hostname)) throw new Error('INVALID_OUTLOOK_TARGET');
    if (!popup.closed) popup.location.replace(url.href);
    return result;
  } catch {
    popup.close();
    return { status: 'error', message: 'No se pudo verificar el correo. Comprueba tu conexión y la sesión del CRM.' };
  }
}
