import {manualMailQuoteSeed,pilotQuoteUsesManualState} from './pilot-quote-state';
describe('Correo y cierre manual del piloto',()=>{
 const db:any={profiles:{findUnique:jest.fn()},sales_quotes:{findFirst:jest.fn()}};
 beforeEach(()=>{jest.clearAllMocks();db.profiles.findUnique.mockResolvedValue({is_active:true,code:'CODIGO_REAL',roles:{name:'TESTER'}});db.sales_quotes.findFirst.mockResolvedValue({salesperson_code:'CODIGO_REAL'});});
 it('con piloto apagado conserva el flujo anterior sin consultar perfiles',async()=>{expect(await pilotQuoteUsesManualState(db,false,'pilot@test','OF1',null)).toBe(false);expect(db.profiles.findUnique).not.toHaveBeenCalled();});
 it('una oferta ya inicializada mantiene cierre manual',async()=>{expect(await pilotQuoteUsesManualState(db,true,'pilot@test','OF1',{id:'local'})).toBe(true);expect(db.profiles.findUnique).not.toHaveBeenCalled();});
 it('una oferta nueva del código real del tester tampoco se gana por correo',async()=>{expect(await pilotQuoteUsesManualState(db,true,'pilot@test','OF1',null)).toBe(true);});
 it('los otros comerciales conservan el flujo anterior',async()=>{db.sales_quotes.findFirst.mockResolvedValue({salesperson_code:'OTRO'});expect(await pilotQuoteUsesManualState(db,true,'pilot@test','OF2',null)).toBe(false);});
 it('preparar seguimiento BC de otros comerciales no activa su cierre manual',async()=>{db.sales_quotes.findFirst.mockResolvedValue({salesperson_code:'OTRO'});expect(await pilotQuoteUsesManualState(db,true,'pilot@test','OF2',{id:'copy',source:'BC'})).toBe(false);});
 it('un perfil que no es TESTER no incorpora nuevas ofertas al piloto',async()=>{db.profiles.findUnique.mockResolvedValue({is_active:true,code:'CODIGO_REAL',roles:{name:'VENTAS'}});expect(await pilotQuoteUsesManualState(db,true,'pilot@test','OF1',null)).toBe(false);});
 it('registrar el correo conserva valores BC, nulos y ceros en lugar de defaults ganada/borrador',()=>{expect(manualMailQuoteSeed({estado_oferta:'aceptada',probabilidad_exito:0,oferta_type:'cliente existente',cierreprev_date:null})).toMatchObject({estado_oferta:'aceptada',probabilidad_exito:0,oferta_type:'cliente existente',cierreprev_date:null});expect(manualMailQuoteSeed(null).estado_oferta).toBe('');});
});
