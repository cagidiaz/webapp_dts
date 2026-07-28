import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getAllPurchaseOrders } from '../../api/purchaseOrders';
import { formatCurrency, formatNumber } from '../../api/formatters';
import { 
  Search, ShoppingBag, Euro, TrendingUp, Calendar, DollarSign,
  ArrowUpDown, ChevronUp, ChevronDown, ChevronRight, type LucideIcon
} from 'lucide-react';
import { KPISkeleton, TableSkeleton, InfoPopover, ExportButton } from '../../components/ui';
import { useUIStore } from '../../store/uiStore';
import { exportToXlsx } from '../../utils/exportToXlsx';

export const PurchaseOrdersPage: React.FC = () => {
  const { setPageInfo } = useUIStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vendorFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('document_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const observerTarget = useRef<HTMLTableRowElement>(null);
  const pageSize = 50;

  useEffect(() => {
    setPageInfo({
      title: 'Pedidos de Compra',
      subtitle: 'Seguimiento de pedidos de compra abiertos y recepciones pendientes',
      icon: <ShoppingBag size={20} />,
      infoProps: {
        title: 'Pedidos de Compra',
        description: 'Listado de pedidos de compra abiertos con cantidades pendientes de recepción y facturación.',
        objective: 'Monitorizar las entregas de proveedores y la entrada de mercancía o servicios.',
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
    queryKey: ['purchase-orders', debouncedSearch, vendorFilter, typeFilter, sortBy, sortDir],
    queryFn: ({ pageParam = 0 }) => getAllPurchaseOrders({ 
      take: pageSize, 
      skip: pageParam as number, 
      search: debouncedSearch,
      vendorNo: vendorFilter || undefined,
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
    const result = await getAllPurchaseOrders({
      take: 99999,
      skip: 0,
      search: debouncedSearch,
      vendorNo: vendorFilter || undefined,
      type: typeFilter || undefined,
      sortBy,
      sortDir,
    });

    const rows: any[] = [];
    result.data.forEach(order => {
      if (!order.lines || order.lines.length === 0) {
        rows.push({
          order_no: order.order_no,
          document_date: order.document_date ? new Date(order.document_date).toLocaleDateString('es-ES') : '',
          vendor_no: order.vendor_no,
          vendor_name: order.vendor?.name || '',
          type: '',
          item_code: '',
          description: '',
          unit_of_measure: '',
          quantity: 0,
          qty_to_receive: 0,
          qty_to_invoice: 0,
          amount: Number(order.amount || 0),
        });
      } else {
        order.lines.forEach(line => {
          rows.push({
            order_no: order.order_no,
            document_date: order.document_date ? new Date(order.document_date).toLocaleDateString('es-ES') : '',
            vendor_no: order.vendor_no,
            vendor_name: order.vendor?.name || '',
            type: line.type || '',
            item_code: line.item_code || '',
            description: line.description || '',
            unit_of_measure: line.unit_of_measure || '',
            quantity: Number(line.quantity || 0),
            qty_to_receive: Number(line.qty_to_receive || 0),
            qty_to_invoice: Number(line.qty_to_invoice || 0),
            amount: Number(line.line_amount || 0),
          });
        });
      }
    });

    const columns = [
      { key: 'order_no', label: 'Documento' },
      { key: 'document_date', label: 'Fecha' },
      { key: 'vendor_no', label: 'Cód. Proveedor' },
      { key: 'vendor_name', label: 'Proveedor' },
      { key: 'type', label: 'Tipo' },
      { key: 'item_code', label: 'Producto/Cuenta' },
      { key: 'description', label: 'Descripción' },
      { key: 'unit_of_measure', label: 'UM' },
      { key: 'quantity', label: 'Cantidad', format: (v: any) => Number(Number(v).toFixed(0)) },
      { key: 'qty_to_receive', label: 'Pend. Recibir', format: (v: any) => Number(Number(v).toFixed(0)) },
      { key: 'qty_to_invoice', label: 'Pend. Facturar', format: (v: any) => Number(Number(v).toFixed(0)) },
      { key: 'amount', label: 'Importe (€)', format: (v: any) => Number(Number(v).toFixed(2)) },
    ];

    exportToXlsx(rows, columns, 'pedidos_compra');
  };

  const { orders, summary } = useMemo(() => {
    const allPagesData = data?.pages.flatMap(page => page.data) || [];
    const firstSummary = data?.pages[0]?.summary || { 
      totalOrders: 0,
      totalPendingAmount: 0, 
      totalPendingAmountAccounts: 0,
      totalPendingUnits: 0, 
      totalPendingToInvoice: 0,
      totalPendingToInvoiceAccounts: 0
    };

    return { 
      orders: allPagesData, 
      summary: firstSummary
    };
  }, [data]);

  const toggleExpand = (docNum: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(docNum)) next.delete(docNum);
      else next.add(docNum);
      return next;
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr || dateStr.startsWith('0001-01-01')) return '---';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '---' : d.toLocaleDateString('es-ES');
    } catch {
      return '---';
    }
  };

  if (isLoading && !data) return (
    <div className="space-y-8 pb-10">
      <div className="h-28 bg-white dark:bg-surface-card-dark rounded-2xl animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPISkeleton />
        <KPISkeleton />
        <KPISkeleton />
        <KPISkeleton />
      </div>
      <div className="bg-white dark:bg-surface-card-dark rounded-xl h-125"><TableSkeleton rows={15} columns={6} /></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Pedidos" 
          value={summary.totalOrders} 
          type="number" 
          icon={ShoppingBag} 
          isLoading={isLoading} 
          infoProps={{
            description: "Número total de pedidos de compra únicos abiertos.",
            formulas: "Count(Distinct Order_No)",
            source: "Sincronizado desde Navision / Business Central."
          }}
        />
        <KPICard 
          title="Cant. Pend. Recibir" 
          value={summary.totalPendingUnits} 
          type="number" 
          icon={TrendingUp} 
          isLoading={isLoading} 
          infoProps={{
            description: "Total de unidades de artículos que aún están pendientes de ser recibidas en el almacén.",
            formulas: "Sumatorio(Qty. to Receive)"
          }}
        />
        <KPICard 
          title="Cartera Compras" 
          value={summary.totalPendingAmount} 
          accountValue={summary.totalPendingAmountAccounts}
          type="currency" 
          icon={Euro} 
          isLoading={isLoading} 
          infoProps={{
            description: "Valor económico total pendiente de recibir en pedidos de compra. El valor entre paréntesis indica la porción de líneas de tipo cuenta.",
            formulas: "Sumatorio(Qty. to Receive * Coste Efectivo)"
          }}
        />
        <KPICard 
          title="Pend. Facturar" 
          value={summary.totalPendingToInvoice} 
          accountValue={summary.totalPendingToInvoiceAccounts}
          type="currency" 
          icon={DollarSign} 
          status="warning"
          isLoading={isLoading} 
          infoProps={{
            description: "Importe de compras que ya han sido recibidas pero están pendientes de emisión/recepción de factura de proveedor.",
            formulas: "Sumatorio(Qty. to Invoice * Coste Efectivo)"
          }}
        />
      </div>

      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col h-[calc(100vh-320px)] min-h-112.5">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-transparent">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="w-full max-w-md relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Search className="h-4 w-4" /></div>
              <input 
                type="text" 
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dts-secondary/50 sm:text-sm" 
                placeholder="Buscar pedido, proveedor o producto..." 
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
                  { label: 'Documento', key: 'order_no', className: 'hidden sm:table-cell text-[10px]' },
                  { label: 'Fecha', key: 'document_date', className: 'hidden md:table-cell text-[10px]' },
                  { label: 'Proveedor', key: 'vendor_no' },
                  { label: 'Líneas', key: 'lines', className: 'hidden xl:table-cell' },
                  { label: 'Cant. Pedida', key: 'quantity', align: 'right', className: 'hidden lg:table-cell text-[10px]' },
                  { label: 'Pend. Recibir', key: 'qty_to_receive', align: 'right', className: 'text-[10px]' },
                  { label: 'Pend. Facturar', key: 'qty_to_invoice', align: 'right', className: 'text-[10px]' },
                  { label: 'Importe Total', key: 'amount', align: 'right', className: 'hidden xs:table-cell text-[10px]' }
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
              {orders.map(order => {
                const isExpanded = expandedOrders.has(order.order_no);

                const totalQty = order.lines.reduce((acc, l) => acc + Number(l.quantity || 0), 0);
                const totalToReceive = order.lines.reduce((acc, l) => acc + Number(l.qty_to_receive || 0), 0);
                const totalToInvoice = order.lines.reduce((acc, l) => acc + Number(l.qty_to_invoice || 0), 0);
                const calcAmount = order.lines.reduce((acc, l) => acc + Number(l.line_amount || 0), Number(order.amount || 0));
                const finalAmount = order.lines.length > 0 ? calcAmount : Number(order.amount || 0);

                return (
                  <React.Fragment key={order.order_no}>
                    {/* Header Row (Order) */}
                    <tr 
                      onClick={() => toggleExpand(order.order_no)}
                      className={`cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/30 dark:bg-blue-500/5' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                      <td className="px-2 sm:px-4 lg:px-6 py-3 font-bold font-mono text-[10px] text-dts-primary dark:text-dts-secondary hidden sm:table-cell whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <ChevronRight size={14} className={`shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                          {order.order_no}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 items-center gap-1.5 whitespace-nowrap hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-gray-400 hidden lg:inline" />
                          <span className="text-gray-700 dark:text-gray-300 text-[10px]">
                            {formatDate(order.document_date || order.posting_date)}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3">
                        <div className="flex flex-col">
                          <div className="sm:hidden flex items-center gap-2 mb-0.5">
                            <ChevronRight size={12} className={`shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                            <span className="font-mono text-[10px] font-bold text-dts-primary dark:text-dts-secondary">{order.order_no}</span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white uppercase text-[10px] sm:text-xs truncate max-w-35 sm:max-w-none">{order.vendor?.name || '---'}</span>
                          <span className="text-[9px] text-gray-500 font-mono tracking-wider hidden sm:inline">{order.vendor_no}</span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 hidden xl:table-cell">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {order.lines.length} {order.lines.length === 1 ? 'Línea' : 'Líneas'}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 text-right font-mono font-bold text-[10px] hidden lg:table-cell whitespace-nowrap">{formatNumber(totalQty, 0)}</td>
                      <td className={`px-2 sm:px-4 lg:px-6 py-3 text-right font-mono font-bold text-[10px] whitespace-nowrap ${totalToReceive > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {formatNumber(totalToReceive, 0)}
                      </td>
                      <td className={`px-2 sm:px-4 lg:px-6 py-3 text-right font-mono font-bold text-[10px] whitespace-nowrap ${totalToInvoice > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {formatNumber(totalToInvoice, 0)}
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 text-right font-mono font-bold text-[10px] text-dts-primary dark:text-white hidden xs:table-cell whitespace-nowrap">{formatCurrency(finalAmount, 0)}</td>
                    </tr>

                    {/* Detailed Lines (Expanded) */}
                    {isExpanded && order.lines.map((line) => (
                      <tr key={line.id} className="bg-gray-50/50 dark:bg-white/2 border-l-2 border-dts-secondary/30">
                        <td className="hidden sm:table-cell"></td>
                        <td className="hidden md:table-cell"></td>
                        <td className="px-2 sm:px-4 lg:px-6 py-2" colSpan={1}></td>
                        <td className="px-2 sm:px-4 lg:px-6 py-2 hidden xl:table-cell">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-600 dark:text-gray-400 text-[11px]">{line.item_code}</span>
                              {line.type === 'G/L Account' ? (
                                <span className="px-1 py-0 rounded-[3px] text-[7px] font-bold uppercase bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-500 border border-amber-100 dark:border-amber-800/30">Cta</span>
                              ) : (
                                <span className="px-1 py-0 rounded-[3px] text-[7px] font-bold uppercase bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-500 border border-blue-100 dark:border-blue-800/30">Item</span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 truncate max-w-50 leading-tight italic">{line.description || '---'}</span>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 lg:px-6 py-2 text-right font-mono text-[10px] hidden lg:table-cell text-gray-500">{formatNumber(Number(line.quantity), 0)}</td>
                        <td className="px-2 sm:px-4 lg:px-6 py-2 text-right font-mono text-[10px] text-gray-500">{formatNumber(Number(line.qty_to_receive), 0)}</td>
                        <td className="px-2 sm:px-4 lg:px-6 py-2 text-right font-mono text-[10px] text-gray-500">{formatNumber(Number(line.qty_to_invoice), 0)}</td>
                        <td className="px-2 sm:px-4 lg:px-6 py-2 text-right font-mono text-[10px] text-gray-500 hidden xs:table-cell">{formatCurrency(Number(line.line_amount), 0)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
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

interface KPICardProps {
  title: string;
  value: number;
  type?: 'number' | 'currency' | 'percentage';
  icon: LucideIcon;
  isLoading?: boolean;
  status?: 'success' | 'danger' | 'warning' | 'normal' | null;
  decimalPlaces?: number;
  infoProps?: {
    description: string;
    formulas?: string;
    objective?: string;
    source?: string;
  };
  accountValue?: number;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, type = 'number', icon: Icon, isLoading, status, decimalPlaces = 0, infoProps, accountValue }) => {
  if (isLoading) return <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-gray-100 dark:border-gray-800 h-28 animate-pulse" />;
  
  const colorClass = status === 'success' ? 'text-emerald-500' : status === 'danger' ? 'text-red-500' : 'text-dts-primary dark:text-white';
  const formattedValue = type === 'currency' ? formatCurrency(value, decimalPlaces) : formatNumber(value, decimalPlaces);

  return (
    <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-card-hover group">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{title}</span>
          {infoProps && <InfoPopover title={title} {...infoProps} iconSize={12} />}
        </div>
        <Icon size={18} className="text-gray-400 group-hover:text-dts-secondary transition-colors" />
      </div>
      <div className={`text-2xl font-black font-mono ${colorClass}`}>{formattedValue}</div>
      {accountValue !== undefined && accountValue > 0 && (
        <div className="text-[10px] text-gray-400 mt-1 italic font-medium">
          ({formatCurrency(accountValue, decimalPlaces)})
        </div>
      )}
    </div>
  );
};
