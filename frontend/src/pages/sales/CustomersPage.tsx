import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery, keepPreviousData } from '@tanstack/react-query';
import { 
  getAllCustomers, 
  getCustomerSalespersons, 
  getCustomerFilterOptions, 
  getCustomerByClientId,
  CLIENT_TYPES, 
  type CustomerDataRow 
} from '../../api/customers';
import { formatCurrency, formatNumber } from '../../api/formatters';
import { 
  Search, Users, Euro, TrendingUp, UserPlus,
  ArrowUpDown, ChevronUp, ChevronDown, Filter, X, 
  SlidersHorizontal, RotateCcw, Loader2
} from 'lucide-react';
import { InfoPopover, KPISkeleton, TableSkeleton, ExportButton } from '../../components/ui';
import { CustomerDetailDrawer } from './components/CustomerDetailDrawer';
import { IberianGeoSalesMap, type GeoZone } from './components/IberianGeoSalesMap';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { exportToXlsx } from '../../utils/exportToXlsx';

// Normalizador de códigos de territorio a partir de provincia / país
const getTerritoryCode = (customer: CustomerDataRow): string => {
  const county = customer.county?.trim().toUpperCase() || '';
  const country = customer.country_reg_code?.trim().toUpperCase() || '';
  
  if (['BARCELONA', 'LÉRIDA', 'LERIDA', 'LLEIDA', 'GIRONA', 'GERONA', 'TARRAGONA', 'CATALUÑA', 'CATALUNYA'].includes(county)) return 'CAT';
  if (['MADRID'].includes(county)) return 'MAD';
  if (['VALENCIA', 'ALICANTE', 'CASTELLÓN', 'CASTELLON', 'COMUNIDAD VALENCIANA'].includes(county)) return 'VAL';
  if (['SEVILLA', 'MÁLAGA', 'MALAGA', 'CÁDIZ', 'CADIZ', 'CÓRDOBA', 'CORDOBA', 'GRANADA', 'HUELVA', 'JAÉN', 'JAEN', 'ALMERÍA', 'ALMERIA', 'ANDALUCÍA', 'ANDALUCIA'].includes(county)) return 'AND';
  if (['ZARAGOZA', 'HUESCA', 'TERUEL', 'ARAGÓN', 'ARAGON'].includes(county)) return 'ARA';
  if (['BIZKAIA', 'VIZCAYA', 'GIPUZKOA', 'GUIPUZCOA', 'ÁLAVA', 'ALAVA', 'PAÍS VASCO', 'PAIS VASCO', 'EUSKADI'].includes(county)) return 'PV';
  if (['NAVARRA'].includes(county)) return 'NAV';
  if (['A CORUÑA', 'CORUÑA', 'LUGO', 'OURENSE', 'PONTEVEDRA', 'GALICIA'].includes(county)) return 'GAL';
  if (['ASTURIAS'].includes(county)) return 'AST';
  if (['CANTABRIA'].includes(county)) return 'CAN';
  if (['BALEARES', 'ILLES BALEARS', 'PALMA'].includes(county)) return 'BAL';
  if (['LAS PALMAS', 'SANTA CRUZ DE TENERIFE', 'CANARIAS'].includes(county)) return 'CNR';
  if (['MURCIA'].includes(county)) return 'MUR';
  if (['BADAJOZ', 'CÁCERES', 'CACERES', 'EXTREMADURA'].includes(county)) return 'EXT';
  if (['TOLEDO', 'CIUDAD REAL', 'ALBACETE', 'CUENCA', 'GUADALAJARA', 'CASTILLA-LA MANCHA'].includes(county)) return 'CLM';
  if (['VALLADOLID', 'LEÓN', 'LEON', 'BURGOS', 'SALAMANCA', 'ZAMORA', 'PALENCIA', 'ÁVILA', 'AVILA', 'SEGOVIA', 'SORIA', 'CASTILLA Y LEÓN'].includes(county)) return 'CYL';
  if (['LA RIOJA'].includes(county)) return 'RIO';
  
  if (country && country !== 'ES') return country;
  return customer.county || customer.country_reg_code || '---';
};

interface VisibleColumnsState {
  sales_2023: boolean;
  sales_2024: boolean;
  sales_2025: boolean;
  sales_2026: boolean;
  total: boolean;
  margin: boolean;
  portes: boolean;
  paymentTerms: boolean;
  paymentDays: boolean;
  market: boolean;
  businessModel: boolean;
  territory: boolean;
  salesperson: boolean;
  clientType: boolean;
}

