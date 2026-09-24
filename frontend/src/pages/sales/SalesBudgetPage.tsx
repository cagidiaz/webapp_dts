import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { 
  TrendingUp, Target, DollarSign, Activity, Loader2, Package, Search,
  PieChart as PieChartIcon, ArrowUpDown, ChevronUp, ChevronDown,
  Building2, Users
} from 'lucide-react';

import { 
  getSalesBudgetPerformance, 
  getSalesBudgetEvolution, 
  getSalesReps,
  getProductFamilies
} from '../../api';
import { getSalesBudgetPerformanceExport, type SalespersonSummaryRow } from '../../api/salesBudget';
import { ExportButton } from '../../components/ui';
import { exportToXlsx, exportMultiSheetToXlsx } from '../../utils/exportToXlsx';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { formatCurrency, formatNumber } from '../../api/formatters';
import { KPICard, BudgetEvolutionChart } from './components/budgetShared';
import { BudgetFiltersSidebar } from './components/BudgetFiltersSidebar';
import { SalespersonPerformanceTable } from './components/SalespersonPerformanceTable';


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
  const [subfamilyFilter, setSubfamilyFilter] = useState<string[]>([]);
  const [salespersonFilter, setSalespersonFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('facturacion');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeMainTab, setActiveMainTab] = useState<'customers' | 'salespersons'>('customers');

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
      familyCode: familyFilter || undefined,
      subfamilyCode: subfamilyFilter.length > 0 ? subfamilyFilter : undefined,
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
      year, familyCode: familyFilter || undefined,
      subfamilyCode: subfamilyFilter.length > 0 ? subfamilyFilter : undefined,
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
  const { tableData, performanceKPIs, salespersonSummary } = useMemo(() => {
    const allRows = infiniteData?.pages.flatMap(page => page.rows || []) || [];
    const kpis = infiniteData?.pages[0]?.kpis || { 
      ventas: 0, ventasSinCuentas: 0, cuentasFacturadas: 0, objetivo: 0, desviacionEur: 0, desviacionPct: 0,
      carteraVentas: 0, carteraVentasAccounts: 0,
      enviadosFacturar: 0, enviadosFacturarAccounts: 0,
      enviadosFacturarBruto: 0,
      prepagosDescontadosFacturar: 0,
      facturacionNuevos: 0,
      facturasOrdinarias: 0,
      prepagosFacturados: 0,
      prepagosVivos: 0,
      abonosDevoluciones: 0,
      carteraVentasBruta: 0,
      prepagosDescontadosCartera: 0,
    };
    const summary: SalespersonSummaryRow[] = infiniteData?.pages[0]?.salespersonSummary || [];
    return { tableData: allRows, performanceKPIs: kpis, salespersonSummary: summary };
  }, [infiniteData]);

  // selectionTotals removed to use stable absolute totals from performanceKPIs
  const salespersonOptions = useMemo(() => salespersons.map(s => ({ value: s.code, label: `${s.code} - ${s.name}` })), [salespersons]);

  // Handlers
  const toggleMonth = (m: number) => {
    setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a,b)=>a-b));
  };

  const clearFilters = () => {
    setSelectedMonths([]); setFamilyFilter(''); setSubfamilyFilter([]); setSalespersonFilter('');
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
    // Si estamos en la pestaña de comerciales, exportamos el resumen de comerciales
    if (activeMainTab === 'salespersons') {
      const spColumns = [
        { key: 'code', label: 'Código' },
        { key: 'name', label: 'Comercial' },
        { key: 'productoFacturas', label: `FV Producto (${year})`, format: (v: number) => Number(Number(v || 0).toFixed(2)) },
        { key: 'productoAbonos', label: `AAV Producto (${year})`, format: (v: number) => Number(Number(v || 0).toFixed(2)) },
        { key: 'facturacion', label: `Fact. Neta Items (${year})`, format: (v: number) => Number(Number(v || 0).toFixed(2)) },
        { key: 'facturacionAnioAnterior', label: `Fact. Items (${year - 1})`, format: (v: number) => Number(Number(v || 0).toFixed(2)) },
        { key: 'objetivo', label: 'Objetivo (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
        { key: 'desviacion', label: 'Desviación (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
        { key: 'porcentajeCumplimiento', label: '% Cumplimiento', format: (v: number) => Number((Number(v || 0) / 100).toFixed(4)), numFmt: '0.0%' },
        { key: 'facturacionTotal', label: 'Total Fact. Documental (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
        { key: 'portes', label: 'Portes 624 (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
        { key: 'otrasCuentas', label: 'Otras Ctas GL (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
        { key: 'prepagosVivos', label: 'Prepagos Vivos (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
        { key: 'cartera', label: 'Cartera Pedidos Neta (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
        { key: 'enviadosFacturar', label: 'Pend. Facturar Neto (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
        { key: 'countNuevosClientes', label: 'Nuevos Clientes (Cant)', format: (v: number) => Number(v || 0) },
        { key: 'facturacionNuevos', label: 'Fact. Nuevos Clientes (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
        { key: 'previsionCierre', label: 'Previsión Cierre (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
      ];

      const spTotalsRow = {
        code: '',
        name: 'TOTAL EQUIPO COMERCIAL',
        productoFacturas: salespersonSummary.reduce((acc, r) => acc + (r.productoFacturas || 0), 0),
        productoAbonos: salespersonSummary.reduce((acc, r) => acc + (r.productoAbonos || 0), 0),
        facturacion: salespersonSummary.reduce((acc, r) => acc + (r.facturacion || 0), 0),
        facturacionAnioAnterior: salespersonSummary.reduce((acc, r) => acc + (r.facturacionAnioAnterior || 0), 0),
        objetivo: salespersonSummary.reduce((acc, r) => acc + (r.objetivo || 0), 0),
        desviacion: salespersonSummary.reduce((acc, r) => acc + (r.facturacion || 0) - (r.objetivo || 0), 0),
        porcentajeCumplimiento: (performanceKPIs.objetivo > 0 ? (salespersonSummary.reduce((acc, r) => acc + (r.facturacion || 0), 0) / performanceKPIs.objetivo) * 100 : 0),
        facturacionTotal: salespersonSummary.reduce((acc, r) => acc + (r.facturacionTotal || 0), 0),
        portes: salespersonSummary.reduce((acc, r) => acc + (r.portes || 0), 0),
        otrasCuentas: salespersonSummary.reduce((acc, r) => acc + (r.otrasCuentas || 0), 0),
        prepagosVivos: salespersonSummary.reduce((acc, r) => acc + (r.prepagosVivos || 0), 0),
        cartera: salespersonSummary.reduce((acc, r) => acc + (r.cartera || 0), 0),
        enviadosFacturar: salespersonSummary.reduce((acc, r) => acc + (r.enviadosFacturar || 0), 0),
        countNuevosClientes: salespersonSummary.reduce((acc, r) => acc + (r.countNuevosClientes || 0), 0),
        facturacionNuevos: salespersonSummary.reduce((acc, r) => acc + (r.facturacionNuevos || 0), 0),
        previsionCierre: salespersonSummary.reduce((acc, r) => acc + (r.previsionCierre || 0), 0),
      };

      exportToXlsx(salespersonSummary, spColumns, `rendimiento_comerciales_${year}`, spTotalsRow);
      return;
    }

    const result = await getSalesBudgetPerformanceExport({
      year,
      months: selectedMonths,
      salespersonCode: isSalesperson ? profile?.code : (salespersonFilter || undefined),
      search: debouncedSearch || undefined,
      familyCode: familyFilter || undefined,
      subfamilyCode: subfamilyFilter.length > 0 ? subfamilyFilter : undefined,
      sortBy,
      sortDir,
    });

    const columns = [
      { key: 'customerCode', label: 'Código Cliente' },
      { key: 'customerName', label: 'Cliente' },
      { key: 'facturacion', label: `Fact. ${year} (€)`, format: (v: number) => Number(Number(v || 0).toFixed(2)) },
      { key: 'cartera', label: 'Cartera Pedidos (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
      { key: 'enviadosFacturar', label: 'Pend. Facturar (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
      { key: 'facturacionAnioAnterior', label: `Fact. ${year - 1} (€)`, format: (v: number) => Number(Number(v || 0).toFixed(2)) },
      { key: 'objetivo', label: 'Objetivo (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
      { key: 'desviacion', label: 'Desviación (€)', format: (v: number) => Number(Number(v || 0).toFixed(2)) },
      {
        key: 'desviacionPorcentaje',
        label: 'Desv. (%)',
        format: (v: number, row: any) => {
          if (!row.objetivo || Number(row.objetivo) === 0) {
            return Number(row.facturacion) > 0 ? '-' : 0;
          }
          return Number((Number(v || 0) / 100).toFixed(4));
        },
        numFmt: '+0.0%;-0.0%;0.0%',
      },
      { key: 'isNew', label: 'Cliente Nuevo', format: (v: boolean) => v ? 'Sí' : 'No' },
    ];

    const allRows = result?.rows || [];
    const placeholderRow = allRows.find(
      (r: any) => r.customerCode === '99999999' || r.customerCode === '9999999' || r.customerName === 'CLIENTE NUEVO'
    );
    const regularRows = allRows.filter(
      (r: any) => !r.isNew && r.customerCode !== '99999999' && r.customerCode !== '9999999' && r.customerName !== 'CLIENTE NUEVO'
    );
    const newClientRows = allRows.filter(
      (r: any) => r.isNew && r.customerCode !== '99999999' && r.customerCode !== '9999999' && r.customerName !== 'CLIENTE NUEVO'
    );
    const totalNewClientsSales = newClientRows.reduce((acc, r) => acc + (r.facturacion || 0), 0);
    const totalNewClientsPrev = newClientRows.reduce((acc, r) => acc + (r.facturacionAnioAnterior || 0), 0);
    const newClientsBudget = Number(placeholderRow?.objetivo) || 0;
    const newClientsDev = totalNewClientsSales - newClientsBudget;
    const newClientsDevPct = newClientsBudget > 0 ? (newClientsDev / newClientsBudget) * 100 : 0;

    // Fila agrupada de clientes nuevos para cuadrar exactamente con el presupuesto en Hoja 1
    const newClientsSummaryRow = {
      customerCode: '99999999',
      customerName: 'CLIENTES NUEVOS (Meta Agrupada - Detalle en Hoja 2)',
      facturacion: totalNewClientsSales,
      cartera: 0,
      enviadosFacturar: 0,
      facturacionAnioAnterior: totalNewClientsPrev,
      objetivo: newClientsBudget,
      desviacion: newClientsDev,
      desviacionPorcentaje: newClientsDevPct,
      isNew: true,
    };

    const sheet1Rows = [...regularRows, newClientsSummaryRow];

    const sheet1Totals = {
      customerCode: '',
      customerName: 'TOTALES',
      facturacion: (performanceKPIs as any).ventasSinCuentas ?? performanceKPIs.ventas,
      cartera: performanceKPIs.carteraVentas,
      enviadosFacturar: performanceKPIs.enviadosFacturar,
      facturacionAnioAnterior: (performanceKPIs as any).facturacionAnioAnterior || 0,
      objetivo: performanceKPIs.objetivo,
      desviacion: performanceKPIs.desviacionEur,
      desviacionPorcentaje: performanceKPIs.desviacionPct,
      isNew: false,
    };

    const newClientsColumns = [
      { key: 'customerCode', label: 'Código Cliente' },
      { key: 'customerName', label: 'Cliente Nuevo' },
      { key: 'facturacion', label: `Fact. ${year} (€)`, format: (v: number) => Number(Number(v || 0).toFixed(2)) },
      { key: 'facturacionAnioAnterior', label: `Fact. ${year - 1} (€)`, format: (v: number) => Number(Number(v || 0).toFixed(2)) },
    ];

    const sheet2Totals = {
      customerCode: '',
      customerName: 'TOTAL CLIENTES NUEVOS',
      facturacion: totalNewClientsSales,
      facturacionAnioAnterior: totalNewClientsPrev,
    };

    exportMultiSheetToXlsx(
      [
        {
          sheetName: 'Ventas vs Presupuesto',
          rows: sheet1Rows,
          columns,
          totalsRow: sheet1Totals,
        },
        {
          sheetName: 'Detalle Clientes Nuevos',
          rows: newClientRows,
          columns: newClientsColumns,
          totalsRow: sheet2Totals,
        },
      ],
      `ventas_presupuesto_${year}`
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">





      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
        <KPICard 
          title="Facturación (Items)" 
          value={(performanceKPIs as any).ventasSinCuentas ?? performanceKPIs.ventas} 
          type="currency" 
          icon={TrendingUp} 
          isLoading={isLoadingPerf} 
          isFetching={isFetchingPerf}
          infoProps={{ 
            title: "Facturación de Productos (Sin Cuentas GL)",
            description: "Total de ventas reales netas de producto (líneas Item) acumuladas. Se toma exclusivamente la venta de producto para compararse de forma homogénea con el presupuesto anual. Los prepagos vivos pendientes de entrega y las líneas de cuentas contables se detallan a título informativo.", 
            formulas: "Líneas de Producto Facturadas (FV) - Abonos de Producto (AAV)",
            source: "sales_document_lines (Item)",
            breakdown: [
              { label: "Venta Neta de Producto (Item)", value: formatCurrency((performanceKPIs as any).ventasSinCuentas || 0), sign: 'i', color: 'text-dts-primary dark:text-white font-bold' },
              { label: "Portes y Transportes (Cuenta 624)", value: formatCurrency((performanceKPIs as any).portesFacturados || 0), sign: 'i', color: 'text-amber-600 dark:text-amber-400 font-semibold' },
              { label: "Otras Cuentas Contables (GL)", value: formatCurrency((performanceKPIs as any).otrasCuentasFacturadas || 0), sign: 'i', color: 'text-violet-600 dark:text-violet-400 font-semibold' },
              { label: "Prepagos Vivos Pendientes de Facturar (PFV)", value: formatCurrency((performanceKPIs as any).prepagosVivos ?? 0), sign: 'i', color: 'text-cyan-600 dark:text-cyan-400 font-semibold' },
              { label: "Total Facturación Documental", value: formatCurrency(performanceKPIs.ventas || 0), sign: 'i', color: 'text-gray-700 dark:text-gray-200 font-semibold' },
            ]
          }} 
        />
        <KPICard title="Objetivo" value={performanceKPIs.objetivo} type="currency" icon={Target} isLoading={isLoadingPerf} isFetching={isFetchingPerf} infoProps={{ title: "Objetivo Presupuestado", description: "Cifra de ventas presupuestada como objetivo para el periodo y filtros seleccionados.", objective: "Indica la meta comercial a alcanzar." }} />
        <KPICard title="Desviación" value={performanceKPIs.desviacionEur} type="currency" icon={DollarSign} status={performanceKPIs.desviacionEur >= 0 ? 'success' : 'danger'} isLoading={isLoadingPerf} isFetching={isFetchingPerf} infoProps={{ title: "Desviación Nominal", description: "Diferencia absoluta entre la facturación real neta y el objetivo.", formulas: "Ventas Reales - Objetivo Presupuestado" }} />
        <KPICard title="Cumplimiento" value={performanceKPIs.desviacionPct} type="percentage" icon={Activity} status={performanceKPIs.desviacionPct >= 0 ? 'success' : 'danger'} isLoading={isLoadingPerf} isFetching={isFetchingPerf} infoProps={{ title: "Cumplimiento Porcentual", description: "Tasa de cumplimiento del objetivo en porcentaje.", formulas: "(Ventas Reales / Objetivo) * 100" }} />
        <KPICard 
          title="Cartera Pedidos" 
          value={performanceKPIs.carteraVentas} 
          accountValue={performanceKPIs.carteraVentasAccounts} 
          type="currency" 
          icon={Package} 
          isLoading={isLoadingPerf} 
          isFetching={isFetchingPerf}
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
          isFetching={isFetchingPerf}
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
          hasActiveFilters={Boolean(selectedMonths.length > 0 || familyFilter || subfamilyFilter.length > 0 || salespersonFilter || searchTerm)}
        />

        {/* Performance Table */}
        <div 
          className="lg:col-span-4 bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col"
          style={{ height: `${sidebarHeight}px` }}
        >
          {/* Table Toolbar - Joined */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-transparent">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Tab Selector Principal */}
              <div className="flex items-center gap-1.5 p-1 bg-gray-200/60 dark:bg-gray-800/80 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveMainTab('customers')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeMainTab === 'customers'
                      ? 'bg-white dark:bg-dts-primary text-dts-primary dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Building2 size={14} className={activeMainTab === 'customers' ? 'text-dts-secondary' : ''} />
                  <span>Por Clientes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMainTab('salespersons')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeMainTab === 'salespersons'
                      ? 'bg-white dark:bg-dts-primary text-dts-primary dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Users size={14} className={activeMainTab === 'salespersons' ? 'text-dts-secondary' : ''} />
                  <span>{isSalesperson ? 'Mi Rendimiento' : 'Por Comercial'}</span>
                </button>
              </div>

              {activeMainTab === 'customers' && (
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
              )}
              
              <div className="flex items-center gap-2 ml-auto">
                {activeMainTab === 'customers' && searchTerm && (
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

          {activeMainTab === 'salespersons' ? (
            <div className="flex-1 overflow-hidden">
              <SalespersonPerformanceTable
                data={salespersonSummary}
                year={year}
                isLoading={isLoadingPerf}
                isSalesperson={isSalesperson}
                onSelectSalesperson={(code) => {
                  setSalespersonFilter(code);
                  setActiveMainTab('customers');
                }}
                selectedSalespersonCode={salespersonFilter}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-auto custom-scrollbar relative">
              <table className="w-full text-left text-sm border-separate border-spacing-0 table-fixed">

                <thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg">
                  <tr>
                    <th className="w-[30%] px-5 py-4 font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:bg-white/10" onClick={() => handleSort('customerName')}>
                      <div className="flex items-center">Cliente {getSortIcon('customerName')}</div>
                    </th>
                    <th className="w-[14%] px-4 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('facturacion')}>
                      <div className="flex items-center justify-end">Fact. {year} {getSortIcon('facturacion')}</div>
                    </th>
                    <th className="w-[14%] px-4 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('cartera')} title="Cartera viva de pedidos abierta y pendiente de servir">
                      <div className="flex items-center justify-end">Cartera {getSortIcon('cartera')}</div>
                    </th>
                    <th className="w-[14%] px-4 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('facturacionAnioAnterior')}>
                      <div className="flex items-center justify-end">Fact. {year - 1} {getSortIcon('facturacionAnioAnterior')}</div>
                    </th>
                    <th className="w-[14%] px-4 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('objetivo')}>
                      <div className="flex items-center justify-end">Objetivo {getSortIcon('objetivo')}</div>
                    </th>
                    <th className="w-[14%] px-4 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('desviacion')}>
                      <div className="flex items-center justify-end">Desviación {getSortIcon('desviacion')}</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-dts-primary dark:text-gray-300">
                  {isLoadingPerf && !infiniteData ? 
                    <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-dts-secondary" /></td></tr>
                   : tableData.length === 0 ? 
                    <tr><td colSpan={6} className="py-20 text-center text-gray-400 opacity-60">Sin datos de rendimiento para los filtros aplicados</td></tr>
                   : 
                    tableData.map((row, idx) => {
                      const isPlaceholderNew = row.customerCode === '99999999' || row.customerName === 'CLIENTE NUEVO' || (row as any).excludeFacturacionFromTotal;
                      return (
                      <tr key={`${row.customerCode}-${idx}`} className={`transition-colors ${isPlaceholderNew ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-l-2 border-indigo-500' : row.isNew ? 'bg-emerald-50/30 dark:bg-emerald-500/5 hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10' : 'hover:bg-gray-50/80 dark:hover:bg-white/5'}`}>
                        <td className="px-5 py-3 font-medium">
                          <div className="flex flex-col truncate">
                            <div className="flex items-center gap-2 truncate">
                              <span className="truncate" title={row.customerName}>{row.customerName}</span>
                              {isPlaceholderNew ? (
                                <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 uppercase" title="Objetivo de captación global para clientes nuevos. No suma al total para no duplicar con sus clientes individuales.">
                                  Meta Agrupada
                                </span>
                              ) : row.isNew ? (
                                <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 animate-pulse uppercase">Nuevo</span>
                              ) : null}
                              {Boolean(row.prepagos && row.prepagos > 0) && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40" title={`Prepago vivo pendiente de facturar: ${formatCurrency(row.prepagos!, 2)}`}>
                                  Prepago: {formatCurrency(row.prepagos!, 0)}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-gray-400">{row.customerCode}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <div>{formatCurrency(row.facturacion, 0)}</div>
                          {isPlaceholderNew && (
                            <span className="text-[8px] text-gray-400 font-sans block font-normal leading-tight">(Agrupado)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {isPlaceholderNew ? (
                            <span className="text-gray-400 font-sans">-</span>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className={row.cartera && row.cartera > 0 ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-400'}>
                                {row.cartera && row.cartera > 0 ? formatCurrency(row.cartera, 0) : '-'}
                              </span>
                              {Boolean(row.enviadosFacturar && row.enviadosFacturar > 0) && (
                                <span 
                                  className="text-[9px] font-sans font-semibold text-amber-600 dark:text-amber-400 mt-0.5 leading-tight" 
                                  title={`Albaranes entregados pendientes de facturar: ${formatCurrency(row.enviadosFacturar, 2)}`}
                                >
                                  +{formatCurrency(row.enviadosFacturar, 0)} pend. fact.
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-400">{(row as any).facturacionAnioAnterior ? formatCurrency((row as any).facturacionAnioAnterior, 0) : '-'}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(row.objetivo, 0)}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          <div className={row.desviacion < 0 ? 'text-red-500 font-bold' : 'text-emerald-500'}>
                            {row.desviacion > 0 ? '+' : ''}{formatCurrency(row.desviacion, 0)}
                          </div>
                          <div className={`text-[10px] font-bold ${row.desviacionPorcentaje < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {row.desviacionPorcentaje > 0 ? '+' : ''}{formatNumber(row.desviacionPorcentaje, 1)}%
                          </div>
                        </td>
                      </tr>
                    );})
                  }
                  <tr ref={observerTarget}><td colSpan={6} className="py-8 text-center text-gray-400 text-[10px] opacity-60 uppercase tracking-widest">{isFetchingNextPage ? 'Cargando más clientes...' : hasNextPage ? 'Desplázate para cargar más' : 'Fin del listado'}</td></tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Fixed Footer Table (solo para pestaña clientes) */}
          {activeMainTab === 'customers' && tableData.length > 0 && (
            <div className="bg-dts-primary text-white font-bold text-xs uppercase shadow-[0_-5px_15px_rgba(0,0,0,0.2)] border-t border-white/10 z-30">
              <table className="w-full text-left text-[10px] border-separate border-spacing-0 table-fixed">
                <tbody>
                  <tr className="font-bold">
                    <td className="w-[30%] px-5 py-4 tracking-widest">TOTALES FILTRADOS</td>
                    <td className="w-[14%] px-4 py-4 text-right font-mono">{formatCurrency((performanceKPIs as any).ventasSinCuentas ?? performanceKPIs.ventas, 0)}</td>
                    <td className="w-[14%] px-4 py-4 text-right font-mono">
                      <div className="flex flex-col items-end">
                        <span>{formatCurrency(performanceKPIs.carteraVentas, 0)}</span>
                        {Boolean(performanceKPIs.enviadosFacturar > 0) && (
                          <span className="text-[9px] font-sans text-amber-300 normal-case font-medium mt-0.5" title={`Total pendiente de facturar: ${formatCurrency(performanceKPIs.enviadosFacturar, 2)}`}>
                            +{formatCurrency(performanceKPIs.enviadosFacturar, 0)} pend. fact.
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="w-[14%] px-4 py-4 text-right font-mono opacity-60">{(performanceKPIs as any).facturacionAnioAnterior ? formatCurrency((performanceKPIs as any).facturacionAnioAnterior, 0) : '-'}</td>
                    <td className="w-[14%] px-4 py-4 text-right font-mono">{formatCurrency(performanceKPIs.objetivo, 0)}</td>
                    <td className="w-[14%] px-4 py-4 text-right font-mono">
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
        data={evolutionData || []}
        selectedMonths={selectedMonths}
        year={year}
        title={`Evolución Comercial ${year}`}
      />
    </div>
  );
};

