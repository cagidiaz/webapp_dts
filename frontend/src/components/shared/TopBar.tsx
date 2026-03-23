import React from 'react';
import { Search, Bell, Moon, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';

export const TopBar: React.FC = () => {
  const { isSidebarCollapsed, theme, toggleTheme } = useUIStore();
  const location = useLocation();
  const isDark = theme === 'dark';
  const isFinanceModule = location.pathname.startsWith('/finance');

  return (
    <header 
      className={`fixed top-0 right-0 h-topbar z-10 transition-all duration-300
      flex items-center justify-between px-6 border-b
      ${isDark ? 'bg-surface-dark border-surface-hover-dark' : 'bg-surface-light border-gray-200'}
      `}
      style={{ left: isSidebarCollapsed ? 'var(--spacing-sidebar-collapsed)' : 'var(--spacing-sidebar)' }}
    >
      {/* Search Bar - Hidden in Finance Module */}
      <div className="flex-1 max-w-2xl">
        {!isFinanceModule && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar datos, clientes, informes..." 
              className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-dts-secondary transition-colors
                ${isDark 
                  ? 'bg-surface-card-dark border-surface-hover-dark text-white placeholder-gray-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }
              `}
            />
          </div>
        )}
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

        <button className={`relative p-2 rounded-full transition-colors ${
          isDark ? 'text-gray-400 hover:text-white hover:bg-surface-hover-dark' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
        }`}>
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-dts-secondary rounded-full border border-surface-dark"></span>
        </button>

        <button className="flex items-center justify-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-full bg-linear-to-r from-dts-secondary to-dts-secondary-light flex items-center justify-center text-sm font-medium text-white shadow-sm overflow-hidden">
             {/* Using an avatar similar to the mockup */}
             <img src="https://ui-avatars.com/api/?name=Administrador&background=00B0B9&color=fff" alt="Usuario" />
          </div>
        </button>
      </div>
    </header>
  );
};
