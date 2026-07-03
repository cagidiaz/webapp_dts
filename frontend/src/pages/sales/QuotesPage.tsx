import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getAllQuotes, getQuoteById, type SalesQuote } from '../../api/quotes';
import { getCustomerSalespersons } from '../../api/customers';
import { formatCurrency, formatNumber } from '../../api/formatters';
import { 
  Search, FileText, Euro, CheckCircle, Percent, ArrowUpDown, 
  ChevronUp, ChevronDown, Sparkles, BarChart3, Calendar
} from 'lucide-react';
import { KPISkeleton, TableSkeleton, InfoPopover, ExportButton } from '../../components/ui';
import { Drawer } from '../../components/shared';
import { useUIStore } from '../../store/uiStore';
import { exportToXlsx } from '../../utils/exportToXlsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ComposedChart
} from 'recharts';

export const QuotesPage: React.FC = () => {
  const { setPageInfo } = useUIStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [salespersonFilter, setSalespersonFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [probabilityFilter, setProbabilityFilter] = useState('');
  const closedFilter = '';
  const [sortBy, setSortBy] = useState('document_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [showCharts, setShowCharts] = useState(true);

  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const list = [];
    for (let y = currentYear; y >= 2022; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  const observerTarget = useRef<HTMLTableRowElement>(null);
  const pageSize = 50;

  useEffect(() => {
    setPageInfo({
      title: 'Ofertas Comerciales',
      subtitle: 'Análisis y seguimiento del embudo de ventas (Quotes)',
      icon: <FileText size={20} />,
      infoProps: {
        title: 'Ofertas Comerciales',
        description: 'Muestra las ofertas generadas a clientes y su estado actual (Ganadas, Perdidas, En Curso).',
        objective: 'Ayudar a los comerciales a identificar oportunidades abiertas y analizar tasas de éxito.',
        source: 'Sincronizado con Navision / Business Central (sales_quotes).'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Query salespeople
  const { data: salespersons } = useQuery({
    queryKey: ['customer-salespersons'],
    queryFn: getCustomerSalespersons,
  });

  // Query quotes with infinite scroll
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['sales-quotes', debouncedSearch, salespersonFilter, stateFilter, closedFilter, sortBy, sortDir, yearFilter, probabilityFilter],
    queryFn: ({ pageParam = 0 }) => getAllQuotes({
      take: pageSize,
      skip: pageParam as number,
      search: debouncedSearch,
      salespersonCode: salespersonFilter || undefined,
      estadoOferta: stateFilter || undefined,
      cerrado: closedFilter === '' ? undefined : (closedFilter === 'true'),
      sortBy,
      sortDir,
      year: yearFilter ? Number(yearFilter) : undefined,
      probabilidadExito: probabilityFilter || undefined
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextSkip = allPages.length * pageSize;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
  });

  // Query detail for selected quote
  const { data: selectedQuote, isLoading: isDetailLoading } = useQuery({
    queryKey: ['quote-detail', selectedQuoteId],
    queryFn: () => getQuoteById(selectedQuoteId!),
    enabled: !!selectedQuoteId,
  });

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('desc');
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
    const result = await getAllQuotes({
      take: 99999,
      skip: 0,
      search: debouncedSearch,
      salespersonCode: salespersonFilter || undefined,
      estadoOferta: stateFilter || undefined,
      cerrado: closedFilter === '' ? undefined : (closedFilter === 'true'),
      sortBy,
      sortDir,
      year: yearFilter ? Number(yearFilter) : undefined,
      probabilidadExito: probabilityFilter || undefined
    });

    const columns = [
      { key: 'document_no', label: 'Nº Oferta' },
      { key: 'document_date', label: 'Fecha', format: (v: any) => v ? new Date(v).toLocaleDateString('es-ES') : '' },
      { key: 'customer_no', label: 'Cód. Cliente' },
      { key: 'customerName', label: 'Cliente', format: (_v: any, row: any) => row.customer?.name || '' },
      { key: 'amount', label: 'Importe (€)', format: (v: any) => Number(Number(v).toFixed(2)) },
      { key: 'salesperson_code', label: 'Comercial' },
      { key: 'estado_oferta', label: 'Estado' },
      { key: 'cerrado', label: 'Cerrada', format: (v: any) => v ? 'Sí' : 'No' },
      { key: 'probabilidad_exito', label: 'Prob. Éxito (%)', format: (v: any) => v ? `${v}%` : '' },
      { key: 'cierreprev_date', label: 'Cierre Previsto', format: (v: any) => v ? new Date(v).toLocaleDateString('es-ES') : '' },
      { key: 'pedido_confirmado', label: 'Pedido Confirmado', format: (v: any) => v ? 'Sí' : 'No' },
      { key: 'motivo_ganada', label: 'Motivo Ganada' },
      { key: 'motivo_perdida', label: 'Motivo Perdida' },
      { key: 'observaciones', label: 'Observaciones' },
    ];

    exportToXlsx(result.data, columns, 'ofertas_comerciales');
  };

  const { quotesList, summary } = useMemo(() => {
    const list = data?.pages.flatMap(page => page.data) || [];
    const sum = data?.pages[0]?.summary || {
      totalCount: 0,
      totalAmount: 0,
      wonAmount: 0,
      wonCount: 0,
      lostAmount: 0,
      lostCount: 0,
      pendingAmount: 0,
      pendingCount: 0,
      successRate: 0,
      totalWeightedValue: 0,
      averageProbability: 0,
      chartData: {
        monthlyStatusData: [],
        monthlySalespersonData: []
      }
    };
    return { quotesList: list, summary: sum };
  }, [data]);

  // Separate query for chart data — NOT affected by state/probability filters
  const { data: chartQueryData } = useQuery({
    queryKey: ['sales-quotes-charts', debouncedSearch, salespersonFilter, yearFilter],
    queryFn: () => getAllQuotes({
      take: 1,
      skip: 0,
      search: debouncedSearch,
      salespersonCode: salespersonFilter || undefined,
      sortBy: 'document_date',
      sortDir: 'desc',
      year: yearFilter ? Number(yearFilter) : undefined,
    }),
  });

  const chartSummary = useMemo(() => {
    return chartQueryData?.summary || summary;
  }, [chartQueryData, summary]);

  const { salespersonChartData, salespersonNames } = useMemo(() => {
    if (!chartSummary.chartData?.monthlySalespersonData) {
      return { salespersonChartData: [], salespersonNames: [] };
    }
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const spNamesSet = new Set<string>();
    chartSummary.chartData.monthlySalespersonData.forEach(d => {
      spNamesSet.add(d.salespersonName);
    });
    const spNames = Array.from(spNamesSet);

    const chartData = months.map(m => {
      const row: any = { month: m };
      spNames.forEach(name => {
        row[name] = 0;
      });

      const monthData = chartSummary.chartData!.monthlySalespersonData.filter(d => d.month === m);
      let totalCount = 0;
      let totalWon = 0;

      monthData.forEach(d => {
        row[d.salespersonName] = Number((d.amount / 1000).toFixed(1)); // K €
        totalCount += d.count;
        totalWon += d.wonCount;
      });

      row['Tasa Éxito'] = totalCount > 0 ? Number(((totalWon / totalCount) * 100).toFixed(1)) : 0;
      return row;
    });

    return { salespersonChartData: chartData, salespersonNames: spNames };
  }, [chartSummary.chartData]);

  const statusChartData = useMemo(() => {
    if (!chartSummary.chartData?.monthlyStatusData) return [];
    return chartSummary.chartData.monthlyStatusData.map(d => ({
      month: d.month,
      'Creadas (€)': Number((d.createdAmount / 1000).toFixed(1)), // K €
      'Aprobadas (€)': Number((d.approvedAmount / 1000).toFixed(1)), // K €
      'Creadas (Cant.)': d.createdCount,
      'Aprobadas (Cant.)': d.approvedCount,
    }));
  }, [chartSummary.chartData]);

  const openQuoteDetails = (quote: SalesQuote) => {
    setSelectedQuoteId(quote.id);
    setIsDrawerOpen(true);
  };

  // Helper to color state badge
  const getStateBadgeClass = (state: string | null) => {
    const lower = (state || '').toLowerCase();
    if (lower.includes('ganada')) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30';
    if (lower.includes('perdida')) return 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30';
    return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-6 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPISkeleton /><KPISkeleton /><KPISkeleton /><KPISkeleton />
        </div>
        <div className="bg-white dark:bg-surface-card-dark rounded-xl h-[500px]">
          <TableSkeleton rows={15} columns={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Cartera de Ofertas" 
          value={summary.totalAmount} 
          type="currency" 
          icon={Euro} 
          subtitle={`${summary.totalCount} ofertas emitidas`}
          infoProps={{
            description: "Valor total de todas las ofertas emitidas activas e históricas.",
            formulas: "Sumatorio(Amount)"
          }}
        />
        <KPICard 
          title="Ofertas Ganadas" 
          value={summary.wonAmount} 
          type="currency" 
          icon={CheckCircle} 
          status="success"
          subtitle={`${summary.wonCount} ganadas`}
          infoProps={{
            description: "Importe y cantidad de ofertas que han sido marcadas como ganadas.",
            formulas: "Sumatorio(Amount) de ofertas Ganadas"
          }}
        />
        <KPICard 
          title="Valor Ponderado (IA)" 
          value={summary.totalWeightedValue} 
          type="currency" 
          icon={Sparkles} 
          subtitle={`Prob. media: ${formatNumber(summary.averageProbability, 1)}%`}
          infoProps={{
            description: "Valor ponderado de la cartera basado en la probabilidad estimada de éxito.",
            formulas: "Sumatorio(Amount * Probabilidad de Éxito)"
          }}
        />
        <KPICard 
          title="Tasa de Éxito" 
          value={summary.successRate} 
          type="percentage" 
          icon={Percent} 
          subtitle={`${summary.pendingCount} pendientes (${formatCurrency(summary.pendingAmount, 0)})`}
          infoProps={{
            description: "Porcentaje de ofertas ganadas sobre el total de ofertas cerradas (ganadas + perdidas).",
            formulas: "(Ganadas / (Ganadas + Perdidas)) * 100"
          }}
        />
      </div>

      {/* Executive Charts Dashboard */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-300">
          
          {/* Chart 1: Ofertas por Comercial y Tasa de Éxito */}
          <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm flex flex-col">
            <h3 className="text-xs font-bold text-dts-primary dark:text-white uppercase tracking-wider mb-4">Ofertas por Comercial y Tasa de Éxito</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={salespersonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                  <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 9 }} tickFormatter={(val) => `${val}k`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{ fontSize: 9 }} tickFormatter={(val) => `${val}%`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    formatter={(val, name) => {
                      if (name === 'Tasa Éxito') return [`${val}%`, name];
                      return [`${val} mil €`, name];
                    }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  {salespersonNames.map((name, idx) => (
                    <Bar 
                      key={name}
                      yAxisId="left"
                      dataKey={name}
                      name={name}
                      stackId="a"
                      fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#374151', '#06b6d4', '#14b8a6'][idx % 8]}
                      radius={[idx === salespersonNames.length - 1 ? 3 : 0, idx === salespersonNames.length - 1 ? 3 : 0, 0, 0]}
                    />
                  ))}
                  <Line 
                    yAxisId="right"
                    type="monotone"
                    dataKey="Tasa Éxito"
                    name="Tasa Éxito"
                    stroke="#ec4899"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Comparativa de Ofertas Creadas vs Aprobadas */}
          <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm flex flex-col">
            <h3 className="text-xs font-bold text-dts-primary dark:text-white uppercase tracking-wider mb-4">Ofertas Creadas vs Aprobadas (Ganadas)</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} barGap={0} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} tickFormatter={(val) => `${val}k`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    formatter={(val, name) => {
                      return [`${val} mil €`, name];
                    }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar dataKey="Creadas (€)" name="Creadas (€)" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Aprobadas (€)" name="Aprobadas (€)" fill="#10B981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* Main Container */}
      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col h-[calc(100vh-320px)] min-h-[480px]">
        {/* Filters Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-transparent">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="w-full max-w-md relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search size={16} />
              </div>
              <input 
                type="text" 
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dts-secondary/50 sm:text-sm" 
                placeholder="Buscar por Nº Oferta, cliente..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium">Año:</span>
                <select 
                  className="block pl-2 pr-8 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-dts-secondary/50"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Salesperson Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium">Comercial:</span>
                <select 
                  className="block pl-2 pr-8 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-dts-secondary/50"
                  value={salespersonFilter}
                  onChange={(e) => setSalespersonFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  {salespersons?.map(sp => (
                    <option key={sp.code} value={sp.code}>{sp.name}</option>
                  ))}
                </select>
              </div>

              {/* State Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium">Estado:</span>
                <select 
                  className="block pl-2 pr-8 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-dts-secondary/50"
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="Enviada">Enviada</option>
                  <option value="Ganada">Ganada</option>
                  <option value="Perdida">Perdida</option>
                </select>
              </div>

              {/* Probability Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium">Prob.&nbsp;Éxito:</span>
                <select 
                  className="block pl-2 pr-8 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-dts-secondary/50"
                  value={probabilityFilter}
                  onChange={(e) => setProbabilityFilter(e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="10">10%</option>
                  <option value="30">30%</option>
                  <option value="50">50%</option>
                  <option value="75">75%</option>
                  <option value="90">90%</option>
                </select>
              </div>



              {/* Action Buttons */}
              <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-3">
                <button 
                  onClick={() => setShowCharts(prev => !prev)}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
                  title={showCharts ? "Ocultar Gráficos" : "Mostrar Gráficos"}
                >
                  <BarChart3 size={14} className={showCharts ? 'text-dts-secondary' : ''} />
                  <span className="hidden sm:inline">{showCharts ? 'Ocultar Gráficos' : 'Mostrar Gráficos'}</span>
                </button>
                <ExportButton onExport={handleExport} />
              </div>
            </div>

          </div>
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-auto custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg">
              <tr>
                {[
                  { label: 'Nº Oferta', key: 'document_no', className: 'text-[10px] font-bold tracking-wider' },
                  { label: 'Fecha', key: 'document_date', className: 'text-[10px] font-bold tracking-wider' },
                  { label: 'Cliente', key: 'customer_no', className: 'text-[10px] font-bold tracking-wider' },
                  { label: 'Comercial', key: 'salesperson_code', className: 'text-[10px] font-bold tracking-wider' },
                  { label: 'Importe', key: 'amount', align: 'right', className: 'text-[10px] font-bold tracking-wider' },
                  { label: 'Prob. Éxito', key: 'probabilidad_exito', align: 'right', className: 'text-[10px] font-bold tracking-wider' },
                  { label: 'Cierre Previsto', key: 'cierreprev_date', align: 'center', className: 'text-[10px] font-bold tracking-wider' },
                  { label: 'Estado', key: 'estado_oferta', align: 'center', className: 'text-[10px] font-bold tracking-wider' }
                ].map(col => (
                  <th 
                    key={col.key} 
                    className={`px-4 py-4 uppercase cursor-pointer group hover:bg-white/10 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                    onClick={() => col.key !== 'actions' && handleSort(col.key)}
                  >
                    <div className={`flex items-center ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                      {col.label}
                      {col.key !== 'actions' && getSortIcon(col.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {quotesList.map(quote => (
                <tr 
                  key={quote.id}
                  onClick={() => openQuoteDetails(quote)}
                  className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-bold font-mono text-xs text-dts-primary dark:text-dts-secondary whitespace-nowrap">
                    {quote.document_no}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {quote.document_date ? new Date(quote.document_date).toLocaleDateString() : '---'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap max-w-[200px] truncate">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-white text-xs">{quote.customer?.name || '---'}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{quote.customer_no}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
                    {quote.sales_rep?.name || quote.salesperson_code || '---'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-xs text-gray-900 dark:text-white whitespace-nowrap">
                    {formatCurrency(Number(quote.amount || 0), 2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {quote.probabilidad_exito !== null ? `${formatNumber(Number(quote.probabilidad_exito), 1)}%` : '---'}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} className="text-gray-400" />
                      {quote.cierreprev_date ? new Date(quote.cierreprev_date).toLocaleDateString('es-ES') : '---'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStateBadgeClass(quote.estado_oferta)}`}>
                      {quote.estado_oferta || 'Pendiente'}
                    </span>
                  </td>

                </tr>
              ))}
              <tr ref={observerTarget}>
                <td colSpan={100} className="py-8 text-center text-gray-400 text-xs w-full">
                  {isFetchingNextPage ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-dts-secondary border-t-transparent rounded-full animate-spin"></div>
                      <span>Cargando más ofertas...</span>
                    </div>
                  ) : hasNextPage ? 'Baja para cargar más' : 'Fin de los registros'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={`Detalle de Oferta: ${selectedQuote?.document_no || ''}`}
      >
        {isDetailLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-dts-secondary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-500">Cargando detalles...</span>
          </div>
        ) : selectedQuote ? (
          <div className="space-y-6">
            
            {/* Main Info Box */}
            <div className="bg-gray-50 dark:bg-white/2 p-4 rounded-xl border border-gray-100 dark:border-white/5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Cliente</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white block mt-0.5">{selectedQuote.customer?.name}</span>
                  <span className="text-xs text-gray-500 font-mono mt-0.5 block">{selectedQuote.customer_no}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStateBadgeClass(selectedQuote.estado_oferta)}`}>
                  {selectedQuote.estado_oferta || 'Pendiente'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-white/5 pt-4">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Importe Oferta</span>
                  <span className="text-lg font-black text-gray-900 dark:text-white font-mono mt-0.5">
                    {formatCurrency(Number(selectedQuote.amount || 0), 2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Cierre Previsto</span>
                  <span className="text-lg font-black text-dts-primary dark:text-dts-secondary font-mono mt-0.5">
                    {selectedQuote.cierreprev_date ? new Date(selectedQuote.cierreprev_date).toLocaleDateString('es-ES') : '---'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quote details grid */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-dts-primary dark:text-dts-secondary border-b border-gray-100 dark:border-white/5 pb-2">Datos Generales</h4>
              
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Tipo Documento:</span>
                  <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">{selectedQuote.document_type || 'Quote'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Fecha Oferta:</span>
                  <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">
                    {selectedQuote.document_date ? new Date(selectedQuote.document_date).toLocaleDateString() : '---'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Comercial:</span>
                  <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">{selectedQuote.sales_rep?.name || selectedQuote.salesperson_code || '---'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Prob. Éxito:</span>
                  <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">
                    {selectedQuote.probabilidad_exito !== null ? `${selectedQuote.probabilidad_exito}%` : '---'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Pedido Confirmado:</span>
                  <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">{selectedQuote.pedido_confirmado ? 'Sí' : 'No'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Cerrado en ERP:</span>
                  <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">{selectedQuote.cerrado ? 'Sí' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Additional info */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-dts-primary dark:text-dts-secondary border-b border-gray-100 dark:border-white/5 pb-2">Información de Fechas</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Fecha de Confirmación:</span>
                  <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">
                    {selectedQuote.confirmacion_date ? new Date(selectedQuote.confirmacion_date).toLocaleDateString() : '---'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Cierre Previsto:</span>
                  <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">
                    {selectedQuote.cierreprev_date ? new Date(selectedQuote.cierreprev_date).toLocaleDateString() : '---'}
                  </span>
                </div>
              </div>
            </div>

            {/* References */}
            {(selectedQuote.external_doc_no || selectedQuote.your_reference || selectedQuote.catproducto_code || selectedQuote.oferta_type) && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-dts-primary dark:text-dts-secondary border-b border-gray-100 dark:border-white/5 pb-2">Referencias</h4>
                <div className="space-y-3 text-xs">
                  {selectedQuote.external_doc_no && (
                    <div>
                      <span className="text-gray-400 block font-medium">Nº Doc. Externo:</span>
                      <span className="font-mono font-bold text-gray-900 dark:text-white block mt-0.5">{selectedQuote.external_doc_no}</span>
                    </div>
                  )}
                  {selectedQuote.your_reference && (
                    <div>
                      <span className="text-gray-400 block font-medium">Su Referencia:</span>
                      <span className="font-bold text-gray-900 dark:text-white block mt-0.5">{selectedQuote.your_reference}</span>
                    </div>
                  )}
                  {selectedQuote.catproducto_code && (
                    <div>
                      <span className="text-gray-400 block font-medium">Cat. Producto:</span>
                      <span className="font-bold text-gray-900 dark:text-white block mt-0.5">{selectedQuote.catproducto_code}</span>
                    </div>
                  )}
                  {selectedQuote.oferta_type && (
                    <div>
                      <span className="text-gray-400 block font-medium">Tipo Oferta:</span>
                      <span className="font-bold text-gray-900 dark:text-white block mt-0.5">{selectedQuote.oferta_type}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes / Reason */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-dts-primary dark:text-dts-secondary border-b border-gray-100 dark:border-white/5 pb-2">Seguimiento y Notas</h4>
              <div className="space-y-3 text-xs">
                {selectedQuote.motivo_ganada && (
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-lg border border-emerald-100/30">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold block">Motivo de Éxito (Ganada)</span>
                    <span className="text-gray-700 dark:text-gray-300 block mt-1 leading-relaxed">{selectedQuote.motivo_ganada}</span>
                  </div>
                )}
                {selectedQuote.motivo_perdida && (
                  <div className="p-3 bg-rose-50/50 dark:bg-rose-950/10 rounded-lg border border-rose-100/30">
                    <span className="text-rose-700 dark:text-rose-400 font-bold block">Motivo de Descarte (Perdida)</span>
                    <span className="text-gray-700 dark:text-gray-300 block mt-1 leading-relaxed">{selectedQuote.motivo_perdida}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 block font-medium">Observaciones del Comercial:</span>
                  <div className="p-3 bg-gray-50 dark:bg-white/1 rounded-lg border border-gray-100 dark:border-white/5 mt-1">
                    <span className="text-gray-700 dark:text-gray-300 italic block leading-relaxed whitespace-pre-wrap">
                      {selectedQuote.observaciones || 'Sin observaciones registradas.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

interface KPICardProps {
  title: string;
  value: number;
  type?: 'number' | 'currency' | 'percentage';
  icon: any;
  status?: 'success' | 'danger' | 'warning' | 'normal';
  subtitle?: string;
  infoProps?: {
    description: string;
    formulas?: string;
  };
}

const KPICard: React.FC<KPICardProps> = ({ title, value, type = 'number', icon: Icon, status, subtitle, infoProps }) => {
  const colorClass = status === 'success' ? 'text-emerald-500' : status === 'danger' ? 'text-red-500' : 'text-dts-primary dark:text-white';
  const formattedValue = type === 'currency' ? formatCurrency(value, 0) : type === 'percentage' ? `${formatNumber(value, 1)}%` : formatNumber(value, 0);

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
      {subtitle && <div className="text-[10px] text-gray-400 mt-1 font-medium">{subtitle}</div>}
    </div>
  );
};
