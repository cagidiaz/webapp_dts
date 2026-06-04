import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getAllSalesDocuments } from '../../api';
import { formatCurrency } from '../../api/formatters';
import { 
  Search, Receipt, Loader2, ArrowUpDown, ChevronUp, ChevronDown, ChevronRight, Filter, 
  TrendingUp, Percent, Tag, Package
} from 'lucide-react';
import { TableSkeleton, ExportButton, SearchableSelect } from '../../components/ui';
import { useUIStore } from '../../store/uiStore';
import { exportToXlsx } from '../../utils/exportToXlsx';

export const SalesInvoicesPage: React.FC = () => {
  const { setPageInfo } = useUIStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | string>(new Date().getFullYear());
  const [sortBy, setSortBy] = useState<string>('document_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedDocNos, setExpandedDocNos] = useState<Record<string, boolean>>({});
  const observerTarget = useRef<HTMLTableRowElement>(null);
  const pageSize = 50;

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list = [{ value: '', label: 'Todos los años' }];
    for (let y = currentYear; y >= 2018; y--) {
      list.push({ value: String(y), label: `Año ${y}` });
    }
    return list;
  }, []);

  useEffect(() => {
    setPageInfo({
      title: 'Histórico de Facturación',
      subtitle: 'Consulta unificada de facturas, abonos y KPIs de venta',
      icon: <Receipt size={20} className="text-dts-secondary" />,
      infoProps: {
        title: 'Histórico de Facturación',
        description: 'Detalle consolidado de cabeceras de facturas y abonos de venta, permitiendo expandir y desglosar cada línea de producto.',
        objective: 'Analizar el histórico de ventas reales, auditar facturación consolidada, revisar importes netos, impuestos y márgenes comerciales reales.',
        source: 'Integrado desde Dynamics Business Central (sales_documents & sales_document_lines).'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['salesDocuments', debouncedSearch, docTypeFilter, selectedYear, sortBy, sortDir],
    queryFn: ({ pageParam = 0 }) => getAllSalesDocuments({ 
      take: pageSize, skip: pageParam as number, search: debouncedSearch,
      type: docTypeFilter || undefined,
      year: selectedYear ? Number(selectedYear) : undefined,
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

  const { documents, summary } = useMemo(() => {
    const allItems = data?.pages.flatMap(page => page.data) || [];
    const latestSummary = data?.pages[0]?.summary || {
      totalDocuments: 0,
      totalInvoicedNet: 0,
      totalDiscountsLine: 0,
      totalDiscountsGlobal: 0,
      averageMarginPct: 0,
      totalCost: 0,
      totalTransport: 0,
      totalServices: 0
    };
    return { documents: allItems, summary: latestSummary };
  }, [data]);

  const handleSort = (field: string) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="ml-1 opacity-20" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="ml-1 text-dts-secondary" /> : <ChevronDown size={12} className="ml-1 text-dts-secondary" />;
  };

  const toggleExpand = (docNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDocNos(prev => ({ ...prev, [docNo]: !prev[docNo] }));
  };

  const handleExport = async () => {
    const result = await getAllSalesDocuments({
      take: 99999,
      skip: 0,
      search: debouncedSearch,
      type: docTypeFilter || undefined,
      year: selectedYear ? Number(selectedYear) : undefined,
      sortBy,
      sortDir,
    });

    const exportRows: any[] = [];
    result.data.forEach(doc => {
      if (doc.lines && doc.lines.length > 0) {
        doc.lines.forEach(line => {
          exportRows.push({
            document_date: doc.document_date ? new Date(doc.document_date).toLocaleDateString('es-ES') : '---',
            document_no: doc.document_no,
            customer_no: doc.customer_no,
            customer_name: doc.customer?.name || '---',
            your_reference: doc.your_reference || '---',
            order_no: doc.order_no || '---',
            external_doc_no: doc.external_doc_no || '---',
            shipment_no: doc.shipment_no || '---',
            payment_terms_code: doc.payment_terms_code || '---',
            payment_method_code: doc.payment_method_code || '---',
            total_amount_excl_vat: Number(doc.total_amount_excl_vat || 0),
            total_vat_amount: Number(doc.total_vat_amount || 0),
            total_amount_incl_vat: Number(doc.total_amount_incl_vat || 0),
            line_no: line.line_no !== null ? Number(line.line_no) : '---',
            line_type: line.type || '---',
            product_no: line.product_no || '---',
            product_description: line.product?.description || '---',
            quantity: Number(line.quantity || 0),
            unit_price: Number(line.unit_price || 0),
            line_amount: Number(line.line_amount || 0),
            line_disc_amount: Number(line.line_disc_amount || 0),
            line_disc_percent: Number(line.line_disc_percent || 0),
            margen_percent_ldr: Number(line.margen_percent_ldr || 0)
          });
        });
      } else {
        exportRows.push({
          document_date: doc.document_date ? new Date(doc.document_date).toLocaleDateString('es-ES') : '---',
          document_no: doc.document_no,
          customer_no: doc.customer_no,
          customer_name: doc.customer?.name || '---',
          your_reference: doc.your_reference || '---',
          order_no: doc.order_no || '---',
          external_doc_no: doc.external_doc_no || '---',
          shipment_no: doc.shipment_no || '---',
          payment_terms_code: doc.payment_terms_code || '---',
          payment_method_code: doc.payment_method_code || '---',
          total_amount_excl_vat: Number(doc.total_amount_excl_vat || 0),
          total_vat_amount: Number(doc.total_vat_amount || 0),
          total_amount_incl_vat: Number(doc.total_amount_incl_vat || 0),
          line_no: '---',
          line_type: '---',
          product_no: '---',
          product_description: '---',
          quantity: 0,
          unit_price: 0,
          line_amount: 0,
          line_disc_amount: 0,
          line_disc_percent: 0,
          margen_percent_ldr: 0
        });
      }
    });

    const columns = [
      { key: 'document_date', label: 'Fecha Documento' },
      { key: 'document_no', label: 'Nº Documento' },
      { key: 'customer_no', label: 'Cód. Cliente' },
      { key: 'customer_name', label: 'Nombre Cliente' },
      { key: 'your_reference', label: 'Referencia' },
      { key: 'order_no', label: 'Pedido Origen' },
      { key: 'external_doc_no', label: 'Doc. Externo Cliente' },
      { key: 'shipment_no', label: 'Nº Albarán' },
      { key: 'payment_terms_code', label: 'Términos Pago' },
      { key: 'payment_method_code', label: 'Método Pago' },
      { key: 'total_amount_excl_vat', label: 'Importe Neto Doc (€)' },
      { key: 'total_vat_amount', label: 'IVA Doc (€)' },
      { key: 'total_amount_incl_vat', label: 'Total Doc (€)' },
      { key: 'line_no', label: 'Nº Línea' },
      { key: 'line_type', label: 'Tipo Línea' },
      { key: 'product_no', label: 'Producto SKU' },
      { key: 'product_description', label: 'Descripción Producto' },
      { key: 'quantity', label: 'Cantidad' },
      { key: 'unit_price', label: 'Precio Unitario (€)' },
      { key: 'line_amount', label: 'Importe Neto Línea (€)' },
      { key: 'line_disc_amount', label: 'Descuento Línea (€)' },
      { key: 'line_disc_percent', label: 'Descuento Línea (%)' },
      { key: 'margen_percent_ldr', label: 'Margen Línea (%)' }
    ];

    exportToXlsx(exportRows, columns, 'historico_documentos_y_lineas_venta');
  };

  if (isLoading) return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 bg-white dark:bg-surface-card-dark rounded-2xl animate-pulse"></div>
        ))}
      </div>
      <div className="bg-white dark:bg-surface-card-dark rounded-xl h-[550px]"><TableSkeleton rows={15} columns={8} /></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* KPI Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI: Total Net Sales */}
        <div className="bg-white dark:bg-surface-card-dark rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Facturación Neta (Excl. IVA)</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white font-mono">
              {formatCurrency(summary.totalInvoicedNet, 0)}
            </h3>
            
            {/* Desglose de Transporte y Servicios */}
            <div className="pt-1 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
              <div className="flex justify-start items-baseline gap-2 text-[10px] text-gray-400 dark:text-gray-500">
                <span className="text-xs font-normal text-gray-700 dark:text-gray-300 font-mono">
                  {formatCurrency(summary.totalTransport || 0, 0)}
                </span>
                <span className="font-normal lowercase">portes</span>
              </div>
              <div className="flex justify-start items-baseline gap-2 text-[10px] text-gray-400 dark:text-gray-500">
                <span className="text-xs font-normal text-gray-700 dark:text-gray-300 font-mono">
                  {formatCurrency(summary.totalServices || 0, 0)}
                </span>
                <span className="font-normal lowercase">servicios</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI: Margin */}
        <div className="bg-white dark:bg-surface-card-dark rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Margen Real Medio</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 dark:text-blue-400">
              <Percent size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white font-mono">
              {summary.averageMarginPct}%
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">Margen real ponderado de selección</p>
          </div>
        </div>

        {/* KPI: Invoices Count */}
        <div className="bg-white dark:bg-surface-card-dark rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Documentos Emitidos</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 dark:text-purple-400">
              <Receipt size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white font-mono">
              {summary.totalDocuments}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">Nº total de documentos cargados</p>
          </div>
        </div>

        {/* KPI: Total Discount */}
        <div className="bg-white dark:bg-surface-card-dark rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Descuentos Aplicados</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400">
              <Tag size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white font-mono">
              {formatCurrency(summary.totalDiscountsLine, 0)}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">Descuentos de líneas acumulados</p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card border border-gray-100 dark:border-gray-800 flex flex-col h-[calc(100vh-340px)] min-h-[300px] overflow-hidden">
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
                placeholder="Buscar por doc, cliente, sku, pedido, ref..." 
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
              options={yearOptions} 
              value={String(selectedYear)} 
              onChange={setSelectedYear} 
              placeholder="Seleccionar Año" 
              showIcon={false}
            />
            <SearchableSelect 
              options={[
                { value: '', label: 'Todos los tipos' },
                { value: 'Item', label: 'Productos (Item)' },
                { value: 'G/L Account', label: 'Servicios (G/L Account)' },
              ]} 
              value={docTypeFilter} 
              onChange={setDocTypeFilter} 
              placeholder="Tipo de Línea" 
              showIcon={false}
            />
          </div>
        </div>

        {/* Table container */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] w-10"></th>
                {[
                  { label: 'Fecha Doc', key: 'document_date' },
                  { label: 'Nº Documento', key: 'document_no' },
                  { label: 'Cliente', key: 'customer_no' },
                  { label: 'Referencia', key: 'your_reference' },
                  { label: 'Imp. Neto', key: 'total_amount_excl_vat', align: 'right' },
                  { label: 'IVA', key: 'total_vat_amount', align: 'right' },
                  { label: 'Imp. Total', key: 'total_amount_incl_vat', align: 'right' },
                  { label: 'Margen LDR', key: 'invoice_margen', align: 'right' },
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
              {documents.map((doc, idx) => {
                const isExpanded = !!expandedDocNos[doc.document_no];
                const isAbono = doc.document_type?.toLowerCase()?.includes('abono') || doc.document_no?.toUpperCase().startsWith('AB');
                return (
                  <React.Fragment key={`${doc.id}-${idx}`}>
                    <tr 
                      onClick={(e) => toggleExpand(doc.document_no, e)}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-3 text-center">
                        <button className="text-gray-400 group-hover:text-dts-secondary transition-colors focus:outline-none">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-700 dark:text-gray-200">
                        {doc.document_date ? new Date(doc.document_date).toLocaleDateString('es-ES') : '---'}
                      </td>
                      <td className="px-6 py-3 font-semibold text-dts-primary dark:text-dts-secondary">
                        <div className="flex items-center gap-2">
                          <span>{doc.document_no}</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                            isAbono 
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          }`}>
                            {isAbono ? 'Abono' : 'Factura'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-500">
                        <div className="flex flex-col">
                          <span className="truncate max-w-[180px] font-bold text-gray-700 dark:text-gray-300">
                            {doc.customer?.name || '---'}
                          </span>
                          <span className="text-[9px] font-mono">{doc.customer_no}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-500 italic max-w-[150px] truncate" title={doc.your_reference || undefined}>
                        {doc.your_reference || '---'}
                      </td>
                      <td className={`px-6 py-3 text-right font-mono font-bold ${isAbono ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {formatCurrency(Number(doc.total_amount_excl_vat || 0), 2)}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-gray-500">
                        {formatCurrency(Number(doc.total_vat_amount || 0), 2)}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-gray-700 dark:text-gray-200 font-semibold">
                        {formatCurrency(Number(doc.total_amount_incl_vat || 0), 2)}
                      </td>
                      <td className={`px-6 py-3 text-right font-mono font-bold ${Number(doc.invoice_margen || 0) < 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                        {Number(doc.invoice_margen || 0).toFixed(2)}%
                      </td>
                    </tr>
                    
                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="bg-gray-50/50 dark:bg-dts-primary-dark/20 p-4 border-l-4 border-dts-secondary animate-in slide-in-from-top-1 duration-200">
                          <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-card-dark shadow-sm">
                            <div className="px-4 py-2 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Package size={12} className="text-dts-secondary" />
                                Líneas detalladas del documento {doc.document_no}
                              </span>
                              <div className="flex gap-4 text-[10px] text-gray-400">
                                {doc.corrected_invoice_no && <span>Factura corregida: <strong className="text-rose-600 dark:text-rose-400 font-mono">{doc.corrected_invoice_no}</strong></span>}
                                {doc.order_no && <span>Pedido origen: <strong className="text-gray-600 dark:text-gray-200 font-mono">{doc.order_no}</strong></span>}
                                {doc.external_doc_no && <span>Doc. Externo: <strong className="text-gray-600 dark:text-gray-200 font-mono">{doc.external_doc_no}</strong></span>}
                                {doc.shipment_no && <span>Albarán: <strong className="text-gray-600 dark:text-gray-200 font-mono">{doc.shipment_no}</strong></span>}
                              </div>
                            </div>
                            
                            <table className="w-full text-left text-xs border-separate border-spacing-0">
                              <thead className="bg-gray-50/50 dark:bg-white/5 text-gray-400 font-bold uppercase tracking-wider text-[9px]">
                                <tr>
                                  <th className="px-4 py-2.5 w-16">Línea</th>
                                  <th className="px-4 py-2.5">SKU / Producto</th>
                                  <th className="px-4 py-2.5">Descripción</th>
                                  <th className="px-4 py-2.5">Tipo</th>
                                  <th className="px-4 py-2.5 text-right">Cant.</th>
                                  <th className="px-4 py-2.5 text-right">Precio Unitario</th>
                                  <th className="px-4 py-2.5 text-right">Dto %</th>
                                  <th className="px-4 py-2.5 text-right">Importe Neto</th>
                                  <th className="px-4 py-2.5 text-right">Margen LDR</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                                {doc.lines && doc.lines.length > 0 ? (
                                  doc.lines.map((line, lIdx) => (
                                    <tr key={`${line.id}-${lIdx}`} className="hover:bg-gray-50/70 dark:hover:bg-white/5 transition-colors">
                                      <td className="px-4 py-2.5 text-gray-400 text-left">{line.line_no !== null && line.line_no !== undefined ? line.line_no : '---'}</td>
                                      <td className="px-4 py-2.5 font-bold text-dts-primary dark:text-dts-secondary">{line.product_no || '---'}</td>
                                      <td className="px-4 py-2.5 text-left font-sans text-xs text-gray-700 dark:text-gray-200 max-w-[250px] truncate" title={line.product?.description || undefined}>
                                        {line.product?.description || '---'}
                                      </td>
                                      <td className="px-4 py-2.5 text-left font-sans text-[10px] text-gray-400">{line.type || 'Item'}</td>
                                      <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-200">{Number(line.quantity).toLocaleString('de-DE')} {line.unit_of_measure_code || 'UDS'}</td>
                                      <td className="px-4 py-2.5 text-right text-gray-400">{formatCurrency(Number(line.unit_price || 0), 2)}</td>
                                      <td className="px-4 py-2.5 text-right text-amber-500">{Number(line.line_disc_percent || 0)}%</td>
                                      <td className="px-4 py-2.5 text-right font-bold text-gray-700 dark:text-gray-200">{formatCurrency(Number(line.line_amount || 0), 2)}</td>
                                      <td className={`px-4 py-2.5 text-right font-bold ${Number(line.margen_percent_ldr || 0) < 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                                        {Number(line.margen_percent_ldr || 0).toFixed(2)}%
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={9} className="px-4 py-6 text-center text-gray-400 font-sans italic">
                                      Este documento no tiene líneas de detalle registradas.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              
              <tr ref={observerTarget}>
                <td colSpan={9} className="py-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                  {isFetchingNextPage ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Cargando más registros...</span>
                    </div>
                  ) : hasNextPage ? (
                    'Desplázate para cargar más documentos'
                  ) : (
                    'Fin de la lista de documentos'
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
