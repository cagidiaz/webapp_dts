import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { UpdatesModal } from './UpdatesModal';
import { useUIStore } from '../../store/uiStore';
import { useUpdatesStore } from '../../store/updatesStore';
import { useAuthStore } from '../../store/authStore';

export const MainLayout: React.FC = () => {
  const { theme } = useUIStore();
  const { fetchUpdates } = useUpdatesStore();
  const { profile } = useAuthStore();

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  useEffect(() => {
    const role = profile?.roles?.name;
    if (role) {
      fetchUpdates(role);
    } else {
      fetchUpdates();
    }
  }, [fetchUpdates, profile]);

  return (
    <div className="min-h-screen flex transition-colors duration-300">
      <UpdatesModal />
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
