import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/shared';
import { DashboardPage } from './pages/dashboard';
import { LoginPage } from './pages/login';
import { UsersPage } from './pages/users';
import { 
  BalancesPage, 
  KeyPointsPage, 
  RatiosTablePage, 
  RatiosChartsPage,
  SimulationsPage
} from './pages/finance';
import { CustomersPage, ProductsPage, SalesBudgetPage, SalesOrdersPage } from './pages/sales';

import { supabase } from './api/supabase';
import { useAuthStore } from './store/authStore';

// Initialize React Query client
const queryClient = new QueryClient();

/**
 * Ensures that when navigating to a new route, 
 * the window scrolls back to the top automatically.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Placeholder pages for routes
const SettingsPage = () => <div className="p-8"><h1 className="text-2xl font-medium">Settings</h1></div>;

const ProtectedRoute = () => {
  const { session } = useAuthStore();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

const RoleGuard = ({ allowedRoles, children }: { allowedRoles: string[], children: React.ReactNode }) => {
  const { profile } = useAuthStore();
  const userRole = profile?.roles?.name?.toUpperCase() || '';
  
  if (!profile) return null; // Wait for profile to load
  
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  const { setSession } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) {
        localStorage.setItem('access_token', session.access_token);
      } else {
        localStorage.removeItem('access_token');
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  if (loading) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop /> {/* Reset scroll position on route change */}
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Modulo Finanzas: ADMIN y DIRECCION */}
              <Route path="finance" element={<RoleGuard allowedRoles={['ADMIN', 'DIRECCION']}><Outlet /></RoleGuard>}>
                <Route index element={<Navigate to="balances" replace />} />
                <Route path="balances" element={<BalancesPage />} />
                <Route path="key-points" element={<KeyPointsPage />} />
                <Route path="ratios-table" element={<RatiosTablePage />} />
                <Route path="ratios-charts" element={<RatiosChartsPage />} />
                <Route path="simulations" element={<SimulationsPage />} />
              </Route>

              {/* Modulo Ventas: Todos los roles (ADMIN, DIRECCION, VENTAS) */}
              <Route path="sales" element={<RoleGuard allowedRoles={['ADMIN', 'DIRECCION', 'VENTAS']}><Outlet /></RoleGuard>}>
                <Route index element={<Navigate to="customers" replace />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="orders" element={<SalesOrdersPage />} />
                <Route path="budgets" element={<SalesBudgetPage />} />

              </Route>
              
              <Route path="users" element={<RoleGuard allowedRoles={['ADMIN']}><UsersPage /></RoleGuard>} />
              <Route path="settings" element={<RoleGuard allowedRoles={['ADMIN']}><SettingsPage /></RoleGuard>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
