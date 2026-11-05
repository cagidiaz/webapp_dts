import { useEffect, useState, type ReactNode } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Archive, LayoutGrid, Plus, RotateCcw, Search, Table, Users, User, Mail, Phone, ArrowLeft, Activity, Calendar } from 'lucide-react';
import { Drawer } from '../../../components/shared/Drawer';
import { archiveProspect, createProspect, getProspect, getProspects, updateProspect, getProspectClients, linkProspect, getProspectSalespeople } from '../../../api/prospects';
import type { Prospect, ProspectAccess, ProspectFields } from '../../../api/prospects';
import { ClientProspectActivities, ProspectActivities, ProspectTimeline } from './ProspectActivities';

const emptyFields: ProspectFields = { company_name: '', contact_name: null, contact_job_title: null, email: null, phone: null, notes: null, phase: 0, owner_id: null };
const inputClass = 'w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2 focus:ring-1 focus:ring-dts-secondary';
const labelClass = 'block text-xs font-bold text-gray-400 uppercase mb-1';
function ProspectShell({ full, open, close, title, prospect, children }: { full: boolean; open: boolean; close: () => void; title: string; prospect: Prospect | null; children: ReactNode }) {
  if (!full) return <Drawer isOpen={open} onClose={close} title={title}>{children}</Drawer>;
  if (!open) return null;
  return <div className="space-y-6"><div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4"><button type="button" onClick={close} className="text-xs font-bold text-gray-400 hover:text-dts-secondary flex items-center gap-1.5"><ArrowLeft size={14}/>Volver al Directorio de Contactos</button><div className="flex items-center gap-3 pt-2"><div className="w-12 h-12 rounded-xl bg-dts-secondary/10 dark:bg-white/5 text-dts-secondary flex items-center justify-center font-bold text-lg">{title.slice(0,2).toUpperCase()}</div><div><h2 className="text-lg font-black text-dts-primary dark:text-white flex items-center gap-2">{title}{prospect?.contact_job_title && <span className="text-[9px] font-semibold text-dts-secondary bg-dts-secondary/10 px-2 py-0.5 rounded uppercase">{prospect.contact_job_title}</span>}</h2><p className="mt-1.5 text-xs text-gray-500 font-semibold">🏢 {prospect?.company_name}</p></div></div></div><div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col min-h-112.5">{children}</div></div>;
}
function errorText(error: unknown) {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string') return message;
  }
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}
const dateText = (value: string) => new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(value));

