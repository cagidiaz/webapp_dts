import { Copy, Globe, Laptop, MoreVertical, Reply, ReplyAll, Search } from 'lucide-react';
const OutlookIcon = ({ size = 14, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={{ minWidth: size, minHeight: size }}
  >
    <path d="M22 6.5v11a2.5 2.5 0 0 1-2.5 2.5H9.5a2.5 2.5 0 0 1-2.5-2.5V17h7.5A2.5 2.5 0 0 0 17 14.5V7h2.5A2.5 2.5 0 0 1 22 6.5z" opacity="0.4" fill="#0078D4"/>
    <path d="M14.5 5H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5.5V5z" fill="#0078D4"/>
    <path d="M2 7.5A2.5 2.5 0 0 1 4.5 5h8A2.5 2.5 0 0 1 15 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-8A2.5 2.5 0 0 1 2 16.5v-9z" fill="#106EBE"/>
    <circle cx="8.5" cy="12" r="2.5" fill="#FFFFFF"/>
    <circle cx="8.5" cy="12" r="1.3" fill="#106EBE"/>
  </svg>
);



export type EmailAction = 'open' | 'desktop' | 'web' | 'reply' | 'reply_all' | 'search' | 'copy';
export interface EmailActionData {
  activityId: string;
  itemId?: string | null;
  webLink?: string | null;
  email?: string | null;
  subject?: string | null;
  exchangeSyncStatus?: string | null;
}
interface Props {
  data: EmailActionData;
  isOpen: boolean;
  copied: boolean;
  preferred: 'desktop' | 'web';
  onToggle: () => void;
  onAction: (action: EmailAction, data: EmailActionData) => void;
}
export function EmailActions({ data, isOpen, copied, preferred, onToggle, onAction }: Props) {
  const action = (value: EmailAction) => onAction(value, data);
  const itemClass = 'w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-gray-700 dark:text-gray-200 cursor-pointer';
  return <div className="relative inline-flex items-center" onClick={event => event.stopPropagation()}>
    <button type="button" onClick={() => action('open')} className="p-1 rounded-l-md text-gray-400 hover:text-[#0078D4] hover:bg-[#0078D4]/10 dark:hover:bg-[#0078D4]/20 transition-colors cursor-pointer" title={`Abrir en Outlook (${preferred === 'web' ? 'Web' : 'Escritorio'})`}><OutlookIcon size={13} /></button>
    <button type="button" onClick={onToggle} aria-expanded={isOpen} className="p-1 rounded-r-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer" title="Más opciones de Outlook"><MoreVertical size={12} /></button>
    {isOpen && <div className="absolute right-0 top-full mt-1 z-30 w-56 bg-white dark:bg-surface-card-dark rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
      <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-white/5">Opciones de Outlook</div>
      <button type="button" className={itemClass} onClick={() => action('desktop')}><Laptop size={13} className="text-blue-500" />Abrir en Outlook Classic</button>
      <button type="button" className={itemClass} onClick={() => action('web')}><Globe size={13} className="text-dts-secondary" />Abrir en Outlook Web (M365)</button>
      <button type="button" className={itemClass} onClick={() => action('reply')}><Reply size={13} className="text-amber-500" />Responder</button>
      <button type="button" className={itemClass} onClick={() => action('reply_all')}><ReplyAll size={13} className="text-amber-500" />Responder a todos</button>
      <button type="button" className={itemClass} onClick={() => action('search')}><Search size={13} className="text-purple-500" />Buscar conversación completa</button>
      <div className="my-1 border-t border-gray-100 dark:border-white/5" />
      <button type="button" className={`${itemClass} justify-between text-gray-600 dark:text-gray-300`} onClick={() => action('copy')}><span className="flex items-center gap-2"><Copy size={13} />Copiar datos de búsqueda</span>{copied && <span className="text-[10px] text-emerald-500 font-bold">¡Copiado!</span>}</button>
    </div>}
  </div>;
}
