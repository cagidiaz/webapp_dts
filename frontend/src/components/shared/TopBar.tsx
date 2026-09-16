import React, { useState, useRef, useEffect } from 'react';
import { Bell, Moon, Sun, Github } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useUpdatesStore } from '../../store/updatesStore';
import { InfoPopover } from '../ui/InfoPopover';

export const TopBar: React.FC = () => {
  const { theme, toggleTheme, pageTitle, pageSubtitle, pageIcon, pageInfoProps } = useUIStore();
  const { profile } = useAuthStore();
  const { 
    commits, 
    briefing, 
    getTotalBadgeCount, 
    getUnreadCount, 
    openModal, 
    markAsSeen 
  } = useUpdatesStore();
  
  const isDark = theme === 'dark';
  const userFullName = profile ? `${profile.firstName} ${profile.lastName}` : 'Usuario';

  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const totalBadgeCount = getTotalBadgeCount();
  const unreadCommitsCount = getUnreadCount();
  const pastPendingCount = briefing?.stats?.pastPendingTotal || 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotifications = () => {
    if (!showNotifications) markAsSeen();
    setShowNotifications(!showNotifications);
  };

  const handleOpenTab = (tab: 'today' | 'pending' | 'updates') => {
    setShowNotifications(false);
    openModal(tab);
  };

  return (
    <header 
      className={`fixed top-0 right-0 h-topbar z-40 transition-all duration-300
      flex items-center justify-between px-6 border-b
      ${isDark ? 'bg-surface-dark border-surface-hover-dark' : 'bg-surface-light border-gray-200'}
      `}
      style={{ left: 'var(--spacing-sidebar-collapsed)' }}
    >
      {/* Page Title Section */}
      <div className="flex-1 flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
        {pageIcon && (
          <div className="shrink-0 text-dts-secondary drop-shadow-sm p-2 bg-gray-100 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
            {pageIcon}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={`font-black uppercase tracking-widest text-sm lg:text-[15px] truncate ${isDark ? 'text-white' : 'text-dts-primary'}`}>
              {pageTitle}
            </h2>
            {pageInfoProps && (
              <InfoPopover 
                title={pageInfoProps.title}
                description={pageInfoProps.description}
                objective={pageInfoProps.objective}
                source={pageInfoProps.source}
                iconSize={14}
                className="opacity-40 hover:opacity-100 transition-opacity"
              />
            )}
          </div>
          {pageSubtitle && (
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight truncate leading-tight">
              {pageSubtitle}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleTheme}
          className={`p-2 rounded-full transition-colors ${
            isDark ? 'text-gray-400 hover:text-white hover:bg-surface-hover-dark' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
          }`}
          title="Cambiar Tema"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="relative" ref={notifRef}>
          <button 
            onClick={handleToggleNotifications}
            className={`relative p-2 rounded-full transition-colors cursor-pointer ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-surface-hover-dark' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Centro de Notificaciones"
          >
            <Bell className="w-5 h-5" />
            {totalBadgeCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[9.5px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-surface-dark animate-pulse shadow-xs">
                {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className={`absolute right-0 mt-2 w-84 rounded-2xl shadow-xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 ${isDark ? 'bg-surface-card-dark border-surface-hover-dark' : 'bg-white border-gray-200'}`}>
              <div className="p-3.5 border-b flex justify-between items-center bg-gray-50/80 dark:bg-dts-primary-dark border-gray-100 dark:border-white/10">
                <span className="font-bold text-sm text-dts-primary dark:text-white flex items-center gap-1.5">
                  <Bell size={15} className="text-dts-secondary" />
                  Notificaciones & Agenda
                </span>
                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-300 bg-gray-200/80 dark:bg-white/10 px-2 py-0.5 rounded-full font-mono">
                  {totalBadgeCount} avisos
                </span>
              </div>

              {/* Botones de Acceso Rápido por Pestaña */}
              <div className="p-2 grid grid-cols-3 gap-1.5 border-b border-gray-100 dark:border-white/5 bg-gray-50/40 dark:bg-white/2">
                <button
                  type="button"
                  onClick={() => handleOpenTab('today')}
                  className="p-2 rounded-xl text-center hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-all cursor-pointer"
                >
                  <div className="text-base font-black text-dts-primary dark:text-cyan-300 font-mono">
                    {briefing?.todayActivities?.length || 0}
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Hoy</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenTab('pending')}
                  className="p-2 rounded-xl text-center hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-all cursor-pointer"
                >
                  <div className={`text-base font-black font-mono ${pastPendingCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                    {pastPendingCount}
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Pendientes</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenTab('updates')}
                  className="p-2 rounded-xl text-center hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-all cursor-pointer"
                >
                  <div className="text-base font-black text-dts-secondary font-mono">
                    {unreadCommitsCount > 0 ? unreadCommitsCount : commits.length}
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Novedades</div>
                </button>
              </div>

              {/* Vista previa de items */}
              <div className="max-h-72 overflow-y-auto bg-white dark:bg-surface-dark divide-y divide-gray-50 dark:divide-white/5">
                {/* 1. Si hay eventos hoy */}
                {briefing?.todayActivities && briefing.todayActivities.length > 0 && (
                  <div className="p-3 bg-cyan-50/30 dark:bg-cyan-950/10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-dts-secondary mb-1.5">
                      Próxima cita de hoy:
                    </div>
                    {briefing.todayActivities.slice(0, 2).map(act => (
                      <div key={act.id} className="text-xs space-y-0.5 mb-2 last:mb-0">
                        <div className="font-semibold text-gray-900 dark:text-white flex items-center justify-between">
                          <span className="truncate">{act.title}</span>
                          {act.time_scheduled && (
                            <span className="font-mono text-[11px] text-dts-secondary shrink-0 font-bold">
                              {act.time_scheduled.substring(0, 5)} h
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {act.customer?.name || act.customer?.company_name || 'Sin empresa vinculada'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Si hay actualizaciones */}
                {commits.slice(0, 2).map((commit) => (
                  <div key={commit.sha} className="p-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 mb-1">{commit.commit.message}</p>
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><Github className="w-3 h-3" /> {commit.commit.author.name}</span>
                      <span>{new Date(commit.commit.author.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 border-t border-gray-100 dark:border-white/10 text-center bg-gray-50/70 dark:bg-dts-primary-dark">
                <button 
                  onClick={() => {
                    setShowNotifications(false);
                    openModal();
                  }}
                  className="w-full py-1 text-xs font-bold text-dts-secondary hover:text-dts-primary dark:hover:text-white transition-colors"
                >
                  Abrir Resumen & Notificaciones Completo →
                </button>
              </div>
            </div>
          )}
        </div>

        <button className="flex items-center justify-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-full bg-linear-to-r from-dts-secondary to-dts-secondary-light flex items-center justify-center text-sm font-medium text-white shadow-sm overflow-hidden border border-white/20">
             <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userFullName)}&background=00B0B9&color=fff`} alt="Usuario" />
          </div>
        </button>
      </div>
    </header>
  );
};
