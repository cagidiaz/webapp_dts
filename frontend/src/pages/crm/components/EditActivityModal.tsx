import { CalendarInvitationFields, newCalendarInvitation } from './CalendarInvitationFields';
import React, { useState, useEffect } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, Calendar, Clock, MapPin, FileText, CheckSquare, 
  Users, Video, Phone, Check, Loader2, Mail
} from 'lucide-react';
import { type CrmActivityType, type CrmActivity, updateAgendaActivity } from '../../../api/crmActivities';
import {
  parseEmailActivity,
  EMAIL_CATEGORY_LIST,
  type EmailCategoryKey,
} from '../utils/emailTipologia';

export interface EditableActivityData {
  source?: 'PROSPECT';
  client_id?: string;
  contact_id?: string | null;
  contact?: { id: string };
  attendees?: any;
  prospect_id?: string;
  version?: number;
  id: string;
  type?: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  created_at?: string;
  time_scheduled?: string | null;
  conclusions?: string | null;
  location?: string | null;
  is_completed?: boolean;
  date?: string; // compatibilidad con listas de timeline
  time?: string;
  done?: boolean;
  customer?: {
    company_name?: string;
    name?: string;
    client_id?: string;
    address?: string;
    city?: string;
    [key: string]: any;
  };
}

interface EditActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: EditableActivityData | null;
  defaultLocation?: string;
  contactId?: string;
  onSuccess?: () => void;
}

const ACTIVITY_TYPES: { type: CrmActivityType; label: string; icon: any }[] = [
  { type: 'EMAIL', label: 'Correo / Email', icon: Mail },
  { type: 'REUNION', label: 'Reunión Interna', icon: Users },
  { type: 'VIDEOLLAMADA', label: 'Videollamada', icon: Video },
  { type: 'VISITA', label: 'Visita a Cliente', icon: MapPin },
  { type: 'TASK', label: 'Tarea', icon: CheckSquare },
  { type: 'CALL', label: 'Llamada', icon: Phone },
  { type: 'EVENT', label: 'Visita no programada', icon: Calendar },
  { type: 'NOTE', label: 'Nota', icon: FileText },
];

const normalizeType = (type?: string): CrmActivityType => {
  if (!type) return 'EVENT';
  const upper = type.toUpperCase();
  if (upper === 'EMAIL' || upper === 'CORREO') return 'EMAIL';
  if (upper === 'TASK' || upper === 'TAREA') return 'TASK';
  if (upper === 'NOTE' || upper === 'NOTA') return 'NOTE';
  if (upper === 'REUNION' || upper === 'REUNIÓN') return 'REUNION';
  if (upper === 'VIDEOLLAMADA' || upper === 'VIDEO') return 'VIDEOLLAMADA';
  if (upper === 'VISITA') return 'VISITA';
  if (upper === 'CALL' || upper === 'LLAMADA') return 'CALL';
  return 'EVENT';
};

