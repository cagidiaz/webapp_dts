import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { getProspectAccess, getProspectAssignmentNotices } from '../../../api/prospects';
import { useAuthStore } from '../../../store/authStore';

export function ProspectAssignmentNotices({ executive = false, salespersonCode, onNavigate }: { executive?: boolean; salespersonCode?: string | null; onNavigate?: () => void }) {
  const profile = useAuthStore(state => state.profile);
  const navigate = useNavigate();
  const { data: access } = useQuery({ queryKey: ['prospect-access', profile?.id], queryFn: getProspectAccess, enabled: !!profile?.id, retry: false });
  const { data = [] } = useQuery({ queryKey: ['prospect-assignment-notices', profile?.id, executive ? salespersonCode : 'own'], queryFn: () => getProspectAssignmentNotices(executive ? salespersonCode || undefined : undefined, !executive), enabled: !!access?.enabled, refetchInterval: 30000, refetchOnWindowFocus: true });
  if (!data.length) return null;
  return <section aria-label="Prospectos asignados pendientes de abrir" className="rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/30 p-3 space-y-2">
    <h4 className="flex items-center gap-2 text-xs font-bold text-cyan-800 dark:text-cyan-200"><UserPlus size={15} /> Prospectos asignados pendientes de abrir ({data.length})</h4>
    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">{data.map(item => { const recipient = `${item.recipient.first_name || ''} ${item.recipient.last_name || ''}`.trim() || item.recipient.email; const author = `${item.author.first_name || ''} ${item.author.last_name || ''}`.trim() || item.author.email; return <button type="button" key={item.id} onClick={() => { onNavigate?.(); navigate(`/crm/pipeline?prospectId=${encodeURIComponent(item.prospect_id)}`); }} className="block w-full rounded-lg bg-white dark:bg-surface-card-dark border border-cyan-100 dark:border-cyan-900 px-3 py-2 text-left hover:border-dts-secondary"><span className="block text-xs font-bold text-dts-primary dark:text-white">{item.company_name}{item.contact_name ? ` · ${item.contact_name}` : ''}</span><span className="block text-[11px] text-gray-600 dark:text-gray-400">{executive ? `Para ${recipient} · ` : ''}Asignado por {author}</span></button>; })}</div>
  </section>;
}
