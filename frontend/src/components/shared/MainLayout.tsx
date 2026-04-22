import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useUIStore } from '../../store/uiStore';

export const MainLayout: React.FC = () => {
  const { theme } = useUIStore();

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  return (
    <div className="min-h-screen flex transition-colors duration-300">
      <Sidebar />
      <TopBar />
      <main 
        className="flex-1 transition-all duration-300 pt-topbar"
        style={{ marginLeft: 'var(--spacing-sidebar-collapsed)' }}
      >
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
