import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProspectAccess } from '../../../api/prospects';
import { useAuthStore } from '../../../store/authStore';
import { CrmContacts } from './CrmContacts';
import { CrmProspects } from './CrmProspects';
import { Contact, Users } from 'lucide-react';
import { appTabClass, appTabIconClass, appTabListClass } from '../../../components/shared/appTabs';

export function CrmContactsView(props: { onSelectContact?: (id: string) => void; onOpenReportModal?: () => void }) {
  const profile = useAuthStore(state => state.profile);
  const [tab, setTab] = useState<'bc' | 'prospects'>('bc');
  const { data: access } = useQuery({ queryKey: ['prospect-access', profile?.id], queryFn: getProspectAccess, enabled: !!profile?.id, retry: false });
  if (!access?.enabled) return <CrmContacts {...props} />;
  return <div className="space-y-3.5">
    <div className={appTabListClass} role="tablist" aria-label="Contactos">
      {([['bc', 'Contactos BC', Contact], ['prospects', 'Contactos Prospectos', Users]] as const).map(([key, label, Icon]) => <button type="button" key={key} id={`contact-view-${key}`} role="tab" aria-controls="contact-view-content" aria-selected={tab === key} onClick={() => setTab(key)} className={appTabClass(tab === key)}><Icon size={16} className={appTabIconClass(tab === key)} /><span>{label}</span></button>)}
    </div>
    <div id="contact-view-content" role="tabpanel" aria-labelledby={`contact-view-${tab}`}>
      {tab === 'prospects' ? <CrmProspects access={access} initialView="table" /> : <CrmContacts {...props} />}
    </div>
  </div>;
}
