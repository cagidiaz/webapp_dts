import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCrmActivitiesAgenda, type CrmActivity } from '../../../api/crmActivities';
import { AgendaActivityDetail } from './AgendaActivityDetail';

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const currentWorkday = () => { const date = new Date(); const weekday = date.getDay(); if (weekday === 6) date.setDate(date.getDate() + 2); else if (weekday === 0) date.setDate(date.getDate() + 1); return date; };

export function ExecutiveDailyAgenda({ salespersonCode }: { salespersonCode: string | null }) {
  const [date, setDate] = useState(currentWorkday);
  const [activity, setActivity] = useState<CrmActivity | null>(null);
  const day = dateKey(date);
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['executive-daily-agenda', day, salespersonCode],
    queryFn: () => getCrmActivitiesAgenda({ startDate: day, endDate: day, salespersonCode: salespersonCode || undefined, types: ['EVENT', 'CALL', 'REUNION', 'VIDEOLLAMADA', 'VISITA'] }),
  });
  const move = (days: number) => setDate(current => { const next = new Date(current); do { next.setDate(next.getDate() + days); } while (next.getDay() === 0 || next.getDay() === 6); return next; });
  const labels: Record<string, string> = { NOTE: 'Nota', TASK: 'Tarea', EMAIL: 'Email', EVENT: 'Visita no programada', CALL: 'Llamada', REUNION: 'Reunión', VIDEOLLAMADA: 'Videollamada', VISITA: 'Visita a cliente' };
  return <section className="min-w-0 h-full bg-white dark:bg-surface-card-dark border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-white/10 pb-3">
      <h3 className="text-md font-bold text-dts-primary dark:text-white flex items-center gap-2"><Calendar size={18} className="text-dts-secondary" />Agenda diaria CRM</h3>
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300"><button type="button" aria-label="Día anterior" onClick={() => move(-1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10"><ChevronLeft size={16} /></button><span className="capitalize">{date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><button type="button" aria-label="Día siguiente" onClick={() => move(1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10"><ChevronRight size={16} /></button><button type="button" onClick={() => setDate(currentWorkday())} className="text-dts-secondary font-semibold hover:underline">{[0, 6].includes(new Date().getDay()) ? 'Próximo lunes' : 'Hoy'}</button></div>
    </div>
    {isLoading ? <p className="text-xs text-gray-400">Cargando agenda…</p> : isError ? <p role="alert" className="text-xs text-rose-500">No se ha podido cargar la agenda. <button onClick={() => refetch()} className="underline">Reintentar</button></p> : data.length === 0 ? <p className="text-xs text-gray-400 italic py-4 text-center">No hay eventos para este día y comercial.</p> : <div className="space-y-1.5 max-h-96 overflow-y-auto custom-scrollbar">{data.map(item => {
      const title = item.title;
      const owner = item.creator ? `${item.creator.first_name || ''} ${item.creator.last_name || ''}`.trim() || item.creator.email : '';
      const company = item.prospect?.company_name || item.customer?.company_name || item.customer?.name || '';
      return <button key={`${item.source || 'CRM'}-${item.id}`} type="button" onClick={() => setActivity(item)} className="block w-full min-w-0 rounded-xl border border-gray-200/50 dark:border-white/10 bg-gray-50/50 dark:bg-white/2 px-3 py-2 text-left hover:border-dts-secondary/50"><span className="flex gap-2 items-center text-[12px] min-w-0"><span className="shrink-0 font-bold text-dts-secondary">{item.time_scheduled?.slice(0, 5) || 'Sin hora'}</span><span className="shrink-0 text-gray-500">{labels[item.type] || item.type}</span><span className="font-bold truncate text-gray-900 dark:text-white">{title || 'Sin título'}</span></span><span className="block truncate text-[11px] text-gray-500">{owner && <><span className="font-bold text-blue-700 dark:text-blue-300">{owner}</span><span> · </span></>}{[company, item.contact?.name || item.prospect?.contact_name, item.is_completed ? 'Finalizado' : 'Pendiente'].filter(Boolean).join(' · ')}</span></button>;
    })}</div>}
    {activity && <AgendaActivityDetail activity={{ ...activity, can_edit: false }} onClose={() => setActivity(null)} onEdit={() => {}} />}
  </section>;
}
