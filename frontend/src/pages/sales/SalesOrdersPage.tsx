import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getAllSalesOrders } from '../../api/salesOrders';
import { formatCurrency, formatNumber } from '../../api/formatters';
import { 
  Search, Package, Euro, TrendingUp, Calendar, DollarSign,
  ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';
import { KPISkeleton, TableSkeleton, InfoPopover, ExportButton } from '../../components/ui';
import { useUIStore } from '../../store/uiStore';
import { exportToXlsx } from '../../utils/exportToXlsx';


export const SalesOrdersPage: React.FC = () => {
  const { setPageInfo } = useUIStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [customerFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
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
    queryKey: ['sales-orders', debouncedSearch, customerFilter, typeFilter, sortBy, sortDir],
    queryFn: ({ pageParam = 0 }) => getAllSalesOrders({ 
      take: pageSize, 
      skip: pageParam as number, 
      search: debouncedSearch,
      customerCode: customerFilter,
      type: typeFilter || undefined,
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

  const handleExport = async () => {
    const result = await getAllSalesOrders({
      take: 99999,
      skip: 0,
      search: debouncedSearch,
      customerCode: customerFilter,
      type: typeFilter || undefined,
      sortBy,
      sortDir,
    });

    const columns = [
      { key: 'document_number', label: 'Documento' },
      { key: 'posting_date', label: 'Fecha', format: (v: any) => v ? new Date(v).toLocaleDateString('es-ES') : '' },
      { key: 'type', label: 'Tipo' },
      { key: 'customer_code', label: 'Cód. Cliente' },
      { key: 'customerName', label: 'Cliente', format: (_v: any, row: any) => row.customer?.name || '' },
      { key: 'item_code', label: 'Producto/Cuenta' },
      { key: 'description', label: 'Descripción' },
      { key: 'unit_of_measure', label: 'UM' },
      { key: 'quantity', label: 'Cantidad', format: (v: any) => Number(Number(v).toFixed(0)) },
      { key: 'outstanding_quantity', label: 'Pendiente', format: (v: any) => Number(Number(v).toFixed(0)) },
      { key: 'qty_shipped_not_invoiced', label: 'Env. Fact.', format: (v: any) => Number(Number(v).toFixed(0)) },
      { key: 'line_amount', label: 'Importe (€)', format: (v: any) => Number(Number(v).toFixed(2)) },
      { key: 'shipment_date', label: 'F. Envío', format: (v: any) => v ? new Date(v).toLocaleDateString('es-ES') : '' },
    ];

    exportToXlsx(result.data, columns, 'pedidos_venta');
  };

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
            description: "Número total de pedidos de venta únicos (cabeceras de documento) con líneas de mercancía abierta.",
            formulas: "Count(Distinct Document_No)",
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
            <div className="flex flex-wrap items-center gap-2">
              <select 
                className="block w-full sm:w-auto pl-3 pr-10 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-dts-secondary/50"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                <option value="Item">Productos (Item)</option>
                <option value="G/L Account">Cuentas (G/L Account)</option>
              </select>
              <ExportButton onExport={handleExport} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg">
              <tr>
                {[
                  { label: 'Documento', key: 'document_number', className: 'hidden sm:table-cell text-[10px]' },
                  { label: 'Fecha', key: 'posting_date', className: 'hidden md:table-cell text-[10px]' },
                  { label: 'Cliente', key: 'customer_code' },
                  { label: 'Producto / Cuenta', key: 'item_code', className: 'hidden xl:table-cell' },
                  { label: 'Cant.', key: 'quantity', align: 'right', className: 'hidden lg:table-cell text-[10px]' },
                  { label: 'Pend.', key: 'outstanding_quantity', align: 'right', className: 'text-[10px]' },
                  { label: 'Env. F.', key: 'qty_shipped_not_invoiced', align: 'right', className: 'text-[10px]' },
                  { label: 'Importe', key: 'line_amount', align: 'right', className: 'hidden xs:table-cell text-[10px]' }
                ].map(col => (
                  <th 
                    key={col.key} 
                    className={`px-2 sm:px-4 lg:px-6 py-4 font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:bg-white/10 ${col.align === 'right' ? 'text-right' : ''} ${col.className || ''}`}
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
                  <td className="px-2 sm:px-4 lg:px-6 py-3 font-bold font-mono text-[10px] text-dts-primary dark:text-dts-secondary hidden sm:table-cell whitespace-nowrap">{order.document_number}</td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3 items-center gap-1.5 whitespace-nowrap hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-gray-400 hidden lg:inline" />
                      <span className="text-gray-700 dark:text-gray-300 text-[10px]">
                        {order.posting_date ? new Date(order.posting_date).toLocaleDateString() : '---'}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3">
                    <div className="flex flex-col">
                      <span className="sm:hidden font-mono text-[10px] font-bold text-dts-primary dark:text-dts-secondary mb-0.5">{order.document_number}</span>
                      <span className="font-medium text-gray-900 dark:text-white uppercase text-[10px] sm:text-xs truncate max-w-[80px] sm:max-w-none">{order.customer?.name || '---'}</span>
                      <span className="text-[9px] text-gray-500 font-mono tracking-wider hidden sm:inline">{order.customer_code}</span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3 hidden xl:table-cell">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300 text-xs">{order.item_code}</span>
                        {order.type === 'G/L Account' ? (
                          <span className="px-1.5 py-0.25 rounded-[4px] text-[8px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">Cta</span>
                        ) : (
                          <span className="px-1.5 py-0.25 rounded-[4px] text-[8px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">Item</span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 truncate max-w-[200px] leading-tight">{order.description || '---'}</span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3 text-right font-mono font-bold text-[10px] hidden lg:table-cell whitespace-nowrap">{formatNumber(Number(order.quantity), 0)}</td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-3 text-right font-mono font-bold text-[10px] whitespace-nowrap ${Number(order.outstanding_quantity) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {formatNumber(Number(order.outstanding_quantity), 0)}
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-3 text-right font-mono font-bold text-[10px] whitespace-nowrap ${Number(order.qty_shipped_not_invoiced) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {formatNumber(Number(order.qty_shipped_not_invoiced), 0)}
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3 text-right font-mono font-bold text-[10px] text-dts-primary dark:text-white hidden xs:table-cell whitespace-nowrap">{formatCurrency(Number(order.line_amount), 0)}</td>
                </tr>
              ))}
              <tr ref={observerTarget}>
                <td colSpan={100} className="py-8 text-center text-gray-400 text-xs w-full">
                  {isFetchingNextPage ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-dts-secondary border-t-transparent rounded-full animate-spin"></div>
                      <span>Cargando más pedidos...</span>
                    </div>
                  ) : hasNextPage ? 'Baja para cargar más' : 'No hay más registros'}
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

