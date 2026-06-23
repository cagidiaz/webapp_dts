import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getAllCustomers } from '../../../api';
import { formatCurrency } from '../../../api/formatters';
import { 
  Search, Building2, Euro, 
  Clock, AlertCircle, X
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { getCustomerSalespersons } from '../../../api/customers';

interface CrmCustomersProps {
  onSelectCustomer: (clientId: string) => void;
}

export const CrmCustomers: React.FC<CrmCustomersProps> = ({ onSelectCustomer }) => {
  const { profile } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [salespersonFilter, setSalespersonFilter] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);

  const observerTarget = useRef<HTMLTableRowElement>(null);
  const itemsPerPage = 50;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch Salespersons
  const { data: salespersons } = useQuery({
    queryKey: ['customer-salespersons'],
    queryFn: getCustomerSalespersons,
  });

  // Role based filtering
  const userRole = (profile?.roles?.name || '').toUpperCase();
  const isCommercial = userRole === 'VENTAS' || userRole === 'OPERACIONES';

  useEffect(() => {
    if (isCommercial && profile?.code) {
      setSalespersonFilter(profile.code);
    }
  }, [isCommercial, profile]);

  // Fetch customers with infinite scroll
  const { 
    data: customersInfiniteData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading 
  } = useInfiniteQuery({
    queryKey: ['crm-customers-infinite', debouncedSearch, salespersonFilter],
    queryFn: ({ pageParam = 0 }) => getAllCustomers({
      take: itemsPerPage,
      skip: pageParam as number,
      search: debouncedSearch || undefined,
      salesperson: salespersonFilter || undefined,
      sortBy: 'name',
      sortDir: 'asc'
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextSkip = allPages.length * itemsPerPage;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
  });

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const { customers, totalItems, pipelineTotal, pendingReviewCount, totalDebt } = useMemo(() => {
    const allItems = customersInfiniteData?.pages.flatMap(page => page.data) || [];
    const totalCount = customersInfiniteData?.pages[0]?.total || 0;
    const summary = customersInfiniteData?.pages[0]?.summary || { totalSales: 0, newCustomersCount: 0, totalDebt: 0 };
    return {
      customers: allItems,
      totalItems: totalCount,
      pipelineTotal: summary.totalSales || 0,
      pendingReviewCount: summary.newCustomersCount || 0,
      totalDebt: summary.totalDebt || 0,
    };
  }, [customersInfiniteData]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    if (!isCommercial) {
      setSalespersonFilter('');
    }
  };

  // KPIs
  const activeAccountsCount = totalItems;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ventas Totales</span>
            <Euro size={18} className="text-gray-400" />
          </div>
          <div className="text-2xl font-black font-mono text-dts-primary dark:text-white">
            {formatCurrency(pipelineTotal, 0)}
          </div>
          <div className="text-[10px] text-emerald-500 mt-1 font-semibold flex items-center gap-1">
            Facturación acumulada global
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cuentas Activas</span>
            <Building2 size={18} className="text-gray-400" />
          </div>
          <div className="text-2xl font-black font-mono text-dts-secondary">
            {activeAccountsCount}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 font-medium">
            Clientes bajo seguimiento comercial
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pendiente de Revisión</span>
            <AlertCircle size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-500">
            {pendingReviewCount}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 font-medium">
            Nuevas cuentas incorporadas este año
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Deuda Acumulada</span>
            <Clock size={18} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-500">
            {formatCurrency(totalDebt, 0)}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 font-medium">
            Importe total vencido por cobrar
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-surface-card-dark p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="w-full sm:max-w-xs relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder="Buscar por cliente, código, ciudad..." 
            className="block w-full pl-10 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dts-secondary/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Salesperson Filter */}
          {!isCommercial && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-medium">Comercial:</span>
              <select 
                className="block pl-2 pr-8 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dts-secondary/50"
                value={salespersonFilter}
                onChange={(e) => {
                  setSalespersonFilter(e.target.value);
                }}
              >
                <option value="">Todos</option>
                {salespersons?.map(sp => (
                  <option key={sp.code} value={sp.code}>{sp.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-dts-secondary hover:text-dts-secondary-dark cursor-pointer transition-colors"
          >
            Restablecer Filtros
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-surface-card-dark rounded-xl border border-gray-200/60 dark:border-white/5 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-380px)] min-h-[350px]">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="bg-gray-50 dark:bg-dts-primary-dark sticky top-0 z-20 shadow-xs">
              <tr className="border-b border-gray-200/60 dark:border-white/5 bg-gray-50 dark:bg-dts-primary-dark text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3 bg-gray-50 dark:bg-dts-primary-dark">Código</th>
                <th className="px-4 py-3 bg-gray-50 dark:bg-dts-primary-dark">Nombre del Cliente</th>
                <th className="px-4 py-3 bg-gray-50 dark:bg-dts-primary-dark">Ciudad</th>
                <th className="px-4 py-3 bg-gray-50 dark:bg-dts-primary-dark">Comercial</th>
                <th className="px-4 py-3 text-right bg-gray-50 dark:bg-dts-primary-dark">Deuda Pendiente</th>
                <th className="px-4 py-3 text-right bg-gray-50 dark:bg-dts-primary-dark">Ventas Totales</th>
                <th className="px-4 py-3 text-center bg-gray-50 dark:bg-dts-primary-dark">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400 font-medium">
                    Cargando listado...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400 font-medium">
                    No se encontraron empresas para la búsqueda seleccionada.
                  </td>
                </tr>
              ) : (
                customers.map(c => {
                  const isBlocked = c.blocked && c.blocked.trim() !== '';
                  return (
                    <tr 
                      key={c.id}
                      onClick={() => onSelectCustomer(c.client_id)}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-bold font-mono text-xs text-dts-primary dark:text-dts-secondary whitespace-nowrap">
                        {c.client_id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-dts-primary/10 text-dts-primary dark:text-white dark:bg-white/10 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col truncate max-w-[250px]">
                            <span className="font-semibold text-gray-900 dark:text-white text-xs">{c.name}</span>
                            {c.home_page && <span className="text-[10px] text-gray-400">{c.home_page}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {c.city || '---'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {c.salesperson_code || '---'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-xs text-rose-500 whitespace-nowrap">
                        {formatCurrency(c.balance_due_lcy, 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-xs text-dts-primary dark:text-white whitespace-nowrap">
                        {formatCurrency(c.total_sales, 0)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          isBlocked 
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                        }`}>
                          {isBlocked ? 'Bloqueado' : 'Activo'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
              <tr ref={observerTarget}>
                <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                  {isFetchingNextPage ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-dts-secondary border-t-transparent rounded-full animate-spin"></div>
                      <span>Cargando más clientes...</span>
                    </div>
                  ) : hasNextPage ? 'Baja para cargar más' : ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Sync/Create Explanation Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xl p-6 max-w-md w-full relative space-y-4">
            <button 
              onClick={() => setShowSyncModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-dts-primary/10 text-dts-primary dark:text-dts-secondary dark:bg-white/5 flex items-center justify-center rounded-full mx-auto">
                <Building2 size={24} />
              </div>
              <h3 className="text-md font-bold text-dts-primary dark:text-white uppercase tracking-wider">
                Sincronización de Cuentas
              </h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed text-center">
              De acuerdo con las directrices de integridad de datos (**Regla de Oro**), las cuentas de clientes y proveedores deben crearse directamente en **Microsoft Dynamics 365 Business Central**.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center font-semibold">
              Los nuevos registros creados en el ERP se sincronizan de manera automática en la plataforma a través de los flujos de ETL de n8n.
            </p>
            <button 
              onClick={() => setShowSyncModal(false)}
              className="w-full py-2.5 bg-dts-primary dark:bg-dts-secondary/20 hover:brightness-115 text-white dark:text-dts-secondary rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
