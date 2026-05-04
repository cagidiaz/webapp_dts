import React, { useState, useRef, useEffect } from 'react';
import { Bell, Moon, Sun, Github } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useUpdatesStore } from '../../store/updatesStore';
import { InfoPopover } from '../ui/InfoPopover';

export const TopBar: React.FC = () => {
  const { theme, toggleTheme, pageTitle, pageSubtitle, pageIcon, pageInfoProps } = useUIStore();
  const { profile } = useAuthStore();
  const { commits, getUnreadCount, markAsSeen } = useUpdatesStore();
  
  const isDark = theme === 'dark';
  const userFullName = profile ? `${profile.firstName} ${profile.lastName}` : 'Usuario';

  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = getUnreadCount();

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

      {/* Right Actions */}
      <div className="flex items-center space-x-4 ml-4">
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
            className={`relative p-2 rounded-full transition-colors ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-surface-hover-dark' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-surface-dark"></span>
            )}
          </button>

          {showNotifications && (
            <div className={`absolute right-0 mt-2 w-80 rounded-xl shadow-lg border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ${isDark ? 'bg-surface-card-dark border-surface-hover-dark' : 'bg-white border-gray-100'}`}>
              <div className="p-3 border-b flex justify-between items-center bg-gray-50 dark:bg-dts-primary-dark border-gray-100 dark:border-white/10">
                <span className="font-bold text-sm text-dts-primary dark:text-white">Actualizaciones</span>
                <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-full">v.Main</span>
              </div>
              <div className="max-h-80 overflow-y-auto bg-white dark:bg-surface-dark">
                {commits.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500">No hay actualizaciones recientes</div>
                ) : (
                  <>
                    {commits.slice(0, 3).map((commit) => (
                      <div key={commit.sha} className="p-3 border-b last:border-b-0 border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 mb-1">{commit.commit.message}</p>
                        <div className="flex justify-between items-center text-[10px] text-gray-400">
                          <span className="flex items-center gap-1"><Github className="w-3 h-3" /> {commit.commit.author.name}</span>
                          <span>{new Date(commit.commit.author.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                    <div className="p-2 border-t border-gray-50 dark:border-white/10 text-center bg-gray-50 dark:bg-dts-primary-dark">
                      <button 
                        onClick={() => {
                          setShowNotifications(false);
                          useUpdatesStore.getState().openModal();
                        }}
                        className="text-[11px] font-bold text-dts-secondary hover:underline"
                      >
                        Ver panel de actualizaciones completo
                      </button>
                    </div>
                  </>
                )}
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
