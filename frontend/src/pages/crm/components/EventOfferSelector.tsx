import { useQuery } from '@tanstack/react-query';
import { getEventOffers } from '../../../api/crmActivities';

export function EventOfferSelector({ clientId, contactId, value, onChange, title }: { clientId?: string; contactId?: string | null; value: string; onChange: (value: string) => void; title?: string }) {
  const { data: offers = [], isLoading, isError } = useQuery({ queryKey: ['event-offers', clientId], queryFn: () => getEventOffers(clientId!), enabled: !!clientId && !!contactId });
  const suggestion = !value && title ? offers.find(offer => title.toUpperCase().includes(offer.document_no.toUpperCase())) : undefined;
  return <div className="space-y-1">
    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Oferta vinculada (opcional)</label>
    <select value={value} onChange={e => onChange(e.target.value)} disabled={!clientId || !contactId || isLoading || isError} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50">
      <option value="">Sin oferta vinculada</option>
      {value && !offers.some(offer => offer.document_no === value) && <option value={value}>{value} · vinculada anteriormente</option>}
      {offers.map(offer => <option key={offer.document_no} value={offer.document_no}>{offer.document_no}</option>)}
    </select>
    {!contactId ? <p className="text-xs text-gray-500">Selecciona un contacto para vincular una oferta.</p> : isError ? <p role="alert" className="text-xs text-red-500">No se pudieron cargar las ofertas.</p> : !isLoading && offers.length === 0 ? <p className="text-xs text-gray-500">No hay ofertas abiertas disponibles para esta empresa.</p> : null}
    {suggestion && <button type="button" onClick={() => onChange(suggestion.document_no)} className="text-xs text-teal-600 dark:text-teal-300 underline">Vincular la oferta sugerida {suggestion.document_no}</button>}
  </div>;
}
