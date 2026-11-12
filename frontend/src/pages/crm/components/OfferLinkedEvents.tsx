import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getOfferEvents, type CrmActivity } from '../../../api/crmActivities';
import { EditActivityModal } from './EditActivityModal';
import { QuoteNewEvent } from './QuoteNewEvent';

type HistoryEntry = { id: string; tipo: string; notas: string; fecha: string; hecho: boolean };
const eventLabels: Record<string, string> = { NOTE: 'Nota', TASK: 'Tarea', EMAIL: 'Correo', EVENT: 'Visita no programada', CALL: 'Llamada', REUNION: 'Reunión', VIDEOLLAMADA: 'Videollamada', VISITA: 'Visita a cliente' };
const eventLabel = (type: string) => eventLabels[type.toUpperCase()] || type;
export function OfferLinkedEvents({ documentNo, clientId, contactId, closed, onCreateEvent, activities = [] }: { documentNo: string; clientId?: string; contactId?: string; closed?: boolean; onCreateEvent?: () => void; activities?: HistoryEntry[] }) {
  const client = useQueryClient();
  const [selected, setSelected] = useState<CrmActivity | null>(null);
  const [historyDetail, setHistoryDetail] = useState<HistoryEntry | null>(null);
  const { data = [], isLoading, isError } = useQuery({ queryKey: ['offer-events', documentNo], queryFn: () => getOfferEvents(documentNo), enabled: !!documentNo });
  const next = data.filter(event => !event.is_completed && event.due_date).sort((a, b) => (a.due_date! + (a.time_scheduled || '')).localeCompare(b.due_date! + (b.time_scheduled || '')))[0];
  const eventIds = new Set(data.map(event => event.id));
  const entries = [
    ...data.map(event => ({ id: event.id, date: event.due_date || event.created_at, title: event.title, kind: 'event' as const, event })),
    ...activities.filter(activity => !eventIds.has(activity.id)).map(activity => ({ id: activity.id, date: activity.fecha, title: activity.notas.split('\n')[0] || activity.tipo, kind: 'history' as const, activity })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return <section className="space-y-2 mt-3">
    <div className="flex items-start justify-between gap-3"><h4 className="pt-2 text-xs font-bold uppercase tracking-wider text-dts-primary dark:text-dts-secondary">Historial de eventos</h4><div className="flex flex-col items-end gap-2"><QuoteNewEvent documentNo={documentNo} clientId={clientId} contactId={contactId} closed={closed} onCreateEvent={onCreateEvent} /></div></div>
    {next ? <p className="text-xs text-gray-600 dark:text-gray-300">Próxima acción: {next.title} · {new Date(next.due_date!).toLocaleDateString('es-ES')}</p> : <p className="text-xs text-gray-500">Sin próxima acción programada.</p>}
    {isLoading && <p className="text-xs text-gray-500">Cargando eventos…</p>}
    {isError && <p role="alert" className="text-xs text-red-500">No se pudieron cargar los eventos vinculados.</p>}
    {!isLoading && !isError && entries.length === 0 && <p className="text-xs text-gray-500">No hay registros en el historial.</p>}
    {entries.map(entry => <button type="button" key={`${entry.kind}-${entry.id}`} onClick={() => entry.kind === 'event' ? setSelected(entry.event) : setHistoryDetail(entry.activity)} title="Abrir detalle" className="flex w-full items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-white/5 text-left text-xs text-gray-800 dark:text-gray-200"><span className="shrink-0 rounded bg-dts-secondary/10 px-1.5 py-0.5 font-semibold text-teal-700 dark:text-teal-300">{eventLabel(entry.kind === 'event' ? entry.event.type : entry.activity.tipo)}</span><strong className="min-w-0 flex-1 truncate">{entry.title}</strong><span className="shrink-0 text-gray-500">{entry.date ? new Date(entry.date).toLocaleDateString('es-ES') : 'Sin fecha'}{entry.kind === 'event' ? entry.event.is_completed ? ' · Completado' : ' · Pendiente' : ''}</span></button>)}
    <EditActivityModal isOpen={!!selected} activity={selected} onClose={() => setSelected(null)} onSuccess={() => { client.invalidateQueries({ queryKey: ['offer-events'] }); client.invalidateQueries({ queryKey: ['crmActivitiesByContact'] }); }} />
    {historyDetail && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Detalle del historial"><div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl dark:bg-dts-primary-dark"><div className="flex items-center justify-between gap-4"><h4 className="text-sm font-bold text-gray-900 dark:text-white">{historyDetail.tipo}</h4><button type="button" onClick={() => setHistoryDetail(null)} aria-label="Cerrar detalle" className="text-gray-500 hover:text-gray-900 dark:hover:text-white">✕</button></div><p className="mt-3 max-h-[60vh] overflow-auto whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-200">{historyDetail.notas}</p></div></div>}
  </section>;
}
