import { ConflictException, ForbiddenException } from '@nestjs/common';
import { OfferFollowupService, OfferSourceContext } from './offer-followup.service';

// Evaluador del subconjunto de filtros Prisma usado en las pruebas, independiente de la resolución.
function evaluate(node: any, row: any): boolean {
  return Object.entries(node).every(([key, value]: [string, any]) => {
    if (key === 'AND') return (Array.isArray(value) ? value : [value]).every(part => evaluate(part, row));
    if (key === 'OR') return value.some((part: any) => evaluate(part, row));
    if (key === 'NOT') return !evaluate(value,row);
    if (value === null) return row[key] === null;
    if (typeof value !== 'object' || value instanceof Date) return row[key] === value;
    if (key === 'sales_quotes_crm') return !!row[key] && evaluate(value,row[key]);
    return Object.entries(value).every(([op, expected]:[string,any]) => {
      const actual=row[key] instanceof Date ? row[key].getTime() : row[key], wanted=expected instanceof Date ? expected.getTime() : expected;
      if(op==='mode')return true;
      if(op==='in')return expected.includes(actual);
      if(op==='notIn')return !expected.includes(actual);
      if(op==='equals')return value.mode==='insensitive' ? String(actual).toLowerCase()===String(wanted).toLowerCase() : actual===wanted;
      if(op==='gte')return actual!=null&&actual>=wanted;
      if(op==='lte')return actual!=null&&actual<=wanted;
      if(op==='lt')return actual!=null&&actual<wanted;
      throw new Error(op);
    });
  });
}
describe('Seguimiento APP independiente de BC', () => {
  const local={id:'local',document_no:'OF1',source:'APP',version:1,estado_oferta:'en negociación',probabilidad_exito:50,cierreprev_date:null,motivo_ganada:null,motivo_perdida:null,observaciones:'',activities:[]};
  const imported={id:'bc1',document_no:'OF1',salesperson_code:'REAL_CODE',amount:1000,estado_oferta:'enviada',probabilidad_exito:25,cierreprev_date:new Date('2026-12-01'),observaciones:'Dato BC',sales_quotes_crm:{id:'old',estado_oferta:'ganada'}};
  let db:any, service:OfferFollowupService, enabled:boolean, access:any;
  beforeEach(()=>{
    enabled=true;access={enabled:true,canCreate:true,canEditAll:false};
    const pilot={id:'pilot',role_id:'role',email:'aciurans@dtsinstruments.com',roles:{name:'TESTER'},code:'REAL_CODE',is_active:true};
    db={contacts:{findFirst:jest.fn().mockResolvedValue({id:'contact-uuid'}),findMany:jest.fn().mockResolvedValue([])},profiles:{findUnique:jest.fn().mockResolvedValue(pilot)},role_modules:{findMany:jest.fn().mockResolvedValue(['/crm','/crm/pipeline'].map(route_path=>({can_view:true,module:{route_path}})))},
      sales_quotes:{findFirst:jest.fn().mockResolvedValue(imported),findUnique:jest.fn().mockResolvedValue(imported),findMany:jest.fn().mockResolvedValue([imported])},
      crm_offer_followups:{findUnique:jest.fn().mockResolvedValue(local),findMany:jest.fn().mockResolvedValue([local]),upsert:jest.fn().mockResolvedValue(local),updateMany:jest.fn().mockResolvedValue({count:1}),findUniqueOrThrow:jest.fn().mockResolvedValue(local),count:jest.fn().mockResolvedValue(1)},
      crm_offer_activities:{create:jest.fn(),upsert:jest.fn()},$transaction:jest.fn()};
    db.$transaction.mockImplementation(callback=>callback(db));
    service=new OfferFollowupService(db,{get:(key:string)=>key==='CRM_PROSPECTS_PILOT_ENABLED'?String(enabled):undefined} as any,{access:jest.fn().mockImplementation(()=>access)} as any);
  });
  it('ofrece el catálogo aprobado completo sin depender del histórico de la cartera', async () => {
    expect(await service.closeReasons('pilot')).toEqual({
      ganada:['Precio','Servicio','Producto','Propuesta de valor','Afinidad'],
      perdida:['Precio','Servicio','Financiación / Condiciones de pago','Relación cliente','Producto','Capacidad de producción','Compromiso con otros','Falta de financiación','Documentación / Certificados'],
    });
    expect(db.sales_quotes.findMany).not.toHaveBeenCalled();
    expect(db.crm_offer_followups.findMany).not.toHaveBeenCalled();
  });
  it('rechaza Otros y motivos inventados antes de guardar el seguimiento', async () => {
    for (const motivo_ganada of ['Otros',' otros ','Inventado']) {
      await expect(service.save('pilot','bc1',{followup_version:1,motivo_ganada})).rejects.toThrow('Selecciona un motivo del catálogo aprobado');
    }
    expect(db.crm_offer_followups.updateMany).not.toHaveBeenCalled();
  });
  it('permite motivos aprobados y rechaza un motivo exclusivo de pérdida en ganada', async () => {
    await service.save('pilot','bc1',{followup_version:1,motivo_ganada:'Afinidad'});
    await service.save('pilot','bc1',{followup_version:1,motivo_perdida:'Falta de financiación'});
    await expect(service.save('pilot','bc1',{followup_version:1,motivo_ganada:'Falta de financiación'})).rejects.toThrow('catálogo aprobado');
  });
  it('resuelve el seguimiento local aunque la antigua variable de piloto esté apagada',async()=>{
    enabled=false;expect(await service.context()).toBeInstanceOf(OfferSourceContext);expect(db.crm_offer_followups.findMany).toHaveBeenCalled();
  });
  it('conserva seguimiento al actualizar y recrear BC, pero recoge sus nuevos importes',()=>{
    const source=new OfferSourceContext([local]);
    for(const quote of [imported,{...imported,id:'bc-recreated',amount:2000,estado_oferta:'perdida',probabilidad_exito:0}]){
      const effective=source.overlay(quote);expect(effective.estado_oferta).toBe('negociación');expect(effective.probabilidad_exito).toBe(55);expect(effective.cierreprev_date).toBeNull();expect(effective.observaciones).toBe('');expect(effective.amount).toBe(quote.amount);expect(effective.followup_source).toBe('APP');
    }
  });
  it('la fuente depende de la oferta y los demás comerciales siguen leyendo BC',()=>{
    const source=new OfferSourceContext([local]);const other=source.overlay({...imported,document_no:'OF2',estado_oferta:'enviada'});
    expect(other.followup_source).toBe('BC');expect(other.estado_oferta).toBe('enviada');expect(other.sales_quotes_crm.estado_oferta).toBe('enviada');
  });
  it('fase, probabilidad y fechas filtran el valor efectivo, no el recibido de BC',()=>{
    const source=new OfferSourceContext([local]);
    expect(evaluate(source.where({estado_oferta:{equals:'negociación',mode:'insensitive'}}),imported)).toBe(true);
    expect(evaluate(source.where({probabilidad_exito:25}),imported)).toBe(false);
    expect(evaluate(source.where({sales_quotes_crm:{cierreprev_date:null}}),imported)).toBe(true);
    expect(evaluate(source.where({sales_quotes_crm:{cierreprev_date:{gte:new Date('2026-11-01')}}}),imported)).toBe(false);
  });
  it('el filtro sin fecha no admite cualquier registro por faltar el CRM heredado',()=>{
    const source=new OfferSourceContext([local]);
    const filter=source.where({OR:[{cierreprev_date:null},{sales_quotes_crm:null},{sales_quotes_crm:{cierreprev_date:null}}]});
    expect(evaluate(filter,{...imported,document_no:'OF2',sales_quotes_crm:null})).toBe(false);
    expect(evaluate(filter,{...imported,document_no:'OF2',sales_quotes_crm:null,cierreprev_date:null})).toBe(true);
  });
  it('usa el código real de la cartera y edita el seguimiento recibido de n8n', async () => {
    await service.save('pilot', 'bc1', { followup_version: 1, observaciones: 'Actualizada' });
    expect(db.sales_quotes.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'bc1', salesperson_code: 'REAL_CODE' } }));
    expect(db.crm_offer_followups.upsert).not.toHaveBeenCalled();
  });
  it('Admin edita la cartera piloto sin depender del acceso de Antoni', async () => {
    access = { enabled: true, canCreate: true, canEditAll: true };
    const prospectAccess = (service as any).prospects.access as jest.Mock;
    prospectAccess.mockImplementation((id: string) => id === 'admin' ? access : { enabled: false });
    await service.save('admin','bc1',{ followup_version: 1, observaciones: 'Prueba administrativa' });
    expect(db.crm_offer_activities.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ author_id: 'admin', tipo: 'Auditoría' }) }));
    expect(prospectAccess.mock.calls.every(([id]) => id === 'admin')).toBe(true);
    expect(db.crm_offer_followups.upsert).not.toHaveBeenCalled();
  });
  it('la edición no consulta permisos ni perfil de un comercial piloto ajeno', async () => {
    const prospectAccess = (service as any).prospects.access as jest.Mock;
    await service.save('pilot','bc1',{followup_version:1});
    expect(prospectAccess.mock.calls).toEqual([['pilot']]);
    expect(db.profiles.findUnique.mock.calls.every(([args]:any[]) => args.where.id === 'pilot')).toBe(true);
  });
  it('si n8n aún no ha suministrado el seguimiento, no crea ni copia registros', async () => {
    db.crm_offer_followups.findUnique.mockResolvedValue(null);
    await expect(service.save('pilot','bc1',{ followup_version: 1 })).rejects.toThrow('aún no ha llegado desde n8n');
    expect(db.crm_offer_followups.upsert).not.toHaveBeenCalled();
    expect(db.crm_offer_followups.updateMany).not.toHaveBeenCalled();
    expect(db.crm_offer_activities.create).not.toHaveBeenCalled();
  });
  it('rechaza escribir seguimiento de origen BC sin adoptarlo automáticamente', async () => {
    db.crm_offer_followups.findUnique.mockResolvedValue({ ...local, source: 'BC' });
    await expect(service.save('pilot','bc1',{ followup_version: 1 })).rejects.toThrow('sigue gestionada desde BC');
    expect(db.crm_offer_followups.updateMany).not.toHaveBeenCalled();
    expect(db.crm_offer_followups.upsert).not.toHaveBeenCalled();
  });
  it('si falta seguimiento APP, registrar una actividad del piloto no cae en la escritura heredada', async () => {
    for (const record of [null, { ...local, source: 'BC' }]) {
      db.crm_offer_followups.findUnique.mockResolvedValue(record);
      await expect(service.activities('pilot', 'bc1', { tipo: 'Nota', notas: 'Prueba', fecha: '2026-10-14' })).rejects.toThrow('aún no está disponible desde n8n');
    }
    expect(db.crm_offer_activities.create).not.toHaveBeenCalled();
    expect(db.crm_offer_followups.upsert).not.toHaveBeenCalled();
  });
  it('edita solo la tabla local y conserva propietario y marca de fuente',async()=>{
    await service.save('pilot','bc1',{observaciones:'',followup_version:1});const fields=db.crm_offer_followups.updateMany.mock.calls[0][0].data;
    expect(fields.observaciones).toBe('');expect(fields.owner_id).toBeUndefined();expect(fields.source).toBeUndefined();expect(db.crm_offer_activities.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({author_id:'pilot',tipo:'Auditoría'})}));
  });
  it('guarda solo la referencia contact_id y no persiste nombre email ni teléfono', async () => {
    db.sales_quotes.findFirst.mockResolvedValue({ ...imported, customer_no: 'CL1' });
    await service.save('pilot','bc1',{ followup_version: 1, contact_id: 'contact-uuid', contacto_nombre: 'Duplicado', contacto_email: 'duplicado@test', contacto_telefono: '123' });
    const fields = db.crm_offer_followups.updateMany.mock.calls[0][0].data;
    expect(fields.contacto_id).toBe('contact-uuid');
    for (const field of ['contacto_nombre','contacto_email','contacto_telefono']) expect(fields).not.toHaveProperty(field);
    expect(db.contacts.findFirst).toHaveBeenCalledWith({ where: { contact_no: 'contact-uuid', client_id: 'CL1' }, select: { id: true } });
  });
  it('rechaza un contacto inexistente o ajeno al cliente antes de guardar', async () => {
    db.contacts.findFirst.mockResolvedValue(null);
    await expect(service.save('pilot','bc1',{ followup_version: 1, contact_id: 'foreign' })).rejects.toThrow('pertenecer al cliente');
    expect(db.crm_offer_followups.updateMany).not.toHaveBeenCalled();
    expect(db.crm_offer_activities.create).not.toHaveBeenCalled();
  });
  it('impide vaciar el contacto obligatorio y rechaza alias diferentes', async () => {
    await expect(service.save('pilot','bc1',{ followup_version: 1, contact_id: null })).rejects.toThrow('obligatorio');
    expect(db.crm_offer_followups.updateMany).not.toHaveBeenCalled();
    await expect(service.save('pilot','bc1',{ contact_id: 'one', contacto_id: 'two' })).rejects.toThrow('no coinciden');
  });
  it('exige nota, tipo, fecha y motivo al cerrar; calcula la probabilidad automáticamente', async () => {
    await expect(service.save('pilot','bc1',{followup_version:1,estado_oferta:'aceptada'})).rejects.toThrow('Tipo de oferta');
    const base={followup_version:1,estado_oferta:'aceptada',oferta_type:'proyecto',cierreprev_date:'2026-12-01'};
    await expect(service.save('pilot','bc1',base)).rejects.toThrow('Añade una nota');
    await expect(service.save('pilot','bc1',{...base,transition_note:'Validado',probabilidad_exito:100})).rejects.toThrow('automáticamente');
    await service.save('pilot','bc1',{...base,transition_note:'Validado'});
    expect(db.crm_offer_followups.updateMany).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({estado_oferta:'aceptada',probabilidad_exito:90})}));
    expect(db.crm_offer_activities.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({tipo:'Nota',notas:expect.stringContaining('Validado')})}));
    await expect(service.save('pilot','bc1',{...base,estado_oferta:'ganada',transition_note:'Pedido recibido'})).rejects.toThrow('motivo de cierre');
    await service.save('pilot','bc1',{...base,estado_oferta:'ganada',transition_note:'Pedido recibido',motivo_ganada:'Precio'});
  });
  it('un fallo al guardar la nota propaga el error dentro de la misma transacción', async () => {
    db.crm_offer_activities.create.mockRejectedValue(new Error('Sin almacenamiento'));
    await expect(service.save('pilot','bc1',{followup_version:1,estado_oferta:'presentada',oferta_type:'proyecto',cierreprev_date:'2026-12-01',transition_note:'Enviada'})).rejects.toThrow('Sin almacenamiento');
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });
  it('rechaza versiones antiguas y conflictos simultáneos sin registrar un falso cambio',async()=>{
    await expect(service.save('pilot','bc1',{followup_version:2})).rejects.toBeInstanceOf(ConflictException);
    db.crm_offer_followups.updateMany.mockResolvedValue({count:0});await expect(service.save('pilot','bc1',{followup_version:1})).rejects.toBeInstanceOf(ConflictException);
    expect(db.crm_offer_activities.create).not.toHaveBeenCalled();
  });
  it('revocar el permiso impide guardar',async()=>{
    access.enabled=false;await expect(service.save('pilot','bc1',{followup_version:1})).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('el cambio de propietario exige revisión explícita',async()=>{
    db.sales_quotes.findFirst.mockResolvedValue(null);
    await expect(service.save('pilot','bc1',{followup_version:1})).rejects.toThrow('tu cartera');
    expect(db.crm_offer_followups.updateMany).not.toHaveBeenCalled();
  });
  it('no permite añadir actividades a un propietario diferente según el código BC',async()=>{
    db.sales_quotes.findFirst.mockResolvedValue({...imported,salesperson_code:'OTHER'});
    await expect(service.activities('pilot','bc1',{tipo:'Nota',notas:'Prueba',fecha:'2026-10-14'})).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.crm_offer_activities.create).not.toHaveBeenCalled();
  });
  it('editar una actividad usa la cartera BC actual sin necesitar owner_id', async () => {
    db.crm_offer_activities.findUnique = jest.fn().mockResolvedValue({ id: 'activity', tipo: 'Nota', followup: local });
    db.crm_offer_activities.update = jest.fn().mockResolvedValue({ id: 'activity', notas: 'Corregida' });
    await service.editActivity('pilot', 'activity', { notas: 'Corregida' });
    expect(db.sales_quotes.findFirst).toHaveBeenCalledWith({ where: { document_no: 'OF1', salesperson_code: 'REAL_CODE' } });
    db.crm_offer_activities.update.mockClear();
    db.sales_quotes.findFirst.mockResolvedValue(null);
    await expect(service.editActivity('pilot', 'activity', { notas: 'Ajena' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.crm_offer_activities.update).not.toHaveBeenCalled();
  });

  it('una copia BC de la sincronización global conserva el flujo de actividades anterior', async () => {
    db.crm_offer_followups.findUnique.mockResolvedValue({ ...local, source: 'BC' });
    expect(await service.activities('pilot', 'bc1')).toBeNull();
    expect(db.crm_offer_activities.create).not.toHaveBeenCalled();
  });
  it('no permite vaciar la fase mediante null',async()=>{
    await expect(service.save('pilot','bc1',{followup_version:1,estado_oferta:null} as any)).rejects.toThrow('no puede quedar vacía');
  });
});


describe('Admin sin propietario piloto ni código comercial', () => {
  it('separa permiso de editar y datos importados, permitiendo cualquier cartera APP', async () => {
    const db:any = {
      sales_quotes:{findFirst:jest.fn().mockResolvedValue({document_no:'OF-OTRA',customer_no:'CL',salesperson_code:'OTRO'})},
      crm_offer_followups:{findUnique:jest.fn().mockResolvedValue({id:'follow',source:'APP',version:1}),updateMany:jest.fn().mockResolvedValue({count:1}),findUniqueOrThrow:jest.fn().mockResolvedValue({version:2})},
      crm_offer_activities:{create:jest.fn()},profiles:{findUnique:jest.fn()},$transaction:jest.fn(),
    };
    db.$transaction.mockImplementation((work:any)=>work(db));
    const service=new OfferFollowupService(db,{} as any,{access:jest.fn().mockResolvedValue({enabled:true,canCreate:true,canEditAll:true})} as any);
    await service.save('admin','quote',{followup_version:1,observaciones:'Nota local'});
    expect(db.sales_quotes.findFirst).toHaveBeenCalledWith(expect.objectContaining({where:{id:'quote'}}));
    expect(db.profiles.findUnique).not.toHaveBeenCalled();
    expect(db.crm_offer_followups.updateMany).toHaveBeenCalled();
    expect(db.sales_quotes.update).toBeUndefined();
  });
  it('no usa la escritura heredada cuando falta seguimiento de n8n',async()=>{
    const db:any={sales_quotes:{findUnique:jest.fn().mockResolvedValue({document_no:'OF'})}};
    const service=new OfferFollowupService(db,{} as any,{} as any);
    expect(await service.isManagedQuote('quote')).toBe(true);
    expect(db.crm_offer_followups).toBeUndefined();
  });
});
