import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery, useQuery, keepPreviousData } from '@tanstack/react-query';
import { getAllVendors, getVendorsMapData, type VendorDataRow } from '../../api/vendors';
import { formatCurrency, formatNumber } from '../../api/formatters';
import {
  Search, Building2, Wallet, AlertTriangle, ShieldAlert,
  ArrowUpDown, ChevronUp, ChevronDown, Loader2, MapPin,
  TrendingUp, Calendar, Map, X
} from 'lucide-react';
import { InfoPopover, KPISkeleton, TableSkeleton, ExportButton } from '../../components/ui';
import { VendorDetailDrawer } from './components/VendorDetailDrawer';
import { WorldGeoVendorsMap, type GeoZone } from './components/WorldGeoVendorsMap';
import { useUIStore } from '../../store/uiStore';
import { exportToXlsx } from '../../utils/exportToXlsx';

export const VendorsPage: React.FC = () => {
  const { setPageInfo } = useUIStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [blockedFilter, setBlockedFilter] = useState<boolean | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [selectedGeoZone, setSelectedGeoZone] = useState<GeoZone | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const [sortBy, setSortBy] = useState<string>('purchase_volume');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const observerTarget = useRef<HTMLTableRowElement>(null);
  const pageSize = 50;

  useEffect(() => {
    setPageInfo({
      title: 'Cartera de Proveedores',
      subtitle: 'Gestión de compras, condiciones de pago y análisis de acreedores',
      icon: <Building2 size={20} />,
      infoProps: {
        title: 'Cartera de Proveedores',
        description: 'Listado completo de proveedores con volumen de compra real, estado financiero, condiciones comerciales y mapa geoespacial interactivo.',
        objective: 'Optimizar la gestión de compras, diversificación y control de saldos de acreedores.',
        source: 'Sincronizado con Dynamics 365 Business Central / Navision.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  // Drawer states
  const [selectedVendor, setSelectedVendor] = useState<VendorDataRow | null>(null);
  const [selectedVendorCode, setSelectedVendorCode] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Carga de puntos para el mapa de proveedores
  const { data: mapVendors = [], isLoading: isMapLoading } = useQuery({
    queryKey: ['vendorsMapData', selectedYear],
    queryFn: () => getVendorsMapData(selectedYear),
    staleTime: 5 * 60 * 1000,
  });

  // Query principal paginada con infinite scroll
  const territoryParam = selectedGeoZone
    ? (selectedGeoZone.id === 'INTL' ? 'INTL' : (selectedGeoZone.country || selectedGeoZone.id || selectedGeoZone.name))
    : undefined;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching } = useInfiniteQuery({
    queryKey: ['vendors', debouncedSearch, blockedFilter, selectedYear, territoryParam, sortBy, sortDir],
    queryFn: ({ pageParam = 0 }) => getAllVendors({
      take: pageSize,
      skip: pageParam as number,
      search: debouncedSearch,
      blocked: blockedFilter,
      year: selectedYear,
      territory: territoryParam,
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

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const { vendors, totalVendors, globalBalance, globalBalanceDue, globalPurchases, blockedCount } = useMemo(() => {
    const allItems = data?.pages.flatMap(page => page.data) || [];
    const totalCount = data?.pages[0]?.total || 0;
    const summary = data?.pages[0]?.summary || { totalBalance: 0, totalBalanceDue: 0, totalPurchases: 0, blockedCount: 0 };
    return {
      vendors: allItems,
      totalVendors: totalCount,
      globalBalance: summary.totalBalance,
      globalBalanceDue: summary.totalBalanceDue,
      globalPurchases: summary.totalPurchases || 0,
      blockedCount: summary.blockedCount,
    };
  }, [data]);

  const handleSort = (field: string) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir(field === 'purchase_volume' ? 'desc' : 'asc'); }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="ml-1 opacity-20" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="ml-1 text-dts-secondary" /> : <ChevronDown size={12} className="ml-1 text-dts-secondary" />;
  };

  const handleRowClick = (vendor: VendorDataRow) => {
    setSelectedVendor(vendor);
    setSelectedVendorCode(vendor.vendor_id);
    setIsDrawerOpen(true);
  };

  const handleMapSelectVendor = (vendor: VendorDataRow) => {
    setSelectedVendor(vendor);
    setSelectedVendorCode(vendor.vendor_id);
    setIsDrawerOpen(true);
  };

  const handleExport = async () => {
    const result = await getAllVendors({
      take: 99999,
      skip: 0,
      search: debouncedSearch,
      blocked: blockedFilter,
      year: selectedYear,
      territory: territoryParam,
      sortBy,
      sortDir,
    });

    const columns = [
      { key: 'vendor_id', label: 'Código' },
      { key: 'name', label: 'Proveedor' },
      { key: 'abc_class', label: 'Clasificación ABC' },
      { key: 'vat_no', label: 'NIF/CIF' },
      { key: 'city', label: 'Ciudad' },
      { key: 'county', label: 'Provincia' },
      { key: 'country_reg_code', label: 'País' },
      { key: 'phone_no', label: 'Teléfono' },
      { key: 'contact', label: 'Contacto' },
      { key: 'payment_terms_code', label: 'Términos Pago' },
      { key: 'payment_method_code', label: 'Forma Pago' },
      {
        key: 'purchase_volume',
        label: selectedYear ? `Volumen Compra ${selectedYear} (€)` : 'Volumen Compra Histórico (€)',
        format: (v: any) => Number(Number(v || 0).toFixed(2))
      },
      { key: 'balance_lcy', label: 'Saldo Pendiente (€)', format: (v: any) => Number(Number(v || 0).toFixed(2)) },
      { key: 'balance_due_lcy', label: 'Saldo Vencido (€)', format: (v: any) => Number(Number(v || 0).toFixed(2)) },
      { key: 'payments_lcy', label: 'Pagos Acumulados (€)', format: (v: any) => Number(Number(v || 0).toFixed(2)) },
      { key: 'blocked', label: 'Bloqueado' },
    ];

    const filename = selectedYear ? `proveedores_compras_${selectedYear}` : 'cartera_proveedores_completa';
    exportToXlsx(result.data, columns, filename);
  };

  if (isLoading && !data) return (
    <div className="space-y-8 pb-10">
      <div className="h-28 bg-white dark:bg-surface-card-dark rounded-2xl animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6"><KPISkeleton /><KPISkeleton /><KPISkeleton /><KPISkeleton /></div>
      <div className="bg-white dark:bg-surface-card-dark rounded-xl h-125"><TableSkeleton rows={15} columns={6} /></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <VendorDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedVendor(null);
          setSelectedVendorCode(null);
        }}
        vendor={selectedVendor}
        vendorCode={selectedVendorCode}
      />

      {/* TARJETAS DE KPIS SUPERIORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={selectedYear ? `Volumen Compras ${selectedYear}` : 'Volumen Total Compras'}
          value={globalPurchases}
          type="currency"
          icon={TrendingUp}
          isLoading={isLoading}
          infoProps={{
            description: selectedYear
              ? `Importe neto facturado en compras durante el ejercicio ${selectedYear} (facturas menos abonos).`
              : "Importe histórico total facturado en compras a proveedores registrados.",
            formulas: "Suma de Value Entries (Purchase Invoice - Purchase Credit Memo)"
          }}
        />
        <KPICard
          title="Saldo Pendiente Total"
          value={globalBalance}
          type="currency"
          icon={Wallet}
          isLoading={isLoading}
          infoProps={{
            description: "Sumatorio del saldo pendiente de pago acumulado a proveedores.",
            formulas: "Balance LCY"
          }}
        />
        <KPICard
          title="Saldo Vencido Total"
          value={globalBalanceDue}
          type="currency"
          icon={AlertTriangle}
          status={globalBalanceDue > 0 ? 'danger' : 'success'}
          isLoading={isLoading}
          infoProps={{
            description: "Suma de los saldos pendientes con fecha de pago ya vencida.",
            formulas: "Balance Due LCY"
          }}
        />
        <KPICard
          title="Proveedores en Cartera"
          value={totalVendors}
          type="number"
          icon={Building2}
          isLoading={isLoading}
          infoProps={{
            description: `Número total de proveedores bajo los filtros actuales (${blockedCount} con compras bloqueadas).`
          }}
        />
      </div>

      {/* CABECERA Y MAPA GEOESPACIAL DE PROVEEDORES */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Map size={15} className="text-[#00B0B9]" />
              Mapa de Distribución Global de Proveedores
            </span>

            {selectedYear && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#003E51]/10 dark:bg-[#00B0B9]/20 text-[#003E51] dark:text-[#00B0B9] font-bold">
                Año {selectedYear}
              </span>
            )}
            {selectedGeoZone && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#00B0B9] text-white font-bold flex items-center gap-1">
                <MapPin size={11} /> {selectedGeoZone.name}
                <button onClick={() => setSelectedGeoZone(null)} className="hover:opacity-80 ml-0.5">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>

          <button
            onClick={() => setIsMapExpanded(!isMapExpanded)}
            className="text-xs font-semibold text-[#003E51] dark:text-[#00B0B9] hover:underline flex items-center gap-1 transition-colors shrink-0"
          >
            {isMapExpanded ? (
              <>
                <ChevronUp size={14} /> Ocultar Mapa
              </>
            ) : (
              <>
                <ChevronDown size={14} /> Mostrar Mapa de Proveedores
              </>
            )}
          </button>
        </div>

        {isMapExpanded && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <WorldGeoVendorsMap
              vendors={mapVendors}
              onSelectVendor={handleMapSelectVendor}
              isLoading={isMapLoading}
              selectedZone={selectedGeoZone}
              onSelectZone={setSelectedGeoZone}
              year={selectedYear}
            />
          </div>
        )}
      </div>

      {/* CONTENEDOR PRINCIPAL DE TABLA Y FILTROS */}
      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col h-[calc(100vh-280px)] min-h-125">
        {/* BARRA DE CONTROL Y FILTROS */}
        <div className="p-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-transparent">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Buscador de texto y chip de zona activa */}
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="w-full relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  {isFetching && debouncedSearch ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#00B0B9]" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-8 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00B0B9]/50 sm:text-xs font-medium"
                  placeholder="Buscar proveedor por código, nombre, NIF, ciudad..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {selectedGeoZone && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003E51] text-white text-xs font-bold rounded-lg shrink-0 shadow-sm animate-in fade-in">
                  <MapPin size={13} className="text-[#00B0B9]" />
                  <span>{selectedGeoZone.name}</span>
                  <button
                    onClick={() => setSelectedGeoZone(null)}
                    title="Quitar filtro de mapa"
                    className="hover:text-red-300 ml-1"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Selectores de Año, Estado y Botón Exportar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Selector de Ejercicio */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs">
                <Calendar size={13} className="text-[#00B0B9]" />
                <select
                  value={selectedYear?.toString() || ''}
                  onChange={(e) => setSelectedYear(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                  className="bg-transparent border-none outline-none font-bold text-gray-700 dark:text-gray-200 cursor-pointer text-xs"
                >
                  <option value="">Histórico Total</option>
                  <option value="2026">Ejercicio 2026</option>
                  <option value="2025">Ejercicio 2025</option>
                  <option value="2024">Ejercicio 2024</option>
                  <option value="2023">Ejercicio 2023</option>
                </select>
              </div>

              {/* Selector de Estado */}
              <select
                value={blockedFilter?.toString() || ''}
                onChange={(e) => setBlockedFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
                className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark text-gray-700 dark:text-gray-200 rounded-lg px-3 py-1.5 outline-none font-bold uppercase cursor-pointer"
              >
                <option value="">Todos los Estados</option>
                <option value="false">Activos</option>
                <option value="true">Bloqueados ({blockedCount})</option>
              </select>

              <ExportButton onExport={handleExport} />
            </div>
          </div>
        </div>

        {/* TABLA DE PROVEEDORES */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-[#003E51] text-white sticky top-0 z-20 shadow-lg">
              <tr>
                {[
                  { label: 'Código', key: 'vendor_id' },
                  { label: 'Proveedor', key: 'name' },
                  { label: 'ABC', key: 'abc_class', align: 'center' },
                  { label: 'NIF/CIF', key: 'vat_no' },
                  { label: 'Ciudad / Prov.', key: 'city' },
                  { label: 'Términos Pago', key: 'payment_terms_code' },
                  {
                    label: selectedYear ? `Compras ${selectedYear}` : 'Volumen Compra',
                    key: 'purchase_volume',
                    align: 'right'
                  },
                  { label: 'Saldo Pendiente', key: 'balance_lcy', align: 'right' },
                  { label: 'Saldo Vencido', key: 'balance_due_lcy', align: 'right' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-3.5 py-3 font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:bg-white/10 transition-colors ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                    }`}
                  >
                    <div className={`flex items-center ${
                      col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                    }`}>
                      {col.label}
                      {getSortIcon(col.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {vendors.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400 text-xs">
                    No se encontraron proveedores que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                vendors.map(vendor => {
                  const isBlocked = vendor.blocked && vendor.blocked.trim() !== '' && vendor.blocked !== 'FALSE';
                  return (
                    <tr
                      key={vendor.id}
                      onClick={() => handleRowClick(vendor)}
                      className={`cursor-pointer transition-colors ${
                        isBlocked
                          ? 'bg-red-50/30 dark:bg-red-950/10 hover:bg-red-100/40 dark:hover:bg-red-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <td className="px-3.5 py-2.5 font-bold font-mono text-xs text-[#003E51] dark:text-[#00B0B9]">
                        {vendor.vendor_id}
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-gray-800 dark:text-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-56 font-semibold" title={vendor.name}>{vendor.name}</span>
                          {isBlocked && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 uppercase flex items-center gap-0.5">
                              <ShieldAlert size={10} /> Bloqueado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {vendor.abc_class && vendor.abc_class !== '-' ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${
                            vendor.abc_class === 'A'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                              : vendor.abc_class === 'B'
                              ? 'bg-blue-100 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                          }`}>
                            {vendor.abc_class}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {vendor.vat_no || '---'}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex flex-col">
                          <span className="text-gray-700 dark:text-gray-300 font-medium text-xs truncate max-w-35">
                            {vendor.city || '---'}
                          </span>
                          {vendor.county && (
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{vendor.county}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {vendor.payment_terms_code || '---'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-black text-[#003E51] dark:text-[#00B0B9] text-xs">
                        {formatCurrency(Number(vendor.purchase_volume || 0), 0)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-gray-900 dark:text-white text-xs">
                        {formatCurrency(Number(vendor.balance_lcy || 0), 0)}
                      </td>
                      <td className={`px-3.5 py-2.5 text-right font-mono font-bold text-xs ${
                        Number(vendor.balance_due_lcy) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'
                      }`}>
                        {formatCurrency(Number(vendor.balance_due_lcy || 0), 0)}
                      </td>
                    </tr>
                  );
                })
              )}
              <tr ref={observerTarget}>
                <td colSpan={9} className="py-8 text-center text-gray-400 text-xs">
                  {isFetchingNextPage ? 'Cargando más proveedores...' : hasNextPage ? 'Baja para cargar más' : ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, type = 'number', icon: Icon, isLoading, status, infoProps }: any) => {
  if (isLoading) return <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 h-28 animate-pulse"></div>;
  const colorClass = status === 'success' ? 'text-emerald-500' : status === 'danger' ? 'text-red-500' : 'text-[#003E51] dark:text-white';
  const formattedValue = type === 'currency' ? formatCurrency(value, 0) : formatNumber(value, 0);
  return (
    <div className="bg-white dark:bg-surface-card-dark p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-card-hover group">
      <div className="flex justify-between items-start mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{title}</span>
          {infoProps && (
            <InfoPopover
              title={title}
              description={infoProps.description}
              formulas={infoProps.formulas}
              iconSize={12}
              className="text-gray-300 group-hover:text-[#00B0B9] transition-colors"
            />
          )}
        </div>
        <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-400 group-hover:text-[#00B0B9] transition-colors">
          <Icon size={16} />
        </div>
      </div>
      <div className={`text-2xl font-black font-mono tracking-tight ${colorClass}`}>{formattedValue}</div>
    </div>
  );
};