export const CustomersPage: React.FC = () => {
  const { profile } = useAuthStore();
  const isSalesRole = profile?.roles?.name?.toUpperCase() === 'VENTAS';

  const { setPageInfo } = useUIStore();
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [salespersonFilter, setSalespersonFilter] = useState<string>(isSalesRole ? profile?.code || '' : '');
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('');
  const [marketFilter, setMarketFilter] = useState<string>('');
  const [businessModelFilter, setBusinessModelFilter] = useState<string>('');
  const [territoryFilter, setTerritoryFilter] = useState<string>('');
  const [selectedGeoZone, setSelectedGeoZone] = useState<GeoZone | null>(null);
  const [paymentTermsFilter, setPaymentTermsFilter] = useState<string>('');
  const [shipmentMethodFilter, setShipmentMethodFilter] = useState<string>('');

  // Ordenación y paginación
  const [sortBy, setSortBy] = useState<string>('client_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  // Referencias optimizadas para scroll continuo de alto rendimiento
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLTableRowElement>(null);
  const pageSize = 40; // Buffer de precarga para desplazamiento instantáneo

  // Paneles y modales auxiliares
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);
  const marketDropdownRef = useRef<HTMLDivElement>(null);

  // Configuración de visibilidad de columnas (Mercado, Mod. Negocio y Territorio ocultos por defecto)
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumnsState>({
    sales_2023: true,
    sales_2024: true,
    sales_2025: true,
    sales_2026: true,
    total: true,
    margin: true,
    portes: true,
    paymentTerms: true,
    paymentDays: true,
    market: false,
    businessModel: false,
    territory: false,
    salesperson: true,
    clientType: true,
  });

  useEffect(() => {
    setPageInfo({
      title: 'Cartera de Clientes',
      subtitle: 'Análisis comercial, histórico de facturación y segmentación',
      icon: <Users size={20} className="text-dts-secondary" />,
      infoProps: {
        title: 'Cartera de Clientes',
        description: 'Directorio analítico de clientes con facturación multianual neta (2023-2026 YTD), márgenes y tipologías de relación con la marca.',
        objective: 'Analizar la evolución de compras de los clientes, detectar oportunidades de crecimiento y controlar condiciones comerciales.',
        source: 'Sincronizado con Dynamics Business Central (customers & value_entries).'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  // Cerrar dropdown de mercado al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (marketDropdownRef.current && !marketDropdownRef.current.contains(e.target as Node)) {
        setIsMarketDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Drawer states & URL Sync
  const [searchParams, setSearchParams] = useSearchParams();
  const urlClientId = searchParams.get('clientId');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDataRow | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Consulta de cliente directo si se accede o recarga con ?clientId=... en la URL
  const { data: directCustomer } = useQuery({
    queryKey: ['customerByCode', urlClientId],
    queryFn: () => getCustomerByClientId(urlClientId!),
    enabled: !!urlClientId,
    staleTime: 1000 * 60 * 5,
  });

  // Sync salesperson filter if profile loads late or changes
  useEffect(() => {
    if (isSalesRole && profile?.code) {
      setSalespersonFilter(profile.code);
    }
  }, [isSalesRole, profile?.code]);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Query principal de clientes con infinite scroll y persistencia de datos previos
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: [
      'customers', 
      debouncedSearch, 
      salespersonFilter, 
      clientTypeFilter,
      marketFilter,
      businessModelFilter,
      territoryFilter,
      selectedGeoZone?.id,
      paymentTermsFilter,
      shipmentMethodFilter,
      sortBy, 
      sortDir
    ],
    queryFn: ({ pageParam = 0 }) => getAllCustomers({ 
      take: pageSize, 
      skip: pageParam as number, 
      search: debouncedSearch,
      salesperson: salespersonFilter, 
      clientType: clientTypeFilter || undefined, 
      marketSegment: marketFilter || undefined,
      businessModel: businessModelFilter || undefined,
      territory: selectedGeoZone ? selectedGeoZone.name : (territoryFilter || undefined),
      paymentTerms: paymentTermsFilter || undefined,
      shipmentMethod: shipmentMethodFilter || undefined,
      sortBy, 
      sortDir
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextSkip = allPages.length * pageSize;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
    placeholderData: keepPreviousData,
  });

  // Opciones únicas de filtros
  const { data: salespersons = [] } = useQuery({ 
    queryKey: ['customerSalespersons'], 
    queryFn: getCustomerSalespersons 
  });

  const { data: filterOptions } = useQuery({
    queryKey: ['customerFilterOptions'],
    queryFn: getCustomerFilterOptions,
    staleTime: 1000 * 60 * 10
  });

  // Query optimizada para el mapa geográfico (mantiene en memoria la cartera completa para conmutación instantánea entre provincias)
  const { data: mapData, isLoading: isMapLoading } = useQuery({
    queryKey: [
      'customersGeoMap', 
      debouncedSearch, 
      salespersonFilter, 
      clientTypeFilter, 
      marketFilter, 
      businessModelFilter,
      territoryFilter
    ],
    queryFn: () => getAllCustomers({
      take: 600,
      skip: 0,
      search: debouncedSearch,
      salesperson: salespersonFilter,
      clientType: clientTypeFilter || undefined,
      marketSegment: marketFilter || undefined,
      businessModel: businessModelFilter || undefined,
      territory: territoryFilter || undefined,
      sortBy: 'total_sales',
      sortDir: 'desc'
    }),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });

  const mapCustomers = useMemo(() => {
    return (mapData?.data || []).filter(
      c => c.client_id !== '9999999' && c.client_id !== '99999999' && !c.client_id?.startsWith('999999')
    );
  }, [mapData]);

  // Observer optimizado: vinculado estrictamente al contenedor de la tabla con rootMargin anticipado
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      entries => { 
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage(); 
        }
      },
      { 
        root: container, 
        rootMargin: '250px', // Anticipa la carga 250px antes del final para scroll sin pausas
        threshold: 0.05 
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);

    return () => { 
      if (currentTarget) observer.unobserve(currentTarget);
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const { customers, totalCustomers, globalDebt, globalSales, newCustomersCount } = useMemo(() => {
    const allItems = (data?.pages.flatMap(page => page.data) || []).filter(
      c => c.client_id !== '9999999' && c.client_id !== '99999999' && !c.client_id?.startsWith('999999')
    );
    const totalCount = data?.pages[0]?.total || 0;
    const summary = data?.pages[0]?.summary || { totalDebt: 0, totalSales: 0, newCustomersCount: 0 };
    return { 
      customers: allItems, 
      totalCustomers: totalCount, 
      globalDebt: summary.totalDebt, 
      globalSales: summary.totalSales,
      newCustomersCount: summary.newCustomersCount
    };
  }, [data]);

  const handleSort = useCallback((field: string) => {
    setSortBy(prevField => {
      if (prevField === field) {
        setSortDir(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prevField;
      } else {
        setSortDir('asc');
        return field;
      }
    });
  }, []);

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown size={11} className="ml-1 opacity-20 group-hover:opacity-60 transition-opacity" />;
    return sortDir === 'asc' ? <ChevronUp size={11} className="ml-1 text-dts-secondary" /> : <ChevronDown size={11} className="ml-1 text-dts-secondary" />;
  };

  // Sincronizar apertura automática del drawer si existe ?clientId= en la URL
  useEffect(() => {
    if (urlClientId) {
      const found = customers.find(c => c.client_id === urlClientId);
      if (found) {
        setSelectedCustomer(found);
        setIsDrawerOpen(true);
      } else if (directCustomer) {
        setSelectedCustomer(directCustomer);
        setIsDrawerOpen(true);
      }
    } else {
      setIsDrawerOpen(false);
      setSelectedCustomer(null);
    }
  }, [urlClientId, customers, directCustomer]);

  const handleRowClick = useCallback((customer: CustomerDataRow) => {
    setSelectedCustomer(customer);
    setIsDrawerOpen(true);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('clientId', customer.client_id);
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedCustomer(null);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('clientId');
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  const hasActiveFilters = Boolean(
    searchTerm || 
    (salespersonFilter && !isSalesRole) || 
    clientTypeFilter || 
    marketFilter || 
    businessModelFilter || 
    territoryFilter || 
    selectedGeoZone ||
    paymentTermsFilter || 
    shipmentMethodFilter
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    if (!isSalesRole) setSalespersonFilter('');
    setClientTypeFilter('');
    setMarketFilter('');
    setBusinessModelFilter('');
    setTerritoryFilter('');
    setSelectedGeoZone(null);
    setPaymentTermsFilter('');
    setShipmentMethodFilter('');
  };

  const handleExport = async () => {
    const result = await getAllCustomers({
      take: 99999,
      skip: 0,
      search: debouncedSearch,
      salesperson: salespersonFilter,
      clientType: clientTypeFilter || undefined,
      marketSegment: marketFilter || undefined,
      businessModel: businessModelFilter || undefined,
      territory: selectedGeoZone ? selectedGeoZone.name : (territoryFilter || undefined),
      paymentTerms: paymentTermsFilter || undefined,
      shipmentMethod: shipmentMethodFilter || undefined,
      sortBy,
      sortDir,
    });

    const columns = [
      { key: 'client_id', label: 'Cód. Cliente' },
      { key: 'name', label: 'Nombre Cliente' },
      { key: 'sales_2023', label: '2023 (€)', format: (v: any) => Number(Number(v || 0).toFixed(2)) },
      { key: 'sales_2024', label: '2024 (€)', format: (v: any) => Number(Number(v || 0).toFixed(2)) },
      { key: 'sales_2025', label: '2025 (€)', format: (v: any) => Number(Number(v || 0).toFixed(2)) },
      { key: 'sales_2026_ytd', label: '2026 (YTD) (€)', format: (v: any) => Number(Number(v || 0).toFixed(2)) },
      { key: 'sales_total', label: 'Total (€)', format: (v: any) => Number(Number(v || 0).toFixed(2)) },
      { key: 'invoice_margin', label: '% Margen Fra.', format: (v: any) => v ? `${Number(v).toFixed(2)}%` : '0%' },
      { key: 'shipment_method_code', label: 'Portes' },
      { key: 'payment_terms_code', label: 'Términos Pago' },
      { key: 'payment_days_agreed', label: 'Días Pactados', format: (_: any, row: CustomerDataRow) => row.payment_days_agreed !== undefined ? `${row.payment_days_agreed}d` : '-' },
      { key: 'payment_days_delay', label: 'Días Demora Mora', format: (_: any, row: CustomerDataRow) => row.payment_days_delay ? `+${row.payment_days_delay}d` : '0d' },
      { key: 'payment_days_total', label: 'Días Reales Cobro', format: (_: any, row: CustomerDataRow) => row.payment_days_total !== undefined ? `${row.payment_days_total}d` : '-' },
      { key: 'market_segment', label: 'Mercado' },
      { key: 'business_model', label: 'Mod. Negocio' },
      { key: 'territory', label: 'Territorio', format: (_: any, row: CustomerDataRow) => getTerritoryCode(row) },
      { key: 'salesperson_code', label: 'Vendedor' },
      { key: 'client_type', label: 'Tipo Cliente', format: (v: any) => v && CLIENT_TYPES[v] ? `${v} - ${CLIENT_TYPES[v].name}` : 'Sin clasificar' },
      { key: 'balance_due_lcy', label: 'Saldo Deuda (€)', format: (v: any) => Number(Number(v || 0).toFixed(2)) },
      { key: 'city', label: 'Ciudad' },
    ];

    const exportData = (result.data || []).filter(
      (c: CustomerDataRow) => c.client_id !== '9999999' && c.client_id !== '99999999' && !c.client_id?.startsWith('999999')
    );

    exportToXlsx(exportData, columns, 'cartera_clientes_dts');
  };

  if (isLoading && !data) return (
    <div className="space-y-6 pb-10">
      <div className="h-28 bg-white dark:bg-surface-card-dark rounded-2xl animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><KPISkeleton /><KPISkeleton /><KPISkeleton /><KPISkeleton /></div>
      <div className="bg-white dark:bg-surface-card-dark rounded-xl h-[500px]"><TableSkeleton rows={15} columns={10} /></div>
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-10">
      <CustomerDetailDrawer 
        isOpen={isDrawerOpen} 
        onClose={handleCloseDrawer} 
        customer={selectedCustomer} 
      />

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Clientes" 
          value={totalCustomers} 
          type="number" 
          icon={Users} 
          isLoading={isLoading} 
          infoProps={{
            description: "Número total de clientes que coinciden con los filtros seleccionados."
          }}
        />
        <KPICard 
          title="Clientes Nuevos" 
          value={newCustomersCount} 
          type="number" 
          icon={UserPlus} 
          isLoading={isLoading} 
          status="success"
          infoProps={{
            description: "Clientes dados de alta en el ejercicio actual."
          }}
        />
        <KPICard 
          title="Deuda Total" 
          value={globalDebt} 
          type="currency" 
          icon={Euro} 
          status={globalDebt > 0 ? 'danger' : 'success'} 
          isLoading={isLoading} 
          infoProps={{
            description: "Sumatorio del saldo pendiente de cobro de los clientes filtrados.",
            formulas: "Saldo LCY"
          }}
        />
        <KPICard 
          title="Ventas 2026 (YTD)" 
          value={globalSales} 
          type="currency" 
          icon={TrendingUp} 
          isLoading={isLoading} 
          infoProps={{
            description: "Total de facturación acumulada del año en curso para los clientes seleccionados."
          }}
        />
      </div>

      {/* MAPA GEOGRÁFICO DE VENTAS */}
      <IberianGeoSalesMap 
        customers={mapCustomers} 
        onSelectCustomer={handleRowClick} 
        isLoading={isMapLoading} 
        selectedZone={selectedGeoZone}
        onSelectZone={setSelectedGeoZone}
      />

      {/* CONTENEDOR PRINCIPAL DE TABLA Y FILTROS */}
      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
        
        {/* BARRA DE FILTROS PRINCIPAL */}
        <div className="p-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-transparent space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            
            {/* Buscador de texto y chip de zona activa */}
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="w-full lg:w-80 relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Search className="h-4 w-4" />
                </div>
                <input 
                  type="text" 
                  className="block w-full pl-9 pr-8 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dts-secondary/50 sm:text-xs font-medium" 
                  placeholder="Buscar por código, nombre, ciudad..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Tag de Zona Geográfica Seleccionada en el Mapa */}
              {selectedGeoZone && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-dts-secondary/15 text-dts-secondary border border-dts-secondary/30 shadow-xs shrink-0 animate-in fade-in zoom-in-95 duration-150">
                  <span>🗺️ {selectedGeoZone.name}</span>
                  <button 
                    onClick={() => setSelectedGeoZone(null)} 
                    className="hover:text-red-500 ml-0.5 font-black transition-colors"
                    title="Quitar filtro de zona geográfica"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Selectores de Filtro Principales */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Filtro Tipo Cliente */}
              <select 
                value={clientTypeFilter} 
                onChange={(e) => setClientTypeFilter(e.target.value)} 
                className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark rounded-lg px-2.5 py-1.5 outline-none font-semibold text-gray-700 dark:text-gray-200 cursor-pointer focus:ring-1 focus:ring-dts-secondary"
              >
                <option value="">Tipo Cliente (Todos)</option>
                {Object.values(CLIENT_TYPES).map(t => (
                  <option key={t.code} value={t.code}>{t.code} - {t.name}</option>
                ))}
              </select>

              {/* Filtro Vendedor */}
              {!isSalesRole && (
                <select 
                  value={salespersonFilter} 
                  onChange={(e) => setSalespersonFilter(e.target.value)} 
                  className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark rounded-lg px-2.5 py-1.5 outline-none font-semibold text-gray-700 dark:text-gray-200 cursor-pointer focus:ring-1 focus:ring-dts-secondary"
                >
                  <option value="">Vendedor (Todos)</option>
                  {salespersons.map(sp => (
                    <option key={sp.code} value={sp.code}>{sp.code} - {sp.name}</option>
                  ))}
                </select>
              )}

              {/* Filtro Mercado (Lista desplegable con scroll de 5 opciones visibles) */}
              <div ref={marketDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsMarketDropdownOpen(!isMarketDropdownOpen)}
                  className={`inline-flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer bg-white dark:bg-dts-primary-dark ${
                    marketFilter 
                      ? 'border-dts-secondary text-dts-secondary' 
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="truncate max-w-[130px]">{marketFilter ? `Mercado: ${marketFilter}` : 'Mercado (Todos)'}</span>
                  <ChevronDown size={13} className={`text-gray-400 transition-transform ${isMarketDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMarketDropdownOpen && (
                  <div className="absolute left-0 mt-1.5 w-48 bg-white dark:bg-surface-card-dark rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="max-h-[165px] overflow-y-auto custom-scrollbar space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setMarketFilter('');
                          setIsMarketDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md font-semibold transition-colors flex items-center justify-between ${
                          marketFilter === '' 
                            ? 'bg-dts-secondary/10 text-dts-secondary font-bold' 
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <span>Mercado (Todos)</span>
                        {marketFilter === '' && <span className="w-1.5 h-1.5 rounded-full bg-dts-secondary"></span>}
                      </button>

                      {filterOptions?.marketSegments?.map((m: string) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setMarketFilter(m);
                            setIsMarketDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md font-semibold transition-colors flex items-center justify-between ${
                            marketFilter === m 
                              ? 'bg-dts-secondary/10 text-dts-secondary font-bold' 
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
                          }`}
                        >
                          <span className="truncate">{m}</span>
                          {marketFilter === m && <span className="w-1.5 h-1.5 rounded-full bg-dts-secondary shrink-0 ml-1"></span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Filtro Modelo de Negocio */}
              <select 
                value={businessModelFilter} 
                onChange={(e) => setBusinessModelFilter(e.target.value)} 
                className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark rounded-lg px-2.5 py-1.5 outline-none font-semibold text-gray-700 dark:text-gray-200 cursor-pointer focus:ring-1 focus:ring-dts-secondary"
              >
                <option value="">Mod. Negocio (Todos)</option>
                {filterOptions?.businessModels?.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* Botón Filtros Avanzados */}
              <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  showAdvancedFilters || territoryFilter || paymentTermsFilter || shipmentMethodFilter
                    ? 'bg-dts-secondary/10 border-dts-secondary text-dts-secondary dark:text-dts-secondary' 
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300'
                }`}
                title="Filtros secundarios"
              >
                <Filter size={13} />
                <span>Más Filtros</span>
              </button>

              {/* Botón Configurar Columnas */}
              <div className="relative">
                <button 
                  onClick={() => setShowColumnConfig(!showColumnConfig)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    showColumnConfig
                      ? 'bg-dts-primary text-white border-dts-primary' 
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300'
                  }`}
                  title="Mostrar / ocultar columnas"
                >
                  <SlidersHorizontal size={13} />
                  <span>Columnas</span>
                </button>

                {/* Popover de configuración de columnas */}
                {showColumnConfig && (
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-surface-card-dark rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-50 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">Visibilidad</span>
                      <button 
                        onClick={() => setShowColumnConfig(false)}
                        className="text-gray-400 hover:text-gray-600 text-xs"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    
                    <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar text-xs">
                      {[
                        { key: 'sales_2023', label: 'Ventas 2023' },
                        { key: 'sales_2024', label: 'Ventas 2024' },
                        { key: 'sales_2025', label: 'Ventas 2025' },
                        { key: 'sales_2026', label: 'Ventas 2026 (YTD)' },
                        { key: 'total', label: 'Total Acumulado' },
                        { key: 'margin', label: '% Margen Fra.' },
                        { key: 'portes', label: 'Portes' },
                        { key: 'paymentTerms', label: 'Términos Pago' },
                        { key: 'paymentDays', label: 'Días Cobro' },
                        { key: 'market', label: 'Mercado' },
                        { key: 'businessModel', label: 'Mod. Negocio' },
                        { key: 'territory', label: 'Territorio' },
                        { key: 'salesperson', label: 'Vendedor' },
                        { key: 'clientType', label: 'Tipo Cliente' },
                      ].map(col => (
                        <label 
                          key={col.key} 
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                        >
                          <input 
                            type="checkbox" 
                            checked={(visibleColumns as any)[col.key]} 
                            onChange={(e) => setVisibleColumns({ ...visibleColumns, [col.key]: e.target.checked })}
                            className="rounded text-dts-secondary focus:ring-dts-secondary h-3.5 w-3.5"
                          />
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Botón Reset de Filtros */}
              {hasActiveFilters && (
                <button 
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors border border-rose-200 dark:border-rose-800"
                  title="Restablecer todos los filtros"
                >
                  <RotateCcw size={12} />
                  <span>Limpiar</span>
                </button>
              )}

              {/* Botón Exportar */}
              <ExportButton onExport={handleExport} />
            </div>
          </div>

          {/* FILTROS AVANZADOS (COLAPSABLES) */}
          {showAdvancedFilters && (
            <div className="pt-2.5 border-t border-gray-200/60 dark:border-gray-800 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              
              {/* Filtro Territorio */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Territorio:</span>
                <select 
                  value={territoryFilter} 
                  onChange={(e) => setTerritoryFilter(e.target.value)} 
                  className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark rounded-lg px-2 py-1 outline-none font-semibold text-gray-700 dark:text-gray-200"
                >
                  <option value="">Todos</option>
                  {filterOptions?.territories?.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Términos de Pago */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Términos Pago:</span>
                <select 
                  value={paymentTermsFilter} 
                  onChange={(e) => setPaymentTermsFilter(e.target.value)} 
                  className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark rounded-lg px-2 py-1 outline-none font-semibold text-gray-700 dark:text-gray-200"
                >
                  <option value="">Todos</option>
                  {filterOptions?.paymentTerms?.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Portes */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Portes:</span>
                <select 
                  value={shipmentMethodFilter} 
                  onChange={(e) => setShipmentMethodFilter(e.target.value)} 
                  className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark rounded-lg px-2 py-1 outline-none font-semibold text-gray-700 dark:text-gray-200"
                >
                  <option value="">Todos</option>
                  {filterOptions?.shipmentMethods?.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* TABLA PRINCIPAL DE DATOS CON SCROLL Y ALTURA AJUSTADA PARA 20 FILAS */}
        <div ref={tableContainerRef} className="flex-1 overflow-auto custom-scrollbar max-h-[735px] will-change-scroll">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-[#003E51] text-white sticky top-0 z-20 shadow-xs select-none">
              <tr>
                {/* Código de Cliente (Sticky Left) */}
                <th 
                  onClick={() => handleSort('client_id')} 
                  className="px-3.5 py-3 font-bold uppercase tracking-wider text-[10.5px] cursor-pointer group hover:bg-white/10 transition-colors sticky left-0 z-30 bg-[#003E51] whitespace-nowrap"
                >
                  <div className="flex items-center justify-start">
                    <span>Cód. Cliente</span>
                    {getSortIcon('client_id')}
                  </div>
                </th>

                {/* Nombre de Cliente */}
                <th 
                  onClick={() => handleSort('name')} 
                  className="px-3.5 py-3 font-bold uppercase tracking-wider text-[10.5px] cursor-pointer group hover:bg-white/10 transition-colors min-w-[200px]"
                >
                  <div className="flex items-center justify-start">
                    <span>Nombre Cliente</span>
                    {getSortIcon('name')}
                  </div>
                </th>

                {/* 2023 */}
                {visibleColumns.sales_2023 && (
                  <th 
                    onClick={() => handleSort('sales_2023')} 
                    className="px-2.5 py-3 font-bold uppercase tracking-wider text-[10.5px] text-right cursor-pointer group hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end">
                      <span>2023</span>
                      {getSortIcon('sales_2023')}
                    </div>
                  </th>
                )}

                {/* 2024 */}
                {visibleColumns.sales_2024 && (
                  <th 
                    onClick={() => handleSort('sales_2024')} 
                    className="px-2.5 py-3 font-bold uppercase tracking-wider text-[10.5px] text-right cursor-pointer group hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end">
                      <span>2024</span>
                      {getSortIcon('sales_2024')}
                    </div>
                  </th>
                )}

                {/* 2025 */}
                {visibleColumns.sales_2025 && (
                  <th 
                    onClick={() => handleSort('sales_2025')} 
                    className="px-2.5 py-3 font-bold uppercase tracking-wider text-[10.5px] text-right cursor-pointer group hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end">
                      <span>2025</span>
                      {getSortIcon('sales_2025')}
                    </div>
                  </th>
                )}

                {/* 2026 (YTD) */}
                {visibleColumns.sales_2026 && (
                  <th 
                    onClick={() => handleSort('total_sales')} 
                    className="px-3 py-3 font-bold uppercase tracking-wider text-[10.5px] text-right cursor-pointer group hover:bg-white/10 transition-colors bg-[#002f3d] whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end">
                      <span className="text-[#00B0B9] font-black">2026 (YTD)</span>
                      {getSortIcon('total_sales')}
                    </div>
                  </th>
                )}

                {/* Total */}
                {visibleColumns.total && (
                  <th 
                    onClick={() => handleSort('sales_total')} 
                    className="px-3.5 py-3 font-black uppercase tracking-wider text-[10.5px] text-right cursor-pointer group hover:bg-white/10 transition-colors bg-[#002530] whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end">
                      <span>Total</span>
                      {getSortIcon('sales_total')}
                    </div>
                  </th>
                )}

                {/* % Margen Fra. */}
                {visibleColumns.margin && (
                  <th 
                    onClick={() => handleSort('invoice_margin')} 
                    className="px-2.5 py-3 font-bold uppercase tracking-wider text-[10.5px] text-right cursor-pointer group hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end">
                      <span>% Margen</span>
                      {getSortIcon('invoice_margin')}
                    </div>
                  </th>
                )}

                {/* Portes */}
                {visibleColumns.portes && (
                  <th 
                    onClick={() => handleSort('shipment_method_code')} 
                    className="px-2 py-3 font-bold uppercase tracking-wider text-[10.5px] text-center cursor-pointer group hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center">
                      <span>Portes</span>
                      {getSortIcon('shipment_method_code')}
                    </div>
                  </th>
                )}

                {/* Términos Pago */}
                {visibleColumns.paymentTerms && (
                  <th 
                    onClick={() => handleSort('payment_terms_code')} 
                    className="px-2.5 py-3 font-bold uppercase tracking-wider text-[10.5px] cursor-pointer group hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-start">
                      <span>Términos Pago</span>
                      {getSortIcon('payment_terms_code')}
                    </div>
                  </th>
                )}

                {/* Días Cobro */}
                {visibleColumns.paymentDays && (
                  <th 
                    onClick={() => handleSort('payment_terms_code')} 
                    className="px-2.5 py-3 font-bold uppercase tracking-wider text-[10.5px] text-right cursor-pointer group hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end">
                      <span>Días Cobro</span>
                      {getSortIcon('payment_terms_code')}
                    </div>
                  </th>
                )}

                {/* Mercado */}
                {visibleColumns.market && (
                  <th 
                    onClick={() => handleSort('market_segment')} 
                    className="px-2.5 py-3 font-bold uppercase tracking-wider text-[10.5px] text-center cursor-pointer group hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center">
                      <span>Mercado</span>
                      {getSortIcon('market_segment')}
                    </div>
                  </th>
                )}

                {/* Mod. Negocio */}
                {visibleColumns.businessModel && (
                  <th 
                    onClick={() => handleSort('business_model')} 
                    className="px-2.5 py-3 font-bold uppercase tracking-wider text-[10.5px] text-center cursor-pointer group hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center">
                      <span>Mod. Negocio</span>
                      {getSortIcon('business_model')}
                    </div>
                  </th>
                )}

                {/* Territorio */}
                {visibleColumns.territory && (
                  <th 
                    onClick={() => handleSort('county')} 
                    className="px-2 py-3 font-bold uppercase tracking-wider text-[10.5px] text-center cursor-pointer group hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center">
                      <span>Territorio</span>
                      {getSortIcon('county')}
                    </div>
                  </th>
                )}

                {/* Vendedor */}
                {visibleColumns.salesperson && (
                  <th 
                    onClick={() => handleSort('salesperson_code')} 
                    className="px-2 py-3 font-bold uppercase tracking-wider text-[10.5px] text-center cursor-pointer group hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center">
                      <span>Vendedor</span>
                      {getSortIcon('salesperson_code')}
                    </div>
                  </th>
                )}

                {/* Tipo Cliente */}
                {visibleColumns.clientType && (
                  <th 
                    onClick={() => handleSort('client_type')} 
                    className="px-2.5 py-3 font-bold uppercase tracking-wider text-[10.5px] text-center cursor-pointer group hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center">
                      <span>Tipo</span>
                      {getSortIcon('client_type')}
                    </div>
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-surface-card-dark">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-16 text-center text-gray-400 italic text-sm">
                    No se encontraron clientes bajo los filtros activos.
                  </td>
                </tr>
              ) : (
                customers.map(customer => (
                  <CustomerTableRow
                    key={customer.id}
                    customer={customer}
                    visibleColumns={visibleColumns}
                    onRowClick={handleRowClick}
                  />
                ))
              )}
              
              {/* Trigger para infinite scroll */}
              <tr ref={observerTarget}>
                <td colSpan={15} className="py-5 text-center text-gray-400 text-xs font-medium">
                  {isFetchingNextPage ? (
                    <div className="flex items-center justify-center gap-2 text-dts-secondary font-semibold">
                      <Loader2 size={15} className="animate-spin" />
                      <span>Cargando más clientes...</span>
                    </div>
                  ) : hasNextPage ? (
                    <span className="text-gray-400/80">Desplaza para cargar más</span>
                  ) : (
                    <span className="text-gray-400/60 font-mono text-[11px]">— Fin de clientes listados —</span>
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

// Componente de Fila Memoizado para evitar renders redundantes durante el desplazamiento
interface CustomerTableRowProps {
  customer: CustomerDataRow;
  visibleColumns: VisibleColumnsState;
  onRowClick: (customer: CustomerDataRow) => void;
}

const CustomerTableRow = React.memo<CustomerTableRowProps>(({
  customer,
  visibleColumns,
  onRowClick
}) => {
  const isNew = customer.created_at && new Date(customer.created_at).getFullYear() === new Date().getFullYear();
  const typeDef = customer.client_type ? CLIENT_TYPES[customer.client_type] : null;
  const territoryCode = getTerritoryCode(customer);

  const sales2023 = customer.sales_2023 || 0;
  const sales2024 = customer.sales_2024 || 0;
  const sales2025 = customer.sales_2025 || 0;
  const sales2026 = customer.sales_2026_ytd || Number(customer.total_sales) || 0;
  const salesTotal = customer.sales_total || (sales2023 + sales2024 + sales2025 + sales2026);
  const marginPct = Number(customer.invoice_margin || 0);

  return (
    <tr 
      onClick={() => onRowClick(customer)}
      className={`cursor-pointer group ${
        isNew 
          ? 'bg-emerald-50/40 dark:bg-emerald-500/5 hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10' 
          : 'hover:bg-gray-50/80 dark:hover:bg-white/5'
      }`}
    >
      {/* Cód. Cliente (Sticky) */}
      <td className="px-3.5 py-2.5 font-bold font-mono text-xs text-dts-primary dark:text-dts-secondary sticky left-0 z-10 bg-white dark:bg-surface-card-dark group-hover:bg-gray-50/80 dark:group-hover:bg-[#1a2e3b] whitespace-nowrap">
        {customer.client_id}
      </td>

      {/* Nombre Cliente */}
      <td className="px-3.5 py-2.5 font-semibold text-xs text-gray-800 dark:text-gray-100">
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[220px]" title={customer.name}>
            {customer.name}
          </span>
          {isNew && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 uppercase">
              Nuevo
            </span>
          )}
        </div>
      </td>

      {/* 2023 */}
      {visibleColumns.sales_2023 && (
        <td className="px-2.5 py-2.5 text-right font-mono text-xs text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
          {sales2023 > 0 ? formatCurrency(sales2023, 2) : <span className="text-gray-300 dark:text-gray-600">- €</span>}
        </td>
      )}

      {/* 2024 */}
      {visibleColumns.sales_2024 && (
        <td className="px-2.5 py-2.5 text-right font-mono text-xs text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
          {sales2024 > 0 ? formatCurrency(sales2024, 2) : <span className="text-gray-300 dark:text-gray-600">- €</span>}
        </td>
      )}

      {/* 2025 */}
      {visibleColumns.sales_2025 && (
        <td className="px-2.5 py-2.5 text-right font-mono text-xs text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
          {sales2025 > 0 ? formatCurrency(sales2025, 2) : <span className="text-gray-300 dark:text-gray-600">- €</span>}
        </td>
      )}

      {/* 2026 (YTD) */}
      {visibleColumns.sales_2026 && (
        <td className="px-3 py-2.5 text-right font-mono text-xs font-bold text-dts-primary dark:text-[#00B0B9] bg-cyan-50/20 dark:bg-cyan-950/10 whitespace-nowrap">
          {sales2026 > 0 ? formatCurrency(sales2026, 2) : <span className="text-gray-300 dark:text-gray-600">- €</span>}
        </td>
      )}

      {/* Total Acumulado */}
      {visibleColumns.total && (
        <td className="px-3.5 py-2.5 text-right font-mono text-xs font-black text-dts-primary dark:text-white bg-gray-50/60 dark:bg-white/5 whitespace-nowrap">
          {salesTotal > 0 ? formatCurrency(salesTotal, 2) : <span className="text-gray-300 dark:text-gray-600">- €</span>}
        </td>
      )}

      {/* % Margen Fra. */}
      {visibleColumns.margin && (
        <td className="px-2.5 py-2.5 text-right font-mono text-xs font-semibold whitespace-nowrap">
          {marginPct > 0 ? (
            <span className={marginPct >= 40 ? 'text-emerald-600 dark:text-emerald-400' : marginPct >= 25 ? 'text-cyan-700 dark:text-cyan-300' : 'text-amber-600 dark:text-amber-400'}>
              {marginPct.toFixed(2)}%
            </span>
          ) : (
            <span className="text-gray-300 dark:text-gray-600">-</span>
          )}
        </td>
      )}

      {/* Portes */}
      {visibleColumns.portes && (
        <td className="px-2 py-2.5 text-center whitespace-nowrap">
          {customer.shipment_method_code ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-mono">
              {customer.shipment_method_code}
            </span>
          ) : (
            <span className="text-[10px] text-gray-300 dark:text-gray-600">-</span>
          )}
        </td>
      )}

      {/* Términos Pago */}
      {visibleColumns.paymentTerms && (
        <td className="px-2.5 py-2.5 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap font-medium">
          {customer.payment_terms_code || <span className="text-gray-300 dark:text-gray-600">-</span>}
        </td>
      )}

      {/* Días Cobro (Opción 3: Días Pactados + Demora Real por Mora) */}
      {visibleColumns.paymentDays && (
        <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
          {customer.payment_days_total !== undefined ? (
            customer.payment_days_delay && customer.payment_days_delay > 0 ? (
              <div className="inline-flex items-center justify-end gap-1 font-mono text-xs">
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {customer.payment_days_total}d
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-500/30">
                  +{customer.payment_days_delay}d mora
                </span>
              </div>
            ) : (
              <span className="font-mono text-xs text-gray-700 dark:text-gray-300 font-medium">
                {customer.payment_days_agreed === 0 ? 'Contado (0d)' : `${customer.payment_days_agreed}d`}
              </span>
            )
          ) : (
            <span className="text-[10px] text-gray-300 dark:text-gray-600">-</span>
          )}
        </td>
      )}

      {/* Mercado */}
      {visibleColumns.market && (
        <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
          {customer.market_segment ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
              {customer.market_segment}
            </span>
          ) : (
            <span className="text-[10px] text-gray-300 dark:text-gray-600">-</span>
          )}
        </td>
      )}

      {/* Mod. Negocio */}
      {visibleColumns.businessModel && (
        <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
          {customer.business_model ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
              {customer.business_model}
            </span>
          ) : (
            <span className="text-[10px] text-gray-300 dark:text-gray-600">-</span>
          )}
        </td>
      )}

      {/* Territorio */}
      {visibleColumns.territory && (
        <td className="px-2 py-2.5 text-center whitespace-nowrap">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            {territoryCode}
          </span>
        </td>
      )}

      {/* Vendedor */}
      {visibleColumns.salesperson && (
        <td className="px-2 py-2.5 text-center whitespace-nowrap">
          {customer.salesperson_code ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200">
              {customer.salesperson_code}
            </span>
          ) : (
            <span className="text-[10px] text-gray-300 dark:text-gray-600">-</span>
          )}
        </td>
      )}

      {/* Tipo Cliente */}
      {visibleColumns.clientType && (
        <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
          {typeDef ? (
            <span 
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${typeDef.badgeBg} ${typeDef.badgeColor} ${typeDef.badgeBorder}`}
              title={`${typeDef.name}: ${typeDef.description}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${typeDef.dotColor}`}></span>
              {typeDef.code}
            </span>
          ) : (
            <span className="text-[10px] text-gray-300 dark:text-gray-600 italic">---</span>
          )}
        </td>
      )}
    </tr>
  );
});

const KPICard = ({ title, value, type = 'number', icon: Icon, isLoading, status, infoProps }: any) => {
  if (isLoading) return <div className="bg-white dark:bg-surface-card-dark p-4 rounded-xl border border-gray-100 dark:border-gray-800 h-24 animate-pulse"></div>;
  const colorClass = status === 'success' ? 'text-emerald-500' : status === 'danger' ? 'text-red-500' : 'text-dts-primary dark:text-white';
  const formattedValue = type === 'currency' ? formatCurrency(value, 0) : formatNumber(value, 0);
  return (
    <div className="bg-white dark:bg-surface-card-dark p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-card-hover group">
      <div className="flex justify-between items-start mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{title}</span>
          {infoProps && (
            <InfoPopover 
              title={title} 
              description={infoProps.description} 
              formulas={infoProps.formulas} 
              iconSize={12}
              className="text-gray-300 group-hover:text-dts-secondary transition-colors"
            />
          )}
        </div>
        <Icon size={16} className="text-gray-400 group-hover:text-dts-secondary transition-colors" />
      </div>
      <div className={`text-xl font-black font-mono ${colorClass}`}>{formattedValue}</div>
    </div>
  );
};
