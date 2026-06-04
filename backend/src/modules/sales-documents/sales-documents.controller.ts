import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SalesDocumentsService } from './sales-documents.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('sales-documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales-documents')
export class SalesDocumentsController {
  constructor(private readonly salesDocumentsService: SalesDocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todo el histórico de documentos de venta' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'customerCode', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortDir', required: false, type: String })
  @ApiQuery({ name: 'year', required: false, type: Number })
  async getAll(
    @Query('take') take?: number,
    @Query('skip') skip?: number,
    @Query('search') search?: string,
    @Query('customerCode') customerCode?: string,
    @Query('type') type?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
    @Query('year') year?: number,
  ) {
    return this.salesDocumentsService.getAll({ take, skip, search, customerCode, type, sortBy, sortDir, year });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un documento por ID' })
  async getById(@Param('id') id: string) {
    return this.salesDocumentsService.getById(id);
  }

  @Get('customer/:customerCode')
  @ApiOperation({ summary: 'Obtener documentos por código de cliente' })
  async getByCustomer(@Param('customerCode') customerCode: string) {
    return this.salesDocumentsService.getByCustomer(customerCode);
  }
}