export function CrmProspects({ access, initialView = 'kanban' }: { access: ProspectAccess; initialView?: 'kanban' | 'table' }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState(initialView);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [ownerFilter, setOwnerFilter] = useState('');
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'timeline' | 'events'>('info');
  const [editingInfo, setEditingInfo] = useState(false);
  const [contactEditorOpen, setContactEditorOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<ProspectFields>({ ...emptyFields });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [clientId, setClientId] = useState('');
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [showClientActivities, setShowClientActivities] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setClientQuery(clientSearch), 350); return () => clearTimeout(timer); }, [clientSearch]);
  useEffect(() => { const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350); return () => clearTimeout(timer); }, [search]);
  const list = useQuery({ queryKey: ['crm-prospects', access.userId, status, debouncedSearch, page, ownerFilter], queryFn: () => getProspects(status, debouncedSearch, page, ownerFilter || undefined), placeholderData: keepPreviousData });
  const salespeople = useQuery({ queryKey: ['crm-prospect-salespeople'], queryFn: getProspectSalespeople, enabled: access.canEditAll });
  const detail = useQuery({ queryKey: ['crm-prospect', access.userId, selected?.id], queryFn: () => getProspect(selected!.id), enabled: isOpen && !!selected });
  const canEdit = access.canEditAll || access.canCreate && (!selected || selected.owner_id === access.userId);
  const currentVersion = selected?.version;
  const isOwner = !!selected && (access.canEditAll || access.canCreate && selected.owner_id === access.userId);
  const clients = useQuery({ queryKey: ['prospect-clients', access.userId, selected?.id, clientQuery], queryFn: () => getProspectClients(selected!.id, clientQuery), enabled: isOpen && !!selected && isOwner && !selected.archived_at && !selected.converted_at, placeholderData: keepPreviousData });
  const chosenClient = clients.data?.find(client => client.id === clientId);
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['crm-prospects'] });
    queryClient.invalidateQueries({ queryKey: ['crm-prospect'] });
    queryClient.invalidateQueries({ queryKey: ['client-prospect-activities'] });
  };
  const save = useMutation({
    mutationFn: () => selected ? updateProspect(selected.id, { ...form, version: currentVersion! }) : createProspect(form),
    onSuccess: prospect => {
      refresh();
      setSelected(prospect);
      setForm({
        company_name: prospect.company_name,
        contact_name: prospect.contact_name,
        contact_job_title: prospect.contact_job_title || null,
        email: prospect.email,
        phone: prospect.phone,
        notes: prospect.notes || null,
        phase: prospect.phase,
        owner_id: prospect.owner_id,
      });
      setError('');
      setContactEditorOpen(false);
      setMessage('Prospecto guardado.');
    },
    onError: err => setError(errorText(err)),
  });
  const move = useMutation({
    mutationFn: ({ prospect, phase }: { prospect: Prospect; phase: number }) => updateProspect(prospect.id, { company_name: prospect.company_name, contact_name: prospect.contact_name, contact_job_title: prospect.contact_job_title, email: prospect.email, phone: prospect.phone, notes: prospect.notes, phase, version: prospect.version }),
    onSuccess: () => { refresh(); setMessage('Fase actualizada.'); setError(''); },
    onError: err => setError(errorText(err)),
  });
  const archive = useMutation({
    mutationFn: () => archiveProspect(selected!.id, selected!.version, !!selected!.archived_at),
    onSuccess: () => { refresh(); setIsOpen(false); setError(''); setMessage(selected?.archived_at ? 'Prospecto restaurado.' : 'Prospecto archivado.'); },
    onError: err => setError(errorText(err)),
  });
  const link = useMutation({
    mutationFn: (target: string | null) => linkProspect(selected!.id, selected!.version, target),
    onSuccess: prospect => { refresh(); setSelected(prospect); setClientId(''); setConfirmUnlink(false); setError(''); setMessage(prospect.converted_at ? 'Cliente vinculado. Prospecto conservado como convertido.' : 'Vinculación deshecha. Prospecto devuelto a su fase anterior.'); },
    onError: err => setError(errorText(err)),
  });
  const busy = save.isPending || archive.isPending || move.isPending || link.isPending;
  const open = (prospect: Prospect | null) => {
    setDetailTab('info');
    setEditingInfo(!prospect);
    setSelected(prospect);
    setShowClientActivities(false);
    setClientSearch('');
    setClientQuery('');
    setClientId('');
    setConfirmUnlink(false);
    setForm(prospect ? {
      company_name: prospect.company_name,
      contact_name: prospect.contact_name,
      contact_job_title: prospect.contact_job_title || null,
      email: prospect.email,
      phone: prospect.phone,
      notes: prospect.notes || null,
      phase: prospect.phase,
      owner_id: prospect.owner_id,
    } : { ...emptyFields, owner_id: access.canEditAll ? '' : access.userId });
    setError('');
    setIsOpen(true);
  };
  const items = list.data?.items || [];
  const counts = list.data?.counts || { phase0: 0, phase1: 0, converted: 0 };
  return <div className="space-y-6">
    <div hidden={initialView === 'table' && isOpen && !!selected} className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {[['Fase 0', counts.phase0, 'Sin aproximación comercial'], ['Fase 1', counts.phase1, 'Prospectos interesados'], ['Convertidos', counts.converted, 'Vinculados a clientes BC']].map(([title, count, caption]) => <div key={title} className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex justify-between mb-2"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{title}</span><Users size={18} className="text-gray-400" /></div><div className="text-2xl font-black font-mono text-dts-primary dark:text-white">{count}</div><p className="text-[10px] text-gray-400 mt-1">{caption} · {title === 'Convertidos' ? 'histórico' : 'cartera activa'}</p>
      </div>)}
    </div>
    {initialView === 'table' && <div className="bg-white dark:bg-surface-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-320px)] min-h-100">
      <div className="p-4 border-b border-gray-100 dark:border-white/5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shrink-0 bg-gray-50/20 dark:bg-surface-card-dark">
        <div className="flex items-center gap-3 w-full sm:max-w-md"><div className="w-full relative"><span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Search size={16}/></span><input aria-label="Buscar prospectos" placeholder="Buscar por nombre, cargo, empresa, email..." value={search} onChange={e=>setSearch(e.target.value)} className="block w-full pl-10 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dts-secondary/50" /></div>{search && <button onClick={()=>setSearch('')} className="text-xs font-bold text-gray-400 hover:text-dts-secondary shrink-0 cursor-pointer">Limpiar búsqueda</button>}</div>
        {access.canEditAll && <select aria-label="Filtrar por vendedor" value={ownerFilter} onChange={e=>{setOwnerFilter(e.target.value);setPage(1);}} className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white"><option value="">Todos los vendedores</option>{salespeople.data?.map(sp=><option key={sp.id} value={sp.id}>{`${sp.first_name || ''} ${sp.last_name || ''}`.trim() || sp.email}{sp.code ? ` (${sp.code})` : ''}</option>)}</select>}
        {access.canCreate && <button onClick={()=>open(null)} className="px-3.5 py-1.5 text-xs font-bold rounded-xl text-white bg-dts-primary hover:bg-dts-primary/90 dark:bg-dts-secondary dark:text-dts-primary-dark flex items-center gap-2"><Plus size={14}/>Crear prospecto</button>}
      </div>
      <div className="overflow-y-auto flex-1 custom-scrollbar"><table className="w-full text-left text-sm border-separate border-spacing-0"><thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg"><tr>{['Nombre','Cliente / Empresa','Cargo','Nivel Org.','LinkedIn','Email','Teléfono'].map(title=><th key={title} className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">{title}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-white/5">{items.map(prospect=><tr key={prospect.id} onClick={()=>open(prospect)} className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors cursor-pointer"><td className="px-6 py-4 font-bold text-gray-900 dark:text-white"><div className="flex items-center gap-2"><User size={14} className="text-dts-secondary shrink-0"/>{prospect.contact_name || 'Sin contacto'}</div></td><td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-xs">{prospect.company_name}</td><td className="px-6 py-4">{prospect.contact_job_title ? <span className="px-2 py-0.5 rounded bg-dts-secondary/10 text-dts-secondary font-semibold uppercase text-[9px] tracking-wider">{prospect.contact_job_title}</span> : <span className="text-gray-400 italic">No especificado</span>}</td><td className="px-6 py-4 text-gray-400">—</td><td className="px-6 py-4 text-gray-400">—</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{prospect.email ? <span className="flex items-center gap-1"><Mail size={12}/>{prospect.email}</span> : <span className="text-gray-400 italic">No disponible</span>}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{prospect.phone ? <span className="flex items-center gap-1"><Phone size={12}/>{prospect.phone}</span> : <span className="text-gray-400 italic">No disponible</span>}</td></tr>)}</tbody></table>{!items.length && <div className="text-center py-20 text-gray-400 italic text-sm">No se encontraron contactos que coincidan con la búsqueda.</div>}</div>
    </div>}
    <div hidden={initialView === 'table'} className="bg-white dark:bg-surface-card-dark p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-2 text-gray-400" size={16} /><input aria-label="Buscar prospectos" className={`${inputClass} pl-10`} value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empresa, contacto, email…" /></div>
      <div className="flex flex-wrap items-center gap-3">
        {initialView !== 'table' && <select aria-label="Estado del prospecto" value={status} onChange={e => { setStatus(e.target.value); setPage(1); if (e.target.value !== 'active') setView('table'); }} className={`${inputClass} w-auto`}><option value="active">Activos</option><option value="archived">Archivados</option><option value="converted">Convertidos</option><option value="all">Todos</option></select>}
        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-lg"><button aria-label="Vista Kanban" disabled={status !== 'active'} aria-pressed={view === 'kanban'} onClick={() => setView('kanban')} className={`p-2 rounded disabled:opacity-40 ${view === 'kanban' ? 'bg-white dark:bg-dts-primary text-dts-secondary shadow-sm' : 'text-gray-400'}`}><LayoutGrid size={16} /></button><button aria-label="Vista tabla" aria-pressed={view === 'table'} onClick={() => setView('table')} className={`p-2 rounded ${view === 'table' ? 'bg-white dark:bg-dts-primary text-dts-secondary shadow-sm' : 'text-gray-400'}`}><Table size={16} /></button></div>
        {access.canCreate && <button onClick={() => open(null)} className="flex items-center gap-2 bg-dts-secondary hover:bg-dts-secondary-dark text-white px-3 py-2 rounded-lg text-xs font-bold"><Plus size={16} />Crear prospecto</button>}
      </div>
    </div>
    {(error || list.isError) && <p role="alert" className="text-xs text-rose-500">{error || errorText(list.error)}</p>}
    <p role="status" aria-live="polite" className="text-xs text-dts-secondary">{message || (list.isFetching ? 'Actualizando prospectos…' : '')}</p>
    {initialView !== 'table' && (view === 'kanban' && status === 'active' ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[0, 1].map(phase => <section key={phase} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const prospect = items.find(p => p.id === e.dataTransfer.getData('text/plain')); if (prospect && !busy && prospect.phase !== phase && (access.canEditAll || access.canCreate && prospect.owner_id === access.userId)) move.mutate({ prospect, phase }); }} className="bg-gray-50/50 dark:bg-white/1 rounded-xl border border-gray-200/50 dark:border-white/5 overflow-hidden">
        <div className="p-4 border-t-4 border-t-dts-secondary border-b border-gray-200/60 dark:border-white/5 bg-white dark:bg-surface-card-dark flex justify-between items-center"><h3 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200">Fase {phase}</h3><span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300">{items.filter(p => p.phase === phase).length}</span></div>
        <div className="p-3 space-y-3 min-h-48">{items.filter(p => p.phase === phase).map(prospect => <button type="button" key={prospect.id} draggable={!busy && (access.canEditAll || access.canCreate && prospect.owner_id === access.userId)} onDragStart={e => e.dataTransfer.setData('text/plain', prospect.id)} onClick={() => open(prospect)} className="block w-full text-left bg-white dark:bg-surface-card-dark p-4 rounded-xl border border-gray-200/60 dark:border-white/5 shadow-sm hover:shadow-md hover:border-dts-secondary/50 transition-all">
          <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2 break-words">{prospect.company_name}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {prospect.contact_name || 'Sin persona de contacto'}
            {prospect.contact_job_title ? ` · ${prospect.contact_job_title}` : ''}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 break-all">{prospect.email || 'Sin email'}</p>
          {prospect.notes && <p className="text-[11px] text-gray-400 dark:text-gray-500 line-clamp-2 mt-2 italic">“{prospect.notes}”</p>}
          {access.canViewAll && <p className="text-[10px] text-gray-500 mt-2">{prospect.owner ? `${prospect.owner.first_name || ''} ${prospect.owner.last_name || ''}`.trim() || prospect.owner.email : ''}</p>}
          <p className="text-[10px] text-gray-400 mt-3">Actualizado {dateText(prospect.updated_at)}</p>
        </button>)}{!items.some(p => p.phase === phase) && <p className="text-xs text-gray-400 text-center py-10">Sin prospectos</p>}</div>
      </section>)}
    </div> : <div className="max-h-[calc(100vh-320px)] min-h-60 overflow-auto custom-scrollbar rounded-xl border border-gray-200 dark:border-white/5"><table className="w-full text-left text-sm border-separate border-spacing-0 bg-white dark:bg-surface-card-dark"><thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg uppercase text-[10px]"><tr>{['Nombre', 'Cliente / Empresa', 'Cargo', 'Nivel Org.', 'LinkedIn', 'Email', 'Teléfono', 'Fase', 'Estado'].map(title => <th key={title} className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">{title}</th>)}</tr></thead><tbody>{items.map(prospect => <tr key={prospect.id} onClick={() => open(prospect)} className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors cursor-pointer"><td className="px-6 py-4 font-bold text-gray-900 dark:text-white"><button type="button" onClick={e => { e.stopPropagation(); open(prospect); }} className="text-left hover:text-dts-secondary focus-visible:outline-2 focus-visible:outline-dts-secondary">{prospect.contact_name || 'Sin contacto'}</button></td><td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-xs">{prospect.company_name}</td><td className="p-3 text-gray-600 dark:text-gray-300">{prospect.contact_job_title || '—'}</td><td className="px-6 py-4 text-gray-400">—</td><td className="px-6 py-4 text-gray-400">—</td><td className="p-3 text-gray-600 dark:text-gray-300">{prospect.email || '—'}</td><td className="p-3 text-gray-600 dark:text-gray-300">{prospect.phone || '—'}</td><td className="p-3 text-gray-600 dark:text-gray-300">Fase {prospect.phase}</td><td className="p-3 text-gray-600 dark:text-gray-300">{prospect.converted_at ? `Convertido · ${prospect.linked_client?.client_id || ''}` : prospect.archived_at ? 'Archivado' : 'Activo'}</td></tr>)}</tbody></table>{!items.length && <p className="p-6 text-xs text-gray-500 bg-white dark:bg-surface-card-dark">Sin prospectos para estos filtros.</p>}</div>
    )}
    {(list.data?.total || 0) > (list.data?.limit || 200) && <div className="flex gap-4 justify-end items-center text-xs text-gray-500"><button disabled={page === 1 || list.isFetching} onClick={() => setPage(page - 1)} className="disabled:opacity-50">Anterior</button><span>Página {page} de {Math.ceil((list.data?.total || 0) / (list.data?.limit || 200))}</span><button disabled={page * (list.data?.limit || 200) >= (list.data?.total || 0) || list.isFetching} onClick={() => setPage(page + 1)} className="disabled:opacity-50">Siguiente</button></div>}
    </div>
    <ProspectShell full={initialView === 'table' && !!selected} open={isOpen} close={() => { if (!busy) setIsOpen(false); }} title={selected ? (selected.contact_name || selected.company_name) : 'Crear prospecto'} prospect={selected}>
      {selected && <div className="flex border-b border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-800/20 p-1 shrink-0" role="tablist" aria-label="Ficha del prospecto">{([{key:'info',label:'Información',icon:User},{key:'timeline',label:'Timeline',icon:Activity},{key:'events',label:'Eventos',icon:Calendar}] as const).map(({key,label,icon:Icon}) => <button key={key} type="button" role="tab" aria-selected={detailTab === key} onClick={() => setDetailTab(key)} className={`flex-1 py-2 px-2 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${detailTab === key ? 'bg-dts-primary text-white dark:bg-dts-secondary shadow-xs' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}><Icon size={14}/>{label}</button>)}</div>}
      <div className="p-4 sm:p-5 overflow-y-auto flex-1">
      <div hidden={!!selected && detailTab !== 'info'}>
      {selected && !editingInfo && <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full"><div className="space-y-3.5"><div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-1.5"><h3 className="text-xs font-bold text-dts-primary dark:text-white uppercase tracking-wider flex items-center gap-2"><User size={14} className="text-dts-secondary"/>Datos del Contacto</h3>{canEdit && <button type="button" onClick={()=>{setForm({company_name:selected.company_name,contact_name:selected.contact_name,contact_job_title:selected.contact_job_title || null,email:selected.email,phone:selected.phone,notes:selected.notes || null,phase:selected.phase,owner_id:selected.owner_id});setError('');setContactEditorOpen(true);}} className="text-xs font-semibold text-dts-secondary hover:underline">Editar</button>}</div><div className="grid grid-cols-2 gap-4 text-xs">{[['Nombre Completo', selected.contact_name],['Cargo',selected.contact_job_title],['Email',selected.email],['Teléfono / Móvil',selected.phone],['Nivel Organizacional',null],['Relación Comercial',null]].map(([label,value])=><div key={label || ''}><span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">{label}</span><span className="block font-semibold text-gray-900 dark:text-white mt-0.5 break-words">{value || ''}</span></div>)}<div className="col-span-2 pt-3 mt-1 border-t border-gray-100 dark:border-white/5"><span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Ubicación del Contacto / Centro de Trabajo</span></div></div></div><div className="space-y-3.5"><h3 className="text-xs font-bold text-dts-primary dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-1.5">Datos de Empresa</h3><div className="grid grid-cols-2 gap-4 text-xs">{[['Razón Social',selected.company_name],['Código ERP',selected.linked_client?.client_id],['Segmento de Mercado',null],['Modelo de Negocio',null],['Fase',`Fase ${selected.phase}`]].map(([label,value])=><div key={label || ''}><span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">{label}</span><span className="block font-semibold text-gray-900 dark:text-white mt-0.5">{value || ''}</span></div>)}</div><button type="button" onClick={()=>setEditingInfo(true)} className="text-xs text-dts-secondary hover:underline">Ver vinculación e historial</button></div></div>}
      <div hidden={!!selected && !editingInfo} className={selected ? 'grid grid-cols-1 lg:grid-cols-2 gap-8' : 'space-y-4'}>
      <div className="space-y-3.5">
      {selected && <h3 className="text-xs font-bold text-dts-primary dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-1.5">Datos del contacto</h3>}
      <form onSubmit={e => { e.preventDefault(); if (canEdit && !busy) save.mutate(); }} className="space-y-4">
        {!canEdit && <p className="text-xs text-gray-500">Consulta. La edición corresponde al propietario y a Admin.</p>}
        {selected && access.canViewAll && <p className="text-xs text-gray-500">Propietario actual: {detail.data?.owner ? `${detail.data.owner.first_name || ''} ${detail.data.owner.last_name || ''}`.trim() || detail.data.owner.email : selected.owner?.email || 'Cargando…'}</p>}
        {error && <p role="alert" className="text-xs text-rose-500">{error}</p>}
        {selected && <button type="button" onClick={()=>setEditingInfo(false)} className="text-xs text-dts-secondary hover:underline">Volver a información</button>}
        {selected && <button type="button" disabled={busy} onClick={async () => { try { open(await getProspect(selected.id)); } catch (err) { setError(errorText(err)); } }} className="text-xs text-dts-secondary hover:underline">Recargar ficha desde el servidor</button>}
        <fieldset disabled={!canEdit || busy} className="space-y-4">
          {access.canEditAll && <div>
            <label htmlFor="prospect-owner" className={labelClass}>Comercial asignado (Salesperson)</label>
            <select
              id="prospect-owner"
              value={form.owner_id || ''}
              onChange={e => setForm({ ...form, owner_id: e.target.value || null })}
              className={inputClass}
            >
              <option value="">{selected ? 'Conservar propietario actual' : 'Asignar a mí mismo (Admin)'}</option>
              {salespeople.data?.map(sp => (
                <option key={sp.id} value={sp.id}>
                  {`${sp.first_name || ''} ${sp.last_name || ''}`.trim() || sp.email} {sp.code ? `(${sp.code})` : ''} {sp.roles?.name ? `· ${sp.roles.name}` : ''}
                </option>
              ))}
            </select>
          </div>}
          <div><label htmlFor="prospect-company" className={labelClass}>Nombre de empresa *</label><input id="prospect-company" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} required maxLength={255} className={inputClass} /></div>
          <div><label htmlFor="prospect-contact" className={labelClass}>Persona de contacto</label><input id="prospect-contact" value={form.contact_name || ''} onChange={e => setForm({ ...form, contact_name: e.target.value })} maxLength={255} className={inputClass} placeholder="Ej. Ana García" /></div>
          <div><label htmlFor="prospect-contact-job" className={labelClass}>Cargo de la persona de contacto</label><input id="prospect-contact-job" value={form.contact_job_title || ''} onChange={e => setForm({ ...form, contact_job_title: e.target.value })} maxLength={255} className={inputClass} placeholder="Ej. Director de Calidad / Compras" /></div>
          <div><label htmlFor="prospect-email" className={labelClass}>Email</label><input id="prospect-email" type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} maxLength={255} className={inputClass} /></div>
          <div><label htmlFor="prospect-phone" className={labelClass}>Teléfono</label><input id="prospect-phone" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} maxLength={50} className={inputClass} /></div>
          <div><label htmlFor="prospect-notes" className={labelClass}>Comentarios</label><textarea id="prospect-notes" rows={3} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} maxLength={10000} className={inputClass} placeholder="Anotaciones preliminares, observaciones, origen del contacto…" /></div>
          <div><label htmlFor="prospect-phase" className={labelClass}>Fase</label><select id="prospect-phase" disabled={!!selected?.converted_at || !!selected?.archived_at} value={form.phase} onChange={e => setForm({ ...form, phase: Number(e.target.value) })} className={inputClass}><option value={0}>Fase 0 · Sin aproximación</option><option value={1}>Fase 1 · Interesado</option></select></div>
          <button type="submit" className="w-full bg-dts-secondary hover:bg-dts-secondary-dark text-white py-2 rounded-lg text-xs font-bold">{save.isPending ? 'Guardando…' : 'Guardar'}</button>
        </fieldset>
      </form>
      {selected && isOwner && !selected.converted_at && <button disabled={busy} onClick={() => archive.mutate()} className="mt-4 flex items-center gap-2 text-xs text-gray-500 hover:text-dts-secondary">{selected.archived_at ? <RotateCcw size={14} /> : <Archive size={14} />}{selected.archived_at ? 'Restaurar prospecto' : 'Archivar prospecto'}</button>}
      </div>
      {selected && <div className="space-y-3.5"><h3 className="text-xs font-bold text-dts-primary dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-1.5">Datos de empresa y seguimiento</h3>
      {selected && <section className="mt-6 space-y-3 border-t border-gray-100 dark:border-white/5 pt-4">
        <h4 className="text-xs font-bold uppercase text-dts-primary dark:text-dts-secondary">Cliente de Business Central</h4>
        {selected.converted_at ? <>
          <p className="text-xs text-gray-700 dark:text-gray-200">{selected.linked_client?.client_id} · {selected.linked_client?.name || detail.data?.linked_client?.name || 'Cliente vinculado'}</p>
          <p className="text-xs text-gray-500">Convertido el {dateText(selected.converted_at)}. Se conserva el prospecto y su historial.</p>
          <button onClick={() => setShowClientActivities(!showClientActivities)} className="text-xs text-dts-secondary hover:underline">{showClientActivities ? 'Ocultar seguimiento del cliente' : 'Ver seguimiento asociado al cliente'}</button>
          {showClientActivities && selected.linked_client_id && <ClientProspectActivities clientId={selected.linked_client_id} />}
          {isOwner && <>{confirmUnlink ? <div className="space-y-2"><p className="text-xs text-gray-500">¿Deshacer esta asociación y devolver el prospecto a Fase {selected.phase}?</p><div className="flex gap-3"><button disabled={busy} onClick={() => link.mutate(null)} className="text-xs font-bold text-rose-500">Confirmar desvinculación</button><button disabled={busy} onClick={() => setConfirmUnlink(false)} className="text-xs text-gray-500">Cancelar</button></div></div> : <button disabled={busy} onClick={() => setConfirmUnlink(true)} className="text-xs text-dts-secondary hover:underline">Deshacer vinculación</button>}</>}
        </> : isOwner && !selected.archived_at ? <>
          <label htmlFor="prospect-client-search" className={labelClass}>Buscar cliente en tu cartera</label>
          <input id="prospect-client-search" value={clientSearch} onChange={e => { setClientSearch(e.target.value); setClientId(''); }} className={inputClass} placeholder="Nombre, código de cliente o email" />
          <p className="text-xs text-gray-500">{clientQuery ? 'Resultados de tu cartera' : 'Sugerencias por empresa, email o teléfono'}. El cliente puede asociarse aunque todavía no tenga oferta.</p>
          {clients.isError && <p role="alert" className="text-xs text-rose-500">{errorText(clients.error)}</p>}
          <select aria-label="Cliente para vincular" value={clientId} disabled={busy || clients.isFetching} onChange={e => setClientId(e.target.value)} className={inputClass}><option value="">Selecciona un cliente</option>{clients.data?.map(client => <option key={client.id} value={client.id}>{client.client_id} · {client.name}</option>)}</select>
          {!clients.isFetching && !clients.isError && !clients.data?.length && <p className="text-xs text-gray-500">Sin coincidencias. Busca otro nombre o espera a que el cliente de BC se sincronice.</p>}
          {chosenClient && <p className="text-xs text-gray-700 dark:text-gray-200">Confirma la asociación con {chosenClient.name} ({chosenClient.client_id}). El prospecto dejará el Kanban y pasará a Convertidos.</p>}
          <button disabled={!chosenClient || busy || clients.isFetching} onClick={() => link.mutate(clientId)} className="bg-dts-secondary text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-40">Confirmar vinculación</button>
        </> : <p className="text-xs text-gray-500">{selected.archived_at ? 'Restaura el prospecto para vincular un cliente.' : 'La vinculación la confirma el comercial propietario.'}</p>}
      </section>}
      {selected && <div className="mt-6 space-y-3"><h4 className="text-xs font-bold uppercase text-dts-primary dark:text-dts-secondary">Historial de cambios</h4>{detail.isError && <p role="alert" className="text-xs text-rose-500">{errorText(detail.error)}</p>}{detail.data?.events?.map(event => <div key={event.id} className="border-l-2 border-dts-secondary pl-3 py-1"><p className="text-xs text-gray-700 dark:text-gray-200">{event.title}</p><p className="text-[10px] text-gray-400">{dateText(event.created_at)}{event.created_by !== selected.owner_id ? ' · Edición administrativa' : ''}</p></div>)}</div>}
      </div>}
      </div>
      </div>
      {isOpen && selected && detailTab === 'events' && <ProspectActivities key={selected.id} prospect={selected} access={access} />}
      {isOpen && selected && detailTab === 'timeline' && <ProspectTimeline key={selected.id} prospect={selected} access={access} />}
      </div>
    </ProspectShell>
    <Drawer isOpen={contactEditorOpen && isOpen && !!selected} onClose={() => { if (!save.isPending) setContactEditorOpen(false); }} title="Editar prospecto">
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (canEdit && !save.isPending) save.mutate(); }}>
        {access.canEditAll && <div><label htmlFor="edit-prospect-owner" className={labelClass}>Comercial asignado (Salesperson)</label><select id="edit-prospect-owner" className={inputClass} value={form.owner_id || ''} onChange={e=>setForm({...form,owner_id:e.target.value || null})}><option value="">Conservar propietario actual</option>{salespeople.data?.map(sp=><option key={sp.id} value={sp.id}>{`${sp.first_name || ''} ${sp.last_name || ''}`.trim() || sp.email} {sp.code ? `(${sp.code})` : ''} {sp.roles?.name ? `· ${sp.roles.name}` : ''}</option>)}</select></div>}
        <div><label htmlFor="edit-prospect-company" className={labelClass}>Nombre de empresa *</label><input id="edit-prospect-company" required maxLength={255} className={inputClass} value={form.company_name} onChange={e=>setForm({...form,company_name:e.target.value})}/></div>
        <div><label htmlFor="edit-prospect-name" className={labelClass}>Persona de contacto</label><input id="edit-prospect-name" maxLength={255} className={inputClass} value={form.contact_name || ''} onChange={e=>setForm({...form,contact_name:e.target.value})}/></div>
        <div><label htmlFor="edit-prospect-job" className={labelClass}>Cargo de la persona de contacto</label><input id="edit-prospect-job" maxLength={255} className={inputClass} value={form.contact_job_title || ''} onChange={e=>setForm({...form,contact_job_title:e.target.value})}/></div>
        <div><label htmlFor="edit-prospect-email" className={labelClass}>Email</label><input id="edit-prospect-email" type="email" maxLength={255} className={inputClass} value={form.email || ''} onChange={e=>setForm({...form,email:e.target.value})}/></div>
        <div><label htmlFor="edit-prospect-phone" className={labelClass}>Teléfono</label><input id="edit-prospect-phone" maxLength={50} className={inputClass} value={form.phone || ''} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
        <div><label htmlFor="edit-prospect-notes" className={labelClass}>Comentarios</label><textarea id="edit-prospect-notes" rows={3} maxLength={10000} className={inputClass} value={form.notes || ''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
        <div><label htmlFor="edit-prospect-phase" className={labelClass}>Fase</label><select id="edit-prospect-phase" disabled={!!selected?.converted_at || !!selected?.archived_at} className={inputClass} value={form.phase} onChange={e=>setForm({...form,phase:Number(e.target.value)})}><option value={0}>Fase 0 · Sin aproximación</option><option value={1}>Fase 1 · Interesado</option></select></div>
        {error && <p role="alert" className="text-xs text-rose-500">{error}</p>}
        <div className="flex justify-end gap-3"><button type="button" disabled={save.isPending} onClick={()=>setContactEditorOpen(false)} className="px-4 py-2 rounded-lg border text-xs font-bold">Cancelar</button><button type="submit" disabled={!canEdit || save.isPending} className="px-4 py-2 rounded-lg bg-dts-secondary text-white text-xs font-bold disabled:opacity-50">{save.isPending ? 'Guardando…' : 'Guardar'}</button></div>
      </form>
    </Drawer>
  </div>;
}
