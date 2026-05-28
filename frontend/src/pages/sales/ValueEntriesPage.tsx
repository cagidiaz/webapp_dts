import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getValueEntries } from '../../api';
import { formatCurrency } from '../../api/formatters';
import { 
  Search, FileText, Loader2, ArrowUpDown, ChevronUp, ChevronDown, Filter
} from 'lucide-react';
import { TableSkeleton, ExportButton, SearchableSelect } from '../../components/ui';
import { useUIStore } from '../../store/uiStore';
import { exportToXlsx } from '../../utils/exportToXlsx';

export const ValueEntriesPage: React.FC = () => {
  const { setPageInfo } = useUIStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<string>('reg_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const observerTarget = useRef<HTMLTableRowElement>(null);
  const pageSize = 50;

  useEffect(() => {
    setPageInfo({
      title: 'Movimientos de Valor (Histórico de Ventas)',
      subtitle: 'Consulta y auditoría detallada de transacciones y facturación',
      icon: <FileText size={20} />,
      infoProps: {
        title: 'Movimientos de Valor',
        description: 'Detalle histórico de todas las líneas de transacción de facturación, abonos y ajustes de stock.',
        objective: 'Auditar transacciones de ventas detalladas y exportar históricos para análisis financieros avanzados.',
        source: 'Tabla Value Entries integrada desde ERP.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['valueEntries', debouncedSearch, docTypeFilter, sortBy, sortDir],
    queryFn: ({ pageParam = 0 }) => getValueEntries({ 
      take: pageSize, skip: pageParam as number, search: debouncedSearch,
      documentType: docTypeFilter || undefined,
      sortBy, sortDir
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

  const { entries } = useMemo(() => {
    const allItems = data?.pages.flatMap(page => page.rows) || [];
    return { entries: allItems };
  }, [data]);

  const handleSort = (field: string) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="ml-1 opacity-20" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="ml-1 text-dts-secondary" /> : <ChevronDown size={12} className="ml-1 text-dts-secondary" />;
  };

  const handleExport = async () => {
    const result = await getValueEntries({
      take: 99999,
      skip: 0,
      search: debouncedSearch,
      documentType: docTypeFilter || undefined,
      sortBy,
      sortDir,
    });

    const columns = [
      { key: 'entry_no', label: 'Nº Movimiento' },
      { key: 'reg_date', label: 'Fecha Registro', format: (v: string) => new Date(v).toLocaleDateString('es-ES') },
      { key: 'document_no', label: 'Nº Documento' },
      { key: 'item_no', label: 'Producto' },
      { key: 'source_no', label: 'Cliente' },
      { key: 'sales_amount', label: 'Importe Ventas (€)', format: (v: number) => Number(v.toFixed(2)) },
      { key: 'cost_amount', label: 'Importe Coste (€)', format: (v: number) => Number(v.toFixed(2)) },
      { key: 'quantity', label: 'Cantidad', format: (v: number) => Number(v.toFixed(2)) },
      { key: 'unit_cost', label: 'Coste Unitario (€)', format: (v: number) => Number(v.toFixed(2)) },
      { key: 'salesperson_code', label: 'Vendedor' },
      { key: 'external_doc_no', label: 'Doc. Externo' },
    ];

    exportToXlsx(result.rows, columns, 'historico_ventas_value_entries');
  };

  if (isLoading) return (
    <div className="space-y-8 pb-10">
      <div className="h-28 bg-white dark:bg-surface-card-dark rounded-2xl animate-pulse"></div>
      <div className="bg-white dark:bg-surface-card-dark rounded-xl h-[550px]"><TableSkeleton rows={15} columns={8} /></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-transparent space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="w-full sm:max-w-md relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="h-4 w-4" />
              </div>
              <input 
                type="text" 
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dts-secondary/50 sm:text-sm" 
                placeholder="Buscar por doc, cliente, producto..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            
            <div className="flex items-center gap-3">
              <ExportButton onExport={handleExport} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Filter size={14} className="text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400 uppercase">Filtros:</span>
            <SearchableSelect 
              options={[
                { value: '', label: 'Todos los tipos' },
                { value: 'Sales Invoice', label: 'Sales Invoice (Facturas)' },
                { value: 'Sales Credit Memo', label: 'Sales Credit Memo (Abonos)' },
              ]} 
              value={docTypeFilter} 
              onChange={setDocTypeFilter} 
              placeholder="Tipo de Documento" 
              showIcon={false}
            />
          </div>
        </div>

        {/* Table container */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg">
              <tr>
                {[
                  { label: 'Nº Movimiento', key: 'entry_no' },
                  { label: 'Fecha', key: 'reg_date' },
                  { label: 'Documento', key: 'document_no' },
                  { label: 'Producto', key: 'item_no' },
                  { label: 'Cliente', key: 'source_no' },
                  { label: 'Cant.', key: 'quantity', align: 'right' },
                  { label: 'Importe Ventas', key: 'sales_amount', align: 'right' },
                  { label: 'Coste Total', key: 'cost_amount', align: 'right' },
                ].map(col => (
                  <th 
                    key={col.key} 
                    onClick={() => handleSort(col.key)} 
                    className={`px-6 py-4 font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:bg-white/10 transition-colors ${
                      col.align === 'right' ? 'text-right' : ''
                    }`}
                  >
                    <div className={`flex items-center ${col.align === 'right' ? 'justify-end' : ''}`}>
                      {col.label}
                      {getSortIcon(col.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {entries.map((entry, idx) => (
                <tr key={`${entry.id || entry.entry_no}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-3 font-bold font-mono text-gray-400">{entry.entry_no || '---'}</td>
                  <td className="px-6 py-3 font-medium text-gray-700 dark:text-gray-200">
                    {entry.reg_date ? new Date(entry.reg_date).toLocaleDateString('es-ES') : '---'}
                  </td>
                  <td className="px-6 py-3 font-semibold text-dts-primary dark:text-dts-secondary">
                    <div className="flex flex-col">
                      <span>{entry.document_no}</span>
                      {entry.document_type && (
                        <span className="text-[9px] text-gray-400 uppercase font-mono">{entry.document_type}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 font-mono font-bold text-gray-600 dark:text-gray-300">{entry.item_no}</td>
                  <td className="px-6 py-3 font-medium text-gray-500">
                    <div className="flex flex-col">
                      <span className="truncate max-w-[200px]" title={entry.source_description || undefined}>
                        {entry.source_description || '---'}
                      </span>
                      <span className="text-[9px] font-mono">{entry.source_no}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-gray-700 dark:text-gray-200">{Number(entry.quantity).toLocaleString('de-DE')}</td>
                  <td className="px-6 py-3 text-right font-mono font-bold text-emerald-500">{formatCurrency(Number(entry.sales_amount), 2)}</td>
                  <td className="px-6 py-3 text-right font-mono font-bold text-amber-500">{formatCurrency(Number(entry.cost_amount), 2)}</td>
                </tr>
              ))}
              
              <tr ref={observerTarget}>
                <td colSpan={8} className="py-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                  {isFetchingNextPage ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Cargando más movimientos...</span>
                    </div>
                  ) : hasNextPage ? (
                    'Desplázate para cargar más movimientos'
                  ) : (
                    'Fin de la lista de movimientos'
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
