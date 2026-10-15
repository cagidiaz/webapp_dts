import { QuotesService } from './quotes.service';
import { OfferSourceContext } from './offer-followup.service';

describe('La misma fuente en ficha, tabla, Kanban y métricas',()=>{
  let quote:any, db:any, service:QuotesService, followups:any;
  beforeEach(()=>{
    quote={id:'bc1',document_no:'OF1',salesperson_code:'REAL_CODE',amount:1000,estado_oferta:'enviada',probabilidad_exito:25,valor_oferta_ponderado:250,cierreprev_date:new Date('2026-12-01'),motivo_ganada:null,motivo_perdida:null,observaciones:'BC',oferta_type:'proyecto',cerrado:false,document_date:new Date('2026-10-01'),customer:{name:'Empresa'},sales_rep:{name:'Antoni'},sales_quotes_crm:{id:'old',estado_oferta:'ganada',probabilidad_exito:100,activities:[]}};
    const context=new OfferSourceContext([{id:'local',owner_id:'pilot',source:'APP',document_no:'OF1',version:3,estado_oferta:'en negociación',probabilidad_exito:50,cierreprev_date:null,observaciones:'',oferta_type:'proyecto'}]);
    db={profiles:{findUnique:jest.fn().mockResolvedValue({is_active:true,code:'REAL_CODE',roles:{name:'TESTER'}})},sales_quotes:{findMany:jest.fn().mockImplementation(()=>[structuredClone(quote)]),count:jest.fn().mockResolvedValue(1),findFirst:jest.fn().mockImplementation(()=>structuredClone(quote))}};
    followups={context:jest.fn().mockResolvedValue(context),scope:jest.fn().mockResolvedValue({salesperson_code:'REAL_CODE'})};service=new QuotesService(db,followups);
  });
  it('BC cambia estado y recrea ID: el seguimiento sigue igual y la valoración usa el importe nuevo',async()=>{
    for(const amount of [1000,2000]){
      quote.amount=amount;quote.id='bc-'+amount;quote.estado_oferta='perdida';
      const table=await service.getAll({},'pilot'), kanban=await service.getAllCrm({},'pilot'), detail=await service.getById(quote.id,'pilot');
      expect(table.data[0].estado_oferta).toBe('negociación');expect(kanban[0].estado_oferta).toBe('negociación');expect(detail.estado_oferta).toBe('negociación');
      expect(table.summary.totalWeightedValue).toBe(amount*0.55);expect(kanban[0].valor_oferta_ponderado).toBe(amount*0.55);
      expect(table.data[0].cierreprev_date).toBeNull();expect(kanban[0].cierreprev_date).toBeNull();expect(detail.cierreprev_date).toBeNull();
      expect(table.data[0].observaciones).toBe('');expect(kanban[0].followup_version).toBe(3);
    }
  });
  it('todos los filtros y contadores reciben la resolución antes de consultar/paginar',async()=>{
    await service.getAll({estadoOferta:'negociación',probabilidadExito:'55',take:20},'pilot');
    const query=db.sales_quotes.findMany.mock.calls[0][0];
    expect(JSON.stringify(query.where)).toContain('OF1');
    expect(db.sales_quotes.count).toHaveBeenCalledWith({where:query.where});
    expect(db.sales_quotes.findMany.mock.calls[1][0].where).toEqual(query.where);
  });
  it('Aceptada permanece abierta al 90% y no aumenta ganadas', async () => {
    followups.context.mockResolvedValue(new OfferSourceContext([{document_no:'OF1',estado_oferta:'aceptada',probabilidad_exito:100,oferta_type:'proyecto',version:1}]));
    const table=await service.getAll({},'pilot'), kanban=await service.getAllCrm({},'pilot');
    expect(table.summary.wonCount).toBe(0);
    expect(table.summary.pendingCount).toBe(1);
    expect(table.summary.totalWeightedValue).toBe(900);
    expect(kanban[0].estado_oferta).toBe('aceptada');
    expect(kanban[0].probabilidad_exito).toBe(90);
  });
});
