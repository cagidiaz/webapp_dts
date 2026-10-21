export const escapeCalendarHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export const publicCalendarBody = (message: string) => `<div id="dts-crm-invitation"><p><strong>Convocatoria de dTS Instruments</strong></p><p>${escapeCalendarHtml(message).replace(/\n/g, '<br/>')}</p></div>`;

function divRanges(html: string) {
  const stack: number[] = [], ranges: { start: number; end: number }[] = [];
  for (const match of html.matchAll(/<!--[\s\S]*?-->|<\/?div\b[^>]*>/gi)) {
    if (/^<!--/.test(match[0])) continue;
    if (/^<\/div/i.test(match[0])) {
      const start = stack.pop();
      if (start !== undefined) ranges.push({ start, end: match.index! + match[0].length });
    } else stack.push(match.index!);
  }
  return ranges;
}

/** Conservar literalmente el bloque generado por Teams y sustituir solo nuestro contenido público. */
export function mergePublicCalendarBody(current: string, next: string, isOnline: boolean, joinUrl?: string): string {
  if (!isOnline) return next;
  const ranges = divRanges(current);
  const owned = ranges.find(range => /^<div\b[^>]*\bid=["']dts-crm-invitation["']/i.test(current.slice(range.start, range.end)));
  if (owned) {
    const text = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ').trim();
    if (text(current.slice(owned.start, owned.end)) === text(next)) return current;
    return current.slice(0, owned.start) + next + current.slice(owned.end);
  }
  // Compatibilidad con eventos antiguos: conservar únicamente un contenedor Teams reconocible,
  // nunca anexar el cuerpo antiguo completo (podría contener conclusiones internas).
  const blocks = ranges.filter(range => {
    const block = current.slice(range.start, range.end);
    return !!joinUrl && block.replace(/&amp;/g, '&').includes(joinUrl)
      && /me-email|Microsoft Teams/i.test(block)
      && !/Actividad de CRM|Conclusiones\s*:|Empresa\s*:|Contacto\s*:/i.test(block);
  }).sort((a, b) => (b.end - b.start) - (a.end - a.start));
  if (blocks.length) return next + current.slice(blocks[0].start, blocks[0].end);
  throw new Error('No se pudo identificar de forma segura el bloque de Teams del evento antiguo. Revisa su convocatoria antes de modificar invitados.');
}
