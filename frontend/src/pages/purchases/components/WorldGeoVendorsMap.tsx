import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, Geometry, Polygon } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import worldData from 'world-atlas/countries-110m.json';
import {
  MapPin, TrendingUp, Euro,
  ChevronDown, ChevronUp, Award, Globe,
  ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';
import { type VendorDataRow } from '../../../api/vendors';
import { formatCurrency } from '../../../api/formatters';

export interface GeoZone {
  id: string; // 'ES', 'DE', 'FR', etc. o 'ES-28'
  name: string;
  country?: string;
}

interface WorldGeoVendorsMapProps {
  vendors: VendorDataRow[];
  onSelectVendor: (vendor: VendorDataRow) => void;
  isLoading?: boolean;
  selectedZone?: GeoZone | null;
  onSelectZone?: (zone: GeoZone | null) => void;
  year?: number;
}

type WorldFeature = Feature<Geometry, { name: string }>;

type MapMetric = 'volume' | 'debt';
type RegionPreset = 'world' | 'europe' | 'spain' | 'america' | 'asia';

// Información y metadatos de países
const COUNTRY_METADATA: Record<string, { nameEs: string; atlasName: string; flag: string; centerCoords: [number, number] }> = {
  ES: { nameEs: 'España', atlasName: 'Spain', flag: '🇪🇸', centerCoords: [-3.7, 40.4] },
  DE: { nameEs: 'Alemania', atlasName: 'Germany', flag: '🇩🇪', centerCoords: [10.4, 51.1] },
  FR: { nameEs: 'Francia', atlasName: 'France', flag: '🇫🇷', centerCoords: [2.2, 46.2] },
  IT: { nameEs: 'Italia', atlasName: 'Italy', flag: '🇮🇹', centerCoords: [12.5, 41.8] },
  NL: { nameEs: 'Países Bajos', atlasName: 'Netherlands', flag: '🇳🇱', centerCoords: [5.2, 52.1] },
  GB: { nameEs: 'Reino Unido', atlasName: 'United Kingdom', flag: '🇬🇧', centerCoords: [-3.4, 55.3] },
  DK: { nameEs: 'Dinamarca', atlasName: 'Denmark', flag: '🇩🇰', centerCoords: [9.5, 56.2] },
  CH: { nameEs: 'Suiza', atlasName: 'Switzerland', flag: '🇨🇭', centerCoords: [8.2, 46.8] },
  BE: { nameEs: 'Bélgica', atlasName: 'Belgium', flag: '🇧🇪', centerCoords: [4.4, 50.5] },
  AT: { nameEs: 'Austria', atlasName: 'Austria', flag: '🇦🇹', centerCoords: [14.5, 47.5] },
  SE: { nameEs: 'Suecia', atlasName: 'Sweden', flag: '🇸🇪', centerCoords: [18.6, 60.1] },
  PT: { nameEs: 'Portugal', atlasName: 'Portugal', flag: '🇵🇹', centerCoords: [-8.2, 39.3] },
  IE: { nameEs: 'Irlanda', atlasName: 'Ireland', flag: '🇮🇪', centerCoords: [-8.2, 53.4] },
  US: { nameEs: 'Estados Unidos', atlasName: 'United States of America', flag: '🇺🇸', centerCoords: [-95.7, 37.0] },
  CN: { nameEs: 'China', atlasName: 'China', flag: '🇨🇳', centerCoords: [104.1, 35.8] },
  JP: { nameEs: 'Japón', atlasName: 'Japan', flag: '🇯🇵', centerCoords: [138.2, 36.2] },
  PL: { nameEs: 'Polonia', atlasName: 'Poland', flag: '🇵🇱', centerCoords: [19.1, 51.9] },
  CZ: { nameEs: 'República Checa', atlasName: 'Czechia', flag: '🇨🇿', centerCoords: [15.4, 49.8] },
  NO: { nameEs: 'Noruega', atlasName: 'Norway', flag: '🇳🇴', centerCoords: [8.4, 60.4] },
  FI: { nameEs: 'Finlandia', atlasName: 'Finland', flag: '🇫🇮', centerCoords: [25.7, 61.9] },
  HU: { nameEs: 'Hungría', atlasName: 'Hungary', flag: '🇭🇺', centerCoords: [19.5, 47.2] },
  TW: { nameEs: 'Taiwán', atlasName: 'Taiwan', flag: '🇹🇼', centerCoords: [121, 23.7] },
  CY: { nameEs: 'Chipre', atlasName: 'Cyprus', flag: '🇨🇾', centerCoords: [33.4, 35.1] },
  AE: { nameEs: 'Emiratos Árabes Unidos', atlasName: 'United Arab Emirates', flag: '🇦🇪', centerCoords: [54.4, 24.4] },
};

// Detección de país para cada proveedor
function detectVendorCountryCode(v: VendorDataRow): string {
  // 1. Si el campo country_code viene ya populado desde la BD, usarlo directamente
  if (v.country_code && v.country_code.trim().length > 0) {
    return v.country_code.trim().toUpperCase();
  }

  // 2. Fallback: inferencia por campos de texto (para registros sin country_code aún)
  const vat = (v.vat_no || '').trim().toUpperCase();
  const city = (v.city || '').trim().toUpperCase();
  const county = (v.county || '').trim().toUpperCase();
  const postCode = (v.post_code || '').trim().toUpperCase();
  const address = (v.address || '').trim().toUpperCase();
  const fullText = `${v.name || ''} ${city} ${county} ${postCode} ${address} ${vat}`.toUpperCase();

  // Detección específica para Estados Unidos (EIN formato XX-XXXXXXX)
  const isEIN = /^\d{2}-\d{7}$/.test(vat);
  const isUSStateOrCity = (
    county.includes('CALIFORNIA') || county === 'CA' ||
    postCode.includes('NC ') || postCode.includes('PA ') || postCode.includes('CA ') ||
    postCode.includes('NY ') || postCode.includes('TX ') || postCode.includes('FL ') ||
    city.includes('SAN DIEGO') || city.includes('ELIZABETH CITY') || city.includes('HORSHAM') ||
    fullText.includes('UNITED STATES') || fullText.includes('USA') || fullText.includes('U.S.A.') ||
    v.name?.toUpperCase().includes('US GAUGE')
  );
  if (isEIN || isUSStateOrCity || vat.startsWith('US')) return 'US';

  // Prefijo VAT estándar europeo
  const vatPrefix = vat.substring(0, 2);
  if (vatPrefix && COUNTRY_METADATA[vatPrefix]) return vatPrefix;

  // Menciones explícitas por texto
  if (city.includes('FRANCIA') || city.includes('FRANCE') || county.includes('FRANCE') || postCode.startsWith('FR-')) return 'FR';
  if (city.includes('ALEMANIA') || city.includes('GERMANY') || county.includes('GERMANY') || city.includes('NORDHEIM') || city.includes('OSNABRÜCK') || city.includes('SCHWETZINGEN') || city.includes('GÜGLINGEN')) return 'DE';
  if (city.includes('ITALIA') || city.includes('ITALY') || city.includes('MILANO') || city.includes('MILAN') || city.includes('CAVRIAGO')) return 'IT';
  if (city.includes('PAISES BAJOS') || city.includes('HOLANDA') || city.includes('NETHERLANDS') || city.includes('VENLO') || city.includes('DORDRECHT') || city.includes('EDE') || city.includes('HOOFDDORP')) return 'NL';
  if (city.includes('CHINA') || county.includes('CHINA') || city.includes('SHANGHAI') || city.includes('BEIJING')) return 'CN';
  if (city.includes('REINO UNIDO') || city.includes('ENGLAND') || city.includes('BERKSHIRE') || city.includes('SALISBURY') || postCode.startsWith('GB-') || postCode.startsWith('BG-')) return 'GB';
  if (city.includes('DINAMARCA') || city.includes('DENMARK') || city.includes('HELLEBAEK') || city.includes('ALLERØD')) return 'DK';
  if (city.includes('SUIZA') || city.includes('SWITZERLAND') || city.includes('ZURICH') || city.includes('GINEBRA')) return 'CH';
  if (city.includes('PORTUGAL') || city.includes('LISBOA') || city.includes('PORTO')) return 'PT';
  if (city.includes('IRLANDA') || city.includes('IRELAND') || city.includes('DUBLIN') || city.includes('GALWAY')) return 'IE';
  if (city.includes('AUSTRIA') || city.includes('STOCKERAU')) return 'AT';
  if (city.includes('SUECIA') || city.includes('SWEDEN') || city.includes('MALMÖ')) return 'SE';
  if (city.includes('POLONIA') || city.includes('POLAND') || city.includes('ZIELONA') || city.includes('LODZ')) return 'PL';
  if (city.includes('REPUBLICA CHECA') || city.includes('CZECH') || city.includes('VESTEC')) return 'CZ';

  return 'ES';
}

const REGION_CONFIGS: Record<RegionPreset, { label: string; center: [number, number]; scale: number }> = {
  world: { label: '🌍 Mundial', center: [10, 28], scale: 130 },
  europe: { label: '🇪🇺 Europa', center: [10, 52], scale: 560 },
  spain: { label: '🇪🇸 España', center: [-3.7, 40], scale: 1700 },
  america: { label: '🇺🇸 América', center: [-90, 36], scale: 260 },
  asia: { label: '🌏 Asia', center: [105, 34], scale: 280 },
};

export const WorldGeoVendorsMap: React.FC<WorldGeoVendorsMapProps> = React.memo(({
  vendors,
  onSelectVendor,
  isLoading = false,
  selectedZone,
  onSelectZone,
  year,
}) => {
  const [metric, setMetric] = useState<MapMetric>('volume');
  const [region, setRegion] = useState<RegionPreset>('world');
  const [zoomFactor, setZoomFactor] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [mapSize, setMapSize] = useState({ width: 860, height: 500 });
  const [tooltipSize, setTooltipSize] = useState({ width: 288, height: 260 });
  const [hoveredPoint, setHoveredCountry] = useState<{ code: string; x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const element = mapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setMapSize({ width: element.clientWidth, height: element.clientHeight });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const element = tooltipRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setTooltipSize({ width: element.offsetWidth, height: element.offsetHeight });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [hoveredPoint?.code, isLoading]);

  // Países y marcadores comparten coordenadas en píxeles del contenedor real.
  const showCountry = (code: string, event: React.MouseEvent<SVGElement> | React.FocusEvent<SVGElement>) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const target = event.currentTarget.getBoundingClientRect();
    setHoveredCountry({
      code,
      x: 'clientX' in event ? event.clientX - rect.left : target.left + target.width / 2 - rect.left,
      y: 'clientY' in event ? event.clientY - rect.top : target.top + target.height / 2 - rect.top,
    });
  };

  // Convertir TopoJSON a Features GeoJSON
  const worldFeatures = useMemo(() => {
    const atlas = worldData as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
    const rawFeatures = feature(atlas, atlas.objects.countries).features;

    // Desacoplar Guayana Francesa (Sudamérica) de Francia Metropolitana
    // para que Francia no se pinte erróneamente en América.
    return rawFeatures.flatMap<WorldFeature>((f) => {
      if (f.properties?.name === 'France' && f.geometry?.type === 'MultiPolygon') {
        const europeanPolygons: Polygon['coordinates'][] = [];
        const overseasPolygons: Polygon['coordinates'][] = [];

        f.geometry.coordinates.forEach((poly) => {
          const ring = poly[0];
          const avgLng = ring.reduce((sum: number, p: number[]) => sum + p[0], 0) / ring.length;
          const avgLat = ring.reduce((sum: number, p: number[]) => sum + p[1], 0) / ring.length;
          // Europa Occidental (Francia continental + Córcega)
          if (avgLng > -10 && avgLng < 25 && avgLat > 35 && avgLat < 60) {
            europeanPolygons.push(poly);
          } else {
            overseasPolygons.push(poly);
          }
        });

        const resultFeatures: WorldFeature[] = [];
        if (europeanPolygons.length > 0) {
          resultFeatures.push({
            ...f,
            geometry: {
              type: 'MultiPolygon',
              coordinates: europeanPolygons,
            },
          });
        }
        if (overseasPolygons.length > 0) {
          resultFeatures.push({
            type: 'Feature',
            id: 'FrenchGuiana',
            properties: { name: 'French Guiana' },
            geometry: {
              type: 'MultiPolygon',
              coordinates: overseasPolygons,
            },
          });
        }
        return resultFeatures;
      }
      return [f];
    });
  }, []);

  // Agrupación de proveedores por país
  const countryAggregations = useMemo(() => {
    const agg: Record<string, { code: string; volume: number; debt: number; count: number; vendors: VendorDataRow[] }> = {};

    vendors.forEach(v => {
      const code = detectVendorCountryCode(v);
      if (!agg[code]) {
        agg[code] = { code, volume: 0, debt: 0, count: 0, vendors: [] };
      }
      agg[code].volume += Number(v.purchase_volume || 0);
      agg[code].debt += Number(v.balance_lcy || 0);
      agg[code].count += 1;
      agg[code].vendors.push(v);
    });

    // El desglose sigue la misma métrica que el ranking de países.
    Object.values(agg).forEach(c => {
      c.vendors.sort((a, b) => Number((metric === 'volume' ? b.purchase_volume : b.balance_lcy) || 0) - Number((metric === 'volume' ? a.purchase_volume : a.balance_lcy) || 0));
    });

    return agg;
  }, [vendors, metric]);

  const maxVolume = useMemo(() => {
    const vals = Object.values(countryAggregations).map(c => c.volume);
    return Math.max(...vals, 1);
  }, [countryAggregations]);

  const maxDebt = useMemo(() => {
    const vals = Object.values(countryAggregations).map(c => c.debt);
    return Math.max(...vals, 1);
  }, [countryAggregations]);

  // Lista ordenada de países para el panel lateral
  const sortedCountries = useMemo(() => {
    return Object.values(countryAggregations).sort((a, b) => {
      return metric === 'volume' ? b.volume - a.volume : b.debt - a.debt;
    });
  }, [countryAggregations, metric]);

  // Derivar los datos evita conservar importes obsoletos al cambiar de año.
  const hoveredAggregation = hoveredPoint ? countryAggregations[hoveredPoint.code] : undefined;
  const hoveredCountry = hoveredPoint && hoveredAggregation && !isLoading ? {
    ...hoveredAggregation,
    name: COUNTRY_METADATA[hoveredPoint.code]?.nameEs || hoveredPoint.code,
    flag: COUNTRY_METADATA[hoveredPoint.code]?.flag || '🌐',
  } : null;
  const tooltipPosition = hoveredPoint ? {
    left: Math.max(10, Math.min(
      hoveredPoint.x + 16 + tooltipSize.width > mapSize.width - 10
        ? hoveredPoint.x - tooltipSize.width - 16 : hoveredPoint.x + 16,
      mapSize.width - tooltipSize.width - 10,
    )),
    top: Math.max(10, Math.min(hoveredPoint.y - 30, mapSize.height - tooltipSize.height - 10)),
  } : {};

  // La proyección ocupa el espacio disponible sin deformar los países.
  const width = Math.max(mapSize.width, 1);
  const height = Math.max(mapSize.height, 1);

  const projection = useMemo(() => {
    const cfg = REGION_CONFIGS[region];
    return geoMercator()
      .center(cfg.center)
      .scale(cfg.scale * zoomFactor * Math.min(width / 860, height / 480))
      .translate([width / 2, height / 2]);
  }, [region, zoomFactor, width, height]);

  const pathGenerator = useMemo(() => {
    return geoPath().projection(projection);
  }, [projection]);

  // Mapear el nombre en inglés del atlas al código ISO
  const atlasNameToCode = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(COUNTRY_METADATA).forEach(([code, meta]) => {
      map[meta.atlasName] = code;
    });
    return map;
  }, []);

  const handleCountryClick = (code: string) => {
    setHoveredCountry(null);
    if (!onSelectZone) return;
    const meta = COUNTRY_METADATA[code];
    if (selectedZone?.id === code) {
      onSelectZone(null);
    } else {
      onSelectZone({
        id: code,
        name: meta ? `${meta.flag} ${meta.nameEs}` : code,
        country: code,
      });
    }
  };

  return (
    <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden transition-all duration-300">
      {/* CABECERA DE CONTROL SUPERIOR */}
      <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/2 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-[#003E51] text-white flex items-center justify-center shadow-md shadow-[#003E51]/20">
            <Globe size={20} className="text-[#00B0B9]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                Mapa Mundial de Proveedores
              </h3>
              {year && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#003E51]/10 dark:bg-[#00B0B9]/20 text-[#003E51] dark:text-[#00B0B9] font-bold">
                  Año {year}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {Object.keys(countryAggregations).length} países/códigos de origen · Selecciona un país con proveedores para filtrar la tabla
            </p>
          </div>
        </div>

        {/* CONTROLES: REGIONES Y MÉTRICAS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Región */}
          <div className="flex flex-wrap bg-gray-100 dark:bg-white/5 p-0.5 rounded-lg border border-gray-200/60 dark:border-white/10">
            {(Object.keys(REGION_CONFIGS) as RegionPreset[]).map((r) => (
              <button
                key={r}
                onClick={() => { setHoveredCountry(null); setRegion(r); setZoomFactor(1); }}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  region === r
                    ? 'bg-[#003E51] text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {REGION_CONFIGS[r].label}
              </button>
            ))}
          </div>

          {/* Selector de Métrica */}
          <div className="flex bg-gray-100 dark:bg-white/5 p-0.5 rounded-lg border border-gray-200/60 dark:border-white/10">
            <button
              onClick={() => { setHoveredCountry(null); setMetric('volume'); }}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                metric === 'volume'
                  ? 'bg-[#00B0B9] text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp size={12} />
              Volumen Compra
            </button>
            <button
              onClick={() => { setHoveredCountry(null); setMetric('debt'); }}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                metric === 'debt'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Euro size={12} />
              Saldo actual
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-0.5 rounded-lg border border-gray-200/60 dark:border-white/10">
            <button
              onClick={() => { setHoveredCountry(null); setZoomFactor(prev => Math.min(prev + 0.3, 3)); }}
              className="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded"
              title="Aumentar zoom"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => { setHoveredCountry(null); setZoomFactor(prev => Math.max(prev - 0.3, 0.7)); }}
              className="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded"
              title="Disminuir zoom"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={() => { setHoveredCountry(null); setZoomFactor(1); }}
              className="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded"
              title="Restablecer zoom"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA PRINCIPAL: MAPA + PANEL LATERAL */}
      <div className="relative flex flex-col lg:flex-row">
        {/* LIENZO CARTOGRÁFICO SVG */}
        <div ref={mapRef} className="flex-none lg:flex-1 min-w-0 relative overflow-hidden bg-slate-900 select-none h-[440px] sm:h-[500px]"
          onMouseLeave={() => setHoveredCountry(null)}
          onKeyDown={(event) => { if (event.key === 'Escape') setHoveredCountry(null); }}
        >
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#00B0B9] border-t-transparent animate-spin" />
              <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">
                Cargando mapa mundial...
              </p>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="absolute inset-0 w-full h-full"
              aria-label="Distribución de proveedores por país"
              style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
            >
              <defs>
                {/* Gradiente oceánico */}
                <radialGradient id="oceanGlow" cx="50%" cy="50%" r="70%">
                  <stop offset="0%" stopColor="#0a1926" />
                  <stop offset="100%" stopColor="#040d14" />
                </radialGradient>

                {/* Filtro de brillo para burbujas */}
                <filter id="countryGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Fondo oceánico */}
              <rect width={width} height={height} fill="url(#oceanGlow)" />

              {/* Capa de países del mundo */}
              <g className="countries-layer">
                {worldFeatures.map((f) => {
                  const countryName = f.properties?.name;
                  const code = atlasNameToCode[countryName];
                  const agg = code ? countryAggregations[code] : undefined;
                  const hasVendors = !!agg;
                  const isSelected = selectedZone?.id === code;

                  // Cálculo de intensidad de color
                  const metricValue = agg ? (metric === 'volume' ? agg.volume : agg.debt) : 0;
                  const maxMetric = metric === 'volume' ? maxVolume : maxDebt;
                  const ratio = hasVendors ? Math.min(metricValue / maxMetric, 1) : 0;

                  // Color base del país
                  let fillColor = '#142332'; // país sin proveedores
                  let strokeColor = '#1e384f';
                  let strokeWidth = 0.5;

                  if (hasVendors) {
                    fillColor = isSelected
                      ? '#00B0B9'
                      : ratio > 0.4
                      ? '#005870'
                      : ratio > 0.1
                      ? '#003E51'
                      : '#002f3e';
                    strokeColor = isSelected ? '#ffffff' : '#00B0B9';
                    strokeWidth = isSelected ? 1.8 : 0.9;
                  }

                  const dPath = pathGenerator(f);
                  if (!dPath) return null;

                  return (
                    <path
                      key={f.id || countryName}
                      d={dPath}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      className="duration-200"
                      style={{
                        // La geometría cambia a la vez que los marcadores; solo animar el resaltado.
                        transitionProperty: 'fill, stroke, stroke-width, opacity',
                        cursor: hasVendors ? 'pointer' : 'default',
                        opacity: selectedZone && !isSelected ? 0.45 : 1,
                      }}
                      role={hasVendors ? 'button' : undefined}
                      tabIndex={hasVendors ? 0 : undefined}
                      aria-label={hasVendors ? `${COUNTRY_METADATA[code]?.nameEs || countryName}: ${agg.count} proveedores. Filtrar tabla` : undefined}
                      aria-pressed={hasVendors ? isSelected : undefined}
                      onFocus={(e) => { if (hasVendors && code) showCountry(code, e); }}
                      onBlur={() => setHoveredCountry(null)}
                      onKeyDown={(e) => {
                        if (hasVendors && code && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          handleCountryClick(code);
                        }
                      }}
                      onMouseEnter={(e) => { if (hasVendors && code) showCountry(code, e); }}
                      onMouseMove={(e) => { if (hasVendors && code) showCountry(code, e); }}
                      onMouseLeave={() => setHoveredCountry(null)}
                      onClick={() => hasVendors && code && handleCountryClick(code)}
                    />
                  );
                })}
              </g>

              {/* Capa de marcadores y halos circulares por país */}
              <g className="markers-layer">
                {Object.entries(countryAggregations).map(([code, agg]) => {
                  const meta = COUNTRY_METADATA[code];
                  let coords: [number, number] | null = null;

                  if (meta?.centerCoords) {
                    coords = projection(meta.centerCoords);
                  } else {
                    const feat = worldFeatures.find((f) => atlasNameToCode[f.properties?.name] === code);
                    if (feat) {
                      coords = pathGenerator.centroid(feat);
                    }
                  }

                  if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1]) || coords[0] < 0 || coords[0] > width || coords[1] < 0 || coords[1] > height) return null;

                  const metricValue = metric === 'volume' ? agg.volume : agg.debt;
                  const maxMetric = metric === 'volume' ? maxVolume : maxDebt;
                  const ratio = Math.max(metricValue / maxMetric, 0.08);
                  const radius = Math.min(Math.max(ratio * 22, 5), 26);
                  const isSelected = selectedZone?.id === code;

                  return (
                    <g
                      key={`marker-${code}`}
                      transform={`translate(${coords[0]}, ${coords[1]})`}
                      className="cursor-pointer"
                      onClick={() => handleCountryClick(code)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${meta?.nameEs || code}: ${agg.count} proveedores. Filtrar tabla`}
                      aria-pressed={isSelected}
                      onFocus={(e) => showCountry(code, e)}
                      onBlur={() => setHoveredCountry(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleCountryClick(code);
                        }
                      }}
                      onMouseEnter={(e) => showCountry(code, e)}
                      onMouseMove={(e) => showCountry(code, e)}
                      onMouseLeave={() => setHoveredCountry(null)}
                    >
                      {/* Círculo pulsante exterior */}
                      <circle
                        r={radius + 4}
                        fill={metric === 'volume' ? '#00B0B9' : '#f59e0b'}
                        opacity={0.25}
                        className="animate-pulse"
                      />

                      {/* Círculo central con borde */}
                      <circle
                        r={radius}
                        fill={isSelected ? '#ffffff' : (metric === 'volume' ? '#00B0B9' : '#f59e0b')}
                        stroke="#0a1926"
                        strokeWidth={1.5}
                        filter="url(#countryGlow)"
                      />

                      {/* Texto con número de proveedores si el radio lo permite */}
                      {radius >= 9 && (
                        <text
                          textAnchor="middle"
                          dy="3.5"
                          fontSize="9"
                          fontWeight="bold"
                          fill={isSelected ? '#003E51' : '#ffffff'}
                        >
                          {agg.count}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          )}

          {/* TOOLTIP FLOTANTE SOBRE EL MAPA */}
          {hoveredCountry && (
            <div
              ref={tooltipRef}
              role="tooltip"
              className="absolute z-30 pointer-events-none w-72 overflow-hidden p-3.5 rounded-xl bg-[#003E51]/95 text-white shadow-2xl border border-white/20 backdrop-blur-md"
              style={{
                ...tooltipPosition,
                maxWidth: Math.max(mapSize.width - 20, 0),
                maxHeight: Math.max(mapSize.height - 20, 0),
              }}
            >
              <div className="flex items-center gap-2 border-b border-white/10 pb-1.5 mb-2">
                <span className="text-xl">{hoveredCountry.flag}</span>
                <div>
                  <h4 className="font-bold text-xs text-white leading-none">
                    {hoveredCountry.name}
                  </h4>
                  <p className="text-[10px] text-[#00B0B9] mt-0.5">
                    {hoveredCountry.count} proveedor{hoveredCountry.count > 1 ? 'es' : ''} registrado{hoveredCountry.count > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-300 text-[11px]">Compras {year || 'históricas'}:</span>
                  <span className="font-bold text-[#00B0B9]">
                    {formatCurrency(hoveredCountry.volume)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-300 text-[11px]">Saldo actual:</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(hoveredCountry.debt)}
                  </span>
                </div>
              </div>

              {hoveredCountry.vendors.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-1">
                    Principales proveedores · {metric === 'volume' ? 'compras' : 'saldo'}:
                  </p>
                  <ul className="space-y-0.5 text-[10px] text-gray-200">
                    {hoveredCountry.vendors.slice(0, 3).map(v => (
                      <li key={v.vendor_id} className="truncate">
                        • {v.name}
                      </li>
                    ))}
                    {hoveredCountry.vendors.length > 3 && (
                      <li className="text-gray-400 italic">
                        +{hoveredCountry.vendors.length - 3} más...
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <p className="mt-2 text-[9px] text-[#00B0B9] font-semibold text-center border-t border-white/10 pt-1">
                Haz clic para filtrar la tabla
              </p>
            </div>
          )}

          <p className="absolute bottom-2 left-3 right-3 pointer-events-none text-[10px] text-slate-300">
            Puntos agregados por país · Tamaño según {metric === 'volume' ? 'compras' : 'saldo actual'} · No representan direcciones exactas
          </p>

          {/* CHIP DE FILTRO ACTIVO FLOTANTE */}
          {selectedZone && (
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 bg-[#00B0B9] text-white rounded-xl shadow-lg text-xs font-bold animate-in fade-in">
              <MapPin size={13} />
              <span>Filtrado por: {selectedZone.name}</span>
              <button
                onClick={() => onSelectZone?.(null)}
                className="hover:opacity-80 ml-1 text-white bg-black/20 rounded-full p-0.5"
                title="Quitar filtro"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* PANEL LATERAL: RANKING DE PAÍSES Y FABRICANTES */}
        <div className="w-full lg:w-96 shrink-0 min-w-0 border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/2 flex flex-col max-h-[500px]">
          <div className="p-3.5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-[#00B0B9]" />
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Top Países Proveedores
              </h4>
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Mostrar u ocultar países proveedores"
              aria-expanded={isSidebarOpen}
              className="text-xs text-gray-400 hover:text-gray-600 lg:hidden"
            >
              {isSidebarOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          <div className={`${isSidebarOpen ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 custom-scrollbar`}>
              {sortedCountries.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs italic">
                  No hay datos para la métrica seleccionada
                </div>
              ) : (
                sortedCountries.map((c) => {
                  const meta = COUNTRY_METADATA[c.code] || { nameEs: c.code, flag: '🌐' };
                  const isSelected = selectedZone?.id === c.code;
                  const value = metric === 'volume' ? c.volume : c.debt;
                  const total = metric === 'volume' ? maxVolume : maxDebt;
                  const percentage = total > 0 ? (value / total) * 100 : 0;

                  return (
                    <div
                      key={c.code}
                      onClick={() => handleCountryClick(c.code)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#003E51] text-white border-[#00B0B9] shadow-md'
                          : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 hover:border-[#00B0B9]/40 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg shrink-0">{meta.flag}</span>
                          <div className="truncate">
                            <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                              {meta.nameEs}
                            </p>
                            <p className={`text-[10px] ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                              {c.count} proveedor{c.count > 1 ? 'es' : ''}
                              {!COUNTRY_METADATA[c.code] && ' · Sin marcador geográfico'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className={`text-xs font-black font-mono ${
                            isSelected
                              ? 'text-[#00B0B9]'
                              : (metric === 'volume' ? 'text-[#003E51] dark:text-[#00B0B9]' : 'text-amber-600 dark:text-amber-400')
                          }`}>
                            {formatCurrency(value, 0)}
                          </p>
                        </div>
                      </div>

                      {/* Barra de progreso de volumen */}
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isSelected
                              ? 'bg-[#00B0B9]'
                              : (metric === 'volume' ? 'bg-[#003E51] dark:bg-[#00B0B9]' : 'bg-amber-500')
                          }`}
                          style={{ width: `${Math.min(100, Math.max(percentage, 0))}%` }}
                        />
                      </div>

                      {/* Proveedores destacados de este país si está seleccionado */}
                      {isSelected && c.vendors.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1">
                          <p className="text-[9px] uppercase tracking-wider text-[#00B0B9] font-bold">
                            Proveedores ({c.vendors.length}):
                          </p>
                          <div className="max-h-28 overflow-y-auto space-y-1">
                            {c.vendors.map((v) => (
                              <div
                                key={v.vendor_id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectVendor(v);
                                }}
                                className="flex justify-between items-center gap-2 text-[10px] py-1 px-1.5 rounded hover:bg-white/10 transition-colors"
                              >
                                <span className="truncate flex-1 min-w-0 font-medium text-gray-200" title={v.name}>
                                  {v.name}
                                </span>
                                <span className="font-mono text-white text-[10px]">
                                  {formatCurrency(Number((metric === 'volume' ? v.purchase_volume : v.balance_lcy) || 0), 0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
        </div>
      </div>
    </div>
  );
});
