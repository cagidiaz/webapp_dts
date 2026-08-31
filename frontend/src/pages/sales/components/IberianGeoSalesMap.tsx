import React, { useState, useMemo } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { 
  MapPin, TrendingUp, Euro, Building2, Sparkles, 
  ChevronDown, ChevronUp, Layers, Award, Info
} from 'lucide-react';
import { type CustomerDataRow, CLIENT_TYPES } from '../../../api/customers';
import { formatCurrency } from '../../../api/formatters';
import { getCustomerGeoLocation, type GeoLocation } from '../../../utils/geoCoordinates';
import iberiaGeoData from '../../../assets/geo/iberia-provinces.json';

interface IberianGeoSalesMapProps {
  customers: CustomerDataRow[];
  onSelectCustomer: (customer: CustomerDataRow) => void;
  isLoading?: boolean;
}

interface MappedCustomer {
  customer: CustomerDataRow;
  geo: GeoLocation;
  value: number;
  rank: number;
  coords: [number, number]; // [x, y] proyectados en SVG
}

interface HoveredProvinceInfo {
  name: string;
  country: string;
  totalSales: number;
  totalDebt: number;
  customerCount: number;
}

export const IberianGeoSalesMap: React.FC<IberianGeoSalesMapProps> = React.memo(({
  customers,
  onSelectCustomer,
  isLoading = false
}) => {
  const [metric, setMetric] = useState<'sales' | 'debt'>('sales');
  const [topLimit, setTopLimit] = useState<number>(10);
  const [hoveredCustomer, setHoveredCustomer] = useState<MappedCustomer | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<HoveredProvinceInfo | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeProvinceFilter, setActiveProvinceFilter] = useState<string | null>(null);

  const svgWidth = 900;
  const svgHeight = 650;

  // 1. Proyección cartográfica principal para la Península Ibérica + Baleares + Portugal (desplazada suavemente a la derecha para dejar más espacio a la izquierda)
  const peninsulaProjection = useMemo(() => {
    return geoMercator()
      .center([-3.6, 39.7])
      .scale(2850)
      .translate([svgWidth / 2 + 35, svgHeight / 2 - 20]);
  }, [svgWidth, svgHeight]);

  const peninsulaPathGenerator = useMemo(() => {
    return geoPath().projection(peninsulaProjection);
  }, [peninsulaProjection]);

  // 2. Proyección cartográfica dedicada para el Inset de las Islas Canarias (perfectamente centrada)
  const canariasProjection = useMemo(() => {
    return geoMercator()
      .center([-15.65, 28.38])
      .scale(1750)
      .translate([92, 555]);
  }, []);

  const canariasPathGenerator = useMemo(() => {
    return geoPath().projection(canariasProjection);
  }, [canariasProjection]);

  // Pre-calcular rutas vectoriales D3 UNA SOLA VEZ para que los hovers sean 100% instantáneos a 0ms
  const { peninsulaPaths, canariasPaths, outlinePaths } = useMemo(() => {
    const pen: { id: string; feature: any; pathD: string }[] = [];
    const can: { id: string; feature: any; pathD: string }[] = [];
    const outlines: { id: string; pathD: string }[] = [];

    for (const f of (iberiaGeoData as any).features) {
      if (f.properties.isCanarias) {
        const d = canariasPathGenerator(f);
        if (d) can.push({ id: f.properties.id, feature: f, pathD: d });
      } else {
        const d = peninsulaPathGenerator(f);
        if (d) pen.push({ id: f.properties.id, feature: f, pathD: d });
      }
    }

    for (const outline of ((iberiaGeoData as any).countryOutlines || [])) {
      const isCanarias = outline.properties?.isCanarias ?? outline.isCanarias;
      const generator = isCanarias ? canariasPathGenerator : peninsulaPathGenerator;
      const d = generator(outline as any);
      if (d) {
        outlines.push({ id: outline.properties?.id || outline.id || Math.random().toString(), pathD: d });
      }
    }

    return { peninsulaPaths: pen, canariasPaths: can, outlinePaths: outlines };
  }, [peninsulaPathGenerator, canariasPathGenerator]);

  // Procesamiento de clientes y agregados provinciales
  const { 
    mappedCustomers, 
    provinceAggregates, 
    summaryStats, 
    topRanked,
    maxProvinceVal,
    maxCustomerVal 
  } = useMemo(() => {
    if (!customers || customers.length === 0) {
      return { 
        mappedCustomers: [], 
        provinceAggregates: {}, 
        summaryStats: { totalVal: 0, topRegion: 'N/D', topRegionPct: 0, provinceCount: 0 }, 
        topRanked: [],
        maxProvinceVal: 1,
        maxCustomerVal: 1
      };
    }

    const validList: { customer: CustomerDataRow; geo: GeoLocation; value: number; coords: [number, number] }[] = [];
    const provAgg: Record<string, { totalSales: number; totalDebt: number; count: number; name: string; country: string }> = {};
    const regionTotals: Record<string, number> = {};
    const provinceSet = new Set<string>();

    for (const c of customers) {
      const sales = Number(c.total_sales || 0);
      const debt = Number(c.balance_due_lcy || 0);
      const geo = getCustomerGeoLocation(c);

      if (geo) {
        const provKey = geo.id; // 'ES-28', 'PT-lisboa'
        if (!provAgg[provKey]) {
          provAgg[provKey] = { totalSales: 0, totalDebt: 0, count: 0, name: geo.name, country: geo.country };
        }
        provAgg[provKey].totalSales += sales;
        provAgg[provKey].totalDebt += debt;
        provAgg[provKey].count += 1;

        const val = metric === 'sales' ? sales : debt;
        if (val > 0) {
          // Si el cliente está en Canarias, proyectar con canariasProjection; si no, con peninsulaProjection
          const projected = geo.isCanarias 
            ? canariasProjection([geo.lng, geo.lat])
            : peninsulaProjection([geo.lng, geo.lat]);

          if (projected) {
            validList.push({ customer: c, geo, value: val, coords: projected });
            provinceSet.add(geo.name);
            regionTotals[geo.region] = (regionTotals[geo.region] || 0) + val;
          }
        }
      }
    }

    // Ordenar de mayor a menor según la métrica seleccionada
    validList.sort((a, b) => b.value - a.value);

    const mapped: MappedCustomer[] = validList.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));

    const totalVal = mapped.reduce((acc, curr) => acc + curr.value, 0);

    // Calcular zona líder
    let topRegion = 'N/D';
    let topRegionVal = 0;
    for (const [region, total] of Object.entries(regionTotals)) {
      if (total > topRegionVal) {
        topRegionVal = total;
        topRegion = region;
      }
    }
    const topRegionPct = totalVal > 0 ? (topRegionVal / totalVal) * 100 : 0;

    let maxProv = 1;
    for (const p of Object.values(provAgg)) {
      const pVal = metric === 'sales' ? p.totalSales : p.totalDebt;
      if (pVal > maxProv) maxProv = pVal;
    }

    const maxCust = mapped.length > 0 ? mapped[0].value : 1;

    return {
      mappedCustomers: mapped,
      provinceAggregates: provAgg,
      summaryStats: {
        totalVal,
        topRegion,
        topRegionPct: Math.round(topRegionPct * 10) / 10,
        provinceCount: provinceSet.size
      },
      topRanked: mapped.slice(0, topLimit),
      maxProvinceVal: maxProv,
      maxCustomerVal: maxCust
    };
  }, [customers, metric, topLimit, peninsulaProjection, canariasProjection]);

  // Radio proporcional para los marcadores
  const getMarkerRadius = (value: number, rank: number) => {
    if (rank === 1) return 14;
    if (rank === 2) return 12;
    if (rank === 3) return 10;
    const ratio = Math.max(0.2, Math.sqrt(value / maxCustomerVal));
    return Math.min(10, Math.max(4.5, ratio * 10));
  };

  // Clientes filtrados por provincia si hay filtro activo
  const displayMapCustomers = useMemo(() => {
    let list = mappedCustomers;
    if (activeProvinceFilter) {
      list = list.filter(m => m.geo.id === activeProvinceFilter || m.geo.name === activeProvinceFilter);
    }
    return list.slice(0, 60);
  }, [mappedCustomers, activeProvinceFilter]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-surface-card-dark rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm animate-pulse h-96 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-dts-secondary/20 mx-auto animate-spin flex items-center justify-center">
            <Layers className="text-dts-secondary h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-gray-500">Cargando mapa cartográfico de la Península Ibérica...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all duration-300">
      {/* CABECERA DEL WIDGET */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-linear-to-r from-gray-50/50 via-white to-gray-50/30 dark:from-white/5 dark:via-transparent dark:to-transparent">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-dts-primary/10 dark:bg-dts-secondary/10 flex items-center justify-center text-dts-primary dark:text-dts-secondary shadow-inner">
              <MapPin size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                  Inteligencia Geográfica & Top Clientes
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-dts-secondary/15 text-dts-secondary border border-dts-secondary/30">
                  <Sparkles size={10} /> Península Ibérica Oficial (IGN)
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Distribución provincial exacta y posicionamiento de clientes estratégicos
              </p>
            </div>
          </div>

          {/* KPI Mini-Cards y Controles */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-gray-700/60 text-xs">
              <Award size={14} className="text-amber-500" />
              <span className="text-gray-500 dark:text-gray-400 font-medium">Zona Líder:</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{summaryStats.topRegion} ({summaryStats.topRegionPct}%)</span>
            </div>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-gray-700/60 text-xs">
              <Building2 size={14} className="text-dts-secondary" />
              <span className="text-gray-500 dark:text-gray-400 font-medium">Provincias Activas:</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{summaryStats.provinceCount}</span>
            </div>

            {/* Selector de Métrica */}
            <div className="inline-flex p-1 bg-gray-100 dark:bg-dts-primary-dark rounded-lg border border-gray-200/80 dark:border-gray-700 text-xs font-semibold">
              <button
                onClick={() => setMetric('sales')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  metric === 'sales'
                    ? 'bg-dts-primary text-white shadow-sm dark:bg-dts-secondary dark:text-dts-primary-dark'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <TrendingUp size={13} />
                <span>Ventas (€)</span>
              </button>
              <button
                onClick={() => setMetric('debt')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  metric === 'debt'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Euro size={13} />
                <span>Deuda (€)</span>
              </button>
            </div>

            {/* Toggle Expandir/Colapsar */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 transition-colors"
              title={isExpanded ? 'Colapsar mapa' : 'Expandir mapa'}
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* CUERPO DEL WIDGET */}
      {isExpanded && (
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-gray-800">
          
          {/* COLUMNA MAPA VECTORIAL CARTOGRÁFICO (8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 p-4 sm:p-6 flex flex-col justify-between relative bg-slate-50/50 dark:bg-black/20 min-h-125">
            
            {/* Controles y Leyenda superior */}
            <div className="flex items-center justify-between gap-2 mb-2 z-10">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-dts-secondary ring-4 ring-dts-secondary/20"></span>
                <span>{displayMapCustomers.length} clientes geoposicionados</span>
                {activeProvinceFilter && (
                  <button 
                    onClick={() => setActiveProvinceFilter(null)}
                    className="ml-2 text-[11px] font-bold text-dts-secondary bg-dts-secondary/10 px-2 py-0.5 rounded-md hover:underline"
                  >
                    Ver todas las provincias ✕
                  </button>
                )}
              </div>

              {/* Leyenda de escala */}
              <div className="hidden sm:flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-surface-card-dark/90 backdrop-blur px-2.5 py-1 rounded-md border border-gray-100 dark:border-gray-800 shadow-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-400 text-amber-950 font-black text-[8px] flex items-center justify-center shadow-xs">1</span>
                  <span>Top 3 Nacional</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-dts-secondary"></span>
                  <span>Mejores Clientes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-xs bg-dts-secondary/20 border border-dts-secondary/40"></span>
                  <span>Densidad de ventas</span>
                </div>
              </div>
            </div>

            {/* CONTENEDOR SVG CON PROYECCIÓN DUAL D3 OFICIAL */}
            <div className="relative w-full h-105 sm:h-120 flex items-center justify-center overflow-hidden">
              <svg 
                viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                className="w-full h-full select-none"
              >
                {/* --- CAPA 0: FONDO DEL RECUADRO INSET DE CANARIAS (PERFECTAMENTE CENTRADO) --- */}
                <g className="canarias-inset-bg">
                  <rect 
                    x="8" 
                    y="495" 
                    width="168" 
                    height="120" 
                    rx="8" 
                    className="fill-white/90 dark:fill-surface-card-dark/90"
                  />
                </g>

                {/* --- CAPA 1: PROVINCIAS PENÍNSULA IBÉRICA + BALEARES + PORTUGAL (LÍMITES INTERNOS HOMOGÉNEOS) --- */}
                <g className="provinces-layer">
                  {peninsulaPaths.map((item) => {
                    const provId = item.id;
                    const agg = provinceAggregates[provId];
                    const val = agg ? (metric === 'sales' ? agg.totalSales : agg.totalDebt) : 0;
                    
                    const intensity = maxProvinceVal > 0 ? val / maxProvinceVal : 0;
                    const isSelected = activeProvinceFilter === provId;

                    let fillStyle = '';
                    if (val > 0) {
                      const alpha = 0.12 + Math.min(0.55, intensity * 0.65);
                      fillStyle = metric === 'sales' 
                        ? `rgba(0, 176, 185, ${alpha})`
                        : `rgba(217, 119, 6, ${alpha})`;
                    } else {
                      fillStyle = 'rgba(0, 62, 81, 0.04)';
                    }

                    return (
                      <path
                        key={provId}
                        d={item.pathD}
                        fill={isSelected ? 'rgba(0, 176, 185, 0.45)' : fillStyle}
                        stroke={isSelected ? '#00B0B9' : '#64748B'}
                        strokeWidth={isSelected ? 1.8 : 0.45}
                        strokeOpacity={isSelected ? 1 : 0.3}
                        className="cursor-pointer hover:stroke-dts-secondary hover:stroke-[1.5px] hover:stroke-opacity-100"
                        onClick={() => {
                          if (agg && agg.count > 0) {
                            setActiveProvinceFilter(activeProvinceFilter === provId ? null : provId);
                          }
                        }}
                        onMouseEnter={() => {
                          if (agg && agg.count > 0) {
                            setHoveredProvince({
                              name: agg.name,
                              country: agg.country,
                              totalSales: agg.totalSales,
                              totalDebt: agg.totalDebt,
                              customerCount: agg.count,
                            });
                          }
                        }}
                        onMouseLeave={() => setHoveredProvince(null)}
                      />
                    );
                  })}
                </g>

                {/* --- CAPA 2: ISLAS CANARIAS CON SU PROYECCIÓN DEDICADA --- */}
                <g className="canarias-provinces-layer">
                  {canariasPaths.map((item) => {
                    const provId = item.id;
                    const agg = provinceAggregates[provId];
                    const val = agg ? (metric === 'sales' ? agg.totalSales : agg.totalDebt) : 0;
                    
                    const intensity = maxProvinceVal > 0 ? val / maxProvinceVal : 0;
                    const isSelected = activeProvinceFilter === provId;

                    let fillStyle = '';
                    if (val > 0) {
                      const alpha = 0.12 + Math.min(0.55, intensity * 0.65);
                      fillStyle = metric === 'sales' 
                        ? `rgba(0, 176, 185, ${alpha})`
                        : `rgba(217, 119, 6, ${alpha})`;
                    } else {
                      fillStyle = 'rgba(0, 62, 81, 0.04)';
                    }

                    return (
                      <path
                        key={provId}
                        d={item.pathD}
                        fill={isSelected ? 'rgba(0, 176, 185, 0.45)' : fillStyle}
                        stroke={isSelected ? '#00B0B9' : '#64748B'}
                        strokeWidth={isSelected ? 1.8 : 0.45}
                        strokeOpacity={isSelected ? 1 : 0.3}
                        className="cursor-pointer hover:stroke-dts-secondary hover:stroke-[1.5px]"
                        onClick={() => {
                          if (agg && agg.count > 0) {
                            setActiveProvinceFilter(activeProvinceFilter === provId ? null : provId);
                          }
                        }}
                        onMouseEnter={() => {
                          if (agg && agg.count > 0) {
                            setHoveredProvince({
                              name: agg.name,
                              country: agg.country,
                              totalSales: agg.totalSales,
                              totalDebt: agg.totalDebt,
                              customerCount: agg.count,
                            });
                          }
                        }}
                        onMouseLeave={() => setHoveredProvince(null)}
                      />
                    );
                  })}
                </g>

                {/* --- CAPA 2.5: LÍMITES EXTERIORES LUMINOSOS DE ESPAÑA Y PORTUGAL --- */}
                <g className="country-outlines-layer pointer-events-none">
                  {outlinePaths.map((outline) => (
                    <path
                      key={outline.id}
                      d={outline.pathD}
                      fill="none"
                      stroke="#00B0B9"
                      strokeWidth="1.5"
                      strokeOpacity="0.95"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ))}
                </g>

                {/* --- CAPA 3: MARCO DEL INSET DE CANARIAS (LUMINOSO, NÍTIDO Y PERFECTAMENTE CENTRADO) --- */}
                <g className="canarias-inset-frame pointer-events-none">
                  <rect 
                    x="8" 
                    y="495" 
                    width="168" 
                    height="120" 
                    rx="8" 
                    fill="none"
                    className="stroke-dts-secondary/60 dark:stroke-dts-secondary/70" 
                    strokeWidth="1.2" 
                    strokeDasharray="4 4" 
                  />
                  <text 
                    x="16" 
                    y="510" 
                    className="fill-dts-primary dark:fill-dts-secondary font-bold text-[9px] uppercase tracking-wider"
                  >
                    Islas Canarias
                  </text>
                </g>

                {/* Etiquetas de Mares */}
                <text x="560" y="45" className="fill-gray-400/30 dark:fill-gray-700/40 font-bold text-xs tracking-wider uppercase pointer-events-none">Mar Cantábrico</text>
                <text x="760" y="440" className="fill-gray-400/30 dark:fill-gray-700/40 font-bold text-xs tracking-wider uppercase pointer-events-none">Mar Mediterráneo</text>
                <text x="45" y="140" className="fill-gray-400/30 dark:fill-gray-700/40 font-bold text-xs tracking-wider uppercase pointer-events-none">Océano Atlántico</text>

                {/* --- CAPA 4: MARCADORES DE COMPRADORES CON ANIMACIÓN DE ENERGÍA / RESPIRACIÓN DE BRILLO --- */}
                <g className="customers-markers-layer">
                  {displayMapCustomers.map((item) => {
                    const [cx, cy] = item.coords;
                    const radius = getMarkerRadius(item.value, item.rank);
                    const isTop1 = item.rank === 1;
                    const isTop3 = item.rank <= 3;
                    const isTop5 = item.rank <= 5;
                    const isHovered = hoveredCustomer?.customer.id === item.customer.id;

                    const displayRadius = isHovered 
                      ? radius + 3 
                      : isTop1 
                      ? radius + 1.8 
                      : isTop3 
                      ? radius + 1 
                      : radius;

                    return (
                      <g 
                        key={item.customer.id} 
                        className="cursor-pointer"
                        onClick={() => onSelectCustomer(item.customer)}
                        onMouseEnter={() => setHoveredCustomer(item)}
                        onMouseLeave={() => setHoveredCustomer(null)}
                      >
                        {/* Halo exterior para las 3 mejores empresas (renderizado nativo sin costo de GPU) */}
                        {isTop3 && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={displayRadius + 3.5}
                            opacity={0.35}
                            className={`pointer-events-none ${isTop1 ? 'fill-amber-400' : 'fill-dts-secondary'}`}
                          />
                        )}

                        {/* Círculo base del marcador */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={displayRadius}
                          className={`transition-transform duration-100 ${
                            metric === 'sales'
                              ? isTop1 
                                ? 'fill-amber-400 stroke-white dark:stroke-gray-900' 
                                : isTop3 
                                ? 'fill-dts-secondary stroke-white dark:stroke-gray-900' 
                                : 'fill-dts-secondary/80 dark:fill-dts-secondary stroke-white/90 dark:stroke-gray-900'
                              : 'fill-amber-500 stroke-white dark:stroke-gray-900'
                          }`}
                          strokeWidth={isTop1 ? '2.5' : isTop3 ? '2' : '1.4'}
                        />

                        {/* Número de posición en el Ranking */}
                        {isTop5 && (
                          <text
                            x={cx}
                            y={cy + 3.2}
                            textAnchor="middle"
                            className={`font-mono font-black text-[9px] pointer-events-none select-none ${
                              isTop1 ? 'fill-amber-950 font-black' : 'fill-white'
                            }`}
                          >
                            {item.rank}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* --- CAPA 5: MARCADOR DESTACADO DE ALTA VISIBILIDAD EN TONOS VERDES CUANDO UN CLIENTE ESTÁ EN HOVER --- */}
                {hoveredCustomer && (
                  <g className="highlighted-customer-marker pointer-events-none">
                    {(() => {
                      const [cx, cy] = hoveredCustomer.coords;
                      const isTop1 = hoveredCustomer.rank === 1;
                      const pinColor = isTop1 ? '#059669' : '#10B981'; // Tonos verdes esmeralda luminosos
                      const ringColor = '#10B981';

                      return (
                        <g>
                          {/* Ondas concéntricas de radar verdes sobre la ubicación geográfica */}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={18}
                            fill="none"
                            stroke={ringColor}
                            strokeWidth="1.8"
                            strokeDasharray="3 3"
                            opacity="0.9"
                          />
                          <circle
                            cx={cx}
                            cy={cy}
                            r={32}
                            fill="none"
                            stroke={ringColor}
                            strokeWidth="1.2"
                            opacity="0.5"
                          />

                          {/* Punto central verde esmeralda */}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill={pinColor}
                            stroke="#ffffff"
                            strokeWidth="2"
                          />

                          {/* Puntero Pin Cartográfico Flotante Verde Esmeralda */}
                          <g transform={`translate(${cx}, ${cy - 10})`}>
                            {/* Sombra del pin */}
                            <ellipse cx="0" cy="9" rx="4" ry="1.5" fill="rgba(0,0,0,0.3)" />
                            
                            {/* Cuerpo del Pin Verde */}
                            <path
                              d="M 0,-24 C -7,-24 -11,-19 -11,-12 C -11,-4 0,0 0,0 C 0,0 11,-4 11,-12 C 11,-19 7,-24 0,-24 Z"
                              fill={pinColor}
                              stroke="#ffffff"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                            {/* Círculo interior del pin */}
                            <circle cx="0" cy="-13" r="4.5" fill="#ffffff" />
                            <circle cx="0" cy="-13" r="2.5" fill={pinColor} />
                          </g>
                        </g>
                      );
                    })()}
                  </g>
                )}
              </svg>

              {/* PANEL DE INFORMACIÓN FIJA AL EXTREMO SUPERIOR IZQUIERDO DEL MAPA (SOBRE EL OCÉANO ATLÁNTICO) */}
              <div className="absolute top-2 left-2 z-30 pointer-events-none">
                {hoveredCustomer ? (
                  <div className="bg-white/95 dark:bg-surface-card-dark/95 backdrop-blur-md p-3.5 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 w-65">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-dts-primary/10 dark:bg-dts-secondary/15 text-dts-primary dark:text-dts-secondary">
                        #{hoveredCustomer.rank} Top Cliente
                      </span>
                      {hoveredCustomer.customer.client_type && CLIENT_TYPES[hoveredCustomer.customer.client_type] && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${CLIENT_TYPES[hoveredCustomer.customer.client_type].badgeBg} ${CLIENT_TYPES[hoveredCustomer.customer.client_type].badgeColor}`}>
                          Tipo {hoveredCustomer.customer.client_type}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-xs text-gray-900 dark:text-white line-clamp-1">
                      {hoveredCustomer.customer.name}
                    </h4>

                    <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 mb-2">
                      <MapPin size={11} className="text-gray-400" />
                      <span>{hoveredCustomer.customer.city || hoveredCustomer.geo.name} ({hoveredCustomer.geo.region})</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-gray-100 dark:border-gray-800 text-[11px]">
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase font-bold block">Ventas Anuales</span>
                        <span className="font-mono font-bold text-dts-primary dark:text-dts-secondary">
                          {formatCurrency(Number(hoveredCustomer.customer.total_sales || 0), 0)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-gray-400 uppercase font-bold block">Deuda Pendiente</span>
                        <span className={`font-mono font-bold ${Number(hoveredCustomer.customer.balance_due_lcy || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                          {formatCurrency(Number(hoveredCustomer.customer.balance_due_lcy || 0), 0)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 pt-1 border-t border-gray-100 dark:border-gray-800 text-[9px] text-gray-400 flex justify-between items-center">
                      <span>Vendedor: {hoveredCustomer.customer.salesperson_code || 'N/A'}</span>
                      <span className="text-dts-secondary font-bold">Abrir ficha →</span>
                    </div>
                  </div>
                ) : hoveredProvince ? (
                  <div className="bg-white/95 dark:bg-surface-card-dark/95 backdrop-blur-md p-3.5 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 w-[240px]">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-xs text-gray-900 dark:text-white">
                        {hoveredProvince.name}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 uppercase">
                        {hoveredProvince.country}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] gap-3 pt-1 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-gray-500 dark:text-gray-400">Total {metric === 'sales' ? 'Ventas' : 'Deuda'}:</span>
                      <span className="font-mono font-bold text-dts-primary dark:text-dts-secondary">
                        {formatCurrency(metric === 'sales' ? hoveredProvince.totalSales : hoveredProvince.totalDebt, 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                      <span>{hoveredProvince.customerCount} {hoveredProvince.customerCount === 1 ? 'cliente' : 'clientes'}</span>
                      <span className="text-dts-secondary font-medium">Clic para filtrar</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Pie de mapa */}
            <div className="text-[11px] text-gray-400 flex items-center justify-between mt-2 pt-2 border-t border-gray-100/60 dark:border-gray-800/60">
              <span className="flex items-center gap-1">
                <Info size={12} /> Geometría cartográfica oficial del IGN & Eurostat. Pulsa en un cliente para abrir su ficha.
              </span>
              <span>Proyección: Mercator Península Ibérica + Inset Canarias</span>
            </div>
          </div>

          {/* COLUMNA RANKING TOP CLIENTES (4-5 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 p-4 sm:p-5 flex flex-col justify-between bg-white dark:bg-surface-card-dark">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className="text-amber-500 h-4 w-4" />
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                    Ranking de {metric === 'sales' ? 'Mejores Clientes' : 'Mayor Deuda'}
                  </h4>
                </div>

                <select
                  value={topLimit}
                  onChange={(e) => setTopLimit(Number(e.target.value))}
                  className="text-xs bg-gray-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-700 rounded-md px-2 py-0.5 font-bold outline-none cursor-pointer"
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={15}>Top 15</option>
                </select>
              </div>

              {/* Lista de clientes del ranking */}
              <div className="space-y-2 max-h-105 overflow-y-auto pr-1 custom-scrollbar">
                {topRanked.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    No hay datos suficientes con los filtros actuales.
                  </div>
                ) : (
                  topRanked.map((item) => {
                    const pctOfMax = maxCustomerVal > 0 ? (item.value / maxCustomerVal) * 100 : 0;
                    const isHovered = hoveredCustomer?.customer.id === item.customer.id;
                    const typeDef = item.customer.client_type ? CLIENT_TYPES[item.customer.client_type] : null;

                    return (
                      <div
                        key={item.customer.id}
                        onClick={() => onSelectCustomer(item.customer)}
                        onMouseEnter={() => setHoveredCustomer(item)}
                        onMouseLeave={() => setHoveredCustomer(null)}
                        className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isHovered
                            ? 'bg-dts-secondary/10 border-dts-secondary/40 shadow-sm'
                            : 'bg-gray-50/70 dark:bg-white/5 border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-mono font-black shadow-xs ${
                              item.rank === 1
                                ? 'bg-amber-400 text-amber-950 font-black'
                                : item.rank === 2
                                ? 'bg-slate-300 text-slate-900 font-bold'
                                : item.rank === 3
                                ? 'bg-amber-700/70 text-amber-100 font-bold'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium'
                            }`}>
                              {item.rank}
                            </span>

                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate group-hover:text-dts-secondary transition-colors">
                                {item.customer.name}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono text-xs font-black text-gray-900 dark:text-white">
                              {formatCurrency(item.value, 0)}
                            </span>
                          </div>
                        </div>

                        {/* Barra de progreso */}
                        <div className="w-full h-1.5 bg-gray-200/80 dark:bg-gray-700/80 rounded-full overflow-hidden mb-1.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              metric === 'sales'
                                ? item.rank === 1 ? 'bg-amber-500' : 'bg-dts-secondary'
                                : 'bg-amber-600'
                            }`}
                            style={{ width: `${pctOfMax}%` }}
                          />
                        </div>

                        {/* Fila inferior */}
                        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1 truncate max-w-35">
                            <MapPin size={10} className="text-gray-400 shrink-0" />
                            <span className="truncate">{item.customer.city || item.geo.name}</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            {typeDef && (
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${typeDef.badgeBg} ${typeDef.badgeColor}`}>
                                {typeDef.code}
                              </span>
                            )}
                            <span className="font-mono text-gray-400 text-[9px]">
                              {item.customer.salesperson_code || '---'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sumatorio y cuota global */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Total Facturación Top {topLimit}:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {formatCurrency(topRanked.reduce((a, b) => a + b.value, 0), 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Concentración sobre cartera:</span>
                <span className="font-mono font-bold text-dts-secondary">
                  {summaryStats.totalVal > 0
                    ? `${Math.round((topRanked.reduce((a, b) => a + b.value, 0) / summaryStats.totalVal) * 100)}%`
                    : '0%'}
                </span>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
});
