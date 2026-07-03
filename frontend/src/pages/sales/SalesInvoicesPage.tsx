import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getBillingHistoryDashboard, getAllSalesDocuments } from '../../api/salesDocuments';
import { formatCurrency } from '../../api/formatters';
import { 
  Receipt, Loader2, ArrowUpDown, ChevronUp, ChevronDown, ChevronRight, 
  Package, Search, BarChart3, Eye, X
} from 'lucide-react';
import { TableSkeleton, ExportButton, SearchableSelect } from '../../components/ui';
import { useUIStore } from '../../store/uiStore';
import { exportToXlsx } from '../../utils/exportToXlsx';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export const SalesInvoicesPage: React.FC = () => {
  const { setPageInfo } = useUIStore();
  const [showCharts, setShowCharts] = useState(true);
  const [viewType, setViewType] = useState<'detail' | 'comparison'>('detail');
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Global filters state (affecting both graphs and detailed table)
  const [selectedYears, setSelectedYears] = useState<number[]>([new Date().getFullYear()]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>(
    Array.from({ length: new Date().getMonth() + 1 }, (_, i) => i + 1)
  );

  // Detailed list state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<string>('posting_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedDocNos, setExpandedDocNos] = useState<Record<string, boolean>>({});
  const pageSize = 50;

  // Comparison view sort state
  const [compSortBy, setCompSortBy] = useState<string>('total');
  const [compSortDir, setCompSortDir] = useState<'asc' | 'desc'>('desc');

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

  const [selectedKpiYear, setSelectedKpiYear] = useState<number | null>(null);

  // Fetch Dashboard charts data
  const { data: dashboardResult, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['billingHistoryDashboard'],
    queryFn: getBillingHistoryDashboard,
  });

  const dashboardData = dashboardResult?.aggregated || [];
  const yearlyBreakdown = dashboardResult?.yearlyBreakdown || {};

  const filteredYearlyBreakdown = useMemo(() => {
    const result: Record<number, {
      itemsTotal: number;
      accounts: {
        account_no: string;
        description: string;
        amount: number;
      }[];
    }> = {};

    [2022, 2023, 2024, 2025, 2026].forEach(year => {
      let itemsTotal = 0;
      const accountsMap: Record<string, {
        account_no: string;
        description: string;
        amount: number;
      }> = {};

      selectedMonths.forEach(month => {
        const monthData = yearlyBreakdown[year]?.[month];
        if (monthData) {
          itemsTotal += monthData.itemsTotal;
          monthData.accounts.forEach(acct => {
            if (!accountsMap[acct.account_no]) {
              accountsMap[acct.account_no] = { ...acct };
            } else {
              accountsMap[acct.account_no].amount += acct.amount;
            }
          });
        }
      });

      result[year] = {
        itemsTotal,
        accounts: Object.values(accountsMap).sort((a, b) => b.amount - a.amount)
      };
    });

    return result;
  }, [yearlyBreakdown, selectedMonths]);

  // Fetch Detailed List data (Infinite Scroll) - now filters by selectedYears and selectedMonths globally
  const { 
    data: listData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading: isLoadingList 
  } = useInfiniteQuery({
    queryKey: ['salesDocuments', debouncedSearch, docTypeFilter, selectedYears, selectedMonths, sortBy, sortDir],
    queryFn: ({ pageParam = 0 }) => getAllSalesDocuments({ 
      take: pageSize, skip: pageParam as number, search: debouncedSearch,
      type: docTypeFilter || undefined,
      years: selectedYears,
      months: selectedMonths,
      sortBy, sortDir
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextSkip = allPages.length * pageSize;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
  });

  const documents = useMemo(() => {
    return listData?.pages.flatMap(page => page.data) || [];
  }, [listData]);

  const observerTarget = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Toggle Filters
  const handleYearToggle = (year: number) => {
    setSelectedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year].sort()
    );
  };

  const handleMonthToggle = (monthIndex: number) => {
    const mNum = monthIndex + 1;
    setSelectedMonths(prev => 
      prev.includes(mNum) ? prev.filter(m => m !== mNum) : [...prev, mNum].sort((a,b) => a-b)
    );
  };

  // ----------------------------------------------------
  // Dashboard Calculations (Aggregated In-Memory for the charts)
  // ----------------------------------------------------
  const dashboardCalculations = useMemo(() => {
    const yearlyTotals: Record<number, number> = {
      2022: 0, 2023: 0, 2024: 0, 2025: 0, 2026: 0
    };
    const yearlyAccountsPositiveTotals: Record<number, number> = {
      2022: 0, 2023: 0, 2024: 0, 2025: 0, 2026: 0
    };
    const yearlyAccountsNegativeTotals: Record<number, number> = {
      2022: 0, 2023: 0, 2024: 0, 2025: 0, 2026: 0
    };
    dashboardData.forEach(item => {
      if (item.year >= 2022 && item.year <= 2026 && selectedMonths.includes(item.month)) {
        yearlyTotals[item.year] += item.amount;
        yearlyAccountsPositiveTotals[item.year] += item.accounts_positive_amount || 0;
        yearlyAccountsNegativeTotals[item.year] += item.accounts_negative_amount || 0;
      }
    });

    // 2. Monthly Evolution Chart Data (Unfiltered)
    const monthlyEvolution = MONTH_NAMES.map((name, index) => {
      const mNum = index + 1;
      const row: any = { month: name };
      [2022, 2023, 2024, 2025, 2026].forEach(year => {
        row[year] = 0;
      });
      dashboardData.forEach(item => {
        if (item.month === mNum && item.year >= 2022 && item.year <= 2026) {
          row[item.year] = (row[item.year] || 0) + item.amount;
        }
      });
      return row;
    });

    // 3. Salesperson Chart Data (Filtered)
    const salespersonTotals: Record<string, number> = {};
    dashboardData.forEach(item => {
      if (selectedYears.includes(item.year) && selectedMonths.includes(item.month)) {
        const code = item.salesperson_code || '(En blanco)';
        salespersonTotals[code] = (salespersonTotals[code] || 0) + item.amount;
      }
    });

    const salespersonChartData = Object.entries(salespersonTotals)
      .map(([code, amount]) => ({
        name: code,
        amount: Number((amount / 1000).toFixed(2)) // in thousands ("mil")
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      yearlyTotals,
      yearlyAccountsPositiveTotals,
      yearlyAccountsNegativeTotals,
      monthlyEvolution,
      salespersonChartData
    };
  }, [dashboardData, selectedYears, selectedMonths]);

  // Comparative client table calculation (years 2023-2026)
  const comparisonData = useMemo(() => {
    if (viewType !== 'comparison') return [];

    const customers: Record<string, {
      customer_no: string;
      customer_name: string;
      2023: number;
      2024: number;
      2025: number;
      2026: number;
      total: number;
    }> = {};

    dashboardData.forEach(item => {
      if (selectedMonths.includes(item.month)) {
        const cNo = item.customer_no;
        if (!customers[cNo]) {
          customers[cNo] = {
            customer_no: cNo,
            customer_name: item.customer_name,
            2023: 0,
            2024: 0,
            2025: 0,
            2026: 0,
            total: 0
          };
        }

        const yr = item.year;
        if (yr >= 2023 && yr <= 2026) {
          customers[cNo][yr as 2023 | 2024 | 2025 | 2026] += item.amount;
          customers[cNo].total += item.amount;
        }
      }
    });

    let list = Object.values(customers);
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      list = list.filter(c => 
        c.customer_no.toLowerCase().includes(search) || 
        c.customer_name.toLowerCase().includes(search)
      );
    }

    return list;
  }, [dashboardData, selectedMonths, viewType, debouncedSearch]);

  const sortedComparisonData = useMemo(() => {
    if (viewType !== 'comparison') return [];
    const list = [...comparisonData];
    const field = compSortBy;
    const isAsc = compSortDir === 'asc';

    list.sort((a: any, b: any) => {
      let valA = a[field];
      let valB = b[field];

      if (valA === undefined || valA === null) valA = typeof valB === 'string' ? '' : 0;
      if (valB === undefined || valB === null) valB = typeof valA === 'string' ? '' : 0;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        return isAsc ? numA - numB : numB - numA;
      }
    });
    return list;
  }, [comparisonData, compSortBy, compSortDir, viewType]);

  // Totals calculations for detailed list (using absolute totals from backend)
  const totals = useMemo(() => {
    const summary = listData?.pages[0]?.summary;
    return {
      net: summary?.totalInvoicedNet || 0,
      vat: summary?.totalVatAmount || 0,
      incl: summary?.totalAmountInclVat || 0,
      avgMargin: summary?.averageMarginPct || 0,
    };
  }, [listData]);

  // Totals calculations for comparison view
  const comparisonTotals = useMemo(() => {
    let t2023 = 0;
    let t2024 = 0;
    let t2025 = 0;
    let t2026 = 0;
    let grandTotal = 0;

    sortedComparisonData.forEach(row => {
      t2023 += row[2023] || 0;
      t2024 += row[2024] || 0;
      t2025 += row[2025] || 0;
      t2026 += row[2026] || 0;
      grandTotal += row.total || 0;
    });

    return { 2023: t2023, 2024: t2024, 2025: t2025, 2026: t2026, total: grandTotal };
  }, [sortedComparisonData]);

  const handleSort = (field: string) => {
    if (viewType === 'detail') {
      if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      else { setSortBy(field); setSortDir('desc'); }
    } else {
      if (compSortBy === field) setCompSortDir(compSortDir === 'asc' ? 'desc' : 'asc');
      else { setCompSortBy(field); setCompSortDir('desc'); }
    }
  };

  const getSortIcon = (field: string) => {
    const activeField = viewType === 'detail' ? sortBy : compSortBy;
    const activeDir = viewType === 'detail' ? sortDir : compSortDir;
    if (activeField !== field) return <ArrowUpDown size={12} className="ml-1 opacity-20" />;
    return activeDir === 'asc' ? <ChevronUp size={12} className="ml-1 text-dts-secondary" /> : <ChevronDown size={12} className="ml-1 text-dts-secondary" />;
  };

  const toggleExpand = (docNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDocNos(prev => ({ ...prev, [docNo]: !prev[docNo] }));
  };

  const handleExport = async () => {
    if (viewType === 'comparison') {
      const exportRows = sortedComparisonData.map(c => ({
        customer_no: c.customer_no,
        customer_name: c.customer_name,
        amount_2023: Number((c[2023] || 0).toFixed(2)),
        amount_2024: Number((c[2024] || 0).toFixed(2)),
        amount_2025: Number((c[2025] || 0).toFixed(2)),
        amount_2026: Number((c[2026] || 0).toFixed(2)),
        total: Number((c.total || 0).toFixed(2))
      }));

      const columns = [
        { key: 'customer_no', label: 'Código Cliente' },
        { key: 'customer_name', label: 'Nombre Cliente' },
        { key: 'amount_2023', label: 'Facturado 2023 (€)' },
        { key: 'amount_2024', label: 'Facturado 2024 (€)' },
        { key: 'amount_2025', label: 'Facturado 2025 (€)' },
        { key: 'amount_2026', label: 'Facturado 2026 (€)' },
        { key: 'total', label: 'Total (€)' }
      ];

      exportToXlsx(exportRows, columns, 'comparativa_facturacion_clientes');
      return;
    }

    // Para la vista detallada, abrimos el modal de selección de exportación
    setShowExportModal(true);
  };

  const exportHeaders = async () => {
    setIsExporting(true);
    try {
      const result = await getAllSalesDocuments({
        take: 99999,
        skip: 0,
        search: debouncedSearch,
        type: docTypeFilter || undefined,
        years: selectedYears,
        months: selectedMonths,
        sortBy,
        sortDir,
      });

      const exportRows = result.data.map(doc => {
        const isAbono = doc.document_type?.toLowerCase()?.includes('abono') || doc.document_no?.toUpperCase().startsWith('AB');
        const multiplier = isAbono ? -1 : 1;
        return {
          posting_date: doc.posting_date ? new Date(doc.posting_date).toLocaleDateString('es-ES') : '---',
          document_no: doc.document_no,
          document_type: isAbono ? 'Abono' : 'Factura',
          customer_no: doc.customer_no,
          customer_name: doc.customer?.name || '---',
          your_reference: doc.your_reference || '---',
          order_no: doc.order_no || '---',
          external_doc_no: doc.external_doc_no || '---',
          shipment_no: doc.shipment_no || '---',
          payment_terms_code: doc.payment_terms_code || '---',
          payment_method_code: doc.payment_method_code || '---',
          total_amount_excl_vat: Number(doc.total_amount_excl_vat || 0) * multiplier,
          total_vat_amount: Number(doc.total_vat_amount || 0) * multiplier,
          total_amount_incl_vat: Number(doc.total_amount_incl_vat || 0) * multiplier,
          invoice_margen: Number(doc.invoice_margen || 0)
        };
      });

      const columns = [
        { key: 'posting_date', label: 'Fecha Registro' },
        { key: 'document_no', label: 'Nº Documento' },
        { key: 'document_type', label: 'Tipo Documento' },
        { key: 'customer_no', label: 'Cód. Cliente' },
        { key: 'customer_name', label: 'Nombre Cliente' },
        { key: 'your_reference', label: 'Referencia' },
        { key: 'order_no', label: 'Pedido Origen' },
        { key: 'external_doc_no', label: 'Doc. Externo Cliente' },
        { key: 'shipment_no', label: 'Nº Albarán' },
        { key: 'payment_terms_code', label: 'Términos Pago' },
        { key: 'payment_method_code', label: 'Método Pago' },
        { key: 'total_amount_excl_vat', label: 'Importe Neto (€)' },
        { key: 'total_vat_amount', label: 'IVA (€)' },
        { key: 'total_amount_incl_vat', label: 'Total Documento (€)' },
        { key: 'invoice_margen', label: 'Margen LDR (%)' }
      ];

      exportToXlsx(exportRows, columns, 'historico_facturas_venta');
      setShowExportModal(false);
    } catch (error) {
      console.error('Error al exportar cabeceras:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportLines = async () => {
    setIsExporting(true);
    try {
      const result = await getAllSalesDocuments({
        take: 99999,
        skip: 0,
        search: debouncedSearch,
        type: docTypeFilter || undefined,
        years: selectedYears,
        months: selectedMonths,
        sortBy,
        sortDir,
      });

      const exportRows: any[] = [];
      result.data.forEach(doc => {
        const isAbono = doc.document_type?.toLowerCase()?.includes('abono') || doc.document_no?.toUpperCase().startsWith('AB');
        const multiplier = isAbono ? -1 : 1;

        if (doc.lines && doc.lines.length > 0) {
          doc.lines.forEach(line => {
            const qty = Number(line.quantity || 0) * multiplier;
            const lineAmt = Number(line.line_amount || 0) * multiplier;
            const lineDisc = Number(line.line_disc_amount || 0) * multiplier;

            exportRows.push({
              posting_date: doc.posting_date ? new Date(doc.posting_date).toLocaleDateString('es-ES') : '---',
              document_no: doc.document_no,
              document_type: isAbono ? 'Abono' : 'Factura',
              customer_no: doc.customer_no,
              customer_name: doc.customer?.name || '---',
              your_reference: doc.your_reference || '---',
              line_no: line.line_no || '---',
              type: line.type || '---',
              product_no: line.product_no || '---',
              description: line.product?.description || '---',
              quantity: qty,
              unit_price: Number(line.unit_price || 0),
              line_disc_percent: Number(line.line_disc_percent || 0),
              line_disc_amount: lineDisc,
              line_amount: lineAmt,
              margen_percent_ldr: Number(line.margen_percent_ldr || 0)
            });
          });
        } else {
          exportRows.push({
            posting_date: doc.posting_date ? new Date(doc.posting_date).toLocaleDateString('es-ES') : '---',
            document_no: doc.document_no,
            document_type: isAbono ? 'Abono' : 'Factura',
            customer_no: doc.customer_no,
            customer_name: doc.customer?.name || '---',
            your_reference: doc.your_reference || '---',
            line_no: '---',
            type: '---',
            product_no: '---',
            description: 'Sin líneas detalladas',
            quantity: 0,
            unit_price: 0,
            line_disc_percent: 0,
            line_disc_amount: 0,
            line_amount: Number(doc.total_amount_excl_vat || 0) * multiplier,
            margen_percent_ldr: Number(doc.invoice_margen || 0)
          });
        }
      });

      const columns = [
        { key: 'posting_date', label: 'Fecha Registro' },
        { key: 'document_no', label: 'Nº Documento' },
        { key: 'document_type', label: 'Tipo Documento' },
        { key: 'customer_no', label: 'Cód. Cliente' },
        { key: 'customer_name', label: 'Nombre Cliente' },
        { key: 'your_reference', label: 'Referencia' },
        { key: 'line_no', label: 'Nº Línea' },
        { key: 'type', label: 'Tipo Línea' },
        { key: 'product_no', label: 'Cód. Producto/Cuenta' },
        { key: 'description', label: 'Descripción' },
        { key: 'quantity', label: 'Cantidad' },
        { key: 'unit_price', label: 'Precio Unitario (€)' },
        { key: 'line_disc_percent', label: 'Descuento Línea (%)' },
        { key: 'line_disc_amount', label: 'Descuento Línea (€)' },
        { key: 'line_amount', label: 'Importe Línea Neto (€)' },
        { key: 'margen_percent_ldr', label: 'Margen Línea LDR (%)' }
      ];

      exportToXlsx(exportRows, columns, 'historico_lineas_factura_venta');
      setShowExportModal(false);
    } catch (error) {
      console.error('Error al exportar líneas:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Recharts colors
  const LINE_COLORS = {
    2022: '#3b82f6', // blue
    2023: '#1e3a8a', // dark blue
    2024: '#f97316', // orange
    2025: '#8b5cf6', // purple
    2026: '#ec4899'  // pink
  };

  const chartTheme = {
    textColor: '#94a3b8',
    gridColor: 'rgba(148, 163, 184, 0.1)',
    tooltipBg: '#0f172a',
    tooltipBorder: '#1e293b'
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* Línea de Filtros Generales */}
      <div className="bg-white dark:bg-surface-card-dark p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4 items-end justify-between">
        
        {/* Left: Meses */}
        <div className="flex flex-col gap-1.5 w-full md:w-auto">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Filtro de Meses</span>
            <div className="flex gap-2 text-[9px] font-extrabold text-dts-secondary uppercase tracking-wider">
              <button onClick={() => setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])} className="hover:underline transition-all">Todos</button>
              <span className="text-gray-300 dark:text-gray-700 font-normal">|</span>
              <button onClick={() => setSelectedMonths([])} className="hover:underline transition-all">Ninguno</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {MONTH_NAMES.map((mName, idx) => {
              const mNum = idx + 1;
              const isActive = selectedMonths.includes(mNum);
              return (
                <button
                  key={mName}
                  onClick={() => handleMonthToggle(idx)}
                  className={`w-11 py-1 text-xs font-bold rounded-lg capitalize transition-all border text-center ${
                    isActive
                      ? 'bg-dts-secondary border-dts-secondary text-white hover:bg-dts-secondary/90 hover:border-dts-secondary/90 shadow-xs'
                      : 'bg-white text-gray-400 border-gray-300 hover:bg-dts-secondary/10 hover:border-dts-secondary hover:text-dts-secondary dark:bg-dts-primary-dark dark:border-gray-700 dark:text-gray-500 dark:hover:bg-dts-secondary/20 dark:hover:border-dts-secondary dark:hover:text-dts-secondary-light'
                  }`}
                >
                  {mName.substring(0, 3)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Años */}
        <div className="flex flex-col gap-1.5 items-start w-full md:w-auto">
          <div className="flex items-center justify-between w-full gap-4">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Filtro de Años</span>
            <div className="flex gap-2 text-[9px] font-extrabold text-dts-primary dark:text-dts-secondary uppercase tracking-wider">
              <button onClick={() => setSelectedYears([2022, 2023, 2024, 2025, 2026])} className="hover:underline transition-all">Todos</button>
              <span className="text-gray-300 dark:text-gray-700 font-normal">|</span>
              <button onClick={() => setSelectedYears([])} className="hover:underline transition-all">Ninguno</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {[2022, 2023, 2024, 2025, 2026].map(y => {
              const isActive = selectedYears.includes(y);
              return (
                <button
                  key={y}
                  onClick={() => handleYearToggle(y)}
                  className={`px-3.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                    isActive
                      ? 'bg-dts-primary border-dts-primary text-white hover:bg-dts-primary/90 hover:border-dts-primary/90 shadow-xs'
                      : 'bg-white text-gray-400 border-gray-300 hover:bg-dts-primary/10 hover:border-dts-primary hover:text-dts-primary dark:bg-dts-primary-dark dark:border-gray-700 dark:text-gray-500 dark:hover:bg-dts-primary/20 dark:hover:border-dts-primary dark:hover:text-white'
                  }`}
                >
                  {y}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Mostrar/Ocultar Gráficos */}
        <div className="w-full md:w-auto flex justify-end">
          <button
            onClick={() => setShowCharts(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-card-dark text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-xs"
          >
            <BarChart3 size={12} className={showCharts ? 'text-dts-secondary' : 'text-gray-400'} />
            {showCharts ? 'Ocultar Gráficos' : 'Mostrar Gráficos'}
          </button>
        </div>

      </div>

      {/* Collapsible Executive Charts Dashboard */}
      {showCharts && (
        isLoadingDashboard ? (
          <div className="flex items-center justify-center py-10 bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <Loader2 className="animate-spin text-dts-primary mr-2" size={20} />
            <span className="text-xs text-gray-500">Cargando gráficos ejecutivos...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-top-4 duration-300">
            
            {/* LEFT COLUMN: KPIs + Line chart (Evolución Facturación) */}
            <div className="lg:col-span-8 space-y-6 flex flex-col justify-between">
              
              {/* 1x4 KPI Cards for billing by year */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { year: 2026, bg: 'bg-[#002D3B] text-white', label: 'Facturas 2026' },
                  { year: 2025, bg: 'bg-[#00B0B9] text-white', label: 'Facturas 2025' },
                  { year: 2024, bg: 'bg-[#002D3B] text-white', label: 'Facturas 2024' },
                  { year: 2023, bg: 'bg-[#00B0B9] text-white', label: 'Facturas 2023' }
                ].map(kpi => (
                  <div 
                    key={kpi.year} 
                    onClick={() => setSelectedKpiYear(kpi.year)}
                    className={`${kpi.bg} p-4 rounded-xl flex flex-col justify-center shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group relative overflow-hidden`}
                  >
                    <span className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye size={12} className="opacity-80" />
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">{kpi.label}</span>
                    <h3 className="text-lg font-extrabold font-mono mt-1.5 tracking-tight">
                      {formatCurrency(dashboardCalculations.yearlyTotals[kpi.year], 0)}
                    </h3>
                    <div className="text-[9px] opacity-80 mt-1 italic font-semibold space-y-0.5">
                      <div>Total Cuentas: {formatCurrency((dashboardCalculations.yearlyAccountsPositiveTotals[kpi.year] || 0) + (dashboardCalculations.yearlyAccountsNegativeTotals[kpi.year] || 0), 0)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Line chart container */}
              <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm flex-1 flex flex-col justify-between">
                <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider mb-4">Evolución Facturación</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboardCalculations.monthlyEvolution} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
                      <XAxis dataKey="month" stroke={chartTheme.textColor} tick={{ fontSize: 10 }} />
                      <YAxis stroke={chartTheme.textColor} tick={{ fontSize: 10 }} tickFormatter={(val) => `${(val / 1000).toFixed(0)} mil`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, borderRadius: '8px', color: '#fff' }}
                        formatter={(val, name) => [formatCurrency(Number(val)), name]}
                      />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      {[2023, 2024, 2025, 2026].map(year => (
                        <Line
                          key={year}
                          type="monotone"
                          dataKey={year}
                          name={String(year)}
                          stroke={(LINE_COLORS as any)[year]}
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Bar Charts (Stacked one on top of the other, occupying vertical space) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Bar Chart: Facturación por Vendedor */}
              <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm flex-1 flex flex-col justify-between">
                <h4 className="text-xs font-bold text-dts-primary dark:text-white uppercase tracking-wider mb-3">Facturación x Vendedor</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardCalculations.salespersonChartData.slice(0, 5)} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
                      <XAxis dataKey="name" stroke={chartTheme.textColor} tick={{ fontSize: 9 }} />
                      <YAxis stroke={chartTheme.textColor} tick={{ fontSize: 9 }} tickFormatter={(val) => `${val}k`} />
                      <Tooltip
                        cursor={false}
                        contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, borderRadius: '6px', color: '#fff', fontSize: '9px' }}
                        formatter={(val) => [`${val} mil €`, 'Vendedor']}
                      />
                      <Bar dataKey="amount" fill="#00B0B9" radius={[3, 3, 0, 0]} activeBar={false}>
                        {dashboardCalculations.salespersonChartData.slice(0, 5).map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.name === '(En blanco)' ? '#94a3b8' : '#00B0B9'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart: Total Facturación por Año */}
              <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm flex-1 flex flex-col justify-between">
                <h4 className="text-xs font-bold text-dts-primary dark:text-white uppercase tracking-wider mb-3">Total Facturación</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={[2022, 2023, 2024, 2025, 2026].map(year => ({
                        year: String(year),
                        amount: Number((dashboardCalculations.yearlyTotals[year] / 1000).toFixed(1))
                      }))} 
                      margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
                      <XAxis dataKey="year" stroke={chartTheme.textColor} tick={{ fontSize: 9 }} />
                      <YAxis stroke={chartTheme.textColor} tick={{ fontSize: 9 }} tickFormatter={(val) => `${val}k`} />
                      <Tooltip
                        cursor={false}
                        contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, borderRadius: '6px', color: '#fff', fontSize: '9px' }}
                        formatter={(val) => [`${val} mil €`, 'Total']}
                      />
                      <Bar dataKey="amount" fill="#00B0B9" radius={[3, 3, 0, 0]} activeBar={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>
        )
      )}

      {/* Detailed Table (Original Functionality and Filters) */}
      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card border border-gray-100 dark:border-gray-800 flex flex-col h-[calc(100vh-340px)] min-h-[400px] overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-transparent space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:max-w-2xl">
              <div className="w-full sm:max-w-md relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Search className="h-4 w-4" />
                </div>
                <input 
                  type="text" 
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dts-secondary/50 sm:text-sm" 
                  placeholder={viewType === 'detail' ? "Buscar por doc, cliente, sku, pedido, ref..." : "Buscar cliente por nombre o código..."} 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
              {viewType === 'detail' && (
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
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {/* Segmented Control Switch */}
              <div className="bg-gray-100 dark:bg-white/5 p-1 rounded-lg border border-gray-200 dark:border-white/10 flex items-center gap-0.5">
                <button
                  onClick={() => setViewType('detail')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                    viewType === 'detail'
                      ? 'bg-dts-primary text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Facturas Detalle
                </button>
                <button
                  onClick={() => setViewType('comparison')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                    viewType === 'comparison'
                      ? 'bg-dts-primary text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Comparativa Clientes (4 Años)
                </button>
              </div>

              <ExportButton onExport={handleExport} />
            </div>
          </div>
        </div>

        {/* Table container */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {viewType === 'detail' ? (
            isLoadingList && !listData ? (
              <TableSkeleton rows={15} columns={9} />
            ) : (
              <table className="w-full text-left text-sm border-separate border-spacing-0">
                <thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg">
                  <tr>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] w-10"></th>
                    {[
                      { label: 'Fecha Reg', key: 'posting_date' },
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
                            {doc.posting_date ? new Date(doc.posting_date).toLocaleDateString('es-ES') : '---'}
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
                            {formatCurrency(Number(doc.total_amount_excl_vat || 0) * (isAbono ? -1 : 1), 2)}
                          </td>
                          <td className={`px-6 py-3 text-right font-mono ${isAbono ? 'text-rose-500 font-medium' : 'text-gray-500'}`}>
                            {formatCurrency(Number(doc.total_vat_amount || 0) * (isAbono ? -1 : 1), 2)}
                          </td>
                          <td className={`px-6 py-3 text-right font-mono font-semibold ${isAbono ? 'text-rose-500' : 'text-gray-700 dark:text-gray-200'}`}>
                            {formatCurrency(Number(doc.total_amount_incl_vat || 0) * (isAbono ? -1 : 1), 2)}
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
                                          <td className={`px-4 py-2.5 text-right font-bold ${isAbono ? 'text-rose-500' : 'text-gray-700 dark:text-gray-200'}`}>{formatCurrency(Number(line.line_amount || 0) * (isAbono ? -1 : 1), 2)}</td>
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
                {documents.length > 0 && (
                  <tfoot className="bg-dts-primary text-white sticky bottom-0 z-20 shadow-lg font-bold text-xs uppercase">
                    <tr className="divide-x divide-white/10">
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4" colSpan={4}>TOTALES FILTRADOS</td>
                      <td className="px-6 py-4 text-right font-mono">{formatCurrency(totals.net, 2)}</td>
                      <td className="px-6 py-4 text-right font-mono">{formatCurrency(totals.vat, 2)}</td>
                      <td className="px-6 py-4 text-right font-mono">{formatCurrency(totals.incl, 2)}</td>
                      <td className={`px-6 py-4 text-right font-mono ${totals.avgMargin < 0 ? 'text-rose-400' : 'text-blue-400'}`}>{totals.avgMargin.toFixed(2)}%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )
          ) : (
            /* Comparative Customer Table (4 Years) */
            <table className="w-full text-left text-sm border-separate border-spacing-0">
              <thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg">
                <tr>
                  {[
                    { label: 'Código', key: 'customer_no' },
                    { label: 'Cliente', key: 'customer_name' },
                    { label: 'Facturado 2023', key: '2023', align: 'right' },
                    { label: 'Facturado 2024', key: '2024', align: 'right' },
                    { label: 'Facturado 2025', key: '2025', align: 'right' },
                    { label: 'Facturado 2026', key: '2026', align: 'right' },
                    { label: 'Total', key: 'total', align: 'right' },
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
                {sortedComparisonData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400 font-sans italic">
                      No hay clientes que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  sortedComparisonData.map((row, idx) => (
                    <tr key={`${row.customer_no}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-xs font-mono">
                      <td className="px-6 py-3.5 font-bold text-gray-800 dark:text-gray-200">
                        {row.customer_no}
                      </td>
                      <td className="px-6 py-3.5 font-sans font-medium text-gray-700 dark:text-gray-300">
                        {row.customer_name}
                      </td>
                      <td className={`px-6 py-3.5 text-right ${row[2023] < 0 ? 'text-rose-500 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {formatCurrency(row[2023], 0)}
                      </td>
                      <td className={`px-6 py-3.5 text-right ${row[2024] < 0 ? 'text-rose-500 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {formatCurrency(row[2024], 0)}
                      </td>
                      <td className={`px-6 py-3.5 text-right ${row[2025] < 0 ? 'text-rose-500 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {formatCurrency(row[2025], 0)}
                      </td>
                      <td className={`px-6 py-3.5 text-right ${row[2026] < 0 ? 'text-rose-500 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {formatCurrency(row[2026], 0)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-dts-primary dark:text-dts-secondary text-sm">
                        {formatCurrency(row.total, 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {sortedComparisonData.length > 0 && (
                <tfoot className="bg-dts-primary text-white sticky bottom-0 z-20 shadow-lg font-bold text-xs uppercase">
                  <tr className="divide-x divide-white/10">
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4">TOTALES</td>
                    <td className="px-6 py-4 text-right font-mono">{formatCurrency(comparisonTotals[2023], 0)}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatCurrency(comparisonTotals[2024], 0)}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatCurrency(comparisonTotals[2025], 0)}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatCurrency(comparisonTotals[2026], 0)}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm">{formatCurrency(comparisonTotals.total, 0)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
      {/* Yearly Breakdown Modal */}
      {selectedKpiYear !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <Receipt className="text-dts-secondary" size={20} />
                <h2 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Desglose Facturación {selectedKpiYear}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedKpiYear(null)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
              {/* Product/Items Summary Card */}
              <div className="bg-dts-secondary/10 dark:bg-dts-secondary/5 border border-dts-secondary/20 p-5 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-dts-secondary-light">Total de Productos / Items</h4>
                  <p className="text-2xl font-black font-mono text-dts-primary dark:text-white mt-1">
                    {formatCurrency(filteredYearlyBreakdown[selectedKpiYear]?.itemsTotal || 0, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-dts-secondary/20 rounded-xl flex items-center justify-center text-dts-secondary">
                  <Package size={24} />
                </div>
              </div>

              {/* Accounts breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-gray-400">Desglose por Cuentas (G/L Accounts)</h4>
                
                <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-separate border-spacing-0">
                    <thead className="bg-gray-50 dark:bg-white/5 text-gray-400 font-bold uppercase tracking-wider text-[9px]">
                      <tr>
                        <th className="px-4 py-3">Nº Cuenta</th>
                        <th className="px-4 py-3">Descripción</th>
                        <th className="px-4 py-3 text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-sans text-gray-700 dark:text-gray-300">
                      {filteredYearlyBreakdown[selectedKpiYear]?.accounts && filteredYearlyBreakdown[selectedKpiYear].accounts.length > 0 ? (
                        filteredYearlyBreakdown[selectedKpiYear].accounts.map((acct: any) => (
                          <tr key={acct.account_no} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors font-medium">
                            <td className="px-4 py-3 font-mono text-dts-secondary font-bold">{acct.account_no}</td>
                            <td className="px-4 py-3 text-xs">{acct.description}</td>
                            <td className={`px-4 py-3 text-right font-mono font-bold ${acct.amount < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {formatCurrency(acct.amount, 2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-gray-400 italic">
                            No hay registros de cuentas G/L para este año.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end bg-gray-50/30 dark:bg-transparent">
              <button 
                onClick={() => setSelectedKpiYear(null)}
                className="px-4 py-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-card-dark text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exportación */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-300">
          <div 
            className="bg-white dark:bg-[#121c24] rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800 transform scale-100 transition-transform duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-dts-secondary" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-dts-primary dark:text-white">
                  Opciones de Exportación
                </h3>
              </div>
              <button 
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                disabled={isExporting}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Selecciona cómo deseas exportar los datos del histórico de facturación actual a un archivo Excel (.xlsx):
              </p>

              <div className="grid grid-cols-1 gap-3">
                {/* Opción Cabeceras */}
                <button
                  onClick={exportHeaders}
                  disabled={isExporting}
                  className="flex flex-col items-start p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 hover:bg-dts-secondary/5 hover:border-dts-secondary dark:bg-white/5 dark:hover:bg-white/10 text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xs font-bold text-dts-primary dark:text-white group-hover:text-dts-secondary transition-colors">
                    Exportar Facturas (Cabeceras)
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    Crea un registro consolidado por cada factura o abono. Incluye importes netos globales, impuestos y totales.
                  </span>
                </button>

                {/* Opción Líneas */}
                <button
                  onClick={exportLines}
                  disabled={isExporting}
                  className="flex flex-col items-start p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 hover:bg-dts-secondary/5 hover:border-dts-secondary dark:bg-white/5 dark:hover:bg-white/10 text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xs font-bold text-dts-primary dark:text-white group-hover:text-dts-secondary transition-colors">
                    Exportar Líneas de Facturas
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    Crea una fila detallada por cada artículo o cuenta contable facturada. Permite auditar descripciones y precios unitarios.
                  </span>
                </button>
              </div>

              {isExporting && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Loader2 className="animate-spin text-dts-secondary" size={16} />
                  <span className="text-xs text-dts-secondary font-semibold">Generando archivo Excel...</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end bg-gray-50/30 dark:bg-transparent">
              <button 
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
                className="px-4 py-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-card-dark text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
