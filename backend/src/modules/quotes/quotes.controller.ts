import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

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

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una oferta por ID' })
  async getById(@Param('id') id: string) {
    return this.quotesService.getById(id);
  }
}
