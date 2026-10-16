/** Persist only bounded, displayable metadata. Never persist Graph/Office objects. */
export type EmailAttachments = {
  version: 1;
  status: 'complete' | 'partial' | 'pending' | 'unavailable';
  source: 'office' | 'graph' | 'crm';
  capturedAt: string;
  files: { name: string; size?: number }[];
  totalKnown: number | null;
};

export function attachmentState(status: 'pending' | 'unavailable', source: EmailAttachments['source']): EmailAttachments {
  return { version: 1, status, source, capturedAt: new Date().toISOString(), files: [], totalKnown: null };
}

export function normalizeAttachments(input: unknown, source: EmailAttachments['source']): EmailAttachments {
  const value = input as any;
  if (!value || value.version !== 1 || !['complete', 'partial', 'pending', 'unavailable'].includes(value.status)) return attachmentState('unavailable', source);
  if (value.status === 'pending' || value.status === 'unavailable') return attachmentState(value.status, source);
  if (!Array.isArray(value.files)) return attachmentState('unavailable', source);
  let partial = value.status === 'partial' || value.files.length > 100;
  const files: EmailAttachments['files'] = [];
  for (const file of value.files.slice(0, 100)) {
    if (typeof file?.name !== 'string' || !file.name.trim()) { partial = true; continue; }
    const clean = file.name.replace(/[\x00-\x1f\x7f]/g, '').trim();
    if (!clean) { partial = true; continue; }
    if (clean.length > 512) partial = true;
    files.push({ name: clean.slice(0, 512), ...(Number.isSafeInteger(file.size) && file.size >= 0 ? { size: file.size } : {}) });
  }
  const totalKnown = Number.isSafeInteger(value.totalKnown) && value.totalKnown >= files.length ? value.totalKnown : null;
  if (totalKnown !== null && totalKnown > files.length) partial = true;
  return { version: 1, status: partial ? 'partial' : 'complete', source, capturedAt: new Date().toISOString(), files,
    totalKnown: partial ? totalKnown : files.length };
}
