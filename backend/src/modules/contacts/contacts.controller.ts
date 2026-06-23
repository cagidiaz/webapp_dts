import { Controller, Get, Param, UseGuards, Query, Body, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los contactos (admite filtros por cliente y tipo de relación)' })
  @ApiQuery({ name: 'clientId', required: false, type: String, description: 'Filtrar por código de cliente o proveedor' })
  @ApiQuery({ name: 'relation', required: false, type: String, description: 'Filtrar por tipo de relación (ej. Customer, Vendor)' })
  async getAll(
    @Query('clientId') clientId?: string,
    @Query('relation') relation?: string,
  ) {
    return this.contactsService.getAll({ clientId, relation });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un contacto por su ID (UUID)' })
  async getById(@Param('id') id: string) {
    return this.contactsService.getById(id);
  }

  @Patch(':id/linkedin')
  @ApiOperation({ summary: 'Actualizar el perfil de LinkedIn de un contacto' })
  async updateLinkedin(
    @Param('id') id: string,
    @Body('linkedin') linkedin: string,
  ) {
    return this.contactsService.updateLinkedin(id, linkedin);
  }
}
