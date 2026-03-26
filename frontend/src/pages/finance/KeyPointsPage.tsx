import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBalanceData, groupDataByYear } from '../../api/finance';
import { 
  BarChart, 
  Bar, 
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { TrendingUp, Info } from 'lucide-react';
import { formatCurrency } from '../../api/formatters';
import { InfoPopover } from '../../components/ui/InfoPopover';

interface YearData {
  year: number;
  [key: string]: number;
}

export const KeyPointsPage: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { data: rawRows, isLoading, error } = useQuery({
    queryKey: ['balanceData'],
    queryFn: getBalanceData,
  });

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() - 1);

  const data = useQueryData(rawRows || []);
  const yearData = data.find(d => d.year === selectedYear) as YearData | undefined;
  
  // Sync selected year when data loads: default to the latest COMPLETE year if available
  React.useEffect(() => {
    if (data.length > 0) {
      const fullYears = data.filter(d => !d.isEstimate);
      const defaultYear = fullYears.length > 0 ? fullYears[0].year : data[0].year;
      
      if (!data.find(d => d.year === selectedYear)) {
        setSelectedYear(defaultYear);
      }
    }
  }, [data, selectedYear]);

  if (isLoading || !isMounted) return <div className="p-8">Cargando datos...</div>;
  if (error) return <div className="p-8 text-red-500 text-center">Error al cargar datos financieros.</div>;

  // KPIs Calculations
  // ... (calculations remain same)
  const activoCirculante = yearData?.['1.B'] || 0;
  const pasivoCorto = yearData?.['2.C'] || 0;
  const pasivoLargo = yearData?.['2.B'] || 0;
  const totalPasivo = pasivoCorto + pasivoLargo;
  const patrimonioNeto = yearData?.['2.A'] || 0;
  const totalActivo = yearData?.['1.TOT'] || 0;

  const liquidezValue = pasivoCorto > 0 ? activoCirculante / pasivoCorto : 0;
  const capitalizacionValue = totalActivo > 0 ? (patrimonioNeto / totalActivo) * 100 : 0;
  const endeudamientoValue = patrimonioNeto > 0 ? totalPasivo / patrimonioNeto : 0;
  const garantiaValue = totalPasivo > 0 ? totalActivo / totalPasivo : 0;

  // Chart Data Preparation
  const activoChartData = [
    { 
      name: 'Activo', 
      'Fijo': yearData?.['1.A'] || 0, 
      'Existencias': yearData?.['1.B.II'] || 0, 
      'Realizable': yearData?.['1.B.III'] || 0, 
      'Disponible': yearData?.['1.B.VII'] || 0 
    }
  ];

  const pasivoChartData = [
    { 
      name: 'PN y Pasivo', 
      'Patrimonio Neto': patrimonioNeto, 
      'Largo Plazo': pasivoLargo, 
      'Corto Plazo': pasivoCorto 
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header & Year Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-surface-card-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-medium text-dts-primary dark:text-white uppercase tracking-tight">Análisis de 4 Puntos Clave</h1>
            <InfoPopover 
              title="4 Puntos Clave del Balance"
              description="Visión ejecutiva de la salud del balance a través de las 4 métricas más vitales: Liquidez, Capitalización, Endeudamiento y Garantía patrimonial."
              objective="Ofrecer un resumen rápido y visual del estado del balance para la alta dirección sin requerir análisis profundo de las partidas contables."
              iconSize={20}
            />
          </div>
          <p className="text-sm text-gray-500">Referidos al Balance del año <span className="font-medium text-dts-secondary">{selectedYear} {yearData?.isEstimate ? '(ESTIMADO)' : ''}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Balance a analizar:</label>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-gray-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-dts-secondary focus:border-dts-secondary block w-40 p-2.5 outline-none transition-all shadow-sm"
          >
            {data.map(d => (
              <option key={d.year} value={d.year}>
                {d.year} {d.isEstimate ? '(EST.)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Section: Tables & Distribution Charts */}
        <div className="xl:col-span-4 space-y-6">
          {/* Table ACTIVO */}
          <div className="bg-white dark:bg-surface-card-dark border-2 border-dts-primary/20 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-dts-primary/10 px-4 py-2 font-medium text-dts-primary dark:text-dts-secondary text-sm flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="opacity-60 font-bold">1</span>
                <span className="tracking-wide">ACTIVO</span>
              </div>
              <span className="font-bold">{totalActivo.toLocaleString('de-DE')}</span>
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr className="bg-gray-50/50 dark:bg-white/5 font-medium">
                  <td className="px-4 py-2 dark:text-gray-300">ACTIVO FIJO</td>
                  <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{(yearData?.['1.A'] || 0).toLocaleString('de-DE')}</td>
                  <td className="px-4 py-2 text-right text-dts-primary dark:text-dts-secondary">{(totalActivo > 0 ? ((yearData?.['1.A'] || 0) / totalActivo * 100).toFixed(1) : 0)}%</td>
                </tr>
                <tr className="bg-dts-secondary/5 font-medium">
                  <td className="px-4 py-2 dark:text-gray-300">ACTIVO CIRCULANTE</td>
                  <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{activoCirculante.toLocaleString('de-DE')}</td>
                  <td className="px-4 py-2 text-right text-dts-secondary font-medium">{(totalActivo > 0 ? (activoCirculante / totalActivo * 100).toFixed(1) : 0)}%</td>
                </tr>
                <tr className="text-gray-500">
                  <td className="px-6 py-1.5 italic dark:text-gray-400">Existencias</td>
                  <td className="px-4 py-1.5 text-right dark:text-gray-200">{(yearData?.['1.B.II'] || 0).toLocaleString('de-DE')}</td>
                  <td className="px-4 py-1.5 text-right dark:text-gray-400">{(totalActivo > 0 ? ((yearData?.['1.B.II'] || 0) / totalActivo * 100).toFixed(1) : 0)}%</td>
                </tr>
                <tr className="text-gray-500">
                  <td className="px-6 py-1.5 italic dark:text-gray-400">Realizable</td>
                  <td className="px-4 py-1.5 text-right dark:text-gray-200">{(yearData?.['1.B.III'] || 0).toLocaleString('de-DE')}</td>
                  <td className="px-4 py-1.5 text-right dark:text-gray-400">{(totalActivo > 0 ? ((yearData?.['1.B.III'] || 0) / totalActivo * 100).toFixed(1) : 0)}%</td>
                </tr>
                <tr className="text-gray-500 border-b-2 border-gray-200 dark:border-gray-700">
                  <td className="px-6 py-1.5 italic dark:text-gray-400">Disponible</td>
                  <td className="px-4 py-1.5 text-right dark:text-gray-200">{(yearData?.['1.B.VII'] || 0).toLocaleString('de-DE')}</td>
                  <td className="px-4 py-1.5 text-right dark:text-gray-400">{(totalActivo > 0 ? ((yearData?.['1.B.VII'] || 0) / totalActivo * 100).toFixed(1) : 0)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table PASIVO */}
          <div className="bg-white dark:bg-surface-card-dark border-2 border-gray-800/20 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-800 text-white px-4 py-2 font-medium text-sm flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="opacity-60 font-bold">2</span>
                <span className="tracking-wide uppercase">Patrimonio Neto y Pasivo</span>
              </div>
              <span className="font-bold">{totalActivo.toLocaleString('de-DE')}</span>
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr className="bg-gray-50/50 dark:bg-white/5 font-medium">
                  <td className="px-4 py-2 uppercase dark:text-gray-300">Patrimonio Neto</td>
                  <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{patrimonioNeto.toLocaleString('de-DE')}</td>
                  <td className="px-4 py-2 text-right text-dts-primary dark:text-dts-secondary">{(totalActivo > 0 ? (patrimonioNeto / totalActivo * 100).toFixed(1) : 0)}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">Pasivo LARGO PLAZO</td>
                  <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-200">{pasivoLargo.toLocaleString('de-DE')}</td>
                  <td className="px-4 py-2 text-right text-gray-400">{(totalActivo > 0 ? (pasivoLargo / totalActivo * 100).toFixed(1) : 0)}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">Pasivo CORTO PLAZO</td>
                  <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-200">{pasivoCorto.toLocaleString('de-DE')}</td>
                  <td className="px-4 py-2 text-right text-gray-400">{(totalActivo > 0 ? (pasivoCorto / totalActivo * 100).toFixed(1) : 0)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Distribution Visual Chart */}
          {/* Distribution Visual Chart */}
          <div className="grid grid-cols-2 gap-4 h-80 mt-12 mb-6">
             <div className="flex flex-col items-center">
                <p className="text-[10px] font-medium text-gray-400 uppercase mb-4">Composición Activo</p>
                <div style={{ height: 280, width: '100%' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={activoChartData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                      <Tooltip 
                        cursor={false}
                        labelFormatter={() => "Desglose Activo"}
                        formatter={(val) => formatCurrency(Number(val))}
                        contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#1e293b' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#00B0B9', fontWeight: 'bold', marginBottom: '4px' }}
                      />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '9px', paddingTop: '15px' }} />
                      <Bar dataKey="Fijo" stackId="a" fill="#94A3B8" />
                      <Bar dataKey="Existencias" stackId="a" fill="#10B981" />
                      <Bar dataKey="Realizable" stackId="a" fill="#003E51" />
                      <Bar dataKey="Disponible" stackId="a" fill="#00B0B9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
             <div className="flex flex-col items-center">
                <p className="text-[10px] font-medium text-gray-400 uppercase mb-4">Composición Pasivo</p>
                <div style={{ height: 280, width: '100%' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={pasivoChartData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                      <Tooltip 
                        cursor={false}
                        labelFormatter={() => "Desglose Pasivo"}
                        formatter={(val) => formatCurrency(Number(val))}
                        contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#1e293b' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#00B0B9', fontWeight: 'bold', marginBottom: '4px' }}
                      />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '9px', paddingTop: '15px' }} />
                      <Bar dataKey="Patrimonio Neto" stackId="b" fill="#3B82F6" />
                      <Bar dataKey="Largo Plazo" stackId="b" fill="#64748B" />
                      <Bar dataKey="Corto Plazo" stackId="b" fill="#F87171" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        </div>

        {/* Right Section: Status Cards Analysis */}
        <div className="xl:col-span-8 flex flex-col">
          <div className="bg-[#FFFFE0] dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/30 p-4 rounded-xl mb-6 flex items-center justify-between shadow-sm">
             <h2 className="text-xl font-medium text-gray-800 dark:text-gray-100 uppercase italic">Análisis rápido de 4 puntos clave</h2>
             <TrendingUp className="text-dts-secondary animate-pulse" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            {/* 1. LIQUIDEZ */}
            <StatusCard 
              title="LIQUIDEZ"
              value={liquidezValue.toFixed(2)}
              subtext={`El circulante es ${liquidezValue.toFixed(2)} veces el exigible a corto`}
              status={liquidezStatus(liquidezValue)}
              isGood={liquidezValue >= 1.5}
              hint="Capacidad para hacer frente a deudas a corto plazo."
              infoProps={{
                description: "Mide si la empresa tiene suficientes activos a corto plazo (caja, clientes, existencias) para pagar sus deudas más inmediatas.",
                formulas: "Activo Corriente / Pasivo Corriente",
                objective: "Debe ser > 1.5 para holgura operativa."
              }}
            />

            {/* 3. ENDEUDAMIENTO */}
            <StatusCard 
              title="ENDEUDAMIENTO"
              value={endeudamientoValue.toFixed(2)}
              subtext={`Tiene un ratio de ${endeudamientoValue.toFixed(2)} sobre fondos propios`}
              status={endeudamientoStatus(endeudamientoValue)}
              isGood={endeudamientoValue < 1.0}
              hint="Volumen de deudas en relación a los fondos propios."
              infoProps={{
                description: "Muestra cuántos euros de financiación ajena (deuda) utiliza la empresa por cada euro de financiación propia.",
                formulas: "(Pasivo Corriente + Pasivo No Corriente) / Patrimonio Neto",
                objective: "Un valor < 1 indica buena independencia financiera."
              }}
            />

            {/* 2. CAPITALIZACIÓN */}
            <StatusCard 
              title="CAPITALIZACIÓN"
              value={`${capitalizacionValue.toFixed(1)}%`}
              subtext={`El P. Neto es el ${capitalizacionValue.toFixed(1)}% del total PN + Pasivo`}
              status={capitalizacionStatus(capitalizacionValue)}
              isGood={capitalizacionValue >= 30}
              hint="Proporción de fondos propios respecto a deudas."
              infoProps={{
                description: "Porcentaje del balance que está financiado directamente por los socios (capital propio y reservas generadas interanuales).",
                formulas: "(Patrimonio Neto / Total PN y Pasivo) * 100",
                objective: "Un valor superior al 30% es un claro signo de adecuada capitalización."
              }}
            />

            {/* 4. GARANTÍA */}
            <StatusCard 
              title="GARANTÍA"
              value={garantiaValue.toFixed(2)}
              subtext={`Tiene un ratio de ${garantiaValue.toFixed(2)} (Garantía patrimonial)`}
              status={garantiaStatus(garantiaValue)}
              isGood={garantiaValue >= 1.5}
              hint="Seguridad financiera ofrecida a los acreedores."
              infoProps={{
                description: "Indica el respaldo patrimonial que tienen los acreedores. Es decir, cuántos euros de activo tenemos para pagar cada euro de deuda en caso de disolución.",
                formulas: "Activo Total / Total Pasivo (Deudas)",
                objective: "Idealmente > 1.5 para asegurar solvencia absoluta."
              }}
            />
          </div>

          <div className="mt-8 bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
             <div className="flex items-center gap-2 mb-4 text-dts-primary dark:text-dts-secondary font-medium text-lg uppercase">
                <Info className="w-5 h-5" />
                <span>¿Cómo funciona el análisis?</span>
             </div>
             <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
               Este análisis se basa en parámetros generales (tómalos solo como una referencia). Una visión de rojo indica precaución e insuficiencia, mientras que el verde indica estabilidad según los ratios estándar del mercado.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component for KPIs
const StatusCard = ({ title, value, subtext, status, isGood, hint, infoProps }: any) => (
  <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-lg border-2 border-transparent hover:border-dts-secondary/20 transition-all flex flex-col overflow-hidden group">
    <div className="bg-dts-primary-light text-white text-center py-2 font-medium text-sm flex justify-center items-center gap-4 uppercase tracking-wider relative">
      {title}
      {infoProps && (
        <div className="absolute right-2">
          <InfoPopover 
            title={title} 
            description={infoProps.description} 
            formulas={infoProps.formulas} 
            objective={infoProps.objective}
            className="text-white/60 hover:text-white"
          />
        </div>
      )}
    </div>
    <div className="p-4 flex-1 text-center flex flex-col justify-center gap-2">
       <p className="text-xs text-gray-500 font-medium group-hover:text-dts-secondary transition-colors">{subtext}</p>
       <div className={`text-[10px] font-bold uppercase py-1 px-4 rounded-full mx-auto ${isGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          Situación: {status}
       </div>
       <div className={`text-4xl font-extrabold mt-2 ${isGood ? 'text-green-600' : 'text-red-600'}`}>
          {value}
       </div>
    </div>
    <div className="bg-gray-50 dark:bg-white/5 p-3 text-[10px] text-gray-400 italic text-center">
       {hint}
    </div>
  </div>
);

// Thresholds Logics
const liquidezStatus = (v: number) => v >= 1.5 ? 'SUFICIENTE' : 'INSUFICIENTE';
const capitalizacionStatus = (v: number) => v >= 30 ? 'ADECUADA' : 'INSUFICIENTE';
const endeudamientoStatus = (v: number) => v < 1.0 ? 'CONTROLADO' : 'EXCESIVO';
const garantiaStatus = (v: number) => v >= 1.5 ? 'ÓPTIMA' : 'INSUFICIENTE';

// Custom hook to mimic the groupDataByYear but memorized
const useQueryData = (rows: any[]) => {
  return useMemo(() => groupDataByYear(rows), [rows]);
};
