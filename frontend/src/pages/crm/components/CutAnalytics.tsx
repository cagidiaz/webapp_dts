import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {comparePipelineCuts,getCutReports,type PipelineCut} from '../../../api/pipelineCuts';
import {useAuthStore} from '../../../store/authStore';
import {formatCurrency} from '../../../api/formatters';
const modes=[['summary','Resumen'],['matrix','Matriz mensual'],['quality','Calidad de datos'],['overdue','Cierres vencidos'],['actions','Próximas acciones'],['reasons','Ganadas y perdidas'],['prospection','Prospección'],['movements','Movimientos entre cortes']];
const names:Record<string,string>={phase:'fase',source:'fuente',amount:'importe',probability:'probabilidad',owner_id:'propietario',salesperson_code:'comercial',oferta_type:'tipo',cierreprev_date:'cierre previsto',motivo_ganada:'motivo ganada',motivo_perdida:'motivo perdida',proxima_accion:'próxima acción',fecha_proxima_accion:'fecha de acción',observaciones:'observaciones',contacto_id:'contacto vinculado',contacto_nombre:'nombre del contacto',contacto_email:'email del contacto',contacto_telefono:'teléfono del contacto',company_name:'empresa',contact_name:'contacto',email:'email',phone:'teléfono',linked_client_id:'cliente vinculado',archived_at:'archivo',converted_at:'conversión'};
type Column={title:string;key:string;money?:boolean};
function ReportTable({columns,rows}:{columns:Column[];rows:Record<string,any>[]}) {
 return <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="text-gray-500"><tr>{columns.map(c=><th key={c.key} className="p-2 whitespace-nowrap">{c.title}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={row.key||row.reference||row.label||i} className="border-t border-gray-100 dark:border-white/5 text-gray-800 dark:text-gray-200">{columns.map(c=><td key={c.key} className="p-2">{row[c.key]==null?'—':c.money?formatCurrency(Number(row[c.key])):Array.isArray(row[c.key])?row[c.key].join(', '):String(row[c.key])}</td>)}</tr>)}</tbody></table>{!rows.length&&<p className="text-xs text-gray-500 p-3">Sin registros para este informe.</p>}</div>;
}
export function CutAnalytics({id,cuts}:{id:string;cuts:PipelineCut[]}) {
 const userId=useAuthStore(s=>s.profile?.id),[mode,setMode]=useState('summary'),[baseline,setBaseline]=useState('');
 const report=useQuery({queryKey:['cut-reports',userId,id],queryFn:()=>getCutReports(id)});
 const comparison=useQuery({queryKey:['cut-comparison',userId,id,baseline],queryFn:()=>comparePipelineCuts(id,baseline),enabled:mode==='movements'&&!!baseline&&baseline!==id,retry:false});
 const data=report.data,summary=data?.summary;
 let columns:Column[]=[],rows:Record<string,any>[]=[];
 if(mode==='matrix'){columns=[{title:'Mes · fase',key:'label'},{title:'Ofertas',key:'count'},{title:'Importe sin IVA',key:'amount',money:true},{title:'Ponderado',key:'weighted',money:true},{title:'Valor desconocido',key:'unknown'}];rows=data?.matrix||[];}
 if(mode==='quality'){columns=[{title:'Oferta',key:'reference'},{title:'Empresa',key:'company'},{title:'Datos por revisar',key:'issues'}];rows=data?.quality||[];}
 if(mode==='overdue'){columns=[{title:'Oferta',key:'reference'},{title:'Empresa',key:'company'},{title:'Fase',key:'phase'},{title:'Cierre previsto',key:'date'},{title:'Importe',key:'amount',money:true}];rows=data?.overdue||[];}
 if(mode==='actions'){columns=[{title:'Oferta',key:'reference'},{title:'Empresa',key:'company'},{title:'Acción',key:'action'},{title:'Fecha',key:'date'},{title:'Vencida al corte',key:'overdue'}];rows=(data?.actions||[]).map((r:any)=>({...r,overdue:r.overdue?'Sí':'No'}));}
 if(mode==='reasons'){columns=[{title:'Resultado · motivo',key:'label'},{title:'Ofertas',key:'count'},{title:'Importe sin IVA',key:'amount',money:true},{title:'Importe desconocido',key:'unknown'}];rows=data?.reasons||[];}
 if(mode==='prospection'){columns=[{title:'Indicador',key:'label'},{title:'Recuento',key:'count'}];const p=data?.prospection;rows=p?[['Total prospectos',p.total],['Fase 0',p.phase0],['Fase 1',p.phase1],['Archivados',p.archived],['Vinculados a BC',p.converted],['Clientes BC distintos vinculados',p.formalClients]].map(([label,count])=>({label,count})):[];}
 if(mode==='movements'){columns=[{title:'Referencia',key:'reference'},{title:'Empresa',key:'company'},{title:'Movimiento',key:'kind'},{title:'Fase inicial',key:'beforePhase'},{title:'Fase final',key:'afterPhase'},{title:'Variación neta',key:'deltaAmount',money:true},{title:'Campos',key:'fields'}];rows=(comparison.data?.movements||[]).map((r:any)=>({...r,fields:r.fields.map((f:string)=>names[f]||f)}));}
 if(mode==='summary'&&summary){columns=[{title:'Indicador',key:'label'},{title:'Valor',key:'value'}];rows=[{label:'Ofertas abiertas',value:summary.open},{label:'Cartera abierta conocida',value:formatCurrency(summary.openAmount)},{label:'Previsión ponderada conocida',value:formatCurrency(summary.weighted)},{label:'Ofertas abiertas sin importe',value:summary.unknownAmount},{label:'Ofertas abiertas sin valor ponderable',value:summary.unknownWeighted}];}
 const exportReport=()=>{
  const cell=(value:any)=>{let text=Array.isArray(value)?value.join(', '):String(value??'');if(/^\s*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
  const content='\uFEFF'+[columns.map(c=>cell(c.title)).join(';'),...rows.map(r=>columns.map(c=>cell(r[c.key])).join(';'))].join('\r\n');
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`informe-${mode}-${id}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 const finalCut=cuts.find(c=>c.id===id);
 return <section className="bg-white dark:bg-surface-card-dark rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-4">
  <div className="flex flex-wrap gap-3 items-center"><h3 className="text-xs font-bold text-dts-primary dark:text-dts-secondary">Informes del corte</h3><select aria-label="Informe del corte" value={mode} onChange={e=>setMode(e.target.value)} className="text-xs p-2 rounded-lg border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-dts-primary-dark text-gray-900 dark:text-white">{modes.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>
  <p className="text-xs text-gray-500">Valores congelados · importes sin IVA · vencimientos evaluados a {data?.day||'la fecha del corte'}. Los valores desconocidos se muestran aparte.</p>
  <button disabled={!rows.length||report.isError||mode==='movements'&&comparison.isError} onClick={exportReport} className="text-xs font-bold text-dts-secondary disabled:opacity-50">Exportar informe CSV</button>
  {mode==='movements'&&<div className="space-y-2"><label className="text-xs text-gray-500">Corte inicial<select aria-label="Corte inicial de comparación" value={baseline} onChange={e=>setBaseline(e.target.value)} className="block mt-1 text-xs p-2 rounded-lg border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-dts-primary-dark text-gray-900 dark:text-white"><option value="">Selecciona un corte anterior</option>{cuts.filter(c=>c.status==='PUBLISHED'&&c.id!==id&&c.captured_at&&finalCut?.captured_at&&c.captured_at<=finalCut.captured_at).map(c=><option key={c.id} value={c.id}>{new Date(c.captured_at!).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})}</option>)}</select></label><p className="text-xs text-gray-500">Una ausencia puede deberse al ámbito visible; no demuestra que se haya eliminado una oportunidad. La comparación muestra cambios, no sus causas.</p></div>}
  {(report.isError||comparison.isError)&&<p role="alert" className="text-xs text-rose-500">No se pudo obtener el informe. Comprueba que los cortes estén publicados, sean accesibles y usen las mismas reglas.</p>}
  <ReportTable columns={columns} rows={rows}/>
 </section>;
}
