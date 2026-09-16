import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUpdatesStore } from '../../store/updatesStore';
import { useAuthStore } from '../../store/authStore';
import { 
  X, Sparkles, Github, ExternalLink, Calendar, CheckSquare, 
  Clock, Building2, User, Phone, Video, MapPin, AlertTriangle, 
  CheckCircle2, ArrowRight, Bell, CalendarDays
} from 'lucide-react';

export const UpdatesModal: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { 
    commits, 
    briefing,
    activeTab, 
    isModalOpen, 
    isBriefingLoading,
    setActiveTab, 
    closeModal,
    toggleCompleteActivity,
    getUnreadCount
  } = useUpdatesStore();

  const userName = profile?.firstName || profile?.email?.split('@')[0] || 'Comercial';

  // Saludo según la hora del día
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return '¡Buenos días';
    if (hour >= 14 && hour < 21) return '¡Buenas tardes';
    return '¡Buenas noches';
  }, []);

  if (!isModalOpen) return null;

  const todayActs = briefing?.todayActivities || [];
  const pendingActs = briefing?.pendingActivities || [];
  const stats = briefing?.stats;
  const unreadCommitsCount = getUnreadCount();

  const todayCount = stats?.todayTotal || todayActs.length;
  const pastPendingCount = stats?.pastPendingTotal || pendingActs.length;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'VIDEOLLAMADA':
        return {
          icon: <Video size={11} />,
          label: 'Videollamada',
          className: 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
        };
      case 'VISITA':
        return {
          icon: <MapPin size={11} />,
          label: 'Visita',
          className: 'bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60'
        };
      case 'CALL':
        return {
          icon: <Phone size={11} />,
          label: 'Llamada',
          className: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
        };
      case 'TASK':
        return {
          icon: <CheckSquare size={11} />,
          label: 'Tarea',
          className: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
        };
      case 'EVENT':
        return {
          icon: <Calendar size={11} />,
          label: 'Evento',
          className: 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/60'
        };
      default:
        return {
          icon: <UsersIcon size={11} />,
          label: 'Reunión',
          className: 'bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60'
        };
    }
  };

  const handleNavigateToAgenda = () => {
    closeModal();
    navigate('/sales');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={closeModal}
    >
      <div 
        className="bg-white dark:bg-surface-card-dark w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-150 dark:border-white/10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Corporativa con Saludo */}
        <div className="p-5 sm:p-6 bg-linear-to-r from-dts-primary via-[#004A61] to-dts-primary dark:from-dts-primary-dark dark:to-surface-card-dark border-b border-white/10 text-white shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-dts-secondary/20 border border-dts-secondary/30 rounded-xl text-dts-secondary shrink-0 shadow-xs">
                <Bell className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  {greeting}, {userName}!
                </h2>
                <p className="text-xs sm:text-sm text-gray-200/90 font-medium mt-0.5">
                  Centro de Notificaciones & Resumen de tu Jornada Comercial
                </p>
              </div>
            </div>
            <button 
              onClick={closeModal}
              className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 shrink-0 cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Pestañas */}
          <div className="flex items-center gap-2 mt-5 pt-3 border-t border-white/15 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-dts-secondary text-dts-primary shadow-sm'
                  : 'bg-white/10 text-white/80 hover:bg-white/15 hover:text-white'
              }`}
            >
              <CalendarDays size={14} />
              <span>Agenda de Hoy</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'today' ? 'bg-dts-primary text-white' : 'bg-white/20 text-white'
              }`}>
                {todayCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-amber-400 text-gray-900 shadow-sm'
                  : 'bg-white/10 text-white/80 hover:bg-white/15 hover:text-white'
              }`}
            >
              <AlertTriangle size={14} />
              <span>Pendientes de Cierre</span>
              {pastPendingCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'pending' ? 'bg-gray-900 text-amber-300' : 'bg-amber-400/30 text-amber-200'
                }`}>
                  {pastPendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('updates')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'updates'
                  ? 'bg-white text-dts-primary shadow-sm'
                  : 'bg-white/10 text-white/80 hover:bg-white/15 hover:text-white'
              }`}
            >
              <Sparkles size={14} />
              <span>Novedades App</span>
              {unreadCommitsCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'updates' ? 'bg-dts-secondary text-white' : 'bg-dts-secondary/40 text-white'
                }`}>
                  {unreadCommitsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Contenido Dinámico por Pestaña (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-gray-50/40 dark:bg-surface-dark space-y-3">
          {/* 1. PESTAÑA: AGENDA DE HOY */}
          {activeTab === 'today' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {isBriefingLoading ? (
                <div className="py-12 text-center text-xs text-gray-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-dts-secondary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Cargando tus actividades de hoy...</p>
                </div>
              ) : todayActs.length === 0 ? (
                <div className="py-12 px-4 text-center rounded-xl bg-white dark:bg-surface-card-dark border border-dashed border-gray-200 dark:border-white/10 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      ¡Sin citas ni llamadas programadas para hoy!
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                      Tienes la agenda despejada. Puedes aprovechar para revisar tu cartera, clientes potenciales o planificar tu semana.
                    </p>
                    {stats?.teamTodayTotal !== undefined && stats.teamTodayTotal > 0 && (
                      <div className="mt-3 inline-block px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200/60 dark:border-cyan-800/40 text-[11px] text-dts-secondary font-semibold">
                        👥 El equipo comercial tiene <strong>{stats.teamTodayTotal}</strong> actividad{stats.teamTodayTotal > 1 ? 'es' : ''} programada{stats.teamTodayTotal > 1 ? 's' : ''} hoy.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
                    <span>Citas y actividades programadas para hoy:</span>
                    <span className="font-bold text-dts-primary dark:text-dts-secondary">
                      {stats?.todayCompleted || 0} de {todayActs.length} completadas
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {todayActs.map(act => {
                      const badge = getTypeBadge(act.type);
                      const isCompleted = !!act.is_completed;

                      return (
                        <div
                          key={act.id}
                          className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 bg-white dark:bg-surface-card-dark ${
                            isCompleted 
                              ? 'border-gray-200 dark:border-white/5 opacity-60 bg-gray-50/50 dark:bg-white/1' 
                              : 'border-gray-200/90 dark:border-white/10 hover:border-dts-secondary/40 shadow-2xs'
                          }`}
                        >
                          {/* Checkbox Interactivo */}
                          <button
                            type="button"
                            onClick={() => toggleCompleteActivity(act.id, isCompleted)}
                            className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-gray-300 dark:border-white/20 hover:border-dts-secondary bg-white dark:bg-surface-card-dark'
                            }`}
                            title={isCompleted ? 'Marcar como pendiente' : 'Marcar como completada'}
                          >
                            {isCompleted && <CheckCircle2 size={13} className="stroke-3" />}
                          </button>

                          {/* Datos del evento */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${badge.className}`}>
                                {badge.icon}
                                {badge.label}
                              </span>

                              {act.time_scheduled && (
                                <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                  <Clock size={11} className="text-gray-400" />
                                  {act.time_scheduled.substring(0, 5)} h
                                </span>
                              )}

                              {isCompleted && (
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                  ✓ Completada
                                </span>
                              )}
                            </div>

                            <div className={`text-sm font-bold text-gray-900 dark:text-white ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                              {act.title}
                            </div>

                            {/* Cliente y Contacto */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                              <span className="flex items-center gap-1 font-semibold text-dts-primary dark:text-cyan-300">
                                <Building2 size={12} className="shrink-0" />
                                {act.customer?.name || act.customer?.company_name || 'Sin empresa'}
                              </span>

                              {act.contact && (
                                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                  <User size={12} className="shrink-0" />
                                  {act.contact.name || `${act.contact.first_name || ''} ${act.contact.last_name || ''}`.trim()}
                                </span>
                              )}

                              {act.location && (
                                <span className="flex items-center gap-1 text-gray-400 text-[11px]">
                                  <MapPin size={11} className="shrink-0" />
                                  {act.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 2. PESTAÑA: PENDIENTES DE CIERRE */}
          {activeTab === 'pending' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {pendingActs.length === 0 ? (
                <div className="py-12 px-4 text-center rounded-xl bg-white dark:bg-surface-card-dark border border-dashed border-gray-200 dark:border-white/10 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      ¡No tienes actividades vencidas pendientes de completar!
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                      Excelente trabajo de gestión. Todo tu historial de tareas pasadas y citas está reportado y al día.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p>
                      Tienes <strong>{pendingActs.length}</strong> actividad{pendingActs.length > 1 ? 'es' : ''} de días anteriores sin marcar como completadas. Puedes marcarlas como terminadas directamente con el checkbox:
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {pendingActs.map(act => {
                      const badge = getTypeBadge(act.type);
                      const dateFormatted = act.due_date 
                        ? new Date(act.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                        : 'Sin fecha';

                      return (
                        <div
                          key={act.id}
                          className="p-3.5 rounded-xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-surface-card-dark hover:border-amber-400/50 transition-all flex items-start gap-3 shadow-2xs"
                        >
                          <button
                            type="button"
                            onClick={() => toggleCompleteActivity(act.id, false)}
                            className="mt-0.5 w-5 h-5 rounded-md border border-gray-300 dark:border-white/20 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                            title="Marcar como completada ahora"
                          >
                            <CheckSquare size={13} className="text-transparent hover:text-emerald-600" />
                          </button>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${badge.className}`}>
                                {badge.icon}
                                {badge.label}
                              </span>

                              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.2 rounded border border-amber-200/60 dark:border-amber-800/40">
                                Venció: {dateFormatted} {act.time_scheduled ? `a las ${act.time_scheduled}` : ''}
                              </span>
                            </div>

                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                              {act.title}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                              <span className="flex items-center gap-1 font-semibold text-dts-primary dark:text-cyan-300">
                                <Building2 size={12} className="shrink-0" />
                                {act.customer?.name || act.customer?.company_name || 'Sin empresa'}
                              </span>

                              {act.contact && (
                                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                  <User size={12} className="shrink-0" />
                                  {act.contact.name || `${act.contact.first_name || ''} ${act.contact.last_name || ''}`.trim()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 3. PESTAÑA: NOVEDADES DE LA APP */}
          {activeTab === 'updates' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium px-1">
                Últimas mejoras, actualizaciones y funcionalidades desplegadas en la webapp:
              </div>

              <div className="relative pl-1">
                <div className="absolute left-1.75 top-2 bottom-4 w-0.5 bg-gray-200 dark:bg-zinc-600" />

                <div className="space-y-6">
                  {commits.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">
                      No hay actualizaciones recientes registradas
                    </div>
                  ) : (
                    commits.map((commit, index) => {
                      const isNew = index === 0;
                      const date = new Date(commit.commit.author.date).toLocaleDateString('es-ES', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      });
                      
                      return (
                        <div key={commit.sha} className="relative pl-7">
                          <div className={`absolute left-0 top-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-surface-card-dark ${
                            isNew ? 'bg-dts-secondary ring-2 ring-dts-secondary/30' : 'bg-gray-300 dark:bg-zinc-600'
                          }`} />
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">{date}</span>
                            <a 
                              href={commit.html_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-gray-400 hover:text-dts-secondary transition-colors" 
                              title="Ver commit en GitHub"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                            {commit.commit.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <Github className="w-3.5 h-3.5" />
                            <span>{commit.commit.author.name}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="p-4 bg-white dark:bg-surface-card-dark border-t border-gray-150 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleNavigateToAgenda}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-dts-primary dark:text-dts-secondary hover:underline cursor-pointer"
          >
            <span>Ir a Agenda Comercial Completa</span>
            <ArrowRight size={13} />
          </button>

          <div className="flex items-center gap-2">
            <button 
              onClick={closeModal}
              className="px-5 py-2 bg-dts-secondary hover:bg-dts-secondary-dark text-white text-xs font-bold rounded-lg transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
            >
              Comenzar Jornada
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const UsersIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
