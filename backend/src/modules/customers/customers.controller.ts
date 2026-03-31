import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los clientes' })
  async getAll() {
    return this.customersService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un cliente por ID (UUID)' })
  async getById(@Param('id') id: string) {
    return this.customersService.getById(id);
  }

  @Get('code/:clientId')
  @ApiOperation({ summary: 'Obtener un cliente por su código de cliente' })
  async getByClientId(@Param('clientId') clientId: string) {
    return this.customersService.getByClientId(clientId);
  }
}
