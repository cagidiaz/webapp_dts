import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SalesOrdersService } from './sales-orders.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('sales-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los pedidos de venta' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'customerCode', required: false, type: String })
  async getAll(
    @Query('take') take?: number,
    @Query('skip') skip?: number,
    @Query('search') search?: string,
    @Query('customerCode') customerCode?: string,
  ) {
    return this.salesOrdersService.getAll({ take, skip, search, customerCode });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un pedido por ID' })
  async getById(@Param('id') id: string) {
    return this.salesOrdersService.getById(id);
  }

  @Get('customer/:customerCode')
  @ApiOperation({ summary: 'Obtener pedidos por código de cliente' })
  async getByCustomer(@Param('customerCode') customerCode: string) {
    return this.salesOrdersService.getByCustomer(customerCode);
  }
}
