import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ProspectsService } from './prospects.service';
import { CreateProspectDto, UpdateProspectDto, ProspectVersionDto, LinkProspectDto, ProspectActivityDto, UpdateProspectActivityDto } from './prospect.dto';

@Controller('crm-prospects')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class ProspectsController {
  constructor(private readonly service: ProspectsService) {}

  @Get('access')
  access(@Req() req: any) { return this.service.access(req.user.userId); }

  @Get()
  list(@Req() req: any, @Query('status') status?: string, @Query('search') search?: string, @Query('page') page?: string) {
    return this.service.list(req.user.userId, status, search, page === undefined ? 1 : Number(page));
  }

  @Get(':id')
  detail(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.detail(req.user.userId, id); }

  @Get('client/:clientId/activities')
  clientActivities(@Req() req: any, @Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.service.clientActivities(req.user.userId, clientId);
  }

  @Get(':id/activities')
  activities(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.activities(req.user.userId, id);
  }

  @Post(':id/activities')
  createActivity(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() data: ProspectActivityDto) {
    return this.service.saveActivity(req.user.userId, id, data);
  }

  @Patch(':id/activities/:activityId')
  updateActivity(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Param('activityId', ParseUUIDPipe) activityId: string, @Body() data: UpdateProspectActivityDto) {
    return this.service.saveActivity(req.user.userId, id, data, activityId);
  }

  @Post(':id/activities/:activityId/sync')
  syncActivity(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Param('activityId', ParseUUIDPipe) activityId: string) {
    return this.service.syncActivity(req.user.userId, id, activityId);
  }

  @Get(':id/clients')
  clients(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Query('search') search?: string) {
    return this.service.clients(req.user.userId, id, search);
  }

  @Post(':id/link')
  link(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() data: LinkProspectDto) {
    return this.service.link(req.user.userId, id, data.version, data.client_id);
  }

  @Post(':id/unlink')
  unlink(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() data: ProspectVersionDto) {
    return this.service.link(req.user.userId, id, data.version, null);
  }

  @Post()
  create(@Req() req: any, @Body() data: CreateProspectDto) { return this.service.create(req.user.userId, data); }

  @Patch(':id')
  update(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() data: UpdateProspectDto) {
    return this.service.update(req.user.userId, id, data);
  }

  @Post(':id/archive')
  archive(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() data: ProspectVersionDto) {
    return this.service.archive(req.user.userId, id, true, data.version);
  }

  @Post(':id/restore')
  restore(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() data: ProspectVersionDto) {
    return this.service.archive(req.user.userId, id, false, data.version);
  }
}
