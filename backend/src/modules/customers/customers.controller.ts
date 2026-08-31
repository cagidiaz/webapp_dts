import { Controller, Get, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los clientes (admite búsqueda, filtros, ordenación y paginación)' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'blocked', required: false, type: Boolean })
  @ApiQuery({ name: 'salesperson', required: false, type: String })
  @ApiQuery({ name: 'clientType', required: false, type: String })
  @ApiQuery({ name: 'marketSegment', required: false, type: String })
  @ApiQuery({ name: 'businessModel', required: false, type: String })
  @ApiQuery({ name: 'territory', required: false, type: String })
  @ApiQuery({ name: 'paymentTerms', required: false, type: String })
  @ApiQuery({ name: 'shipmentMethod', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortDir', required: false, enum: ['asc', 'desc'] })
  async getAll(
    @Query('take') take?: number,
    @Query('skip') skip?: number,
    @Query('search') search?: string,
    @Query('blocked') blocked?: string,
    @Query('salesperson') salesperson?: string,
    @Query('clientType') clientType?: string,
    @Query('marketSegment') marketSegment?: string,
    @Query('businessModel') businessModel?: string,
    @Query('territory') territory?: string,
    @Query('paymentTerms') paymentTerms?: string,
    @Query('shipmentMethod') shipmentMethod?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
  ) {
    return this.customersService.getAll({ 
      take, 
      skip, 
      search, 
      blocked: blocked === 'true' ? true : blocked === 'false' ? false : undefined,
      salesperson,
      clientType,
      marketSegment,
      businessModel,
      territory,
      paymentTerms,
      shipmentMethod,
      sortBy,
      sortDir
    });
  }

  @Get('filter-options')
  @ApiOperation({ summary: 'Obtener opciones únicas de filtrado para clientes' })
  async getFilterOptions() {
    return this.customersService.getFilterOptions();
  }

  @Get('salespersons')
  @ApiOperation({ summary: 'Obtener lista de vendedores únicos' })
  async getSalespersons() {
    return this.customersService.getSalespersons();
  }

  @Get('by-email/:email')
  @ApiOperation({ summary: 'Obtener cliente por dirección de email (del cliente o de sus contactos)' })
  async getByEmail(@Param('email') email: string) {
    return this.customersService.getByEmail(email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un cliente por ID (UUID)' })
  async getById(@Param('id') id: string) {
    return this.customersService.getById(id);
  }

  @Get('code/:clientId')
  @ApiOperation({ summary: 'Obtener un cliente por su client_id (Navision)' })
  async getByClientId(@Param('clientId') clientId: string) {
    return this.customersService.getByClientId(clientId);
  }

  @Patch(':clientId/client-type')
  @ApiOperation({ summary: 'Actualizar la tipología del cliente (relación con la marca: A, B, C, D, E, F o null)' })
  async updateClientType(
    @Param('clientId') clientId: string,
    @Body('clientType') clientType: string | null,
  ) {
    return this.customersService.updateClientType(clientId, clientType);
  }
}
