import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileSpreadsheet, 
  Download, 
  Archive, 
  Percent, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Info, 
  Lock, 
  Unlock,
  Sparkles 
} from 'lucide-react';
import { getBudgetGeneratorMeta, downloadBudgetTemplates } from '../../../api/budgetGenerator';

export const BudgetGeneratorSection: React.FC = () => {
  const [priceIncreasePct, setPriceIncreasePct] = useState<number>(0);
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('');
  const [protectSheet, setProtectSheet] = useState<boolean>(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState<boolean>(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: meta, isLoading: isLoadingMeta } = useQuery({
    queryKey: ['budgetGeneratorMeta'],
    queryFn: getBudgetGeneratorMeta,
  });

  const currentYear = meta?.currentYear || new Date().getFullYear();
  const nextYear = meta?.nextYear || currentYear + 1;

  const handleDownload = async (asZip: boolean) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      if (asZip) {
        setIsDownloadingZip(true);
      } else {
        setIsDownloadingExcel(true);
      }

      await downloadBudgetTemplates({
        priceIncreasePct,
        salespersonCode: selectedSalesperson || undefined,
        asZip,
        protectSheet,
      });

      setSuccessMessage(
        asZip
          ? `Paquete ZIP de plantillas para ${nextYear} descargado con éxito.`
          : `Plantilla Excel para ${nextYear} descargada correctamente.`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error al generar plantilla:', err);
      setErrorMessage(err?.response?.data?.message || 'Error al generar y descargar el archivo.');
    } finally {
      setIsDownloadingExcel(false);
      setIsDownloadingZip(false);
    }
  };

  const quickPcts = [0, 2.5, 3.5, 5, 7];

  return (
    <section className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 shadow-sm space-y-6">
      {/* Header de la Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                Generador de Plantillas de Presupuestos ({nextYear})
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-dts-primary/10 text-dts-primary dark:bg-dts-secondary/15 dark:text-dts-secondary border border-dts-primary/20 dark:border-dts-secondary/30">
                <ShieldCheck size={11} className="stroke-[2.5]" /> Solo Administración
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl leading-relaxed">
              Crea los libros Excel oficiales con los datos consolidados de compras y cartera de <strong>{currentYear}</strong> para que el equipo comercial proyecte sus objetivos de venta de <strong>{nextYear}</strong>.
            </p>
          </div>
        </div>

        {/* Resumen del Ejercicio */}
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-800/40 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 shrink-0 self-start sm:self-center">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Año Base ➔ Objetivo</span>
            <span className="text-sm font-black text-dts-primary dark:text-dts-secondary font-mono">
              {currentYear} ➔ {nextYear}
            </span>
          </div>
        </div>
      </div>

      {/* Alertas de Feedback */}
      {successMessage && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold animate-in fade-in duration-200">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Formulario de Configuración de la Generación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Campo 1: Incremento de Precio (%) */}
        <div className="space-y-3 bg-gray-50/60 dark:bg-zinc-800/20 p-5 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Percent size={14} className="text-dts-secondary" />
                <span>Incremento de Precio Previsto para {nextYear}</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-dts-secondary bg-dts-secondary/10 px-2 py-0.5 rounded-md">
                +{priceIncreasePct}%
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Se aplicará automáticamente sobre el precio medio ponderado de {currentYear} para fijar el <strong>PrecioVentaUd {nextYear}</strong> (columna de solo lectura protegida en el Excel).
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="-50"
                max="100"
                value={priceIncreasePct}
                onChange={(e) => setPriceIncreasePct(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-white dark:bg-surface-card-dark border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dts-secondary focus:border-dts-secondary transition-all"
                placeholder="0.0"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
            </div>

            {/* Botones de incremento rápido */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-gray-400 uppercase font-bold mr-1">Rápido:</span>
              {quickPcts.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setPriceIncreasePct(pct)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    priceIncreasePct === pct
                      ? 'bg-dts-secondary text-white shadow-2xs'
                      : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Campo 2: Filtro por Comercial */}
        <div className="space-y-3 bg-gray-50/60 dark:bg-zinc-800/20 p-5 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
          <div>
            <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mb-1.5">
              <Users size={14} className="text-dts-secondary" />
              <span>Filtro por Vendedor Comercial</span>
            </label>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Puedes descargar el archivo de <strong>todos los comerciales</strong> o acotarlo a un vendedor en concreto si solo deseas emitir su hoja particular.
            </p>
          </div>

          <div className="pt-2">
            <select
              value={selectedSalesperson}
              onChange={(e) => setSelectedSalesperson(e.target.value)}
              disabled={isLoadingMeta}
              className="w-full px-3.5 py-2 text-xs font-bold bg-white dark:bg-surface-card-dark border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dts-secondary focus:border-dts-secondary transition-all cursor-pointer"
            >
              <option value="">Todos los Comerciales (Global)</option>
              {meta?.salesReps.map((rep) => (
                <option key={rep.code} value={rep.code}>
                  {rep.code} — {rep.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Opciones de Protección / Flexibilidad de Líneas */}
      <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-zinc-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 transition-colors ${protectSheet ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
            {protectSheet ? <Lock size={18} /> : <Unlock size={18} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {protectSheet ? 'Modo Protegido (Estructura y precios bloqueados)' : 'Modo Abierto / Desprotegido (Recomendado)'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${protectSheet ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'}`}>
                {protectSheet ? 'Solo Columnas N y O' : 'Nuevas Líneas Habilitadas'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 max-w-xl leading-normal">
              {protectSheet
                ? 'La hoja se protegerá contra cualquier modificación ajena a las columnas N y O. Los comerciales no podrán insertar filas nuevas.'
                : 'La hoja se genera completamente desprotegida para que los comerciales puedan <strong>insertar nuevas filas</strong> de productos o clientes no vendidos previamente y copiar las fórmulas libremente.'}
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer self-start sm:self-center shrink-0 px-3 py-2 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xs hover:border-gray-300">
          <input
            type="checkbox"
            checked={protectSheet}
            onChange={(e) => setProtectSheet(e.target.checked)}
            className="w-4 h-4 text-dts-primary focus:ring-dts-secondary rounded border-gray-300 dark:border-gray-600 cursor-pointer"
          />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 select-none">
            Proteger hoja con solo lectura
          </span>
        </label>
      </div>

      {/* Características del Excel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-cyan-50/40 dark:bg-cyan-950/20 rounded-xl border border-cyan-100 dark:border-cyan-900/40 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="p-1 rounded-md bg-dts-secondary/15 text-dts-secondary shrink-0 mt-0.5">
            <Percent size={13} />
          </div>
          <div>
            <span className="font-bold text-gray-900 dark:text-white block">Precios Sugeridos</span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
              PrecioVenta {nextYear} ({priceIncreasePct >= 0 ? `+${priceIncreasePct}%` : `${priceIncreasePct}%`}) calculado automáticamente en base al incremento oficial.
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="p-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <Sparkles size={13} />
          </div>
          <div>
            <span className="font-bold text-gray-900 dark:text-white block">Inserción de Nuevas Líneas</span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
              Los comerciales pueden <strong>insertar filas nuevas</strong> para productos/clientes adicionales y rellenar las columnas clave (en amarillo).
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="p-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
            <FileSpreadsheet size={13} />
          </div>
          <div>
            <span className="font-bold text-gray-900 dark:text-white block">Fórmulas Vivas Automáticas</span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
              <strong>€ Previsión</strong> y <strong>€ Objetivo</strong> calculan los importes en tiempo real y se pueden arrastrar o copiar a las nuevas filas.
            </span>
          </div>
        </div>
      </div>

      {/* Botones de Descarga */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Info size={14} />
          <span>El archivo generado incluye autofiltros, encabezados corporativos y paneles congelados.</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Botón 1: Descargar Excel Consolidado */}
          <button
            type="button"
            onClick={() => handleDownload(false)}
            disabled={isDownloadingExcel || isDownloadingZip}
            className="px-4 py-2.5 bg-dts-primary hover:bg-dts-primary/90 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isDownloadingExcel ? (
              <>
                <Loader2 size={15} className="animate-spin text-dts-secondary" />
                <span>Generando Excel...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>
                  {selectedSalesperson
                    ? `Descargar Excel (${selectedSalesperson})`
                    : `Descargar Excel Consolidado (${nextYear})`}
                </span>
              </>
            )}
          </button>

          {/* Botón 2: Descargar Paquete ZIP por Comercial */}
          <button
            type="button"
            onClick={() => handleDownload(true)}
            disabled={isDownloadingExcel || isDownloadingZip}
            className="px-4 py-2.5 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-dts-primary dark:text-white font-bold text-xs rounded-xl border border-gray-200 dark:border-gray-700 transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Genera un archivo ZIP con un Excel individual para cada comercial oficial"
          >
            {isDownloadingZip ? (
              <>
                <Loader2 size={15} className="animate-spin text-dts-secondary" />
                <span>Comprimiendo ZIP...</span>
              </>
            ) : (
              <>
                <Archive size={15} className="text-dts-secondary" />
                <span>Descargar Paquete ZIP por Comercial</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
export default BudgetGeneratorSection;
