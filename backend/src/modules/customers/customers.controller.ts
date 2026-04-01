import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
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
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortDir', required: false, enum: ['asc', 'desc'] })
  async getAll(
    @Query('take') take?: number,
    @Query('skip') skip?: number,
    @Query('search') search?: string,
    @Query('blocked') blocked?: string,
    @Query('salesperson') salesperson?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
  ) {
    return this.customersService.getAll({ 
      take, 
      skip, 
      search, 
      blocked: blocked === 'true' ? true : blocked === 'false' ? false : undefined,
      salesperson,
      sortBy,
      sortDir
    });
  }

  @Get('salespersons')
  @ApiOperation({ summary: 'Obtener lista de vendedores únicos' })
  async getSalespersons() {
    return this.customersService.getSalespersons();
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
}
