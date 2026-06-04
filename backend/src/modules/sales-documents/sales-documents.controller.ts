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
  @ApiQuery({ name: 'years', required: false, type: String })
  @ApiQuery({ name: 'months', required: false, type: String })
  async getAll(
    @Query('take') take?: number,
    @Query('skip') skip?: number,
    @Query('search') search?: string,
    @Query('customerCode') customerCode?: string,
    @Query('type') type?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
    @Query('years') years?: string,
    @Query('months') months?: string,
  ) {
    const parsedYears = years ? years.split(',').map(y => Number(y.trim())).filter(y => !isNaN(y)) : undefined;
    const parsedMonths = months ? months.split(',').map(m => Number(m.trim())).filter(m => !isNaN(m)) : undefined;
    return this.salesDocumentsService.getAll({ take, skip, search, customerCode, type, sortBy, sortDir, years: parsedYears, months: parsedMonths });
  }

  @Get('billing-history/dashboard')
  @ApiOperation({ summary: 'Obtener datos del dashboard histórico de facturación' })
  async getBillingHistoryDashboard() {
    return this.salesDocumentsService.getBillingHistoryDashboard();
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
