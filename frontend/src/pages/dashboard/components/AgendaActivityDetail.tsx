import { Edit2 } from 'lucide-react';
import type { CrmActivity } from '../../../api/crmActivities';
import { Drawer } from '../../../components/shared/Drawer';
import { EmailAttachments } from '../../crm/components/EmailAttachments';
import { parseEmailActivity } from '../../crm/utils/emailTipologia';

export function AgendaActivityDetail({ activity, onClose, onEdit }: {
  activity: CrmActivity; onClose: () => void; onEdit: () => void;
}) {
  const email = activity.type === 'EMAIL' ? parseEmailActivity(activity) : null;
  return <Drawer isOpen onClose={onClose} title={email ? 'Correo de la agenda' : 'Evento de la agenda'} size="xl">
    <div className="space-y-5 text-xs text-gray-700 dark:text-gray-200">
      <h4 className="text-base font-bold text-dts-primary dark:text-white break-words">{email?.cleanSubject || activity.title}</h4>
      <div className="space-y-2 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
        <p><strong>Fecha:</strong> {new Date(activity.due_date || activity.created_at).toLocaleDateString('es-ES')}{activity.time_scheduled ? ` · ${activity.time_scheduled.slice(0, 5)}` : ''}</p>
        {(activity.customer || activity.prospect) && <p className="break-words"><strong>Empresa:</strong> {activity.customer?.company_name || activity.customer?.name || activity.prospect?.company_name}</p>}
        {(activity.contact?.name || activity.prospect?.contact_name) && <p><strong>Contacto:</strong> {activity.contact?.name || activity.prospect?.contact_name}</p>}
        {email ? <>
          <p><strong>Correo:</strong> {email.directionLabel || 'Registrado'} · {email.categoryConfig.label}</p>
          {activity.email && <p className="break-all">{activity.email}</p>}
        </> : <>
          <p><strong>Estado:</strong> {activity.is_completed ? 'Finalizado' : 'Pendiente'}</p>
          {activity.location && <p className="break-words"><strong>Ubicación:</strong> {activity.location}</p>}
        </>}
      </div>
      <div>
        <h5 className="mb-2 font-bold">{email ? 'Contenido registrado del correo' : 'Descripción'}</h5>
        <p className="whitespace-pre-wrap break-words leading-relaxed">{activity.description || 'Sin descripción registrada.'}</p>
        {email && <EmailAttachments value={activity.attendees?.emailAttachments} />}
      </div>
      {activity.attendees?.calendarInvitation?.message && <div><h5 className="mb-2 font-bold">Mensaje para los invitados</h5><p className="whitespace-pre-wrap break-words">{activity.attendees.calendarInvitation.message}</p></div>}
      {activity.conclusions && <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-4"><h5 className="mb-2 font-bold text-emerald-700 dark:text-emerald-400">Conclusiones</h5><p className="whitespace-pre-wrap break-words leading-relaxed">{activity.conclusions}</p></div>}
      {!email && activity.can_edit !== false && <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-dts-primary px-4 py-2 font-bold text-white dark:bg-dts-secondary dark:text-dts-primary-dark cursor-pointer" onClick={onEdit}><Edit2 size={13} />Editar / Añadir conclusiones</button>}
    </div>
  </Drawer>;
}
