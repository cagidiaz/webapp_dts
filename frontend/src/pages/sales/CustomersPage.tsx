import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getAllCustomers, getCustomerSalespersons } from '../../api';
import { formatCurrency, formatNumber } from '../../api/formatters';
import { 
  Search, 
  Users, 
  Euro, 
  TrendingUp, 
  AlertCircle, 
  Loader2, 
  Filter, 
  X,
  ArrowUpDown,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { InfoPopover, KPISkeleton, TableSkeleton } from '../../components/ui';

export const CustomersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
   const [blockedFilter, setBlockedFilter] = useState<boolean | undefined>(undefined);
   const [salespersonFilter, setSalespersonFilter] = useState<string>('');
  
  // Sort State
  const [sortBy, setSortBy] = useState<string>('client_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const observerTarget = useRef<HTMLTableRowElement>(null);
  const pageSize = 50;

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

   const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    isFetching
  } = useInfiniteQuery({
    queryKey: ['customers', debouncedSearch, blockedFilter, salespersonFilter, sortBy, sortDir],
    queryFn: ({ pageParam = 0 }) => getAllCustomers({ 
      take: pageSize, 
      skip: pageParam, 
      search: debouncedSearch,
      blocked: blockedFilter,
      salesperson: salespersonFilter,
      sortBy,
      sortDir
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextSkip = allPages.length * pageSize;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
  });

  // Fetch unique salespersons from server
  const { data: salespersons = [] } = useQuery({ 
    queryKey: ['customerSalespersons'], 
    queryFn: getCustomerSalespersons 
  });

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Derived data
  const { customers, totalCustomers, globalDebt, globalSales } = useMemo(() => {
    const allItems = data?.pages.flatMap(page => page.data) || [];
    const totalCount = data?.pages[0]?.total || 0;
    const summary = data?.pages[0]?.summary || { totalDebt: 0, totalSales: 0 };
    return { 
      customers: allItems, 
      totalCustomers: totalCount,
      globalDebt: summary.totalDebt,
      globalSales: summary.totalSales
    };
  }, [data]);

   const isFiltered = debouncedSearch !== '' || blockedFilter !== undefined || salespersonFilter !== '';

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="ml-1 opacity-20 group-hover:opacity-100 transition-opacity" />;
    return sortDir === 'asc' 
      ? <ChevronUp size={12} className="ml-1 text-dts-secondary" /> 
      : <ChevronDown size={12} className="ml-1 text-dts-secondary" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="h-28 bg-white dark:bg-surface-card-dark rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPISkeleton />
          <KPISkeleton />
          <KPISkeleton />
        </div>
        <div className="bg-white dark:bg-surface-card-dark rounded-xl h-[500px]">
          <TableSkeleton rows={15} columns={6} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">
              Error al cargar la lista de clientes: {(error as Error)?.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="text-dts-secondary" size={24} />
            <h1 className="text-2xl font-medium text-dts-primary dark:text-white uppercase tracking-tight">Catálogo de Clientes</h1>
            <InfoPopover 
              title="Catálogo de Clientes"
              description="Listado completo de clientes sincronizado desde el ERP, incluyendo ventas acumuladas del ejercicio actual."
              objective="Consultar información comercial, estados de bloqueo y ventas del año en curso (YTD) de forma rápida."
              source="Tabla: 'customers' (Datos BC)."
              iconSize={20}
            />
          </div>
          <p className="text-sm text-gray-500 font-medium">Gestión comercial y contable (Scroll Infinito)</p>
        </div>
        <div className="flex flex-col items-end">
           <div className="text-xs text-gray-400 bg-gray-100 dark:bg-dts-primary-dark/30 px-3 py-1.5 rounded-full font-medium border border-gray-200/50 dark:border-white/5">
              Total registros: {formatNumber(totalCustomers || 0, 0)}
           </div>
           <div className="text-[10px] text-gray-400 mt-1 italic">
              Visualizando: {customers.length}
           </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl shadow-card border border-gray-100 dark:border-gray-800 transition-all hover:shadow-card-hover group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 dark:bg-dts-primary-dark/50 text-dts-primary dark:text-dts-secondary rounded-lg group-hover:bg-dts-secondary/10 transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Clientes{isFiltered ? ' (Filtrado)' : ''}
              </p>
              <h3 className="text-2xl font-bold text-dts-primary dark:text-white">
                {formatNumber(totalCustomers || 0, 0)}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl shadow-card border border-gray-100 dark:border-gray-800 transition-all hover:shadow-card-hover group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 dark:bg-dts-primary-dark/50 text-amber-600 dark:text-amber-400 rounded-lg group-hover:bg-amber-500/10 transition-colors">
              <Euro className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Deuda Total{isFiltered ? ' (Filtrada)' : ''}
              </p>
              <h3 className="text-2xl font-bold text-dts-primary dark:text-white">
                {formatCurrency(globalDebt)}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl shadow-card border border-gray-100 dark:border-gray-800 transition-all hover:shadow-card-hover group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 dark:bg-dts-primary-dark/50 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-500/10 transition-colors">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Ventas Totales Año{isFiltered ? ' (Filtradas)' : ''}
              </p>
              <h3 className="text-2xl font-bold text-dts-primary dark:text-white">
                {formatCurrency(globalSales)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col h-[calc(100vh-320px)] min-h-[450px]">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-transparent space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="w-full max-w-md relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-dts-secondary text-gray-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dts-secondary/50 sm:text-sm transition-all shadow-sm"
                placeholder="Buscar por nombre o número de cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isFetching && (
                <div className="absolute inset-y-0 right-3 flex items-center">
                  <Loader2 className="animate-spin h-4 w-4 text-dts-secondary" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
               {(debouncedSearch || blockedFilter !== undefined || salespersonFilter !== '' || sortBy !== 'client_id' || sortDir !== 'desc') && (
                 <button 
                     onClick={() => { 
                       setSearchTerm(''); 
                       setBlockedFilter(undefined); 
                        setSalespersonFilter('');
                       setSortBy('client_id'); 
                       setSortDir('desc'); 
                     }}
                   className="text-xs flex items-center gap-1.5 text-dts-secondary hover:text-dts-secondary-dark font-semibold uppercase tracking-wider transition-colors"
                 >
                   <X size={12} /> Limpiar Filtros y Orden
                 </button>
               )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Filtros:</span>
            </div>
            
            <select
              value={blockedFilter === undefined ? '' : blockedFilter.toString()}
              onChange={(e) => {
                const val = e.target.value;
                setBlockedFilter(val === '' ? undefined : val === 'true');
              }}
              className="text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark dark:text-gray-200 rounded-md py-1 border focus:ring-dts-secondary focus:border-dts-secondary outline-none pr-8"
            >
              <option value="">Todos los Estados</option>
              <option value="false">Activos (Sin Bloqueo)</option>
              <option value="true">Bloqueados</option>
            </select>

            <select
              value={salespersonFilter}
              onChange={(e) => setSalespersonFilter(e.target.value)}
              className="text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark dark:text-gray-200 rounded-md py-1 border focus:ring-dts-secondary focus:border-dts-secondary outline-none pr-8"
            >
              <option value="">Todos los Vendedores</option>
              {salespersons.map(sp => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-dts-primary text-white sticky top-0 z-10 shadow-sm">
              <tr>
                {[
                  { label: 'Cód. Cliente', key: 'client_id', align: 'left' },
                  { label: 'Nombre Razón Social', key: 'name', align: 'left' },
                  { label: 'Saldo Deuda', key: 'balance_due_lcy', align: 'right' },
                  { label: 'Ventas Año Actual', key: 'total_sales', align: 'right' },
                  { label: 'Vendedor', key: 'salesperson_code', align: 'left' },
                  { label: 'Ciudad/País', key: 'city', align: 'left' },
                ].map((col) => (
                  <th 
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-6 py-3 font-medium uppercase tracking-wider border-b border-dts-primary-light/10 whitespace-nowrap text-[11px] cursor-pointer group hover:bg-dts-primary-light/10 transition-colors ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    <div className={`flex items-center ${col.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                      {col.label}
                      {getSortIcon(col.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {customers.map((customer) => (
                <tr key={customer.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-6 py-3 font-semibold text-dts-primary dark:text-dts-secondary font-mono">
                    {customer.client_id}
                  </td>
                  <td className="px-6 py-3 text-gray-700 dark:text-gray-200">
                    <div className="flex items-center gap-2 font-medium">
                      {customer.name}
                      {customer.blocked && customer.blocked.toString().trim() !== '' && customer.blocked.toString().trim() !== ' ' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                          Bloqueado
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`px-6 py-3 text-right font-mono font-medium ${Number(customer.balance_due_lcy) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                    {formatCurrency(Number(customer.balance_due_lcy))}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-700 dark:text-gray-200 font-mono font-medium">
                    {formatCurrency(Number(customer.total_sales))}
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                    <span className="bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded text-[10px]">
                      {customer.salesperson_code || '---'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400 text-xs">
                    {customer.city ? `${customer.city}, ${customer.country_reg_code || ''}` : '---'}
                  </td>
                </tr>
              ))}
              
              {/* Observer Target */}
              <tr ref={observerTarget}>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  {isFetchingNextPage ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin w-4 h-4 text-dts-secondary" />
                      <span className="text-xs uppercase font-bold tracking-widest">Cargando más registros...</span>
                    </div>
                  ) : hasNextPage ? (
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-30">Desliza para cargar más</span>
                  ) : customers.length > 0 ? (
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-30">Fin del catálogo</span>
                  ) : !isLoading && (
                    <div className="flex flex-col items-center justify-center py-10">
                       <p className="text-sm font-medium">No se han encontrado registros</p>
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
