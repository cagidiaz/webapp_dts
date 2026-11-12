import { lazy, Suspense, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getContacts } from '../../../api/contacts';

const ContactDetail = lazy(() => import('./CrmContactDetail').then(module => ({ default: module.CrmContactDetail })));

export function QuoteNewEvent({ documentNo, clientId, contactId, closed, onCreateEvent }: { documentNo: string; clientId?: string; contactId?: string; closed?: boolean; onCreateEvent?: () => void }) {
  const [choosing, setChoosing] = useState(false);
  const [chosenContact, setChosenContact] = useState('');
  const [openContact, setOpenContact] = useState('');
  const cache = useQueryClient();
  const { data: contacts = [], isLoading, isError } = useQuery({ queryKey: ['quote-event-contacts', clientId], queryFn: () => getContacts({ clientId }), enabled: choosing && !!clientId && !onCreateEvent });
  const selectedContact = chosenContact || contacts.find(contact => contact.id === contactId)?.id || '';
  const finish = () => { setOpenContact(''); setChoosing(false); cache.invalidateQueries({ queryKey: ['offer-events', documentNo] }); cache.invalidateQueries({ queryKey: ['crm-quotes'] }); cache.invalidateQueries({ queryKey: ['crmActivitiesByContact'] }); };
  return <>
    <button type="button" disabled={closed || !clientId} onClick={() => onCreateEvent ? onCreateEvent() : setChoosing(true)} className="rounded-lg bg-dts-secondary px-3 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed">Crear evento</button>
    {closed && <p className="text-xs text-gray-500">No se pueden vincular nuevos eventos a una oferta cerrada.</p>}
    {choosing && !openContact && <div className="space-y-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <label htmlFor="quote-event-contact" className="block text-xs font-semibold text-gray-700 dark:text-gray-200">Selecciona el contacto del evento</label>
      <select id="quote-event-contact" value={selectedContact} onChange={e => setChosenContact(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-dts-primary-dark dark:text-white">
        <option value="">Selecciona un contacto</option>{contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
      </select>
      {isLoading && <p className="text-xs text-gray-500">Cargando contactos…</p>}
      {isError && <p role="alert" className="text-xs text-red-500">No se pudieron cargar los contactos.</p>}
      {!isLoading && !isError && contacts.length === 0 && <p className="text-xs text-gray-500">Esta empresa no tiene contactos disponibles.</p>}
      <div className="flex gap-2"><button type="button" disabled={!selectedContact} onClick={() => setOpenContact(selectedContact)} className="rounded-lg bg-dts-secondary px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Continuar</button><button type="button" onClick={() => setChoosing(false)} className="rounded-lg border px-3 py-2 text-xs dark:text-white">Cancelar</button></div>
    </div>}
    {openContact && <div className="fixed inset-0 z-[200] overflow-auto bg-white p-4 dark:bg-dts-primary-dark"><Suspense fallback={<p>Cargando contacto…</p>}><ContactDetail contactId={openContact} initialEventOffer={documentNo} onBack={finish} /></Suspense></div>}
  </>;
}
