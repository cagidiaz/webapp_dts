import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { 
  TrendingUp, Target, DollarSign, Activity, Loader2, Package, Search,
  PieChart as PieChartIcon, ArrowUpDown, ChevronUp, ChevronDown, ChevronRight
} from 'lucide-react';

import { 
  getProductBudgetPerformance, 
  getProductBudgetEvolution, 
  getProductBudgetExport,
  getPmCodes,
  getSalesReps,
  getProductFamilies
} from '../../api';
import { ExportButton } from '../../components/ui';
import { exportMultiSheetToXlsx } from '../../utils/exportToXlsx';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { formatCurrency, formatNumber } from '../../api/formatters';
import { KPICard, BudgetEvolutionChart } from './components/budgetShared';
import { BudgetFiltersSidebar } from './components/BudgetFiltersSidebar';

// --- Main Page Component ---

export const ProductBudgetPage: React.FC = () => {
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
  const [pmFilter, setPmFilter] = useState<string>('');
  const [productCodeFilter, setProductCodeFilter] = useState<string>('');
  const [debouncedProductCode, setDebouncedProductCode] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('facturacion');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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


  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedProductCode(productCodeFilter); }, 400);
    return () => clearTimeout(timer);
  }, [productCodeFilter]);

  useEffect(() => {
    setPageInfo({
      title: 'Presupuesto x Product Manager',
      subtitle: 'Análisis presupuestario por producto y cliente (Product Manager)',
      icon: <PieChartIcon size={20} />,
      infoProps: {
        title: 'Presupuesto Ventas x Producto',
        description: 'Comparativa de facturación real vs objetivo presupuestado, desglosada por producto dentro de cada cliente.',
        objective: 'Permite al Product Manager analizar el cumplimiento de objetivos comerciales a nivel de referencia de producto.',
        source: 'Basado en facturas de venta, abonos y presupuestos cargados en el sistema.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  // Data queries
  const { data: pmCodes = [] } = useQuery({ queryKey: ['pmCodes'], queryFn: getPmCodes });
  const { data: categories = [] } = useQuery({ queryKey: ['prodCats'], queryFn: getProductFamilies });
  const { data: salespersons = [] } = useQuery({ queryKey: ['salesReps'], queryFn: getSalesReps });

  // Auto-detect if the logged-in user is a PM
  const isProductManager = useMemo(() => {
    if (!profile?.code) return false;
    return pmCodes.some(pm => pm.code === profile.code);
  }, [profile?.code, pmCodes]);

  // Auto-set PM filter for PM users and ensure salesperson filter is empty
  useEffect(() => {
    if (isProductManager && profile?.code) {
      setPmFilter(profile.code);
      setSalespersonFilter(''); // Ensure we don't filter by salesperson for PMs by default
    }
  }, [isProductManager, profile?.code]);

  // Determine the effective PM code for API calls
  const effectivePmCode = isProductManager ? profile?.code : (pmFilter || undefined);

  const {
    data: infiniteData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: isLoadingPerf, isFetching: isFetchingPerf
  } = useInfiniteQuery({
    queryKey: ['productBudgetPerf', year, selectedMonths, salespersonFilter, effectivePmCode, debouncedSearch, familyFilter, subfamilyFilter, debouncedProductCode, sortBy, sortDir],
    queryFn: ({ pageParam = 0 }) => getProductBudgetPerformance({
      year, months: selectedMonths,
      salespersonCode: salespersonFilter || undefined,
      pmCode: effectivePmCode,
      search: debouncedSearch || undefined,
      familyCode: familyFilter || undefined, subfamilyCode: subfamilyFilter || undefined,
      productCode: debouncedProductCode || undefined,
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
    queryKey: ['productBudgetEvol', year, familyFilter, subfamilyFilter, salespersonFilter, effectivePmCode, debouncedSearch, debouncedProductCode],
    queryFn: () => getProductBudgetEvolution({
      year, 
      familyCode: familyFilter || undefined, subfamilyCode: subfamilyFilter || undefined,
      salespersonCode: salespersonFilter || undefined,
      pmCode: effectivePmCode,
      productCode: debouncedProductCode || undefined,
      search: debouncedSearch || undefined
    }),
  });

  // Intersection Observer
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
      enviadosFacturar: 0, enviadosFacturarAccounts: 0
    };
    return { tableData: allRows, performanceKPIs: kpis };
  }, [infiniteData]);

  const salespersonOptions = useMemo(() => salespersons.map(s => ({ value: s.code, label: `${s.code} - ${s.name}` })), [salespersons]);

  // Handlers
  const toggleMonth = (m: number) => {
    setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a,b)=>a-b));
  };

  const clearFilters = () => {
    setSelectedMonths([]); setFamilyFilter(''); setSubfamilyFilter(''); setSalespersonFilter('');
    if (!isProductManager) setPmFilter('');
    setSearchTerm(''); setYear(new Date().getFullYear());
    setProductCodeFilter('');
  };

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('desc'); }
  };

  const getSortIcon = (key: string) => {
    if (sortBy !== key) return <ArrowUpDown size={12} className="ml-1 opacity-20 group-hover:opacity-100" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="ml-1 text-dts-secondary" /> : <ChevronDown size={12} className="ml-1 text-dts-secondary" />;
  };

  const toggleExpand = (code: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleExport = async () => {
    const result = await getProductBudgetExport({
      year,
      months: selectedMonths,
      salespersonCode: salespersonFilter || undefined,
      pmCode: effectivePmCode,
      search: debouncedSearch || undefined,
      familyCode: familyFilter || undefined,
      subfamilyCode: subfamilyFilter || undefined,
      productCode: debouncedProductCode || undefined,
      sortBy, sortDir,
    });

    const allRows = result?.rows || [];
    const placeholderRow = allRows.find(
      (r: any) => r.customerCode === '99999999' || r.customerCode === '9999999' || r.customerName === 'CLIENTE NUEVO'
    );
    const regularCustomerRows = allRows.filter(
      (r: any) => !r.isNew && r.customerCode !== '99999999' && r.customerCode !== '9999999' && r.customerName !== 'CLIENTE NUEVO'
    );
    const newCustomerRows = allRows.filter(
      (r: any) => r.isNew && r.customerCode !== '99999999' && r.customerCode !== '9999999' && r.customerName !== 'CLIENTE NUEVO'
    );

    const totalNewClientsSales = newCustomerRows.reduce((acc, r) => acc + (r.facturacion || 0), 0);
    const totalNewClientsPrev = newCustomerRows.reduce((acc, r) => acc + (r.facturacionAnioAnterior || 0), 0);
    const newClientsBudget = Number(placeholderRow?.objetivo) || 0;
    const newClientsDev = totalNewClientsSales - newClientsBudget;
    const newClientsDevPct = newClientsBudget > 0 ? (newClientsDev / newClientsBudget) * 100 : 0;

    // 1. Aplanar clientes habituales para la Hoja 1
    const flatRegularRows: any[] = [];
    regularCustomerRows.forEach(row => {
      (row.products || []).forEach(prod => {
        flatRegularRows.push({
          customerCode: row.customerCode,
          customerName: row.customerName,
          itemNo: prod.itemNo,
          productName: prod.productName,
          facturacion: prod.facturacion || 0,
          facturacionAnioAnterior: (prod as any).facturacionAnioAnterior || 0,
          objetivo: prod.objetivo || 0,
          desviacion: prod.desviacion || 0,
          desviacionPorcentaje: prod.desviacionPorcentaje || 0,
        });
      });
    });

    // Fila agrupada de clientes nuevos para cuadrar exactamente con el presupuesto en Hoja 1
    flatRegularRows.push({
      customerCode: '99999999',
      customerName: 'CLIENTES NUEVOS (Meta Agrupada - Detalle en Hoja 2)',
      itemNo: 'AGRUPADO',
      productName: 'Facturación Clientes Nuevos (Detalle en Hoja 2)',
      facturacion: totalNewClientsSales,
      facturacionAnioAnterior: totalNewClientsPrev,
      objetivo: newClientsBudget,
      desviacion: newClientsDev,
      desviacionPorcentaje: newClientsDevPct,
    });

    const columns = [
      { key: 'customerCode', label: 'Código Cliente' },
      { key: 'customerName', label: 'Cliente' },
      { key: 'itemNo', label: 'Código Producto' },
      { key: 'productName', label: 'Producto' },
      { key: 'facturacion', label: `Fact. ${year} (€)`, format: (v: number) => Number(Number(v || 0).toFixed(2)) },
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
    ];

    const sheet1Totals = {
      customerCode: '',
      customerName: 'TOTALES',
      itemNo: '',
      productName: '',
      facturacion: (performanceKPIs as any).ventasSinCuentas ?? performanceKPIs.ventas,
      facturacionAnioAnterior: (performanceKPIs as any).facturacionAnioAnterior || 0,
      objetivo: performanceKPIs.objetivo,
      desviacion: performanceKPIs.desviacionEur,
      desviacionPorcentaje: performanceKPIs.desviacionPct,
    };

    // 2. Aplanar clientes nuevos con sus productos para la Hoja 2
    const flatNewClientRows: any[] = [];
    newCustomerRows.forEach(row => {
      (row.products || []).forEach(prod => {
        flatNewClientRows.push({
          customerCode: row.customerCode,
          customerName: row.customerName,
          itemNo: prod.itemNo,
          productName: prod.productName,
          facturacion: prod.facturacion || 0,
          facturacionAnioAnterior: (prod as any).facturacionAnioAnterior || 0,
          objetivo: prod.objetivo || 0,
          desviacion: prod.desviacion || 0,
          desviacionPorcentaje: prod.desviacionPorcentaje || 0,
        });
      });
    });

    const sheet2Totals = {
      customerCode: '',
      customerName: 'TOTAL CLIENTES NUEVOS',
      itemNo: '',
      productName: '',
      facturacion: totalNewClientsSales,
      facturacionAnioAnterior: totalNewClientsPrev,
      objetivo: 0,
      desviacion: totalNewClientsSales,
      desviacionPorcentaje: 0,
    };

    exportMultiSheetToXlsx(
      [
        {
          sheetName: 'Presupuesto x Producto',
          rows: flatRegularRows,
          columns,
          totalsRow: sheet1Totals,
        },
        {
          sheetName: 'Detalle Clientes Nuevos',
          rows: flatNewClientRows,
          columns,
          totalsRow: sheet2Totals,
        },
      ],
      `presupuesto_producto_${year}`
    );
  };

  const hasActiveFilters = Boolean(
    selectedMonths.length > 0 || familyFilter || subfamilyFilter || salespersonFilter ||
    (!isProductManager && pmFilter) || productCodeFilter || searchTerm
  );

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
          infoProps={{ 
            title: "Facturación de Productos (Sin Cuentas GL)",
            description: "Total de ventas reales netas de catálogo (líneas Item) acumuladas. Se toma exclusivamente la venta de producto para contrastar de forma homogénea con el presupuesto del Product Manager. Los prepagos vivos pendientes de entrega y las cuentas contables se detallan a título informativo.", 
            formulas: "Ventas Netas de Producto (value_entries)",
            source: "Movimientos de Valor (Value Entries)",
            breakdown: [
              { label: "Venta Neta de Producto (Item)", value: formatCurrency((performanceKPIs as any).ventasSinCuentas ?? performanceKPIs.ventas), sign: 'i', color: 'text-dts-primary dark:text-white font-bold' },
              { label: "Portes y Transportes (Cuenta 624)", value: formatCurrency((performanceKPIs as any).portesFacturados || 0), sign: 'i', color: 'text-amber-600 dark:text-amber-400 font-semibold' },
              { label: "Otras Cuentas Contables (GL)", value: formatCurrency((performanceKPIs as any).otrasCuentasFacturadas || 0), sign: 'i', color: 'text-violet-600 dark:text-violet-400 font-semibold' },
              { label: "Prepagos Vivos Pendientes de Facturar (PFV)", value: formatCurrency((performanceKPIs as any).prepagosVivos ?? 0), sign: 'i', color: 'text-cyan-600 dark:text-cyan-400 font-semibold' },
              { label: "Total Facturación Documental", value: formatCurrency((performanceKPIs as any).ventas || 0), sign: 'i', color: 'text-gray-700 dark:text-gray-200 font-semibold' },
            ]
          }} 
        />
        <KPICard title="Objetivo" value={performanceKPIs.objetivo} type="currency" icon={Target} isLoading={isLoadingPerf} infoProps={{ description: "Cifra de ventas presupuestada como objetivo para el periodo seleccionado.", objective: "Indica la meta comercial establecida." }} />
        <KPICard title="Desviación" value={performanceKPIs.desviacionEur} type="currency" icon={DollarSign} status={performanceKPIs.desviacionEur >= 0 ? 'success' : 'danger'} isLoading={isLoadingPerf} infoProps={{ description: "Diferencia absoluta entre la facturación real y el objetivo.", formulas: "Ventas Reales - Objetivo Presupuestado" }} />
        <KPICard title="Cumplimiento" value={performanceKPIs.desviacionPct} type="percentage" icon={Activity} status={performanceKPIs.desviacionPct >= 0 ? 'success' : 'danger'} isLoading={isLoadingPerf} infoProps={{ description: "Tasa de cumplimiento del objetivo en porcentaje.", formulas: "(Ventas Reales / Objetivo) * 100" }} />
        <KPICard title="Cartera Pedidos" value={performanceKPIs.carteraVentas} accountValue={performanceKPIs.carteraVentasAccounts} type="currency" icon={Package} isLoading={isLoadingPerf} infoProps={{ description: "Importe total de los pedidos de venta abiertos y pendientes de completar. El valor entre paréntesis indica la porción de líneas de tipo cuenta.", source: "Tabla de Sales Orders." }} />
        <KPICard title="Pend. Facturar" value={performanceKPIs.enviadosFacturar} accountValue={performanceKPIs.enviadosFacturarAccounts} type="currency" icon={DollarSign} status="warning" isLoading={isLoadingPerf} infoProps={{ description: "Importe de la mercancía ya enviada al cliente pero que aún no ha sido facturada. El valor entre paréntesis indica la porción de líneas de tipo cuenta.", formulas: "Sumatorio(Qty. Shipped Not Invoiced * Unit Price)" }} />
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
          showSalesperson={true}
          salespersonFilter={salespersonFilter}
          onSalespersonChange={setSalespersonFilter}
          salespersonOptions={salespersonOptions}
          isProductManager={isProductManager}
          pmCodes={pmCodes}
          pmFilter={pmFilter}
          onPmChange={setPmFilter}
          productCodeFilter={productCodeFilter}
          onProductCodeChange={setProductCodeFilter}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Performance Table */}
        <div 
          className="lg:col-span-4 bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col"
          style={{ height: `${sidebarHeight}px` }}
        >
          {/* Toolbar */}
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
                    <div className="flex items-center">Nombre cliente {getSortIcon('customerName')}</div>
                  </th>
                  <th className="w-[15%] px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('facturacion')}>
                    <div className="flex items-center justify-end">Fact. {year} {getSortIcon('facturacion')}</div>
                  </th>
                  <th className="w-[15%] px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('facturacionAnioAnterior')}>
                    <div className="flex items-center justify-end">Fact. {year - 1} {getSortIcon('facturacionAnioAnterior')}</div>
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
                  tableData.map((row, idx) => {
                    const isExpanded = expandedRows.has(row.customerCode);
                    const isPlaceholderNew = row.customerCode === '99999999' || row.customerName === 'CLIENTE NUEVO' || (row as any).excludeFacturacionFromTotal;
                    return (
                      <React.Fragment key={`${row.customerCode}-${idx}`}>
                        {/* Customer Row */}
                        <tr
                          onClick={() => toggleExpand(row.customerCode)}
                          className={`cursor-pointer transition-colors font-semibold ${isPlaceholderNew ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-l-2 border-indigo-500' : row.isNew ? 'bg-emerald-50/30 dark:bg-emerald-500/5 hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10' : 'hover:bg-gray-50/80 dark:hover:bg-white/5'}`}
                        >
                          <td className="px-6 py-3 font-medium">
                            <div className="flex items-center gap-2">
                              <ChevronRight size={14} className={`shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                              <div className="flex flex-col truncate">
                                <div className="flex items-center gap-2 truncate">
                                  <span className="truncate font-bold" title={row.customerName}>{row.customerName}</span>
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
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right font-mono font-bold">
                            <div>{formatCurrency(row.facturacion, 0)}</div>
                            {isPlaceholderNew && (
                              <span className="text-[8px] text-gray-400 font-sans block font-normal leading-tight">(Agrupado)</span>
                            )}
                          </td>
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
                        {/* Product Rows (Expanded) */}
                        {isExpanded && row.products.map((prod, pIdx) => (
                          <tr key={`${row.customerCode}-${prod.itemNo}-${pIdx}`} className="bg-gray-50/50 dark:bg-white/2 hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors">
                            <td className="pl-14 pr-6 py-2.5">
                              <div className="flex flex-col">
                                <span className="text-gray-600 dark:text-gray-400 font-medium truncate" title={prod.productName}>{prod.productName}</span>
                                <span className="text-[10px] font-mono text-gray-400">{prod.itemNo}</span>
                              </div>
                            </td>
                            <td className="px-6 py-2.5 text-right font-mono text-gray-500">{formatCurrency(prod.facturacion, 0)}</td>
                            <td className="px-6 py-2.5 text-right font-mono text-gray-400">{(prod as any).facturacionAnioAnterior ? formatCurrency((prod as any).facturacionAnioAnterior, 0) : '-'}</td>
                            <td className="px-6 py-2.5 text-right font-mono text-gray-400">{formatCurrency(prod.objetivo, 0)}</td>
                            <td className="px-6 py-2.5 text-right font-mono">
                              <div className={prod.desviacion < 0 ? 'text-red-400' : 'text-emerald-400'}>
                                {prod.desviacion > 0 ? '+' : ''}{formatCurrency(prod.desviacion, 0)}
                              </div>
                              <div className={`text-[10px] ${prod.desviacionPorcentaje < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {prod.desviacionPorcentaje > 0 ? '+' : ''}{formatNumber(prod.desviacionPorcentaje, 1)}%
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
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
                    <td className="w-[15%] px-6 py-4 text-right font-mono">{formatCurrency((performanceKPIs as any).ventasSinCuentas ?? performanceKPIs.ventas, 0)}</td>
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
        data={evolutionData || []}
        selectedMonths={selectedMonths}
        year={year}
        title={`Evolución VENTAS vs. OBJETIVOS ${year}`}
      />
    </div>
  );
};
