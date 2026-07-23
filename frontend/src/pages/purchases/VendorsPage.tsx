import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getAllVendors, type VendorDataRow } from '../../api/vendors';
import { formatCurrency, formatNumber } from '../../api/formatters';
import {
  Search, Building2, Wallet, AlertTriangle, CreditCard, ShieldAlert,
  ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';
import { InfoPopover, KPISkeleton, TableSkeleton, ExportButton } from '../../components/ui';
import { VendorDetailDrawer } from './components/VendorDetailDrawer';
import { useUIStore } from '../../store/uiStore';
import { exportToXlsx } from '../../utils/exportToXlsx';

export const VendorsPage: React.FC = () => {
  const { setPageInfo } = useUIStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [blockedFilter, setBlockedFilter] = useState<boolean | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('vendor_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const observerTarget = useRef<HTMLTableRowElement>(null);
  const pageSize = 50;

  useEffect(() => {
    setPageInfo({
      title: 'Cartera de Proveedores',
      subtitle: 'Gestión de compras, condiciones de pago y análisis de acreedores',
      icon: <Building2 size={20} />,
      infoProps: {
        title: 'Cartera de Proveedores',
        description: 'Listado completo de proveedores con estado financiero, saldos pendientes, vencidos y condiciones comerciales.',
        objective: 'Controlar el riesgo de pagos a proveedores y gestionar eficientemente las compras.',
        source: 'Sincronizado con Navision / Business Central.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  // Drawer states
  const [selectedVendor, setSelectedVendor] = useState<VendorDataRow | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['vendors', debouncedSearch, blockedFilter, sortBy, sortDir],
    queryFn: ({ pageParam = 0 }) => getAllVendors({
      take: pageSize,
      skip: pageParam as number,
      search: debouncedSearch,
      blocked: blockedFilter,
      sortBy,
      sortDir
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextSkip = allPages.length * pageSize;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const { vendors, totalVendors, globalBalance, globalBalanceDue, globalPayments, blockedCount } = useMemo(() => {
    const allItems = data?.pages.flatMap(page => page.data) || [];
    const totalCount = data?.pages[0]?.total || 0;
    const summary = data?.pages[0]?.summary || { totalBalance: 0, totalBalanceDue: 0, totalPayments: 0, blockedCount: 0 };
    return {
      vendors: allItems,
      totalVendors: totalCount,
      globalBalance: summary.totalBalance,
      globalBalanceDue: summary.totalBalanceDue,
      globalPayments: summary.totalPayments,
      blockedCount: summary.blockedCount,
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

  const handleRowClick = (vendor: VendorDataRow) => {
    setSelectedVendor(vendor);
    setIsDrawerOpen(true);
  };

  const handleExport = async () => {
    const result = await getAllVendors({
      take: 99999,
      skip: 0,
      search: debouncedSearch,
      blocked: blockedFilter,
      sortBy,
      sortDir,
    });

    const columns = [
      { key: 'vendor_id', label: 'Código' },
      { key: 'name', label: 'Proveedor' },
      { key: 'vat_no', label: 'NIF/CIF' },
      { key: 'city', label: 'Ciudad' },
      { key: 'county', label: 'Provincia' },
      { key: 'phone_no', label: 'Teléfono' },
      { key: 'contact', label: 'Contacto' },
      { key: 'payment_terms_code', label: 'Términos Pago' },
      { key: 'payment_method_code', label: 'Forma Pago' },
      { key: 'balance_lcy', label: 'Saldo Pendiente (€)', format: (v: any) => Number(Number(v).toFixed(2)) },
      { key: 'balance_due_lcy', label: 'Saldo Vencido (€)', format: (v: any) => Number(Number(v).toFixed(2)) },
      { key: 'payments_lcy', label: 'Pagos Acumulados (€)', format: (v: any) => Number(Number(v).toFixed(2)) },
      { key: 'blocked', label: 'Bloqueado' },
    ];

    exportToXlsx(result.data, columns, 'cartera_proveedores');
  };

  if (isLoading && !data) return (
    <div className="space-y-8 pb-10">
      <div className="h-28 bg-white dark:bg-surface-card-dark rounded-2xl animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6"><KPISkeleton /><KPISkeleton /><KPISkeleton /><KPISkeleton /></div>
      <div className="bg-white dark:bg-surface-card-dark rounded-xl h-125"><TableSkeleton rows={15} columns={6} /></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <VendorDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        vendor={selectedVendor}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard
          title="Total Proveedores"
          value={totalVendors}
          type="number"
          icon={Building2}
          isLoading={isLoading}
          infoProps={{
            description: "Número total de proveedores en catálogo bajo los filtros aplicados."
          }}
        />
        <KPICard
          title="Saldo Pendiente Total"
          value={globalBalance}
          type="currency"
          icon={Wallet}
          isLoading={isLoading}
          infoProps={{
            description: "Sumatorio del saldo pendiente de pago acumulado a proveedores.",
            formulas: "Balance LCY"
          }}
        />
        <KPICard
          title="Saldo Vencido Total"
          value={globalBalanceDue}
          type="currency"
          icon={AlertTriangle}
          status={globalBalanceDue > 0 ? 'danger' : 'success'}
          isLoading={isLoading}
          infoProps={{
            description: "Suma de los saldos con fecha de pago ya vencida.",
            formulas: "Balance Due LCY"
          }}
        />
        <KPICard
          title="Pagos / Compras Acumuladas"
          value={globalPayments}
          type="currency"
          icon={CreditCard}
          isLoading={isLoading}
          infoProps={{
            description: "Volumen histórico acumulado de compras y pagos procesados."
          }}
        />
      </div>

      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col h-[calc(100vh-320px)] min-h-112,5">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-transparent">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="w-full max-w-md relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dts-secondary/50 sm:text-sm"
                placeholder="Buscar proveedor por código, nombre, NIF, ciudad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={blockedFilter?.toString() || ''}
                onChange={(e) => setBlockedFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
                className="text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark rounded-md px-3 py-1 outline-none font-bold uppercase"
              >
                <option value="">Todos los Estados</option>
                <option value="false">Activos</option>
                <option value="true">Bloqueados ({blockedCount})</option>
              </select>
              <ExportButton onExport={handleExport} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg">
              <tr>
                {[
                  { label: 'Código', key: 'vendor_id' },
                  { label: 'Proveedor', key: 'name' },
                  { label: 'NIF/CIF', key: 'vat_no' },
                  { label: 'Ciudad / Prov.', key: 'city' },
                  { label: 'Términos Pago', key: 'payment_terms_code' },
                  { label: 'Forma Pago', key: 'payment_method_code' },
                  { label: 'Saldo Pendiente', key: 'balance_lcy', align: 'right' },
                  { label: 'Saldo Vencido', key: 'balance_due_lcy', align: 'right' },
                  { label: 'Compras Acum.', key: 'payments_lcy', align: 'right' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-4 py-3.5 font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:bg-white/10 transition-colors ${col.align === 'right' ? 'text-right' : ''}`}
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
              {vendors.map(vendor => {
                const isBlocked = vendor.blocked && vendor.blocked.trim() !== '' && vendor.blocked !== 'FALSE';
                return (
                  <tr
                    key={vendor.id}
                    onClick={() => handleRowClick(vendor)}
                    className={`cursor-pointer transition-colors ${isBlocked ? 'bg-red-50/30 dark:bg-red-950/10 hover:bg-red-100/40 dark:hover:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                  >
                    <td className="px-4 py-3 font-bold font-mono text-xs text-dts-primary dark:text-dts-secondary">
                      {vendor.vendor_id}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-55" title={vendor.name}>{vendor.name}</span>
                        {isBlocked && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 uppercase flex items-center gap-0.5">
                            <ShieldAlert size={10} /> Bloqueado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {vendor.vat_no || '---'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-gray-700 dark:text-gray-300 font-medium text-xs truncate max-w-35">{vendor.city || '---'}</span>
                        {vendor.county && (
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider">{vendor.county}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 dark:text-gray-300">
                        {vendor.payment_terms_code || '---'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 dark:text-gray-300">
                        {vendor.payment_method_code || '---'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-dts-primary dark:text-white text-xs">
                      {formatCurrency(Number(vendor.balance_lcy), 0)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold text-xs ${Number(vendor.balance_due_lcy) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                      {formatCurrency(Number(vendor.balance_due_lcy), 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-dts-secondary text-xs">
                      {formatCurrency(Number(vendor.payments_lcy), 0)}
                    </td>
                  </tr>
                );
              })}
              <tr ref={observerTarget}>
                <td colSpan={9} className="py-8 text-center text-gray-400 text-xs">
                  {isFetchingNextPage ? 'Cargando más proveedores...' : hasNextPage ? 'Baja para cargar más' : ''}
                </td>
              </tr>
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
