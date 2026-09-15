import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, Calendar, Clock, MapPin, FileText, CheckSquare, 
  Users, Video, Phone, Check, Loader2 
} from 'lucide-react';
import { CrmActivity, CrmActivityType, updateCrmActivity } from '../../../api/crmActivities';

interface EditAgendaActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: CrmActivity | null;
  onSuccess?: () => void;
}

const ACTIVITY_TYPES: { type: CrmActivityType; label: string; icon: any; color: string }[] = [
  { type: 'REUNION', label: 'Reunión', icon: Users, color: 'text-teal-600 bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800 dark:text-teal-300' },
  { type: 'VIDEOLLAMADA', label: 'Videollamada', icon: Video, color: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-300' },
  { type: 'VISITA', label: 'Visita', icon: MapPin, color: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-300' },
  { type: 'TASK', label: 'Tarea', icon: CheckSquare, color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300' },
  { type: 'CALL', label: 'Llamada', icon: Phone, color: 'text-cyan-600 bg-cyan-50 border-cyan-200 dark:bg-cyan-950/30 dark:border-cyan-800 dark:text-cyan-300' },
  { type: 'EVENT', label: 'Evento', icon: Calendar, color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300' },
  { type: 'NOTE', label: 'Nota', icon: FileText, color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300' },
];

export const EditAgendaActivityModal: React.FC<EditAgendaActivityModalProps> = ({
  isOpen,
  onClose,
  activity,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [activityType, setActivityType] = useState<CrmActivityType>('REUNION');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [conclusions, setConclusions] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (activity) {
      setTitle(activity.title || '');
      setActivityType(activity.type || 'REUNION');
      const actDate = activity.due_date || activity.created_at;
      setDate(actDate ? actDate.split('T')[0] : '');
      setTime(activity.time_scheduled ? activity.time_scheduled.substring(0, 5) : '10:00');
      setLocation(activity.location || '');
      setDescription(activity.description || '');
      setConclusions(activity.conclusions || '');
      setIsCompleted(!!activity.is_completed);
    }
  }, [activity]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => {
      if (!activity) throw new Error('No activity selected');
      return updateCrmActivity(activity.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmWeeklyAgenda'] });
      queryClient.invalidateQueries({ queryKey: ['crmActivities'] });
      queryClient.invalidateQueries({ queryKey: ['crmActivitiesAgenda'] });
      queryClient.invalidateQueries({ queryKey: ['exchangeStatus'] });
      onSuccess?.();
      onClose();
    },
  });

  if (!isOpen || !activity) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && activityType !== 'NOTE') return;

    const payload: any = {
      title: activityType === 'NOTE' ? (title.trim() || 'Nota Comercial') : title.trim(),
      description: description.trim() || null,
      conclusions: conclusions.trim() || null,
      location: location.trim() || null,
      isCompleted,
    };

    if (activityType !== 'NOTE') {
      payload.dueDate = date ? new Date(date).toISOString() : null;
      payload.timeScheduled = time || null;
    }

    updateMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#00222e] rounded-2xl border border-gray-100 dark:border-white/10 shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-white/2 shrink-0">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-dts-primary dark:text-white flex items-center gap-2">
              <Calendar size={16} className="text-dts-secondary" />
              Editar Evento de Agenda
            </h3>
            {activity.customer && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium flex items-center gap-1">
                <span>🏢 {activity.customer.company_name}</span>
                <span className="text-[10px] text-gray-400 font-mono">({activity.customer.client_id})</span>
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

        {/* Contenido del formulario con scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Selector de Tipo de Actividad */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Tipo de Actividad
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {ACTIVITY_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = activityType === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setActivityType(t.type)}
                    className={`px-2.5 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-dts-primary text-white dark:bg-dts-secondary dark:text-dts-primary-dark border-transparent shadow-xs ring-1 ring-dts-secondary/50'
                        : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon size={12} className={isSelected ? 'text-white dark:text-dts-primary-dark' : 'text-gray-400'} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Título / Asunto <span className="text-rose-500">*</span>
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
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
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
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
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

          {/* Ubicación (no aplicable a notas) */}
          {activityType !== 'NOTE' && (
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin size={11} /> Ubicación / Lugar
              </label>
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
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Descripción / Orden del día
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles sobre los puntos a tratar..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 resize-none font-medium leading-relaxed"
            />
          </div>

          {/* Conclusiones (para reuniones o actividades realizadas) */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Conclusiones / Acuerdos
            </label>
            <textarea
              rows={2}
              value={conclusions}
              onChange={(e) => setConclusions(e.target.value)}
              placeholder="Resultado de la reunión, próximos pasos acordados..."
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
                className="w-4 h-4 rounded text-dts-secondary focus:ring-dts-secondary border-gray-300 dark:border-gray-600 rounded-md"
              />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                Marcar evento/actividad como completada
              </span>
            </label>
          </div>

          {/* Botones de acción al pie del formulario */}
          <div className="flex gap-2.5 justify-end pt-4 border-t border-gray-100 dark:border-white/10 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 font-bold cursor-pointer transition-colors"
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
    </div>
  );
};
