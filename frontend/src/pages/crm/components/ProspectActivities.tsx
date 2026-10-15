import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Calendar, Check, Edit2, FileText, MapPin, Phone, Plus, Video, X, CheckSquare, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { getClientProspectActivities, getProspectAccess, getProspectActivities, saveProspectActivity, syncProspectActivity } from '../../../api/prospects';
import type { Prospect, ProspectAccess, ProspectActivity, ProspectActivityFields, ProspectActivityType } from '../../../api/prospects';

const types = [
  { type: 'TASK', label: 'Tarea', icon: CheckSquare },
  { type: 'NOTE', label: 'Nota Interna', icon: FileText },
  { type: 'VISITA', label: 'Visita a Cliente', icon: MapPin },
  { type: 'VIDEOLLAMADA', label: 'Videollamada Teams / Online', icon: Video },
  { type: 'CALL', label: 'Llamada Telefónica', icon: Phone },
  { type: 'EVENT', label: 'Visita no programada', icon: Calendar },
] as const;
const input = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50';
const label = 'block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1';
const empty: ProspectActivityFields = { type: 'TASK', title: '', description: null, due_date: null, time_scheduled: '10:00', location: null, conclusions: null, is_completed: false };
const fieldsOf = (activity: ProspectActivity): ProspectActivityFields => ({ type: activity.type, title: activity.title, description: activity.description, due_date: activity.due_date?.slice(0, 10) || null, time_scheduled: activity.time_scheduled, location: activity.location, conclusions: activity.conclusions, is_completed: activity.is_completed });
const messageOf = (error: unknown) => isAxiosError(error) ? (Array.isArray(error.response?.data?.message) ? error.response.data.message.join('. ') : error.response?.data?.message || 'No se pudo guardar la actividad.') : 'No se pudo completar la operación.';

