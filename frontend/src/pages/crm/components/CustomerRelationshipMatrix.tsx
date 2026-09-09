import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, TrendingUp, TrendingDown, 
  Download, 
  Sparkles, ShieldAlert,
  ChevronRight, UserCheck, Calendar
} from 'lucide-react';
import { 
  getCustomerRelationshipMatrix, 
  CLIENT_TYPES,
  type CustomerRelationshipBlock,
  type CustomerRelationshipRow,
  type CustomerRelationshipSubtotal
} from '../../../api/customers';
import { formatCurrency, formatNumber } from '../../../api/formatters';
import { exportToXlsx } from '../../../utils/exportToXlsx';

interface CustomerRelationshipMatrixProps {
  onDrillDown: (filters: { clientType?: string; salespersonCode?: string }) => void;
  defaultSalesperson?: string;
  isCommercialUser?: boolean;
}

export const CustomerRelationshipMatrix: React.FC<CustomerRelationshipMatrixProps> = ({
  onDrillDown,
  defaultSalesperson,
  isCommercialUser = false,
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [limitToToday, setLimitToToday] = useState<boolean>(true);
  const [activeCommercialTab, setActiveCommercialTab] = useState<string>(
    isCommercialUser && defaultSalesperson ? defaultSalesperson : 'TOTAL'
  );

  // Datos de la matriz
  const { data: matrixData, isLoading, isError, refetch } = useQuery({
    queryKey: ['customer-relationship-matrix', selectedYear, limitToToday],
    queryFn: () => getCustomerRelationshipMatrix({
      year: selectedYear,
      limitToToday,
    }),
  });

  const totalGlobal = matrixData?.totalGlobal;

  // Filtrar Joaquim Pla de los bloques de comerciales y aplicar filtro de rol comercial si procede
  const filteredCommercials = useMemo(() => {
    const raw = (matrixData?.commercials || []).filter((c: CustomerRelationshipBlock) => 
      c.salespersonCode !== 'JPL' && 
      !c.salespersonName.toLowerCase().includes('joaquim')
    );
    if (isCommercialUser && defaultSalesperson) {
      return raw.filter((c: CustomerRelationshipBlock) => c.salespersonCode === defaultSalesperson);
    }
    return raw;
  }, [matrixData?.commercials, isCommercialUser, defaultSalesperson]);

  // Bloque activo para la tabla y métricas (Total Empresa o Comercial seleccionado)
  const activeBlock = useMemo(() => {
    if (!totalGlobal) return null;
    if (activeCommercialTab === 'TOTAL') {
      return totalGlobal;
    }
    return filteredCommercials.find((c: CustomerRelationshipBlock) => c.salespersonCode === activeCommercialTab) || totalGlobal;
  }, [activeCommercialTab, totalGlobal, filteredCommercials]);

  // Exportar a Excel
  const handleExportExcel = () => {
    if (!matrixData) return;

    const exportRows: any[] = [];

    const appendBlockRows = (block: CustomerRelationshipBlock) => {
      block.rows.forEach(r => {
        exportRows.push({
          comercial: block.salespersonName,
          codigoTipo: r.code,
          tipoCliente: r.label,
          facturacionActual: r.facturacion,
          pctFacturacion: `${r.facturacionPct}%`,
          facturacionAnterior: r.facturacionPrevYear,
          varYoY: `${r.variacionYoYPct}%`,
          numClientes: r.numClientes,
          pctClientes: `${r.clientesPct}%`,
        });
      });

      // Subtotal 1
      exportRows.push({
        comercial: block.salespersonName,
        codigoTipo: 'A+B',
        tipoCliente: block.subtotalLoyalty.label,
        facturacionActual: block.subtotalLoyalty.facturacion,
        pctFacturacion: `${block.subtotalLoyalty.facturacionPct}%`,
        facturacionAnterior: block.subtotalLoyalty.facturacionPrevYear,
        varYoY: `${block.subtotalLoyalty.variacionYoYPct}%`,
        numClientes: block.subtotalLoyalty.numClientes,
        pctClientes: `${block.subtotalLoyalty.clientesPct}%`,
      });

      // Subtotal 2
      exportRows.push({
        comercial: block.salespersonName,
        codigoTipo: 'C+D+E+F',
        tipoCliente: block.subtotalOpportunity.label,
        facturacionActual: block.subtotalOpportunity.facturacion,
        pctFacturacion: `${block.subtotalOpportunity.facturacionPct}%`,
        facturacionAnterior: block.subtotalOpportunity.facturacionPrevYear,
        varYoY: `${block.subtotalOpportunity.variacionYoYPct}%`,
        numClientes: block.subtotalOpportunity.numClientes,
        pctClientes: `${block.subtotalOpportunity.clientesPct}%`,
      });

      // Total
      exportRows.push({
        comercial: block.salespersonCode === 'TOTAL' ? 'Total Empresa' : block.salespersonName,
        codigoTipo: 'TOTAL',
        tipoCliente: block.salespersonCode === 'TOTAL' ? 'TOTAL dTS' : `TOTAL ${block.salespersonName}`,
        facturacionActual: block.total.facturacion,
        pctFacturacion: '100.0%',
        facturacionAnterior: block.total.facturacionPrevYear,
        varYoY: `${block.total.variacionYoYPct}%`,
        numClientes: block.total.numClientes,
        pctClientes: '100.0%',
      });

      // Separador
      exportRows.push({});
    };

    if (totalGlobal) {
      appendBlockRows(totalGlobal);
    }

    filteredCommercials.forEach((c: CustomerRelationshipBlock) => {
      appendBlockRows(c);
    });

    const columns = [
      { key: 'comercial', label: 'Comercial' },
      { key: 'codigoTipo', label: 'Código' },
      { key: 'tipoCliente', label: 'Tipo de Relación' },
      { key: 'facturacionActual', label: `Facturación ${selectedYear} (€)`, format: (v: any) => typeof v === 'number' ? formatCurrency(v, 2) : v },
      { key: 'pctFacturacion', label: '% s/Fact.' },
      { key: 'facturacionAnterior', label: `Facturación ${selectedYear - 1} (€)`, format: (v: any) => typeof v === 'number' ? formatCurrency(v, 2) : v },
      { key: 'varYoY', label: 'Var. YoY (%)' },
      { key: 'numClientes', label: 'Nº Clientes' },
      { key: 'pctClientes', label: '% s/Clientes' },
    ];

    exportToXlsx(exportRows, columns, `matriz_relacion_clientes_${selectedYear}`);
  };

  // Renderizador de una fila estándar (A, B, C, D, E, F)
  const renderRow = (
    row: CustomerRelationshipRow, 
    salespersonCode?: string, 
    salespersonName?: string
  ) => {
    const typeDef = CLIENT_TYPES[row.code];
    const isPositiveYoY = row.variacionYoYPct >= 0;

    return (
      <tr 
        key={row.code}
        onClick={() => onDrillDown({ 
          clientType: row.code === 'SIN_CLASIFICAR' ? undefined : row.code, 
          salespersonCode: salespersonCode === 'TOTAL' ? undefined : salespersonCode 
        })}
        className="group hover:bg-dts-primary/5 dark:hover:bg-dts-primary/20 transition-colors cursor-pointer border-b border-gray-100 dark:border-gray-800/60"
        title={`Clic para ver los clientes tipo ${row.label} de ${salespersonName || 'la empresa'}`}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-2.5">
            {typeDef ? (
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-black border ${typeDef.badgeBg} ${typeDef.badgeColor} ${typeDef.badgeBorder}`}>
                {row.code}
              </span>
            ) : (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold bg-gray-100 text-gray-500">
                -
              </span>
            )}
            <div>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-100 group-hover:text-dts-secondary transition-colors">
                {row.label}
              </span>
              {typeDef && (
                <p className="text-[10px] text-gray-400 font-normal line-clamp-1 max-w-xs">
                  {typeDef.description}
                </p>
              )}
            </div>
          </div>
        </td>

        {/* Facturación Año Actual */}
        <td className="py-3 px-4 text-right font-mono font-bold text-xs text-dts-primary dark:text-white">
          {formatCurrency(row.facturacion, 0)}
        </td>

        {/* % s/Facturación */}
        <td className="py-3 px-4 text-right font-mono text-xs text-gray-600 dark:text-gray-300 font-medium">
          <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-[11px] font-bold">
            {formatNumber(row.facturacionPct, 1)}%
          </span>
        </td>

        {/* Facturación Año Anterior */}
        <td className="py-3 px-4 text-right font-mono text-xs text-gray-500 dark:text-gray-400">
          {formatCurrency(row.facturacionPrevYear, 0)}
        </td>

        {/* Var. YoY */}
        <td className="py-3 px-4 text-right font-mono text-xs">
          <div className="flex items-center justify-end gap-1">
            {row.facturacionPrevYear > 0 ? (
              <>
                {isPositiveYoY ? (
                  <TrendingUp size={13} className="text-emerald-500" />
                ) : (
                  <TrendingDown size={13} className="text-red-500" />
                )}
                <span className={`font-bold ${isPositiveYoY ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {row.variacionYoYPct > 0 ? `+${formatNumber(row.variacionYoYPct, 1)}%` : `${formatNumber(row.variacionYoYPct, 1)}%`}
                </span>
              </>
            ) : (
              <span className="text-gray-400 text-[11px]">-</span>
            )}
          </div>
        </td>

        {/* Nº Clientes */}
        <td className="py-3 px-4 text-right font-mono font-bold text-xs text-gray-800 dark:text-gray-200">
          {row.numClientes}
        </td>

        {/* % s/Clientes */}
        <td className="py-3 px-4 text-right font-mono text-xs text-gray-500 dark:text-gray-400">
          {formatNumber(row.clientesPct, 1)}%
        </td>

        {/* Acción Drill-Down */}
        <td className="py-3 px-4 text-center">
          <button 
            type="button"
            className="text-gray-400 group-hover:text-dts-secondary p-1 rounded hover:bg-dts-secondary/10 transition-all inline-flex items-center gap-1 text-[10px] font-semibold"
          >
            <span>Ver</span>
            <ChevronRight size={13} />
          </button>
        </td>
      </tr>
    );
  };

  // Renderizador de una fila de subtotal
  const renderSubtotal = (
    subtotal: CustomerRelationshipSubtotal, 
    bgClass: string, 
    accentColor: string
  ) => {
    return (
      <tr className={`border-y border-gray-200 dark:border-gray-700 font-semibold ${bgClass}`}>
        <td className="py-2.5 px-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${accentColor}`} />
            <span className="text-xs uppercase tracking-wider font-bold text-gray-800 dark:text-gray-100">
              {subtotal.label}
            </span>
          </div>
        </td>
        <td className="py-2.5 px-4 text-right font-mono font-bold text-xs text-dts-primary dark:text-white">
          {formatCurrency(subtotal.facturacion, 0)}
        </td>
        <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-dts-primary dark:text-cyan-300">
          <span className="px-2 py-0.5 rounded bg-white/70 dark:bg-black/30 border border-gray-200 dark:border-gray-700 shadow-sm text-[11px]">
            {formatNumber(subtotal.facturacionPct, 1)}%
          </span>
        </td>
        <td className="py-2.5 px-4 text-right font-mono text-xs text-gray-600 dark:text-gray-300">
          {formatCurrency(subtotal.facturacionPrevYear, 0)}
        </td>
        <td className="py-2.5 px-4 text-right font-mono text-xs">
          {subtotal.facturacionPrevYear > 0 ? (
            <span className={`font-bold ${subtotal.variacionYoYPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {subtotal.variacionYoYPct > 0 ? `+${formatNumber(subtotal.variacionYoYPct, 1)}%` : `${formatNumber(subtotal.variacionYoYPct, 1)}%`}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
        <td className="py-2.5 px-4 text-right font-mono font-bold text-xs text-gray-800 dark:text-gray-100">
          {subtotal.numClientes}
        </td>
        <td className="py-2.5 px-4 text-right font-mono text-xs text-gray-600 dark:text-gray-300">
          {formatNumber(subtotal.clientesPct, 1)}%
        </td>
        <td className="py-2.5 px-4 text-center"></td>
      </tr>
    );
  };

  // Renderizador de la tabla para un bloque completo
  const renderTableBlock = (block: CustomerRelationshipBlock) => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003E51] text-white text-[10px] font-bold uppercase tracking-wider">
              <th className="py-3 px-4 rounded-tl-lg">Tipo de Relación</th>
              <th className="py-3 px-4 text-right">Facturación {selectedYear} (€)</th>
              <th className="py-3 px-4 text-right">% Fact.</th>
              <th className="py-3 px-4 text-right">Facturación {selectedYear - 1} (€)</th>
              <th className="py-3 px-4 text-right">Var. YoY</th>
              <th className="py-3 px-4 text-right">Nº Clientes</th>
              <th className="py-3 px-4 text-right">% Clientes</th>
              <th className="py-3 px-4 text-center rounded-tr-lg">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-surface-card-dark text-gray-700 dark:text-gray-200">
            {/* Grupo 1: Cautivos (A) y Habituales (B) */}
            {block.rows.filter(r => r.code === 'A' || r.code === 'B').map(r => 
              renderRow(r, block.salespersonCode, block.salespersonName)
            )}

            {/* Subtotal Grupo 1 */}
            {renderSubtotal(block.subtotalLoyalty, 'bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200', 'bg-emerald-500')}

            {/* Grupo 2: Ocasionales (C), Nuevos (D), Potenciales (E), Inactivos (F) y Sin Clasificar */}
            {block.rows.filter(r => ['C', 'D', 'E', 'F', 'SIN_CLASIFICAR'].includes(r.code)).map(r => 
              renderRow(r, block.salespersonCode, block.salespersonName)
            )}

            {/* Subtotal Grupo 2 */}
            {renderSubtotal(block.subtotalOpportunity, 'bg-cyan-50/40 dark:bg-cyan-950/20 text-cyan-950 dark:text-cyan-200', 'bg-[#00B0B9]')}

            {/* Fila Total General */}
            <tr className="bg-gray-100 dark:bg-[#002A38] text-gray-900 dark:text-white font-black text-xs border-t-2 border-[#003E51] dark:border-[#00B0B9]">
              <td className="py-3.5 px-4 tracking-wider">
                {block.salespersonCode === 'TOTAL' ? (
                  <span className="font-black">TOTAL <span className="normal-case">dTS</span></span>
                ) : (
                  <span className="font-black uppercase">TOTAL {block.salespersonName}</span>
                )}
              </td>
              <td className="py-3.5 px-4 text-right font-mono text-sm text-[#003E51] dark:text-[#00B0B9]">
                {formatCurrency(block.total.facturacion, 0)}
              </td>
              <td className="py-3.5 px-4 text-right font-mono">
                100.0%
              </td>
              <td className="py-3.5 px-4 text-right font-mono text-gray-600 dark:text-gray-300">
                {formatCurrency(block.total.facturacionPrevYear, 0)}
              </td>
              <td className="py-3.5 px-4 text-right font-mono">
                <span className={`px-2 py-0.5 rounded text-[11px] ${block.total.variacionYoYPct >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'}`}>
                  {block.total.variacionYoYPct > 0 ? `+${formatNumber(block.total.variacionYoYPct, 1)}%` : `${formatNumber(block.total.variacionYoYPct, 1)}%`}
                </span>
              </td>
              <td className="py-3.5 px-4 text-right font-mono text-sm">
                {block.total.numClientes}
              </td>
              <td className="py-3.5 px-4 text-right font-mono">
                100.0%
              </td>
              <td className="py-3.5 px-4 text-center">
                <button
                  type="button"
                  onClick={() => onDrillDown({ 
                    salespersonCode: block.salespersonCode === 'TOTAL' ? undefined : block.salespersonCode 
                  })}
                  className="text-xs text-dts-secondary hover:underline font-bold"
                >
                  Ver clientes
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* Barra Superior de Control y Filtros */}
      <div className="bg-white dark:bg-surface-card-dark p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Ejercicio */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={13} />
              Ejercicio
            </span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-dts-primary dark:text-white font-bold rounded-lg px-3 py-1.5 text-xs outline-none font-mono shadow-sm hover:border-dts-secondary transition-colors"
            >
              {[2026, 2025, 2024, 2023].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Toggle YTD vs LYTD día a día */}
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none bg-gray-50 dark:bg-gray-800/60 px-3 py-1.5 rounded-lg border border-gray-200/60 dark:border-gray-700">
            <input
              type="checkbox"
              checked={limitToToday}
              onChange={(e) => setLimitToToday(e.target.checked)}
              className="rounded text-dts-secondary focus:ring-dts-secondary h-4 w-4"
            />
            <span>Corte YTD día a día</span>
            <span className="text-[10px] text-gray-400 font-normal hidden sm:inline">(evita sesgos con meses incompletos)</span>
          </label>
        </div>

        {/* Acciones: Exportar a Excel */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={handleExportExcel}
            disabled={isLoading || !matrixData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            title="Descargar matriz en Excel"
          >
            <Download size={14} className="text-emerald-600" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white dark:bg-surface-card-dark p-12 rounded-xl border border-gray-100 dark:border-gray-800 text-center space-y-3 shadow-sm animate-pulse">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-dts-secondary"></div>
          <p className="text-sm font-semibold text-gray-500">Calculando matriz de clientes y comparativas...</p>
        </div>
      )}

      {isError && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 p-6 rounded-xl text-center space-y-3">
          <ShieldAlert className="mx-auto text-red-500" size={32} />
          <p className="text-sm font-bold text-red-700 dark:text-red-300">
            Ocurrió un error al cargar la matriz de clientes.
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !isError && totalGlobal && activeBlock && (
        <>
          {/* Bloque Resumen Ejecutivo Pareto */}
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-surface-card-dark dark:to-[#002A38]/50 p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#00B0B9]" />
                <h3 className="text-sm font-black uppercase tracking-wider text-dts-primary dark:text-white">
                  Equilibrio Estratégico de Cartera (Ley de Pareto)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                <span className="uppercase">Ejercicio {selectedYear} {limitToToday ? 'YTD' : 'Anual'}</span> · <span className="text-dts-secondary font-black">{activeBlock.salespersonCode === 'TOTAL' ? 'dTS' : activeBlock.salespersonName}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tarjeta Retención */}
              <div className="bg-white dark:bg-[#00232F] p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase text-emerald-800 dark:text-emerald-300 tracking-wider flex items-center gap-1.5">
                    <UserCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                    Bloque Retención & Lealtad (A + B)
                  </span>
                  <span className="text-xs font-black font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    {formatNumber(activeBlock.subtotalLoyalty.facturacionPct, 1)}% Facturación
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Facturación Total</span>
                    <span className="text-lg font-black font-mono text-dts-primary dark:text-white">
                      {formatCurrency(activeBlock.subtotalLoyalty.facturacion, 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Nº Clientes</span>
                    <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {activeBlock.subtotalLoyalty.numClientes} <span className="text-xs font-normal text-gray-400">({formatNumber(activeBlock.subtotalLoyalty.clientesPct, 1)}%)</span>
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 italic">
                  Clientes Cautivos y Habituales que concentran el núcleo del volumen de negocio.
                </p>
              </div>

              {/* Tarjeta Desarrollo */}
              <div className="bg-white dark:bg-[#00232F] p-4 rounded-xl border border-cyan-200 dark:border-cyan-800/40 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase text-cyan-900 dark:text-cyan-300 tracking-wider flex items-center gap-1.5">
                    <Users size={14} className="text-[#00B0B9]" />
                    Bloque Desarrollo & Oportunidades (C + D + E + F)
                  </span>
                  <span className="text-xs font-black font-mono text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800">
                    {formatNumber(activeBlock.subtotalOpportunity.facturacionPct, 1)}% Facturación
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Facturación Total</span>
                    <span className="text-lg font-black font-mono text-dts-primary dark:text-white">
                      {formatCurrency(activeBlock.subtotalOpportunity.facturacion, 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Nº Clientes</span>
                    <span className="text-lg font-black font-mono text-[#00B0B9]">
                      {activeBlock.subtotalOpportunity.numClientes} <span className="text-xs font-normal text-gray-400">({formatNumber(activeBlock.subtotalOpportunity.clientesPct, 1)}%)</span>
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 italic">
                  Clientes Ocasionales, Nuevos, Potenciales e Inactivos para reactivación y crecimiento.
                </p>
              </div>
            </div>

            {/* Barra Visual Proporcional Pareto */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[11px] font-bold text-gray-500">
                <span className="text-emerald-600 dark:text-emerald-400">
                  Retención: {formatNumber(activeBlock.subtotalLoyalty.facturacionPct, 1)}% ventas / {formatNumber(activeBlock.subtotalLoyalty.clientesPct, 1)}% cuentas
                </span>
                <span className="text-[#00B0B9]">
                  Desarrollo: {formatNumber(activeBlock.subtotalOpportunity.facturacionPct, 1)}% ventas / {formatNumber(activeBlock.subtotalOpportunity.clientesPct, 1)}% cuentas
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${Math.min(100, activeBlock.subtotalLoyalty.facturacionPct)}%` }}
                  title={`Retención: ${formatNumber(activeBlock.subtotalLoyalty.facturacionPct, 1)}%`}
                />
                <div 
                  className="h-full bg-[#00B0B9] transition-all duration-500" 
                  style={{ width: `${Math.min(100, activeBlock.subtotalOpportunity.facturacionPct)}%` }}
                  title={`Desarrollo: ${formatNumber(activeBlock.subtotalOpportunity.facturacionPct, 1)}%`}
                />
              </div>
            </div>
          </div>

          {/* Sección de la Tabla Unificada de Análisis */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#003E51] dark:bg-[#00B0B9]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-dts-primary dark:text-white">
                  Matriz de Análisis por Tipo de Relación
                </h2>
              </div>

              {/* Selector de Total Empresa / Comerciales */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Opción Total Empresa */}
                <button
                  key="TOTAL"
                  onClick={() => setActiveCommercialTab('TOTAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeCommercialTab === 'TOTAL'
                      ? 'bg-[#003E51] text-white shadow-sm shadow-[#003E51]/20 border border-[#003E51]'
                      : 'bg-white dark:bg-surface-card-dark text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
                  }`}
                >
                  Total Empresa
                </button>

                {/* Comerciales individuales */}
                {filteredCommercials.map((c: CustomerRelationshipBlock) => (
                  <button
                    key={c.salespersonCode}
                    onClick={() => setActiveCommercialTab(c.salespersonCode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeCommercialTab === c.salespersonCode
                        ? 'bg-[#003E51] text-white shadow-sm shadow-[#003E51]/20 border border-[#003E51]'
                        : 'bg-white dark:bg-surface-card-dark text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    {c.salespersonName}
                  </button>
                ))}
              </div>
            </div>

            {/* Única tabla de análisis para el bloque activo */}
            <div className="bg-white dark:bg-surface-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-card overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${activeCommercialTab === 'TOTAL' ? 'bg-[#003E51] dark:bg-[#00B0B9]' : 'bg-dts-secondary'}`} />
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white tracking-wide">
                    {activeBlock.salespersonCode === 'TOTAL' ? (
                      <span>TOTAL EMPRESA (<span className="text-[#00B0B9] font-black">dTS</span>)</span>
                    ) : (
                      <span className="uppercase">{activeBlock.salespersonName}</span>
                    )} 
                    {activeBlock.salespersonCode !== 'TOTAL' && (
                      <span className="text-gray-400 text-xs font-normal ml-1">({activeBlock.salespersonCode})</span>
                    )}
                  </h4>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-gray-400 uppercase text-[10px] mr-1.5 font-sans font-semibold">Facturación:</span>
                    <span className="font-bold text-dts-primary dark:text-white">{formatCurrency(activeBlock.total.facturacion, 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 uppercase text-[10px] mr-1.5 font-sans font-semibold">Clientes:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{activeBlock.total.numClientes}</span>
                  </div>
                </div>
              </div>

              {renderTableBlock(activeBlock)}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
