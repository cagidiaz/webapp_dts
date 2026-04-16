import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getAllSalesOrders } from '../../api/salesOrders';
import { formatCurrency, formatNumber } from '../../api/formatters';
import { 
  Search, Package, Euro, TrendingUp, Calendar, DollarSign,
  ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';


import { KPISkeleton, TableSkeleton, InfoPopover } from '../../components/ui';


import { useUIStore } from '../../store/uiStore';


export const SalesOrdersPage: React.FC = () => {
  const { setPageInfo } = useUIStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [customerFilter] = useState('');
  const [sortBy, setSortBy] = useState('document_number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const observerTarget = useRef<HTMLTableRowElement>(null);
  const pageSize = 50;

  useEffect(() => {
    setPageInfo({
      title: 'Pedidos de Venta',
      subtitle: 'Seguimiento de pedidos abiertos y pendientes',
      icon: <Package size={20} />,
      infoProps: {
        title: 'Pedidos de Venta',
        description: 'Listado de pedidos de venta abiertos con cantidades pendientes de envío y facturación.',
        objective: 'Monitorizar el cumplimiento de pedidos y las necesidades de stock.',
        source: 'Sincronizado con Navision / Business Central.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['sales-orders', debouncedSearch, customerFilter, sortBy, sortDir],
    queryFn: ({ pageParam = 0 }) => getAllSalesOrders({ 
      take: pageSize, 
      skip: pageParam as number, 
      search: debouncedSearch,
      customerCode: customerFilter,
      sortBy,
      sortDir
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextSkip = allPages.length * pageSize;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
  });

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const getSortIcon = (key: string) => {
    if (sortBy !== key) return <ArrowUpDown size={12} className="ml-1 opacity-20 group-hover:opacity-100" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="ml-1 text-dts-secondary" /> : <ChevronDown size={12} className="ml-1 text-dts-secondary" />;
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const { orders, totalOrders, totalAmount, totalOutstanding, totalEnviadoNoFacturado } = useMemo(() => {

    const allItems = data?.pages.flatMap(page => page.data) || [];
    
    // Deduplicate items by ID to avoid duplicate key errors in infinite scroll
    const seen = new Set();
    const uniqueOrders = allItems.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });


    const summary = data?.pages[0]?.summary || { 
      totalOrders: 0,
      totalAmount: 0, 
      totalOutstandingUnits: 0, 
      totalEnviadoNoFacturado: 0 
    };
    
    return { 
      orders: uniqueOrders, 
      totalOrders: summary.totalOrders, // Ahora usamos el conteo de pedidos únicos
      totalAmount: summary.totalAmount, 
      totalOutstanding: summary.totalOutstandingUnits, 
      totalEnviadoNoFacturado: summary.totalEnviadoNoFacturado
    };

  }, [data]);


  if (isLoading) return (
    <div className="space-y-8 pb-10">
      <div className="h-28 bg-white dark:bg-surface-card-dark rounded-2xl animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><KPISkeleton /><KPISkeleton /><KPISkeleton /></div>
      <div className="bg-white dark:bg-surface-card-dark rounded-xl h-[500px]"><TableSkeleton rows={15} columns={6} /></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Pedidos" 
          value={totalOrders} 
          type="number" 
          icon={Package} 
          isLoading={isLoading} 
          infoProps={{
            description: "Número total de líneas de pedido de venta abiertas y activas.",
            source: "Sincronizado desde Navision / Business Central."
          }}
        />
        <KPICard 
          title="Cartera Total" 
          value={totalAmount} 
          type="currency" 
          icon={Euro} 
          isLoading={isLoading} 
          infoProps={{
            description: "Valor económico total de la mercancía pendiente de procesar en la cartera de pedidos.",
            formulas: "Sumatorio(Outstanding Quantity * Unit Price)"
          }}
        />
        <KPICard 
          title="Cant. Pendiente" 
          value={totalOutstanding} 
          type="number" 
          icon={TrendingUp} 
          isLoading={isLoading} 
          infoProps={{
            description: "Total de unidades físicas que aún no han sido ni enviadas ni facturadas.",
            formulas: "Sumatorio(Outstanding Quantity)"
          }}
        />
        <KPICard 
          title="Pend. Facturar" 
          value={totalEnviadoNoFacturado} 
          type="currency" 
          icon={DollarSign} 
          status="warning"
          isLoading={isLoading} 
          infoProps={{
            description: "Importe de la mercancía que ya ha sido entregada al cliente pero que está pendiente de emisión de factura.",
            formulas: "Sumatorio(Qty. Shipped Not Invoiced * Unit Price)"
          }}
        />

      </div>


      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col h-[calc(100vh-320px)] min-h-[450px]">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-transparent">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="w-full max-w-md relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Search className="h-4 w-4" /></div>
              <input 
                type="text" 
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dts-secondary/50 sm:text-sm" 
                placeholder="Buscar pedido o descripción..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg">
              <tr>
                {[
                  { label: 'Documento', key: 'document_number' },
                  { label: 'Fecha', key: 'posting_date' },
                  { label: 'Cliente', key: 'customer_code' },
                  { label: 'Producto', key: 'item_code' },
                  { label: 'Cant.', key: 'quantity', align: 'right' },
                  { label: 'Pendiente', key: 'outstanding_quantity', align: 'right' },
                  { label: 'Importe', key: 'line_amount', align: 'right' }
                ].map(col => (
                  <th 
                    key={col.key} 
                    className={`px-6 py-4 font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:bg-white/10 ${col.align === 'right' ? 'text-right' : ''}`}
                    onClick={() => handleSort(col.key)}
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
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-3 font-bold font-mono text-xs text-dts-primary dark:text-dts-secondary">{order.document_number}</td>
                  <td className="px-6 py-3 flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar size={12} className="text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {order.posting_date ? new Date(order.posting_date).toLocaleDateString() : '---'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-white uppercase text-xs">{order.customer?.name || '---'}</span>
                      <span className="text-[10px] text-gray-500 font-mono tracking-wider">{order.customer_code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-700 dark:text-gray-300 text-xs">{order.item_code}</span>
                      <span className="text-[10px] text-gray-400 truncate max-w-[200px]">{order.description || '---'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right font-mono font-bold">{formatNumber(Number(order.quantity), 0)}</td>
                  <td className={`px-6 py-3 text-right font-mono font-bold ${Number(order.outstanding_quantity) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {formatNumber(Number(order.outstanding_quantity), 0)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono font-bold text-dts-primary dark:text-white">{formatCurrency(Number(order.line_amount), 0)}</td>
                </tr>
              ))}
              <tr ref={observerTarget}>
                <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                  {isFetchingNextPage ? 'Cargando más pedidos...' : hasNextPage ? 'Baja para cargar más' : 'No hay más registros'}
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

