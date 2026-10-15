import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProspectAccess } from '../../../api/prospects';
import { useAuthStore } from '../../../store/authStore';
import { CrmContacts } from './CrmContacts';
import { CrmProspects } from './CrmProspects';

export function CrmContactsView(props: { onSelectContact?: (id: string) => void; onOpenReportModal?: () => void }) {
  const profile = useAuthStore(state => state.profile);
  const [tab, setTab] = useState<'bc' | 'prospects'>('bc');
  const { data: access } = useQuery({ queryKey: ['prospect-access', profile?.id], queryFn: getProspectAccess, enabled: !!profile?.id, retry: false });
  if (!access?.enabled) return <CrmContacts {...props} />;
  return <div className="space-y-6">
    <div className="flex gap-2 border-b border-gray-200 dark:border-white/10 pb-3" role="tablist" aria-label="Contactos">
      {([['bc', 'Contactos BC'], ['prospects', 'Prospectos']] as const).map(([key, label]) => <button key={key} id={`contact-view-${key}`} role="tab" aria-controls="contact-view-content" aria-selected={tab === key} onClick={() => setTab(key)} className={`px-4 py-2 text-xs font-bold rounded-lg border ${tab === key ? 'bg-dts-primary text-white border-dts-primary' : 'bg-white dark:bg-surface-card-dark text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10'}`}>{label}</button>)}
    </div>
    <div id="contact-view-content" role="tabpanel" aria-labelledby={`contact-view-${tab}`}>
      {tab === 'prospects' ? <CrmProspects access={access} initialView="table" /> : <CrmContacts {...props} />}
    </div>
  </div>;
}
