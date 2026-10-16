import { useState } from 'react';
import { Paperclip } from 'lucide-react';
import type { AttachmentSnapshot } from '../../../utils/emailAttachments';

/** Snapshot only: rendering never consults Microsoft or downloads a file. */
export function EmailAttachments({ value }: { value: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const data = value as AttachmentSnapshot | undefined;
  if (!data || data.version !== 1 || !Array.isArray(data.files)
    || !['complete', 'partial', 'pending', 'unavailable'].includes(data.status)) return null;
  const files = data.files.slice(0, 100).filter(file => typeof file?.name === 'string' && file.name.length > 0);
  if (data.status === 'complete' && files.length === 0) return null;
  return <div className="mt-2 min-w-0 text-[10px] text-gray-500 dark:text-gray-400" aria-label="Adjuntos del correo">
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <Paperclip size={11} aria-hidden="true" /><span>Adjuntos:</span>
      {(expanded ? files : files.slice(0, 3)).map((file, index) => <span key={index} title={file.name}
        className={`min-w-0 max-w-full rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 dark:border-gray-700 dark:bg-gray-800 ${expanded ? 'break-all whitespace-normal' : 'truncate max-w-[180px]'}`}>{file.name}</span>)}
      {files.length > 3 && <button type="button" aria-expanded={expanded} className="text-cyan-700 hover:underline dark:text-cyan-400"
        onClick={event => { event.stopPropagation(); setExpanded(!expanded); }}>{expanded ? 'Mostrar menos' : `+${files.length - 3} más`}</button>}
      {data.status === 'pending' && <span>Pendientes de confirmar tras el envío</span>}
      {data.status === 'unavailable' && <span>Información no disponible</span>}
      {data.status === 'partial' && <span>Lista parcial{data.totalKnown !== null ? ` (${files.length} de ${data.totalKnown})` : ''}</span>}
    </div>
  </div>;
}
