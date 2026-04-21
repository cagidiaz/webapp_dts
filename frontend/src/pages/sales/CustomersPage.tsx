import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getAllCustomers, getCustomerSalespersons } from '../../api';
import { formatCurrency, formatNumber } from '../../api/formatters';
import { 
  Search, Users, Euro, TrendingUp, UserPlus,
  ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';
import { InfoPopover, KPISkeleton, TableSkeleton, ExportButton } from '../../components/ui';
import { CustomerDetailDrawer } from './components/CustomerDetailDrawer';
import { type CustomerDataRow } from '../../api/customers';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { exportToXlsx } from '../../utils/exportToXlsx';

export const CustomersPage: React.FC = () => {
  const { profile } = useAuthStore();
  const isSalesRole = profile?.roles?.name?.toUpperCase() === 'VENTAS';

  const { setPageInfo } = useUIStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [blockedFilter, setBlockedFilter] = useState<boolean | undefined>(undefined);
  const [salespersonFilter, setSalespersonFilter] = useState<string>(isSalesRole ? profile?.code || '' : '');
  const [sortBy, setSortBy] = useState<string>('client_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const observerTarget = useRef<HTMLTableRowElement>(null);
  const pageSize = 50;

  useEffect(() => {
    setPageInfo({
      title: 'Cartera de Clientes',
      subtitle: 'Gestión comercial y contable (Ficha de Cliente)',
      icon: <Users size={20} />,
      infoProps: {
        title: 'Cartera de Clientes',
        description: 'Listado exhaustivo de clientes con su situación financiera y comercial actualizada.',
        objective: 'Gestionar el riesgo de crédito y analizar el rendimiento por cliente en tiempo real.',
        source: 'Sincronizado con Navision / Business Central.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  // Drawer states
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDataRow | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sync salesperson filter if profile loads late or changes
  useEffect(() => {
    if (isSalesRole && profile?.code) {
      setSalespersonFilter(profile.code);
    }
  }, [isSalesRole, profile?.code]);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['customers', debouncedSearch, blockedFilter, salespersonFilter, sortBy, sortDir],
    queryFn: ({ pageParam = 0 }) => getAllCustomers({ 
      take: pageSize, skip: pageParam as number, search: debouncedSearch,
      blocked: blockedFilter, salesperson: salespersonFilter, sortBy, sortDir
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextSkip = allPages.length * pageSize;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
  });

  const { data: salespersons = [] } = useQuery<any[]>({ queryKey: ['customerSalespersons'], queryFn: getCustomerSalespersons });

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const { customers, totalCustomers, globalDebt, globalSales, newCustomersCount } = useMemo(() => {
    const allItems = data?.pages.flatMap(page => page.data) || [];
    const totalCount = data?.pages[0]?.total || 0;
    const summary = data?.pages[0]?.summary || { totalDebt: 0, totalSales: 0, newCustomersCount: 0 };
    return { 
      customers: allItems, 
      totalCustomers: totalCount, 
      globalDebt: summary.totalDebt, 
      globalSales: summary.totalSales,
      newCustomersCount: summary.newCustomersCount
    };
  }, [data]);

  const handleSort = (field: string) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="ml-1 opacity-20" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="ml-1 text-dts-secondary" /> : <ChevronDown size={12} className="ml-1 text-dts-secondary" />;
  };

  const handleRowClick = (customer: CustomerDataRow) => {
    setSelectedCustomer(customer);
    setIsDrawerOpen(true);
  };

  const handleExport = async () => {
    const result = await getAllCustomers({
      take: 99999,
      skip: 0,
      search: debouncedSearch,
      blocked: blockedFilter,
      salesperson: salespersonFilter,
      sortBy,
      sortDir,
    });

    const columns = [
      { key: 'client_id', label: 'Código' },
      { key: 'name', label: 'Cliente' },
      { key: 'balance_due_lcy', label: 'Saldo Deuda (€)', format: (v: any) => Number(Number(v).toFixed(2)) },
      { key: 'total_sales', label: 'Ventas Anual (€)', format: (v: any) => Number(Number(v).toFixed(2)) },
      { key: 'salesperson_code', label: 'Vendedor' },
      { key: 'city', label: 'Ciudad' },
      { key: 'country_reg_code', label: 'País' },
    ];

    exportToXlsx(result.data, columns, 'cartera_clientes');
  };

  if (isLoading) return (
    <div className="space-y-8 pb-10">
      <div className="h-28 bg-white dark:bg-surface-card-dark rounded-2xl animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><KPISkeleton /><KPISkeleton /><KPISkeleton /></div>
      <div className="bg-white dark:bg-surface-card-dark rounded-xl h-[500px]"><TableSkeleton rows={15} columns={6} /></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <CustomerDetailDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        customer={selectedCustomer} 
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard 
          title="Total Clientes" 
          value={totalCustomers} 
          type="number" 
          icon={Users} 
          isLoading={isLoading} 
          infoProps={{
            description: "Número total de registros en la base de datos de clientes bajo los filtros aplicados."
          }}
        />
        <KPICard 
          title="Clientes Nuevos" 
          value={newCustomersCount} 
          type="number" 
          icon={UserPlus} 
          isLoading={isLoading} 
          status="success"
          infoProps={{
            description: "Número de clientes creados durante el año en curso bajo los filtros aplicados."
          }}
        />
        <KPICard 
          title="Deuda Total" 
          value={globalDebt} 
          type="currency" 
          icon={Euro} 
          status={globalDebt > 0 ? 'danger' : 'success'} 
          isLoading={isLoading} 
          infoProps={{
            description: "Sumatorio del saldo pendiente de cobro de todos los clientes seleccionados.",
            formulas: "Saldo LCY (Local Currency)"
          }}
        />
        <KPICard 
          title="Ventas Anuales" 
          value={globalSales} 
          type="currency" 
          icon={TrendingUp} 
          isLoading={isLoading} 
          infoProps={{
            description: "Total de facturación acumulada en el ejercicio actual para estos clientes."
          }}
        />
      </div>

      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col h-[calc(100vh-320px)] min-h-[450px]">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-transparent">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="w-full max-w-md relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Search className="h-4 w-4" /></div>
              <input type="text" className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dts-secondary/50 sm:text-sm" placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-3">
              <select value={blockedFilter?.toString() || ''} onChange={(e) => setBlockedFilter(e.target.value === '' ? undefined : e.target.value === 'true')} className="text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark rounded-md px-3 py-1 outline-none font-bold uppercase"><option value="">Estado</option><option value="false">Activos</option><option value="true">Bloqueados</option></select>
              {!isSalesRole && (
                <select value={salespersonFilter} onChange={(e) => setSalespersonFilter(e.target.value)} className="text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark rounded-md px-3 py-1 outline-none font-bold uppercase"><option value="">Vendedor</option>{salespersons.map(sp => (<option key={sp.code} value={sp.code}>{sp.code} - {sp.name}</option>))}</select>
              )}
              <ExportButton onExport={handleExport} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg">
              <tr>
                {[{ label: 'Código', key: 'client_id' }, { label: 'Cliente', key: 'name' }, { label: 'Saldo Deuda', key: 'balance_due_lcy', align: 'right' }, { label: 'Ventas Anual', key: 'total_sales', align: 'right' }, { label: 'Vend.', key: 'salesperson_code' }, { label: 'Ciudad/País', key: 'city' }].map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)} className={`px-6 py-4 font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:bg-white/10 transition-colors ${col.align === 'right' ? 'text-right' : ''}`}>
                    <div className={`flex items-center ${col.align === 'right' ? 'justify-end' : 'justify-start'}`}>{col.label}{getSortIcon(col.key)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {customers.map(customer => {
                const isNew = customer.created_at && new Date(customer.created_at).getFullYear() === new Date().getFullYear();
                return (
                  <tr 
                    key={customer.id} 
                    onClick={() => handleRowClick(customer)}
                    className={`cursor-pointer transition-colors ${isNew ? 'bg-emerald-50/50 dark:bg-emerald-500/5 hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                  >
                    <td className={`px-6 py-3 font-bold font-mono text-xs ${isNew ? 'text-emerald-600 dark:text-emerald-400' : 'text-dts-primary dark:text-dts-secondary'}`}>{customer.client_id}</td>
                    <td className="px-6 py-3 font-medium text-gray-700 dark:text-gray-200"><div className="flex items-center gap-2">{customer.name}{isNew && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 animate-pulse uppercase">Nuevo</span>}</div></td>
                    <td className={`px-6 py-3 text-right font-mono font-bold ${Number(customer.balance_due_lcy) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>{formatCurrency(Number(customer.balance_due_lcy), 0)}</td>
                    <td className="px-6 py-3 text-right font-mono font-bold">{formatCurrency(Number(customer.total_sales), 0)}</td>
                    <td className="px-6 py-3"><span className="bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded text-[10px] font-bold">{customer.salesperson_code || '---'}</span></td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{customer.city || '---'}</span>
                        {customer.country_reg_code && (
                          <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">{customer.country_reg_code}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr ref={observerTarget}><td colSpan={6} className="py-8 text-center text-gray-400 text-xs">{isFetchingNextPage ? 'Cargando más clientes...' : hasNextPage ? 'Baja para cargar más' : ''}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, type = 'number', icon: Icon, isLoading, status, infoProps }: any) => {
  if (isLoading) return <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-gray-100 dark:border-gray-800 h-28 animate-pulse"></div>;
  const colorClass = status === 'success' ? 'text-emerald-500' : status === 'danger' ? 'text-red-500' : 'text-dts-primary dark:text-white';
  const formattedValue = type === 'currency' ? formatCurrency(value, 0) : formatNumber(value, 0);
  return (
    <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-card-hover group">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{title}</span>
          {infoProps && (
            <InfoPopover 
              title={title} 
              description={infoProps.description} 
              formulas={infoProps.formulas} 
              iconSize={12}
              className="text-gray-300 group-hover:text-dts-secondary transition-colors"
            />
          )}
        </div>
        <Icon size={18} className="text-gray-400 group-hover:text-dts-secondary transition-colors" />
      </div>
      <div className={`text-2xl font-black font-mono ${colorClass}`}>{formattedValue}</div>
    </div>
  );
};
