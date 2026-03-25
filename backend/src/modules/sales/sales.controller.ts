import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('budgets')
  @ApiOperation({ summary: 'Get aggregated sales budgets by year' })
  async getSalesBudgets(@Query('year') year?: number) {
    return this.salesService.getSalesBudgets(year);
  }
}
