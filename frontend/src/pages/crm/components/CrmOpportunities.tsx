import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProspectAccess } from '../../../api/prospects';
import { useAuthStore } from '../../../store/authStore';
import { CrmPipeline } from './CrmPipeline';
import { CrmProspects } from './CrmProspects';
import { getCutAccess } from '../../../api/pipelineCuts';
import { PipelineCuts } from './PipelineCuts';
export function CrmOpportunities() {
  const profile = useAuthStore(state => state.profile);
  const [tab, setTab] = useState<'prospects' | 'offers' | 'cuts'>('offers');
  const { data: access } = useQuery({ queryKey: ['prospect-access', profile?.id], queryFn: getProspectAccess, enabled: !!profile?.id, retry: false });
  const { data: cutAccess } = useQuery({queryKey:['cut-access',profile?.id],queryFn:getCutAccess,enabled:!!profile?.id,retry:false});
  if (!access?.enabled && !cutAccess?.enabled) return <CrmPipeline />;
  return <div className="space-y-6">
    <div className="flex gap-2 border-b border-gray-200 dark:border-white/10 pb-3" role="tablist" aria-label="Oportunidades">
      {([['prospects', 'Prospección'], ['offers', 'Ofertas'], ['cuts','Cortes']] as const).filter(([key])=>key==='offers'||key==='prospects'&&access?.enabled||key==='cuts'&&cutAccess?.enabled).map(([key, label]) => <button key={key} id={`opportunities-${key}`} role="tab" aria-controls="opportunities-content" aria-selected={tab === key} onClick={() => setTab(key)} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${tab === key ? 'bg-dts-primary text-white border-dts-primary' : 'bg-white dark:bg-surface-card-dark text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-dts-secondary'}`}>{label}</button>)}
    </div>
    <div id="opportunities-content" role="tabpanel" aria-labelledby={`opportunities-${tab}`}>
      {tab === 'cuts' && cutAccess?.enabled ? <PipelineCuts access={cutAccess}/> : tab === 'prospects' && access?.enabled ? <CrmProspects access={access} /> : <CrmPipeline pilotMode={access?.enabled===true} canEditPilot={!!access && (access.canCreate || access.canEditAll)} />}
    </div>
  </div>;
}