export const EditActivityModal: React.FC<EditActivityModalProps> = ({
  isOpen,
  onClose,
  activity,
  defaultLocation,
  contactId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [activityType, setActivityType] = useState<CrmActivityType>('EVENT');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [conclusions, setConclusions] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [invitation, setInvitation] = useState(newCalendarInvitation());
  const [selectedCategory, setSelectedCategory] = useState<EmailCategoryKey>('PETICION_OFERTA');

  useEffect(() => {
    if (activity) {
      setTitle(activity.title || '');
      const normType = normalizeType(activity.type);
      setActivityType(normType);
      const initial = newCalendarInvitation(activity.contact_id || activity.contact?.id || contactId);
      initial.enabled = normType === 'VIDEOLLAMADA';
      setInvitation(activity.attendees?.calendarInvitation || initial);

      if (normType === 'EMAIL' || (activity.type || '').toUpperCase() === 'EMAIL') {
        const parsed = parseEmailActivity({
          title: activity.title,
          attendees: (activity as any).attendees,
        });
        setSelectedCategory(parsed.categoryKey);
      }

      const rawDate = activity.due_date || activity.date || activity.created_at;
      setDate(rawDate ? rawDate.split('T')[0] : '');
      const rawTime = activity.time_scheduled || activity.time;
      setTime(rawTime ? rawTime.substring(0, 5) : '10:00');
      setLocation(activity.location || '');
      const rawDesc = activity.description || '';
      const cleanDesc = (normType === 'EMAIL' || (activity.type || '').toUpperCase() === 'EMAIL')
        ? rawDesc
        : (rawDesc.replace(/Actividad de CRM dTS Instruments/gi, '')
                  .replace(/Empresa:\s*[^\r\n]*/gi, '')
                  .replace(/Contacto:\s*[^\r\n]*/gi, '')
                  .replace(/[_\-═]{3,}/g, '')
                  .replace(/Conclusiones:\s*[\s\S]*/gi, '')
                  .replace(/\r\n/g, '\n').replace(/\n{2,}/g, '\n').trim());
      setDescription(cleanDesc);
      setConclusions(activity.conclusions || '');
      setIsCompleted(activity.is_completed !== undefined ? !!activity.is_completed : !!activity.done);
    }
  }, [activity]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => {
      if (!activity) throw new Error('No activity selected');
      return updateAgendaActivity(activity as CrmActivity, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmWeeklyAgenda'] });
      queryClient.invalidateQueries({ queryKey: ['prospect-activities'] });
      queryClient.invalidateQueries({ queryKey: ['client-prospect-activities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-prospect'] });
      queryClient.invalidateQueries({ queryKey: ['crm-activities-report'] });
      queryClient.invalidateQueries({ queryKey: ['crmDailyBriefing'] });
      queryClient.invalidateQueries({ queryKey: ['crmActivities'] });
      queryClient.invalidateQueries({ queryKey: ['crmActivitiesAgenda'] });
      queryClient.invalidateQueries({ queryKey: ['exchangeStatus'] });
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: ['crmActivitiesByContact', contactId] });
      }
      onSuccess?.();
      onClose();
    },
  });

  if (!isOpen || !activity) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && activityType !== 'NOTE') return;

    const hasConclusions = Boolean(conclusions.trim());
    const isEmail = activityType === 'EMAIL' || (activity.type || '').toUpperCase() === 'EMAIL';
    const payload: any = {
      title: activityType === 'NOTE' ? (title.trim() || 'Nota Comercial') : title.trim(),
      description: description.trim() || null,
      conclusions: conclusions.trim() || null,
      location: location.trim() || null,
      isCompleted: hasConclusions ? true : isCompleted,
    };

    if (isEmail) {
      payload.categoryTag = selectedCategory;
    }

    if (activityType !== 'NOTE') {
      payload.dueDate = date ? new Date(date).toISOString() : null;
      payload.timeScheduled = time || null;
    }

    if (activity.source !== 'PROSPECT' && (activityType === 'VISITA' || activityType === 'VIDEOLLAMADA')) payload.calendarInvitation = { ...invitation, externalEmails: activityType === 'VIDEOLLAMADA' ? invitation.externalEmails : [] };
    updateMutation.mutate(payload);
  };

  const customerName = activity.customer?.company_name || activity.customer?.name;
  const customerId = activity.customer?.client_id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {(() => {
        const isDualColumn = activity.source !== 'PROSPECT' && (activityType === 'VISITA' || activityType === 'VIDEOLLAMADA');
        return (
          <div 
            className={`bg-white dark:bg-[#00222e] rounded-2xl border border-gray-100 dark:border-white/10 shadow-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 transition-all duration-200 ${
              isDualColumn ? 'max-w-4xl' : 'max-w-lg'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-white/2 shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-dts-primary dark:text-white flex items-center gap-2">
                  <Calendar size={16} className="text-dts-secondary" />
                  Editar Actividad / Evento
                </h3>
                {customerName && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium flex items-center gap-1">
                    <span>🏢 {customerName}</span>
                    {customerId && <span className="text-[10px] text-gray-400 font-mono">({customerId})</span>}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Contenido del formulario con scroll y pie fijo */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 text-xs">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {updateMutation.isError && <p role="alert" className="text-xs text-rose-500 font-semibold p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">{isAxiosError(updateMutation.error) && typeof updateMutation.error.response?.data?.message === 'string' ? updateMutation.error.response.data.message : 'No se pudieron guardar los cambios. Recarga la actividad antes de intentarlo de nuevo.'}</p>}
                {activity.source === 'PROSPECT' && <p className="text-[11px] text-gray-500 dark:text-gray-400">Actividad de prospección · Modo local</p>}

                {/* Tipo de Actividad (Solo Lectura) */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Tipo de Actividad
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 text-gray-800 dark:text-gray-200 text-xs font-bold shadow-2xs">
                      {(() => {
                        const typeCfg = ACTIVITY_TYPES.find(t => t.type === activityType);
                        const Icon = typeCfg?.icon || Calendar;
                        return (
                          <>
                            <Icon size={14} className="text-dts-secondary" />
                            <span>{typeCfg?.label || activityType}</span>
                          </>
                        );
                      })()}
                    </div>
                    <span className="text-[10px] text-gray-400 italic">
                      (El tipo de evento no se puede modificar)
                    </span>
                  </div>
                </div>

                {/* Selector de Tipología para Correos */}
                {(activityType === 'EMAIL' || (activity.type || '').toUpperCase() === 'EMAIL') && (
                  <div className="space-y-2 p-3 rounded-xl bg-gray-50/80 dark:bg-white/3 border border-gray-200 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Tipología del Correo
                      </label>
                      <span className="text-[9px] text-gray-400">Puedes corregir la tipología asignada</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {EMAIL_CATEGORY_LIST.map((cat) => {
                        const Icon = cat.icon;
                        const isSelected = selectedCategory === cat.key;
                        return (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => setSelectedCategory(cat.key)}
                            className={`p-2 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-dts-secondary bg-dts-secondary/15 text-dts-primary dark:text-dts-secondary shadow-xs ring-1 ring-dts-secondary/40'
                                : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/2 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <Icon size={13} className={cat.color} />
                            <span className="truncate">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isDualColumn ? (
                  /* DISPOSICIÓN EN 2 COLUMNAS PARA VISITA Y VIDEOLLAMADA */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                    {/* COLUMNA 1: Datos de Agenda e Información Interna */}
                    <div className="space-y-3.5">
                      {/* Título */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Título / Concepto <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Ej. Demostración de equipos en fábrica"
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 font-medium"
                        />
                      </div>

                      {/* Fecha y Hora */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={11} /> Fecha <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <Clock size={11} /> Hora
                          </label>
                          <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 font-mono"
                          />
                        </div>
                      </div>

                      {/* Ubicación */}
                      {activityType === 'VISITA' && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                              <MapPin size={11} /> Ubicación / Lugar
                            </label>
                            {defaultLocation && !location && (
                              <button
                                type="button"
                                onClick={() => setLocation(defaultLocation)}
                                className="text-[10px] font-semibold text-dts-secondary hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                                title="Rellenar con la dirección de la empresa"
                              >
                                <MapPin size={11} />
                                <span>Usar dirección empresa</span>
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Ej. Oficinas del cliente, Planta, etc."
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 font-medium"
                          />
                        </div>
                      )}

                      {/* Descripción / Notas */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Descripción / Notas
                          </label>
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                            🔒 Solo interno dTS CRM
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Detalles sobre los puntos a tratar..."
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 resize-none font-medium leading-relaxed"
                        />
                      </div>

                      {/* Conclusiones */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Conclusiones / Acuerdos
                          </label>
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                            🔒 Solo interno dTS CRM
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          value={conclusions}
                          onChange={(e) => {
                            const val = e.target.value;
                            setConclusions(val);
                            if (val.trim() && !isCompleted) {
                              setIsCompleted(true);
                            }
                          }}
                          placeholder="Resultado de la reunión, acuerdos alcanzados..."
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 resize-none font-medium leading-relaxed"
                        />
                      </div>

                      {/* Checkbox de Estado Completado */}
                      <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={(e) => setIsCompleted(e.target.checked)}
                            className="w-4 h-4 text-dts-secondary focus:ring-dts-secondary border-gray-300 dark:border-gray-600 rounded-md"
                          />
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                            Marcar evento/actividad como completada
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* COLUMNA 2: Convocatoria e Invitados */}
                    <div className="space-y-3.5">
                      <CalendarInvitationFields
                        clientId={activity.client_id || activity.customer?.client_id}
                        allowExternal={activityType === 'VIDEOLLAMADA'}
                        value={invitation}
                        onChange={setInvitation}
                      />
                    </div>
                  </div>
                ) : (
                  /* DISPOSICIÓN ESTÁNDAR DE COLUMNA ÚNICA */
                  <div className="space-y-3.5">
                    {/* Título */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Título / Concepto <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ej. Demostración de equipos en fábrica"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 font-medium"
                      />
                    </div>

                    {/* Fecha y Hora */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <Calendar size={11} /> Fecha
                        </label>
                        <input
                          type="date"
                          required
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <Clock size={11} /> Hora
                        </label>
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 font-mono"
                        />
                      </div>
                    </div>

                    {/* Ubicación */}
                    {activityType !== 'NOTE' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <MapPin size={11} /> Ubicación / Lugar
                          </label>
                          {defaultLocation && !location && (
                            <button
                              type="button"
                              onClick={() => setLocation(defaultLocation)}
                              className="text-[10px] font-semibold text-dts-secondary hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                              title="Rellenar con la dirección de la empresa"
                            >
                              <MapPin size={11} />
                              <span>Usar dirección empresa</span>
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Ej. Oficinas del cliente, Sala Teams, etc."
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 font-medium"
                        />
                      </div>
                    )}

                    {/* Descripción / Notas */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Descripción / Notas
                        </label>
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                          🔒 Solo interno dTS CRM
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Detalles sobre los puntos a tratar..."
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 resize-none font-medium leading-relaxed"
                      />
                    </div>

                    {/* Conclusiones (para reuniones o actividades realizadas) */}
                    {activityType !== 'NOTE' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Conclusiones / Acuerdos
                          </label>
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                            🔒 Solo interno dTS CRM
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          value={conclusions}
                          onChange={(e) => {
                            const val = e.target.value;
                            setConclusions(val);
                            if (val.trim() && !isCompleted) {
                              setIsCompleted(true);
                            }
                          }}
                          placeholder="Resultado de la reunión, próximos pasos acordados..."
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 resize-none font-medium leading-relaxed"
                        />
                      </div>
                    )}

                    {/* Checkbox de Estado Completado */}
                    <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={(e) => setIsCompleted(e.target.checked)}
                          className="w-4 h-4 text-dts-secondary focus:ring-dts-secondary border-gray-300 dark:border-gray-600 rounded-md"
                        />
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                          Marcar evento/actividad como completada
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de acción al pie fijo del formulario */}
              <div className="px-6 py-3.5 border-t border-gray-100 dark:border-white/10 flex gap-2.5 justify-end bg-gray-50/50 dark:bg-white/2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 bg-dts-primary text-white dark:bg-dts-secondary dark:text-dts-primary-dark hover:brightness-110 font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        );
      })()}
    </div>
  );
};
