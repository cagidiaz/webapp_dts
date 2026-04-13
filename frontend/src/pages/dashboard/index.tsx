import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { FinancialDashboard } from './components/FinancialDashboard';
import { SalesDashboard } from './components/SalesDashboard';

export const DashboardPage: React.FC = () => {
  const { profile } = useAuthStore();
  const userRole = profile?.roles?.name?.toUpperCase() || '';

  // Role-based routing for Dashboard content
  // ADMIN and DIRECCION see the Financial Dashboard
  // VENTAS sees the Sales Dashboard
  
  if (userRole === 'VENTAS') {
    return <SalesDashboard />;
  }

  // Default to Financial Dashboard for ADMIN, DIRECCION or others
  return <FinancialDashboard />;
};
