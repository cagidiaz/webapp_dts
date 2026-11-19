import { appTabClass, appTabIconClass, appTabListClass } from '../../../components/shared/appTabs';
import { budgetTableControlsClass } from './budgetShared';
import React, { useState, useMemo } from 'react';
import { 
  ChevronUp, ChevronDown, ArrowUpDown, TrendingUp, FileText, 
  Package, User, Filter
} from 'lucide-react';
import type { SalespersonSummaryRow } from '../../../api/salesBudget';
import { formatCurrency, formatNumber } from '../../../api/formatters';

interface SalespersonPerformanceTableProps {
  data: SalespersonSummaryRow[];
  year: number;
  isLoading?: boolean;
  isSalesperson?: boolean;
  onSelectSalesperson?: (code: string) => void;
  selectedSalespersonCode?: string;
}

type SubTab = 'performance' | 'accounting' | 'pipeline';

export const SalespersonPerformanceTable: React.FC<SalespersonPerformanceTableProps> = ({
  data,
  year,
  isLoading = false,
  isSalesperson = false,
  onSelectSalesperson,
  selectedSalespersonCode
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('performance');
  const [sortBy, setSortBy] = useState<string>('facturacion');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const getSortIcon = (key: string) => {
    if (sortBy !== key) {
      return <ArrowUpDown size={12} className="ml-1 opacity-20 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="ml-1 text-dts-secondary" />
    ) : (
      <ChevronDown size={12} className="ml-1 text-dts-secondary" />
    );
  };

  // Ordenación de datos
  const sortedData = useMemo(() => {
    const list = [...data];
    list.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
    return list;
  }, [data, sortBy, sortDir]);

  // Totales consolidados de los comerciales visibles
  const totals = useMemo(() => {
    return data.reduce((acc, row) => ({
      productoFacturas: acc.productoFacturas + (row.productoFacturas || 0),
      productoAbonos: acc.productoAbonos + (row.productoAbonos || 0),
      facturacion: acc.facturacion + (row.facturacion || 0),
      facturacionAnioAnterior: acc.facturacionAnioAnterior + (row.facturacionAnioAnterior || 0),
      objetivo: acc.objetivo + (row.objetivo || 0),
      facturasOrdinarias: acc.facturasOrdinarias + (row.facturasOrdinarias || 0),
      prepagosFacturados: acc.prepagosFacturados + (row.prepagosFacturados || 0),
      abonos: acc.abonos + (row.abonos || 0),
      facturacionTotal: acc.facturacionTotal + (row.facturacionTotal || 0),
      portes: acc.portes + (row.portes || 0),
      otrasCuentas: acc.otrasCuentas + (row.otrasCuentas || 0),
      prepagosVivos: acc.prepagosVivos + (row.prepagosVivos || 0),
      cartera: acc.cartera + (row.cartera || 0),
      enviadosFacturar: acc.enviadosFacturar + (row.enviadosFacturar || 0),
      prepagosDescontados: acc.prepagosDescontados + (row.prepagosDescontados || 0),
      countNuevosClientes: acc.countNuevosClientes + (row.countNuevosClientes || 0),
      facturacionNuevos: acc.facturacionNuevos + (row.facturacionNuevos || 0),
      previsionCierre: acc.previsionCierre + (row.previsionCierre || 0),
    }), {
      productoFacturas: 0,
      productoAbonos: 0,
      facturacion: 0,
      facturacionAnioAnterior: 0,
      objetivo: 0,
      facturasOrdinarias: 0,
      prepagosFacturados: 0,
      abonos: 0,
      facturacionTotal: 0,
      portes: 0,
      otrasCuentas: 0,
      prepagosVivos: 0,
      cartera: 0,
      enviadosFacturar: 0,
      prepagosDescontados: 0,
      countNuevosClientes: 0,
      facturacionNuevos: 0,
      previsionCierre: 0,
    });
  }, [data]);

  const totalDesviacion = totals.facturacion - totals.objetivo;
  const totalCumplimiento = totals.objetivo > 0 ? (totals.facturacion / totals.objetivo) * 100 : 0;
  const totalDesviacionPct = totals.objetivo > 0 ? (totalDesviacion / totals.objetivo) * 100 : 0;

  const columnCount = activeSubTab === 'pipeline' ? 7 : 8;
  const columns = (
    <colgroup>
      <col className="w-1/5" />
      {Array.from({ length: columnCount - 1 }, (_, index) => (
        <col key={index} style={{ width: `${80 / (columnCount - 1)}%` }} />
      ))}
    </colgroup>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Sub-Tabs Toolbar */}
      <div className={budgetTableControlsClass}>
        <div role="tablist" aria-label="Rendimiento comercial" className={`${appTabListClass} min-w-0 flex-nowrap overflow-x-auto whitespace-nowrap border-b-0 pb-0 [&>button]:shrink-0`}>
          <button
            onClick={() => setActiveSubTab('performance')}
            type="button" role="tab" aria-selected={activeSubTab === 'performance'} className={appTabClass(activeSubTab === 'performance')}
          >
            <TrendingUp size={16} className={appTabIconClass(activeSubTab === 'performance')} />
            <span>Rendimiento y Cumplimiento</span>
          </button>

          <button
            onClick={() => setActiveSubTab('accounting')}
            type="button" role="tab" aria-selected={activeSubTab === 'accounting'} className={appTabClass(activeSubTab === 'accounting')}
          >
            <FileText size={16} className={appTabIconClass(activeSubTab === 'accounting')} />
            <span>Desglose Contable y Prepagos</span>
          </button>

          <button
            onClick={() => setActiveSubTab('pipeline')}
            type="button" role="tab" aria-selected={activeSubTab === 'pipeline'} className={appTabClass(activeSubTab === 'pipeline')}
          >
            <Package size={16} className={appTabIconClass(activeSubTab === 'pipeline')} />
            <span>Cartera y Previsión</span>
          </button>
        </div>

        <div className="hidden shrink-0 items-center gap-2 text-xs text-gray-500 dark:text-gray-400 xl:flex">
          {isSalesperson ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-medium text-[11px] border border-cyan-200 dark:border-cyan-800/40">
              <User size={12} /> Mi Rendimiento Individual
            </span>
          ) : (
            <span className="text-[11px]">
              {data.length} {data.length === 1 ? 'comercial activo' : 'comerciales activos'}
            </span>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="min-h-0 flex-1 overflow-x-auto custom-scrollbar">
        <div className="flex h-full min-w-[960px] flex-col">
        <div className="relative min-h-0 flex-1 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable]">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
          {columns}
          {/* HEADER: SUBTAB RENDIMIENTO */}
          {activeSubTab === 'performance' && (
            <thead className="sticky top-0 z-20 bg-dts-primary text-white shadow-md">
              <tr className="h-8">
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:bg-white/10" onClick={() => handleSort('name')}>
                  <div className="flex items-center">Comercial {getSortIcon('name')}</div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('productoFacturas')}>
                  <div className="flex items-center justify-end" title="Total facturado en líneas de producto (FV ordinarias)">
                    FV Producto {getSortIcon('productoFacturas')}
                  </div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('productoAbonos')}>
                  <div className="flex items-center justify-end" title="Total abonado en líneas de producto (AAV)">
                    AAV Producto {getSortIcon('productoAbonos')}
                  </div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('facturacion')}>
                  <div className="flex items-center justify-end text-dts-secondary" title="Facturación neta de producto (FV Producto - AAV Producto)">
                    Fact. Neta Items {getSortIcon('facturacion')}
                  </div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('facturacionAnioAnterior')}>
                  <div className="flex items-center justify-end" title={`Facturación de producto en el mismo periodo de ${year - 1}`}>
                    Fact. {year - 1} {getSortIcon('facturacionAnioAnterior')}
                  </div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('objetivo')}>
                  <div className="flex items-center justify-end">Objetivo {getSortIcon('objetivo')}</div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('desviacion')}>
                  <div className="flex items-center justify-end">Desviación {getSortIcon('desviacion')}</div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('porcentajeCumplimiento')}>
                  <div className="flex items-center justify-end">% Cumpl. {getSortIcon('porcentajeCumplimiento')}</div>
                </th>
              </tr>
            </thead>
          )}

          {/* HEADER: SUBTAB DESGLOSE CONTABLE */}
          {activeSubTab === 'accounting' && (
            <thead className="sticky top-0 z-20 bg-dts-primary text-white shadow-md">
              <tr className="h-8">
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:bg-white/10" onClick={() => handleSort('name')}>
                  <div className="flex items-center">Comercial {getSortIcon('name')}</div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('facturasOrdinarias')}>
                  <div className="flex items-center justify-end" title="Facturas de venta ordinarias (FV cabeceras)">
                    Facturas (FV) {getSortIcon('facturasOrdinarias')}
                  </div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('prepagosFacturados')}>
                  <div className="flex items-center justify-end text-cyan-300" title="Facturas de anticipo emitidas (PFV)">
                    Prepagos (PFV) {getSortIcon('prepagosFacturados')}
                  </div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('abonos')}>
                  <div className="flex items-center justify-end text-rose-300" title="Abonos y devoluciones documentales (AAV)">
                    Abonos (AAV) {getSortIcon('abonos')}
                  </div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('facturacionTotal')}>
                  <div className="flex items-center justify-end" title="Total facturación documental (FV + PFV - AAV)">
                    Total Doc. {getSortIcon('facturacionTotal')}
                  </div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('portes')}>
                  <div className="flex items-center justify-end text-amber-300" title="Líneas de portes y transportes (Cuenta contable 624)">
                    Portes (624) {getSortIcon('portes')}
                  </div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('otrasCuentas')}>
                  <div className="flex items-center justify-end text-purple-300" title="Otras líneas de cuentas contables (excluidas 438 y 624)">
                    Otras Ctas {getSortIcon('otrasCuentas')}
                  </div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('prepagosVivos')}>
                  <div className="flex items-center justify-end text-cyan-200" title="Prepagos vivos no liquidados de clientes del comercial">
                    Prepagos Vivos {getSortIcon('prepagosVivos')}
                  </div>
                </th>
              </tr>
            </thead>
          )}

          {/* HEADER: SUBTAB CARTERA Y PREVISIÓN */}
          {activeSubTab === 'pipeline' && (
            <thead className="sticky top-0 z-20 bg-dts-primary text-white shadow-md">
              <tr className="h-8">
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:bg-white/10" onClick={() => handleSort('name')}>
                  <div className="flex items-center">Comercial {getSortIcon('name')}</div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('facturacion')}>
                  <div className="flex items-center justify-end" title="Facturación neta de producto ejecutada">
                    Fact. Items {getSortIcon('facturacion')}
                  </div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('cartera')}>
                  <div className="flex items-center justify-end" title="Pedidos abiertos pendientes de servir (netos de prepagos aplicados)">
                    Cartera Neta {getSortIcon('cartera')}
                  </div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('enviadosFacturar')}>
                  <div className="flex items-center justify-end text-amber-300" title="Enviado pendiente de facturar (neto de prepagos aplicados)">
                    Pend. Facturar {getSortIcon('enviadosFacturar')}
                  </div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('prepagosDescontados')}>
                  <div className="flex items-center justify-end text-cyan-300" title="Prepagos vivos deducidos en pedidos abiertos y albaranes enviados">
                    Prepagos Deduc. {getSortIcon('prepagosDescontados')}
                  </div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('countNuevosClientes')}>
                  <div className="flex items-center justify-end" title="Clientes nuevos dados de alta en el año asignados a este comercial">
                    Clientes Nuevos {getSortIcon('countNuevosClientes')}
                  </div>
                </th>
                <th className="px-4 py-1 leading-tight font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('previsionCierre')}>
                  <div className="flex items-center justify-end text-emerald-300" title="Previsión = Facturación Items + Cartera + Pendiente Facturar">
                    Previsión Total {getSortIcon('previsionCierre')}
                  </div>
                </th>
              </tr>
            </thead>
          )}

          {/* TABLE BODY */}
          <tbody className="divide-y divide-gray-100 text-xs text-dts-primary dark:divide-gray-800 dark:text-gray-300 [&>tr]:h-14">
            {isLoading ? (
              <tr>
                <td colSpan={columnCount} className="py-20 text-center text-gray-400">
                  Cargando rendimiento de comerciales...
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="py-20 text-center text-gray-400 opacity-60">
                  Sin datos de comerciales para los filtros seleccionados
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => {
                const isSelected = selectedSalespersonCode === row.code;

                return (
                  <tr
                    key={`${row.code}-${idx}`}
                    className={`transition-colors group ${
                      isSelected
                        ? 'bg-cyan-50/60 dark:bg-cyan-950/30 border-l-4 border-dts-secondary'
                        : 'hover:bg-gray-50/80 dark:hover:bg-white/5'
                    }`}
                  >
                    {/* COMERCIAL COL */}
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col truncate pr-2">
                          <span className="truncate font-semibold text-gray-900 dark:text-white" title={row.name}>
                            {row.name}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">{row.code}</span>
                        </div>
                        {onSelectSalesperson && !isSalesperson && (
                          <button
                            onClick={() => onSelectSalesperson(row.code)}
                            title={`Filtrar clientes de ${row.name}`}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-dts-secondary/10 text-dts-secondary rounded"
                          >
                            <Filter size={12} />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* SUBTAB RENDIMIENTO DATA */}
                    {activeSubTab === 'performance' && (
                      <>
                        <td className="px-4 py-3 text-right font-mono text-gray-600 dark:text-gray-300">
                          {formatCurrency(row.productoFacturas, 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-rose-500">
                          {row.productoAbonos > 0 ? `-${formatCurrency(row.productoAbonos, 0)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-dts-primary dark:text-white">
                          {formatCurrency(row.facturacion, 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-400">
                          {row.facturacionAnioAnterior ? formatCurrency(row.facturacionAnioAnterior, 0) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-600 dark:text-gray-300">
                          {formatCurrency(row.objetivo, 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <div className={row.desviacion < 0 ? 'text-red-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                            {row.desviacion > 0 ? '+' : ''}{formatCurrency(row.desviacion, 0)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <div className="flex flex-col items-end">
                            <span className={`font-bold ${row.porcentajeCumplimiento >= 100 ? 'text-emerald-600 dark:text-emerald-400' : row.porcentajeCumplimiento >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'}`}>
                              {formatNumber(row.porcentajeCumplimiento, 1)}%
                            </span>
                            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${row.porcentajeCumplimiento >= 100 ? 'bg-emerald-500' : row.porcentajeCumplimiento >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(100, Math.max(0, row.porcentajeCumplimiento))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </>
                    )}

                    {/* SUBTAB CONTABLE DATA */}
                    {activeSubTab === 'accounting' && (
                      <>
                        <td className="px-4 py-3 text-right font-mono text-gray-600 dark:text-gray-300">
                          {formatCurrency(row.facturasOrdinarias, 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-cyan-600 dark:text-cyan-400 font-medium">
                          {row.prepagosFacturados > 0 ? formatCurrency(row.prepagosFacturados, 0) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-rose-500 font-medium">
                          {row.abonos > 0 ? `-${formatCurrency(row.abonos, 0)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-dts-primary dark:text-white">
                          {formatCurrency(row.facturacionTotal, 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-amber-600 dark:text-amber-400">
                          {row.portes ? formatCurrency(row.portes, 0) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-purple-600 dark:text-purple-400">
                          {row.otrasCuentas ? formatCurrency(row.otrasCuentas, 0) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {row.prepagosVivos > 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40">
                              {formatCurrency(row.prepagosVivos, 0)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </>
                    )}

                    {/* SUBTAB CARTERA Y PREVISIÓN DATA */}
                    {activeSubTab === 'pipeline' && (
                      <>
                        <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                          {formatCurrency(row.facturacion, 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-gray-900 dark:text-white">
                          {formatCurrency(row.cartera, 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-amber-600 dark:text-amber-400 font-medium">
                          {formatCurrency(row.enviadosFacturar, 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-cyan-600 dark:text-cyan-400">
                          {row.prepagosDescontados > 0 ? `-${formatCurrency(row.prepagosDescontados, 0)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {row.countNuevosClientes > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                                {row.countNuevosClientes} {row.countNuevosClientes === 1 ? 'cliente' : 'clientes'}
                              </span>
                              {row.facturacionNuevos > 0 && (
                                <span className="text-[10px] text-gray-500 font-sans mt-0.5">
                                  {formatCurrency(row.facturacionNuevos, 0)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(row.previsionCierre, 0)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
        {data.length > 0 && (
          <div className="h-10 shrink-0 overflow-y-hidden border-t border-white/10 bg-dts-primary text-white [scrollbar-gutter:stable]">
            <table className="h-full w-full table-fixed border-separate border-spacing-0 text-left text-[10px] leading-3 font-bold uppercase">
          {columns}
            <tbody>
              <tr>
                {activeSubTab === 'performance' && (
                  <>
                    <td className="px-4 py-1 align-middle tracking-widest font-black">
                      TOTAL EQUIPO COMERCIAL
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono">
                      {formatCurrency(totals.productoFacturas, 0)}
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono text-rose-300">
                      {totals.productoAbonos > 0 ? `-${formatCurrency(totals.productoAbonos, 0)}` : '-'}
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono text-dts-secondary font-black">
                      {formatCurrency(totals.facturacion, 0)}
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono opacity-70">
                      {totals.facturacionAnioAnterior ? formatCurrency(totals.facturacionAnioAnterior, 0) : '-'}
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono">
                      {formatCurrency(totals.objetivo, 0)}
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono">
                      <div className={`relative leading-3 ${totalDesviacion < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {totalDesviacion > 0 ? '+' : ''}{formatCurrency(totalDesviacion, 0)}
                        <span className={`absolute right-0 top-full whitespace-nowrap text-[9px] leading-none ${totalDesviacionPct < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {totalDesviacionPct > 0 ? '+' : ''}{formatNumber(totalDesviacionPct, 1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono">
                      <div className={totalCumplimiento < 100 ? 'text-red-400 font-black' : 'text-emerald-400 font-black'}>
                        {formatNumber(totalCumplimiento, 1)}%
                      </div>
                    </td>
                  </>
                )}

                {activeSubTab === 'accounting' && (
                  <>
                    <td className="px-4 py-1 align-middle tracking-widest font-black">
                      TOTAL EQUIPO COMERCIAL
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono">
                      {formatCurrency(totals.facturasOrdinarias, 0)}
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono text-cyan-300">
                      {totals.prepagosFacturados > 0 ? formatCurrency(totals.prepagosFacturados, 0) : '-'}
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono text-rose-300">
                      {totals.abonos > 0 ? `-${formatCurrency(totals.abonos, 0)}` : '-'}
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono font-black text-dts-secondary">
                      {formatCurrency(totals.facturacionTotal, 0)}
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono text-amber-300">
                      {formatCurrency(totals.portes, 0)}
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono text-purple-300">
                      {formatCurrency(totals.otrasCuentas, 0)}
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono text-cyan-200">
                      {totals.prepagosVivos > 0 ? formatCurrency(totals.prepagosVivos, 0) : '-'}
                    </td>
                  </>
                )}

                {activeSubTab === 'pipeline' && (
                  <>
                    <td className="px-4 py-1 align-middle tracking-widest font-black">
                      TOTAL EQUIPO COMERCIAL
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono">
                      {formatCurrency(totals.facturacion, 0)}
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono font-bold">
                      {formatCurrency(totals.cartera, 0)}
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono text-amber-300 font-bold">
                      {formatCurrency(totals.enviadosFacturar, 0)}
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono text-cyan-300">
                      {totals.prepagosDescontados > 0 ? `-${formatCurrency(totals.prepagosDescontados, 0)}` : '-'}
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono">
                      <span className="font-bold">{totals.countNuevosClientes} Clientes</span>
                    </td>
                    <td className="px-4 py-1 align-middle text-right font-mono text-emerald-300 font-black">
                      {formatCurrency(totals.previsionCierre, 0)}
                    </td>
                  </>
                )}
              </tr>
            </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
