import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllQuotes, getQuoteById, updateCrmQuote, type SalesQuote } from '../../api/quotes';
import { getCustomerSalespersons } from '../../api/customers';
import { formatCurrency, formatNumber } from '../../api/formatters';
import { 
  Search, FileText, Euro, CheckCircle, Percent, ArrowUpDown, 
  ChevronUp, ChevronDown, Sparkles, BarChart3, Calendar,
  AlertTriangle, ChevronLeft, ChevronRight, Check, X, Clock, HelpCircle
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

  const queryClient = useQueryClient();

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

  // Estados para Filtro de Cierre Previsto (Opción 1)
  const [enableCierreFilter, setEnableCierreFilter] = useState<boolean>(false);
  const [cierrePrevYear, setCierrePrevYear] = useState<number>(new Date().getFullYear());
  // selectedCierreFilter: 'all' | 'none' | 'overdue' | 'months'
  const [cierreMode, setCierreMode] = useState<'all' | 'none' | 'overdue' | 'months'>('all');
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  // Estado editable en drawer
  const [editingCierreDate, setEditingCierreDate] = useState<string>('');
  const [isSavingCierre, setIsSavingCierre] = useState(false);

  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const list = [];
    for (let y = currentYear; y >= 2022; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  // Años disponibles para cierre previsto (desde el pasado hasta 2 años en el futuro)
  const availableCierreYears = useMemo(() => {
    const list = [];
    for (let y = currentYear + 2; y >= currentYear - 2; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  const observerTarget = useRef<HTMLTableRowElement>(null);
  const pageSize = 50;

  // Parámetro formateado para la API de cierre previsto
  const cierrePrevMonthsParam = useMemo(() => {
    if (!enableCierreFilter) return undefined;
    if (cierreMode === 'overdue') return 'overdue';
    if (cierreMode === 'none') return 'none';
    if (cierreMode === 'months' && selectedMonths.length > 0) {
      return selectedMonths.sort((a, b) => a - b).join(',');
    }
    return 'all';
  }, [enableCierreFilter, cierreMode, selectedMonths]);

  const effectiveCierreYearParam = useMemo(() => {
    if (!enableCierreFilter) return undefined;
    if (cierreMode === 'overdue' || cierreMode === 'none') return undefined;
    return cierrePrevYear;
  }, [enableCierreFilter, cierreMode, cierrePrevYear]);

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
    queryKey: [
      'sales-quotes', 
      debouncedSearch, 
      salespersonFilter, 
      stateFilter, 
      closedFilter, 
      sortBy, 
      sortDir, 
      yearFilter, 
      probabilityFilter,
      enableCierreFilter,
      effectiveCierreYearParam,
      cierrePrevMonthsParam
    ],
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
      probabilidadExito: probabilityFilter || undefined,
      cierrePrevYear: effectiveCierreYearParam,
      cierrePrevMonths: cierrePrevMonthsParam
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

  // Sincronizar fecha en drawer cuando se cargue la oferta
  useEffect(() => {
    if (selectedQuote) {
      setEditingCierreDate(selectedQuote.cierreprev_date ? selectedQuote.cierreprev_date.split('T')[0] : '');
    }
  }, [selectedQuote]);

  // Mutación para guardar fecha de cierre previsto directamente desde el Drawer
  const updateCierreMutation = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string | null }) => {
      return updateCrmQuote(id, { cierreprev_date: date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote-detail', selectedQuoteId] });
      setIsSavingCierre(false);
    },
    onError: () => {
      setIsSavingCierre(false);
    }
  });

  const handleSaveCierreDate = () => {
    if (!selectedQuoteId) return;
    setIsSavingCierre(true);
    updateCierreMutation.mutate({
      id: selectedQuoteId,
      date: editingCierreDate ? editingCierreDate : null
    });
  };

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
      probabilidadExito: probabilityFilter || undefined,
      cierrePrevYear: effectiveCierreYearParam,
      cierrePrevMonths: cierrePrevMonthsParam
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

  // Helper para verificar estado de cierre previsto
  const getCierreStatus = (cierreDateStr: string | null, estado: string | null) => {
    if (!cierreDateStr) return { type: 'none', label: 'Sin fecha' };

    const lower = (estado || '').toLowerCase();
    const isClosed = lower.includes('ganada') || lower.includes('ganado') || lower.includes('perdida') || lower.includes('perdido');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cDate = new Date(cierreDateStr);
    cDate.setHours(0, 0, 0, 0);

    const diffTime = cDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (!isClosed && diffDays < 0) {
      return { 
        type: 'overdue', 
        label: `Vencida (${Math.abs(diffDays)}d)`, 
        days: Math.abs(diffDays) 
      };
    }

    if (!isClosed && diffDays >= 0 && diffDays <= 7) {
      return { 
        type: 'urgent', 
        label: diffDays === 0 ? 'Vence hoy' : `Vence en ${diffDays}d`, 
        days: diffDays 
      };
    }

    return { type: 'normal', label: '', days: diffDays };
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

        {/* --- BARRA DE FILTRADO POR CIERRE PREVISTO (OPCIÓN 1 CON SELECTOR HABILITAR/DESHABILITAR) --- */}
        <div className={`border-b transition-all duration-300 px-4 py-2.5 text-xs ${
          enableCierreFilter 
            ? 'bg-gradient-to-r from-teal-50/50 via-slate-50 to-teal-50/30 dark:from-teal-950/20 dark:via-dts-primary-dark/40 dark:to-slate-900/60 border-teal-200/70 dark:border-teal-900/50' 
            : 'bg-gray-50/40 dark:bg-white/[0.02] border-gray-200/60 dark:border-gray-800/60'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Lado izquierdo: Switch Habilitar/Deshabilitar y Controles */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Selector / Toggle: Habilitar filtrado por Cierre Previsto */}
              <button
                type="button"
                onClick={() => setEnableCierreFilter(prev => !prev)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all shadow-2xs cursor-pointer border ${
                  enableCierreFilter
                    ? 'bg-teal-600 dark:bg-teal-500 text-white border-teal-600 dark:border-teal-500 shadow-sm'
                    : 'bg-white dark:bg-surface-card-dark border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400'
                }`}
                title={enableCierreFilter ? "Desactivar filtrado por cierre previsto (ver todas las ofertas según filtros generales)" : "Activar filtrado por cierre previsto"}
              >
                {/* Visual toggle pill */}
                <div className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-300 ${
                  enableCierreFilter ? 'bg-white/30 justify-end' : 'bg-gray-300 dark:bg-gray-600 justify-start'
                }`}>
                  <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-300 shadow-sm`}></div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className={enableCierreFilter ? 'text-white' : 'text-gray-400'} />
                  <span>Filtrar por Cierre Previsto:</span>
                  <span className={`text-[10px] uppercase font-black px-1.5 py-0.2 rounded ${
                    enableCierreFilter 
                      ? 'bg-white/20 text-white' 
                      : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                  }`}>
                    {enableCierreFilter ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
              </button>

              {!enableCierreFilter && (
                <span className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                  Mostrando todas las ofertas (activa el selector para filtrar por año/meses de cierre previsto)
                </span>
              )}

              {/* Controles de Cierre Previsto (Visibles cuando está activo) */}
              {enableCierreFilter && (
                <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-0.5"></div>

                  {/* Selector de Año con flechas */}
                  <div className="flex items-center bg-white dark:bg-surface-card-dark border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xs overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCierrePrevYear(prev => prev - 1)}
                      className="p-1 px-1.5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
                      title="Año anterior"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <select
                      value={cierrePrevYear}
                      onChange={(e) => setCierrePrevYear(Number(e.target.value))}
                      className="bg-transparent text-center font-black text-xs text-gray-900 dark:text-white py-1 px-1 focus:outline-none cursor-pointer"
                    >
                      {availableCierreYears.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setCierrePrevYear(prev => prev + 1)}
                      className="p-1 px-1.5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
                      title="Año siguiente"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  {/* Botón: Todo el año */}
                  <button
                    type="button"
                    onClick={() => {
                      setCierreMode('all');
                      setSelectedMonths([]);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer shadow-2xs ${
                      cierreMode === 'all'
                        ? 'bg-dts-primary text-white dark:bg-dts-secondary dark:text-slate-900 shadow-sm'
                        : 'bg-white dark:bg-surface-card-dark border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-dts-secondary/50'
                    }`}
                  >
                    Todo {cierrePrevYear}
                  </button>

                  {/* Trimestres (T1, T2, T3, T4) */}
                  <div className="flex items-center bg-white dark:bg-surface-card-dark border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 shadow-2xs">
                    {[
                      { label: 'T1', months: [1, 2, 3] },
                      { label: 'T2', months: [4, 5, 6] },
                      { label: 'T3', months: [7, 8, 9] },
                      { label: 'T4', months: [10, 11, 12] }
                    ].map(q => {
                      const isQSelected = cierreMode === 'months' && 
                        q.months.every(m => selectedMonths.includes(m)) && 
                        selectedMonths.length === 3;
                      return (
                        <button
                          key={q.label}
                          type="button"
                          onClick={() => {
                            setCierreMode('months');
                            setSelectedMonths(q.months);
                          }}
                          className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-colors cursor-pointer ${
                            isQSelected
                              ? 'bg-dts-primary text-white dark:bg-dts-secondary dark:text-slate-900'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                          title={`Trimestre ${q.label} (${q.months.join(', ')})`}
                        >
                          {q.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Filtros especiales de Cierre: Vencidas y Sin fecha */}
                  <button
                    type="button"
                    onClick={() => {
                      if (cierreMode === 'overdue') {
                        setCierreMode('all');
                      } else {
                        setCierreMode('overdue');
                        setSelectedMonths([]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      cierreMode === 'overdue'
                        ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400/50 animate-pulse'
                        : 'bg-white dark:bg-surface-card-dark border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                    }`}
                    title="Mostrar únicamente ofertas abiertas con fecha de cierre prevista ya vencida"
                  >
                    <AlertTriangle size={13} />
                    <span>Vencidas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (cierreMode === 'none') {
                        setCierreMode('all');
                      } else {
                        setCierreMode('none');
                        setSelectedMonths([]);
                      }
                    }}
                    className={`px-2 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${
                      cierreMode === 'none'
                        ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 shadow-sm'
                        : 'bg-white dark:bg-surface-card-dark border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                    title="Mostrar ofertas sin fecha de cierre prevista registrada"
                  >
                    <HelpCircle size={12} />
                    <span>Sin fecha</span>
                  </button>
                </div>
              )}
            </div>

            {/* Lado derecho: Métricas de Cierre Previsto en el periodo filtrado */}
            {enableCierreFilter && (
              <div className="flex items-center gap-4 bg-white/90 dark:bg-surface-card-dark/90 px-3 py-1.5 rounded-xl border border-gray-200/70 dark:border-gray-700/70 shadow-2xs animate-in fade-in duration-200">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Cierre Previsto Nominal</span>
                  <span className="text-xs font-mono font-black text-dts-primary dark:text-white">
                    {formatCurrency(summary.totalAmount, 0)}
                  </span>
                </div>
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={10} className="text-dts-secondary" />
                    Valor Ponderado
                  </span>
                  <span className="text-xs font-mono font-black text-dts-secondary">
                    {formatCurrency(summary.totalWeightedValue, 0)}
                  </span>
                </div>
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Ofertas</span>
                  <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">
                    {summary.totalCount}
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* Segunda fila: Botones de Meses (Pills Ene - Dic) SOLO si está activo el filtro */}
          {enableCierreFilter && (
            <div className="mt-2.5 pt-2 border-t border-gray-200/60 dark:border-gray-800/60 flex flex-wrap items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-[10px] text-gray-400 font-semibold uppercase mr-1">Meses:</span>
              {[
                { num: 1, name: 'Ene' },
                { num: 2, name: 'Feb' },
                { num: 3, name: 'Mar' },
                { num: 4, name: 'Abr' },
                { num: 5, name: 'May' },
                { num: 6, name: 'Jun' },
                { num: 7, name: 'Jul' },
                { num: 8, name: 'Ago' },
                { num: 9, name: 'Sep' },
                { num: 10, name: 'Oct' },
                { num: 11, name: 'Nov' },
                { num: 12, name: 'Dic' }
              ].map(m => {
                const isSelected = cierreMode === 'months' && selectedMonths.includes(m.num);
                const isCurrentMonth = new Date().getFullYear() === cierrePrevYear && (new Date().getMonth() + 1) === m.num;

                return (
                  <button
                    key={m.num}
                    type="button"
                    onClick={(e) => {
                      setCierreMode('months');
                      if (e.ctrlKey || e.metaKey || e.shiftKey) {
                        if (selectedMonths.includes(m.num)) {
                          const next = selectedMonths.filter(n => n !== m.num);
                          if (next.length === 0) setCierreMode('all');
                          else setSelectedMonths(next);
                        } else {
                          setSelectedMonths(prev => [...prev, m.num]);
                        }
                      } else {
                        if (selectedMonths.length === 1 && selectedMonths[0] === m.num && cierreMode === 'months') {
                          setCierreMode('all');
                          setSelectedMonths([]);
                        } else {
                          setSelectedMonths([m.num]);
                        }
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer relative shadow-2xs ${
                      isSelected
                        ? 'bg-dts-primary text-white dark:bg-dts-secondary dark:text-slate-900 shadow-sm font-black ring-1 ring-dts-primary/20'
                        : 'bg-white dark:bg-surface-card-dark border border-gray-200 dark:border-gray-700/80 text-gray-700 dark:text-gray-300 hover:border-dts-secondary hover:text-dts-secondary'
                    }`}
                    title={`${m.name} ${cierrePrevYear} (Usa Ctrl+clic para multiselección)`}
                  >
                    {m.name}
                    {isCurrentMonth && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-dts-secondary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-dts-secondary"></span>
                      </span>
                    )}
                  </button>
                );
              })}

              <span className="text-[10px] text-gray-400 italic ml-2 hidden sm:inline">
                Tip: Haz clic en un mes o usa Ctrl+clic para seleccionar varios
              </span>

              {(cierreMode !== 'all' || selectedMonths.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setCierreMode('all');
                    setSelectedMonths([]);
                  }}
                  className="ml-auto text-[10px] text-dts-secondary hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  <X size={11} />
                  Limpiar meses
                </button>
              )}
            </div>
          )}
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
                  <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
                    {(() => {
                      const cierreInfo = getCierreStatus(quote.cierreprev_date, quote.estado_oferta);
                      if (cierreInfo.type === 'overdue') {
                        return (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200/50 dark:border-rose-900/50 animate-pulse text-[11px]">
                              <AlertTriangle size={11} />
                              {new Date(quote.cierreprev_date!).toLocaleDateString('es-ES')}
                            </span>
                            <span className="text-[9px] font-bold text-rose-500 mt-0.5">{cierreInfo.label}</span>
                          </div>
                        );
                      }
                      if (cierreInfo.type === 'urgent') {
                        return (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-900/50 text-[11px]">
                              <Clock size={11} />
                              {new Date(quote.cierreprev_date!).toLocaleDateString('es-ES')}
                            </span>
                            <span className="text-[9px] font-bold text-amber-500 mt-0.5">{cierreInfo.label}</span>
                          </div>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300">
                          <Calendar size={12} className="text-gray-400" />
                          {quote.cierreprev_date ? new Date(quote.cierreprev_date).toLocaleDateString('es-ES') : <span className="text-gray-400 dark:text-gray-600">---</span>}
                        </span>
                      );
                    })()}
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

            {/* Additional info / Fechas */}
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
                  <label className="text-gray-400 block font-medium mb-1 flex items-center justify-between">
                    <span>Cierre Previsto (CRM):</span>
                    {editingCierreDate !== (selectedQuote.cierreprev_date ? selectedQuote.cierreprev_date.split('T')[0] : '') && (
                      <span className="text-[10px] text-amber-500 font-semibold animate-pulse">Sin guardar</span>
                    )}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="date" 
                      value={editingCierreDate}
                      onChange={(e) => setEditingCierreDate(e.target.value)}
                      className="w-full bg-white dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCierreDate}
                      disabled={isSavingCierre || editingCierreDate === (selectedQuote.cierreprev_date ? selectedQuote.cierreprev_date.split('T')[0] : '')}
                      className="p-1.5 rounded-lg bg-dts-primary hover:bg-dts-primary/90 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Guardar Cierre Previsto"
                    >
                      {isSavingCierre ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Check size={14} />
                      )}
                    </button>
                  </div>
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
