/** La aceptación por correo nunca decide el cierre comercial de una oferta del piloto. */
import { BC_FIELDS } from '../quotes/offer-source-context';
export function manualMailQuoteSeed(quote:any) {
  return Object.fromEntries(BC_FIELDS.map(field=>[field,quote?.[field] ?? (field==='estado_oferta'?'':null)]));
}
export async function pilotQuoteUsesManualState(db:any,enabled:boolean,email:string,documentNo:string,existing:any) {
  if(!enabled)return false;
  if(existing && existing.source !== 'BC')return true;
  const profile=await db.profiles.findUnique({where:{email},include:{roles:true}});
  if(!profile?.is_active || profile.roles?.name?.toUpperCase()!=='TESTER' || !profile.code)return false;
  const quote=await db.sales_quotes.findFirst({where:{document_no:documentNo},select:{salesperson_code:true}});
  return quote?.salesperson_code===profile.code;
}
