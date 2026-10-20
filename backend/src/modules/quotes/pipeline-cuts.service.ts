import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { OfferSourceContext } from './offer-source-context';
import { CreatePipelineCutDto } from './pipeline-cuts.dto';
import { lastWeeklyCut } from './cut-schedule';
import { compareCutRows, cutReports } from './cut-analytics';
import { loadOfferContacts } from './offer-contacts';

export function csvCell(value: unknown) {
  let text=String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
}
@Injectable()
export class PipelineCutsService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private ticking=false;
  private readonly logger=new Logger(PipelineCutsService.name);
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  enabled() { return true; }
  onModuleInit() {
    if(this.enabled() && this.config.get('CRM_CUTS_AUTOMATION_ENABLED')==='true') {
      this.timer=setInterval(()=>void this.tick(),60000); this.timer.unref();
      void this.tick();
    }
  }
  onModuleDestroy() { if(this.timer) clearInterval(this.timer); }
  async access(userId: string) {
    if(!this.enabled()) return {enabled:false,canCreate:false,canViewAll:false,scope:{owner_id:userId}};
    const profile=await this.prisma.profiles.findUnique({where:{id:userId},include:{roles:true}});
    if(!profile?.is_active || !profile.role_id) throw new ForbiddenException('Perfil no disponible.');
    const permissions=await this.prisma.role_modules.findMany({where:{role_id:profile.role_id,module:{is_active:true,route_path:{in:['/crm','/crm/pipeline']}}},include:{module:true}});
    if(!['/crm','/crm/pipeline'].every(path=>permissions.some(p=>p.module.route_path===path && p.can_view))) throw new ForbiddenException('Sin permiso de Oportunidades.');
    const all=['ADMIN','DIRECCION'].includes(profile.roles?.name?.toUpperCase()||'');
    // El propietario congelado prima sobre el código comercial actual.
    const scope: Prisma.crm_pipeline_cut_rowsWhereInput=all?{}:{OR:[{owner_id:userId},...(profile.code?[{owner_id:null,entity_type:'OFFER',salesperson_code:profile.code}]:[])]};
    return {enabled:true,canCreate:all,canViewAll:all,automaticEnabled:this.config.get('CRM_CUTS_AUTOMATION_ENABLED')==='true',scope};
  }
  private async authorize(userId:string) { const access=await this.access(userId);if(!access.enabled)throw new ForbiddenException('Los cortes del piloto no están habilitados.');return access; }
  private async getOrCreate(data:Prisma.crm_pipeline_cutsUncheckedCreateInput) {
    const existing=await this.prisma.crm_pipeline_cuts.findUnique({where:{request_key:data.request_key}});
    if(existing)return existing;
    try{return await this.prisma.crm_pipeline_cuts.create({data});}
    catch(error){if((error as any)?.code!=='P2002')throw error;return this.prisma.crm_pipeline_cuts.findUniqueOrThrow({where:{request_key:data.request_key}});}
  }
  async list(userId:string) {
    const access=await this.authorize(userId);
    const cuts=await this.prisma.crm_pipeline_cuts.findMany({where:access.canViewAll?{}:{status:'PUBLISHED',rows:{some:access.scope}},orderBy:[{created_at:'desc'},{id:'desc'}],take:50});
    // No exponer recuentos globales, autores o mensajes operativos fuera de Admin/Dirección.
    return access.canViewAll ? cuts : cuts.map(c=>({id:c.id,kind:c.kind,status:c.status,scheduled_at:c.scheduled_at,captured_at:c.captured_at,created_at:c.created_at,rules_version:c.rules_version,supersedes_id:c.supersedes_id}));
  }
  async detail(userId:string,id:string) {
    const access=await this.authorize(userId);
    const cut=await this.prisma.crm_pipeline_cuts.findFirst({where:{id,status:'PUBLISHED',...(access.canViewAll?{}:{rows:{some:access.scope}})}});
    if(!cut) throw new NotFoundException('Corte no disponible en tu ámbito.');
    const rows=await this.prisma.crm_pipeline_cut_rows.findMany({where:{cut_id:id,...access.scope},orderBy:[{entity_type:'asc'},{entity_key:'asc'}]});
    const metadata=access.canViewAll?cut:{id:cut.id,kind:cut.kind,status:cut.status,scheduled_at:cut.scheduled_at,captured_at:cut.captured_at,rules_version:cut.rules_version,supersedes_id:cut.supersedes_id};
    return {cut:metadata,rows,total:rows.length};
  }
  async export(userId:string,id:string) {
    const detail=await this.detail(userId,id);
    const header=['Tipo','Referencia','Empresa','Comercial','Fase','Fuente','Importe sin IVA','Probabilidad','Cierre previsto','Motivo ganada','Motivo perdida','Captura real'];
    const lines=detail.rows.map(row=>{const payload=row.payload as any;return [row.entity_type,row.entity_key,payload.company_name||payload.customer_name,row.salesperson_code,row.phase,row.source,row.amount?.toString(),row.probability?.toString(),payload.cierreprev_date,payload.motivo_ganada,payload.motivo_perdida,detail.cut.captured_at?.toISOString()].map(csvCell).join(';');});
    return '\uFEFF'+[header.map(csvCell).join(';'),...lines].join('\r\n');
  }
  async reports(userId:string,id:string) {
    const detail=await this.detail(userId,id);
    return cutReports(detail.rows,detail.cut.captured_at!);
  }
  async compare(userId:string,id:string,baselineId:string) {
    if(id===baselineId)throw new BadRequestException('Selecciona dos cortes distintos.');
    const before=await this.detail(userId,baselineId),after=await this.detail(userId,id);
    if(before.cut.captured_at!>after.cut.captured_at!)throw new BadRequestException('El corte inicial debe ser anterior al corte final.');
    if(before.cut.rules_version!==after.cut.rules_version)throw new BadRequestException('Los cortes usan reglas diferentes y requieren una revisión antes de compararse.');
    return {before:before.cut,after:after.cut,...compareCutRows(before.rows,after.rows)};
  }
  async manual(userId:string,data:CreatePipelineCutDto) {
    const access=await this.authorize(userId);if(!access.canCreate)throw new ForbiddenException('Solo Admin y Dirección pueden crear cortes manuales.');
    if(!data.reason.trim())throw new BadRequestException('Indica el motivo del corte.');
    if(data.supersedes_id && !await this.prisma.crm_pipeline_cuts.findFirst({where:{id:data.supersedes_id,status:'PUBLISHED'}})) throw new BadRequestException('La revisión debe enlazar un corte publicado.');
    const key='manual:'+userId+':'+data.request_id;
    const run=await this.getOrCreate({request_key:key,kind:'MANUAL',reason:data.reason.trim(),created_by:userId,supersedes_id:data.supersedes_id});
    if(run.reason!==data.reason.trim() || (run.supersedes_id||undefined)!==data.supersedes_id) throw new BadRequestException('Esta solicitud ya pertenece a otro corte; crea una solicitud nueva.');
    if(run.status!=='PUBLISHED')await this.capture(run.id);
    return this.prisma.crm_pipeline_cuts.findUniqueOrThrow({where:{id:run.id}});
  }
  async tick(now=new Date()) {
    if(this.ticking || !this.enabled() || this.config.get('CRM_CUTS_AUTOMATION_ENABLED')!=='true')return;
    this.ticking=true;
    try {
      const pending=await this.prisma.crm_pipeline_cuts.findMany({where:{OR:[{status:'FAILED',attempts:{lt:3},retry_at:{lte:now}},{status:'RUNNING',lease_until:{lte:now}}]},orderBy:{created_at:'asc'},take:5});
      for(const run of pending)await this.capture(run.id,now);
      const first=await this.prisma.crm_pipeline_cuts.findFirst({where:{status:'PUBLISHED'},orderBy:{captured_at:'asc'}});
      // La primera foto es manual; no reconstruir semanas anteriores al piloto.
      const due=lastWeeklyCut(now);
      if(!first?.captured_at || due<first.captured_at)return;
      const run=await this.getOrCreate({request_key:'weekly:'+due.toISOString(),kind:'WEEKLY',reason:'Corte semanal · viernes 18:00 Europe/Madrid',scheduled_at:due});
      if(run.status!=='PUBLISHED')await this.capture(run.id,now);
    } catch { this.logger.error('No se pudo ejecutar el corte semanal. Revisar el esquema y la disponibilidad del servicio.'); }
    finally {this.ticking=false;}
  }
  async retry(userId:string,id:string) {
    const access=await this.authorize(userId);if(!access.canCreate)throw new ForbiddenException('Solo Admin y Dirección pueden reintentar cortes.');
    const run=await this.prisma.crm_pipeline_cuts.findUnique({where:{id}});if(!run)throw new NotFoundException('Corte no encontrado.');
    const expired=run.status==='RUNNING' && !!run.lease_until && run.lease_until<=new Date();
    if(!expired && (run.status!=='FAILED' || run.attempts>=3))throw new BadRequestException('Este corte no admite más reintentos. Puedes crear una nueva captura con su motivo.');
    await this.capture(id);
    return this.prisma.crm_pipeline_cuts.findUniqueOrThrow({where:{id}});
  }
  async capture(id:string,now=new Date()) {
    const token=randomUUID();
    const claimed=await this.prisma.crm_pipeline_cuts.updateMany({where:{id,status:{not:'PUBLISHED'},attempts:{lt:3},AND:[{OR:[{lease_until:null},{lease_until:{lte:now}}]},{OR:[{retry_at:null},{retry_at:{lte:now}}]}]},data:{status:'RUNNING',lease_token:token,lease_until:new Date(now.getTime()+300000),attempts:{increment:1},error_message:null}});
    if(claimed.count!==1){
      const abandoned=await this.prisma.crm_pipeline_cuts.findUnique({where:{id}});
      if(abandoned?.status==='RUNNING' && abandoned.attempts>=3 && abandoned.lease_until && abandoned.lease_until<=now) await this.prisma.$transaction(async tx=>{
        const result=await tx.crm_pipeline_cuts.updateMany({where:{id,status:'RUNNING',attempts:{gte:3},lease_until:{lte:now}},data:{status:'FAILED',lease_token:null,lease_until:null,error_message:'La ejecución se interrumpió tras el último intento. Crea una nueva captura con motivo.'}});
        if(result.count)await tx.crm_pipeline_cut_events.create({data:{cut_id:id,event:'FAILED',detail:'Bloqueo vencido tras tres intentos; no se publicó el corte.'}});
      });
      return;
    }
    try {
      await this.prisma.$transaction(async tx=>{
        // Bloquear la cabecera durante toda la captura impide publicación por otra instancia.
        const locked=await tx.crm_pipeline_cuts.updateMany({where:{id,lease_token:token,status:'RUNNING'},data:{lease_until:new Date(now.getTime()+300000)}});
        if(locked.count!==1)throw new Error('Ejecución sustituida');
        const [clock]=await tx.$queryRaw<Array<{instant:Date}>>`SELECT transaction_timestamp() AS instant`;
        const local=await tx.crm_offer_followups.findMany();
        const source=new OfferSourceContext(await loadOfferContacts(tx,local));
        const offers=await tx.sales_quotes.findMany({include:{customer:{select:{name:true}},sales_quotes_crm:true}});
        const prospects=await tx.crm_prospects.findMany({include:{linked_client:{select:{client_id:true,name:true}}}});
        const json=(value:any)=>JSON.parse(JSON.stringify(value));
        const rows:Prisma.crm_pipeline_cut_rowsCreateManyInput[]=[];
        for(const quote of offers) {
          const effective=source.overlay(quote),followup=source.records.get(quote.document_no);
          const missing=['estado_oferta','oferta_type','cierreprev_date'].filter(field=>!effective[field]);
          rows.push({cut_id:id,entity_type:'OFFER',entity_key:quote.document_no,owner_id:null,salesperson_code:quote.salesperson_code,phase:effective.estado_oferta,source:effective.followup_source,amount:quote.amount,probability:effective.probabilidad_exito,payload:json({...effective,customer_name:quote.customer?.name,missing_fields:missing,imported_updated_at:quote.updated_at})});
        }
        const documents=new Set(offers.map(quote=>quote.document_no));
        for(const local of source.records.values()) if(!documents.has(local.document_no)) rows.push({cut_id:id,entity_type:'OFFER',entity_key:local.document_no,owner_id:null,phase:local.estado_oferta,source:'APP',amount:null,probability:local.probabilidad_exito,payload:json({...local,missing_bc:true,missing_fields:['importe','cliente BC']})});
        for(const prospect of prospects) rows.push({cut_id:id,entity_type:'PROSPECT',entity_key:prospect.id,owner_id:prospect.owner_id,phase:prospect.archived_at?'Archivado':prospect.converted_at?'Convertido':`Fase ${prospect.phase}`,source:'APP',payload:json(prospect)});
        for(let start=0;start<rows.length;start+=500)await tx.crm_pipeline_cut_rows.createMany({data:rows.slice(start,start+500)});
        const count=await tx.crm_pipeline_cut_rows.count({where:{cut_id:id}});
        if(count!==rows.length)throw new Error('Recuento no conciliado');
        await tx.crm_pipeline_cut_events.create({data:{cut_id:id,event:'PUBLISHED',detail:`Captura conciliada: ${count} registros; ${offers.length} ofertas sincronizadas y ${prospects.length} prospectos. Las ofertas APP sin fila BC se conservan sin importe.`}});
        await tx.crm_pipeline_cuts.update({where:{id},data:{status:'PUBLISHED',captured_at:clock.instant,row_count:count,lease_token:null,lease_until:null,retry_at:null}});
      },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:120000,maxWait:10000});
    } catch {
      const run=await this.prisma.crm_pipeline_cuts.findUnique({where:{id}});
      const delay=run?.attempts===1?60000:300000;
      await this.prisma.$transaction(async tx=>{
        const failed=await tx.crm_pipeline_cuts.updateMany({where:{id,lease_token:token,status:'RUNNING'},data:{status:'FAILED',error_message:'Captura no completada. No se publicó ningún dato parcial.',lease_token:null,lease_until:null,retry_at:new Date(Date.now()+delay)}});
        if(failed.count)await tx.crm_pipeline_cut_events.create({data:{cut_id:id,event:'FAILED',detail:'Captura revertida; máximo tres intentos con la misma solicitud.'}});
      });
    }
  }
}
