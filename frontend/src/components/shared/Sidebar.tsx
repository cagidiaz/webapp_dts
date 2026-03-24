import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { 
  BarChart3, 
  PieChart, 
  Users, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Wallet
} from 'lucide-react';
import logo from '../../assets/Logodts_white.svg';
import { supabase } from '../../api/supabase';

interface NavItem {
  name: string;
  icon: any;
  path?: string;
  children?: { name: string; path: string }[];
}

const navItems: NavItem[] = [
  { name: 'Panel de Control', icon: BarChart3, path: '/dashboard' },
  { 
    name: 'Finanzas', 
    icon: Wallet, 
    children: [
      { name: 'Análisis de Balances', path: '/finance/balances' },
      { name: '4 Puntos Clave', path: '/finance/key-points' },
      { name: '20 Ratios', path: '/finance/ratios-table' },
      { name: 'Gráficos de Ratios', path: '/finance/ratios-charts' },
      { name: 'Simulaciones', path: '/finance/simulations' },
    ]
  },
  { name: 'Ventas', icon: PieChart, path: '/sales' },
  { 
    name: 'Configuración', 
    icon: Settings, 
    children: [
      { name: 'Gestión de Usuarios', path: '/users' },
      { name: 'Ajustes Generales', path: '/settings' },
    ]
  },
];

export const Sidebar: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>('Finanzas');
  const location = useLocation();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error.message);
    }
  };

  const handleSubmenuToggle = (name: string) => {
    if (isSidebarCollapsed) {
      toggleSidebar();
      setOpenSubmenu(name);
    } else {
      setOpenSubmenu(openSubmenu === name ? null : name);
    }
  };

  return (
    <aside 
      className={`fixed top-0 left-0 h-screen bg-dts-primary text-white transition-all duration-300 z-20 flex flex-col ${
        isSidebarCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      }`}
    >
      {/* Logo Area */}
      <div className="flex items-center space-x-4 h-18 px-4 border-b border-dts-primary-light">
        <div className={`shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'w-10' : 'w-18'}`}>
          <img src={logo} alt="dTS Logo" className="w-full h-auto" />
        </div>
        {!isSidebarCollapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="font-medium text-sm tracking-wide whitespace-nowrap">dTS Instruments</span>
            <span className="text-[10px] text-dts-secondary uppercase tracking-wider font-medium">Panel de Control</span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 flex flex-col gap-1 px-3 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <div key={item.name}>
            {item.children ? (
              <>
                <button
                  onClick={() => handleSubmenuToggle(item.name)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap
                    ${(openSubmenu === item.name || item.children.some(child => location.pathname === child.path)) 
                      ? 'bg-dts-primary-dark text-white' 
                      : 'text-gray-300 hover:bg-dts-primary-dark/50 hover:text-white'
                    }
                  `}
                >
                  <item.icon className={`shrink-0 ${isSidebarCollapsed ? 'w-6 h-6 mx-auto' : 'w-5 h-5'}`} />
                  {!isSidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.name}</span>
                      {openSubmenu === item.name ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </>
                  )}
                </button>
                
                {/* Submenu Items */}
                {!isSidebarCollapsed && openSubmenu === item.name && (
                  <div className="mt-1 ml-4 pl-4 border-l border-dts-primary-light flex flex-col gap-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) => `
                          block px-3 py-2 text-sm rounded-md transition-colors
                          ${isActive 
                            ? 'text-dts-secondary font-medium bg-dts-primary-dark/30' 
                            : 'text-gray-400 hover:text-white hover:bg-dts-primary-dark/20'
                          }
                        `}
                      >
                        {child.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <NavLink
                to={item.path!}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap
                  ${isActive 
                    ? 'bg-dts-secondary text-white font-medium' 
                    : 'text-gray-300 hover:bg-dts-primary-dark hover:text-white'
                  }
                `}
                title={isSidebarCollapsed ? item.name : undefined}
              >
                <item.icon className={`shrink-0 ${isSidebarCollapsed ? 'w-6 h-6 mx-auto' : 'w-5 h-5'}`} />
                {!isSidebarCollapsed && <span>{item.name}</span>}
              </NavLink>
            )}
          </div>
        ))}
      </nav>

      {/* User Area / Logout */}
      <div className="p-4 border-t border-dts-primary-light mt-auto">
        {!isSidebarCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 bg-dts-primary-dark p-2 rounded-lg w-full">
              <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-sm font-medium">
                A
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Administrador</span>
                <span className="text-xs text-dts-secondary">Súper Admin</span>
              </div>
              <button 
                onClick={handleLogout}
                className="ml-auto text-gray-400 hover:text-white transition-colors" 
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleLogout}
            className="w-full flex justify-center text-gray-400 hover:text-white transition-colors" 
            title="Cerrar sesión"
          >
            <LogOut className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Collapse Toggle */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-dts-secondary text-white rounded-full p-1 shadow-md hover:bg-dts-secondary-dark transition-colors"
      >
        {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
};
