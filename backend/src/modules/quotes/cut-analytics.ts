type Row={entity_type:string;entity_key:string;phase:string|null;source:string;amount:any;probability:any;payload:any};
// Los importes congelados tienen 4 decimales y los porcentajes 2; sumar antes de convertir evita deriva monetaria.
function units(value:any,scale=4):bigint {
 const text=value?.toString()||'0',negative=text.startsWith('-');
 const [whole,fraction='']=text.replace(/^[-+]/,'').split('.');
 return (negative?-1n:1n)*BigInt(whole+fraction.padEnd(scale,'0').slice(0,scale));
}
const day=(value:Date)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
const closed=(r:Row)=>['ganada','perdida',...(r.source==='BC'?['ganado','perdido','aceptada','aprobada','cancelada','rechazada']:[])].includes(r.phase?.toLowerCase()||'');
const sum=(rows:Row[])=>Number(rows.reduce((total,row)=>total+units(row.amount),0n))/10000;
const weighted=(rows:Row[])=>Number(rows.filter(r=>r.amount!=null&&r.probability!=null).reduce((total,r)=>total+units(r.amount)*units(r.probability,2),0n))/100000000;
export function cutReports(rows:Row[],captured:Date) {
 const today=day(captured),offers=rows.filter(r=>r.entity_type==='OFFER'),prospects=rows.filter(r=>r.entity_type==='PROSPECT'),open=offers.filter(r=>!closed(r));
 const matrix=new Map<string,Row[]>(),quality:any[]=[],overdue:any[]=[],actions:any[]=[],reasons=new Map<string,Row[]>();
 for(const row of offers) {
  const p=row.payload,missing=new Set<string>(p.missing_fields||[]);
  if(!row.phase)missing.add('fase');if(!p.oferta_type)missing.add('tipo de oferta');if(!p.cierreprev_date)missing.add('cierre previsto');if(row.amount==null)missing.add('importe');if(row.probability==null)missing.add('probabilidad');if(p.missing_bc)missing.add('oferta no sincronizada en BC');
  if(missing.size)quality.push({reference:row.entity_key,company:p.customer_name||'',issues:[...missing]});
  if(!closed(row)) {
   const month=p.cierreprev_date?String(p.cierreprev_date).slice(0,7):'Sin fecha';
   const key=month+' · '+(row.phase||'Sin fase');(matrix.get(key)||matrix.set(key,[]).get(key)!).push(row);
   if(p.cierreprev_date&&String(p.cierreprev_date).slice(0,10)<today)overdue.push({reference:row.entity_key,company:p.customer_name,phase:row.phase,date:String(p.cierreprev_date).slice(0,10),amount:row.amount?.toString()??null});
  }
  if(p.proxima_accion||p.fecha_proxima_accion)actions.push({reference:row.entity_key,company:p.customer_name,action:p.proxima_accion||'',date:p.fecha_proxima_accion?String(p.fecha_proxima_accion).slice(0,10):null,overdue:!!p.fecha_proxima_accion&&String(p.fecha_proxima_accion).slice(0,10)<today});
  if(closed(row)) {
   const won=['ganada','ganado','aceptada','aprobada'].includes(row.phase?.toLowerCase()||'');
   const key=(won?'Ganada':'Perdida')+' · '+((won?p.motivo_ganada:p.motivo_perdida)||'Sin especificar');
   (reasons.get(key)||reasons.set(key,[]).get(key)!).push(row);
  }
 }
 return {
  day:today,summary:{offers:offers.length,open:open.length,openAmount:sum(open),weighted:weighted(open),unknownAmount:open.filter(r=>r.amount==null).length,unknownWeighted:open.filter(r=>r.amount==null||r.probability==null).length},
  matrix:[...matrix].sort(([a],[b])=>a.localeCompare(b)).map(([label,items])=>({label,count:items.length,amount:sum(items),weighted:weighted(items),unknown:items.filter(r=>r.amount==null||r.probability==null).length})),
  quality,overdue,actions:actions.sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')),
  reasons:[...reasons].map(([label,items])=>({label,count:items.length,amount:sum(items),unknown:items.filter(r=>r.amount==null).length})),
  prospection:{total:prospects.length,phase0:prospects.filter(r=>r.phase==='Fase 0').length,phase1:prospects.filter(r=>r.phase==='Fase 1').length,archived:prospects.filter(r=>r.phase==='Archivado').length,converted:prospects.filter(r=>r.phase==='Convertido').length,formalClients:new Set(prospects.filter(r=>r.phase==='Convertido'&&r.payload.linked_client_id).map(r=>r.payload.linked_client_id)).size},
 };
}
export function compareCutRows(before:Row[],after:Row[]) {
 const index=(rows:Row[])=>new Map(rows.map(r=>[r.entity_type+':'+r.entity_key,r]));
 const a=index(before),b=index(after),movements:any[]=[];
 const fields=['phase','source','amount','probability','owner_id','salesperson_code'];
 const payloadFields=['oferta_type','cierreprev_date','motivo_ganada','motivo_perdida','proxima_accion','fecha_proxima_accion','observaciones','contacto_id','contacto_nombre','contacto_email','contacto_telefono','company_name','contact_name','email','phone','linked_client_id','archived_at','converted_at'];
 const canonical=(value:any)=>value==null?null:value instanceof Date?value.toISOString():String(value);
 for(const key of new Set([...a.keys(),...b.keys()])) {
  const old=a.get(key),next=b.get(key);
  const fieldValue=(r:Row,f:string)=>{const value=(r as any)[f];return value!=null&&['amount','probability'].includes(f)?units(value,f==='amount'?4:2).toString():canonical(value);};
  const changed=old&&next?[...fields.filter(f=>fieldValue(old,f)!==fieldValue(next,f)),...payloadFields.filter(f=>canonical(old.payload[f])!==canonical(next.payload[f]))]:[];
  if(old&&next&&!changed.length)continue;
  const delta=old?.entity_type==='PROSPECT'||next?.entity_type==='PROSPECT'?null:old&&old.amount==null||next&&next.amount==null?null:Number(units(next?.amount)-units(old?.amount))/10000;
  movements.push({key,type:(next||old)!.entity_type,reference:(next||old)!.entity_key,company:(next||old)!.payload.company_name||(next||old)!.payload.customer_name||'',kind:!old?'Entrada en corte/ámbito':!next?'No presente en corte/ámbito':'Cambio observado',beforePhase:old?.phase||null,afterPhase:next?.phase||null,deltaAmount:delta,fields:changed});
 }
 const changedKeys=new Set(movements.map(m=>m.key));
 return {movements,unchanged:[...a.keys()].filter(key=>b.has(key)&&!changedKeys.has(key)).length};
}
