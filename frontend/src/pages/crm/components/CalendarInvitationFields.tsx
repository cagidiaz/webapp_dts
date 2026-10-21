import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInvitationContacts, type CalendarInvitationInput } from '../../../api/crmActivities';

export const newCalendarInvitation = (contactId?: string): CalendarInvitationInput => ({ enabled: true, contactIds: contactId ? [contactId] : [], externalEmails: [], message: '', durationMinutes: 60 });
const validEmail = (email: string) => /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(email) && email.length <= 254;
const field = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white text-xs';

export function CalendarInvitationFields({ clientId, allowExternal, value, onChange }: {
  clientId?: string; allowExternal: boolean; value: CalendarInvitationInput; onChange: (value: CalendarInvitationInput) => void;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const contacts = useQuery({ queryKey: ['calendar-invitation-contacts', clientId], queryFn: () => getInvitationContacts(clientId!), enabled: !!clientId && value.enabled });
  const addEmails = () => {
    const emails = draft.split(/[;,\s]+/).map(email => email.trim().toLowerCase()).filter(Boolean);
    if (emails.some(email => !validEmail(email))) { setError('Revisa las direcciones de correo.'); input.current?.setCustomValidity('Revisa las direcciones de correo.'); return; }
    onChange({ ...value, externalEmails: [...new Set([...value.externalEmails, ...emails])] });
    setDraft(''); setError(''); input.current?.setCustomValidity('');
  };
  return <fieldset className="space-y-3 p-3 border border-gray-200 dark:border-white/10 rounded-xl min-w-0">
    <label className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200">
      <input type="checkbox" checked={value.enabled} onChange={event => { onChange({ ...value, enabled: event.target.checked }); setDraft(''); setError(''); input.current?.setCustomValidity(''); }} />
      Enviar invitación al contacto
    </label>
    {value.enabled && <>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">Los invitados recibirán la misma convocatoria y podrán ver a los demás participantes. Su aceptación depende de su calendario.</p>
      <div className="space-y-1"><span className="block text-[10px] uppercase font-bold text-gray-400">Contactos invitados de la empresa</span>
        {contacts.isPending && <p role="status" className="text-xs text-gray-500">Cargando contactos…</p>}
        {contacts.isError && <p role="alert" className="text-xs text-rose-500">No se pudieron cargar los contactos. <button type="button" className="underline" onClick={() => void contacts.refetch()}>Reintentar</button></p>}
        <div className="max-h-36 overflow-y-auto space-y-1">
          {contacts.data?.map(contact => { const valid = !!contact.email && validEmail(contact.email.trim()); return <label key={contact.id} className={`flex gap-2 items-start text-xs ${valid ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}`}>
            <input type="checkbox" className="mt-0.5" disabled={!valid} checked={value.contactIds.includes(contact.id)} onChange={event => onChange({ ...value, contactIds: event.target.checked ? [...value.contactIds, contact.id] : value.contactIds.filter(id => id !== contact.id) })} />
            <span className="break-all">{contact.name} · {valid ? contact.email : 'Sin email válido'}</span>
          </label>; })}
        </div>
        {contacts.data?.length === 0 && <p className="text-xs text-gray-500">No hay contactos disponibles para esta empresa.</p>}
      </div>
      {allowExternal && <div className="space-y-2">
        <label className="block text-[10px] uppercase font-bold text-gray-400" htmlFor="calendar-external-emails">Otros invitados (emails externos)</label>
        <div className="flex gap-2"><input ref={input} id="calendar-external-emails" className={field} value={draft} placeholder="correo@empresa.com; otro@empresa.com" onChange={event => { setDraft(event.target.value); setError(''); event.target.setCustomValidity(''); }} onBlur={() => { if (draft.trim()) addEmails(); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ';' || event.key === ',') { event.preventDefault(); addEmails(); } }} /><button type="button" className="text-xs font-bold text-dts-secondary shrink-0" onClick={addEmails}>Añadir</button></div>
        {error && <p role="alert" className="text-xs text-rose-500">{error}</p>}
        <div className="flex flex-wrap gap-1">{value.externalEmails.map(email => <button type="button" key={email} aria-label={`Quitar ${email}`} className="text-[11px] rounded-lg px-2 py-1 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-200 break-all" onClick={() => onChange({ ...value, externalEmails: value.externalEmails.filter(item => item !== email) })}>{email} ×</button>)}</div>
        <p className="text-[11px] text-gray-500">Estas direcciones no crean contactos en el CRM.</p>
      </div>}
      <label className="block text-[10px] uppercase font-bold text-gray-400">Duración
        <select className={`${field} mt-1`} value={value.durationMinutes} onChange={event => onChange({ ...value, durationMinutes: Number(event.target.value) })}>{[15, 30, 45, 60, 90, 120, 180, 240, 480].map(minutes => <option key={minutes} value={minutes}>{minutes} minutos</option>)}</select>
      </label>
      <label className="block text-[10px] uppercase font-bold text-gray-400">Mensaje para los invitados
        <textarea className={`${field} mt-1 normal-case font-normal`} rows={3} maxLength={5000} value={value.message} onChange={event => onChange({ ...value, message: event.target.value })} placeholder="Información que recibirán los participantes…" />
      </label>
      <p className="text-[11px] text-gray-500">La descripción interna y las conclusiones del CRM no se incluyen en la convocatoria.</p>
    </>}
  </fieldset>;
}
