import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { 
  TrendingUp, Target, DollarSign, Activity, Loader2, Package, Search,
  PieChart as PieChartIcon, ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';

import { 
  getSalesBudgetPerformance, 
  getSalesBudgetEvolution, 
  getSalesReps,
  getProductFamilies
} from '../../api';
import { getSalesBudgetPerformanceExport } from '../../api/salesBudget';
import { ExportButton } from '../../components/ui';
import { exportToXlsx } from '../../utils/exportToXlsx';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { formatCurrency, formatNumber } from '../../api/formatters';
import { InfoPopover } from '../../components/ui';
import { KPICard, BudgetEvolutionChart } from './components/budgetShared';
import { BudgetFiltersSidebar } from './components/BudgetFiltersSidebar';


// --- Main Page Component ---

export const SalesBudgetPage: React.FC = () => {
  const { setPageInfo } = useUIStore();
  const { profile } = useAuthStore();
  const observerTarget = useRef<HTMLTableRowElement>(null);
  const pageSize = 50;

  // Filters State
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const initialMonths = Array.from({ length: currentMonth }, (_, i) => i + 1);

  // Filters State
  const [year, setYear] = useState<number>(currentYear);
  const [selectedMonths, setSelectedMonths] = useState<number[]>(initialMonths);
  const [familyFilter, setFamilyFilter] = useState<string>('');
  const [subfamilyFilter, setSubfamilyFilter] = useState<string>('');
  const [salespersonFilter, setSalespersonFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('facturacion');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sidebarRef = useRef<HTMLDivElement>(null);
  const [sidebarHeight, setSidebarHeight] = useState<number>(600);

  useEffect(() => {
    if (!sidebarRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target) {
          setSidebarHeight(entry.target.clientHeight);
        }
      }
    });
    resizeObserver.observe(sidebarRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const isSalesperson = Boolean(profile?.code);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPageInfo({
      title: 'Ventas vs Presupuestos',
      subtitle: 'Análisis y cumplimiento comercial (Seguimiento de Objetivos)',
      icon: <PieChartIcon size={20} />,
      infoProps: {
        title: 'Ventas vs Presupuestos',
        description: 'Comparativa en tiempo real de la facturación real frente a los objetivos presupuestados.',
        objective: 'Analizar el grado de cumplimiento de los objetivos comerciales y detectar desviaciones por familias o vendedores de forma proactiva.',
        source: 'Basado en facturas de venta, abonos y presupuestos cargados en el sistema.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  // Queries
  const { 
    data: infiniteData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: isLoadingPerf, isFetching: isFetchingPerf 
  } = useInfiniteQuery({
    queryKey: ['salesBudgetPerf', year, selectedMonths, salespersonFilter, debouncedSearch, familyFilter, subfamilyFilter, sortBy, sortDir],
    queryFn: ({ pageParam = 0 }) => getSalesBudgetPerformance({ 
      year, months: selectedMonths,
      salespersonCode: isSalesperson ? profile?.code : (salespersonFilter || undefined),
      search: debouncedSearch || undefined,
      familyCode: familyFilter || undefined, subfamilyCode: subfamilyFilter || undefined,
      sortBy, sortDir, take: pageSize, skip: pageParam as number
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextSkip = allPages.length * pageSize;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
    placeholderData: keepPreviousData,
  });

  const { data: evolutionData } = useQuery({
    queryKey: ['salesEvol', year, familyFilter, subfamilyFilter, salespersonFilter, debouncedSearch],
    queryFn: () => getSalesBudgetEvolution({
      year, familyCode: familyFilter || undefined, subfamilyCode: subfamilyFilter || undefined,
      salespersonCode: isSalesperson ? profile?.code : (salespersonFilter || undefined),
      search: debouncedSearch || undefined
    }),
  });



  const { data: categories = [] } = useQuery({ queryKey: ['prodCats'], queryFn: getProductFamilies });
  const { data: salespersons = [] } = useQuery({ queryKey: ['salesReps'], queryFn: getSalesReps, enabled: !isSalesperson });

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Derived Data
  const { tableData, performanceKPIs } = useMemo(() => {
    const allRows = infiniteData?.pages.flatMap(page => page.rows || []) || [];
    const kpis = infiniteData?.pages[0]?.kpis || { 
      ventas: 0, objetivo: 0, desviacionEur: 0, desviacionPct: 0,
      carteraVentas: 0, carteraVentasAccounts: 0,
      enviadosFacturar: 0, enviadosFacturarAccounts: 0,
      enviadosFacturarBruto: 0,
      prepagosDescontadosFacturar: 0,
      facturacionNuevos: 0,
      facturasOrdinarias: 0,
      prepagosFacturados: 0,
      abonosDevoluciones: 0,
      carteraVentasBruta: 0,
      prepagosDescontadosCartera: 0,
    };
    return { tableData: allRows, performanceKPIs: kpis };
  }, [infiniteData]);

  // selectionTotals removed to use stable absolute totals from performanceKPIs
  const salespersonOptions = useMemo(() => salespersons.map(s => ({ value: s.code, label: `${s.code} - ${s.name}` })), [salespersons]);

  // Handlers
  const toggleMonth = (m: number) => {
    setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a,b)=>a-b));
  };

  const clearFilters = () => {
    setSelectedMonths([]); setFamilyFilter(''); setSubfamilyFilter(''); setSalespersonFilter('');
    setSearchTerm(''); setYear(new Date().getFullYear());
  };

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('desc'); }
  };

  const getSortIcon = (key: string) => {
    if (sortBy !== key) return <ArrowUpDown size={12} className="ml-1 opacity-20 group-hover:opacity-100" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="ml-1 text-dts-secondary" /> : <ChevronDown size={12} className="ml-1 text-dts-secondary" />;
  };

  const handleExport = async () => {
    const result = await getSalesBudgetPerformanceExport({
      year,
      months: selectedMonths,
      salespersonCode: isSalesperson ? profile?.code : (salespersonFilter || undefined),
      search: debouncedSearch || undefined,
      familyCode: familyFilter || undefined,
      subfamilyCode: subfamilyFilter || undefined,
      sortBy,
      sortDir,
    });

    const columns = [
      { key: 'customerCode', label: 'Código Cliente' },
      { key: 'customerName', label: 'Cliente' },
      { key: 'facturacion', label: 'Fact. YTD (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
      { key: 'facturacionAnioAnterior', label: 'Fact. LY (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
      { key: 'objetivo', label: 'Objetivo (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
      { key: 'desviacion', label: 'Desviación (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
      { key: 'desviacionPorcentaje', label: 'Desv. (%)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
      { key: 'isNew', label: 'Cliente Nuevo', format: (v: boolean) => v ? 'Sí' : 'No' },
    ];

    const totalsRow = {
      customerCode: '',
      customerName: 'TOTALES',
      facturacion: performanceKPIs.ventas,
      facturacionAnioAnterior: (performanceKPIs as any).facturacionAnioAnterior || 0,
      objetivo: performanceKPIs.objetivo,
      desviacion: performanceKPIs.desviacionEur,
      desviacionPorcentaje: performanceKPIs.desviacionPct,
      isNew: false,
    };

    exportToXlsx(result?.rows || [], columns, `ventas_presupuesto_${year}`, totalsRow);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">





      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
        <KPICard 
          title="Facturación" 
          value={performanceKPIs.ventas} 
          type="currency" 
          icon={TrendingUp} 
          isLoading={isLoadingPerf} 
          subtext={performanceKPIs.prepagosFacturados ? `Incluye ${formatCurrency(performanceKPIs.prepagosFacturados, 0)} en prepagos` : undefined}
          infoProps={{ 
            title: "Facturación Neta",
            description: "Total de ventas reales acumuladas netas (Facturas Ordinarias + Prepagos - Devoluciones/Abonos) para el periodo y filtros actuales.", 
            formulas: "Facturas Ordinarias (FV) + Facturas Prepago (PFV) - Facturas Devolución (AAV)",
            source: "sales_documents (FV + PFV - AAV)",
            breakdown: [
              { label: "Facturas Ordinarias (FV)", value: formatCurrency(performanceKPIs.facturasOrdinarias || 0), sign: '+', color: 'text-emerald-600 dark:text-emerald-400' },
              { label: "Facturas Prepago (PFV)", value: formatCurrency(performanceKPIs.prepagosFacturados || 0), sign: '+', color: 'text-cyan-600 dark:text-cyan-400' },
              { label: "Devoluciones y Abonos (AAV)", value: formatCurrency(performanceKPIs.abonosDevoluciones || 0), sign: '-', color: 'text-red-500' },
              { label: "Total Facturación Neta", value: formatCurrency(performanceKPIs.ventas || 0), sign: '=', color: 'text-dts-primary dark:text-white font-bold' },
            ]
          }} 
        />
        <KPICard title="Objetivo" value={performanceKPIs.objetivo} type="currency" icon={Target} isLoading={isLoadingPerf} infoProps={{ title: "Objetivo Presupuestado", description: "Cifra de ventas presupuestada como objetivo para el periodo y filtros seleccionados.", objective: "Indica la meta comercial a alcanzar." }} />
        <KPICard title="Desviación" value={performanceKPIs.desviacionEur} type="currency" icon={DollarSign} status={performanceKPIs.desviacionEur >= 0 ? 'success' : 'danger'} isLoading={isLoadingPerf} infoProps={{ title: "Desviación Nominal", description: "Diferencia absoluta entre la facturación real neta y el objetivo.", formulas: "Ventas Reales - Objetivo Presupuestado" }} />
        <KPICard title="Cumplimiento" value={performanceKPIs.desviacionPct} type="percentage" icon={Activity} status={performanceKPIs.desviacionPct >= 0 ? 'success' : 'danger'} isLoading={isLoadingPerf} infoProps={{ title: "Cumplimiento Porcentual", description: "Tasa de cumplimiento del objetivo en porcentaje.", formulas: "(Ventas Reales / Objetivo) * 100" }} />
        <KPICard 
          title="Cartera Pedidos" 
          value={performanceKPIs.carteraVentas} 
          accountValue={performanceKPIs.carteraVentasAccounts} 
          type="currency" 
          icon={Package} 
          isLoading={isLoadingPerf} 
          infoProps={{ 
            title: "Cartera de Pedidos",
            description: "Importe total de los pedidos de venta abiertos y pendientes de servir. El valor entre paréntesis indica la porción de líneas de tipo cuenta.", 
            formulas: "Sumatorio Pedidos Abiertos (Sales Orders)",
            source: "Tabla sales_orders"
          }} 
        />
        <KPICard 
          title="Pend. Facturar" 
          value={performanceKPIs.enviadosFacturar} 
          accountValue={performanceKPIs.enviadosFacturarAccounts} 
          type="currency" 
          icon={DollarSign} 
          status="warning" 
          isLoading={isLoadingPerf} 
          infoProps={{ 
            title: "Pendiente de Facturar (Neto)", 
            description: "Total neto de albaranes de venta enviados físicamente al cliente pero pendientes de emitir su factura definitiva. El valor entre paréntesis indica la porción de líneas de tipo cuenta contable.", 
            formulas: "Sumatorio (Cantidad Enviada No Facturada * Precio) - Prepagos aplicados", 
            source: "sales_orders (qty_shipped_not_invoiced)",
            breakdown: [
              { label: "Enviado no facturado bruto", value: formatCurrency(performanceKPIs.enviadosFacturarBruto || performanceKPIs.enviadosFacturar || 0), sign: 'i', color: 'text-gray-600 dark:text-gray-300' },
              { label: "Prepagos ya facturados", value: formatCurrency(performanceKPIs.prepagosDescontadosFacturar || 0), sign: '-', color: 'text-cyan-600 dark:text-cyan-400' },
              { label: "Total Pend. por Facturar", value: formatCurrency(performanceKPIs.enviadosFacturar || 0), sign: '=', color: 'text-emerald-600 dark:text-emerald-400 font-bold' },
            ]
          }} 
        />
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Filters Sidebar */}
        <BudgetFiltersSidebar
          sidebarRef={sidebarRef}
          year={year}
          onYearChange={setYear}
          selectedMonths={selectedMonths}
          onToggleMonth={toggleMonth}
          categories={categories}
          familyFilter={familyFilter}
          onFamilyChange={setFamilyFilter}
          subfamilyFilter={subfamilyFilter}
          onSubfamilyChange={setSubfamilyFilter}
          showSalesperson={!isSalesperson}
          salespersonFilter={salespersonFilter}
          onSalespersonChange={setSalespersonFilter}
          salespersonOptions={salespersonOptions}
          isSalesperson={isSalesperson}
          onClearFilters={clearFilters}
          hasActiveFilters={Boolean(selectedMonths.length > 0 || familyFilter || subfamilyFilter || salespersonFilter || searchTerm)}
        />

        {/* Performance Table */}
        <div 
          className="lg:col-span-4 bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col"
          style={{ height: `${sidebarHeight}px` }}
        >
          {/* Table Toolbar - Joined */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-transparent">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="w-full max-w-md relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  {isFetchingPerf && debouncedSearch ? (
                    <Loader2 size={16} className="animate-spin text-dts-secondary" />
                  ) : (
                    <Search size={16} />
                  )}
                </div>
                <input 
                  type="text" 
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dts-secondary/50 sm:text-sm" 
                  placeholder="Buscar cliente por nombre o código..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
              
              <div className="flex items-center gap-2">
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="px-3 py-1.5 text-[10px] font-bold text-dts-secondary hover:bg-dts-secondary/10 rounded-lg transition-colors border border-dts-secondary/20"
                  >
                    LIMPIAR BÚSQUEDA
                  </button>
                )}
                <ExportButton onExport={handleExport} />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar relative">
            <table className="w-full text-left text-sm border-separate border-spacing-0 table-fixed">

                <thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg">
                  <tr>
                    <th className="w-[40%] px-6 py-4 font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:bg-white/10" onClick={() => handleSort('customerName')}>
                      <div className="flex items-center">Cliente {getSortIcon('customerName')}</div>
                    </th>
                    <th className="w-[15%] px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('facturacion')}>
                      <div className="flex items-center justify-end">Fact. YTD {getSortIcon('facturacion')}</div>
                    </th>
                    <th className="w-[15%] px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('facturacionAnioAnterior')}>
                      <div className="flex items-center justify-end">Fact. LY {getSortIcon('facturacionAnioAnterior')}</div>
                    </th>
                    <th className="w-[15%] px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('objetivo')}>
                      <div className="flex items-center justify-end">Objetivo {getSortIcon('objetivo')}</div>
                    </th>
                    <th className="w-[15%] px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('desviacion')}>
                      <div className="flex items-center justify-end">Desviación {getSortIcon('desviacion')}</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-dts-primary dark:text-gray-300">
                  {isLoadingPerf && !infiniteData ? 
                    <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-dts-secondary" /></td></tr>
                   : tableData.length === 0 ? 
                    <tr><td colSpan={5} className="py-20 text-center text-gray-400 opacity-60">Sin datos de rendimiento para los filtros aplicados</td></tr>
                   : 
                    tableData.map((row, idx) => (
                      <tr key={`${row.customerCode}-${idx}`} className={`transition-colors ${row.isNew ? 'bg-emerald-50/30 dark:bg-emerald-500/5 hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10' : 'hover:bg-gray-50/80 dark:hover:bg-white/5'}`}>
                        <td className="px-6 py-3 font-medium">
                          <div className="flex flex-col truncate">
                            <div className="flex items-center gap-2 truncate">
                              <span className="truncate" title={row.customerName}>{row.customerName}</span>
                              {row.isNew && <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 animate-pulse uppercase">Nuevo</span>}
                            </div>
                            <span className="text-[10px] font-mono text-gray-400">{row.customerCode}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right font-mono">{formatCurrency(row.facturacion, 0)}</td>
                        <td className="px-6 py-3 text-right font-mono text-gray-400">{(row as any).facturacionAnioAnterior ? formatCurrency((row as any).facturacionAnioAnterior, 0) : '-'}</td>
                        <td className="px-6 py-3 text-right font-mono">{formatCurrency(row.objetivo, 0)}</td>
                        <td className="px-6 py-3 text-right font-mono">
                          <div className={row.desviacion < 0 ? 'text-red-500 font-bold' : 'text-emerald-500'}>
                            {row.desviacion > 0 ? '+' : ''}{formatCurrency(row.desviacion, 0)}
                          </div>
                          <div className={`text-[10px] font-bold ${row.desviacionPorcentaje < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {row.desviacionPorcentaje > 0 ? '+' : ''}{formatNumber(row.desviacionPorcentaje, 1)}%
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                  <tr ref={observerTarget}><td colSpan={5} className="py-8 text-center text-gray-400 text-[10px] opacity-60 uppercase tracking-widest">{isFetchingNextPage ? 'Cargando más clientes...' : hasNextPage ? 'Desplázate para cargar más' : 'Fin del listado'}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Fixed Footer Table */}
            {tableData.length > 0 && (
              <div className="bg-dts-primary text-white font-bold text-xs uppercase shadow-[0_-5px_15px_rgba(0,0,0,0.2)] border-t border-white/10 z-30">
                <table className="w-full text-left text-[10px] border-separate border-spacing-0 table-fixed">
                  <tbody>
                    <tr className="font-bold">
                      <td className="w-[40%] px-6 py-4 tracking-widest">TOTALES FILTRADOS</td>
                      <td className="w-[15%] px-6 py-4 text-right font-mono">{formatCurrency(performanceKPIs.ventas, 0)}</td>
                      <td className="w-[15%] px-6 py-4 text-right font-mono opacity-60">{(performanceKPIs as any).facturacionAnioAnterior ? formatCurrency((performanceKPIs as any).facturacionAnioAnterior, 0) : '-'}</td>
                      <td className="w-[15%] px-6 py-4 text-right font-mono">{formatCurrency(performanceKPIs.objetivo, 0)}</td>
                      <td className="w-[15%] px-6 py-4 text-right font-mono">
                        <div className={performanceKPIs.desviacionEur < 0 ? 'text-red-400' : 'text-emerald-400'}>
                          {performanceKPIs.desviacionEur > 0 ? '+' : ''}{formatCurrency(performanceKPIs.desviacionEur, 0)}
                        </div>
                        <div className={`text-[10px] ${performanceKPIs.desviacionPct < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {performanceKPIs.desviacionPct > 0 ? '+' : ''}{formatNumber(performanceKPIs.desviacionPct, 1)}%
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      {/* Evolution Chart */}
      <BudgetEvolutionChart
        data={evolutionData}
        selectedMonths={selectedMonths}
        year={year}
        title={`Evolución Comercial ${year}`}
      />
    </div>
  );
};

