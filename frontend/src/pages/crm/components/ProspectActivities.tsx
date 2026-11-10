import { ExpandConclusionsButton } from './ExpandConclusionsButton';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Calendar, Check, Clock, Edit2, FileText, MapPin, Phone, Plus, Video, X, CheckSquare, RefreshCw } from 'lucide-react';
import { EVENT_FILTER_CHIPS } from './eventFilterChips';
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

function ProspectEventCards({ items, contactName, edit, sync }: { items: ProspectActivity[]; contactName: string | null; edit?: (activity: ProspectActivity, complete?: boolean) => void; sync?: (activity: ProspectActivity) => void }) {
  const badge: Record<string, { label: string; color: string }> = {
    TASK: { label: 'Tarea', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' }, NOTE: { label: 'Nota', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    VISITA: { label: 'Visita a Cliente', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' }, EVENT: { label: 'Visita no programada', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
    VIDEOLLAMADA: { label: 'Videollamada', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' }, CALL: { label: 'Llamada', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
  };
  const states: Record<string, string> = { LOCAL: 'Modo local', SYNCED: 'Outlook', PENDING: 'Outlook pendiente', CREATING: 'Sincronizando', NO_CONNECTION: 'Conecta tu Outlook', NEEDS_EMAIL: 'Falta email para la convocatoria', FAILED: 'Error de sincronización', UNCERTAIN: 'Creación por revisar', DELETED: 'Retirado en Outlook' };
  return <div className="space-y-2">{items.map(activity => {
    const done = Boolean(activity.is_completed || activity.conclusions?.trim());
    const day = activity.due_date?.slice(0, 10);
    const when = day ? new Date(`${day}T${activity.time_scheduled || '23:59'}:00`) : null;
    const needsConclusions = activity.type !== 'NOTE' && !activity.conclusions?.trim() && (activity.is_completed || !!when && when.getTime() < Date.now());
    const state = activity.exchange_sync_status === 'SYNCED' && activity.exchange_synced_version !== activity.version ? 'PENDING' : activity.exchange_sync_status || 'LOCAL';
    const type = badge[activity.type] || { label: activity.type, color: 'bg-gray-100 text-gray-600' };
    return <div key={activity.id} className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-200 ${needsConclusions ? 'bg-amber-500/10 dark:bg-amber-500/15 border-2 border-amber-400 dark:border-amber-500/60 hover:border-amber-500 shadow-xs ring-1 ring-amber-400/20' : done ? 'bg-emerald-500/8 dark:bg-emerald-950/20 border-emerald-500/25 dark:border-emerald-500/30 hover:border-emerald-500/40 shadow-2xs' : 'bg-white dark:bg-zinc-900/40 border-gray-200/70 dark:border-white/5 hover:border-dts-secondary/35 shadow-2xs'}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5 pb-1.5 border-b border-gray-200 dark:border-zinc-700/70">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {activity.type !== 'NOTE' ? <input type="checkbox" aria-label={`${done ? 'Marcar pendiente' : 'Marcar realizado'}: ${activity.title}`} checked={done} disabled={!edit} onChange={() => edit?.(activity, true)} className="w-4 h-4 text-emerald-600 rounded border-gray-300 dark:border-gray-600 focus:ring-emerald-500 focus:ring-1 cursor-pointer transition-all shrink-0" /> : <span className="w-4 h-4 shrink-0 flex items-center justify-center text-gray-300 dark:text-gray-600 font-bold">•</span>}
          <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider shrink-0 ${type.color}`}>{type.label}</span>
          <h4 className={`text-[13.5px] font-semibold leading-none truncate max-w-sm sm:max-w-md ${done ? 'text-gray-400 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`} title={activity.title}>{activity.title}</h4>
          {contactName && <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate max-w-[160px] shrink-0" title={contactName}>{contactName}</span>}
          {needsConclusions ? <button type="button" disabled={!edit} onClick={() => edit?.(activity)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-normal bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-400/60 dark:border-amber-500/50"><Clock size={10} />{done ? 'TERMINADO · FALTAN CONCLUSIONES' : 'VENCIDO · FALTAN CONCLUSIONES'}</button> : done ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-normal bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"><Check size={10} />Realizado</span> : null}
          {activity.type !== 'NOTE' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400">{states[state] || state}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto">{activity.location && <span className="text-[11px] text-gray-500 flex items-center gap-1" title={activity.location}><MapPin size={11} /><span className="max-w-32 truncate">{activity.location}</span></span>}<span className="text-[11px] text-gray-400 font-mono font-medium flex items-center gap-1"><Calendar size={11} />{new Date((day || activity.created_at.slice(0, 10)) + 'T12:00:00').toLocaleDateString('es-ES')} {activity.time_scheduled || ''}</span>{edit && <div className="flex items-center gap-0.5 border-l border-gray-200 dark:border-white/10 pl-1.5 ml-0.5"><button type="button" aria-label={`Editar ${activity.title}`} title="Editar actividad" onClick={() => edit(activity)} className="p-1 text-gray-400 hover:text-dts-secondary hover:bg-gray-100 dark:hover:bg-white/5 rounded-md"><Edit2 size={12} /></button>{sync && activity.type !== 'NOTE' && !['UNCERTAIN', 'CREATING', 'DELETED'].includes(state) && <button type="button" aria-label={`Sincronizar ${activity.title}`} title="Sincronizar actividad con Outlook" onClick={() => sync(activity)} className="p-1 text-gray-400 hover:text-dts-secondary hover:bg-gray-100 dark:hover:bg-white/5 rounded-md"><RefreshCw size={12} /></button>}</div>}</div>
      </div>
      {(activity.description || activity.conclusions || needsConclusions) && <div className="pt-2 pl-5 space-y-1 text-xs">{activity.description && <p className="text-[12.5px] text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-snug">{activity.description}</p>}{activity.conclusions && <div className="text-[11.5px] border-l-2 border-emerald-500 pl-2.5 py-0.5 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200 font-medium rounded-r"><strong className="text-emerald-700 dark:text-emerald-400 uppercase tracking-wide text-[9.5px] block">Conclusiones:</strong><span className="whitespace-pre-wrap leading-snug">{activity.conclusions}</span></div>}{needsConclusions && edit && <button type="button" onClick={() => edit(activity)} className="inline-flex items-center gap-1 text-[11.5px] font-medium text-amber-600 dark:text-amber-400 hover:underline"><Plus size={12} />Registrar conclusiones</button>}</div>}
    </div>;
  })}</div>;
}

export function ProspectTimeline({ prospect, access }: { prospect: Prospect; access: ProspectAccess }) {
  const activities = useQuery({ queryKey: ['prospect-activities', access.userId, prospect.id], queryFn: () => getProspectActivities(prospect.id), retry: false });
  const items = [...(activities.data || [])].sort((a, b) => new Date(b.due_date || b.created_at).getTime() - new Date(a.due_date || a.created_at).getTime());
  if (activities.isLoading) return <p className="text-xs text-gray-500">Cargando Timeline…</p>;
  if (activities.isError) return <p role="alert" className="text-xs text-rose-500">{messageOf(activities.error)}</p>;
  return <ActivityCards items={items} />;
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
  const allItems = activities.data || [];
  const done = (activity: ProspectActivity) => Boolean(activity.is_completed || activity.conclusions?.trim());
  const typeFor = (activity: ProspectActivity) => activity.type === 'VIDEOLLAMADA' ? 'VIDEO' : activity.type;
  const items = allItems.filter(activity => (type === 'all' || typeFor(activity) === type) && (status === 'all' || done(activity) === (status === 'done'))).slice().sort((a, b) => new Date(b.due_date || b.created_at).getTime() - new Date(a.due_date || a.created_at).getTime());
  const completedCount = allItems.filter(done).length;
  return <section className="space-y-4">
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pb-3 border-b border-gray-100 dark:border-white/5">
      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0"><div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] no-scrollbar shrink-0"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 shrink-0 mr-0.5">Tipología:</span><button type="button" onClick={() => setType('all')} className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all shrink-0 cursor-pointer border ${type === 'all' ? 'bg-dts-primary text-white border-dts-primary shadow-xs' : 'bg-white dark:bg-zinc-800/40 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}>Todos ({allItems.length})</button>{EVENT_FILTER_CHIPS.map(chip => { const Icon = chip.icon; const selected = type === chip.id; const count = allItems.filter(activity => typeFor(activity) === chip.id).length; return <button type="button" key={chip.id} onClick={() => setType(chip.id)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs transition-all shrink-0 cursor-pointer border ${selected ? `${chip.pillActiveBg} border-transparent shadow-xs ring-1 ring-black/10` : 'bg-white dark:bg-zinc-800/40 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}><Icon size={12} className={selected ? 'text-white' : chip.color} /><span>{chip.label}</span><span className={`text-[10px] ml-0.5 px-1 py-0.2 rounded-full font-mono ${selected ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>{count}</span></button>; })}</div><div className="h-5 w-px bg-gray-200 dark:bg-white/10 shrink-0 hidden md:block" /><div className="inline-flex items-center gap-1 bg-gray-100/90 dark:bg-zinc-800/60 p-0.5 rounded-lg border border-gray-200/70 dark:border-white/5 text-[11px] shrink-0">{([{ key: 'all', label: 'Todos', count: allItems.length }, { key: 'pending', label: 'Pendientes', count: allItems.length - completedCount, icon: Clock }, { key: 'done', label: 'Realizados', count: completedCount, icon: Check }] as const).map(option => <button type="button" key={option.key} onClick={() => setStatus(option.key)} className={`px-2 py-0.5 rounded-md font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${status === option.key ? option.key === 'pending' ? 'bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-300 shadow-2xs' : option.key === 'done' ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 shadow-2xs' : 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-2xs' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>{'icon' in option && <option.icon size={11} />}<span>{option.label} ({option.count})</span></button>)}</div></div>
      {canEdit && <button type="button" onClick={() => edit(null)} className="px-3 py-1.5 bg-dts-secondary hover:brightness-110 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer shrink-0"><Plus size={14} /> Nueva Actividad</button>}
    </div>
    {synchronize.isError && <p role="alert" className="text-xs text-rose-500">{error}</p>}
    {activities.isLoading ? <div className="text-center py-10 text-xs text-gray-400 uppercase font-medium">Cargando actividades...</div> : activities.isError ? <p role="alert" className="text-xs text-rose-500">{messageOf(activities.error)}</p> : !items.length ? <div className="text-center py-12 text-gray-400 italic text-xs">No se encontraron actividades con los filtros seleccionados.</div> : <ProspectEventCards items={items} contactName={prospect.contact_name} edit={canEdit ? edit : undefined} sync={canEdit && access.canSyncOutlook && !synchronize.isPending ? activity => synchronize.mutate(activity) : undefined} />}
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
            <div><label htmlFor="prospect-activity-conclusions" className={label}>Conclusiones / Resultado (Opcional)</label><textarea id="prospect-activity-conclusions" rows={2} maxLength={10000} value={form.conclusions || ''} onChange={e => setForm({ ...form, conclusions: e.target.value })} className={`${input} resize-none`} />
<ExpandConclusionsButton value={form.conclusions || ''} onApply={value => setForm({ ...form, conclusions: value })} maxLength={10000} /></div>
            {form.type !== 'NOTE' && <label className="flex gap-2 items-center text-gray-600 dark:text-gray-300"><input type="checkbox" checked={form.is_completed} onChange={e => setForm({ ...form, is_completed: e.target.checked })} />Actividad realizada</label>}
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{access.canSyncOutlook && form.type !== 'NOTE' ? form.type === 'VIDEOLLAMADA' ? 'Se sincronizará en el Outlook del propietario y enviará convocatoria al email del prospecto. Sin email válido, quedará guardada pendiente de convocatoria.' : 'Se sincronizará en el calendario del propietario sin enviar correo al contacto.' : 'Se guarda únicamente en el CRM.'}</p>
            <div className="flex gap-3 justify-end pt-2"><button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 font-bold">Cancelar</button><button type="submit" className="px-4 py-2 bg-dts-secondary hover:brightness-110 text-white font-bold rounded-xl shadow-md">{mutation.isPending ? 'Guardando…' : 'Guardar actividad'}</button></div>
          </fieldset>
        </form>
      </div>
    </div>, document.body)}
  </section>;
}
