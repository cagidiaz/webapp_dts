import { Controller, Get, Param, Query, UseGuards, Patch, Post, Delete, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UpdateCrmQuoteDto, CreateActivityDto, UpdateActivityDto } from './dto/crm-quote.dto';


@ApiTags('quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las ofertas (quotes)' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'customerCode', required: false, type: String })
  @ApiQuery({ name: 'salespersonCode', required: false, type: String })
  @ApiQuery({ name: 'estadoOferta', required: false, type: String })
  @ApiQuery({ name: 'cerrado', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortDir', required: false, type: String })
  @ApiQuery({ name: 'year', required: false, type: Number })
  async getAll(
    @Query('take') take?: number,
    @Query('skip') skip?: number,
    @Query('search') search?: string,
    @Query('customerCode') customerCode?: string,
    @Query('salespersonCode') salespersonCode?: string,
    @Query('estadoOferta') estadoOferta?: string,
    @Query('cerrado') cerrado?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
    @Query('year') year?: number,
  ) {
    return this.quotesService.getAll({ 
      take, 
      skip, 
      search, 
      customerCode, 
      salespersonCode, 
      estadoOferta, 
      cerrado, 
      sortBy, 
      sortDir,
      year: year ? Number(year) : undefined
    });
  }

  @Get('crm')
  @ApiOperation({ summary: 'Obtener todas las ofertas enriquecidas con datos de CRM' })
  @ApiQuery({ name: 'salespersonCode', required: false, type: String })
  @ApiQuery({ name: 'estadoOferta', required: false, type: String })
  @ApiQuery({ name: 'probabilidadExito', required: false, type: String })
  @ApiQuery({ name: 'ofertaType', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'year', required: false, type: Number })
  async getAllCrm(
    @Req() req: any,
    @Query('salespersonCode') salespersonCode?: string,
    @Query('estadoOferta') estadoOferta?: string,
    @Query('probabilidadExito') probabilidadExito?: string,
    @Query('ofertaType') ofertaType?: string,
    @Query('search') search?: string,
    @Query('year') year?: number,
  ) {
    const userId = req.user?.userId;
    return this.quotesService.getAllCrm({
      salespersonCode,
      estadoOferta,
      probabilidadExito,
      ofertaType,
      search,
      year: year ? Number(year) : undefined
    }, userId);
  }

  @Patch('crm/:id')
  @ApiOperation({ summary: 'Actualizar los datos de CRM de una oferta' })
  async updateCrm(
    @Param('id') id: string,
    @Body() updateCrmQuoteDto: UpdateCrmQuoteDto
  ) {
    return this.quotesService.updateCrm(id, updateCrmQuoteDto);
  }

  @Get('crm/:id/activities')
  @ApiOperation({ summary: 'Obtener el historial de actividades de una oferta' })
  async getActivities(@Param('id') id: string) {
    return this.quotesService.getActivities(id);
  }

  @Post('crm/:id/activities')
  @ApiOperation({ summary: 'Añadir una actividad de seguimiento a una oferta' })
  async addActivity(
    @Param('id') id: string,
    @Body() createActivityDto: CreateActivityDto
  ) {
    return this.quotesService.addActivity(id, createActivityDto);
  }

  @Patch('crm/activities/:activityId')
  @ApiOperation({ summary: 'Modificar una actividad de seguimiento' })
  async updateActivity(
    @Param('activityId') activityId: string,
    @Body() updateActivityDto: UpdateActivityDto
  ) {
    return this.quotesService.updateActivity(activityId, updateActivityDto);
  }

  @Delete('crm/activities/:activityId')
  @ApiOperation({ summary: 'Eliminar una actividad de seguimiento' })
  async deleteActivity(@Param('activityId') activityId: string) {
    return this.quotesService.deleteActivity(activityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una oferta por ID' })
  async getById(@Param('id') id: string) {
    return this.quotesService.getById(id);
  }
}

