import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { FinancialDashboard } from './components/FinancialDashboard';
import { SalesDashboard } from './components/SalesDashboard';

export const DashboardPage: React.FC = () => {
  const { profile } = useAuthStore();
  const { hash, key } = useLocation();
  const userRole = profile?.roles?.name?.toUpperCase() || '';

  React.useEffect(() => {
    if (hash !== '#agenda-crm') return;
    const scroll = () => { const agenda = document.getElementById('agenda-crm'); if (!agenda) return false; agenda.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true; };
    if (scroll()) return;
    const observer = new MutationObserver(() => { if (scroll()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 10000);
    return () => { observer.disconnect(); window.clearTimeout(timeout); };
  }, [hash, key]);

  // Role-based routing for Dashboard content
  // ADMIN and DIRECCION see the Financial Dashboard
  // VENTAS, OPERACIONES, PRODUCCION and TESTER see the Sales Dashboard
  
  if (userRole === 'VENTAS' || userRole === 'OPERACIONES' || userRole === 'PRODUCCION' || userRole === 'TESTER') {
    return <SalesDashboard />;
  }

  // Default to Financial Dashboard for ADMIN, DIRECCION or others
  return <FinancialDashboard />;
};