function ActivityCards({ items, edit, sync }: { items: ProspectActivity[]; edit?: (activity: ProspectActivity, complete?: boolean) => void; sync?: (activity: ProspectActivity) => void }) {
  return <div className="space-y-3">{items.map(activity => {
    const config = types.find(t => t.type === activity.type);
    const Icon = config?.icon || Calendar;
    const state = activity.exchange_sync_status === 'SYNCED' && activity.exchange_synced_version !== activity.version ? 'PENDING' : activity.exchange_sync_status || 'LOCAL';
    const states: Record<string, string> = { LOCAL: 'Modo local', SYNCED: 'Outlook sincronizado', PENDING: 'Outlook pendiente', CREATING: 'Sincronizando', NO_CONNECTION: 'Conecta tu Outlook', NEEDS_EMAIL: 'Falta email para la convocatoria', FAILED: 'Error de sincronización', UNCERTAIN: 'Creación por revisar', DELETED: 'Retirado en Outlook' };
    return <article key={activity.id} className={`p-3 rounded-xl border shadow-xs ${activity.is_completed ? 'bg-emerald-500/8 dark:bg-emerald-950/20 border-emerald-500/25 dark:border-emerald-500/30' : 'bg-white dark:bg-zinc-900/40 border-gray-200/60 dark:border-white/5'}`}>
      <div className="flex justify-between items-start gap-2 border-b border-gray-100 dark:border-white/5 pb-2 mb-2"><div className="flex gap-2 items-start"><Icon size={14} className="text-dts-secondary mt-0.5 shrink-0" /><div><h5 className="text-xs font-bold text-gray-800 dark:text-gray-200">{activity.title}</h5><p className="text-[10px] text-gray-400 mt-1">{config?.label} · {activity.is_completed ? 'Realizado' : 'Pendiente'}</p></div></div>{edit && <div className="flex gap-2 shrink-0"><button aria-label={`Editar ${activity.title}`} onClick={() => edit(activity)} className="text-gray-400 hover:text-dts-secondary"><Edit2 size={14} /></button>{activity.type !== 'NOTE' && <button aria-label={`${activity.is_completed ? 'Reabrir' : 'Completar'} ${activity.title}`} onClick={() => edit(activity, true)} className="text-gray-400 hover:text-dts-secondary"><Check size={14} /></button>}</div>}</div>
      <p className="text-[10px] text-gray-500 dark:text-gray-400">{activity.due_date ? new Date(activity.due_date.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-ES') : new Date(activity.created_at).toLocaleDateString('es-ES')}{activity.time_scheduled ? ` · ${activity.time_scheduled}` : ''}</p>
      {activity.type !== 'NOTE' && <p className="text-[10px] text-dts-secondary mt-1">{states[state] || state}{sync && !['UNCERTAIN', 'CREATING', 'DELETED'].includes(state) && <button aria-label={`Sincronizar ${activity.title}`} onClick={() => sync(activity)} className="ml-2 inline-flex items-center gap-1 hover:underline"><RefreshCw size={11} />Sincronizar</button>}</p>}
      {activity.location && <p className="text-xs text-gray-500 mt-2">{activity.location}</p>}
      {activity.description && <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap mt-2">{activity.description}</p>}
      {activity.conclusions && <p className="text-xs text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap mt-2">Conclusiones: {activity.conclusions}</p>}
      {activity.prospect && <p className="text-[10px] text-dts-secondary mt-2">Origen: prospecto {activity.prospect.company_name}</p>}
    </article>;
  })}{!items.length && <p className="text-xs text-gray-500">Sin actividades para estos filtros.</p>}</div>;
}

export function ClientProspectActivities({ clientId, enabled = true }: { clientId: string; enabled?: boolean }) {
  const { profile } = useAuthStore();
  const access = useQuery({ queryKey: ['prospect-access', profile?.id], queryFn: getProspectAccess, enabled: enabled && !!profile?.id, retry: false });
  const activities = useQuery({ queryKey: ['client-prospect-activities', profile?.id, clientId], queryFn: () => getClientProspectActivities(clientId), enabled: enabled && !!clientId && access.data?.enabled === true, placeholderData: keepPreviousData });
  if (!access.data?.enabled) return null;
  return <section className="space-y-3"><h4 className="text-xs font-bold uppercase text-dts-primary dark:text-dts-secondary">Seguimiento de prospección</h4><p className="text-xs text-gray-500">Actividades conservadas en el prospecto vinculado.</p>{activities.isError ? <p role="alert" className="text-xs text-rose-500">{messageOf(activities.error)}</p> : activities.isFetching ? <p className="text-xs text-gray-500">Actualizando seguimiento…</p> : <ActivityCards items={activities.data || []} />}</section>;
}

export function ProspectActivities({ prospect, access }: { prospect: Prospect; access: ProspectAccess }) {
  const client = useQueryClient();
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ProspectActivity | null>(null);
  const [form, setForm] = useState<ProspectActivityFields>({ ...empty });
  const [error, setError] = useState('');
  const canEdit = !prospect.archived_at && (access.canEditAll || access.canCreate && prospect.owner_id === access.userId);
  const activities = useQuery({ queryKey: ['prospect-activities', access.userId, prospect.id], queryFn: () => getProspectActivities(prospect.id), placeholderData: keepPreviousData });
  const synchronize = useMutation({ mutationFn: (activity: ProspectActivity) => syncProspectActivity(prospect.id, activity.id), onSuccess: () => { client.invalidateQueries({ queryKey: ['prospect-activities'] }); client.invalidateQueries({ queryKey: ['client-prospect-activities'] }); setError(''); }, onError: err => setError(messageOf(err)) });
  const mutation = useMutation({ mutationFn: () => saveProspectActivity(prospect.id, { ...form, ...(form.type === 'NOTE' ? { due_date: null, time_scheduled: null } : {}) }, selected), onSuccess: () => { client.invalidateQueries({ queryKey: ['prospect-activities'] }); client.invalidateQueries({ queryKey: ['crm-prospect'] }); client.invalidateQueries({ queryKey: ['client-prospect-activities'] }); client.invalidateQueries({ queryKey: ['crmWeeklyAgenda'] }); client.invalidateQueries({ queryKey: ['crm-activities-report'] }); client.invalidateQueries({ queryKey: ['crmDailyBriefing'] }); setOpen(false); setError(''); }, onError: err => setError(messageOf(err)) });
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopImmediatePropagation(); if (!mutation.isPending) setOpen(false); } };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [open, mutation.isPending]);
  const edit = (activity: ProspectActivity | null, complete = false) => { setSelected(activity); setForm(activity ? { ...fieldsOf(activity), ...(complete ? { is_completed: !activity.is_completed, conclusions: activity.is_completed ? null : activity.conclusions } : {}) } : { ...empty }); setError(''); setOpen(true); };
  const items = (activities.data || []).filter(activity => (type === 'all' || activity.type === type) && (status === 'all' || activity.is_completed === (status === 'done')));
  return <section className="mt-6 space-y-3 border-t border-gray-100 dark:border-white/5 pt-4">
    <div className="flex justify-between gap-3 items-center"><h4 className="text-xs font-bold uppercase text-dts-primary dark:text-dts-secondary">Eventos y actividades</h4>{canEdit && <button onClick={() => edit(null)} className="flex items-center gap-1 text-xs font-bold text-dts-secondary"><Plus size={14} />Nueva Actividad</button>}</div>
    <div className="flex gap-2"><select aria-label="Filtrar tipo de actividad" value={type} onChange={e => setType(e.target.value)} className={`${input} text-xs`}><option value="all">Todos los tipos</option>{types.map(item => <option key={item.type} value={item.type}>{item.label}</option>)}</select><select aria-label="Filtrar estado de actividad" value={status} onChange={e => setStatus(e.target.value)} className={`${input} text-xs`}><option value="all">Todos</option><option value="pending">Pendientes</option><option value="done">Realizados</option></select></div>
    {synchronize.isError && <p role="alert" className="text-xs text-rose-500">{error}</p>}
    {activities.isError ? <p role="alert" className="text-xs text-rose-500">{messageOf(activities.error)}</p> : <ActivityCards items={items} edit={canEdit ? edit : undefined} sync={canEdit && access.canSyncOutlook && !synchronize.isPending ? activity => synchronize.mutate(activity) : undefined} />}
    {open && createPortal(<div role="dialog" aria-modal="true" aria-labelledby="prospect-activity-title" className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-110 p-4">
      <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 max-w-md w-full max-h-[92vh] overflow-y-auto shadow-xl space-y-4">
        <div className="flex justify-between items-center"><h3 id="prospect-activity-title" className="text-sm font-black uppercase tracking-wider text-dts-primary dark:text-white">{selected ? 'Editar Actividad / Evento' : 'Nueva Actividad'}</h3><button aria-label="Cerrar actividad" disabled={mutation.isPending} onClick={() => setOpen(false)} className="text-gray-400 hover:text-dts-secondary"><X size={16} /></button></div>
        <form onSubmit={e => { e.preventDefault(); if (canEdit && !mutation.isPending) mutation.mutate(); }} className="space-y-4 text-xs">
          {error && <p role="alert" className="text-rose-500">{error}</p>}
          <fieldset disabled={mutation.isPending} className="space-y-4">
            <div><label htmlFor="prospect-activity-type" className={label}>Tipo de Actividad</label><select id="prospect-activity-type" disabled={!!selected} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ProspectActivityType })} className={`${input} font-bold`}>{types.map(item => <option key={item.type} value={item.type}>{item.label}</option>)}<option value="REUNION" disabled>Reunión Interna · próximamente</option></select></div>
            <div><label htmlFor="prospect-activity-concept" className={label}>Título / Concepto *</label><input id="prospect-activity-concept" autoFocus required maxLength={255} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ej. Seguimiento comercial…" className={input} /></div>
            {form.type !== 'NOTE' && <div className="grid grid-cols-2 gap-3"><div><label htmlFor="prospect-activity-date" className={label}>Fecha *</label><input id="prospect-activity-date" type="date" required value={form.due_date || ''} onChange={e => setForm({ ...form, due_date: e.target.value })} className={input} /></div><div><label htmlFor="prospect-activity-time" className={label}>Hora</label><input id="prospect-activity-time" type="time" value={form.time_scheduled || ''} onChange={e => setForm({ ...form, time_scheduled: e.target.value })} className={input} /></div></div>}
            {(form.type === 'VISITA' || form.type === 'EVENT') && <div><label htmlFor="prospect-activity-location" className={label}>Ubicación / Lugar</label><input id="prospect-activity-location" maxLength={500} value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} className={input} /></div>}
            <div><label htmlFor="prospect-activity-description" className={label}>Detalles / Descripción</label><textarea id="prospect-activity-description" rows={3} maxLength={10000} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className={`${input} resize-none`} /></div>
            <div><label htmlFor="prospect-activity-conclusions" className={label}>Conclusiones / Resultado (Opcional)</label><textarea id="prospect-activity-conclusions" rows={2} maxLength={10000} value={form.conclusions || ''} onChange={e => setForm({ ...form, conclusions: e.target.value })} className={`${input} resize-none`} /></div>
            {form.type !== 'NOTE' && <label className="flex gap-2 items-center text-gray-600 dark:text-gray-300"><input type="checkbox" checked={form.is_completed} onChange={e => setForm({ ...form, is_completed: e.target.checked })} />Actividad realizada</label>}
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{access.canSyncOutlook && form.type !== 'NOTE' ? form.type === 'VIDEOLLAMADA' ? 'Se sincronizará en el Outlook del propietario y enviará convocatoria al email del prospecto. Sin email válido, quedará guardada pendiente de convocatoria.' : 'Se sincronizará en el calendario del propietario sin enviar correo al contacto.' : 'Se guarda únicamente en el CRM.'}</p>
            <div className="flex gap-3 justify-end pt-2"><button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 font-bold">Cancelar</button><button type="submit" className="px-4 py-2 bg-dts-secondary hover:brightness-110 text-white font-bold rounded-xl shadow-md">{mutation.isPending ? 'Guardando…' : 'Guardar actividad'}</button></div>
          </fieldset>
        </form>
      </div>
    </div>, document.body)}
  </section>;
}
