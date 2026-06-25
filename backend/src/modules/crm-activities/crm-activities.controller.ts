import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CrmActivitiesService } from './crm-activities.service';
import { CrmActivityType } from '@prisma/client';

@ApiTags('crm-activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm-activities')
export class CrmActivitiesController {
  constructor(private readonly crmActivitiesService: CrmActivitiesService) {}

  @Get(':clientId')
  @ApiOperation({ summary: 'Obtener todas las actividades comerciales de un cliente' })
  async getByClient(@Param('clientId') clientId: string) {
    return this.crmActivitiesService.getByClient(clientId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva actividad comercial' })
  async create(
    @Req() req: any,
    @Body('clientId') clientId: string,
    @Body('type') type: CrmActivityType,
    @Body('title') title: string,
    @Body('description') description?: string,
    @Body('dueDate') dueDate?: string,
    @Body('timeScheduled') timeScheduled?: string,
  ) {
    const userId = req.user?.userId;
    return this.crmActivitiesService.create({
      clientId,
      userId,
      type,
      title,
      description,
      dueDate,
      timeScheduled
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una actividad comercial' })
  async update(
    @Param('id') id: string,
    @Body('isCompleted') isCompleted?: boolean,
    @Body('title') title?: string,
    @Body('description') description?: string,
    @Body('dueDate') dueDate?: string,
    @Body('timeScheduled') timeScheduled?: string,
  ) {
    return this.crmActivitiesService.update(id, { isCompleted, title, description, dueDate, timeScheduled });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una actividad comercial' })
  async delete(@Param('id') id: string) {
    return this.crmActivitiesService.delete(id);
  }
}
