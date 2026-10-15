import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PipelineCutsService } from './pipeline-cuts.service';
import { CreatePipelineCutDto } from './pipeline-cuts.dto';
@UseGuards(JwtAuthGuard)
@Controller('crm-pipeline-cuts')
export class PipelineCutsController {
  constructor(private readonly cuts:PipelineCutsService){}
  @Get('access') access(@Req() req:any){return this.cuts.access(req.user.userId);}
  @Get() list(@Req() req:any){return this.cuts.list(req.user.userId);}
  @Post() create(@Req() req:any,@Body() data:CreatePipelineCutDto){return this.cuts.manual(req.user.userId,data);}
  @Post(':id/retry') retry(@Req() req:any,@Param('id',ParseUUIDPipe) id:string){return this.cuts.retry(req.user.userId,id);}
  @Get(':id/export') async export(@Req() req:any,@Param('id',ParseUUIDPipe) id:string,@Res() response:Response){const csv=await this.cuts.export(req.user.userId,id);response.setHeader('Content-Type','text/csv; charset=utf-8');response.setHeader('Content-Disposition',`attachment; filename="corte-${id}.csv"`);response.send(csv);}
  @Get(':id/reports') reports(@Req() req:any,@Param('id',ParseUUIDPipe) id:string){return this.cuts.reports(req.user.userId,id);}
  @Get(':id/compare/:baseline') compare(@Req() req:any,@Param('id',ParseUUIDPipe) id:string,@Param('baseline',ParseUUIDPipe) baseline:string){return this.cuts.compare(req.user.userId,id,baseline);}
  @Get(':id') detail(@Req() req:any,@Param('id',ParseUUIDPipe) id:string){return this.cuts.detail(req.user.userId,id);}
}
