import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los pedidos de compra' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'vendorNo', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortDir', required: false, type: String })
  async getAll(
    @Query('take') take?: number,
    @Query('skip') skip?: number,
    @Query('search') search?: string,
    @Query('vendorNo') vendorNo?: string,
    @Query('type') type?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
  ) {
    return this.purchaseOrdersService.getAll({ take, skip, search, vendorNo, type, sortBy, sortDir });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un pedido de compra por ID' })
  async getById(@Param('id') id: string) {
    return this.purchaseOrdersService.getById(id);
  }

  @Get('vendor/:vendorNo')
  @ApiOperation({ summary: 'Obtener pedidos de compra por código de proveedor' })
  async getByVendor(@Param('vendorNo') vendorNo: string) {
    return this.purchaseOrdersService.getByVendor(vendorNo);
  }
}
