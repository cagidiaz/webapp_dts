import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Loader2, Plus, Trash2, X } from 'lucide-react';
import { getCustomerSegments, removeCustomerSegment, saveCustomerSegment, type CustomerSegment } from '../../../api/customerSegments';
import { formatCurrency } from '../../../api/formatters';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { useAuthStore } from '../../../store/authStore';
import { parseEuroAmountInput } from '../../../utils/euroAmountInput';

const errorText = (error: unknown) => {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(message) ? message.join(' ') : message || (error instanceof Error ? error.message : 'No se pudo guardar el segmento.');
};

export function CustomerSegments({ clientCode }: { clientCode: string }) {
  const profileId = useAuthStore(state => state.profile?.id);
  const client = useQueryClient();
  const queryKey = ['customerSegments', clientCode, profileId];
  const { data, isLoading, error, refetch } = useQuery({ queryKey, queryFn: () => getCustomerSegments(clientCode), retry: false });
  const [editing, setEditing] = useState(false);
  const [segment, setSegment] = useState('');
  const [amount, setAmount] = useState('');
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const reset = () => { setEditing(false); setSegment(''); setAmount(''); setVersion(0); setMessage(''); };
  const refresh = () => client.invalidateQueries({ queryKey });
  const save = useMutation({
    mutationFn: (potential: string | null) => saveCustomerSegment(clientCode, segment, potential, version),
    onSuccess: async () => { await refresh(); reset(); },
    onError: error => setMessage(errorText(error)),
  });
  const remove = useMutation({
    mutationFn: (row: CustomerSegment) => removeCustomerSegment(clientCode, row.segment_code, row.version),
    onSuccess: async () => { await refresh(); setRemoving(null); reset(); },
    onError: error => setMessage(errorText(error)),
  });
  const busy = save.isPending || remove.isPending;
  const items = data?.items || [];
  const available = (data?.catalog || []).filter(option => version > 0 ? option.value === segment : !items.some(row => row.segment_code === option.value));
  const totalCents = items.reduce((sum, row) => sum + Math.round(Number(row.potential_amount || 0) * 100), 0);
  const pending = items.filter(row => row.potential_amount === null).length;
  const beginEdit = (row?: CustomerSegment) => {
    setSegment(row?.segment_code || ''); setAmount(row?.potential_amount?.replace('.', ',') || '');
    setVersion(row?.version || 0); setEditing(true); setMessage(''); setRemoving(null);
  };

  return <section className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Segmentos y potencialidad</h3>
      {data?.canEdit && !editing && available.length > 0 && <button type="button" onClick={() => beginEdit()} className="flex items-center gap-1 text-xs font-semibold text-dts-secondary"><Plus size={14} />Añadir segmento</button>}
    </div>
    <p className="text-[11px] text-gray-500 dark:text-gray-400">Estimación anual de ventas en euros. Facturación pendiente de definir.</p>
    {isLoading ? <p role="status" className="text-xs text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Cargando segmentos…</p> : error ? (
      <div role="alert" className="text-xs text-amber-700 dark:text-amber-400 space-y-2"><p>{errorText(error)}</p><button type="button" onClick={() => refetch()} className="underline">Reintentar</button></div>
    ) : <>
      <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-white/10">
        <table className="w-full text-xs text-left">
          <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400"><tr>
            <th scope="col" className="px-2 py-2">Segmento</th><th scope="col" className="px-2 py-2 text-right">Potencialidad €/año</th><th scope="col" className="px-2 py-2 text-right">Facturación</th>
            {data?.canEdit && <th scope="col"><span className="sr-only">Acciones</span></th>}
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/10">
            {!items.length && <tr><td colSpan={data?.canEdit ? 4 : 3} className="p-3 text-gray-400 italic">Sin segmentos asignados.</td></tr>}
            {items.map(row => <tr key={row.segment_code}>
              <td className="px-2 py-2 font-medium text-dts-primary dark:text-white">{data?.catalog.find(option => option.value === row.segment_code)?.label || row.segment_code}</td>
              <td className="px-2 py-2 text-right whitespace-nowrap text-gray-700 dark:text-gray-200">{row.potential_amount === null ? <span className="text-gray-400">Pendiente</span> : formatCurrency(Number(row.potential_amount), 2)}</td>
              <td className="px-2 py-2 text-right text-gray-400" aria-label="Facturación pendiente de definir">—</td>
              {data?.canEdit && <td className="px-2 py-2"><div className="flex justify-end gap-2">
                <button type="button" disabled={busy} onClick={() => beginEdit(row)} title="Editar potencialidad" aria-label={'Editar ' + row.segment_code} className="text-gray-400 hover:text-dts-secondary disabled:opacity-50"><Edit2 size={13} /></button>
                <button type="button" disabled={busy} onClick={() => { setRemoving(row.segment_code); setMessage(''); }} title="Quitar segmento" aria-label={'Quitar ' + row.segment_code} className="text-gray-400 hover:text-rose-500 disabled:opacity-50"><Trash2 size={13} /></button>
              </div></td>}
            </tr>)}
          </tbody>
          {items.length > 0 && <tfoot className="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 font-semibold text-dts-primary dark:text-white"><tr>
            <th scope="row" className="px-2 py-2">Total estimado</th><td className="px-2 py-2 text-right whitespace-nowrap">{items.length === pending ? 'Pendiente' : formatCurrency(totalCents / 100, 2)}</td><td className="px-2 py-2 text-right text-gray-400">—</td>{data?.canEdit && <td />}
          </tr></tfoot>}
        </table>
      </div>
      {pending > 0 && <p className="text-[11px] text-gray-500">{pending} segmento(s) pendiente(s) de estimar. El total solo suma los importes completados.</p>}
      {removing && <div className="flex flex-wrap gap-2 items-center text-xs text-gray-600 dark:text-gray-300">
        <span>¿Quitar {data?.catalog.find(option => option.value === removing)?.label}?</span>
        <button type="button" disabled={busy} onClick={() => { const row = items.find(item => item.segment_code === removing); if (row) remove.mutate(row); }} className="font-semibold text-rose-600">Confirmar</button>
        <button type="button" disabled={busy} onClick={() => setRemoving(null)}>Cancelar</button>
      </div>}
      {editing && <form onSubmit={event => {
        event.preventDefault(); if (busy) return;
        if (!segment) { setMessage('Selecciona un segmento.'); return; }
        try { save.mutate(parseEuroAmountInput(amount)); } catch (error) { setMessage(errorText(error)); }
      }} className="space-y-3 rounded-lg border border-gray-200 dark:border-white/10 p-3">
        <fieldset disabled={busy} className="space-y-3">
          {version > 0 ? <p className="text-xs font-semibold text-dts-primary dark:text-white">{data?.catalog.find(option => option.value === segment)?.label}</p> : <div>
            <label className="block text-[11px] text-gray-500 mb-1">Segmento (busca familia o subfamilia)</label>
            <SearchableSelect options={available} value={segment} onChange={setSegment} placeholder="Buscar segmento…" />
          </div>}
          <label className="block text-[11px] text-gray-500">Potencialidad anual (€)
            <input type="text" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} maxLength={24} placeholder="Ej. 12.500,00" className="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-dts-secondary" />
          </label>
          <p className="text-[10px] text-gray-400">Déjalo vacío si todavía no está estimado. Escribe 0 solo si la estimación es cero.</p>
          <div className="flex items-center gap-3"><button type="submit" className="rounded-lg px-3 py-1.5 bg-dts-primary text-white text-xs font-semibold flex gap-2 items-center">{save.isPending && <Loader2 size={12} className="animate-spin" />}Guardar</button><button type="button" onClick={reset} className="text-xs text-gray-500 flex gap-1 items-center"><X size={12} />Cancelar</button></div>
        </fieldset>
      </form>}
      {message && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{message}</p>}
    </>}
  </section>;
}
