import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Sliders, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Landmark
} from 'lucide-react';
import logo from '../../assets/Logodts_white.svg';
import { supabase } from '../../api/supabase';

import { useAuthStore } from '../../store/authStore';

interface NavItem {
  name: string;
  icon: any;
  path?: string;
  children?: { name: string; path: string; roles?: string[] }[];
  roles?: string[]; // Multiple roles supported
}

const navItems: NavItem[] = [
  { 
    name: 'Panel de Control', 
    icon: LayoutDashboard, 
    path: '/dashboard' 
  },
  { 
    name: 'Finanzas', 
    icon: Landmark, 
    roles: ['ADMIN', 'DIRECCION'],
    children: [
      { name: 'Análisis de Balances', path: '/finance/balances' },
      { name: '4 Puntos Clave', path: '/finance/key-points' },
      { name: '20 Ratios', path: '/finance/ratios-table' },
      { name: 'Gráficos de Ratios', path: '/finance/ratios-charts' },
      { name: 'Simulaciones', path: '/finance/simulations' },
    ]
  },
  { 
    name: 'Ventas', 
    icon: TrendingUp, 
    roles: ['ADMIN', 'DIRECCION', 'VENTAS'],
    children: [
      { name: 'Clientes', path: '/sales/customers' },
      { name: 'Productos', path: '/sales/products' },
      { name: 'Pedidos de Venta', path: '/sales/orders' },
      { name: 'Presupuestos', path: '/sales/budgets' },
      { name: 'Ppto. x Product Mgr.', path: '/sales/product-budgets' },
    ]
  },
  { 
    name: 'Configuración', 
    icon: Sliders,
    roles: ['ADMIN'],
    children: [
      { name: 'Gestión de Usuarios', path: '/users' },
      { name: 'Ajustes Generales', path: '/settings' },
    ]
  },
];

export const Sidebar: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const { profile, session } = useAuthStore();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const location = useLocation();
  const firstRender = useRef(true);

  // Autodetect open submenu on mount and when path changes
  useEffect(() => {
    const currentPath = location.pathname;
    const parent = navItems.find(item => 
      item.children?.some(child => currentPath.startsWith(child.path))
    );
    if (parent) {
      setOpenSubmenu(parent.name);
    } else {
      setOpenSubmenu(null);
    }

    // Skip auto-close on first render (mount/refresh)
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    // Auto-close sidebar on route change if it's open (for the floating experience)
    if (!isSidebarCollapsed) {
      toggleSidebar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const userRole = profile?.roles?.name?.toUpperCase() || '';

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(item => {
    // If no roles defined, it's public for authenticated users
    if (!item.roles) return true;
    // Check if user's role is in the allowed list
    return item.roles.includes(userRole);
  });

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

  const handleLinkClick = () => {
    if (!isSidebarCollapsed) {
      toggleSidebar();
    }
  };

  return (
    <aside 
      className={`fixed top-0 left-0 h-screen bg-dts-primary text-white transition-all duration-300 z-50 flex flex-col ${
        isSidebarCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar shadow-2xl'
      }`}
    >
      {/* Logo Area */}
      <div className={`flex items-center h-16 border-b border-dts-primary-light transition-all duration-300 ${isSidebarCollapsed ? 'px-2 justify-center' : 'px-4 space-x-4'}`}>
        <div className={`shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'w-12' : 'w-18'}`}>
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
        {filteredNavItems.map((item) => (
          <div key={item.name}>
            {item.children ? (
              <>
                <button
                  onClick={() => handleSubmenuToggle(item.name)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 whitespace-nowrap relative group
                    ${(openSubmenu === item.name || item.children.some(child => location.pathname === child.path)) 
                      ? 'text-dts-secondary' 
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                    }
                  `}
                >
                  {/* Active Indicator Line */}
                  {(openSubmenu === item.name || item.children.some(child => location.pathname === child.path)) && (
                    <div className="absolute left-0 w-0.5 h-6 bg-dts-secondary rounded-r-full" />
                  )}
                  
                  <item.icon 
                    strokeWidth={1.5} 
                    className={`shrink-0 transition-transform duration-300 ${isSidebarCollapsed ? 'w-6 h-6 mx-auto' : 'w-5 h-5'} ${openSubmenu === item.name ? 'scale-110' : 'group-hover:scale-110'}`} 
                  />
                  {!isSidebarCollapsed && (
                    <>
                      <span className={`flex-1 text-left text-xs font-medium tracking-wide ${openSubmenu === item.name ? 'font-bold' : ''}`}>{item.name}</span>
                      {openSubmenu === item.name ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </>
                  )}
                </button>
                
                {/* Submenu Items */}
                {!isSidebarCollapsed && openSubmenu === item.name && (
                  <div className="mt-0.5 ml-3 pl-6 border-l border-white/5 flex flex-col gap-0.5">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={handleLinkClick}
                        className={({ isActive }) => `
                          block px-3 py-1.5 text-[11px] rounded-md transition-all duration-200
                          ${isActive 
                            ? 'text-dts-secondary font-bold' 
                            : 'text-gray-500 hover:text-white hover:translate-x-1'
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
                onClick={handleLinkClick}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 whitespace-nowrap relative group
                  ${isActive 
                    ? 'text-dts-secondary bg-white/[0.03]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                  }
                `}
                title={isSidebarCollapsed ? item.name : undefined}
              >
                {/* Active Indicator Line */}
                {location.pathname === item.path && (
                  <div className="absolute left-0 w-0.5 h-6 bg-dts-secondary rounded-r-full" />
                )}

                <item.icon 
                  strokeWidth={1.5} 
                  className={`shrink-0 transition-transform duration-300 ${isSidebarCollapsed ? 'w-6 h-6 mx-auto' : 'w-5 h-5'} ${location.pathname === item.path ? 'scale-110' : 'group-hover:scale-110'}`} 
                />
                {!isSidebarCollapsed && <span className={`text-xs font-medium tracking-wide ${location.pathname === item.path ? 'font-bold' : ''}`}>{item.name}</span>}
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
              <div className="w-8 h-8 rounded-full bg-dts-secondary/20 flex items-center justify-center text-sm font-bold text-dts-secondary border border-dts-secondary/30">
                {profile?.firstName?.[0] || 'U'}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">
                  {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : (session?.user?.email || 'Usuario')}
                </span>
                <span className="text-[10px] text-dts-secondary uppercase tracking-tighter font-bold">
                  {profile?.roles?.name || (profile ? 'Usuario' : '...')}
                </span>
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
