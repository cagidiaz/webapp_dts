import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  TrendingUp, Target, DollarSign, Activity, Loader2, Filter, X, Package, Search,
  PieChart as PieChartIcon, ArrowUpDown, ChevronUp, ChevronDown, ChevronRight, type LucideIcon
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
import { exportToXlsx } from '../../utils/exportToXlsx';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { formatCurrency, formatNumber } from '../../api/formatters';
import { InfoPopover } from '../../components/ui';
import { SearchableSelect } from '../../components/ui/SearchableSelect';

// --- Constants & Types ---

const MONTHS = [
  { val: 1, label: 'Ene' }, { val: 2, label: 'Feb' }, { val: 3, label: 'Mar' },
  { val: 4, label: 'Abr' }, { val: 5, label: 'May' }, { val: 6, label: 'Jun' },
  { val: 7, label: 'Jul' }, { val: 8, label: 'Ago' }, { val: 9, label: 'Sep' },
  { val: 10, label: 'Oct' }, { val: 11, label: 'Nov' }, { val: 12, label: 'Dic' }
];

const formatKpiValue = (value: number, type: 'currency' | 'number' | 'percentage', decimalPlaces: number = 0) => {
  if (type === 'currency') {
    if (Math.abs(value) >= 1000000) {
      return `${formatNumber(Math.round(value / 1000), 0)} K €`; 
    }
    return formatCurrency(value, decimalPlaces); 
  }
  if (type === 'percentage') return `${formatNumber(value, 1)}%`;
  return formatNumber(value, decimalPlaces);
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

// --- Helper Components ---

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const monthLabel = MONTHS.find(m => m.val === label)?.label || label;
    return (
      <div className="bg-white dark:bg-[#002A38] p-3 rounded-lg border border-gray-100 dark:border-white/10 shadow-xl">
        <p className="text-xs font-bold text-dts-primary dark:text-white mb-2 uppercase border-b border-gray-100 dark:border-white/10 pb-1">
          {monthLabel} {new Date().getFullYear()}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-4 text-[11px] mb-1">
            <span className="flex items-center gap-1.5 font-medium text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill || entry.color }}></div>
              {entry.name}:
            </span>
            <span className="font-mono font-bold text-dts-primary dark:text-white">
              {formatCurrency(entry.value, 0)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const RenderCustomLegend = (props: any) => {
  const { payload } = props;
  if (!payload) return null;
  const sortedPayload = [...payload].sort((a) => a.value === 'Ventas Reales' ? -1 : 1);
  return (
    <div className="flex justify-center gap-6 mb-4">
      {sortedPayload.map((entry, index) => (
        <div key={`item-${index}`} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: entry.color }}></div>
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const KPICard: React.FC<KPICardProps> = ({ title, value, type = 'number', icon: Icon, isLoading, status, decimalPlaces = 0, infoProps, accountValue }) => {
  if (isLoading) return <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-gray-100 dark:border-gray-800 h-28 animate-pulse" />;
  
  const colorClass = status === 'success' ? 'text-emerald-500' : status === 'danger' ? 'text-red-500' : 'text-dts-primary dark:text-white';
  const formattedValue = formatKpiValue(value, type, decimalPlaces);

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
              objective={infoProps.objective}
              source={infoProps.source}
              iconSize={12}
              className="text-gray-300 group-hover:text-dts-secondary transition-colors"
            />
          )}
        </div>
        <Icon size={18} className="text-gray-400 group-hover:text-dts-secondary transition-colors" />
      </div>
      <div className={`text-xl font-medium font-mono ${colorClass}`}>{formattedValue}</div>
      {accountValue !== undefined && accountValue > 0 && (
        <div className="text-[10px] text-gray-400 mt-1 italic font-medium">
          ({formatCurrency(accountValue, 0)})
        </div>
      )}
    </div>
  );
};

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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('facturacion');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());


  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
    data: infiniteData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: isLoadingPerf
  } = useInfiniteQuery({
    queryKey: ['productBudgetPerf', year, selectedMonths, salespersonFilter, effectivePmCode, debouncedSearch, familyFilter, subfamilyFilter, sortBy, sortDir],
    queryFn: ({ pageParam = 0 }) => getProductBudgetPerformance({
      year, months: selectedMonths,
      salespersonCode: salespersonFilter || undefined,
      pmCode: effectivePmCode,
      search: debouncedSearch || undefined,
      familyCode: familyFilter || undefined, subfamilyCode: subfamilyFilter || undefined,
      sortBy, sortDir, take: pageSize, skip: pageParam as number
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextSkip = allPages.length * pageSize;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
  });

  const { data: evolutionData } = useQuery({
    queryKey: ['productBudgetEvol', year, familyFilter, subfamilyFilter, salespersonFilter, effectivePmCode, debouncedSearch],
    queryFn: () => getProductBudgetEvolution({
      year, 
      familyCode: familyFilter || undefined, subfamilyCode: subfamilyFilter || undefined,
      salespersonCode: salespersonFilter || undefined,
      pmCode: effectivePmCode,
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

  // Options for selects
  const familyOptions = useMemo(() => {
    const uniqueFamilies = new Map();
    categories.forEach(c => { if (c.family_code) uniqueFamilies.set(c.family_code, c.family_name); });
    return Array.from(uniqueFamilies.entries()).map(([code, name]) => ({ value: code, label: `${code} - ${name}` }));
  }, [categories]);

  const subfamilyOptions = useMemo(() => {
    let filtered = categories;
    if (familyFilter) filtered = filtered.filter(s => s.family_code === familyFilter);
    const uniqueSubfamilies = new Map();
    filtered.forEach(c => { if (c.subfamily_code) uniqueSubfamilies.set(c.subfamily_code, c.subfamily_name); });
    return Array.from(uniqueSubfamilies.entries()).map(([code, name]) => ({ value: code, label: `${code} - ${name}` }));
  }, [categories, familyFilter]);

  const salespersonOptions = useMemo(() => salespersons.map(s => ({ value: s.code, label: `${s.code} - ${s.name}` })), [salespersons]);

  // Handlers
  const toggleMonth = (m: number) => {
    setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a,b)=>a-b));
  };

  const clearFilters = () => {
    setSelectedMonths([]); setFamilyFilter(''); setSubfamilyFilter(''); setSalespersonFilter('');
    if (!isProductManager) setPmFilter('');
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
      sortBy, sortDir,
    });

    // Flatten hierarchy for export
    const flatRows: any[] = [];
    result.rows.forEach(row => {
      row.products.forEach(prod => {
        flatRows.push({
          customerCode: row.customerCode,
          customerName: row.customerName,
          itemNo: prod.itemNo,
          productName: prod.productName,
          facturacion: prod.facturacion,
          objetivo: prod.objetivo,
          desviacion: prod.desviacion,
          desviacionPorcentaje: prod.desviacionPorcentaje,
        });
      });
    });

    const columns = [
      { key: 'customerCode', label: 'Código Cliente' },
      { key: 'customerName', label: 'Cliente' },
      { key: 'itemNo', label: 'Código Producto' },
      { key: 'productName', label: 'Producto' },
      { key: 'facturacion', label: 'Fact. YTD (€)', format: (v: number) => Number(v.toFixed(2)) },
      { key: 'facturacionAnioAnterior', label: 'Fact. LY (€)', format: (v: number) => Number(v.toFixed(2)) },
      { key: 'objetivo', label: 'Objetivo (€)', format: (v: number) => Number(v.toFixed(2)) },
      { key: 'desviacion', label: 'Desviación (€)', format: (v: number) => Number(v.toFixed(2)) },
      { key: 'desviacionPorcentaje', label: 'Desv. (%)', format: (v: number) => Number(v.toFixed(2)) },
    ];

    const totalsRow = {
      customerCode: '',
      customerName: 'TOTALES',
      itemNo: '',
      productName: '',
      facturacion: performanceKPIs.ventas,
      objetivo: performanceKPIs.objetivo,
      desviacion: performanceKPIs.desviacionEur,
      desviacionPorcentaje: performanceKPIs.desviacionPct,
    };

    exportToXlsx(flatRows, columns, `ppto_producto_${year}`, totalsRow);
  };

  const hasActiveFilters = selectedMonths.length > 0 || familyFilter || subfamilyFilter || salespersonFilter || (!isProductManager && pmFilter) || searchTerm;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
        <KPICard title="Facturación" value={performanceKPIs.ventas} type="currency" icon={TrendingUp} isLoading={isLoadingPerf} infoProps={{ description: "Total de ventas reales acumuladas (Facturas - Abonos) para el periodo y filtros actuales.", formulas: "Sumatorio(Value Entries) donde Document Type = Invoice | Credit Memo" }} />
        <KPICard title="Objetivo" value={performanceKPIs.objetivo} type="currency" icon={Target} isLoading={isLoadingPerf} infoProps={{ description: "Cifra de ventas presupuestada como objetivo para el periodo y filtros seleccionados.", objective: "Indica la meta comercial a alcanzar." }} />
        <KPICard title="Desviación" value={performanceKPIs.desviacionEur} type="currency" icon={DollarSign} status={performanceKPIs.desviacionEur >= 0 ? 'success' : 'danger'} isLoading={isLoadingPerf} infoProps={{ description: "Diferencia absoluta entre la facturación real y el objetivo.", formulas: "Ventas Reales - Objetivo Presupuestado" }} />
        <KPICard title="Cumplimiento" value={performanceKPIs.desviacionPct} type="percentage" icon={Activity} status={performanceKPIs.desviacionPct >= 0 ? 'success' : 'danger'} isLoading={isLoadingPerf} infoProps={{ description: "Tasa de cumplimiento del objetivo en porcentaje.", formulas: "(Ventas Reales / Objetivo) * 100" }} />
        <KPICard title="Cartera Pedidos" value={performanceKPIs.carteraVentas} accountValue={performanceKPIs.carteraVentasAccounts} type="currency" icon={Package} isLoading={isLoadingPerf} infoProps={{ description: "Importe total de los pedidos de venta abiertos y pendientes de completar. El valor entre paréntesis indica la porción de líneas de tipo cuenta.", source: "Tabla de Sales Orders." }} />
        <KPICard title="Pend. Facturar" value={performanceKPIs.enviadosFacturar} accountValue={performanceKPIs.enviadosFacturarAccounts} type="currency" icon={DollarSign} status="warning" isLoading={isLoadingPerf} infoProps={{ description: "Importe de la mercancía ya enviada al cliente pero que aún no ha sido facturada. El valor entre paréntesis indica la porción de líneas de tipo cuenta.", formulas: "Sumatorio(Qty. Shipped Not Invoiced * Unit Price)" }} />
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 bg-white dark:bg-surface-card-dark border border-gray-100 dark:border-gray-800 rounded-xl p-5 h-fit shadow-card space-y-6 text-sm">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
             <div className="flex items-center gap-2">
               <Filter size={16} className="text-gray-400" />
               <span className="font-bold uppercase text-xs">FILTROS</span>
               <InfoPopover title="Filtros de Análisis" description="Permite segmentar los resultados por periodo temporal, estructura de productos, Product Manager o asignación comercial." iconSize={14} />
             </div>
             {hasActiveFilters && <button onClick={clearFilters} className="text-dts-secondary hover:bg-dts-secondary/10 p-1 rounded transition-colors"><X size={16} /></button>}
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Ejercicio</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark text-dts-primary dark:text-white font-bold rounded-md px-3 py-2 text-xs outline-none font-mono shadow-sm"
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* PM Filter (only for non-PM users) */}
          {!isProductManager && pmCodes.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Product Manager</span>
              <div className="grid grid-cols-3 gap-2">
                {pmCodes.map(pm => (
                  <button
                    key={pm.code}
                    onClick={() => setPmFilter(pmFilter === pm.code ? '' : pm.code)}
                    title={pm.name}
                    className={`h-8 font-bold rounded text-[10px] transition-all ${
                      pmFilter === pm.code
                        ? 'bg-dts-secondary text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pm.code}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Meses</span>
            <div className="grid grid-cols-4 gap-2">
              {MONTHS.map(m => (
                <button key={m.val} onClick={() => toggleMonth(m.val)} className={`h-8 font-bold rounded text-[10px] transition-all ${selectedMonths.includes(m.val) ? 'bg-dts-secondary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{m.label}</button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div><span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Vendedor</span><SearchableSelect options={salespersonOptions} value={salespersonFilter} onChange={setSalespersonFilter} placeholder="Todos..." /></div>
            <div><span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Familia</span><SearchableSelect options={familyOptions} value={familyFilter} onChange={setFamilyFilter} placeholder="Todas..." /></div>
            <div><span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Subfamilia</span><SearchableSelect options={subfamilyOptions} value={subfamilyFilter} onChange={setSubfamilyFilter} placeholder="Todas..." /></div>
          </div>
        </div>

        {/* Performance Table */}
        <div className="lg:col-span-4 bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col h-[calc(100vh-320px)] min-h-[500px]">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-transparent">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="w-full max-w-md relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Search size={16} />
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
                  <th className="w-[12%] px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('facturacion')}>
                    <div className="flex items-center justify-end">Fact. YTD {getSortIcon('facturacion')}</div>
                  </th>
                  <th className="w-[12%] px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('facturacionAnioAnterior')}>
                    <div className="flex items-center justify-end">Fact. LY {getSortIcon('facturacionAnioAnterior')}</div>
                  </th>
                  <th className="w-[12%] px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('objetivo')}>
                    <div className="flex items-center justify-end">Objetivo {getSortIcon('objetivo')}</div>
                  </th>
                  <th className="w-[12%] px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('desviacion')}>
                    <div className="flex items-center justify-end">Desviación {getSortIcon('desviacion')}</div>
                  </th>
                  <th className="w-[12%] px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-center cursor-pointer group hover:bg-white/10" onClick={() => handleSort('desviacionPorcentaje')}>
                    <div className="flex items-center justify-center">Desviación % {getSortIcon('desviacionPorcentaje')}</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-dts-primary dark:text-gray-300">
                {isLoadingPerf ?
                  <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-dts-secondary" /></td></tr>
                 : tableData.length === 0 ?
                  <tr><td colSpan={5} className="py-20 text-center text-gray-400 opacity-60">Sin datos de rendimiento para los filtros aplicados</td></tr>
                 :
                  tableData.map((row, idx) => {
                    const isExpanded = expandedRows.has(row.customerCode);
                    return (
                      <React.Fragment key={`${row.customerCode}-${idx}`}>
                        {/* Customer Row */}
                        <tr
                          onClick={() => toggleExpand(row.customerCode)}
                          className={`cursor-pointer transition-colors font-semibold ${row.isNew ? 'bg-emerald-50/30 dark:bg-emerald-500/5 hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10' : 'hover:bg-gray-50/80 dark:hover:bg-white/5'}`}
                        >
                          <td className="px-6 py-3 font-medium">
                            <div className="flex items-center gap-2">
                              <ChevronRight size={14} className={`shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                              <div className="flex flex-col truncate">
                                <div className="flex items-center gap-2 truncate">
                                  <span className="truncate font-bold" title={row.customerName}>{row.customerName}</span>
                                  {row.isNew && <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 animate-pulse uppercase">Nuevo</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right font-mono font-bold">{formatCurrency(row.facturacion, 0)}</td>
                          <td className="px-6 py-3 text-right font-mono text-gray-400">{(row as any).facturacionAnioAnterior ? formatCurrency((row as any).facturacionAnioAnterior, 0) : '-'}</td>
                          <td className="px-6 py-3 text-right font-mono">{formatCurrency(row.objetivo, 0)}</td>
                          <td className={`px-6 py-3 text-right font-mono ${row.desviacion < 0 ? 'text-red-500 font-bold' : 'text-emerald-500'}`}>{row.desviacion > 0 ? '+' : ''}{formatCurrency(row.desviacion, 0)}</td>
                          <td className={`px-6 py-3 text-center font-mono font-bold ${row.desviacionPorcentaje < 0 ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'}`}>{row.desviacionPorcentaje > 0 ? '+' : ''}{formatNumber(row.desviacionPorcentaje, 1)}%</td>
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
                            <td className={`px-6 py-2.5 text-right font-mono ${prod.desviacion < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{prod.desviacion > 0 ? '+' : ''}{formatCurrency(prod.desviacion, 0)}</td>
                            <td className={`px-6 py-2.5 text-center font-mono ${prod.desviacionPorcentaje < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{prod.desviacionPorcentaje > 0 ? '+' : ''}{formatNumber(prod.desviacionPorcentaje, 1)}%</td>
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
                    <td className="w-[12%] px-6 py-4 text-right font-mono">{formatCurrency(performanceKPIs.ventas, 0)}</td>
                    <td className="w-[12%] px-6 py-4 text-right font-mono opacity-60">{(performanceKPIs as any).facturacionAnioAnterior ? formatCurrency((performanceKPIs as any).facturacionAnioAnterior, 0) : '-'}</td>
                    <td className="w-[12%] px-6 py-4 text-right font-mono">{formatCurrency(performanceKPIs.objetivo, 0)}</td>
                    <td className={`w-[12%] px-6 py-4 text-right font-mono ${performanceKPIs.desviacionEur < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{performanceKPIs.desviacionEur > 0 ? '+' : ''}{formatCurrency(performanceKPIs.desviacionEur, 0)}</td>
                    <td className={`w-[12%] px-6 py-4 text-center font-mono text-[10px] ${performanceKPIs.desviacionPct < 0 ? 'text-red-400 bg-red-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>{performanceKPIs.desviacionPct > 0 ? '+' : ''}{formatNumber(performanceKPIs.desviacionPct, 1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Evolution Chart */}
      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card border border-gray-100 dark:border-gray-800 p-6 h-[400px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider">Evolución VENTAS vs. OBJETIVOS {year}</h3>
          <InfoPopover title="Evolución Mensual" description="Comparativa temporal de la facturación frente al presupuesto mes a mes." objective="Detectar meses de estacionalidad o desviaciones recurrentes en el cumplimiento del presupuesto anual." iconSize={16} />
        </div>
        <div className="flex-1 w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={(evolutionData || []).filter(d => selectedMonths.length === 0 || selectedMonths.includes(d.month))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
              <XAxis dataKey="month" tickFormatter={(m) => MONTHS.find(x => x.val === m)?.label || m} tick={{fontSize: 10}} />
              <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{fontSize: 10}} />
              <Tooltip content={<CustomTooltip />} cursor={false}/>
              <Legend verticalAlign="top" content={RenderCustomLegend} />
              <Bar dataKey="ventas" name="Ventas Reales" fill="#00B0B9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="objetivo" name="Objetivo (Presupuesto)" fill="#64748B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
