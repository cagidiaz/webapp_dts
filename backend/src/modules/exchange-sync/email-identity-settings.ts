export function emailIdentityEnabled(config: { get<T = string>(key: string): T | undefined }, email: string): boolean {
  return config.get('CRM_EMAIL_IDENTITY_ENABLED') === 'true'
    && (config.get<string>('CRM_EMAIL_IDENTITY_EMAILS') || '').split(',').some(value => value.trim() === '*' || value.trim().toLowerCase() === email.trim().toLowerCase());
}
